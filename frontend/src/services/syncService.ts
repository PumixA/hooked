/**
 * Service de synchronisation offline-first CONDITIONNELLE
 *
 * La sync ne s'execute QUE si:
 * 1. Un compte est connecte (token present)
 * 2. La sync cloud est activee dans les parametres
 * 3. L'appareil est en ligne
 *
 * Sinon, tout reste en local dans IndexedDB.
 */

import api from './api';
import { localDb } from './localDb';

export interface SyncResult {
    success: boolean;
    pushed: { projects: number; materials: number; sessions: number; photos: number };
    pulled: { projects: number; materials: number; categories: number };
    errors: string[];
    skipped?: boolean;
    reason?: string;
}

// Fonction pour verifier si la sync est activee
function isSyncEnabled(): boolean {
    // Verifier si un token existe (compte connecte)
    const token = localStorage.getItem('token');
    if (!token) {
        return false;
    }

    // Verifier si la sync est activee dans les parametres
    const settingsStr = localStorage.getItem('hooked_app_settings');
    if (!settingsStr) {
        return false;
    }

    try {
        const settings = JSON.parse(settingsStr);
        return settings.syncEnabled === true;
    } catch {
        return false;
    }
}

class SyncService {
    private isSyncing = false;
    private syncListeners: ((status: string) => void)[] = [];

    // === LISTENERS ===
    onSyncStatus(listener: (status: string) => void) {
        this.syncListeners.push(listener);
        return () => {
            this.syncListeners = this.syncListeners.filter(l => l !== listener);
        };
    }

    private notifyStatus(status: string) {
        this.syncListeners.forEach(l => l(status));
        console.log(`[Sync] ${status}`);
    }

    // === VERIFICATION SYNC ===
    canSync(): boolean {
        return isSyncEnabled() && navigator.onLine;
    }

    // === MAIN SYNC ===
    async syncAll(): Promise<SyncResult> {
        // Verifier si la sync est desactivee
        if (!isSyncEnabled()) {
            console.log('[Sync] Sync desactivee (pas de compte ou sync off)');
            return {
                success: true,
                pushed: { projects: 0, materials: 0, sessions: 0, photos: 0 },
                pulled: { projects: 0, materials: 0, categories: 0 },
                errors: [],
                skipped: true,
                reason: 'Sync desactivee'
            };
        }

        if (this.isSyncing) {
            console.log('[Sync] Deja en cours, ignore...');
            return {
                success: false,
                pushed: { projects: 0, materials: 0, sessions: 0, photos: 0 },
                pulled: { projects: 0, materials: 0, categories: 0 },
                errors: ['Deja en cours'],
                skipped: true
            };
        }

        if (!navigator.onLine) {
            console.log('[Sync] Hors ligne, ignore...');
            return {
                success: false,
                pushed: { projects: 0, materials: 0, sessions: 0, photos: 0 },
                pulled: { projects: 0, materials: 0, categories: 0 },
                errors: ['Hors ligne'],
                skipped: true,
                reason: 'Hors ligne'
            };
        }

        this.isSyncing = true;
        this.notifyStatus('Synchronisation en cours...');

        const result: SyncResult = {
            success: true,
            pushed: { projects: 0, materials: 0, sessions: 0, photos: 0 },
            pulled: { projects: 0, materials: 0, categories: 0 },
            errors: []
        };

        try {
            // 1. PUSH: Envoyer les changements locaux vers l'API
            await this.pushChanges(result);

            // 2. PULL: Recuperer les donnees depuis l'API
            await this.pullData(result);

            // 3. Mettre a jour le timestamp de derniere sync
            await localDb.setLastSyncTime(Date.now());

            this.notifyStatus('Synchronisation terminee');
            console.log('[Sync] Terminee:', result);

        } catch (error: any) {
            result.success = false;
            result.errors.push(error.message || 'Erreur inconnue');
            this.notifyStatus('Erreur de synchronisation');
            console.error('[Sync] Erreur:', error);
        } finally {
            this.isSyncing = false;
        }

        return result;
    }

    // === PUSH LOCAL CHANGES ===
    private async pushChanges(result: SyncResult): Promise<void> {
        // Push Projects
        const pendingProjects = await localDb.getPendingProjects();
        for (const project of pendingProjects) {
            try {
                if (project._isLocal) {
                    const createData: any = {
                        title: project.title,
                        goal_rows: project.goal_rows,
                        category_id: project.category_id,
                    };
                    const response = await api.post('/projects', createData);
                    await localDb.markProjectSynced(project.id, response.data.id);
                    result.pushed.projects++;
                    console.log(`[Sync] Projet cree: ${project.title}`);
                } else {
                    const updateData: any = {
                        title: project.title,
                        current_row: project.current_row,
                        goal_rows: project.goal_rows,
                        total_duration: project.total_duration,
                        status: project.status,
                    };
                    if (project.end_date) updateData.end_date = project.end_date;

                    await api.patch(`/projects/${project.id}`, updateData);
                    await localDb.markProjectSynced(project.id);
                    result.pushed.projects++;
                    console.log(`[Sync] Projet maj: ${project.title}`);
                }
            } catch (error: any) {
                if (error.response?.status === 404) {
                    console.warn(`[Sync] Projet non trouve sur serveur: ${project.id}`);
                } else {
                    console.error(`[Sync] Erreur projet:`, error.response?.data || error.message);
                    result.errors.push(`Projet ${project.title}: ${error.message}`);
                }
            }
        }

        // Push Materials
        const pendingMaterials = await localDb.getPendingMaterials();
        for (const material of pendingMaterials) {
            try {
                if (material._isLocal) {
                    const createData = {
                        category_type: material.category_type,
                        name: material.name,
                        brand: material.brand,
                        material_composition: material.material_composition,
                    };
                    const response = await api.post('/materials', createData);
                    await localDb.markMaterialSynced(material.id, response.data.id);
                    result.pushed.materials++;
                } else {
                    const updateData = {
                        category_type: material.category_type,
                        name: material.name,
                        brand: material.brand,
                        material_composition: material.material_composition,
                    };
                    await api.patch(`/materials/${material.id}`, updateData);
                    await localDb.markMaterialSynced(material.id);
                    result.pushed.materials++;
                }
            } catch (error: any) {
                console.error(`[Sync] Erreur materiel:`, error.response?.data || error.message);
                result.errors.push(`Materiel ${material.name}: ${error.message}`);
            }
        }

        // Push Sessions
        const pendingSessions = await localDb.getPendingSessions();
        for (const session of pendingSessions) {
            try {
                if (session._isLocal) {
                    const createData = {
                        project_id: session.project_id,
                        start_time: session.start_time,
                        end_time: session.end_time,
                        duration_seconds: session.duration_seconds,
                    };
                    await api.post('/sessions', createData);
                    await localDb.markSessionSynced(session.id);
                    result.pushed.sessions++;
                }
            } catch (error: any) {
                console.error(`[Sync] Erreur session:`, error.response?.data || error.message);
                result.errors.push(`Session: ${error.message}`);
            }
        }

        // Push Photos
        const pendingPhotos = await localDb.getPendingPhotos();
        for (const photo of pendingPhotos) {
            try {
                if (photo._isLocal && photo.file) {
                    const formData = new FormData();
                    formData.append('file', photo.file);
                    await api.post(`/photos?project_id=${photo.project_id}`, formData, {
                        headers: { 'Content-Type': 'multipart/form-data' }
                    });
                    await localDb.deletePhoto(photo.id);
                    result.pushed.photos++;
                }
            } catch (error: any) {
                console.error(`[Sync] Erreur photo:`, error.response?.data || error.message);
                result.errors.push(`Photo: ${error.message}`);
            }
        }
    }

    // === PULL DATA FROM API ===
    private async pullData(result: SyncResult): Promise<void> {
        // Pull Projects
        try {
            const projectsResponse = await api.get('/projects');
            const remoteProjects = projectsResponse.data;
            if (Array.isArray(remoteProjects)) {
                await localDb.importFromApi({ projects: remoteProjects });
                result.pulled.projects = remoteProjects.length;
            }
        } catch (error: any) {
            console.warn(`[Sync] Pull projets echoue:`, error.message);
            result.errors.push(`Pull projets: ${error.message}`);
        }

        // Pull Materials
        try {
            const materialsResponse = await api.get('/materials');
            const remoteMaterials = materialsResponse.data;
            if (Array.isArray(remoteMaterials)) {
                await localDb.importFromApi({ materials: remoteMaterials });
                result.pulled.materials = remoteMaterials.length;
            }
        } catch (error: any) {
            console.warn(`[Sync] Pull materiels echoue:`, error.message);
            result.errors.push(`Pull materiels: ${error.message}`);
        }

        // Pull Categories (mise a jour depuis serveur si dispo)
        try {
            const categoriesResponse = await api.get('/categories');
            const remoteCategories = categoriesResponse.data;
            if (Array.isArray(remoteCategories)) {
                await localDb.importFromApi({ categories: remoteCategories });
                result.pulled.categories = remoteCategories.length;
            }
        } catch {
            // Categories locales suffisent
        }
    }

    // === INITIAL LOAD ===
    async initialLoad(): Promise<void> {
        console.log('[Sync] Chargement initial...');

        const localProjects = await localDb.getAllProjects();
        const hasLocalData = localProjects.length > 0;

        if (hasLocalData) {
            console.log(`[Sync] ${localProjects.length} projets locaux trouves`);
        }

        // Si sync activee et online, sync en background
        if (this.canSync()) {
            this.syncAll().catch(console.error);
        }
    }

    // === HELPERS ===
    async getWeeklyTime(): Promise<number> {
        // Si sync active et online, essayer l'API d'abord
        if (this.canSync()) {
            try {
                const response = await api.get('/sessions/weekly');
                return response.data.totalSeconds || 0;
            } catch {
                // Fallback sur calcul local
            }
        }

        // Calcul local des sessions de la semaine
        const allProjects = await localDb.getAllProjects();
        const now = new Date();
        const weekStart = new Date(now);
        weekStart.setDate(now.getDate() - now.getDay());
        weekStart.setHours(0, 0, 0, 0);

        let totalSeconds = 0;
        for (const project of allProjects) {
            const sessions = await localDb.getSessionsByProject(project.id);
            for (const session of sessions) {
                const sessionDate = new Date(session.start_time);
                if (sessionDate >= weekStart) {
                    totalSeconds += session.duration_seconds;
                }
            }
        }

        return totalSeconds;
    }
}

export const syncService = new SyncService();

// Exposer pour debug
if (typeof window !== 'undefined') {
    (window as any).__syncService = syncService;
}
