import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient } from '@tanstack/react-query';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { createSyncStoragePersister } from '@tanstack/query-sync-storage-persister';

import App from './App';
import { AuthProvider } from './context/AuthContext';
import { SyncProvider } from './context/SyncContext';
import { db } from './services/db'; // Import de la DB pour le debug
import './index.css';

// 1. Configuration du Client Query
const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            // 🔥 OFFLINE-FIRST : Si on a des données en cache, on les affiche même si elles sont "stale"
            // tant que le réseau n'a pas répondu.
            networkMode: 'offlineFirst', 
            gcTime: 1000 * 60 * 60 * 24 * 7, // Garde le cache 7 jours
            staleTime: 1000 * 60 * 5, // Données considérées fraîches pendant 5 min
            retry: 1,
            refetchOnWindowFocus: false,
            refetchOnReconnect: true,
        },
        mutations: {
            networkMode: 'offlineFirst',
            retry: false,
            gcTime: 0,
        },
    },
});

// 2. Persistance
const persister = createSyncStoragePersister({
    storage: window.localStorage,
});

// --- OUTIL DE DEBUG ---
// Accessible via la console du navigateur : window.debugStorage()
(window as any).debugStorage = async () => {
    console.group('🔍 DEBUG STORAGE');
    
    console.group('📂 LocalStorage (Sync Queue)');
    const queue = localStorage.getItem('sync_queue');
    if (queue) {
        console.table(JSON.parse(queue));
    } else {
        console.log('Queue vide.');
    }
    console.groupEnd();

    console.group('📸 IndexedDB (Offline Photos)');
    try {
        const photos = await db.getAllOfflinePhotos();
        if (photos.length > 0) {
            console.table(photos.map(p => ({ id: p.id, projectId: p.projectId, fileName: p.file.name, size: p.file.size })));
        } else {
            console.log('Aucune photo en attente.');
        }
    } catch (e) {
        console.error('Erreur lecture IndexedDB', e);
    }
    console.groupEnd();

    console.groupEnd();
};

ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
        <PersistQueryClientProvider
            client={queryClient}
            persistOptions={{
                persister,
                maxAge: 1000 * 60 * 60 * 24 * 7,
                dehydrateOptions: {
                    shouldDehydrateMutation: () => false,
                }
            }}
        >
            <BrowserRouter>
                <AuthProvider>
                    <SyncProvider>
                        <App />
                    </SyncProvider>
                </AuthProvider>
            </BrowserRouter>
        </PersistQueryClientProvider>
    </React.StrictMode>,
);