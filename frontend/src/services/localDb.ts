/**
 * Service de base de données locale offline-first
 * IndexedDB est la source de vérité, l'API est un backup/sync
 */

import { openDB, type DBSchema, type IDBPDatabase } from 'idb';

const DB_NAME = 'hooked-offline-db';
const DB_VERSION = 2;

// --- TYPES ---
export interface LocalProject {
    id: string;
    title: string;
    current_row: number;
    goal_rows?: number;
    total_duration?: number;
    status: string;
    category_id?: string;
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
    created_at: string;
    _syncStatus: 'synced' | 'pending';
    _isLocal: boolean;
}

export interface LocalCategory {
    id: string;
    label: string;
    icon?: string;
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
}

let dbInstance: IDBPDatabase<HookedOfflineDB> | null = null;

async function getDb(): Promise<IDBPDatabase<HookedOfflineDB>> {
    if (dbInstance) return dbInstance;

    dbInstance = await openDB<HookedOfflineDB>(DB_NAME, DB_VERSION, {
        upgrade(db, _oldVersion) {
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
        const fullProject: LocalProject = {
            id: project.id,
            title: project.title || existing?.title || 'Sans titre',
            current_row: project.current_row ?? existing?.current_row ?? 0,
            goal_rows: project.goal_rows ?? existing?.goal_rows,
            total_duration: project.total_duration ?? existing?.total_duration ?? 0,
            status: project.status || existing?.status || 'in_progress',
            category_id: project.category_id ?? existing?.category_id,
            created_at: existing?.created_at || project.created_at || new Date().toISOString(),
            updated_at: new Date().toISOString(),
            end_date: project.end_date ?? existing?.end_date,
            _syncStatus: 'pending',
            _localUpdatedAt: now,
            _isLocal: existing?._isLocal ?? true,
        };

        await db.put('projects', fullProject);
        console.log(`💾 [LocalDB] Project saved: ${fullProject.title} (${fullProject._syncStatus})`);
        return fullProject;
    },

    async deleteProject(id: string): Promise<void> {
        const db = await getDb();
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
            brand: material.brand ?? existing?.brand,
            material_composition: material.material_composition ?? existing?.material_composition,
            created_at: existing?.created_at || material.created_at || new Date().toISOString(),
            updated_at: new Date().toISOString(),
            _syncStatus: 'pending',
            _localUpdatedAt: now,
            _isLocal: existing?._isLocal ?? true,
        };

        await db.put('materials', fullMaterial);
        console.log(`💾 [LocalDB] Material saved: ${fullMaterial.name}`);
        return fullMaterial;
    },

    async deleteMaterial(id: string): Promise<void> {
        const db = await getDb();
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
            _syncStatus: 'pending',
            _localUpdatedAt: Date.now(),
            _isLocal: existing?._isLocal ?? true,
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
            _syncStatus: 'pending',
            _localUpdatedAt: Date.now(),
            _isLocal: existing?._isLocal ?? true,
        };

        await db.put('notes', fullNote);
        console.log(`💾 [LocalDB] Note saved for project: ${note.project_id}`);
        return fullNote;
    },

    async deleteNote(id: string): Promise<void> {
        const db = await getDb();
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

        const fullPhoto: LocalPhoto = {
            id: photo.id,
            project_id: photo.project_id,
            file_path: photo.file_path ?? existing?.file_path,
            base64: photo.base64 ?? existing?.base64,
            file: photo.file ?? existing?.file,
            created_at: existing?.created_at || photo.created_at || new Date().toISOString(),
            _syncStatus: photo._syncStatus || 'pending',
            _isLocal: existing?._isLocal ?? true,
        };

        await db.put('photos', fullPhoto);
        console.log(`💾 [LocalDB] Photo saved: ${photo.id}`);
        return fullPhoto;
    },

    async deletePhoto(id: string): Promise<void> {
        const db = await getDb();
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

        if (data.projects) {
            const tx = db.transaction('projects', 'readwrite');
            for (const p of data.projects) {
                const existing = await tx.store.get(p.id);
                // Ne pas écraser si on a des changements locaux non synchronisés
                if (!existing || existing._syncStatus === 'synced') {
                    await tx.store.put({
                        ...p,
                        _syncStatus: 'synced',
                        _localUpdatedAt: Date.now(),
                        _isLocal: false,
                    });
                }
            }
            await tx.done;
        }

        if (data.materials) {
            const tx = db.transaction('materials', 'readwrite');
            for (const m of data.materials) {
                const existing = await tx.store.get(m.id);
                if (!existing || existing._syncStatus === 'synced') {
                    await tx.store.put({
                        ...m,
                        _syncStatus: 'synced',
                        _localUpdatedAt: Date.now(),
                        _isLocal: false,
                    });
                }
            }
            await tx.done;
        }

        if (data.categories) {
            await this.saveCategories(data.categories);
        }

        console.log(`📥 [LocalDB] Imported data from API`);
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

        console.log(`\n⏳ Pending sync:`);
        console.log(`   - Projects: ${pendingProjects.length}`);
        console.log(`   - Materials: ${pendingMaterials.length}`);
        console.log(`   - Photos: ${pendingPhotos.length}`);

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
        console.log('🗑️ [LocalDB] All data cleared');
    }
};

// Exposer pour debug console
if (typeof window !== 'undefined') {
    (window as any).__localDb = localDb;
}
