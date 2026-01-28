import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient } from '@tanstack/react-query';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { createSyncStoragePersister } from '@tanstack/query-sync-storage-persister';

import App from './App';
import { AppProvider } from './context/AppContext';
import { AuthProvider } from './context/AuthContext';
import { SyncProvider } from './context/SyncContext';
import { db } from './services/db';
import { localDb } from './services/localDb';
import { initializeDefaultData } from './services/defaultData';
import './index.css';

// Configuration du Client Query - Offline First
const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            networkMode: 'offlineFirst',
            gcTime: 1000 * 60 * 60 * 24 * 7, // 7 jours
            staleTime: 1000 * 60 * 5, // 5 minutes
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

// Persistance dans localStorage
const persister = createSyncStoragePersister({
    storage: window.localStorage,
});

// Initialiser les donnees par defaut au demarrage
initializeDefaultData().catch(console.error);

// --- OUTILS DE DEBUG ---
(window as any).debugStorage = async () => {
    console.group('DEBUG STORAGE');

    console.group('LocalStorage');
    console.log('App Settings:', localStorage.getItem('hooked_app_settings'));
    console.log('Connected Account:', localStorage.getItem('hooked_connected_account'));
    console.log('Token:', localStorage.getItem('token') ? 'Present' : 'Absent');
    console.groupEnd();

    console.group('Sync Queue (legacy)');
    const queue = localStorage.getItem('sync_queue');
    if (queue) {
        console.table(JSON.parse(queue));
    } else {
        console.log('Queue vide.');
    }
    console.groupEnd();

    console.group('IndexedDB (Offline Photos)');
    try {
        const photos = await db.getAllOfflinePhotos();
        if (photos.length > 0) {
            console.table(photos.map(p => ({ id: p.id, projectId: p.projectId, fileName: (p.file as File).name || 'blob', size: p.file.size })));
        } else {
            console.log('Aucune photo en attente.');
        }
    } catch (e) {
        console.error('Erreur lecture IndexedDB', e);
    }
    console.groupEnd();

    console.group('IndexedDB (LocalDB)');
    await localDb.debugDump();
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
                {/* AppProvider doit wrapper AuthProvider car AuthProvider utilise useApp() */}
                <AppProvider>
                    <AuthProvider>
                        <SyncProvider>
                            <App />
                        </SyncProvider>
                    </AuthProvider>
                </AppProvider>
            </BrowserRouter>
        </PersistQueryClientProvider>
    </React.StrictMode>,
);
