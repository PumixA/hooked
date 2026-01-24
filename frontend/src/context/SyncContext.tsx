import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import api from '../services/api';

// --- TYPES ---
export type SyncActionType =
    | 'CREATE_PROJECT'
    | 'UPDATE_PROJECT'
    | 'DELETE_PROJECT' // <--- AJOUT
    | 'CREATE_MATERIAL'
    | 'DELETE_MATERIAL'
    | 'SAVE_SESSION'
    | 'ADD_NOTE';

export interface SyncItem {
    id: string;
    type: SyncActionType;
    payload: any;
    timestamp: number;
}

interface SyncContextType {
    isOnline: boolean;
    queue: SyncItem[];
    addToQueue: (type: SyncActionType, payload: any) => void;
    syncNow: () => Promise<void>;
}

// --- CONTEXTE ---
const SyncContext = createContext<SyncContextType | null>(null);

// Générateur d'ID compatible mobile
const generateId = () => Date.now().toString(36) + Math.random().toString(36).substr(2);

// --- PROVIDER ---
export const SyncProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const queryClient = useQueryClient();

    // 🔥 CORRECTION : On synchronise toujours avec navigator.onLine
    const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);

    // 1. Chargement initial sécurisé
    const [queue, setQueue] = useState<SyncItem[]>(() => {
        try {
            const saved = localStorage.getItem('sync_queue');
            return saved ? JSON.parse(saved) : [];
        } catch (e) {
            return [];
        }
    });

    // 2. Sauvegarde auto
    useEffect(() => {
        localStorage.setItem('sync_queue', JSON.stringify(queue));
    }, [queue]);

    // 3. Écouteurs Réseau
    useEffect(() => {
        const handleOnline = () => {
            console.log("🟢 Événement : Connexion rétablie !");
            setIsOnline(true);
        };
        const handleOffline = () => {
            console.log("🔴 Événement : Connexion perdue.");
            setIsOnline(false);
        };

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);

    // 4. Déclencheur changement d'état (Retour Online)
    useEffect(() => {
        if (isOnline && queue.length > 0) {
            console.log("🔄 Connexion rétablie, lancement de la sync...");
            processQueue();
        }
    }, [isOnline]);

    // 5. HEARTBEAT (Le Check Régulier)
    useEffect(() => {
        const heartbeat = setInterval(() => {
            // 🔥 CORRECTION : On resynchronise l'état avec navigator.onLine
            const navigatorOnline = navigator.onLine;

            if (navigatorOnline !== isOnline) {
                console.log(`💓 Heartbeat : Correction de l'état (${isOnline} -> ${navigatorOnline})`);
                setIsOnline(navigatorOnline);
            }

            if (queue.length > 0 && navigatorOnline) {
                console.log("💓 Heartbeat : Relance file d'attente...");
                processQueue();
            }
        }, 10000); // Toutes les 10 secondes

        return () => clearInterval(heartbeat);
    }, [queue, isOnline]);

    const addToQueue = useCallback((type: SyncActionType, payload: any) => {
        const newItem: SyncItem = {
            id: generateId(),
            type,
            payload,
            timestamp: Date.now()
        };
        console.log(`📥 Ajout à la queue : ${type}`, payload);
        setQueue(prev => [...prev, newItem]);
    }, []);

    const processQueue = useCallback(async () => {
        if (queue.length === 0) return;

        // 🔥 CORRECTION : On vérifie que navigator.onLine est vraiment true
        if (!navigator.onLine) {
            console.log("⚠️ Abandon de la sync : pas de connexion réseau");
            return;
        }

        console.log(`🔄 Sync : Traitement de ${queue.length} actions...`);
        const currentQueue = [...queue];
        const failedItems: SyncItem[] = [];
        let successCount = 0;

        for (const item of currentQueue) {
            try {
                switch (item.type) {
                    case 'CREATE_PROJECT':
                        await api.post('/projects', item.payload);
                        break;
                    case 'UPDATE_PROJECT':
                        const { id, ...data } = item.payload;
                        // On évite d'envoyer des updates sur des IDs temporaires qui n'existent pas au back
                        if (!String(id).startsWith('temp-')) {
                            await api.patch(`/projects/${id}`, data);
                        }
                        break;
                    case 'DELETE_PROJECT': // <--- GESTION DE LA SUPPRESSION
                        if (!String(item.payload.id).startsWith('temp-')) {
                            await api.delete(`/projects/${item.payload.id}`);
                        }
                        break;
                    case 'CREATE_MATERIAL':
                        await api.post('/materials', item.payload);
                        break;
                    case 'DELETE_MATERIAL':
                        await api.delete(`/materials/${item.payload.id}`);
                        break;
                    case 'SAVE_SESSION':
                        await api.post('/sessions', item.payload);
                        break;
                    case 'ADD_NOTE':
                        await api.post('/notes', item.payload);
                        break;
                }
                console.log(`✅ ${item.type} OK`);
                successCount++;
            } catch (error: any) {
                console.warn(`⏳ ${item.type} reporté`, error);
                // 🔥 CORRECTION : On ne marque comme échec que si c'est une erreur réseau
                if (!error.response || error.code === 'ECONNABORTED' || error.message === 'Network Error') {
                    failedItems.push(item);
                } else {
                    // Si c'est une erreur métier (400, 404, etc.), on ne retente pas
                    console.error(`❌ ${item.type} : erreur métier, abandon`, error);
                }
            }
        }

        setQueue(failedItems);

        if (successCount > 0) {
            console.log("✨ Synchro réussie !");
            await queryClient.invalidateQueries();
        }

        // 🔥 CORRECTION IMPORTANTE : On ne passe plus en offline ici
        // On laisse navigator.onLine être la source de vérité
    }, [queue, queryClient]);

    return (
        <SyncContext.Provider value={{ isOnline, queue, addToQueue, syncNow: processQueue }}>
            {children}
        </SyncContext.Provider>
    );
};

// --- HOOK (DOIT ÊTRE EN DEHORS DU PROVIDER) ---
export const useSync = () => {
    const context = useContext(SyncContext);
    if (!context) throw new Error("useSync doit être utilisé dans un SyncProvider");
    return context;
};