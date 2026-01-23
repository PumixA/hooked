import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query'; // <--- IMPORT HOOK
import { Settings, Plus, Loader2, Cloud, Clock } from 'lucide-react';
import api from '../services/api';
import Card from '../components/ui/Card';

// Type simplifié pour un projet
interface Project {
    id: string;
    title: string;
    current_row: number;
    goal_rows?: number;
    updated_at: string;
}

export default function Dashboard() {
    const navigate = useNavigate();

    // REMPLACEMENT : On utilise useQuery au lieu de useState/useEffect
    const { data: projects = [], isLoading } = useQuery({
        queryKey: ['projects'], // Clé unique pour le cache
        queryFn: async () => {
            const { data } = await api.get('/projects');
            return data as Project[];
        }
    });

    // Logique de tri : Le plus récent en premier
    const sortedProjects = [...projects].sort((a, b) =>
        new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
    );

    // On isole le dernier projet pour l'afficher en gros
    const lastProject = sortedProjects[0];
    // On garde les autres pour la grille
    const otherProjects = sortedProjects.slice(1);

    // État de chargement global (géré par React Query)
    if (isLoading) {
        return (
            <div className="flex justify-center items-center h-screen bg-background text-primary">
                <Loader2 className="animate-spin" size={40} />
            </div>
        );
    }

    return (
        <div className="p-4 space-y-6 pb-24 animate-fade-in bg-background min-h-screen">

            {/* --- HEADER --- */}
            <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                    <img src="/logo-mini.svg" className="w-8 h-8" alt="Logo" />
                    <h1 className="text-2xl font-bold text-white">Bonjour !</h1>
                </div>
                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1 text-[10px] text-green-400 font-medium bg-green-400/10 px-2 py-1 rounded-full">
                        <Cloud size={12} />
                        <span>Sync</span>
                    </div>
                    <button onClick={() => navigate('/settings')} className="p-2 rounded-full bg-secondary text-gray-400 hover:text-white transition">
                        <Settings size={20} />
                    </button>
                </div>
            </div>

            {/* --- CARTE STATS (Mock) --- */}
            <Card className="flex items-center gap-4 py-6">
                <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center text-primary">
                    <Clock size={24} />
                </div>
                <div>
                    <p className="text-zinc-400 text-xs uppercase tracking-wide">Temps cette semaine</p>
                    <p className="text-2xl font-bold text-white">0h 00m</p>
                </div>
            </Card>

            <h2 className="text-lg font-bold text-white mt-8">En cours</h2>

            {projects.length === 0 ? (
                // --- CAS 1 : AUCUN PROJET (Empty State) ---
                <div className="text-center py-12 px-4 bg-secondary/50 rounded-2xl border-2 border-dashed border-zinc-700">
                    <div className="w-16 h-16 bg-zinc-800 rounded-full flex items-center justify-center mx-auto mb-4 text-zinc-500">
                        <Plus size={32} />
                    </div>
                    <p className="text-white font-medium mb-1">Ton atelier est vide</p>
                    <p className="text-sm text-zinc-500">Appuie sur le bouton + pour commencer ton premier ouvrage !</p>
                </div>
            ) : (
                <>
                    {/* --- CAS 2 : LISTE DES PROJETS --- */}

                    {/* A. Le dernier projet mis en avant (Grande carte) */}
                    {lastProject && (
                        <div
                            onClick={() => navigate(`/projects/${lastProject.id}`)}
                            className="relative overflow-hidden bg-secondary p-5 rounded-3xl border border-primary/30 shadow-[0_0_20px_-5px_rgba(196,181,253,0.2)] cursor-pointer active:scale-[0.98] transition-all"
                        >
                            <div className="absolute top-0 right-0 p-3 opacity-5 pointer-events-none">
                                <img src="/logo-mini.svg" className="w-24 h-24" />
                            </div>

                            <span className="inline-block bg-primary/20 text-primary text-[10px] px-3 py-1 rounded-full font-bold uppercase tracking-wider mb-3">
                                Dernier projet
                            </span>

                            <h3 className="text-2xl font-bold text-white mb-2">{lastProject.title}</h3>

                            <div className="mt-6">
                                <div className="flex justify-between text-xs text-zinc-400 mb-2 font-medium">
                                    <span>Progression</span>
                                    <span>{lastProject.current_row} <span className="text-zinc-600">/ {lastProject.goal_rows || '∞'}</span></span>
                                </div>
                                <div className="w-full bg-zinc-800 h-3 rounded-full overflow-hidden">
                                    <div
                                        className="bg-primary h-full transition-all duration-700 ease-out"
                                        style={{ width: `${lastProject.goal_rows ? (lastProject.current_row / lastProject.goal_rows) * 100 : 5}%` }}
                                    />
                                </div>
                            </div>
                        </div>
                    )}

                    {/* B. Les autres projets (Grille) */}
                    {otherProjects.length > 0 && (
                        <div className="grid grid-cols-2 gap-4 mt-6">
                            {otherProjects.map((proj) => (
                                <Card
                                    key={proj.id}
                                    onClick={() => navigate(`/projects/${proj.id}`)}
                                    className="p-4 active:scale-[0.95] transition-transform flex flex-col justify-between h-32"
                                >
                                    <div className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center text-zinc-500 mb-2">
                                        <span className="font-bold text-lg">#</span>
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-white text-sm truncate">{proj.title}</h4>
                                        <p className="text-xs text-primary mt-1">Rang {proj.current_row}</p>
                                    </div>
                                </Card>
                            ))}
                        </div>
                    )}
                </>
            )}

            <button
                onClick={() => navigate('/projects/new')}
                className="fixed bottom-24 right-6 w-14 h-14 bg-primary text-background rounded-full flex items-center justify-center shadow-lg hover:scale-110 active:scale-90 transition-all z-40"
            >
                <Plus size={32} strokeWidth={2.5} />
            </button>

        </div>
    );
}