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
        <div className="h-[100dvh] bg-background text-white overflow-hidden">
            {/* Indicateur de statut reseau/sync */}
            <NetworkStatus />

            {/* Contenu des pages */}
            <main className="h-full pb-20 overflow-hidden">
                <Outlet />
            </main>

            {/* Barre de navigation */}
            <BottomNavBar />
        </div>
    );
}
