import { useSync } from '../context/SyncContext';
import { useSyncStatus } from '../context/AppContext';
import { WifiOff, Cloud } from 'lucide-react';

/**
 * Indicateur de statut reseau et mode de synchronisation
 *
 * Affiche:
 * - Mode Local (smartphone) si pas de compte ou sync desactivee
 * - Mode Cloud (nuage) si sync activee
 * - Hors-ligne (wifi barre) si pas de connexion
 */
export default function NetworkStatus() {
    const { isOnline } = useSync();
    const { isSyncActive } = useSyncStatus();

    // En mode local, ne rien afficher si online (fonctionnement normal)
    if (!isSyncActive && isOnline) {
        return null;
    }

    // Hors ligne
    if (!isOnline) {
        return (
            <div className="fixed top-4 right-4 z-50 flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium bg-red-500/20 text-red-400 border border-red-500/50 shadow-lg backdrop-blur-md">
                <WifiOff size={14} />
                <span>Hors-ligne</span>
            </div>
        );
    }

    // Mode cloud actif et en ligne
    if (isSyncActive && isOnline) {
        return (
            <div className="fixed top-4 right-4 z-50 flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium bg-green-500/20 text-green-400 border border-green-500/50 shadow-lg backdrop-blur-md">
                <Cloud size={14} />
                <span>Sync active</span>
            </div>
        );
    }

    return null;
}
