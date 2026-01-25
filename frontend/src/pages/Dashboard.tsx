import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Settings, Plus, Loader2, Clock, WifiOff, Package, Cloud, RefreshCw, Trash2, Edit2, CheckCircle } from 'lucide-react';
import api from '../services/api';
import Card from '../components/ui/Card';
import Navbar from '../components/BottomNavBar';
import { useSync } from '../context/SyncContext';
import { useState, useRef } from 'react';
import Modal from '../components/ui/Modal';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';

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
    const { queue, isOnline, syncNow, addToQueue } = useSync();
    const [isRefreshing, setIsRefreshing] = useState(false);
    const queryClient = useQueryClient();

    // --- ÉTATS POUR LE MENU CONTEXTUEL ---
    const [selectedProject, setSelectedProject] = useState<Project | null>(null);
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [isRenameModalOpen, setIsRenameModalOpen] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [newTitle, setNewTitle] = useState('');

    const longPressTimer = useRef<NodeJS.Timeout | null>(null);

    const { data, isLoading, isError, refetch } = useQuery({
        queryKey: ['projects'],
        queryFn: async () => {
            const response = await api.get('/projects');
            return response.data as Project[];
        },
        // 🔥 IMPORTANT : Si le SW échoue, on ne veut pas que React Query réessaie en boucle
        // On veut afficher l'erreur (ou le cache s'il existe) immédiatement.
        retry: false,
        // On garde les données en cache "fraîches" plus longtemps en cas de pépin
        staleTime: 1000 * 60 * 5, // 5 minutes
    });

    // --- RÉCUPÉRATION DU TEMPS HEBDOMADAIRE ---
    const { data: weeklyTimeData } = useQuery({
        queryKey: ['weeklyTime'],
        queryFn: async () => {
            const response = await api.get('/sessions/weekly');
            return response.data as { totalSeconds: number };
        },
        retry: false
    });

    const formatWeeklyTime = (seconds: number) => {
        if (!seconds) return "0h 00m";
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        return `${hours}h ${minutes.toString().padStart(2, '0')}m`;
    };

    // --- MUTATIONS ---
    const renameMutation = useMutation({
        mutationFn: async ({ id, title }: { id: string, title: string }) => {
            if (isOnline) {
                await api.put(`/projects/${id}`, { title });
            } else {
                addToQueue('UPDATE_PROJECT', { id, title });
            }
        },
        onMutate: async ({ id, title }) => {
            await queryClient.cancelQueries({ queryKey: ['projects'] });
            const previousProjects = queryClient.getQueryData<Project[]>(['projects']);

            queryClient.setQueryData<Project[]>(['projects'], (old) => {
                if (!old) return [];
                return old.map(p => p.id === id ? { ...p, title, updated_at: new Date().toISOString() } : p);
            });

            return { previousProjects };
        },
        onError: (err, newTodo, context) => {
            queryClient.setQueryData(['projects'], context?.previousProjects);
        },
        onSettled: () => {
            if (isOnline) {
                queryClient.invalidateQueries({ queryKey: ['projects'] });
            }
            setIsRenameModalOpen(false);
            setIsMenuOpen(false);
        }
    });

    const deleteMutation = useMutation({
        mutationFn: async (id: string) => {
            if (isOnline) {
                await api.delete(`/projects/${id}`);
            } else {
                addToQueue('DELETE_PROJECT', { id });
            }
        },
        onMutate: async (id) => {
            await queryClient.cancelQueries({ queryKey: ['projects'] });
            const previousProjects = queryClient.getQueryData<Project[]>(['projects']);

            queryClient.setQueryData<Project[]>(['projects'], (old) => {
                if (!old) return [];
                return old.filter(p => p.id !== id);
            });

            return { previousProjects };
        },
        onError: (err, newTodo, context) => {
            queryClient.setQueryData(['projects'], context?.previousProjects);
        },
        onSettled: () => {
            if (isOnline) {
                queryClient.invalidateQueries({ queryKey: ['projects'] });
            }
            setIsDeleteModalOpen(false);
            setIsMenuOpen(false);
        }
    });

    const projects = Array.isArray(data) ? data : [];

    const handleRefresh = async () => {
        setIsRefreshing(true);
        await Promise.all([
            refetch(),
            queryClient.invalidateQueries({ queryKey: ['weeklyTime'] })
        ]);
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

    // --- GESTION DU LONG PRESS ---
    const handlePointerDown = (project: Project) => {
        longPressTimer.current = setTimeout(() => {
            setSelectedProject(project);
            setNewTitle(project.title);
            setIsMenuOpen(true);
        }, 600);
    };

    const handlePointerUp = () => {
        if (longPressTimer.current) {
            clearTimeout(longPressTimer.current);
        }
    };

    const handlePointerMove = () => {
        if (longPressTimer.current) {
            clearTimeout(longPressTimer.current);
        }
    };

    const handleCardClick = (projectId: string) => {
        if (!isMenuOpen) {
            navigate(`/projects/${projectId}`);
        }
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
                        <p className="text-2xl font-bold">
                            {weeklyTimeData ? formatWeeklyTime(weeklyTimeData.totalSeconds) : '0h 00m'}
                        </p>
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
                                onPointerDown={() => handlePointerDown(lastProject)}
                                onPointerUp={handlePointerUp}
                                onPointerMove={handlePointerMove}
                                onClick={() => handleCardClick(lastProject.id)}
                                className={`relative overflow-hidden bg-secondary p-5 rounded-3xl border shadow-lg shadow-primary/5 cursor-pointer active:scale-[0.98] transition-all select-none ${lastProject.status === 'completed' ? 'border-green-500/30 bg-green-500/5' : 'border-primary/20'}`}
                            >
                                <img src="/logo.svg" alt="" className="absolute top-3 right-3 w-16 h-16 opacity-50 pointer-events-none" />
                                <div className="flex items-center gap-2 mb-3">
                                    <span className={`inline-block text-[10px] px-3 py-1 rounded-full font-bold uppercase tracking-wider ${lastProject.status === 'completed' ? 'bg-green-500/20 text-green-400' : 'bg-primary/20 text-primary'}`}>
                                        {lastProject.status === 'completed' ? 'Terminé' : 'Dernier projet'}
                                    </span>
                                    {lastProject.status === 'completed' && <CheckCircle size={14} className="text-green-400" />}
                                </div>
                                
                                <h3 className="text-2xl font-bold mb-2 truncate">{lastProject.title}</h3>
                                <div className="mt-6">
                                    <div className="flex justify-between text-xs text-zinc-400 mb-2 font-medium">
                                        <span>Progression</span>
                                        <span>{lastProject.current_row} <span className="text-zinc-600">/ {lastProject.goal_rows || '∞'}</span></span>
                                    </div>
                                    <div className="w-full bg-zinc-800 h-2.5 rounded-full overflow-hidden">
                                        <div
                                            className={`h-full transition-all duration-700 ease-out ${lastProject.status === 'completed' ? 'bg-green-500' : 'bg-primary'}`}
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
                                        onPointerDown={() => handlePointerDown(proj)}
                                        onPointerUp={handlePointerUp}
                                        onPointerMove={handlePointerMove}
                                        onClick={() => handleCardClick(proj.id)}
                                        className={`p-4 active:scale-[0.96] transition-transform flex flex-col justify-between h-32 bg-secondary select-none ${proj.status === 'completed' ? 'border-green-500/30 bg-green-500/5' : 'border-zinc-800'}`}
                                    >
                                        <div className={`w-8 h-8 rounded-full flex items-center justify-center mb-2 font-bold text-xs ${proj.status === 'completed' ? 'bg-green-500/20 text-green-400' : 'bg-zinc-800 text-zinc-500'}`}>
                                            {proj.status === 'completed' ? <CheckCircle size={14} /> : '#'}
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-sm truncate">{proj.title}</h4>
                                            <p className={`text-xs mt-1 ${proj.status === 'completed' ? 'text-green-400' : 'text-primary'}`}>
                                                {proj.status === 'completed' ? 'Terminé' : `Rang ${proj.current_row}`}
                                            </p>
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

            {/* --- MODALES --- */}

            {/* Menu Contextuel */}
            <Modal isOpen={isMenuOpen} onClose={() => setIsMenuOpen(false)} title={selectedProject?.title || 'Options'}>
                <div className="space-y-3">
                    <button
                        onClick={() => { setIsMenuOpen(false); setIsRenameModalOpen(true); }}
                        className="w-full flex items-center gap-3 p-4 bg-zinc-800/50 rounded-xl hover:bg-zinc-800 transition text-left"
                    >
                        <Edit2 size={20} className="text-blue-400" />
                        <span className="font-medium">Renommer le projet</span>
                    </button>
                    <button
                        onClick={() => { setIsMenuOpen(false); setIsDeleteModalOpen(true); }}
                        className="w-full flex items-center gap-3 p-4 bg-red-500/10 rounded-xl hover:bg-red-500/20 transition text-left text-red-400"
                    >
                        <Trash2 size={20} />
                        <span className="font-medium">Supprimer définitivement</span>
                    </button>
                </div>
            </Modal>

            {/* Modale Renommer */}
            <Modal isOpen={isRenameModalOpen} onClose={() => setIsRenameModalOpen(false)} title="Renommer">
                <div className="space-y-4">
                    <Input
                        value={newTitle}
                        onChange={(e) => setNewTitle(e.target.value)}
                        placeholder="Nouveau nom du projet"
                    />
                    <div className="flex gap-3 mt-4">
                        <Button variant="secondary" onClick={() => setIsRenameModalOpen(false)} className="flex-1">Annuler</Button>
                        <Button
                            onClick={() => selectedProject && renameMutation.mutate({ id: selectedProject.id, title: newTitle })}
                            isLoading={renameMutation.isPending}
                            className="flex-1"
                        >
                            Valider
                        </Button>
                    </div>
                </div>
            </Modal>

            {/* Modale Suppression */}
            <Modal isOpen={isDeleteModalOpen} onClose={() => setIsDeleteModalOpen(false)} title="Supprimer ?">
                <div className="space-y-4 text-center">
                    <p className="text-zinc-400">
                        Êtes-vous sûr de vouloir supprimer <span className="text-white font-bold">{selectedProject?.title}</span> ?
                        <br />Cette action est irréversible.
                    </p>
                    <div className="flex gap-3 mt-6">
                        <Button variant="secondary" onClick={() => setIsDeleteModalOpen(false)} className="flex-1">Annuler</Button>
                        <Button
                            variant="danger"
                            onClick={() => selectedProject && deleteMutation.mutate(selectedProject.id)}
                            isLoading={deleteMutation.isPending}
                            className="flex-1"
                        >
                            Supprimer
                        </Button>
                    </div>
                </div>
            </Modal>

        </div>
    );
}