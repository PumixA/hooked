/**
 * Service de synchronisation offline-first CONDITIONNELLE
 *
 * La sync ne s'execute QUE si:
 * 1. Un compte est connecte (token present)
 * 2. La sync cloud est activee dans les parametres
 * 3. L'appareil est en ligne
 *
 * IMPORTANT: Gestion des IDs locaux vs UUIDs serveur
 * - Les IDs locaux commencent par "local-"
 * - Le serveur genere ses propres UUIDs
 * - Apres creation, on migre l'ID local vers l'UUID serveur
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

// Map des IDs locaux vers les IDs serveur (pour les entites liees)
type IdMigrationMap = Map<string, string>;

// Verifier si un ID est local
function isLocalId(id: string): boolean {
    return id.startsWith('local-');
}

// Verifier si un ID est un UUID valide (format basique)
function isValidUuid(id: string): boolean {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    return uuidRegex.test(id);
}

// Fonction pour verifier si la sync est activee
function isSyncEnabled(): boolean {
    const token = localStorage.getItem('token');
    if (!token) return false;

    const settingsStr = localStorage.getItem('hooked_app_settings');
    if (!settingsStr) return false;

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

    canSync(): boolean {
        return isSyncEnabled() && navigator.onLine;
    }

    async syncAll(): Promise<SyncResult> {
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
            return {
                success: false,
                pushed: { projects: 0, materials: 0, sessions: 0, photos: 0 },
                pulled: { projects: 0, materials: 0, categories: 0 },
                errors: ['Deja en cours'],
                skipped: true
            };
        }

        if (!navigator.onLine) {
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

        // Map pour suivre les migrations d'IDs
        const projectIdMap: IdMigrationMap = new Map();

        try {
            // 1. D'abord recuperer les categories du serveur pour avoir les vrais UUIDs
            await this.pullCategories(result);

            // 2. PUSH: Projets d'abord (pour obtenir les vrais IDs)
            await this.pushProjects(result, projectIdMap);

            // 3. PUSH: Materials
            await this.pushMaterials(result);

            // 4. PUSH: Sessions (avec les nouveaux project_id)
            await this.pushSessions(result, projectIdMap);

            // 5. PUSH: Photos (avec les nouveaux project_id)
            await this.pushPhotos(result, projectIdMap);

            // 6. PULL: Recuperer les donnees depuis l'API
            await this.pullData(result);

            // 7. Mettre a jour le timestamp de derniere sync
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

    // === PUSH PROJECTS ===
    private async pushProjects(result: SyncResult, idMap: IdMigrationMap): Promise<void> {
        const pendingProjects = await localDb.getPendingProjects();

        for (const project of pendingProjects) {
            try {
                if (project._isLocal) {
                    // Nouveau projet -> POST sans l'ID (le serveur le genere)
                    const createData: any = {
                        title: project.title,
                        goal_rows: project.goal_rows,
                        current_row: project.current_row || 0,
                        total_duration: project.total_duration || 0,
                        status: project.status || 'in_progress',
                    };

                    // Convertir category_id local en UUID si necessaire
                    if (project.category_id) {
                        const categoryUuid = await this.getCategoryUuid(project.category_id);
                        if (categoryUuid) {
                            createData.category_id = categoryUuid;
                        }
                    }

                    // Ajouter les material_ids s'ils existent (deja en UUID cote serveur)
                    if (project.material_ids && project.material_ids.length > 0) {
                        // Filtrer uniquement les UUIDs valides (pas les IDs locaux)
                        const validMaterialIds = project.material_ids.filter(id => isValidUuid(id));
                        if (validMaterialIds.length > 0) {
                            createData.material_ids = validMaterialIds;
                        }
                    }

                    console.log('[Sync] Creation projet:', createData);
                    const response = await api.post('/projects', createData);
                    const serverId = response.data.id;

                    // Sauvegarder le mapping d'ID pour les entites liees
                    idMap.set(project.id, serverId);

                    // Migrer le projet local vers l'ID serveur
                    await this.migrateProjectId(project.id, serverId, project);
                    result.pushed.projects++;
                    console.log(`[Sync] Projet cree: ${project.title} (${project.id} -> ${serverId})`);

                } else if (!isLocalId(project.id)) {
                    // Projet existant sur serveur -> PATCH
                    const updateData: any = {
                        title: project.title,
                        current_row: project.current_row,
                        goal_rows: project.goal_rows,
                        total_duration: project.total_duration,
                        status: project.status,
                    };
                    if (project.end_date) {
                        updateData.end_date = project.end_date;
                    }
                    // Ajouter les material_ids s'ils existent
                    if (project.material_ids) {
                        const validMaterialIds = project.material_ids.filter(id => isValidUuid(id));
                        updateData.material_ids = validMaterialIds;
                    }

                    await api.patch(`/projects/${project.id}`, updateData);
                    await localDb.markProjectSynced(project.id);
                    result.pushed.projects++;
                    console.log(`[Sync] Projet maj: ${project.title}`);
                }
            } catch (error: any) {
                const errorMsg = error.response?.data?.message || error.message;
                console.error(`[Sync] Erreur projet ${project.title}:`, error.response?.data || errorMsg);
                result.errors.push(`Projet ${project.title}: ${errorMsg}`);
            }
        }
    }

    // === PUSH MATERIALS ===
    private async pushMaterials(result: SyncResult): Promise<void> {
        const pendingMaterials = await localDb.getPendingMaterials();

        for (const material of pendingMaterials) {
            try {
                if (material._isLocal) {
                    const createData = {
                        category_type: material.category_type,
                        name: material.name,
                        size: material.size,
                        brand: material.brand,
                        material_composition: material.material_composition,
                    };
                    const response = await api.post('/materials', createData);
                    await localDb.markMaterialSynced(material.id, response.data.id);
                    result.pushed.materials++;
                } else if (!isLocalId(material.id)) {
                    const updateData = {
                        category_type: material.category_type,
                        name: material.name,
                        size: material.size,
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
    }

    // === PUSH SESSIONS ===
    private async pushSessions(result: SyncResult, projectIdMap: IdMigrationMap): Promise<void> {
        const pendingSessions = await localDb.getPendingSessions();

        for (const session of pendingSessions) {
            try {
                if (session._isLocal) {
                    // Obtenir le vrai project_id (UUID serveur)
                    let projectId = session.project_id;

                    // Si le project_id est local, utiliser le mapping
                    if (isLocalId(projectId)) {
                        const mappedId = projectIdMap.get(projectId);
                        if (mappedId) {
                            projectId = mappedId;
                            // Mettre a jour la session localement avec le nouveau project_id
                            await localDb.saveSession({
                                ...session,
                                project_id: projectId,
                            });
                        } else {
                            // Le projet n'a pas encore ete synchronise, skip pour l'instant
                            console.log(`[Sync] Session skip: projet ${projectId} pas encore sync`);
                            continue;
                        }
                    }

                    // Verifier que le project_id est un UUID valide
                    if (!isValidUuid(projectId)) {
                        console.warn(`[Sync] Session skip: project_id invalide ${projectId}`);
                        continue;
                    }

                    const createData = {
                        project_id: projectId,
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
    }

    // === PUSH PHOTOS ===
    private async pushPhotos(result: SyncResult, projectIdMap: IdMigrationMap): Promise<void> {
        const pendingPhotos = await localDb.getPendingPhotos();

        for (const photo of pendingPhotos) {
            try {
                // Vérifier si on a un fichier à uploader (soit File, soit ArrayBuffer)
                const hasFile = photo.file || photo.fileBuffer;

                if (photo._isLocal && hasFile) {
                    // Obtenir le vrai project_id
                    let projectId = photo.project_id;

                    if (isLocalId(projectId)) {
                        const mappedId = projectIdMap.get(projectId);
                        if (mappedId) {
                            projectId = mappedId;
                        } else {
                            console.log(`[Sync] Photo skip: projet ${projectId} pas encore sync`);
                            continue;
                        }
                    }

                    if (!isValidUuid(projectId)) {
                        console.warn(`[Sync] Photo skip: project_id invalide ${projectId}`);
                        continue;
                    }

                    // Reconstruire le fichier depuis ArrayBuffer si nécessaire
                    let fileToUpload: File | Blob;
                    if (photo.file) {
                        fileToUpload = photo.file;
                    } else if (photo.fileBuffer) {
                        // Reconstruire Blob depuis ArrayBuffer
                        fileToUpload = new Blob([photo.fileBuffer], {
                            type: photo.fileType || 'image/jpeg'
                        });
                    } else {
                        console.warn(`[Sync] Photo skip: pas de fichier disponible`);
                        continue;
                    }

                    const formData = new FormData();
                    formData.append('file', fileToUpload, photo.fileName || 'photo.jpg');

                    console.log(`[Sync] Upload photo: ${photo.id} pour projet ${projectId}`);
                    await api.post(`/photos?project_id=${projectId}`, formData, {
                        headers: { 'Content-Type': 'multipart/form-data' }
                    });
                    await localDb.deletePhoto(photo.id);
                    result.pushed.photos++;
                    console.log(`[Sync] Photo uploadée: ${photo.id}`);
                }
            } catch (error: any) {
                console.error(`[Sync] Erreur photo:`, error.response?.data || error.message);
                result.errors.push(`Photo: ${error.message}`);
            }
        }
    }

    // === PULL CATEGORIES (pour mapping) ===
    private async pullCategories(result: SyncResult): Promise<void> {
        try {
            const response = await api.get('/categories');
            const remoteCategories = response.data;
            if (Array.isArray(remoteCategories)) {
                await localDb.importFromApi({ categories: remoteCategories });
                result.pulled.categories = remoteCategories.length;
            }
        } catch {
            // Categories locales suffisent
        }
    }

    // === PULL DATA FROM API ===
    private async pullData(result: SyncResult): Promise<void> {
        try {
            const projectsResponse = await api.get('/projects');
            const remoteProjects = projectsResponse.data;
            if (Array.isArray(remoteProjects)) {
                await localDb.importFromApi({ projects: remoteProjects });
                result.pulled.projects = remoteProjects.length;

                // Récupérer les photos de chaque projet
                for (const project of remoteProjects) {
                    try {
                        const photosResponse = await api.get(`/photos?project_id=${project.id}`);
                        const remotePhotos = photosResponse.data;
                        if (Array.isArray(remotePhotos)) {
                            for (const photo of remotePhotos) {
                                // Vérifier si la photo existe déjà localement
                                const existingPhotos = await localDb.getPhotosByProject(project.id);
                                const exists = existingPhotos.some(p => p.id === photo.id || p.file_path === photo.file_path);
                                if (!exists) {
                                    // Ajouter la photo depuis le serveur (sans le fichier, juste le file_path)
                                    await localDb.savePhoto({
                                        id: photo.id,
                                        project_id: photo.project_id,
                                        file_path: photo.file_path,
                                        created_at: photo.created_at,
                                        _syncStatus: 'synced',
                                        _isLocal: false
                                    });
                                }
                            }
                        }
                    } catch {
                        // Ignore les erreurs de photos
                    }
                }
            }
        } catch (error: any) {
            console.warn(`[Sync] Pull projets echoue:`, error.message);
        }

        try {
            const materialsResponse = await api.get('/materials');
            const remoteMaterials = materialsResponse.data;
            if (Array.isArray(remoteMaterials)) {
                await localDb.importFromApi({ materials: remoteMaterials });
                result.pulled.materials = remoteMaterials.length;
            }
        } catch (error: any) {
            console.warn(`[Sync] Pull materiels echoue:`, error.message);
        }
    }

    // === HELPERS ===

    /**
     * Migre un projet de son ID local vers l'ID serveur
     * et met a jour toutes les entites liees
     */
    private async migrateProjectId(localId: string, serverId: string, projectData: any): Promise<void> {
        // 1. IMPORTANT: Recuperer les entites liees AVANT de supprimer le projet
        // (car deleteProject supprime aussi les sessions/photos liees)
        const sessions = await localDb.getSessionsByProject(localId);
        const photos = await localDb.getPhotosByProject(localId);
        const note = await localDb.getNoteByProject(localId);

        // 2. Supprimer l'ancien projet local (et ses entites liees)
        await localDb.deleteProject(localId);

        // 3. Creer le projet avec l'ID serveur
        await localDb.saveProject({
            ...projectData,
            id: serverId,
            _syncStatus: 'synced',
            _isLocal: false,
        });

        // 4. Re-creer les sessions avec le nouveau project_id
        for (const session of sessions) {
            await localDb.saveSession({
                ...session,
                project_id: serverId,
            });
        }

        // 5. Re-creer les photos avec le nouveau project_id
        for (const photo of photos) {
            await localDb.savePhoto({
                ...photo,
                project_id: serverId,
            });
        }

        // 6. Re-creer la note avec le nouveau project_id
        if (note) {
            await localDb.saveNote({
                ...note,
                project_id: serverId,
            });
        }

        console.log(`[Sync] Migration ID: ${localId} -> ${serverId} (${sessions.length} sessions, ${photos.length} photos)`);
    }

    /**
     * Convertit un category_id local en UUID serveur
     */
    private async getCategoryUuid(categoryId: string): Promise<string | null> {
        // Si c'est deja un UUID, le retourner
        if (isValidUuid(categoryId)) {
            return categoryId;
        }

        // Sinon, chercher dans les categories locales
        const categories = await localDb.getAllCategories();

        // Mapping des IDs locaux vers les labels
        const localIdToLabel: Record<string, string> = {
            'cat-pull': 'Pull',
            'cat-bonnet': 'Bonnet',
            'cat-echarpe': 'Echarpe',
            'cat-couverture': 'Couverture',
            'cat-gants': 'Gants',
            'cat-sac': 'Sac',
            'cat-amigurumi': 'Amigurumi',
            'cat-chaussettes': 'Chaussettes',
            'cat-gilet': 'Gilet',
            'cat-autre': 'Autre',
        };

        const label = localIdToLabel[categoryId];
        if (label) {
            const category = categories.find(c => c.label === label);
            if (category && isValidUuid(category.id)) {
                return category.id;
            }
        }

        // Si pas trouve, ne pas envoyer de category_id
        return null;
    }

    async initialLoad(): Promise<void> {
        console.log('[Sync] Chargement initial...');

        const localProjects = await localDb.getAllProjects();
        if (localProjects.length > 0) {
            console.log(`[Sync] ${localProjects.length} projets locaux trouves`);
        }

        if (this.canSync()) {
            this.syncAll().catch(console.error);
        }
    }

    async getWeeklyTime(): Promise<number> {
        if (this.canSync()) {
            try {
                const response = await api.get('/sessions/weekly');
                return response.data.totalSeconds || 0;
            } catch {
                // Fallback sur calcul local
            }
        }

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

if (typeof window !== 'undefined') {
    (window as any).__syncService = syncService;
}
