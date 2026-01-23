import axios from 'axios';
import type { InternalAxiosRequestConfig } from 'axios';

// URL sans le /api comme demandé
const API_URL = 'http://192.168.1.96:3000';

const api = axios.create({
    baseURL: API_URL,
    headers: {
        'Content-Type': 'application/json',
    },
    timeout: 10000, // Timeout pour basculer rapidement sur le cache
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
        // --- CAS 1 : MODE HORS-LIGNE (Erreur réseau) ---
        // Si error.response n'existe pas, c'est que le serveur n'a pas répondu (ou timeout).
        // On ne déconnecte PAS. On rejette l'erreur pour que l'UI puisse gérer (ex: afficher des données en cache).
        if (!error.response) {
            console.warn("Mode Hors-Ligne détecté 📡 - Connexion impossible.");
            return Promise.reject(error);
        }

        // --- CAS 2 : SESSION EXPIRÉE (Le serveur répond explicitement 401) ---
        if (error.response.status === 401) {
            console.warn("Session expirée, déconnexion forcée.");
            localStorage.removeItem('token');
            localStorage.removeItem('user'); // Nettoyage des données utilisateur

            if (window.location.pathname !== '/login') {
                window.location.href = '/login';
            }
        }

        return Promise.reject(error);
    }
);

export default api;