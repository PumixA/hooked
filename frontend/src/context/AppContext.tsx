/**
 * AppContext - Gestion des paramètres locaux de l'application
 *
 * Architecture Offline-First:
 * - L'application fonctionne 100% en local par défaut
 * - La synchronisation cloud est OPTIONNELLE
 * - L'utilisateur peut connecter un compte pour activer la sync
 */

import { createContext, useState, useEffect, useContext, type ReactNode } from 'react';

// Types
export interface AppSettings {
    theme: 'dark' | 'light' | 'warm';
    syncEnabled: boolean;
    hasCompletedOnboarding: boolean;
}

export interface ConnectedAccount {
    id: string;
    email: string;
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

const AppContext = createContext<AppContextType | null>(null);

export const AppProvider = ({ children }: { children: ReactNode }) => {
    const [settings, setSettings] = useState<AppSettings>(() => {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
            try {
                return { ...defaultSettings, ...JSON.parse(stored) };
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

    // Persister le compte dans localStorage
    useEffect(() => {
        if (account) {
            localStorage.setItem(ACCOUNT_KEY, JSON.stringify(account));
        } else {
            localStorage.removeItem(ACCOUNT_KEY);
        }
    }, [account]);

    const updateSettings = (updates: Partial<AppSettings>) => {
        setSettings(prev => ({ ...prev, ...updates }));
    };

    const setAccount = (newAccount: ConnectedAccount | null) => {
        setAccountState(newAccount);
        // Si on déconnecte le compte, désactiver la sync
        if (!newAccount) {
            updateSettings({ syncEnabled: false });
        }
    };

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
    };
};
