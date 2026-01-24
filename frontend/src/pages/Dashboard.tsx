import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Settings, Plus, Loader2, Clock, WifiOff, Package, Cloud, RefreshCw } from 'lucide-react';
import api from '../services/api';
import Card from '../components/ui/Card';
import Navbar from '../components/BottomNavBar';
import { useSync } from '../context/SyncContext';
import { useState } from 'react';

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
    const { queue, isOnline, syncNow } = useSync();
    const [isRefreshing, setIsRefreshing] = useState(false);

    const { data, isLoading, isError, refetch } = useQuery({
        queryKey: ['projects'],
        queryFn: async () => {
            const response = await api.get('/projects');
            return response.data as Project[];
        }
    });

    const projects = Array.isArray(data) ? data : [];

    const handleRefresh = async () => {
        setIsRefreshing(true);
        await refetch();
        setIsRefreshing(false);
    };

    // Pull-to-refresh logic
    const [touchStart, setTouchStart] = useState(0);
    const [pullDistance, setPullDistance] = useState(0);

    const handleTouchStart = (e: React.TouchEvent) => {
        if (window.scrollY === 0) {
            setTouchStart(e.touches[0].clientY);
        }
    };

    const handleTouchMove = (e: React.TouchEvent) => {
        if (touchStart > 0) {
            const currentY = e.touches[0].clientY;
            const distance = currentY - touchStart;
            if (distance > 0) {
                setPullDistance(distance);
            }
        }
    };

    const handleTouchEnd = async () => {
        if (pullDistance > 100) {
            await handleRefresh();
        }
        setTouchStart(0);
        setPullDistance(0);
    };


    if (isLoading) {
        return (
            <div className="flex justify-center items-center h-screen bg-background text-primary">
                <Loader2 className="animate-spin" size={40} />
            </div>
        );
    }

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

    const sortedProjects = [...projects].sort((a, b) =>
        new Date(b.updated_at || 0).getTime() - new Date(a.updated_at || 0).getTime()
    );

    const lastProject = sortedProjects[0];
    const otherProjects = sortedProjects.slice(1);

    return (
        <div className="flex flex-col h-screen bg-background text-white animate-fade-in">

            {/* --- HEADER FIXE --- */}
            <div className="p-4 z-10 bg-background">
                {/* HEADER */}
                <div className="flex justify-between items-center pt-2">
                    <div className="flex items-center gap-2">
                        <img src="/logo-mini.svg" className="w-8 h-8" alt="Logo" />
                        <h1 className="text-2xl font-bold">Bonjour !</h1>
                    </div>
                    <div className="flex items-center gap-3">

                        {/* BOUTON DE SYNCHRO INTELLIGENT */}
                        <button
                            onClick={() => isOnline && queue.length > 0 ? syncNow() : null}
                            disabled={!isOnline && queue.length === 0}
                            className={`
                                flex items-center gap-1 text-[10px] font-medium px-2 py-1 rounded-full border transition-all
                                ${queue.length > 0
                                ? "bg-orange-500/10 text-orange-400 border-orange-500/50 animate-pulse cursor-pointer"
                                : "bg-green-500/10 text-green-400 border-green-500/20"
                            }
                            `}
                        >
                            {queue.length > 0 ? (
                                <>
                                    <RefreshCw size={12} className={isOnline ? "animate-spin" : ""} />
                                    <span>{queue.length} en attente</span>
                                </>
                            ) : (
                                <>
                                    <Cloud size={12} />
                                    <span>Sync</span>
                                </>
                            )}
                        </button>

                        <button onClick={() => navigate('/settings')} className="p-2 rounded-full bg-secondary text-gray-400 hover:text-white transition">
                            <Settings size={20} />
                        </button>
                    </div>
                </div>

                {/* STATS */}
                <Card className="flex items-center gap-4 py-6 border-zinc-800 bg-secondary mt-6">
                    <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center text-primary">
                        <Clock size={24} />
                    </div>
                    <div>
                        <p className="text-zinc-400 text-xs uppercase tracking-wide">Temps cette semaine</p>
                        <p className="text-2xl font-bold">0h 00m</p>
                    </div>
                </Card>
            </div>


            {/* --- CONTENU SCROLLABLE --- */}
            <div
                className="flex-1 overflow-y-auto px-4 pb-24 space-y-6 relative"
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
            >
                {/* Indicateur de rafraîchissement */}
                {(pullDistance > 50 || isRefreshing) && (
                    <div className="flex justify-center py-4 absolute top-0 left-0 right-0 -mt-12 transition-all" style={{ transform: `translateY(${Math.min(pullDistance / 2, 60)}px)` }}>
                        <Loader2 className="animate-spin text-primary" size={24} />
                    </div>
                )}

                <h2 className="text-lg font-bold">En cours</h2>

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
                                <img src="/logo.svg" alt="" className="absolute top-3 right-3 w-16 h-16 opacity-50 pointer-events-none" />
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
                            <div className="grid grid-cols-2 gap-4">
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
            </div>


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