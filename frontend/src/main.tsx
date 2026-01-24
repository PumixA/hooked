import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient } from '@tanstack/react-query';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { createSyncStoragePersister } from '@tanstack/query-sync-storage-persister';

import App from './App';
import { AuthProvider } from './context/AuthContext';
import { SyncProvider } from './context/SyncContext';
import './index.css';

// 1. Configuration du Client Query
const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            gcTime: 1000 * 60 * 60 * 24 * 7,
            staleTime: Infinity,
            retry: 1,
            refetchOnWindowFocus: false,
            refetchOnReconnect: true,
        },
        mutations: {
            // 🔥 IMPORTANT : Désactiver le retry pour les mutations
            retry: false,
            // 🔥 IMPORTANT : Ne pas persister les mutations
            gcTime: 0,
        },
    },
});

// 2. Persistance
const persister = createSyncStoragePersister({
    storage: window.localStorage,
});

ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
        <PersistQueryClientProvider
            client={queryClient}
            persistOptions={{
                persister,
                maxAge: 1000 * 60 * 60 * 24 * 7,
                // 🔥 IMPORTANT : Ne pas persister les mutations en cours
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