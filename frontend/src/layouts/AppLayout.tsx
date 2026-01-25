import { Outlet, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import BottomNavBar from '../components/BottomNavBar';
import NetworkStatus from '../components/NetworkStatus';

export default function AppLayout() {
    const { user, loading } = useAuth();

    if (loading) return <div className="min-h-screen bg-background flex items-center justify-center text-white">Chargement...</div>;

    // Protection : Si pas connecté, hop, au login !
    if (!user) return <Navigate to="/login" replace />;

    return (
        <div className="min-h-screen bg-background text-white">
            {/* Indicateur de statut réseau global */}
            <NetworkStatus />

            {/* Outlet = L'endroit où les pages (Dashboard, Inventory) s'affichent */}
            <main className="min-h-screen pb-20"> {/* pb-20 pour éviter que le contenu soit caché par la navbar */}
                <Outlet />
            </main>

            {/* La barre de navigation visible partout */}
            <BottomNavBar />
        </div>
    );
}