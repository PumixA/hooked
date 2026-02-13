/**
 * Donnees par defaut pour le fonctionnement offline
 *
 * Ces donnees sont injectees dans IndexedDB au premier lancement
 * pour que l'application fonctionne 100% hors ligne sans jamais
 * avoir besoin de l'API.
 */

import { localDb, type LocalCategory } from './localDb';

declare global {
    interface Window {
        __defaultData?: {
            reinitialize: typeof forceReinitialize;
            categories: LocalCategory[];
        };
    }
}

// Categories de projets par defaut
// Correspondent aux categories de la base de donnees serveur
const DEFAULT_CATEGORIES: LocalCategory[] = [
    { id: 'cat-pull', label: 'Pull', icon: 'shirt' },
    { id: 'cat-bonnet', label: 'Bonnet', icon: 'hard-hat' },
    { id: 'cat-echarpe', label: 'Echarpe', icon: 'wind' },
    { id: 'cat-couverture', label: 'Couverture', icon: 'bed-double' },
    { id: 'cat-gants', label: 'Gants', icon: 'hand' },
    { id: 'cat-sac', label: 'Sac', icon: 'shopping-bag' },
    { id: 'cat-amigurumi', label: 'Amigurumi', icon: 'baby' },
    { id: 'cat-chaussettes', label: 'Chaussettes', icon: 'footprints' },
    { id: 'cat-gilet', label: 'Gilet', icon: 'shirt' },
    { id: 'cat-autre', label: 'Autre', icon: 'shapes' },
];

const INIT_KEY = 'hooked_data_initialized';
const INIT_VERSION = '2'; // Incrementer pour forcer une reinitialisation

/**
 * Initialise les donnees par defaut si necessaire
 * Appelee au demarrage de l'application
 */
export async function initializeDefaultData(): Promise<void> {
    const initialized = localStorage.getItem(INIT_KEY);

    // Si deja initialise avec la bonne version, ne rien faire
    if (initialized === INIT_VERSION) {
        console.log('[DefaultData] Donnees deja initialisees');
        return;
    }

    console.log('[DefaultData] Initialisation des donnees par defaut...');

    try {
        // Charger les categories par defaut
        const existingCategories = await localDb.getAllCategories();

        if (existingCategories.length === 0) {
            await localDb.saveCategories(DEFAULT_CATEGORIES);
            console.log(`[DefaultData] ${DEFAULT_CATEGORIES.length} categories ajoutees`);
        } else {
            // Mettre a jour les categories existantes avec les nouvelles
            // (utile si on ajoute des categories dans une mise a jour)
            const existingIds = new Set(existingCategories.map(c => c.id));
            const newCategories = DEFAULT_CATEGORIES.filter(c => !existingIds.has(c.id));

            if (newCategories.length > 0) {
                await localDb.saveCategories([...existingCategories, ...newCategories]);
                console.log(`[DefaultData] ${newCategories.length} nouvelles categories ajoutees`);
            }
        }

        // Marquer comme initialise
        localStorage.setItem(INIT_KEY, INIT_VERSION);
        console.log('[DefaultData] Initialisation terminee');

    } catch (error) {
        console.error('[DefaultData] Erreur lors de l\'initialisation:', error);
    }
}

/**
 * Force la reinitialisation des donnees par defaut
 * Utile pour le debug ou apres une mise a jour majeure
 */
export async function forceReinitialize(): Promise<void> {
    localStorage.removeItem(INIT_KEY);
    await initializeDefaultData();
}

// Exposer pour debug
if (typeof window !== 'undefined') {
    window.__defaultData = {
        reinitialize: forceReinitialize,
        categories: DEFAULT_CATEGORIES,
    };
}
