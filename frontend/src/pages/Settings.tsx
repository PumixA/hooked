import { useState, useEffect } from 'react';
import { ArrowLeft, Cloud, CloudOff, User, LogOut, RefreshCw, Smartphone, ChevronRight, Sun, Moon, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useApp, useSyncStatus } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { useSync } from '../hooks/useOfflineData';
import { localDb } from '../services/localDb';
import api from '../services/api';

type ThemeMode = 'dark' | 'light' | 'warm';

export default function Settings() {
    const navigate = useNavigate();
    const { settings, updateSettings } = useApp();
    const { hasAccount, syncEnabled, isSyncActive, accountEmail } = useSyncStatus();
    const { logout } = useAuth();
    const syncMutation = useSync();

    const [showClearConfirm, setShowClearConfirm] = useState(false);
    const [currentTheme, setCurrentTheme] = useState<ThemeMode>((settings?.theme as ThemeMode) || 'dark');

    // Appliquer le thème au document
    useEffect(() => {
        document.documentElement.setAttribute('data-theme', currentTheme);
    }, [currentTheme]);

    const handleThemeChange = async (theme: ThemeMode) => {
        setCurrentTheme(theme);
        updateSettings({ theme });

        // Sauvegarder en BDD si connecté et sync activée
        if (hasAccount && syncEnabled) {
            try {
                await api.patch('/users/me', { theme_pref: theme });
            } catch (e) {
                console.warn('Erreur sauvegarde theme:', e);
            }
        }
    };

    const handleToggleSync = () => {
        if (!hasAccount) {
            // Rediriger vers login si pas de compte
            navigate('/login');
            return;
        }
        updateSettings({ syncEnabled: !syncEnabled });
    };

    const handleLogout = () => {
        logout();
    };

    const handleClearData = async () => {
        await localDb.clearAll();
        localStorage.removeItem('hooked_data_initialized');
        window.location.reload();
    };

    const handleManualSync = () => {
        syncMutation.mutate();
    };

    return (
        <div className="p-4 space-y-6">
            {/* Header */}
            <div className="flex items-center gap-4">
                <button onClick={() => navigate(-1)} className="text-gray-400">
                    <ArrowLeft />
                </button>
                <h1 className="text-xl font-bold text-white">Parametres</h1>
            </div>

            {/* Section: Mode de fonctionnement */}
            <div className="space-y-3">
                <h2 className="text-sm font-medium text-gray-400 uppercase tracking-wider">
                    Mode de fonctionnement
                </h2>

                <div className="bg-zinc-800 rounded-xl border border-zinc-700 overflow-hidden">
                    {/* Indicateur du mode actuel */}
                    <div className="p-4 flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${isSyncActive ? 'bg-green-500/20' : 'bg-violet-500/20'}`}>
                            {isSyncActive ? (
                                <Cloud className="w-5 h-5 text-green-400" />
                            ) : (
                                <Smartphone className="w-5 h-5 text-violet-400" />
                            )}
                        </div>
                        <div className="flex-1">
                            <p className="text-white font-medium">
                                {isSyncActive ? 'Mode Cloud' : 'Mode Local'}
                            </p>
                            <p className="text-gray-400 text-sm">
                                {isSyncActive
                                    ? 'Donnees synchronisees avec le serveur'
                                    : 'Donnees stockees sur cet appareil'}
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Section: Apparence */}
            <div className="space-y-3">
                <h2 className="text-sm font-medium text-gray-400 uppercase tracking-wider">
                    Apparence
                </h2>

                <div className="bg-zinc-800 rounded-xl border border-zinc-700 p-4">
                    <p className="text-white font-medium mb-3">Theme</p>
                    <div className="grid grid-cols-3 gap-2">
                        <button
                            onClick={() => handleThemeChange('dark')}
                            className={`flex flex-col items-center gap-2 p-3 rounded-xl border transition-all ${
                                currentTheme === 'dark'
                                    ? 'bg-violet-500/20 border-violet-500 text-violet-400'
                                    : 'bg-zinc-700/50 border-zinc-600 text-zinc-400 hover:border-zinc-500'
                            }`}
                        >
                            <Moon size={20} />
                            <span className="text-xs font-medium">Sombre</span>
                        </button>
                        <button
                            onClick={() => handleThemeChange('light')}
                            className={`flex flex-col items-center gap-2 p-3 rounded-xl border transition-all ${
                                currentTheme === 'light'
                                    ? 'bg-violet-500/20 border-violet-500 text-violet-400'
                                    : 'bg-zinc-700/50 border-zinc-600 text-zinc-400 hover:border-zinc-500'
                            }`}
                        >
                            <Sun size={20} />
                            <span className="text-xs font-medium">Clair</span>
                        </button>
                        <button
                            onClick={() => handleThemeChange('warm')}
                            className={`flex flex-col items-center gap-2 p-3 rounded-xl border transition-all ${
                                currentTheme === 'warm'
                                    ? 'bg-amber-500/20 border-amber-500 text-amber-400'
                                    : 'bg-zinc-700/50 border-zinc-600 text-zinc-400 hover:border-zinc-500'
                            }`}
                        >
                            <Sparkles size={20} />
                            <span className="text-xs font-medium">Chaud</span>
                        </button>
                    </div>
                </div>
            </div>

            {/* Section: Compte */}
            <div className="space-y-3">
                <h2 className="text-sm font-medium text-gray-400 uppercase tracking-wider">
                    Compte
                </h2>

                <div className="bg-zinc-800 rounded-xl border border-zinc-700 overflow-hidden divide-y divide-zinc-700">
                    {hasAccount ? (
                        <>
                            {/* Compte connecte */}
                            <div className="p-4 flex items-center gap-3">
                                <div className="p-2 rounded-lg bg-violet-500/20">
                                    <User className="w-5 h-5 text-violet-400" />
                                </div>
                                <div className="flex-1">
                                    <p className="text-white font-medium">Connecte</p>
                                    <p className="text-gray-400 text-sm">{accountEmail}</p>
                                </div>
                            </div>

                            {/* Toggle sync */}
                            <button
                                onClick={handleToggleSync}
                                className="w-full p-4 flex items-center gap-3"
                            >
                                <div className={`p-2 rounded-lg ${syncEnabled ? 'bg-green-500/20' : 'bg-zinc-700'}`}>
                                    {syncEnabled ? (
                                        <Cloud className="w-5 h-5 text-green-400" />
                                    ) : (
                                        <CloudOff className="w-5 h-5 text-gray-400" />
                                    )}
                                </div>
                                <div className="flex-1 text-left">
                                    <p className="text-white font-medium">Synchronisation cloud</p>
                                    <p className="text-gray-400 text-sm">
                                        {syncEnabled ? 'Activee' : 'Desactivee'}
                                    </p>
                                </div>
                                <div className={`w-12 h-7 rounded-full transition-colors ${syncEnabled ? 'bg-violet-500' : 'bg-zinc-600'}`}>
                                    <div className={`w-5 h-5 rounded-full bg-white mt-1 transition-transform ${syncEnabled ? 'translate-x-6' : 'translate-x-1'}`} />
                                </div>
                            </button>

                            {/* Sync manuelle */}
                            {syncEnabled && (
                                <button
                                    onClick={handleManualSync}
                                    disabled={syncMutation.isPending}
                                    className="w-full p-4 flex items-center gap-3 disabled:opacity-50"
                                >
                                    <div className="p-2 rounded-lg bg-zinc-700">
                                        <RefreshCw className={`w-5 h-5 text-gray-400 ${syncMutation.isPending ? 'animate-spin' : ''}`} />
                                    </div>
                                    <div className="flex-1 text-left">
                                        <p className="text-white font-medium">Synchroniser maintenant</p>
                                        <p className="text-gray-400 text-sm">
                                            {syncMutation.isPending ? 'Synchronisation...' : 'Forcer une synchronisation'}
                                        </p>
                                    </div>
                                </button>
                            )}

                            {/* Deconnexion */}
                            <button
                                onClick={handleLogout}
                                className="w-full p-4 flex items-center gap-3"
                            >
                                <div className="p-2 rounded-lg bg-red-500/20">
                                    <LogOut className="w-5 h-5 text-red-400" />
                                </div>
                                <div className="flex-1 text-left">
                                    <p className="text-red-400 font-medium">Se deconnecter</p>
                                    <p className="text-gray-400 text-sm">
                                        Les donnees locales seront conservees
                                    </p>
                                </div>
                            </button>
                        </>
                    ) : (
                        /* Pas de compte */
                        <button
                            onClick={() => navigate('/login')}
                            className="w-full p-4 flex items-center gap-3"
                        >
                            <div className="p-2 rounded-lg bg-violet-500/20">
                                <User className="w-5 h-5 text-violet-400" />
                            </div>
                            <div className="flex-1 text-left">
                                <p className="text-white font-medium">Connecter un compte</p>
                                <p className="text-gray-400 text-sm">
                                    Pour synchroniser vos donnees
                                </p>
                            </div>
                            <ChevronRight className="w-5 h-5 text-gray-400" />
                        </button>
                    )}
                </div>
            </div>

            {/* Section: Donnees */}
            <div className="space-y-3">
                <h2 className="text-sm font-medium text-gray-400 uppercase tracking-wider">
                    Donnees
                </h2>

                <div className="bg-zinc-800 rounded-xl border border-zinc-700 overflow-hidden">
                    {showClearConfirm ? (
                        <div className="p-4 space-y-3">
                            <p className="text-white">
                                Supprimer toutes les donnees locales ?
                            </p>
                            <p className="text-gray-400 text-sm">
                                Cette action est irreversible. Si vous avez un compte connecte,
                                vos donnees cloud seront conservees.
                            </p>
                            <div className="flex gap-3">
                                <button
                                    onClick={() => setShowClearConfirm(false)}
                                    className="flex-1 py-2 rounded-lg bg-zinc-700 text-white"
                                >
                                    Annuler
                                </button>
                                <button
                                    onClick={handleClearData}
                                    className="flex-1 py-2 rounded-lg bg-red-500 text-white"
                                >
                                    Supprimer
                                </button>
                            </div>
                        </div>
                    ) : (
                        <button
                            onClick={() => setShowClearConfirm(true)}
                            className="w-full p-4 flex items-center gap-3"
                        >
                            <div className="flex-1 text-left">
                                <p className="text-red-400 font-medium">Effacer les donnees locales</p>
                                <p className="text-gray-400 text-sm">
                                    Supprimer toutes les donnees de cet appareil
                                </p>
                            </div>
                        </button>
                    )}
                </div>
            </div>

            {/* Info version */}
            <div className="text-center pt-4">
                <p className="text-gray-500 text-xs">
                    Hooked v1.0.0
                </p>
            </div>
        </div>
    );
}
