import { Settings } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function Dashboard() {
    const navigate = useNavigate();

    return (
        <div className="p-4 space-y-6">
            {/* Header */}
            <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                    <img src="/logo-mini.svg" className="w-8 h-8" alt="Logo" />
                    <h1 className="text-2xl font-bold text-white">Bonjour !</h1>
                </div>
                <button onClick={() => navigate('/settings')} className="p-2 rounded-full bg-secondary text-gray-400">
                    <Settings size={20} />
                </button>
            </div>

            {/* Contenu Temporaire */}
            <div className="bg-secondary rounded-2xl p-6 border border-zinc-700/50">
                <p className="text-gray-400">Chargement des projets...</p>
            </div>
        </div>
    );
}