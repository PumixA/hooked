import { Routes, Route, Navigate } from 'react-router-dom';
import AppLayout from './layouts/AppLayout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Inventory from './pages/Inventory';
import Settings from './pages/Settings';
import ProjectCreate from './pages/ProjectCreate';
import ProjectDetail from './pages/ProjectDetail';
import MaterialCreate from './pages/MaterialCreate';
import MaterialEdit from './pages/MaterialEdit';
import AdminUsers from './pages/AdminUsers';
import AdminUserDetail from './pages/AdminUserDetail';

/**
 * App - Routing principal
 *
 * Architecture Offline-First:
 * - Toutes les routes sont accessibles sans authentification
 * - La page login est accessible depuis les parametres pour activer la sync cloud
 * - L'application fonctionne 100% en local par defaut
 */
function App() {
    return (
        <Routes>
            {/* Routes principales - Accessibles a tous */}
            <Route element={<AppLayout />}>
                <Route path="/" element={<Dashboard />} />

                {/* INVENTAIRE */}
                <Route path="/inventory" element={<Inventory />} />
                <Route path="/inventory/new" element={<MaterialCreate />} />
                <Route path="/inventory/:id" element={<MaterialEdit />} />

                {/* PARAMETRES */}
                <Route path="/settings" element={<Settings />} />

                {/* PROJETS */}
                <Route path="/projects/new" element={<ProjectCreate />} />
                <Route path="/projects/:id" element={<ProjectDetail />} />

                {/* PAGE DE CONNEXION - Accessible depuis parametres */}
                <Route path="/login" element={<Login />} />

                {/* ADMINISTRATION */}
                <Route path="/admin/users" element={<AdminUsers />} />
                <Route path="/admin/users/:id" element={<AdminUserDetail />} />
            </Route>

            {/* Redirection par defaut vers le dashboard */}
            <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
    );
}

export default App;
