import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useSync } from '../context/SyncContext';
import type { SyncActionType } from '../context/SyncContext';

interface SafeMutationOptions {
    mutationFn: (variables: any) => Promise<any>;
    syncType: SyncActionType;
    queryKey: string[];
    onSuccess?: () => void;
    invalidates?: string[];
}

export function useSafeMutation({ mutationFn, syncType, queryKey, onSuccess }: SafeMutationOptions) {
    const { addToQueue, isOnline } = useSync();
    const queryClient = useQueryClient();

    // 🔥 VERSION SIMPLIFIÉE ET GARANTIE DE FONCTIONNER
    return useMutation({
        mutationFn: async (variables: any) => {
            console.log("🔍 [useSafeMutation] Début de la mutation");
            console.log("🔍 [useSafeMutation] isOnline:", isOnline);
            console.log("🔍 [useSafeMutation] navigator.onLine:", navigator.onLine);
            console.log("🔍 [useSafeMutation] variables:", variables);

            // Vérification simple et directe
            const actuallyOnline = isOnline && navigator.onLine;

            console.log("🔍 [useSafeMutation] actuallyOnline:", actuallyOnline);

            if (!actuallyOnline) {
                console.log("📡 [useSafeMutation] Mode OFFLINE confirmé - Ajout à la queue");

                // Ajout à la queue
                addToQueue(syncType, variables);

                console.log("✅ [useSafeMutation] Ajouté à la queue, retour immédiat");

                // Retour immédiat avec un objet qui indique le mode offline
                return {
                    ...variables,
                    id: `temp-${Date.now()}`,
                    isOffline: true,
                    _immediate: true
                };
            }

            console.log("🌐 [useSafeMutation] Mode ONLINE - Tentative d'appel API");

            // Tentative d'appel API
            try {
                const result = await mutationFn(variables);
                console.log("✅ [useSafeMutation] API call SUCCESS:", result);
                return result;
            } catch (error: any) {
                console.error("❌ [useSafeMutation] API call FAILED:", error);

                // Vérifier si c'est une erreur réseau
                const isNetworkError = !error.response ||
                    error.code === 'ECONNABORTED' ||
                    error.message === 'Network Error';

                console.log("🔍 [useSafeMutation] isNetworkError:", isNetworkError);

                if (isNetworkError) {
                    console.log("📡 [useSafeMutation] Erreur réseau - Fallback vers queue");

                    addToQueue(syncType, variables);

                    return {
                        ...variables,
                        id: `temp-${Date.now()}`,
                        isOffline: true,
                        _immediate: true
                    };
                }

                // Erreur métier - on laisse remonter
                console.log("🚫 [useSafeMutation] Erreur métier - throw");
                throw error;
            }
        },
        retry: false, // IMPORTANT: Pas de retry
        onSuccess: (data, variables, context) => {
            console.log("🎉 [useSafeMutation] onSuccess appelé");
            console.log("🎉 [useSafeMutation] data:", data);

            // Si mode offline (détecté par le flag)
            if (data?.isOffline || data?._immediate) {
                console.log("💾 [useSafeMutation] Mise à jour optimiste du cache");

                // Mise à jour optimiste du cache
                queryClient.setQueryData(queryKey, (oldData: any) => {
                    if (Array.isArray(oldData)) {
                        return [data, ...oldData];
                    }
                    return oldData;
                });
            } else {
                console.log("🔄 [useSafeMutation] Invalidation du cache");
                // Invalidation normale
                queryClient.invalidateQueries({ queryKey });
            }

            // Appel du callback
            if (onSuccess) {
                console.log("📞 [useSafeMutation] Appel du callback onSuccess");
                onSuccess();
            }

            console.log("✅ [useSafeMutation] onSuccess terminé");
        },
        onError: (error) => {
            console.error("💥 [useSafeMutation] onError:", error);
        },
        onSettled: (data, error) => {
            console.log("🏁 [useSafeMutation] onSettled - Mutation terminée");
            console.log("🏁 [useSafeMutation] data:", data);
            console.log("🏁 [useSafeMutation] error:", error);
        }
    });
}