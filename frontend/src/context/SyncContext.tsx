import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import api from '../services/api';
import { db } from '../services/db';

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
    | 'UPLOAD_PHOTO' // Changed from CREATE_PHOTO to match usage
    | 'DELETE_PHOTO';

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
    isSyncing: boolean;
}

// --- CONTEXTE ---
const SyncContext = createContext<SyncContextType | null>(null);

// Générateur d'ID compatible mobile
const generateId = () => Date.now().toString(36) + Math.random().toString(36).substr(2);

// --- PROVIDER ---
export const SyncProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const queryClient = useQueryClient();

    // État de connexion
    const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);

    // 🔥 Verrou de synchronisation pour éviter les doubles appels
    const [isSyncing, setIsSyncing] = useState(false);

    // 1. Chargement initial sécurisé de la queue
    const [queue, setQueue] = useState<SyncItem[]>(() => {
        try {
            const saved = localStorage.getItem('sync_queue');
            return saved ? JSON.parse(saved) : [];
        } catch (e) {
            return [];
        }
    });

    // 2. Sauvegarde auto de la queue
    useEffect(() => {
        localStorage.setItem('sync_queue', JSON.stringify(queue));
    }, [queue]);

    // 3. Écouteurs Réseau (Online/Offline)
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
        if (isOnline && queue.length > 0 && !isSyncing) {
            console.log("🔄 Connexion rétablie, tentative de sync...");
            processQueue();
        }
    }, [isOnline]);

    // 5. HEARTBEAT (Le Check Régulier)
    useEffect(() => {
        const heartbeat = setInterval(() => {
            const navigatorOnline = navigator.onLine;

            if (navigatorOnline !== isOnline) {
                console.log(`💓 Heartbeat : Correction de l'état (${isOnline} -> ${navigatorOnline})`);
                setIsOnline(navigatorOnline);
            }

            if (queue.length > 0 && navigatorOnline && !isSyncing) {
                console.log("💓 Heartbeat : Relance file d'attente...");
                processQueue();
            }
        }, 10000);

        return () => clearInterval(heartbeat);
    }, [queue, isOnline, isSyncing]);

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
        if (queue.length === 0 || isSyncing) return;
        if (!navigator.onLine) {
            console.log("⚠️ Abandon de la sync : pas de connexion réseau");
            return;
        }

        setIsSyncing(true);

        console.log(`🔄 Sync : Traitement de ${queue.length} actions...`);
        const currentQueue = [...queue];
        const failedItems: SyncItem[] = [];
        let successCount = 0;

        try {
            for (const item of currentQueue) {
                try {
                    switch (item.type) {
                        case 'CREATE_PROJECT':
                            await api.post('/projects', item.payload);
                            break;
                        case 'UPDATE_PROJECT':
                            const { id, ...data } = item.payload;
                            if (!String(id).startsWith('temp-')) {
                                await api.patch(`/projects/${id}`, data);
                            }
                            break;
                        case 'DELETE_PROJECT':
                            if (!String(item.payload.id).startsWith('temp-')) {
                                await api.delete(`/projects/${item.payload.id}`);
                            }
                            break;
                        case 'CREATE_MATERIAL':
                            await api.post('/materials', item.payload);
                            break;
                        case 'UPDATE_MATERIAL':
                            const { id: matId, ...matData } = item.payload;
                            await api.patch(`/materials/${matId}`, matData);
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
                        case 'DELETE_NOTE':
                            if (item.payload.id) {
                                await api.delete(`/notes/${item.payload.id}`);
                            }
                            break;
                        case 'UPLOAD_PHOTO':
                            console.log(`📸 Sync Photo: Récupération depuis IDB (tempId: ${item.payload.tempId})`);
                            const offlinePhoto = await db.getOfflinePhoto(item.payload.tempId);
                            if (offlinePhoto) {
                                console.log(`📸 Sync Photo: Fichier trouvé (${offlinePhoto.file.size} bytes), envoi...`);
                                const formData = new FormData();
                                formData.append('file', offlinePhoto.file);
                                await api.post(`/photos?project_id=${offlinePhoto.projectId}`, formData, {
                                    headers: { 'Content-Type': 'multipart/form-data' }
                                });
                                console.log(`📸 Sync Photo: Succès, suppression de IDB`);
                                await db.deleteOfflinePhoto(item.payload.tempId);
                            } else {
                                console.warn(`⚠️ Sync Photo: Fichier introuvable dans IDB pour tempId ${item.payload.tempId}`);
                            }
                            break;
                        case 'DELETE_PHOTO':
                            await api.delete(`/photos/${item.payload.id}`);
                            break;
                    }
                    console.log(`✅ ${item.type} OK`);
                    successCount++;
                } catch (error: any) {
                    console.warn(`⏳ ${item.type} reporté`, error);
                    if (!error.response || error.code === 'ECONNABORTED' || error.message === 'Network Error') {
                        failedItems.push(item);
                    } else {
                        console.error(`❌ ${item.type} : erreur métier, abandon`, error);
                    }
                }
            }

            setQueue(failedItems);

            if (successCount > 0) {
                console.log("✨ Synchro réussie !");
                await queryClient.invalidateQueries();
            }
        } finally {
            setIsSyncing(false);
        }
    }, [queue, queryClient, isSyncing]);

    return (
        <SyncContext.Provider value={{ isOnline, queue, addToQueue, syncNow: processQueue, isSyncing }}>
            {children}
        </SyncContext.Provider>
    );
};

export const useSync = () => {
    const context = useContext(SyncContext);
    if (!context) throw new Error("useSync doit être utilisé dans un SyncProvider");
    return context;
};