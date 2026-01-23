import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'; // <--- IMPORT
import App from './App';
import { AuthProvider } from './context/AuthContext';
import './index.css';

// Création du client React Query
const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            retry: 1, // Réessaie 1 fois en cas d'erreur réseau
            staleTime: 1000 * 60 * 5, // Les données restent "fraîches" 5 minutes sans rechargement
        },
    },
});

ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
        {/* On englobe l'app avec le Provider */}
        <QueryClientProvider client={queryClient}>
            <BrowserRouter>
                <AuthProvider>
                    <App />
                </AuthProvider>
            </BrowserRouter>
        </QueryClientProvider>
    </React.StrictMode>,
);