/**
 * Hooks offline-first pour acceder aux donnees
 *
 * Architecture:
 * - Source de verite: IndexedDB local
 * - Sync avec API UNIQUEMENT si activee
 * - Fonctionne 100% hors ligne par defaut
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { localDb, generateLocalId, type LocalProject, type LocalMaterial } from '../services/localDb';
import { syncService } from '../services/syncService';

// === HELPER: Verifier si la sync est possible ===
function canSync(): boolean {
    return syncService.canSync();
}

// === PROJECTS ===

export function useProjects() {
    return useQuery({
        queryKey: ['projects'],
        queryFn: async () => {
            // Toujours lire depuis IndexedDB
            return await localDb.getAllProjects();
        },
        staleTime: 1000 * 60 * 5,
        gcTime: 1000 * 60 * 60 * 24 * 7,
    });
}

export function useProject(id: string | undefined) {
    return useQuery({
        queryKey: ['projects', id],
        queryFn: async () => {
            if (!id) return null;
            return await localDb.getProject(id) || null;
        },
        enabled: !!id,
        staleTime: 1000 * 60 * 5,
    });
}

export function useCreateProject() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (data: { title: string; goal_rows?: number; category_id?: string; material_ids?: string[] }) => {
            const id = generateLocalId();
            const project = await localDb.saveProject({
                id,
                title: data.title,
                goal_rows: data.goal_rows,
                category_id: data.category_id,
                material_ids: data.material_ids,
                current_row: 0,
                status: 'in_progress',
                _isLocal: true,
                _syncStatus: 'pending'
            });

            // Sync en background si activee
            if (canSync()) {
                syncService.syncAll().catch(console.error);
            }

            return project;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['projects'] });
        }
    });
}

export function useUpdateProject() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (data: Partial<LocalProject> & { id: string }) => {
            const project = await localDb.saveProject(data);

            // Sync en background si activee
            if (canSync()) {
                syncService.syncAll().catch(console.error);
            }

            return project;
        },
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ['projects'] });
            queryClient.invalidateQueries({ queryKey: ['projects', variables.id] });
        }
    });
}

export function useDeleteProject() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (id: string) => {
            await localDb.deleteProject(id);

            // Si sync activee et projet etait synced, supprimer cote serveur
            if (canSync() && !id.startsWith('local-')) {
                try {
                    const api = (await import('../services/api')).default;
                    await api.delete(`/projects/${id}`);
                } catch {
                    // Ignore si deja supprime
                }
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['projects'] });
        }
    });
}

// === MATERIALS ===

export function useMaterials() {
    return useQuery({
        queryKey: ['materials'],
        queryFn: async () => {
            return await localDb.getAllMaterials();
        },
        staleTime: 1000 * 60 * 5,
    });
}

export function useMaterial(id: string | undefined) {
    return useQuery({
        queryKey: ['materials', id],
        queryFn: async () => {
            if (!id) return null;
            return await localDb.getMaterial(id) || null;
        },
        enabled: !!id,
        staleTime: 1000 * 60 * 5,
    });
}

export function useCreateMaterial() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (data: { category_type: string; name: string; size?: string; brand?: string; material_composition?: string }) => {
            const id = generateLocalId();
            const material = await localDb.saveMaterial({
                id,
                category_type: data.category_type as any,
                name: data.name,
                size: data.size,
                brand: data.brand,
                material_composition: data.material_composition,
                _isLocal: true,
                _syncStatus: 'pending'
            });

            if (canSync()) {
                syncService.syncAll().catch(console.error);
            }

            return material;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['materials'] });
        }
    });
}

export function useUpdateMaterial() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (data: Partial<LocalMaterial> & { id: string }) => {
            const material = await localDb.saveMaterial(data);

            if (canSync()) {
                syncService.syncAll().catch(console.error);
            }

            return material;
        },
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ['materials'] });
            queryClient.invalidateQueries({ queryKey: ['materials', variables.id] });
        }
    });
}

export function useDeleteMaterial() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (id: string) => {
            await localDb.deleteMaterial(id);

            if (canSync() && !id.startsWith('local-')) {
                try {
                    const api = (await import('../services/api')).default;
                    await api.delete(`/materials/${id}`);
                } catch {
                    // Ignore
                }
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['materials'] });
        }
    });
}

// === NOTES ===

export function useNote(projectId: string | undefined) {
    return useQuery({
        queryKey: ['notes', projectId],
        queryFn: async () => {
            if (!projectId) return null;
            return await localDb.getNoteByProject(projectId) || null;
        },
        enabled: !!projectId,
    });
}

export function useSaveNote() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (data: { project_id: string; content: string }) => {
            const note = await localDb.saveNote(data);

            // Sync si activee
            if (canSync() && !data.project_id.startsWith('local-')) {
                try {
                    const api = (await import('../services/api')).default;
                    await api.post('/notes', { project_id: data.project_id, content: data.content });
                } catch {
                    // Sera sync plus tard
                }
            }

            return note;
        },
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ['notes', variables.project_id] });
        }
    });
}

export function useDeleteNote() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (data: { id: string; project_id: string }) => {
            await localDb.deleteNote(data.id);

            if (canSync() && !data.id.startsWith('local-')) {
                try {
                    const api = (await import('../services/api')).default;
                    await api.delete(`/notes/${data.id}`);
                } catch {
                    // Ignore
                }
            }
        },
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ['notes', variables.project_id] });
        }
    });
}

// === PHOTOS ===

export function usePhotos(projectId: string | undefined) {
    return useQuery({
        queryKey: ['photos', projectId],
        queryFn: async () => {
            if (!projectId) return [];
            return await localDb.getPhotosByProject(projectId);
        },
        enabled: !!projectId,
    });
}

export function useUploadPhoto() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (data: { project_id: string; file: File }) => {
            const id = generateLocalId();

            // Convertir en base64 pour l'affichage local
            const base64 = await new Promise<string>((resolve, reject) => {
                const reader = new FileReader();
                reader.onload = () => resolve(reader.result as string);
                reader.onerror = reject;
                reader.readAsDataURL(data.file);
            });

            // Sauvegarder localement
            const photo = await localDb.savePhoto({
                id,
                project_id: data.project_id,
                base64,
                file: data.file,
                _syncStatus: 'pending',
                _isLocal: true
            });

            // Upload si sync activee
            if (canSync()) {
                syncService.syncAll().catch(console.error);
            }

            return photo;
        },
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ['photos', variables.project_id] });
        }
    });
}

export function useDeletePhoto() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (data: { id: string; project_id: string }) => {
            await localDb.deletePhoto(data.id);

            if (canSync() && !data.id.startsWith('local-')) {
                try {
                    const api = (await import('../services/api')).default;
                    await api.delete(`/photos/${data.id}`);
                } catch {
                    // Ignore
                }
            }
        },
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ['photos', variables.project_id] });
        }
    });
}

// === SESSIONS ===

export function useSaveSession() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (data: { project_id: string; start_time: string; end_time: string; duration_seconds: number }) => {
            const id = generateLocalId();
            const session = await localDb.saveSession({
                id,
                ...data,
                _isLocal: true,
                _syncStatus: 'pending'
            });

            if (canSync()) {
                syncService.syncAll().catch(console.error);
            }

            return session;
        },
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ['sessions', variables.project_id] });
            queryClient.invalidateQueries({ queryKey: ['weeklyTime'] });
        }
    });
}

// === CATEGORIES ===

export function useCategories() {
    return useQuery({
        queryKey: ['categories'],
        queryFn: async () => {
            return await localDb.getAllCategories();
        },
        staleTime: 1000 * 60 * 60, // 1 heure
    });
}

// === WEEKLY TIME ===

export function useWeeklyTime() {
    return useQuery({
        queryKey: ['weeklyTime'],
        queryFn: async () => {
            const totalSeconds = await syncService.getWeeklyTime();
            return { totalSeconds };
        },
        staleTime: 1000 * 60, // 1 minute
    });
}

// === SYNC ===

export function useSync() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async () => {
            return await syncService.syncAll();
        },
        onSuccess: () => {
            queryClient.invalidateQueries();
        }
    });
}
