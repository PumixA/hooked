/**
 * Service de base de données locale offline-first
 * IndexedDB est la source de vérité, l'API est un backup/sync
 */

import { openDB, type DBSchema, type IDBPDatabase } from 'idb';

const DB_NAME = 'hooked-offline-db';
const DB_VERSION = 3;

// --- TYPES ---
export interface LocalProject {
    id: string;
    title: string;
    current_row: number;
    goal_rows?: number;
    total_duration?: number;
    status: string;
    category_id?: string;
    material_ids?: string[]; // IDs des matériaux associés
    created_at: string;
    updated_at: string;
    end_date?: string;
    // Métadonnées de sync
    _syncStatus: 'synced' | 'pending' | 'conflict';
    _localUpdatedAt: number;
    _isLocal: boolean; // Créé localement, jamais synced
}

export interface LocalMaterial {
    id: string;
    category_type: 'hook' | 'yarn' | 'needle';
    name: string;
    size?: string;
    brand?: string;
    material_composition?: string;
    created_at: string;
    updated_at: string;
    _syncStatus: 'synced' | 'pending' | 'conflict';
    _localUpdatedAt: number;
    _isLocal: boolean;
}

export interface LocalSession {
    id: string;
    project_id: string;
    start_time: string;
    end_time: string;
    duration_seconds: number;
    _syncStatus: 'synced' | 'pending';
    _localUpdatedAt: number;
    _isLocal: boolean;
}

export interface LocalNote {
    id: string;
    project_id: string;
    content: string;
    created_at: string;
    updated_at: string;
    _syncStatus: 'synced' | 'pending';
    _localUpdatedAt: number;
    _isLocal: boolean;
}

export interface LocalPhoto {
    id: string;
    project_id: string;
    file_path?: string;
    base64?: string;
    file?: File | Blob;
    fileBuffer?: ArrayBuffer; // Stockage plus fiable que File pour IndexedDB
    fileType?: string; // MIME type du fichier
    fileName?: string; // Nom du fichier original
    created_at: string;
    _syncStatus: 'synced' | 'pending';
    _isLocal: boolean;
}

export interface LocalCategory {
    id: string;
    label: string;
    icon?: string;
}

// Tracking des suppressions locales pour sync
export interface LocalDeletion {
    id: string;
    entity_type: 'project' | 'material' | 'session' | 'photo' | 'note' | 'category';
    entity_id: string;
    deleted_at: number;
}

interface HookedOfflineDB extends DBSchema {
    projects: {
        key: string;
        value: LocalProject;
        indexes: { 'by-updated': number; 'by-sync': string };
    };
    materials: {
        key: string;
        value: LocalMaterial;
        indexes: { 'by-updated': number; 'by-sync': string };
    };
    sessions: {
        key: string;
        value: LocalSession;
        indexes: { 'by-project': string; 'by-sync': string };
    };
    notes: {
        key: string;
        value: LocalNote;
        indexes: { 'by-project': string };
    };
    photos: {
        key: string;
        value: LocalPhoto;
        indexes: { 'by-project': string; 'by-sync': string };
    };
    categories: {
        key: string;
        value: LocalCategory;
    };
    metadata: {
        key: string;
        value: { key: string; value: any };
    };
    deletions: {
        key: string;
        value: LocalDeletion;
        indexes: { 'by-entity': string };
    };
}

let dbInstance: IDBPDatabase<HookedOfflineDB> | null = null;

async function getDb(): Promise<IDBPDatabase<HookedOfflineDB>> {
    if (dbInstance) {
        // Vérifier si la version de la DB est à jour
        if (dbInstance.version < DB_VERSION) {
            console.log(`[LocalDB] Upgrading DB from version ${dbInstance.version} to ${DB_VERSION}`);
            dbInstance.close();
            dbInstance = null;
        } else {
            return dbInstance;
        }
    }

    dbInstance = await openDB<HookedOfflineDB>(DB_NAME, DB_VERSION, {
        upgrade(db, oldVersion) {
            console.log(`[LocalDB] Upgrading from version ${oldVersion} to ${DB_VERSION}`);
            // Projects
            if (!db.objectStoreNames.contains('projects')) {
                const projectStore = db.createObjectStore('projects', { keyPath: 'id' });
                projectStore.createIndex('by-updated', '_localUpdatedAt');
                projectStore.createIndex('by-sync', '_syncStatus');
            }

            // Materials
            if (!db.objectStoreNames.contains('materials')) {
                const materialStore = db.createObjectStore('materials', { keyPath: 'id' });
                materialStore.createIndex('by-updated', '_localUpdatedAt');
                materialStore.createIndex('by-sync', '_syncStatus');
            }

            // Sessions
            if (!db.objectStoreNames.contains('sessions')) {
                const sessionStore = db.createObjectStore('sessions', { keyPath: 'id' });
                sessionStore.createIndex('by-project', 'project_id');
                sessionStore.createIndex('by-sync', '_syncStatus');
            }

            // Notes
            if (!db.objectStoreNames.contains('notes')) {
                const noteStore = db.createObjectStore('notes', { keyPath: 'id' });
                noteStore.createIndex('by-project', 'project_id');
            }

            // Photos
            if (!db.objectStoreNames.contains('photos')) {
                const photoStore = db.createObjectStore('photos', { keyPath: 'id' });
                photoStore.createIndex('by-project', 'project_id');
                photoStore.createIndex('by-sync', '_syncStatus');
            }

            // Categories
            if (!db.objectStoreNames.contains('categories')) {
                db.createObjectStore('categories', { keyPath: 'id' });
            }

            // Metadata (pour stocker lastSync, etc.)
            if (!db.objectStoreNames.contains('metadata')) {
                db.createObjectStore('metadata', { keyPath: 'key' });
            }

            // Deletions (pour tracker les suppressions locales à synchroniser)
            if (!db.objectStoreNames.contains('deletions')) {
                const deletionStore = db.createObjectStore('deletions', { keyPath: 'id' });
                deletionStore.createIndex('by-entity', 'entity_type');
            }
        },
    });

    return dbInstance;
}

// --- HELPER: Générer un ID local ---
export const generateLocalId = () => `local-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

// --- PROJECTS ---
export const localDb = {
    // === PROJECTS ===
    async getAllProjects(): Promise<LocalProject[]> {
        const db = await getDb();
        return db.getAll('projects');
    },

    async getProject(id: string): Promise<LocalProject | undefined> {
        const db = await getDb();
        return db.get('projects', id);
    },

    async saveProject(project: Partial<LocalProject> & { id: string }): Promise<LocalProject> {
        const db = await getDb();
        const existing = await db.get('projects', project.id);

        const now = Date.now();

        // Déterminer le _syncStatus:
        // - Si explicitement fourni, utiliser la valeur fournie
        // - Si c'est une mise à jour (existing existe) et qu'on modifie des données, marquer comme 'pending'
        // - Sinon, garder la valeur existante ou 'pending' par défaut
        let syncStatus: 'synced' | 'pending' | 'conflict' = 'pending';
        if (project._syncStatus !== undefined) {
            // Valeur explicite fournie (ex: lors de l'import depuis API)
            syncStatus = project._syncStatus;
        } else if (existing) {
            // C'est une mise à jour -> toujours marquer comme 'pending' pour re-sync
            syncStatus = 'pending';
        }

        // Gestion spéciale de end_date: si explicitement fourni (même undefined), utiliser la valeur fournie
        // Sinon, garder la valeur existante
        const hasEndDateProp = 'end_date' in project;
        const endDateValue = hasEndDateProp ? project.end_date : existing?.end_date;

        const fullProject: LocalProject = {
            id: project.id,
            title: project.title !== undefined ? project.title : (existing?.title || 'Sans titre'),
            current_row: project.current_row ?? existing?.current_row ?? 0,
            goal_rows: project.goal_rows ?? existing?.goal_rows,
            total_duration: project.total_duration ?? existing?.total_duration ?? 0,
            status: project.status || existing?.status || 'in_progress',
            category_id: project.category_id ?? existing?.category_id,
            material_ids: project.material_ids ?? existing?.material_ids,
            created_at: existing?.created_at || project.created_at || new Date().toISOString(),
            updated_at: new Date().toISOString(),
            end_date: endDateValue,
            _syncStatus: syncStatus,
            _localUpdatedAt: now,
            _isLocal: project._isLocal ?? existing?._isLocal ?? true,
        };

        await db.put('projects', fullProject);
        console.log(`💾 [LocalDB] Project saved: ${fullProject.title} (${fullProject._syncStatus})`);
        return fullProject;
    },

    async deleteProject(id: string, trackForSync: boolean = true): Promise<void> {
        const db = await getDb();
        const project = await db.get('projects', id);

        // Tracker la suppression pour sync si c'est un projet synchronisé (pas local-only)
        if (trackForSync && project && !project._isLocal && !id.startsWith('local-')) {
            await this.trackDeletion('project', id);
        }

        await db.delete('projects', id);
        // Supprimer aussi les données liées
        const sessions = await db.getAllFromIndex('sessions', 'by-project', id);
        for (const session of sessions) {
            await db.delete('sessions', session.id);
        }
        const photos = await db.getAllFromIndex('photos', 'by-project', id);
        for (const photo of photos) {
            await db.delete('photos', photo.id);
        }
        console.log(`🗑️ [LocalDB] Project deleted: ${id}`);
    },

    async getPendingProjects(): Promise<LocalProject[]> {
        const db = await getDb();
        return db.getAllFromIndex('projects', 'by-sync', 'pending');
    },

    async markProjectSynced(id: string, serverId?: string): Promise<void> {
        const db = await getDb();
        const project = await db.get('projects', id);
        if (project) {
            // Si l'ID serveur est différent, on doit migrer
            if (serverId && serverId !== id) {
                await db.delete('projects', id);
                project.id = serverId;
            }
            project._syncStatus = 'synced';
            project._isLocal = false;
            await db.put('projects', project);
        }
    },

    // === MATERIALS ===
    async getAllMaterials(): Promise<LocalMaterial[]> {
        const db = await getDb();
        return db.getAll('materials');
    },

    async getMaterial(id: string): Promise<LocalMaterial | undefined> {
        const db = await getDb();
        return db.get('materials', id);
    },

    async saveMaterial(material: Partial<LocalMaterial> & { id: string }): Promise<LocalMaterial> {
        const db = await getDb();
        const existing = await db.get('materials', material.id);

        const now = Date.now();
        const fullMaterial: LocalMaterial = {
            id: material.id,
            category_type: material.category_type || existing?.category_type || 'hook',
            name: material.name || existing?.name || '',
            size: material.size ?? existing?.size,
            brand: material.brand ?? existing?.brand,
            material_composition: material.material_composition ?? existing?.material_composition,
            created_at: existing?.created_at || material.created_at || new Date().toISOString(),
            updated_at: new Date().toISOString(),
            _syncStatus: material._syncStatus ?? existing?._syncStatus ?? 'pending',
            _localUpdatedAt: now,
            _isLocal: material._isLocal ?? existing?._isLocal ?? true,
        };

        await db.put('materials', fullMaterial);
        console.log(`💾 [LocalDB] Material saved: ${fullMaterial.name}`);
        return fullMaterial;
    },

    async deleteMaterial(id: string, trackForSync: boolean = true): Promise<void> {
        const db = await getDb();
        const material = await db.get('materials', id);

        // Tracker la suppression pour sync si c'est un matériel synchronisé
        if (trackForSync && material && !material._isLocal && !id.startsWith('local-')) {
            await this.trackDeletion('material', id);
        }

        await db.delete('materials', id);
        console.log(`🗑️ [LocalDB] Material deleted: ${id}`);
    },

    async getPendingMaterials(): Promise<LocalMaterial[]> {
        const db = await getDb();
        return db.getAllFromIndex('materials', 'by-sync', 'pending');
    },

    async markMaterialSynced(id: string, serverId?: string): Promise<void> {
        const db = await getDb();
        const material = await db.get('materials', id);
        if (material) {
            if (serverId && serverId !== id) {
                await db.delete('materials', id);
                material.id = serverId;
            }
            material._syncStatus = 'synced';
            material._isLocal = false;
            await db.put('materials', material);
        }
    },

    // === SESSIONS ===
    async getSessionsByProject(projectId: string): Promise<LocalSession[]> {
        const db = await getDb();
        return db.getAllFromIndex('sessions', 'by-project', projectId);
    },

    async saveSession(session: Partial<LocalSession> & { id: string; project_id: string }): Promise<LocalSession> {
        const db = await getDb();
        const existing = await db.get('sessions', session.id);

        const fullSession: LocalSession = {
            id: session.id,
            project_id: session.project_id,
            start_time: session.start_time || existing?.start_time || new Date().toISOString(),
            end_time: session.end_time || existing?.end_time || new Date().toISOString(),
            duration_seconds: session.duration_seconds ?? existing?.duration_seconds ?? 0,
            _syncStatus: session._syncStatus ?? existing?._syncStatus ?? 'pending',
            _localUpdatedAt: Date.now(),
            _isLocal: session._isLocal ?? existing?._isLocal ?? true,
        };

        await db.put('sessions', fullSession);
        console.log(`💾 [LocalDB] Session saved: ${fullSession.duration_seconds}s`);
        return fullSession;
    },

    async getPendingSessions(): Promise<LocalSession[]> {
        const db = await getDb();
        return db.getAllFromIndex('sessions', 'by-sync', 'pending');
    },

    async markSessionSynced(id: string): Promise<void> {
        const db = await getDb();
        const session = await db.get('sessions', id);
        if (session) {
            session._syncStatus = 'synced';
            session._isLocal = false;
            await db.put('sessions', session);
        }
    },

    // === NOTES ===
    async getNoteByProject(projectId: string): Promise<LocalNote | undefined> {
        const db = await getDb();
        const notes = await db.getAllFromIndex('notes', 'by-project', projectId);
        return notes[0]; // Une seule note par projet
    },

    async saveNote(note: Partial<LocalNote> & { project_id: string }): Promise<LocalNote> {
        const db = await getDb();
        // Chercher une note existante pour ce projet
        const existingNotes = await db.getAllFromIndex('notes', 'by-project', note.project_id);
        const existing = existingNotes[0];

        const fullNote: LocalNote = {
            id: note.id || existing?.id || generateLocalId(),
            project_id: note.project_id,
            content: note.content ?? existing?.content ?? '',
            created_at: existing?.created_at || new Date().toISOString(),
            updated_at: new Date().toISOString(),
            _syncStatus: note._syncStatus ?? existing?._syncStatus ?? 'pending',
            _localUpdatedAt: Date.now(),
            _isLocal: note._isLocal ?? existing?._isLocal ?? true,
        };

        await db.put('notes', fullNote);
        console.log(`💾 [LocalDB] Note saved for project: ${note.project_id}`);
        return fullNote;
    },

    async deleteNote(id: string, trackForSync: boolean = true): Promise<void> {
        const db = await getDb();
        const note = await db.get('notes', id);

        // Tracker la suppression pour sync si c'est une note synchronisée
        if (trackForSync && note && !note._isLocal && !id.startsWith('local-')) {
            await this.trackDeletion('note', id);
        }

        await db.delete('notes', id);
        console.log(`🗑️ [LocalDB] Note deleted: ${id}`);
    },

    // === PHOTOS ===
    async getPhotosByProject(projectId: string): Promise<LocalPhoto[]> {
        const db = await getDb();
        return db.getAllFromIndex('photos', 'by-project', projectId);
    },

    async savePhoto(photo: Partial<LocalPhoto> & { id: string; project_id: string }): Promise<LocalPhoto> {
        const db = await getDb();
        const existing = await db.get('photos', photo.id);

        // Convertir File/Blob en ArrayBuffer si fourni
        let fileBuffer = photo.fileBuffer ?? existing?.fileBuffer;
        let fileType = photo.fileType ?? existing?.fileType;
        let fileName = photo.fileName ?? existing?.fileName;

        if (photo.file && !fileBuffer) {
            try {
                fileBuffer = await photo.file.arrayBuffer();
                fileType = photo.file.type;
                fileName = (photo.file as File).name || 'photo.jpg';
            } catch (e) {
                console.warn('[LocalDB] Could not convert file to ArrayBuffer:', e);
            }
        }

        const fullPhoto: LocalPhoto = {
            id: photo.id,
            project_id: photo.project_id,
            file_path: photo.file_path ?? existing?.file_path,
            base64: photo.base64 ?? existing?.base64,
            file: photo.file ?? existing?.file,
            fileBuffer,
            fileType,
            fileName,
            created_at: existing?.created_at || photo.created_at || new Date().toISOString(),
            _syncStatus: photo._syncStatus ?? existing?._syncStatus ?? 'pending',
            _isLocal: photo._isLocal ?? existing?._isLocal ?? true,
        };

        await db.put('photos', fullPhoto);
        console.log(`💾 [LocalDB] Photo saved: ${photo.id} (buffer: ${fileBuffer ? 'yes' : 'no'})`);
        return fullPhoto;
    },

    async deletePhoto(id: string, trackForSync: boolean = true): Promise<void> {
        const db = await getDb();
        const photo = await db.get('photos', id);

        // Tracker la suppression pour sync si c'est une photo synchronisée
        if (trackForSync && photo && !photo._isLocal && !id.startsWith('local-')) {
            await this.trackDeletion('photo', id);
        }

        await db.delete('photos', id);
        console.log(`🗑️ [LocalDB] Photo deleted: ${id}`);
    },

    async getPendingPhotos(): Promise<LocalPhoto[]> {
        const db = await getDb();
        return db.getAllFromIndex('photos', 'by-sync', 'pending');
    },

    // === CATEGORIES ===
    async getAllCategories(): Promise<LocalCategory[]> {
        const db = await getDb();
        return db.getAll('categories');
    },

    async saveCategories(categories: LocalCategory[]): Promise<void> {
        const db = await getDb();
        const tx = db.transaction('categories', 'readwrite');
        for (const cat of categories) {
            await tx.store.put(cat);
        }
        await tx.done;
        console.log(`💾 [LocalDB] ${categories.length} categories saved`);
    },

    // === METADATA ===
    async getLastSyncTime(): Promise<number | null> {
        const db = await getDb();
        const meta = await db.get('metadata', 'lastSync');
        return meta?.value || null;
    },

    async setLastSyncTime(time: number): Promise<void> {
        const db = await getDb();
        await db.put('metadata', { key: 'lastSync', value: time });
    },

    // === BULK OPERATIONS ===
    async importFromApi(data: {
        projects?: any[];
        materials?: any[];
        sessions?: any[];
        categories?: any[];
    }): Promise<void> {
        const db = await getDb();

        // Récupérer les suppressions locales pour ne pas re-télécharger des éléments supprimés
        const deletedProjects = await this.getDeletionsByType('project');
        const deletedMaterials = await this.getDeletionsByType('material');
        const deletedProjectIds = new Set(deletedProjects.map(d => d.entity_id));
        const deletedMaterialIds = new Set(deletedMaterials.map(d => d.entity_id));

        if (data.projects) {
            const tx = db.transaction('projects', 'readwrite');
            for (const p of data.projects) {
                // Ne pas importer les projets supprimés localement
                if (deletedProjectIds.has(p.id)) {
                    console.log(`⏭️ [LocalDB] Skipping deleted project: ${p.id}`);
                    continue;
                }

                const existing = await tx.store.get(p.id);

                // Comparer les timestamps pour déterminer quelle version garder
                const remoteUpdated = new Date(p.updated_at || p.created_at).getTime();
                const localUpdated = existing?._localUpdatedAt || 0;

                // Si on a des changements locaux non synchronisés ET plus récents, ne pas écraser
                if (existing && existing._syncStatus === 'pending' && localUpdated > remoteUpdated) {
                    console.log(`⏭️ [LocalDB] Keeping local version of project: ${p.title} (local is newer)`);
                    continue;
                }

                // Fusionner intelligemment
                const mergedProject = {
                    ...p,
                    // Garder les valeurs locales si elles sont supérieures (évite de perdre le travail)
                    current_row: existing ? Math.max(existing.current_row || 0, p.current_row || 0) : (p.current_row || 0),
                    total_duration: existing ? Math.max(existing.total_duration || 0, p.total_duration || 0) : (p.total_duration || 0),
                    _syncStatus: 'synced' as const,
                    _localUpdatedAt: Date.now(),
                    _isLocal: false,
                };
                await tx.store.put(mergedProject);
            }
            await tx.done;
        }

        if (data.materials) {
            const tx = db.transaction('materials', 'readwrite');
            for (const m of data.materials) {
                // Ne pas importer les matériaux supprimés localement
                if (deletedMaterialIds.has(m.id)) {
                    console.log(`⏭️ [LocalDB] Skipping deleted material: ${m.id}`);
                    continue;
                }

                const existing = await tx.store.get(m.id);

                // Comparer les timestamps
                const remoteUpdated = new Date(m.updated_at || m.created_at).getTime();
                const localUpdated = existing?._localUpdatedAt || 0;

                if (existing && existing._syncStatus === 'pending' && localUpdated > remoteUpdated) {
                    console.log(`⏭️ [LocalDB] Keeping local version of material: ${m.name}`);
                    continue;
                }

                await tx.store.put({
                    ...m,
                    _syncStatus: 'synced',
                    _localUpdatedAt: Date.now(),
                    _isLocal: false,
                });
            }
            await tx.done;
        }

        if (data.categories) {
            // Fusionner les catégories par LABEL (pas par ID) pour éviter les doublons
            const existingCategories = await this.getAllCategories();
            const existingByLabel = new Map<string, LocalCategory>();

            // Indexer les catégories existantes par label
            for (const cat of existingCategories) {
                existingByLabel.set(cat.label.toLowerCase(), cat);
            }

            const mergedCategories: LocalCategory[] = [];
            const processedLabels = new Set<string>();

            // Priorité aux catégories serveur (UUIDs)
            for (const remoteCat of data.categories) {
                const labelKey = remoteCat.label.toLowerCase();
                processedLabels.add(labelKey);

                // Si une catégorie locale existe avec le même label, la remplacer par celle du serveur
                const existingLocal = existingByLabel.get(labelKey);
                if (existingLocal && existingLocal.id !== remoteCat.id) {
                    console.log(`🔄 [LocalDB] Merging category: ${existingLocal.id} -> ${remoteCat.id} (${remoteCat.label})`);
                }

                mergedCategories.push({
                    id: remoteCat.id,
                    label: remoteCat.label,
                    icon: remoteCat.icon
                });
            }

            // Garder les catégories locales qui n'existent pas sur le serveur
            for (const localCat of existingCategories) {
                const labelKey = localCat.label.toLowerCase();
                if (!processedLabels.has(labelKey)) {
                    mergedCategories.push(localCat);
                }
            }

            // Remplacer toutes les catégories
            const tx = db.transaction('categories', 'readwrite');
            await tx.store.clear();
            for (const cat of mergedCategories) {
                await tx.store.put(cat);
            }
            await tx.done;

            console.log(`📥 [LocalDB] Categories merged: ${mergedCategories.length} total`);
        }

        console.log(`📥 [LocalDB] Imported data from API`);
    },

    // === DELETIONS (tracking pour sync) ===
    async trackDeletion(entityType: LocalDeletion['entity_type'], entityId: string): Promise<void> {
        try {
            const db = await getDb();
            if (!db.objectStoreNames.contains('deletions')) {
                console.warn('[LocalDB] Deletions store not available yet');
                return;
            }
            const deletion: LocalDeletion = {
                id: `del-${entityType}-${entityId}`,
                entity_type: entityType,
                entity_id: entityId,
                deleted_at: Date.now()
            };
            await db.put('deletions', deletion);
            console.log(`🗑️ [LocalDB] Deletion tracked: ${entityType} ${entityId}`);
        } catch (err) {
            console.warn('[LocalDB] Could not track deletion:', err);
        }
    },

    async getPendingDeletions(): Promise<LocalDeletion[]> {
        try {
            const db = await getDb();
            if (!db.objectStoreNames.contains('deletions')) {
                return [];
            }
            return db.getAll('deletions');
        } catch (err) {
            console.warn('[LocalDB] Could not get pending deletions:', err);
            return [];
        }
    },

    async getDeletionsByType(entityType: LocalDeletion['entity_type']): Promise<LocalDeletion[]> {
        try {
            const db = await getDb();
            if (!db.objectStoreNames.contains('deletions')) {
                return [];
            }
            return db.getAllFromIndex('deletions', 'by-entity', entityType);
        } catch (err) {
            console.warn('[LocalDB] Could not get deletions by type:', err);
            return [];
        }
    },

    async clearDeletion(id: string): Promise<void> {
        try {
            const db = await getDb();
            if (!db.objectStoreNames.contains('deletions')) {
                return;
            }
            await db.delete('deletions', id);
        } catch (err) {
            console.warn('[LocalDB] Could not clear deletion:', err);
        }
    },

    async clearDeletionByEntity(entityType: LocalDeletion['entity_type'], entityId: string): Promise<void> {
        try {
            const db = await getDb();
            if (!db.objectStoreNames.contains('deletions')) {
                return;
            }
            await db.delete('deletions', `del-${entityType}-${entityId}`);
        } catch (err) {
            console.warn('[LocalDB] Could not clear deletion by entity:', err);
        }
    },

    async isDeletedLocally(entityType: LocalDeletion['entity_type'], entityId: string): Promise<boolean> {
        try {
            const db = await getDb();
            if (!db.objectStoreNames.contains('deletions')) {
                return false;
            }
            const deletion = await db.get('deletions', `del-${entityType}-${entityId}`);
            return !!deletion;
        } catch (err) {
            console.warn('[LocalDB] Could not check if deleted locally:', err);
            return false;
        }
    },

    // === DEBUG ===
    async debugDump(): Promise<void> {
        const db = await getDb();
        console.log('='.repeat(60));
        console.log('📊 [LocalDB] DEBUG DUMP');
        console.log('='.repeat(60));

        const projects = await db.getAll('projects');
        console.log(`\n📁 Projects (${projects.length}):`);
        console.table(projects.map(p => ({
            id: p.id.substring(0, 15) + '...',
            title: p.title,
            status: p.status,
            sync: p._syncStatus,
            local: p._isLocal
        })));

        const materials = await db.getAll('materials');
        console.log(`\n🧶 Materials (${materials.length}):`);
        console.table(materials.map(m => ({
            id: m.id.substring(0, 15) + '...',
            name: m.name,
            type: m.category_type,
            sync: m._syncStatus
        })));

        const pendingProjects = await this.getPendingProjects();
        const pendingMaterials = await this.getPendingMaterials();
        const pendingPhotos = await this.getPendingPhotos();
        const pendingDeletions = await this.getPendingDeletions();

        console.log(`\n⏳ Pending sync:`);
        console.log(`   - Projects: ${pendingProjects.length}`);
        console.log(`   - Materials: ${pendingMaterials.length}`);
        console.log(`   - Photos: ${pendingPhotos.length}`);
        console.log(`   - Deletions: ${pendingDeletions.length}`);

        if (pendingDeletions.length > 0) {
            console.log(`\n🗑️ Pending deletions:`);
            console.table(pendingDeletions.map(d => ({
                type: d.entity_type,
                id: d.entity_id.substring(0, 15) + '...',
                deleted_at: new Date(d.deleted_at).toISOString()
            })));
        }

        console.log('='.repeat(60));
    },

    // === CLEAR ALL (pour debug) ===
    async clearAll(): Promise<void> {
        const db = await getDb();
        await db.clear('projects');
        await db.clear('materials');
        await db.clear('sessions');
        await db.clear('notes');
        await db.clear('photos');
        await db.clear('categories');
        await db.clear('metadata');
        if (db.objectStoreNames.contains('deletions')) {
            await db.clear('deletions');
        }
        console.log('🗑️ [LocalDB] All data cleared');
    }
};

// Exposer pour debug console
if (typeof window !== 'undefined') {
    (window as any).__localDb = localDb;
}
