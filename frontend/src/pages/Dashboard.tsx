import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Settings, Plus, Loader2, Clock, WifiOff, Package } from 'lucide-react';
import api from '../services/api';
import Card from '../components/ui/Card';
import Navbar from '../components/BottomNavBar';

interface Project {
    id: string;
    title: string;
    current_row: number;
    goal_rows?: number;
    updated_at: string;
    status: string;
}

export default function Dashboard() {
    const navigate = useNavigate();

    // 1. Récupération Sécurisée
    const { data, isLoading, isError } = useQuery({
        queryKey: ['projects'],
        queryFn: async () => {
            const response = await api.get('/projects');
            return response.data as Project[];
        }
    });

    // 2. Sécurité : projets est TOUJOURS un tableau
    const projects = Array.isArray(data) ? data : [];

    // --- GESTION DES ÉTATS ---

    // A. Chargement (Uniquement si pas de cache)
    if (isLoading) {
        return (
            <div className="flex justify-center items-center h-screen bg-background text-primary">
                <Loader2 className="animate-spin" size={40} />
            </div>
        );
    }

    // B. Erreur Fatale (Ni réseau, ni cache)
    if (isError && projects.length === 0) {
        return (
            <div className="h-screen flex flex-col items-center justify-center text-zinc-500 bg-background gap-4 p-4 text-center">
                <WifiOff size={48} />
                <p className="text-lg font-medium text-white">Oups, connexion perdue</p>
                <p className="text-sm">Impossible de charger vos projets.</p>
                <button
                    onClick={() => window.location.reload()}
                    className="mt-4 px-6 py-2 bg-zinc-800 rounded-full text-white hover:bg-zinc-700 transition"
                >
                    Réessayer
                </button>
            </div>
        );
    }

    // --- LOGIQUE D'AFFICHAGE ---

    const sortedProjects = [...projects].sort((a, b) =>
        new Date(b.updated_at || 0).getTime() - new Date(a.updated_at || 0).getTime()
    );

    const lastProject = sortedProjects[0];
    const otherProjects = sortedProjects.slice(1);

    return (
        <div className="p-4 space-y-6 pb-24 animate-fade-in bg-background min-h-screen text-white">

            {/* HEADER */}
            <div className="flex justify-between items-center pt-2">
                <div className="flex items-center gap-2">
                    <img src="/logo-mini.svg" className="w-8 h-8" alt="Logo" />
                    <h1 className="text-2xl font-bold">Bonjour !</h1>
                </div>
                <div className="flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_8px_#22c55e]"></div>
                    <button onClick={() => navigate('/settings')} className="p-2 rounded-full bg-secondary text-gray-400 hover:text-white transition">
                        <Settings size={20} />
                    </button>
                </div>
            </div>

            {/* STATS */}
            <Card className="flex items-center gap-4 py-6 border-zinc-800 bg-secondary">
                <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center text-primary">
                    <Clock size={24} />
                </div>
                <div>
                    <p className="text-zinc-400 text-xs uppercase tracking-wide">Temps cette semaine</p>
                    <p className="text-2xl font-bold">0h 00m</p>
                </div>
            </Card>

            <h2 className="text-lg font-bold mt-8">En cours</h2>

            {projects.length === 0 ? (
                // Empty State
                <div className="text-center py-12 px-4 bg-secondary/30 rounded-2xl border-2 border-dashed border-zinc-800">
                    <Package size={48} className="mx-auto mb-4 text-zinc-600" />
                    <p className="font-medium mb-1">Ton atelier est vide</p>
                    <p className="text-sm text-zinc-500">Ajoute ton premier projet !</p>
                </div>
            ) : (
                <>
                    {/* Dernier Projet */}
                    {lastProject && (
                        <div
                            onClick={() => navigate(`/projects/${lastProject.id}`)}
                            className="relative overflow-hidden bg-secondary p-5 rounded-3xl border border-primary/20 shadow-lg shadow-primary/5 cursor-pointer active:scale-[0.98] transition-all"
                        >
                            <span className="inline-block bg-primary/20 text-primary text-[10px] px-3 py-1 rounded-full font-bold uppercase tracking-wider mb-3">
                                Dernier projet
                            </span>
                            <h3 className="text-2xl font-bold mb-2 truncate">{lastProject.title}</h3>
                            <div className="mt-6">
                                <div className="flex justify-between text-xs text-zinc-400 mb-2 font-medium">
                                    <span>Progression</span>
                                    <span>{lastProject.current_row} <span className="text-zinc-600">/ {lastProject.goal_rows || '∞'}</span></span>
                                </div>
                                <div className="w-full bg-zinc-800 h-2.5 rounded-full overflow-hidden">
                                    <div
                                        className="bg-primary h-full transition-all duration-700 ease-out"
                                        style={{ width: `${lastProject.goal_rows ? Math.min(100, (lastProject.current_row / lastProject.goal_rows) * 100) : 5}%` }}
                                    />
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Autres Projets */}
                    {otherProjects.length > 0 && (
                        <div className="grid grid-cols-2 gap-4 mt-6">
                            {otherProjects.map((proj) => (
                                <Card
                                    key={proj.id}
                                    onClick={() => navigate(`/projects/${proj.id}`)}
                                    className="p-4 active:scale-[0.96] transition-transform flex flex-col justify-between h-32 bg-secondary border-zinc-800"
                                >
                                    <div className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center text-zinc-500 mb-2 font-bold text-xs">
                                        #
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-sm truncate">{proj.title}</h4>
                                        <p className="text-xs text-primary mt-1">Rang {proj.current_row}</p>
                                    </div>
                                </Card>
                            ))}
                        </div>
                    )}
                </>
            )}

            {/* FAB */}
            <button
                onClick={() => navigate('/projects/new')}
                className="fixed bottom-24 right-6 w-14 h-14 bg-primary text-background rounded-full flex items-center justify-center shadow-xl shadow-primary/20 hover:scale-110 active:scale-90 transition-all z-40"
            >
                <Plus size={32} strokeWidth={2.5} />
            </button>

            <Navbar />
        </div>
    );
}