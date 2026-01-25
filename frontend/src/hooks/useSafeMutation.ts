import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useSync, type SyncActionType } from '../context/SyncContext';

interface SafeMutationOptions<TData, TVariables> {
    mutationFn: (variables: TVariables) => Promise<TData>;
    syncType: SyncActionType; // Typage strict ici
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

                // 4. Si c'est une erreur métier, on throw pour que l'UI gère l'erreur
                console.log(`🚫 [useSafeMutation] Erreur métier - throw`);
                throw error;
            }
        },
        onSuccess: (data, variables, context) => {
            // Si c'était une action offline
            if (data && (data as any).offline) {
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
            // Logs de debug optionnels
            // console.log(`🏁 [useSafeMutation] onSettled`);
        }
    });
}