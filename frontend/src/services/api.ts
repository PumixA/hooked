import axios from 'axios';
import type { InternalAxiosRequestConfig } from 'axios';

const API_URL = import.meta.env.VITE_API_URL || '/api';

const api = axios.create({
    baseURL: API_URL,
    headers: {
        'Content-Type': 'application/json',
    },
    // Timeout légèrement supérieur à celui du Service Worker (3s) pour éviter les race conditions
    timeout: 5000,
});

// État global de connexion (synchronisé avec SyncContext)
let isOfflineMode = !navigator.onLine;

// Listener pour mettre à jour l'état
window.addEventListener('online', () => {
    console.log('🌐 [API] Connexion rétablie');
    isOfflineMode = false;
});
window.addEventListener('offline', () => {
    console.log('📡 [API] Connexion perdue');
    isOfflineMode = true;
});

/**
 * Permet de forcer le mode offline depuis l'extérieur (SyncContext)
 */
export function setOfflineMode(offline: boolean) {
    isOfflineMode = offline;
}

/**
 * Retourne l'état actuel du mode offline
 */
export function getOfflineMode(): boolean {
    return isOfflineMode;
}

// 1. Intercepteur de REQUÊTE
api.interceptors.request.use(
    (config: InternalAxiosRequestConfig) => {
        const token = localStorage.getItem('token');
        if (token) {
            config.headers.set('Authorization', `Bearer ${token}`);
        }

        // 🔥 OFFLINE-FIRST: Bloquer les requêtes GET en mode hors ligne
        // Les mutations (POST, PATCH, DELETE) sont gérées par useSafeMutation
        if (isOfflineMode && config.method?.toLowerCase() === 'get') {
            console.log(`🚫 [API] Requête GET bloquée (offline): ${config.url}`);
            // On rejette avec une erreur spéciale que React Query peut gérer
            return Promise.reject({
                code: 'OFFLINE_MODE',
                message: 'Application en mode hors ligne - utilisation du cache',
                config
            });
        }

        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// 2. Intercepteur de RÉPONSE
api.interceptors.response.use(
    (response) => {
        return response;
    },
    (error) => {
        // --- CAS 1 : MODE HORS-LIGNE (Erreur réseau, Timeout ou échec SW) ---
        // Si error.code === 'ECONNABORTED' (Timeout Axios)
        // Si error.message === 'Network Error' (Coupure nette ou SW qui rejette)
        // Si !error.response (Pas de réponse HTTP du tout)
        if (!error.response || error.code === 'ECONNABORTED' || error.message === 'Network Error') {
            console.warn("Mode Hors-Ligne détecté (Timeout ou Réseau) 📡");
            // On propage l'erreur pour que React Query puisse la gérer (ex: afficher les données en cache)
            return Promise.reject(error);
        }

        // --- CAS 2 : SESSION EXPIRÉE (Le serveur répond explicitement 401) ---
        if (error.response.status === 401) {
            console.warn("Session expirée, déconnexion forcée.");
            localStorage.removeItem('token');
            localStorage.removeItem('user');

            if (window.location.pathname !== '/login') {
                window.location.href = '/login';
            }
        }

        return Promise.reject(error);
    }
);

export default api;