import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useSync } from '../context/SyncContext';
import { AxiosError } from 'axios';

interface SafeMutationOptions<TData, TVariables> {
    mutationFn: (variables: TVariables) => Promise<TData>;
    syncType: string;
    queryKey?: string[];
    onSuccess?: (data: TData, variables: TVariables) => void;
    onError?: (error: any) => void;
}

export function useSafeMutation<TData = any, TVariables = any>({
    mutationFn,
    syncType,
    queryKey,
    onSuccess,
    onError
}: SafeMutationOptions<TData, TVariables>) {
    const { isOnline, addToQueue } = useSync();
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (variables: TVariables) => {
            // 1. Si on est hors ligne, on ajoute directement à la file d'attente
            if (!isOnline) {
                console.log(`📡 [useSafeMutation] Hors-ligne détecté. Ajout à la queue : ${syncType}`);
                addToQueue(syncType, variables);
                // On retourne une fausse promesse résolue pour ne pas déclencher onError
                return Promise.resolve({ offline: true } as any);
            }

            // 2. Si on est en ligne, on tente la requête
            try {
                const result = await mutationFn(variables);
                return result;
            } catch (error: any) {
                console.error(`❌ [useSafeMutation] API call FAILED:`, error);

                // 3. Détection fine de l'erreur réseau
                // AxiosError.code === 'ERR_NETWORK' (Chrome/Firefox offline)
                // AxiosError.code === 'ECONNABORTED' (Timeout)
                // !error.response (Pas de réponse du serveur)
                const isNetworkError =
                    !error.response ||
                    error.code === 'ERR_NETWORK' ||
                    error.code === 'ECONNABORTED' ||
                    error.message === 'Network Error';

                console.log(`🔍 [useSafeMutation] isNetworkError: ${isNetworkError}`);

                if (isNetworkError) {
                    console.warn(`📡 [useSafeMutation] Erreur réseau détectée. Fallback vers Queue.`);
                    addToQueue(syncType, variables);
                    return Promise.resolve({ offline: true } as any);
                }

                // 4. Si c'est une erreur métier (400, 401, 403, 404, 500...), on la laisse passer
                // C'est ici que le 404 était bloqué avant, mais maintenant il sera throw
                console.log(`🚫 [useSafeMutation] Erreur métier - throw`);
                throw error;
            }
        },
        onSuccess: (data, variables, context) => {
            // Si c'était une action offline, on ne fait rien de spécial (le contexte Sync gère la suite)
            if (data && data.offline) {
                // On peut éventuellement invalider les queries pour forcer une mise à jour optimiste si besoin
                // Mais généralement on attend que la synchro se fasse.
                // Pour l'instant on considère que c'est un succès "différé".
                if (onSuccess) onSuccess(data, variables);
                return;
            }

            // Succès réel
            if (queryKey) {
                queryClient.invalidateQueries({ queryKey });
            }
            if (onSuccess) onSuccess(data, variables);
        },
        onError: (error, variables, context) => {
            console.error(`💥 [useSafeMutation] onError:`, error);
            if (onError) onError(error);
        },
        onSettled: (data, error) => {
            console.log(`🏁 [useSafeMutation] onSettled - Mutation terminée`);
            console.log(`🏁 [useSafeMutation] data:`, data);
            console.log(`🏁 [useSafeMutation] error:`, error);
        }
    });
}