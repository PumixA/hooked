import { Routes, Route, Navigate } from 'react-router-dom';
import AppLayout from './layouts/AppLayout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Inventory from './pages/Inventory';
import Settings from './pages/Settings';
import ProjectCreate from './pages/ProjectCreate';
import ProjectDetail from './pages/ProjectDetail'; // <--- AJOUT : Import de la page détail
import { useAuth } from './context/AuthContext';

// Petit wrapper pour empêcher d'aller sur Login si on est déjà connecté
const PublicRoute = ({ children }: { children: JSX.Element }) => {
    const { user } = useAuth();
    if (user) return <Navigate to="/" replace />;
    return children;
};

function App() {
    return (
        <Routes>
            {/* Route Publique (Login) */}
            <Route path="/login" element={
                <PublicRoute>
                    <Login />
                </PublicRoute>
            } />

            {/* Routes Privées (Protégées par le Layout) */}
            <Route element={<AppLayout />}>
                <Route path="/" element={<Dashboard />} />
                <Route path="/inventory" element={<Inventory />} />
                <Route path="/settings" element={<Settings />} />

                {/* Création de projet */}
                <Route path="/projects/new" element={<ProjectCreate />} />

                {/* AJOUT : Route dynamique pour le compteur (Détail projet) */}
                <Route path="/projects/:id" element={<ProjectDetail />} />
            </Route>

            {/* Redirection par défaut */}
            <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
    );
}

export default App;