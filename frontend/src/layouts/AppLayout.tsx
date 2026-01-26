import { Outlet } from 'react-router-dom';
import BottomNavBar from '../components/BottomNavBar';
import NetworkStatus from '../components/NetworkStatus';

/**
 * AppLayout - Layout principal de l'application
 *
 * Architecture Offline-First:
 * - Aucune verification d'authentification requise
 * - L'application fonctionne 100% en local par defaut
 * - L'indicateur reseau montre le statut de sync si active
 */
export default function AppLayout() {
    return (
        <div className="min-h-screen bg-background text-white">
            {/* Indicateur de statut reseau/sync */}
            <NetworkStatus />

            {/* Contenu des pages */}
            <main className="min-h-screen pb-20">
                <Outlet />
            </main>

            {/* Barre de navigation */}
            <BottomNavBar />
        </div>
    );
}
