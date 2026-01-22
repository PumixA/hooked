import { useAuth } from '../context/AuthContext';
import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function Settings() {
    const { logout, user } = useAuth();
    const navigate = useNavigate();

    return (
        <div className="p-4 space-y-6">
            <div className="flex items-center gap-4">
                <button onClick={() => navigate(-1)} className="text-gray-400">
                    <ArrowLeft />
                </button>
                <h1 className="text-xl font-bold text-white">Paramètres</h1>
            </div>

            <div className="bg-zinc-800 p-4 rounded-xl border border-zinc-700">
                <p className="text-white font-bold">Mon Atelier</p>
                <p className="text-gray-400 text-sm">{user?.email}</p>
            </div>

            <button
                onClick={logout}
                className="w-full border border-red-500/50 text-red-400 py-3 rounded-xl"
            >
                Se déconnecter
            </button>
        </div>
    );
}