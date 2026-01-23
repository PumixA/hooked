import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient } from '@tanstack/react-query';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import { createSyncStoragePersister } from '@tanstack/query-sync-storage-persister';

import App from './App';
import { AuthProvider } from './context/AuthContext';
import './index.css';

// 1. Configuration du Client Query
const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            // Configuration Offline-First 🛡️
            gcTime: 1000 * 60 * 60 * 24 * 7, // Garde le cache 7 jours
            staleTime: Infinity, // Ne recharge jamais automatiquement
            retry: 1,
            refetchOnWindowFocus: false,
            refetchOnReconnect: true,
        },
    },
});

// 2. Persistance (Sauvegarde dans le téléphone)
const persister = createSyncStoragePersister({
    storage: window.localStorage,
});

ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
        <PersistQueryClientProvider
            client={queryClient}
            persistOptions={{ persister, maxAge: 1000 * 60 * 60 * 24 * 7 }}
        >
            <BrowserRouter>
                <AuthProvider>
                    <App />
                </AuthProvider>
            </BrowserRouter>
        </PersistQueryClientProvider>
    </React.StrictMode>,
);