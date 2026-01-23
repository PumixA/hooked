import { createContext, useState, useEffect, useContext, type ReactNode } from 'react';
// CORRECTION : On retire le ".ts" à la fin
import api from '../services/api';

// 1. Définition des types
interface User {
    id: string;
    email: string;
    theme_pref?: string;
    role?: string;
}

interface AuthContextType {
    user: User | null;
    login: (email: string, password: string) => Promise<any>;
    register: (email: string, password: string) => Promise<any>;
    logout: () => void;
    loading: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

// 2. Le Provider
export const AuthProvider = ({ children }: { children: ReactNode }) => {
    const [user, setUser] = useState<User | null>(() => {
        // Initialisation optimiste : on regarde d'abord dans le localStorage
        const storedUser = localStorage.getItem('user');
        return storedUser ? JSON.parse(storedUser) : null;
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const checkUserLoggedIn = async () => {
            const token = localStorage.getItem('token');

            if (token) {
                try {
                    const { data } = await api.get('/users/me');
                    setUser(data);
                    // Mise à jour du cache utilisateur local
                    localStorage.setItem('user', JSON.stringify(data));
                } catch (error: any) {
                    // Si c'est une erreur réseau (pas de réponse), on garde l'utilisateur connecté (optimiste)
                    if (!error.response) {
                        console.warn("Impossible de vérifier la session (Hors-ligne). On garde la session locale.");
                        // On ne fait rien, user est déjà initialisé via le useState
                    } else if (error.response?.status === 401) {
                        // Vraie erreur d'auth -> on déconnecte
                        console.error("Session invalide", error);
                        localStorage.removeItem('token');
                        localStorage.removeItem('user');
                        setUser(null);
                    }
                }
            } else {
                // Pas de token, on nettoie tout
                localStorage.removeItem('user');
                setUser(null);
            }
            setLoading(false);
        };

        checkUserLoggedIn();
    }, []);

    const login = async (email: string, password: string) => {
        const { data } = await api.post('/auth/login', { email, password });
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user)); // Sauvegarde pour le mode hors-ligne
        setUser(data.user);
        return data;
    };

    const register = async (email: string, password: string) => {
        const { data } = await api.post('/auth/register', { email, password });
        // Optionnel : connecter automatiquement après inscription
        return data;
    };

    const logout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        setUser(null);
    };

    return (
        <AuthContext.Provider value={{ user, login, register, logout, loading }}>
            {children}
        </AuthContext.Provider>
    );
};

// 3. Le Hook personnalisé
export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error("useAuth doit être utilisé à l'intérieur d'un AuthProvider");
    }
    return context;
};