/**
 * AppContext - Gestion des paramètres locaux de l'application
 *
 * Architecture Offline-First:
 * - L'application fonctionne 100% en local par défaut
 * - La synchronisation cloud est OPTIONNELLE
 * - L'utilisateur peut connecter un compte pour activer la sync
 */

import { createContext, useState, useEffect, useContext, useCallback, type ReactNode } from 'react';
import api from '../services/api';

// Types
export interface AppSettings {
    theme: 'dark' | 'light' | 'warm';
    syncEnabled: boolean;
    hasCompletedOnboarding: boolean;
}

export interface ConnectedAccount {
    id: string;
    email: string;
    role?: string; // Ajout du rôle
}

interface AppContextType {
    // Paramètres de l'app
    settings: AppSettings;
    updateSettings: (updates: Partial<AppSettings>) => void;

    // Compte connecté (optionnel)
    account: ConnectedAccount | null;
    setAccount: (account: ConnectedAccount | null) => void;

    // Helpers
    isSyncActive: boolean; // true si compte connecté ET sync activée
    isLoading: boolean;
}

const defaultSettings: AppSettings = {
    theme: 'dark',
    syncEnabled: false,
    hasCompletedOnboarding: false,
};

const STORAGE_KEY = 'hooked_app_settings';
const ACCOUNT_KEY = 'hooked_connected_account';
const SETTINGS_UPDATED_KEY = 'hooked_settings_updated_at';

const AppContext = createContext<AppContextType | null>(null);

export const AppProvider = ({ children }: { children: ReactNode }) => {
    const [settings, setSettings] = useState<AppSettings>(() => {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
            try {
                const parsed = { ...defaultSettings, ...JSON.parse(stored) };
                // S'assurer qu'un timestamp existe pour éviter l'écrasement par le serveur
                if (!localStorage.getItem(SETTINGS_UPDATED_KEY)) {
                    localStorage.setItem(SETTINGS_UPDATED_KEY, Date.now().toString());
                }
                return parsed;
            } catch {
                return defaultSettings;
            }
        }
        return defaultSettings;
    });

    const [account, setAccountState] = useState<ConnectedAccount | null>(() => {
        const stored = localStorage.getItem(ACCOUNT_KEY);
        if (stored) {
            try {
                return JSON.parse(stored);
            } catch {
                return null;
            }
        }
        return null;
    });

    const [isLoading] = useState(false);

    // Persister les settings dans localStorage
    useEffect(() => {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    }, [settings]);

    // Appliquer le thème au DOM à chaque changement
    useEffect(() => {
        document.documentElement.setAttribute('data-theme', settings.theme);
    }, [settings.theme]);

    // Persister le compte dans localStorage
    useEffect(() => {
        if (account) {
            localStorage.setItem(ACCOUNT_KEY, JSON.stringify(account));
        } else {
            localStorage.removeItem(ACCOUNT_KEY);
        }
    }, [account]);

    const updateSettings = useCallback((updates: Partial<AppSettings>) => {
        setSettings(prev => ({ ...prev, ...updates }));
        // Sauvegarder le timestamp de mise à jour
        localStorage.setItem(SETTINGS_UPDATED_KEY, Date.now().toString());

        // Sync le thème vers le serveur si connecté et sync activée
        const token = localStorage.getItem('token');
        if (token && updates.theme) {
            api.patch('/users/me', { theme_pref: updates.theme }).catch(err => {
                console.warn('[AppContext] Failed to sync theme:', err);
            });
        }
    }, []);

    const setAccount = (newAccount: ConnectedAccount | null) => {
        setAccountState(newAccount);
        // Si on déconnecte le compte, désactiver la sync
        if (!newAccount) {
            updateSettings({ syncEnabled: false });
        }
    };

    // Synchroniser le thème avec le serveur lors de la connexion
    useEffect(() => {
        const syncThemeWithServer = async () => {
            const token = localStorage.getItem('token');
            if (!token || !account) return;

            try {
                const response = await api.get('/users/me');
                const serverTheme = response.data.theme_pref as AppSettings['theme'] | null;
                const serverUpdatedAt = new Date(response.data.updated_at).getTime();
                const localUpdatedAt = parseInt(localStorage.getItem(SETTINGS_UPDATED_KEY) || '0');

                if (serverTheme) {
                    // Si le serveur a un thème et qu'il est plus récent, l'utiliser
                    if (serverUpdatedAt > localUpdatedAt) {
                        console.log(`[AppContext] Using server theme: ${serverTheme}`);
                        setSettings(prev => ({ ...prev, theme: serverTheme }));
                    } else if (settings.theme !== serverTheme) {
                        // Si le local est plus récent, envoyer au serveur
                        console.log(`[AppContext] Pushing local theme to server: ${settings.theme}`);
                        api.patch('/users/me', { theme_pref: settings.theme }).catch(console.warn);
                    }
                } else if (settings.theme !== 'dark') {
                    // Pas de thème serveur, envoyer le local
                    console.log(`[AppContext] No server theme, pushing local: ${settings.theme}`);
                    api.patch('/users/me', { theme_pref: settings.theme }).catch(console.warn);
                }
            } catch (err) {
                console.warn('[AppContext] Failed to sync theme with server:', err);
            }
        };

        syncThemeWithServer();
    }, [account]);

    // La sync est active seulement si un compte est connecté ET la sync est activée
    const isSyncActive = !!(account && settings.syncEnabled);

    return (
        <AppContext.Provider
            value={{
                settings,
                updateSettings,
                account,
                setAccount,
                isSyncActive,
                isLoading,
            }}
        >
            {children}
        </AppContext.Provider>
    );
};

export const useApp = () => {
    const context = useContext(AppContext);
    if (!context) {
        throw new Error("useApp doit être utilisé à l'intérieur d'un AppProvider");
    }
    return context;
};

// Hook utilitaire pour vérifier si la sync cloud est disponible
export const useSyncStatus = () => {
    const { account, settings, isSyncActive } = useApp();

    return {
        hasAccount: !!account,
        syncEnabled: settings.syncEnabled,
        isSyncActive,
        accountEmail: account?.email || null,
        accountRole: account?.role || null, // Ajout de l'exposition du rôle
    };
};
