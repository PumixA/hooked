import { useNavigate, useLocation } from 'react-router-dom';
import { Settings, Plus, Loader2, Clock, Package, Trash2, Edit2, CheckCircle } from 'lucide-react';
import Card from '../components/ui/Card';
import { useState, useRef, useEffect } from 'react';
import Modal from '../components/ui/Modal';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';
import { useProjects, useUpdateProject, useDeleteProject, useWeeklyTime } from '../hooks/useOfflineData';
import { getProjectVisual } from '../services/media';

interface Project {
    id: string;
    title: string;
    current_row: number;
    goal_rows?: number;
    updated_at: string;
    status: string;
    cover_file_path?: string;
    cover_base64?: string;
}

export default function Dashboard() {
    const navigate = useNavigate();
    const location = useLocation();

    // --- ETATS POUR LE MENU CONTEXTUEL ---
    const [selectedProject, setSelectedProject] = useState<Project | null>(null);
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [isRenameModalOpen, setIsRenameModalOpen] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [newTitle, setNewTitle] = useState('');
    const [longPressTriggered, setLongPressTriggered] = useState(false);

    const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const pressStartTime = useRef<number>(0);

    // Hooks de donnees locales
    const { data: projects = [], isLoading: isProjectsLoading, isError, refetch } = useProjects();
    const { data: weeklyTimeData, isLoading: isWeeklyLoading, refetch: refetchWeekly } = useWeeklyTime();
    const updateProjectMutation = useUpdateProject();
    const deleteProjectMutation = useDeleteProject();

    // Recharger les projets à chaque arrivée sur le dashboard
    useEffect(() => {
        refetch();
        refetchWeekly();
    }, [location.pathname, refetch, refetchWeekly]);

    useEffect(() => {
        const onFocus = () => { refetchWeekly(); refetch(); };
        window.addEventListener('focus', onFocus);
        return () => window.removeEventListener('focus', onFocus);
    }, [refetchWeekly, refetch]);

    const formatWeeklyTime = (seconds: number) => {
        if (!seconds) return "0h 00m";
        if (seconds < 60) return "< 1m";
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        return `${hours}h ${minutes.toString().padStart(2, '0')}m`;
    };

    const handleRename = () => {
        if (selectedProject && newTitle.trim()) {
            updateProjectMutation.mutate(
                { id: selectedProject.id, title: newTitle.trim() },
                {
                    onSuccess: () => {
                        setIsRenameModalOpen(false);
                        setIsMenuOpen(false);
                    }
                }
            );
        }
    };

    const handleDelete = () => {
        if (selectedProject) {
            deleteProjectMutation.mutate(selectedProject.id, {
                onSuccess: () => {
                    setIsDeleteModalOpen(false);
                    setIsMenuOpen(false);
                }
            });
        }
    };

    const projectList = Array.isArray(projects) ? projects : [];

    // --- GESTION DU LONG PRESS ---
    const handlePointerDown = (project: Project, e: React.PointerEvent) => {
        e.stopPropagation();
        setLongPressTriggered(false);
        pressStartTime.current = Date.now();

        longPressTimer.current = setTimeout(() => {
            setLongPressTriggered(true);
            setSelectedProject(project);
            setNewTitle(project.title);
            setIsMenuOpen(true);

            if (navigator.vibrate) {
                navigator.vibrate(50);
            }
        }, 500);
    };

    const handlePointerUp = (e: React.PointerEvent) => {
        e.stopPropagation();
        if (longPressTimer.current) {
            clearTimeout(longPressTimer.current);
        }
    };

    const handlePointerMove = (e: React.PointerEvent) => {
        e.stopPropagation();
        if (longPressTimer.current) {
            clearTimeout(longPressTimer.current);
        }
    };

    const handleCardClick = (projectId: string, e: React.MouseEvent) => {
        e.stopPropagation();

        // Si le long press a été déclenché, ne pas naviguer
        if (longPressTriggered) {
            setLongPressTriggered(false);
            return;
        }

        // Navigation immédiate
        navigate(`/projects/${projectId}`);
    };

    // --- TRI DES PROJETS ---
    const sortedProjects = [...projectList].sort((a, b) =>
        new Date(b.updated_at || 0).getTime() - new Date(a.updated_at || 0).getTime()
    );

    const lastProject = sortedProjects[0];
    const otherProjects = sortedProjects.slice(1);

    const hasProjectCover = (project: Project) => Boolean(project.cover_base64 || project.cover_file_path);

    // --- RENDU ---

    if (isError && projectList.length === 0) {
        return (
            <div className="h-screen flex flex-col items-center justify-center text-zinc-500 bg-background gap-4 p-4 text-center">
                <Package size={48} />
                <p className="text-lg font-medium text-white">Erreur de chargement</p>
                <p className="text-sm">Impossible de charger vos projets.</p>
                <button
                    onClick={() => window.location.reload()}
                    className="mt-4 px-6 py-2 bg-zinc-800 rounded-full text-white hover:bg-zinc-700 transition"
                >
                    Reessayer
                </button>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-[calc(100dvh-5rem)] bg-background text-white animate-fade-in overflow-hidden">

            {/* --- HEADER FIXE --- */}
            <div className="p-4 z-10 bg-background">
                {/* HEADER */}
                <div className="flex justify-between items-center pt-2">
                    <div className="flex items-center gap-2">
                        <img src="/logo-mini.svg" className="w-8 h-8" alt="Logo" />
                        <h1 className="text-2xl font-bold">Bonjour !</h1>
                    </div>
                    <button onClick={() => navigate('/settings')} className="p-2 rounded-full bg-secondary text-gray-400 hover:text-white transition">
                        <Settings size={20} />
                    </button>
                </div>

                {/* STATS */}
                <Card className="flex items-center gap-4 py-6 border-zinc-800 bg-secondary mt-6">
                    <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center text-primary">
                        <Clock size={24} />
                    </div>
                    <div>
                        <p className="text-zinc-400 text-xs uppercase tracking-wide">Temps cette semaine</p>
                        <p className="text-2xl font-bold flex items-center gap-2">
                            {isWeeklyLoading ? (
                                <>
                                    <Loader2 className="animate-spin text-zinc-500" size={20} />
                                    <span className="text-zinc-500 text-lg">...</span>
                                </>
                            ) : (
                                weeklyTimeData ? formatWeeklyTime(weeklyTimeData.totalSeconds) : '0h 00m'
                            )}
                        </p>
                    </div>
                </Card>
            </div>


            {/* --- CONTENU SCROLLABLE --- */}
            <div
                className="flex-1 overflow-y-auto overscroll-none px-4 pb-24 space-y-6 relative"
            >
                <h2 className="text-lg font-bold mb-4">En cours</h2>

                {isProjectsLoading ? (
                    <div className="space-y-4">
                        <div className="h-48 bg-secondary/50 rounded-3xl animate-pulse" />
                        <div className="grid grid-cols-2 gap-4">
                            <div className="h-32 bg-secondary/50 rounded-xl animate-pulse" />
                            <div className="h-32 bg-secondary/50 rounded-xl animate-pulse" />
                        </div>
                    </div>
                ) : projectList.length === 0 ? (
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
                                onPointerDown={(e) => handlePointerDown(lastProject, e)}
                                onPointerUp={handlePointerUp}
                                onPointerMove={handlePointerMove}
                                onClick={(e) => handleCardClick(lastProject.id, e)}
                                className={`relative overflow-hidden bg-secondary p-5 rounded-3xl border shadow-lg shadow-primary/5 cursor-pointer active:scale-[0.98] transition-all select-none mb-4 ${lastProject.status === 'completed' ? 'border-green-500/30 bg-green-500/5' : 'border-primary/20'}`}
                            >
                                <img
                                    src={getProjectVisual(lastProject.cover_base64, lastProject.cover_file_path)}
                                    alt=""
                                    className={`pointer-events-none ${lastProject.cover_base64 || lastProject.cover_file_path ? 'absolute inset-0 w-full h-full object-cover opacity-20' : 'absolute top-3 right-3 w-16 h-16 opacity-50'}`}
                                    onError={(event) => {
                                        const target = event.currentTarget;
                                        if (target.src.endsWith('/logo-mini.svg')) return;
                                        target.src = '/logo-mini.svg';
                                    }}
                                />
                                {(lastProject.cover_base64 || lastProject.cover_file_path) && (
                                    <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-background/40 to-background/20 pointer-events-none" />
                                )}

                                <div className="relative z-10 flex items-center gap-2 mb-3">
                                    <span className={`inline-block text-[10px] px-3 py-1 rounded-full font-bold uppercase tracking-wider ${lastProject.status === 'completed' ? 'bg-green-500/20 text-green-400' : 'bg-primary/20 text-primary'}`}>
                                        {lastProject.status === 'completed' ? 'Terminé' : 'Dernier projet'}
                                    </span>
                                    {lastProject.status === 'completed' && <CheckCircle size={14} className="text-green-400" />}
                                </div>

                                <h3 className="relative z-10 text-2xl font-bold mb-2 truncate">{lastProject.title}</h3>
                            </div>
                        )}

                        {/* Autres Projets */}
                        {otherProjects.length > 0 && (
                            <div className="grid grid-cols-2 gap-4">
                                {otherProjects.map((proj) => (
                                    <div
                                        key={proj.id}
                                        onPointerDown={(e) => handlePointerDown(proj, e)}
                                        onPointerUp={handlePointerUp}
                                        onPointerMove={handlePointerMove}
                                        onClick={(e) => handleCardClick(proj.id, e)}
                                        className={`relative p-4 rounded-xl border active:scale-[0.96] transition-transform flex flex-col justify-between h-32 bg-secondary select-none cursor-pointer ${proj.status === 'completed' ? 'border-green-500/30 bg-green-500/5' : 'border-zinc-800'}`}
                                    >
                                        {hasProjectCover(proj) && (
                                            <>
                                                <img
                                                    src={getProjectVisual(proj.cover_base64, proj.cover_file_path)}
                                                    alt=""
                                                    className="absolute inset-0 w-full h-full object-cover opacity-25 pointer-events-none"
                                                    onError={(event) => {
                                                        const target = event.currentTarget;
                                                        if (target.src.endsWith('/logo-mini.svg')) return;
                                                        target.src = '/logo-mini.svg';
                                                    }}
                                                />
                                                <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-background/50 to-background/20 pointer-events-none" />
                                            </>
                                        )}

                                        <div className={`relative z-10 w-8 h-8 rounded-full flex items-center justify-center mb-2 font-bold text-xs ${proj.status === 'completed' ? 'bg-green-500/20 text-green-400' : 'bg-zinc-800 text-zinc-500'}`}>
                                            {proj.status === 'completed' ? <CheckCircle size={14} /> : '#'}
                                        </div>
                                        <div className="relative z-10">
                                            <h4 className="font-bold text-sm truncate">{proj.title}</h4>
                                            <p className={`text-xs mt-1 ${proj.status === 'completed' ? 'text-green-400' : 'text-primary'}`}>
                                                {proj.status === 'completed' ? 'Terminé' : 'En cours'}
                                            </p>
                                        </div>
                                    </div>
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
                            onClick={handleRename}
                            isLoading={updateProjectMutation.isPending}
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
                            onClick={handleDelete}
                            isLoading={deleteProjectMutation.isPending}
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
