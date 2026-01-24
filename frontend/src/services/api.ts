import axios from 'axios';
import type { InternalAxiosRequestConfig } from 'axios';

// URL sans le /api comme demandé
const API_URL = 'http://192.168.1.96:3000';

const api = axios.create({
    baseURL: API_URL,
    headers: {
        'Content-Type': 'application/json',
    },
    // MODIFICATION : Timeout réduit à 3s pour le "Fail-Fast".
    // Si le serveur ne répond pas en 3s, on considère qu'on est offline.
    timeout: 3000,
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
        // --- CAS 1 : MODE HORS-LIGNE (Erreur réseau ou Timeout) ---
        // Si error.code === 'ECONNABORTED', c'est un timeout.
        // Si !error.response, c'est souvent une coupure réseau.
        if (!error.response || error.code === 'ECONNABORTED') {
            console.warn("Mode Hors-Ligne détecté (Timeout ou Réseau) 📡");
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