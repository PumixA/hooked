/**
 * AuthContext - Gestion de l'authentification OPTIONNELLE
 *
 * L'authentification sert uniquement à:
 * - Connecter un compte pour activer la synchronisation cloud
 * - Sauvegarder les données sur le serveur
 *
 * L'application fonctionne parfaitement sans authentification!
 */

import { createContext, useState, useContext, type ReactNode } from 'react';
import api from '../services/api';
import { useApp, type ConnectedAccount } from './AppContext';

interface AuthContextType {
    // Actions d'authentification
    login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
    register: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
    logout: () => void;

    // État
    isAuthenticating: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
    const { setAccount, updateSettings } = useApp();
    const [isAuthenticating, setIsAuthenticating] = useState(false);

    const login = async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
        setIsAuthenticating(true);

        try {
            const { data } = await api.post('/auth/login', { email, password });

            // Stocker le token pour les futures requêtes API
            localStorage.setItem('token', data.token);

            // Mettre à jour le compte connecté dans AppContext
            const account: ConnectedAccount = {
                id: data.user.id,
                email: data.user.email,
            };
            setAccount(account);

            // Activer automatiquement la sync après connexion
            updateSettings({ syncEnabled: true });

            console.log('✅ [Auth] Connexion réussie:', email);
            return { success: true };
        } catch (error: any) {
            console.error('❌ [Auth] Erreur de connexion:', error);

            let errorMessage = 'Erreur de connexion';
            if (error.response?.status === 401) {
                errorMessage = 'Email ou mot de passe incorrect';
            } else if (!error.response) {
                errorMessage = 'Impossible de joindre le serveur. Vérifiez votre connexion.';
            }

            return { success: false, error: errorMessage };
        } finally {
            setIsAuthenticating(false);
        }
    };

    const register = async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
        setIsAuthenticating(true);

        try {
            const { data } = await api.post('/auth/register', { email, password });

            // Connecter automatiquement après inscription
            localStorage.setItem('token', data.token);

            const account: ConnectedAccount = {
                id: data.user.id,
                email: data.user.email,
            };
            setAccount(account);
            updateSettings({ syncEnabled: true });

            console.log('✅ [Auth] Inscription réussie:', email);
            return { success: true };
        } catch (error: any) {
            console.error('❌ [Auth] Erreur d\'inscription:', error);

            let errorMessage = 'Erreur d\'inscription';
            if (error.response?.status === 409) {
                errorMessage = 'Cet email est déjà utilisé';
            } else if (!error.response) {
                errorMessage = 'Impossible de joindre le serveur';
            }

            return { success: false, error: errorMessage };
        } finally {
            setIsAuthenticating(false);
        }
    };

    const logout = () => {
        // Supprimer le token
        localStorage.removeItem('token');

        // Déconnecter le compte (désactive aussi la sync via AppContext)
        setAccount(null);

        console.log('👋 [Auth] Déconnexion');
    };

    return (
        <AuthContext.Provider value={{ login, register, logout, isAuthenticating }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error("useAuth doit être utilisé à l'intérieur d'un AuthProvider");
    }
    return context;
};
