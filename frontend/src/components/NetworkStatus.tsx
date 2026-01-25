import { useSync } from '../context/SyncContext';
import { WifiOff, RefreshCw } from 'lucide-react';

export default function NetworkStatus() {
    const { isOnline, queue, syncNow, isSyncing } = useSync();

    // Si on est en ligne et qu'il n'y a rien à synchroniser, on n'affiche rien
    if (isOnline && queue.length === 0) return null;

    return (
        <button
            onClick={() => isOnline && queue.length > 0 && !isSyncing ? syncNow() : null}
            disabled={!isOnline || isSyncing}
            className={`
                fixed top-4 right-16 z-50 flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium transition-all shadow-lg backdrop-blur-md border
                ${!isOnline 
                    ? "bg-red-500/20 text-red-400 border-red-500/50" 
                    : "bg-orange-500/20 text-orange-400 border-orange-500/50 cursor-pointer hover:bg-orange-500/30"
                }
            `}
        >
            {!isOnline ? (
                <>
                    <WifiOff size={14} />
                    <span>Hors-ligne</span>
                </>
            ) : (
                <>
                    <RefreshCw size={14} className={isSyncing ? "animate-spin" : ""} />
                    <span>{isSyncing ? "Sync..." : `${queue.length} en attente`}</span>
                </>
            )}
        </button>
    );
}