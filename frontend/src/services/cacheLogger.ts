/**
 * Service de logging du cache React Query
 * Permet de tracer tous les stockages en cache et d'afficher l'état complet
 */

import type { QueryClient } from '@tanstack/react-query';

declare global {
    interface Window {
        __cacheDebug?: {
            history: CacheEntry[];
            logFull: (qc: QueryClient) => void;
            logQueue: (q: SyncQueueItem[]) => void;
        };
    }
}

const CACHE_LOG_PREFIX = '📦 [CACHE]';

interface CacheEntry {
    key: string;
    data: unknown;
    timestamp: number;
    source: 'api' | 'offline-mutation' | 'restored';
}

interface SyncQueueItem {
    id: string;
    type: string;
    payload: unknown;
    timestamp: number;
}

// Stockage des logs de cache pour le debugging
const cacheHistory: CacheEntry[] = [];

/**
 * Log quand une donnée est stockée en cache
 */
export function logCacheStore(queryKey: string[], data: unknown, source: 'api' | 'offline-mutation' | 'restored' = 'api') {
    const keyString = queryKey.join('/');
    const entry: CacheEntry = {
        key: keyString,
        data,
        timestamp: Date.now(),
        source
    };

    cacheHistory.push(entry);

    // Garder seulement les 50 dernières entrées
    if (cacheHistory.length > 50) {
        cacheHistory.shift();
    }

    const emoji = source === 'api' ? '🌐' : source === 'offline-mutation' ? '📝' : '💾';
    console.log(
        `${CACHE_LOG_PREFIX} ${emoji} STORE [${source}]`,
        `\n  Key: ${keyString}`,
        `\n  Data:`, data,
        `\n  Time: ${new Date().toLocaleTimeString()}`
    );
}

/**
 * Log quand une donnée est lue depuis le cache
 */
export function logCacheRead(queryKey: string[], data: unknown, isFromCache: boolean) {
    const keyString = queryKey.join('/');
    const emoji = isFromCache ? '💾' : '🌐';
    console.log(
        `${CACHE_LOG_PREFIX} ${emoji} READ [${isFromCache ? 'cache' : 'fresh'}]`,
        `\n  Key: ${keyString}`,
        `\n  Data:`, data
    );
}

/**
 * Affiche un tableau complet de tout le cache actuel
 */
export function logFullCache(queryClient: QueryClient) {
    const cache = queryClient.getQueryCache();
    const queries = cache.getAll();

    console.log('\n' + '='.repeat(60));
    console.log(`${CACHE_LOG_PREFIX} 📊 ÉTAT COMPLET DU CACHE`);
    console.log('='.repeat(60));

    if (queries.length === 0) {
        console.log('  (vide)');
    } else {
        const cacheTable: Record<string, unknown>[] = [];

        queries.forEach((query) => {
            const key = (query.queryKey as string[]).join('/');
            const state = query.state;
            const dataPreview = state.data
                ? (Array.isArray(state.data)
                    ? `Array(${state.data.length})`
                    : typeof state.data === 'object'
                        ? JSON.stringify(state.data).substring(0, 50) + '...'
                        : state.data)
                : '(no data)';

            cacheTable.push({
                'Clé': key,
                'Statut': state.status,
                'Données': dataPreview,
                'Dernière MàJ': state.dataUpdatedAt
                    ? new Date(state.dataUpdatedAt).toLocaleTimeString()
                    : '-',
                'Stale': query.isStale() ? '⚠️ Oui' : '✅ Non'
            });
        });

        console.table(cacheTable);

        // Afficher les données complètes
        console.log('\n📋 Données détaillées:');
        queries.forEach((query) => {
            console.log(`\n  [${(query.queryKey as string[]).join('/')}]:`, query.state.data);
        });
    }

    console.log('='.repeat(60) + '\n');
}

/**
 * Log la file de sync
 */
export function logSyncQueue(queue: SyncQueueItem[]) {
    console.log('\n' + '='.repeat(60));
    console.log(`${CACHE_LOG_PREFIX} 📤 FILE DE SYNCHRONISATION`);
    console.log('='.repeat(60));

    if (queue.length === 0) {
        console.log('  (vide - tout est synchronisé)');
    } else {
        const queueTable = queue.map(item => ({
            'ID': item.id,
            'Type': item.type,
            'Payload': JSON.stringify(item.payload).substring(0, 40) + '...',
            'Date': new Date(item.timestamp).toLocaleTimeString()
        }));
        console.table(queueTable);
    }

    console.log('='.repeat(60) + '\n');
}

/**
 * Log un résumé de l'état offline
 */
export function logOfflineStatus(isOnline: boolean, queueLength: number, cacheSize: number) {
    const status = isOnline ? '🟢 EN LIGNE' : '🔴 HORS LIGNE';
    console.log(
        `\n${CACHE_LOG_PREFIX} ${status}`,
        `\n  Actions en attente: ${queueLength}`,
        `\n  Entrées en cache: ${cacheSize}`
    );
}

// Exposer pour le debugging dans la console
if (typeof window !== 'undefined') {
    window.__cacheDebug = {
        history: cacheHistory,
        logFull: (qc: QueryClient) => logFullCache(qc),
        logQueue: (q: SyncQueueItem[]) => logSyncQueue(q)
    };
}
