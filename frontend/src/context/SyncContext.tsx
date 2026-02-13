import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { setOfflineMode } from '../services/api';
import { syncService } from '../services/syncService';

declare global {
    interface Window {
        __hooked?: {
            logCache: () => void;
            syncNow: () => Promise<void>;
            isOnline: boolean;
            queueLength: number;
        };
    }
}

// --- TYPES ---
export type SyncActionType =
    | 'CREATE_PROJECT'
    | 'UPDATE_PROJECT'
    | 'DELETE_PROJECT'
    | 'CREATE_MATERIAL'
    | 'UPDATE_MATERIAL'
    | 'DELETE_MATERIAL'
    | 'SAVE_SESSION'
    | 'ADD_NOTE'
    | 'DELETE_NOTE'
    | 'UPLOAD_PHOTO'
    | 'DELETE_PHOTO';

export interface SyncItem {
    id: string;
    type: SyncActionType;
    payload: unknown;
    timestamp: number;
}

interface SyncContextType {
    isOnline: boolean;
    queue: SyncItem[];
    addToQueue: (type: SyncActionType, payload: unknown) => void;
    syncNow: () => Promise<void>;
    isSyncing: boolean;
    logCache: () => void;
    updateCacheOptimistically: <T>(queryKey: string[], updater: (old: T) => T) => void;
}

// --- CONTEXTE ---
const SyncContext = createContext<SyncContextType | null>(null);

// Générateur d'ID
const generateId = () => Date.now().toString(36) + Math.random().toString(36).substr(2);

// --- PROVIDER ---
export const SyncProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const queryClient = useQueryClient();

    // État de connexion
    const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);
    const [isSyncing, setIsSyncing] = useState(false);

    // Queue legacy (pour compatibilité)
    const [queue, setQueue] = useState<SyncItem[]>(() => {
        try {
            const saved = localStorage.getItem('sync_queue');
            return saved ? JSON.parse(saved) : [];
        } catch {
            return [];
        }
    });

    // Sauvegarde auto de la queue
    useEffect(() => {
        localStorage.setItem('sync_queue', JSON.stringify(queue));
    }, [queue]);

    // Écouteurs Réseau (Online/Offline)
    useEffect(() => {
        const handleOnline = () => {
            console.log("🟢 Connexion rétablie");
            setIsOnline(true);
            setOfflineMode(false);
            // Sync automatique au retour online
            syncService.syncAll().then(() => {
                queryClient.invalidateQueries();
            });
        };

        const handleOffline = () => {
            console.log("🔴 Connexion perdue");
            setIsOnline(false);
            setOfflineMode(true);
        };

        // Synchroniser l'état initial
        setOfflineMode(!navigator.onLine);

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, [queryClient]);

    // Sync initiale au démarrage
    useEffect(() => {
        if (navigator.onLine) {
            syncService.syncAll().catch(console.error);
        }
    }, []);

    // Legacy: addToQueue (pour composants non migrés)
    const addToQueue = useCallback((type: SyncActionType, payload: unknown) => {
        const newItem: SyncItem = {
            id: generateId(),
            type,
            payload,
            timestamp: Date.now()
        };
        console.log(`📥 [Legacy Queue] ${type}`, payload);
        setQueue(prev => [...prev, newItem]);
    }, []);

    // Fonction pour logger l'état du cache
    const logCache = useCallback(() => {
        console.log('\n🔍 === DEBUG ===');
        console.log('Online:', navigator.onLine);
        console.log('Queue legacy:', queue.length);
        console.log('React Query cache:', queryClient.getQueryCache().getAll().length, 'entries');
        // Utiliser le debug de localDb
        if (window.__localDb) {
            window.__localDb.debugDump();
        }
    }, [queryClient, queue]);

    // Mise à jour optimiste du cache
    const updateCacheOptimistically = useCallback(<T,>(queryKey: string[], updater: (old: T) => T) => {
        const oldData = queryClient.getQueryData<T>(queryKey);
        if (oldData !== undefined) {
            const newData = updater(oldData);
            queryClient.setQueryData(queryKey, newData);
        }
    }, [queryClient]);

    // Sync manuelle
    const syncNow = useCallback(async () => {
        if (isSyncing) return;
        setIsSyncing(true);
        try {
            await syncService.syncAll();
            await queryClient.invalidateQueries();
        } finally {
            setIsSyncing(false);
        }
    }, [isSyncing, queryClient]);

    // Exposer les fonctions de debug
    useEffect(() => {
        window.__hooked = {
            logCache,
            syncNow,
            isOnline,
            queueLength: queue.length
        };
    }, [logCache, syncNow, queue, isOnline]);

    return (
        <SyncContext.Provider value={{
            isOnline,
            queue,
            addToQueue,
            syncNow,
            isSyncing,
            logCache,
            updateCacheOptimistically
        }}>
            {children}
        </SyncContext.Provider>
    );
};

export const useSync = () => {
    const context = useContext(SyncContext);
    if (!context) throw new Error("useSync doit être utilisé dans un SyncProvider");
    return context;
};
