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

import { isAxiosError } from 'axios';
import api from './api';
import { localDb, type LocalProject } from './localDb';

declare global {
    interface Window {
        __syncService?: typeof syncService;
    }
}

export interface SyncResult {
    success: boolean;
    pushed: { projects: number; materials: number; sessions: number; photos: number; covers: number; deletions: number };
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

function base64ToBlob(base64Data: string): Blob | null {
    try {
        const commaIndex = base64Data.indexOf(',');
        const metadata = commaIndex > -1 ? base64Data.slice(0, commaIndex) : '';
        const rawData = commaIndex > -1 ? base64Data.slice(commaIndex + 1) : base64Data;
        const mimeMatch = metadata.match(/data:(.*?);base64/);
        const mimeType = mimeMatch?.[1] || 'image/jpeg';
        const binary = atob(rawData);
        const bytes = new Uint8Array(binary.length);

        for (let i = 0; i < binary.length; i++) {
            bytes[i] = binary.charCodeAt(i);
        }

        return new Blob([bytes], { type: mimeType });
    } catch {
        return null;
    }
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
                pushed: { projects: 0, materials: 0, sessions: 0, photos: 0, covers: 0, deletions: 0 },
                pulled: { projects: 0, materials: 0, categories: 0 },
                errors: [],
                skipped: true,
                reason: 'Sync desactivee'
            };
        }

        if (this.isSyncing) {
            return {
                success: false,
                pushed: { projects: 0, materials: 0, sessions: 0, photos: 0, covers: 0, deletions: 0 },
                pulled: { projects: 0, materials: 0, categories: 0 },
                errors: ['Deja en cours'],
                skipped: true
            };
        }

        if (!navigator.onLine) {
            return {
                success: false,
                pushed: { projects: 0, materials: 0, sessions: 0, photos: 0, covers: 0, deletions: 0 },
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
            pushed: { projects: 0, materials: 0, sessions: 0, photos: 0, covers: 0, deletions: 0 },
            pulled: { projects: 0, materials: 0, categories: 0 },
            errors: []
        };

        // Map pour suivre les migrations d'IDs
        const projectIdMap: IdMigrationMap = new Map();

        try {
            // 1. D'abord recuperer les categories du serveur pour avoir les vrais UUIDs
            await this.pullCategories(result);

            // 2. PUSH: Suppressions d'abord (pour ne pas re-telecharger les elements supprimes)
            await this.pushDeletions(result);

            // 3. PUSH: Materials D'ABORD (pour obtenir les vrais IDs avant les projets)
            const materialIdMap: IdMigrationMap = new Map();
            await this.pushMaterials(result, materialIdMap);

            // 3b. Mettre à jour les projets locaux avec les nouveaux IDs de matériaux
            if (materialIdMap.size > 0) {
                await this.updateLocalProjectMaterialIds(materialIdMap);
            }

            // 4. PUSH: Projets (avec les material_ids convertis)
            await this.pushProjects(result, projectIdMap, materialIdMap);

            // 5. PUSH: Sessions (avec les nouveaux project_id)
            await this.pushSessions(result, projectIdMap);

            // 6. PUSH: Photos (avec les nouveaux project_id)
            await this.pushPhotos(result, projectIdMap);

            // 7. PUSH: Couvertures projets (après migration des IDs)
            await this.pushProjectCovers(result, projectIdMap);

            // 8. PULL: Recuperer les donnees depuis l'API
            await this.pullData(result);

            // 9. Mettre a jour le timestamp de derniere sync
            await localDb.setLastSyncTime(Date.now());

            this.notifyStatus('Synchronisation terminee');
            console.log('[Sync] Terminee:', result);

        } catch (error: unknown) {
            result.success = false;
            const message = error instanceof Error ? error.message : 'Erreur inconnue';
            result.errors.push(message);
            this.notifyStatus('Erreur de synchronisation');
            console.error('[Sync] Erreur:', error);
        } finally {
            this.isSyncing = false;
        }

        return result;
    }

    // === PUSH PROJECTS ===
    private async pushProjects(result: SyncResult, idMap: IdMigrationMap, materialIdMap: IdMigrationMap): Promise<void> {
        const pendingProjects = await localDb.getPendingProjects();

        for (const project of pendingProjects) {
            try {
                if (project._isLocal) {
                    // Nouveau projet -> POST sans l'ID (le serveur le genere)
                    const createData: Record<string, unknown> = {
                        title: project.title,
                        goal_rows: project.goal_rows,
                        current_row: project.current_row || 0,
                        total_duration: project.total_duration || 0,
                        status: project.status || 'in_progress',
                    };

                    if (project.project_steps !== undefined) {
                        createData.project_steps = project.project_steps;
                    }
                    if (project.active_step_index !== undefined) {
                        createData.active_step_index = project.active_step_index;
                    }

                    // Convertir category_id local en UUID si necessaire
                    if (project.category_id) {
                        const categoryUuid = await this.getCategoryUuid(project.category_id);
                        if (categoryUuid) {
                            createData.category_id = categoryUuid;
                        }
                    }

                    // Ajouter les material_ids en convertissant les IDs locaux en UUIDs serveur
                    if (project.material_ids && project.material_ids.length > 0) {
                        const convertedMaterialIds: string[] = [];
                        for (const matId of project.material_ids) {
                            if (isValidUuid(matId)) {
                                // Déjà un UUID valide
                                convertedMaterialIds.push(matId);
                            } else if (isLocalId(matId) && materialIdMap.has(matId)) {
                                // ID local -> convertir via le map
                                convertedMaterialIds.push(materialIdMap.get(matId)!);
                                console.log(`[Sync] Material ID converti: ${matId} -> ${materialIdMap.get(matId)}`);
                            }
                        }
                        if (convertedMaterialIds.length > 0) {
                            createData.material_ids = convertedMaterialIds;
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
                    const updateData: Record<string, unknown> = {
                        title: project.title,
                        current_row: project.current_row,
                        goal_rows: project.goal_rows,
                        total_duration: project.total_duration,
                        status: project.status,
                        // Envoyer end_date: null si undefined pour permettre de reprendre un projet
                        end_date: project.end_date || null,
                    };
                    if (project.project_steps !== undefined) {
                        updateData.project_steps = project.project_steps;
                    }
                    if (project.active_step_index !== undefined) {
                        updateData.active_step_index = project.active_step_index;
                    }
                    // Convertir les material_ids locaux en UUIDs serveur
                    if (project.material_ids && project.material_ids.length > 0) {
                        const convertedMaterialIds: string[] = [];
                        for (const matId of project.material_ids) {
                            if (isValidUuid(matId)) {
                                convertedMaterialIds.push(matId);
                            } else if (isLocalId(matId) && materialIdMap.has(matId)) {
                                convertedMaterialIds.push(materialIdMap.get(matId)!);
                                console.log(`[Sync] Material ID converti (update): ${matId} -> ${materialIdMap.get(matId)}`);
                            }
                        }
                        updateData.material_ids = convertedMaterialIds;
                    } else {
                        updateData.material_ids = [];
                    }

                    await api.patch(`/projects/${project.id}`, updateData);
                    await localDb.markProjectSynced(project.id);
                    result.pushed.projects++;
                    console.log(`[Sync] Projet maj: ${project.title}`);
                }
            } catch (error: unknown) {
                const errorMsg = isAxiosError(error) ? (error.response?.data?.message || error.message) : (error instanceof Error ? error.message : 'Unknown error');
                console.error(`[Sync] Erreur projet ${project.title}:`, isAxiosError(error) ? error.response?.data : errorMsg);
                result.errors.push(`Projet ${project.title}: ${errorMsg}`);
            }
        }
    }

    // === PUSH PROJECT COVERS ===
    private async pushProjectCovers(result: SyncResult, projectIdMap: IdMigrationMap): Promise<void> {
        const allProjects = await localDb.getAllProjects();
        const pendingCovers = allProjects.filter(project => project.cover_sync_status === 'pending');

        for (const project of pendingCovers) {
            try {
                const mappedProjectId = projectIdMap.get(project.id) || project.id;
                if (!isValidUuid(mappedProjectId)) {
                    continue;
                }

                // Si aucune base64, cela signifie que la couverture doit être supprimée.
                if (!project.cover_base64) {
                    await api.delete(`/projects/${mappedProjectId}/cover`);
                    await localDb.saveProject({
                        id: mappedProjectId,
                        cover_file_path: undefined,
                        cover_base64: undefined,
                        cover_sync_status: 'synced',
                        _syncStatus: project._syncStatus,
                        _isLocal: project._isLocal,
                    });
                    result.pushed.covers++;
                    continue;
                }

                const coverBlob = base64ToBlob(project.cover_base64);
                if (!coverBlob) {
                    result.errors.push(`Couverture ${project.title}: format invalide`);
                    continue;
                }

                const formData = new FormData();
                formData.append('file', coverBlob, `cover-${mappedProjectId}.jpg`);

                const response = await api.post(`/projects/${mappedProjectId}/cover`, formData, {
                    headers: { 'Content-Type': 'multipart/form-data' }
                });

                await localDb.saveProject({
                    id: mappedProjectId,
                    cover_file_path: response.data?.cover_file_path,
                    cover_sync_status: 'synced',
                    _syncStatus: project._syncStatus,
                    _isLocal: false,
                });

                result.pushed.covers++;
            } catch (error: unknown) {
                const errorMsg = isAxiosError(error) ? (error.response?.data?.message || error.message) : (error instanceof Error ? error.message : 'Unknown error');
                result.errors.push(`Couverture ${project.title}: ${errorMsg}`);
            }
        }
    }

    // === PUSH MATERIALS ===
    private async pushMaterials(result: SyncResult, idMap: IdMigrationMap): Promise<void> {
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
                    const serverId = response.data.id;

                    // Sauvegarder le mapping d'ID pour les projets qui référencent ce matériau
                    idMap.set(material.id, serverId);

                    await localDb.markMaterialSynced(material.id, serverId);
                    result.pushed.materials++;
                    console.log(`[Sync] Materiel cree: ${material.name} (${material.id} -> ${serverId})`);
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
            } catch (error: unknown) {
                const errorMsg = isAxiosError(error) ? (error.response?.data?.message || error.message) : (error instanceof Error ? error.message : 'Unknown error');
                console.error(`[Sync] Erreur materiel:`, isAxiosError(error) ? error.response?.data : errorMsg);
                result.errors.push(`Materiel ${material.name}: ${errorMsg}`);
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
            } catch (error: unknown) {
                const errorMsg = isAxiosError(error) ? (error.response?.data?.message || error.message) : (error instanceof Error ? error.message : 'Unknown error');
                console.error(`[Sync] Erreur session:`, isAxiosError(error) ? error.response?.data : errorMsg);
                result.errors.push(`Session: ${errorMsg}`);
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
            } catch (error: unknown) {
                const errorMsg = isAxiosError(error) ? (error.response?.data?.message || error.message) : (error instanceof Error ? error.message : 'Unknown error');
                console.error(`[Sync] Erreur photo:`, isAxiosError(error) ? error.response?.data : errorMsg);
                result.errors.push(`Photo: ${errorMsg}`);
            }
        }
    }

    // === PUSH DELETIONS ===
    private async pushDeletions(result: SyncResult): Promise<void> {
        const pendingDeletions = await localDb.getPendingDeletions();

        for (const deletion of pendingDeletions) {
            try {
                let endpoint = '';
                switch (deletion.entity_type) {
                    case 'project':
                        endpoint = `/projects/${deletion.entity_id}`;
                        break;
                    case 'material':
                        endpoint = `/materials/${deletion.entity_id}`;
                        break;
                    case 'photo':
                        endpoint = `/photos/${deletion.entity_id}`;
                        break;
                    case 'session':
                        endpoint = `/sessions/${deletion.entity_id}`;
                        break;
                    case 'note':
                        endpoint = `/notes/${deletion.entity_id}`;
                        break;
                    default:
                        console.warn(`[Sync] Type de suppression non supporté: ${deletion.entity_type}`);
                        continue;
                }

                console.log(`[Sync] Suppression sur serveur: ${deletion.entity_type} ${deletion.entity_id}`);
                await api.delete(endpoint);
                await localDb.clearDeletion(deletion.id);
                result.pushed.deletions++;
                console.log(`[Sync] Suppression synchronisée: ${deletion.entity_type} ${deletion.entity_id}`);
            } catch (error: unknown) {
                // 404 = déjà supprimé sur le serveur, on peut nettoyer localement
                if (isAxiosError(error) && error.response?.status === 404) {
                    console.log(`[Sync] Déjà supprimé sur serveur: ${deletion.entity_type} ${deletion.entity_id}`);
                    await localDb.clearDeletion(deletion.id);
                    result.pushed.deletions++;
                } else {
                    const errorMsg = isAxiosError(error) ? (error.response?.data?.message || error.message) : (error instanceof Error ? error.message : 'Unknown error');
                    console.error(`[Sync] Erreur suppression ${deletion.entity_type}:`, isAxiosError(error) ? error.response?.data : errorMsg);
                    result.errors.push(`Suppression ${deletion.entity_type}: ${errorMsg}`);
                }
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
                const deletedPhotos = await localDb.getDeletionsByType('photo');
                const deletedPhotoIds = new Set(deletedPhotos.map(d => d.entity_id));

                for (const project of remoteProjects) {
                    try {
                        const photosResponse = await api.get(`/photos?project_id=${project.id}`);
                        const remotePhotos = photosResponse.data;
                        if (Array.isArray(remotePhotos)) {
                            for (const photo of remotePhotos) {
                                // Ne pas re-télécharger les photos supprimées localement
                                if (deletedPhotoIds.has(photo.id)) {
                                    console.log(`⏭️ [Sync] Skipping deleted photo: ${photo.id}`);
                                    continue;
                                }

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
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : 'Unknown error';
            console.warn(`[Sync] Pull projets echoue:`, message);
        }

        try {
            const materialsResponse = await api.get('/materials');
            const remoteMaterials = materialsResponse.data;
            if (Array.isArray(remoteMaterials)) {
                await localDb.importFromApi({ materials: remoteMaterials });
                result.pulled.materials = remoteMaterials.length;
            }
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : 'Unknown error';
            console.warn(`[Sync] Pull materiels echoue:`, message);
        }
    }

    // === HELPERS ===

    /**
     * Met à jour les material_ids dans les projets locaux après que les matériaux ont été synchronisés
     */
    private async updateLocalProjectMaterialIds(materialIdMap: IdMigrationMap): Promise<void> {
        const allProjects = await localDb.getAllProjects();

        for (const project of allProjects) {
            if (!project.material_ids || project.material_ids.length === 0) continue;

            let hasChanges = false;
            const updatedMaterialIds: string[] = [];

            for (const matId of project.material_ids) {
                if (materialIdMap.has(matId)) {
                    updatedMaterialIds.push(materialIdMap.get(matId)!);
                    hasChanges = true;
                    console.log(`[Sync] Projet ${project.title}: material_id ${matId} -> ${materialIdMap.get(matId)}`);
                } else {
                    updatedMaterialIds.push(matId);
                }
            }

            if (hasChanges) {
                await localDb.saveProject({
                    ...project,
                    material_ids: updatedMaterialIds,
                    _syncStatus: project._syncStatus, // Garder le status actuel
                });
            }
        }
    }

    /**
     * Migre un projet de son ID local vers l'ID serveur
     * et met a jour toutes les entites liees
     */
    private async migrateProjectId(localId: string, serverId: string, projectData: LocalProject): Promise<void> {
        // 1. IMPORTANT: Recuperer les entites liees AVANT de supprimer le projet
        // (car deleteProject supprime aussi les sessions/photos liees)
        const sessions = await localDb.getSessionsByProject(localId);
        const photos = await localDb.getPhotosByProject(localId);
        const note = await localDb.getNoteByProject(localId);

        console.log(`[Sync] Migration: ${projectData.title} (${localId} -> ${serverId})`);
        console.log(`[Sync]   - Sessions: ${sessions.length}, Photos: ${photos.length}, Note: ${note ? 'oui' : 'non'}`);

        // 2. Supprimer l'ancien projet local (SANS tracker pour sync car on migre)
        await localDb.deleteProject(localId, false);

        // 3. Creer le projet avec l'ID serveur (préserver toutes les données)
        await localDb.saveProject({
            id: serverId,
            title: projectData.title,
            current_row: projectData.current_row || 0,
            goal_rows: projectData.goal_rows,
            total_duration: projectData.total_duration || 0,
            status: projectData.status || 'in_progress',
            category_id: projectData.category_id,
            material_ids: projectData.material_ids,
            cover_file_path: projectData.cover_file_path,
            cover_base64: projectData.cover_base64,
            cover_sync_status: projectData.cover_sync_status,
            project_steps: projectData.project_steps,
            active_step_index: projectData.active_step_index,
            created_at: projectData.created_at,
            end_date: projectData.end_date,
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
    window.__syncService = syncService;
}
