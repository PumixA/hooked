import axios from 'axios';
import type { InternalAxiosRequestConfig } from 'axios';

const API_URL = 'http://192.168.1.96:3000';

const api = axios.create({
    baseURL: API_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

// 1. Intercepteur de REQUÊTE (On attache le token sortant)
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

// 2. Intercepteur de RÉPONSE (NOUVEAU : On gère les erreurs entrantes)
api.interceptors.response.use(
    (response) => {
        // Si la réponse est bonne (200, 201...), on la laisse passer
        return response;
    },
    (error) => {
        // Si le serveur répond "401 Unauthorized" (Token périmé ou faux)
        if (error.response && error.response.status === 401) {
            console.warn("Session expirée, déconnexion forcée.");

            // On nettoie le token pourri
            localStorage.removeItem('token');

            // On redirige vers le login (sauf si on y est déjà)
            if (window.location.pathname !== '/login') {
                window.location.href = '/login';
            }
        }
        return Promise.reject(error);
    }
);

export default api;