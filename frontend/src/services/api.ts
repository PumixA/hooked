import axios from 'axios';
import type { InternalAxiosRequestConfig } from 'axios';

// URL sans le /api comme demandé
const API_URL = 'http://192.168.1.96:3000';

const api = axios.create({
    baseURL: API_URL,
    headers: {
        'Content-Type': 'application/json',
    },
    // Timeout légèrement supérieur à celui du Service Worker (3s) pour éviter les race conditions
    timeout: 5000,
});

// 1. Intercepteur de REQUÊTE
api.interceptors.request.use(
    (config: InternalAxiosRequestConfig) => {
        const token = localStorage.getItem('token');
        if (token) {
            config.headers.set('Authorization', `Bearer ${token}`);
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