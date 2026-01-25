import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Camera, StickyNote, Minus, Plus, Loader2, Settings, TrendingUp, ImagePlus, WifiOff, Trash2, CheckCircle, Flag, X, ChevronLeft, ChevronRight, Check } from 'lucide-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';
import Timer from '../components/features/Timer';
import Modal from '../components/ui/Modal';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import { useSafeMutation } from '../hooks/useSafeMutation';
import { useSync } from '../context/SyncContext';

interface Project {
    id: string;
    title: string;
    current_row: number;
    goal_rows?: number;
    total_duration?: number;
    status?: string;
}

interface Photo {
    id: string;
    file_path: string;
    created_at: string;
}

// --- COMPOSANT TOAST SIMPLE ---
const Toast = ({ message, onClose }: { message: string, onClose: () => void }) => {
    useEffect(() => {
        const timer = setTimeout(onClose, 3000);
        return () => clearTimeout(timer);
    }, [onClose]);

    return (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[200] bg-zinc-800 text-white px-4 py-2 rounded-full shadow-lg border border-zinc-700 flex items-center gap-2 animate-fade-in pointer-events-none">
            <CheckCircle size={16} className="text-green-400" />
            <span className="text-sm font-medium">{message}</span>
        </div>
    );
};

export default function ProjectDetail() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const { isOnline, addToQueue } = useSync();

    // --- 1. CHARGEMENT INTELLIGENT (CACHE FIRST) ---
    const cachedProject = queryClient.getQueryData<Project[]>(['projects'])
        ?.find((p) => p.id === id);

    const { data: project, isLoading } = useQuery({
        queryKey: ['projects', id],
        queryFn: async () => {
            const { data } = await api.get(`/projects/${id}`);
            return data as Project;
        },
        initialData: cachedProject,
        enabled: !!id && !String(id).startsWith('temp-'),
    });

    // --- LOGIQUE TIMER ---
    const [elapsed, setElapsed] = useState(0);
    const [isActive, setIsActive] = useState(false);
    const startTimeRef = useRef<number | null>(null);
    const savedTimeRef = useRef<number>(0);
    const [sessionStartRow, setSessionStartRow] = useState<number | null>(null);

    useEffect(() => {
        if (project?.total_duration) {
            setElapsed(project.total_duration);
            savedTimeRef.current = project.total_duration;
        }
    }, [project?.total_duration]);

    // --- ÉTATS UI ---
    const [step, setStep] = useState(1);
    const [showNotes, setShowNotes] = useState(false);
    const [showPhotos, setShowPhotos] = useState(false);
    const [showSettings, setShowSettings] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [showFinishConfirm, setShowFinishConfirm] = useState(false);
    const [toastMessage, setToastMessage] = useState<string | null>(null);
    
    // --- ÉTATS GALERIE & SELECTION ---
    const [selectedPhotoIndex, setSelectedPhotoIndex] = useState<number | null>(null);
    const [showGallery, setShowGallery] = useState(false);
    const [photoToDelete, setPhotoToDelete] = useState<Photo | null>(null);
    
    const [isSelectionMode, setIsSelectionMode] = useState(false);
    const [selectedPhotoIds, setSelectedPhotoIds] = useState<Set<string>>(new Set());
    const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false);
    const photoLongPressTimer = useRef<NodeJS.Timeout | null>(null);

    const [tempGoal, setTempGoal] = useState<string>('');
    const [tempTitle, setTempTitle] = useState<string>('');
    const [tempTimer, setTempTimer] = useState<string>('');

    useEffect(() => {
        if (project) {
            setTempGoal(project.goal_rows ? project.goal_rows.toString() : '');
            setTempTitle(project.title);
        }
    }, [project]);

    useEffect(() => {
        if (showSettings) {
            const h = Math.floor(elapsed / 3600);
            const m = Math.floor((elapsed % 3600) / 60);
            const s = elapsed % 60;
            setTempTimer(`${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`);
        }
    }, [showSettings, elapsed]);


    // --- 2. MUTATIONS OFFLINE-READY ---
    const updateProjectMutation = useSafeMutation({
        mutationFn: async (updates: any) => await api.patch(`/projects/${id}`, updates),
        syncType: 'UPDATE_PROJECT',
        queryKey: ['projects', id!],
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['projects'] })
    });

    const deleteProjectMutation = useSafeMutation({
        mutationFn: async () => await api.delete(`/projects/${id}`),
        syncType: 'DELETE_PROJECT',
        queryKey: ['projects'],
        onSuccess: () => {
            navigate('/');
        }
    });

    const saveSessionMutation = useSafeMutation({
        mutationFn: async (sessionData: any) => await api.post('/sessions', sessionData),
        syncType: 'SAVE_SESSION',
        queryKey: ['sessions', id!]
    });

    const [noteContent, setNoteContent] = useState('');

    const { data: notesData } = useQuery({
        queryKey: ['notes', id],
        queryFn: async () => {
            if (!id || id.startsWith('temp-')) return null;
            const { data } = await api.get(`/notes?project_id=${id}`);
            return data;
        },
        enabled: showNotes && isOnline && !!id && !id.startsWith('temp-')
    });

    useEffect(() => {
        if (notesData?.content) {
            setNoteContent(notesData.content);
        }
    }, [notesData]);

    const saveNoteMutation = useSafeMutation({
        mutationFn: async () => {
            if (!project) return;
            await api.post('/notes', { project_id: project.id, content: noteContent });
        },
        syncType: 'ADD_NOTE',
        queryKey: ['notes', id!],
        onSuccess: () => setShowNotes(false)
    });

    // --- NOUVEAU : Suppression de note ---
    const deleteNoteMutation = useSafeMutation({
        mutationFn: async () => {
            if (!project) return;
            if (notesData?.id) {
                await api.delete(`/notes/${notesData.id}`);
            }
        },
        syncType: 'DELETE_NOTE',
        queryKey: ['notes', id!],
        onSuccess: () => {
            setNoteContent('');
            setShowNotes(false);
            setToastMessage("Note supprimée");
        }
    });

    const fileInputRef = useRef<HTMLInputElement>(null);

    const uploadPhotoMutation = useMutation({
        mutationFn: async (files: FileList) => {
            if (!project) throw new Error("Projet manquant");
            
            const promises = Array.from(files).map(file => {
                const formData = new FormData();
                formData.append('file', file);
                return api.post(`/photos?project_id=${project.id}`, formData, {
                    headers: { 'Content-Type': 'multipart/form-data' }
                });
            });
            
            return await Promise.all(promises);
        },
        onSuccess: (results) => {
            queryClient.invalidateQueries({ queryKey: ['photos'] });
            setToastMessage(`${results.length} photo(s) ajoutée(s) ! 📸`);
        },
        onError: () => alert("Erreur lors de l'envoi.")
    });

    // --- Suppression de photo unique ---
    const deletePhotoMutation = useMutation({
        mutationFn: async (photoId: string) => {
            await api.delete(`/photos/${photoId}`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['photos'] });
            setPhotoToDelete(null);
            if (showGallery) {
                if (photos.length <= 1) {
                    setShowGallery(false);
                } else {
                    setSelectedPhotoIndex(prev => (prev && prev >= photos.length - 1 ? prev - 1 : prev));
                }
            }
            setToastMessage("Photo supprimée");
        }
    });

    // --- Suppression multiple ---
    const deleteMultiplePhotosMutation = useMutation({
        mutationFn: async (ids: string[]) => {
            const promises = ids.map(id => api.delete(`/photos/${id}`));
            return await Promise.all(promises);
        },
        onSuccess: (results) => {
            queryClient.invalidateQueries({ queryKey: ['photos'] });
            setShowBulkDeleteConfirm(false);
            setIsSelectionMode(false);
            setSelectedPhotoIds(new Set());
            setToastMessage(`${results.length} photos supprimées`);
        },
        onError: () => alert("Erreur lors de la suppression multiple.")
    });

    const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
        const files = event.target.files;
        if (files && files.length > 0) uploadPhotoMutation.mutate(files);
    };

    const { data: photos = [] } = useQuery({
        queryKey: ['photos', id],
        queryFn: async () => {
            if (!id || id.startsWith('temp-')) return [];
            const { data } = await api.get(`/photos?project_id=${id}`);
            return data as Photo[];
        },
        enabled: showPhotos && !!id && !id.startsWith('temp-')
    });

    // --- LOGIQUE GALERIE & SELECTION ---
    const openGallery = (index: number) => {
        if (isSelectionMode) return; // Ne pas ouvrir si en mode sélection
        setSelectedPhotoIndex(index);
        setShowGallery(true);
    };

    const toggleSelection = (photoId: string) => {
        const newSet = new Set(selectedPhotoIds);
        if (newSet.has(photoId)) {
            newSet.delete(photoId);
            if (newSet.size === 0) setIsSelectionMode(false);
        } else {
            newSet.add(photoId);
        }
        setSelectedPhotoIds(newSet);
    };

    const handlePhotoPointerDown = (photoId: string) => {
        if (isSelectionMode) return;
        photoLongPressTimer.current = setTimeout(() => {
            setIsSelectionMode(true);
            setSelectedPhotoIds(new Set([photoId]));
        }, 500); // 500ms long press
    };

    const handlePhotoPointerUp = () => {
        if (photoLongPressTimer.current) {
            clearTimeout(photoLongPressTimer.current);
        }
    };

    const handlePhotoClick = (index: number, photoId: string) => {
        if (isSelectionMode) {
            toggleSelection(photoId);
        } else {
            openGallery(index);
        }
    };

    const nextPhoto = () => {
        if (selectedPhotoIndex !== null && selectedPhotoIndex < photos.length - 1) {
            setSelectedPhotoIndex(selectedPhotoIndex + 1);
        }
    };

    const prevPhoto = () => {
        if (selectedPhotoIndex !== null && selectedPhotoIndex > 0) {
            setSelectedPhotoIndex(selectedPhotoIndex - 1);
        }
    };

    // --- LOGIQUE METIER ---
    useEffect(() => {
        let interval: any = null;
        if (isActive) {
            interval = setInterval(() => {
                const now = Date.now();
                const currentSessionDuration = Math.floor((now - (startTimeRef.current || now)) / 1000);
                setElapsed(savedTimeRef.current + currentSessionDuration);
            }, 1000);
        } else {
            clearInterval(interval);
        }
        return () => clearInterval(interval);
    }, [isActive]);

    const handleToggleTimer = () => {
        if (project?.status === 'completed') return;

        if (isActive) {
            const now = Date.now();
            const start = startTimeRef.current || now;
            const duration = Math.floor((now - start) / 1000);

            if (duration > 2 && project) {
                saveSessionMutation.mutate({
                    project_id: project.id,
                    start_time: new Date(start).toISOString(),
                    end_time: new Date(now).toISOString(),
                    duration_seconds: duration
                });
            }
            savedTimeRef.current = elapsed;
            
            if (project) {
                updateProjectMutation.mutate({
                    id: project.id,
                    total_duration: elapsed
                });
            }

            setIsActive(false);
        } else {
            startTimeRef.current = Date.now();
            setIsActive(true);
            if (sessionStartRow === null && project) {
                setSessionStartRow(project.current_row);
            }
        }
    };

    const handleResetTimer = () => {
        if (project?.status === 'completed') return;

        setIsActive(false);
        setElapsed(0);
        savedTimeRef.current = 0;
        startTimeRef.current = null;
        setSessionStartRow(null);
        
        if (project) {
            updateProjectMutation.mutate({
                id: project.id,
                total_duration: 0
            });
        }
    };

    const getEstimation = () => {
        if (project?.status === 'completed') return "Projet terminé ! 🎉";
        if (!project?.goal_rows || elapsed < 60 || sessionStartRow === null) return null;
        const rowsDoneInSession = project.current_row - sessionStartRow;
        if (rowsDoneInSession <= 0) return null;
        const secondsPerRow = elapsed / rowsDoneInSession;
        const rowsRemaining = project.goal_rows - project.current_row;
        if (rowsRemaining <= 0) return "Terminé ! 🎉";
        const totalSecondsRemaining = rowsRemaining * secondsPerRow;
        const h = Math.floor(totalSecondsRemaining / 3600);
        const m = Math.floor((totalSecondsRemaining % 3600) / 60);
        if (h === 0 && m === 0) return "Moins d'une minute";
        return `Fin estimée dans ${h > 0 ? `${h}h ` : ''}${m}m`;
    };

    const updateCounter = (increment: number) => {
        if (!project || project.status === 'completed') return;
        
        const amount = increment * step;
        const newCount = Math.max(0, project.current_row + amount);

        // Vérification si objectif atteint
        let updates: any = {
            id: project.id,
            current_row: newCount
        };

        // Si on atteint l'objectif pour la première fois
        if (project.goal_rows && newCount >= project.goal_rows && project.status !== 'completed') {
            updates.status = 'completed';
            updates.end_date = new Date().toISOString();
            // On arrête le timer si actif
            if (isActive) {
                setIsActive(false);
                // On pourrait sauvegarder la session ici aussi
            }
        }

        queryClient.setQueryData(['projects', id], (old: Project) => ({
            ...old,
            ...updates
        }));

        updateProjectMutation.mutate(updates);
    };

    const handleSaveSettings = () => {
        if (!project) return;
        const newGoal = tempGoal ? parseInt(tempGoal) : null;

        const [h, m, s] = tempTimer.split(':').map(Number);
        let newElapsed = elapsed;
        
        if (!isNaN(h) && !isNaN(m) && !isNaN(s)) {
            newElapsed = h * 3600 + m * 60 + s;
            setElapsed(newElapsed);
            savedTimeRef.current = newElapsed;
            if (isActive) startTimeRef.current = Date.now();
        }

        updateProjectMutation.mutate({
            id: project.id,
            title: tempTitle,
            goal_rows: newGoal,
            total_duration: newElapsed
        });
        setShowSettings(false);
    };

    const handleDeleteProject = () => {
        if (!project) return;
        deleteProjectMutation.mutate({ id: project.id });
    };

    const handleFinishProject = () => {
        if (!project) return;
        
        if (isActive) handleToggleTimer();

        updateProjectMutation.mutate({
            id: project.id,
            status: 'completed',
            end_date: new Date().toISOString()
        });
        setShowFinishConfirm(false);
    };


    // --- RENDER ---

    if (isLoading && !project) {
        return (
            <div className="h-[100dvh] flex items-center justify-center bg-background text-primary">
                <Loader2 className="animate-spin" size={40} />
            </div>
        );
    }

    if (!project) {
        return <div className="text-white p-10">Projet introuvable</div>;
    }

    const estimation = getEstimation();
    const isOfflineProject = id?.startsWith('temp-');
    const isCompleted = project.status === 'completed';

    return (
        <div className="h-[100dvh] w-screen bg-background text-white flex flex-col animate-fade-in overflow-hidden">
            
            {/* TOAST */}
            {toastMessage && <Toast message={toastMessage} onClose={() => setToastMessage(null)} />}

            {/* 1. HEADER FIXED */}
            <div className="fixed top-0 left-0 right-0 z-20 flex justify-between items-center px-4 py-2 bg-background/95 backdrop-blur-sm h-14 border-b border-zinc-800/30">
                <button onClick={() => navigate('/')} className="flex items-center gap-1 text-zinc-400 hover:text-white transition p-2 -ml-2">
                    <ArrowLeft size={20} />
                    <span className="text-xs">Retour</span>
                </button>
                
                <h1 className="font-bold text-lg truncate text-center flex-1 px-2 flex items-center justify-center gap-2">
                    {project.title}
                    {isCompleted && <CheckCircle size={16} className="text-green-400" />}
                </h1>
                
                <div className="w-12 flex justify-end gap-2">
                    {isOfflineProject && (
                        <span className="text-[10px] bg-orange-500/20 text-orange-400 px-1 py-1 rounded-full border border-orange-500/50 flex items-center gap-1">
                            <WifiOff size={10} />
                        </span>
                    )}
                    
                    {/* Bouton Terminer (si pas fini) */}
                    {!isCompleted && (
                        <button onClick={() => setShowFinishConfirm(true)} className="p-2 rounded-full bg-zinc-800 text-green-400 hover:text-green-300 transition">
                            <Flag size={18} />
                        </button>
                    )}

                    <button onClick={() => setShowSettings(true)} className="p-2 rounded-full bg-zinc-800 text-zinc-400 hover:text-white transition">
                        <Settings size={18} />
                    </button>
                </div>
            </div>

            {/* 2. CONTENU PRINCIPAL */}
            <div className="fixed top-14 left-0 right-0 bottom-[60px] flex flex-col overflow-hidden">
                
                {/* TIMER */}
                <div className="shrink-0 flex flex-col items-center justify-center py-2 bg-background">
                    <div className={`scale-75 transition-opacity ${isCompleted ? 'opacity-50 grayscale' : ''}`}>
                        <Timer
                            elapsed={elapsed}
                            isActive={isActive}
                            onToggle={handleToggleTimer}
                            onReset={handleResetTimer}
                        />
                    </div>
                    {estimation && (
                        <div className="inline-flex items-center gap-2 px-2 py-0.5 rounded-full bg-green-400/10 text-green-400 text-[10px] font-medium animate-fade-in border border-green-400/20 -mt-1">
                            <TrendingUp size={10} />
                            <span>{estimation}</span>
                        </div>
                    )}
                </div>

                {/* COMPTEUR */}
                <div className="flex-1 flex flex-col items-center justify-center min-h-0 relative">
                    <div className={`text-[20vh] font-bold leading-none tracking-tighter select-none flex items-center justify-center transition-colors ${isCompleted ? 'text-green-400' : ''}`}>
                        {project.current_row}
                    </div>
                    
                    <div className="flex flex-col items-center gap-1 mt-1">
                        {!isCompleted && step > 1 && (
                            <div className="bg-primary/20 text-primary text-[10px] px-2 py-0.5 rounded-full font-bold">
                                Pas : +/- {step}
                            </div>
                        )}
                        
                        {project.goal_rows ? (
                            <div onClick={() => setShowSettings(true)} className="text-zinc-500 flex items-center gap-2 cursor-pointer hover:text-zinc-300 transition px-2 py-1 rounded-lg hover:bg-zinc-800/50 text-xs">
                                <span>sur {project.goal_rows} rangs</span>
                                <span className="text-[10px]">✎</span>
                            </div>
                        ) : (
                            <div className="h-5"></div>
                        )}
                    </div>
                </div>

                {/* CONTRÔLES +/- */}
                <div className={`shrink-0 flex items-center justify-center gap-8 py-3 bg-background transition-opacity ${isCompleted ? 'opacity-0 pointer-events-none' : ''}`}>
                    <button onClick={() => updateCounter(-1)} className="w-14 h-14 rounded-full bg-zinc-800 flex items-center justify-center text-zinc-400 shadow-lg active:scale-90 transition-transform">
                        <Minus size={22} />
                    </button>
                    <button onClick={() => updateCounter(1)} className="w-20 h-20 rounded-full bg-primary text-background flex items-center justify-center shadow-[0_0_30px_-5px_rgba(196,181,253,0.4)] active:scale-95 transition-transform hover:shadow-[0_0_40px_-5px_rgba(196,181,253,0.6)]">
                        <Plus size={40} />
                    </button>
                </div>

                {/* BOUTONS NOTES & PHOTOS */}
                <div className="shrink-0 bg-background border-t border-zinc-800/30 px-6 py-2">
                    <div className="grid grid-cols-2 gap-3">
                        <button onClick={() => setShowNotes(true)} className="flex flex-col items-center justify-center gap-0.5 bg-zinc-800/50 border border-zinc-700/50 rounded-xl text-zinc-400 hover:bg-zinc-800 hover:text-white transition h-12">
                            <StickyNote size={16} />
                            <span className="text-[9px]">Notes</span>
                        </button>
                        <button onClick={() => setShowPhotos(true)} className="flex flex-col items-center justify-center gap-0.5 bg-zinc-800/50 border border-zinc-700/50 rounded-xl text-zinc-400 hover:bg-zinc-800 hover:text-white transition h-12">
                            <Camera size={16} />
                            <span className="text-[9px]">Photos</span>
                        </button>
                    </div>
                </div>
            </div>

            {/* MODALE SETTINGS */}
            <Modal isOpen={showSettings} onClose={() => setShowSettings(false)} title="Réglages du projet">
                <div className="space-y-6">
                    <Input 
                        label="Nom du projet" 
                        value={tempTitle} 
                        onChange={(e) => setTempTitle(e.target.value)} 
                    />
                    
                    <div className="space-y-2">
                        <label className="text-xs text-zinc-400 ml-1">Pas d'incrémentation</label>
                        <div className="flex gap-2">
                            {[1, 2, 5, 10].map((val) => (
                                <button key={val} onClick={() => setStep(val)} className={`flex-1 py-3 rounded-xl font-bold transition-all ${step === val ? 'bg-primary text-background' : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'}`}>{val}</button>
                            ))}
                        </div>
                    </div>

                    <Input 
                        label="Objectif de rangs" 
                        type="number" 
                        value={tempGoal} 
                        onChange={(e) => setTempGoal(e.target.value)} 
                        placeholder="Infini" 
                    />

                    <Input 
                        label="Temps écoulé (HH:MM:SS)" 
                        value={tempTimer} 
                        onChange={(e) => setTempTimer(e.target.value)} 
                        placeholder="00:00:00"
                    />

                    <div className="pt-4 space-y-3">
                        <Button onClick={handleSaveSettings}>Enregistrer</Button>
                        
                        <button 
                            onClick={() => { setShowSettings(false); setShowDeleteConfirm(true); }}
                            className="w-full py-3 text-red-400 hover:bg-red-500/10 rounded-xl transition flex items-center justify-center gap-2"
                        >
                            <Trash2 size={18} /> Supprimer le projet
                        </button>
                    </div>
                </div>
            </Modal>

            {/* MODALE CONFIRMATION FIN */}
            <Modal isOpen={showFinishConfirm} onClose={() => setShowFinishConfirm(false)} title="Terminer ?">
                <div className="space-y-4 text-center">
                    <p className="text-zinc-400">
                        Bravo ! Vous avez terminé ce projet ?<br/>
                        Il sera marqué comme complété.
                    </p>
                    <div className="flex gap-3 mt-6">
                        <Button variant="secondary" onClick={() => setShowFinishConfirm(false)} className="flex-1">Annuler</Button>
                        <Button onClick={handleFinishProject} className="flex-1 bg-green-500 hover:bg-green-600 text-white">Oui, terminé !</Button>
                    </div>
                </div>
            </Modal>

            {/* MODALE SUPPRESSION */}
            <Modal isOpen={showDeleteConfirm} onClose={() => setShowDeleteConfirm(false)} title="Supprimer ?">
                <div className="space-y-4 text-center">
                    <p className="text-zinc-400">
                        Voulez-vous vraiment supprimer ce projet ?<br/>
                        Cette action est irréversible.
                    </p>
                    <div className="flex gap-3 mt-6">
                        <Button variant="secondary" onClick={() => setShowDeleteConfirm(false)} className="flex-1">Annuler</Button>
                        <Button variant="danger" onClick={handleDeleteProject} className="flex-1">Supprimer</Button>
                    </div>
                </div>
            </Modal>

            {/* MODALE NOTES */}
            <Modal isOpen={showNotes} onClose={() => setShowNotes(false)} title="Notes">
                <div className="flex flex-col h-full">
                    <textarea
                        className="flex-1 w-full bg-zinc-800/50 text-white p-4 rounded-xl resize-none focus:outline-none focus:ring-1 focus:ring-primary placeholder-zinc-600 border border-zinc-700 mb-4"
                        placeholder="Écrivez vos notes ici..."
                        value={noteContent}
                        onChange={(e) => setNoteContent(e.target.value)}
                    />
                    <div className="flex justify-between shrink-0 gap-3">
                        {notesData?.id && (
                            <button 
                                onClick={() => deleteNoteMutation.mutate()}
                                className="p-3 rounded-xl bg-red-500/10 text-red-400 hover:bg-red-500/20 transition"
                            >
                                <Trash2 size={20} />
                            </button>
                        )}
                        <Button
                            onClick={() => saveNoteMutation.mutate()}
                            isLoading={saveNoteMutation.isPending}
                            className="flex-1"
                        >
                            Sauvegarder
                        </Button>
                    </div>
                </div>
            </Modal>

            {/* MODALE PHOTOS (LISTE) */}
            <Modal isOpen={showPhotos} onClose={() => { setShowPhotos(false); setIsSelectionMode(false); setSelectedPhotoIds(new Set()); }} title={isSelectionMode ? `${selectedPhotoIds.size} sélectionnée(s)` : "Photos"}>
                <input type="file" ref={fileInputRef} onChange={handleFileSelect} accept="image/*" multiple className="hidden" />

                {/* Barre d'action en mode sélection */}
                {isSelectionMode ? (
                    <div className="flex gap-3 mb-4">
                        <button 
                            onClick={() => { setIsSelectionMode(false); setSelectedPhotoIds(new Set()); }}
                            className="flex-1 py-3 bg-zinc-800 rounded-xl text-zinc-400 font-medium"
                        >
                            Annuler
                        </button>
                        <button 
                            onClick={() => setShowBulkDeleteConfirm(true)}
                            disabled={selectedPhotoIds.size === 0}
                            className="flex-1 py-3 bg-red-500/10 text-red-400 rounded-xl font-medium flex items-center justify-center gap-2 disabled:opacity-50"
                        >
                            <Trash2 size={18} /> Supprimer
                        </button>
                    </div>
                ) : (
                    <div
                        onClick={() => isOnline && !isOfflineProject ? fileInputRef.current?.click() : alert("Les photos nécessitent une connexion pour l'instant.")}
                        className={`border-2 border-dashed border-zinc-700 rounded-xl h-24 flex flex-col items-center justify-center text-zinc-500 hover:border-zinc-500 hover:text-zinc-400 transition cursor-pointer bg-zinc-800/30 mb-6 ${(!isOnline || isOfflineProject) ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                        {uploadPhotoMutation.isPending ? (
                            <Loader2 size={24} className="animate-spin text-primary" />
                        ) : (
                            <div className="flex items-center gap-2">
                                {(!isOnline || isOfflineProject) ? <WifiOff size={20} /> : <ImagePlus size={20} />}
                                <span className="text-sm font-medium">
                                    {(!isOnline || isOfflineProject) ? "Disponible en ligne" : "Ajouter des photos"}
                                </span>
                            </div>
                        )}
                    </div>
                )}

                <div className="grid grid-cols-2 gap-3 max-h-[40vh] overflow-y-auto pr-1 scrollbar-hide select-none">
                    {photos.map((photo: Photo, index: number) => {
                        const isSelected = selectedPhotoIds.has(photo.id);
                        return (
                            <div 
                                key={photo.id} 
                                onPointerDown={() => handlePhotoPointerDown(photo.id)}
                                onPointerUp={handlePhotoPointerUp}
                                onClick={() => handlePhotoClick(index, photo.id)}
                                className={`
                                    relative aspect-square rounded-lg overflow-hidden group cursor-pointer active:scale-95 transition-all
                                    ${isSelected ? 'ring-4 ring-primary scale-95' : 'bg-zinc-800'}
                                `}
                            >
                                <img src={`http://192.168.1.96:3000${photo.file_path}`} alt="Projet" className="w-full h-full object-cover" />
                                
                                {/* Overlay de sélection */}
                                {isSelected && (
                                    <div className="absolute inset-0 bg-primary/20 flex items-center justify-center">
                                        <div className="bg-primary text-white rounded-full p-1">
                                            <Check size={24} strokeWidth={3} />
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </Modal>

            {/* MODALE GALERIE PLEIN ÉCRAN */}
            {showGallery && selectedPhotoIndex !== null && photos[selectedPhotoIndex] && (
                <div className="fixed inset-0 z-[150] bg-black flex flex-col animate-fade-in">
                    {/* Header Galerie - Z-INDEX INCREASED to 20 to be above nav zones */}
                    <div className="absolute top-0 left-0 right-0 p-4 flex justify-between items-center z-20 bg-gradient-to-b from-black/50 to-transparent pointer-events-none">
                        <button onClick={() => setShowGallery(false)} className="p-2 text-white/80 hover:text-white pointer-events-auto">
                            <X size={24} />
                        </button>
                        <span className="text-sm font-medium text-white/80">
                            {selectedPhotoIndex + 1} / {photos.length}
                        </span>
                        <button 
                            onClick={() => setPhotoToDelete(photos[selectedPhotoIndex])}
                            className="p-2 text-red-400 hover:text-red-300 pointer-events-auto"
                        >
                            <Trash2 size={20} />
                        </button>
                    </div>

                    {/* Image */}
                    <div className="flex-1 flex items-center justify-center relative overflow-hidden">
                        {/* Zone de clic gauche - Z-INDEX 10 */}
                        <div className="absolute inset-y-0 left-0 w-1/4 z-10" onClick={prevPhoto} />
                        
                        <img 
                            src={`http://192.168.1.96:3000${photos[selectedPhotoIndex].file_path}`} 
                            alt="Galerie" 
                            className="max-w-full max-h-full object-contain"
                        />

                        {/* Zone de clic droit - Z-INDEX 10 */}
                        <div className="absolute inset-y-0 right-0 w-1/4 z-10" onClick={nextPhoto} />

                        {/* Flèches de navigation (visibles sur desktop ou grand écran) */}
                        {selectedPhotoIndex > 0 && (
                            <button onClick={prevPhoto} className="absolute left-4 p-2 bg-black/30 rounded-full text-white/80 hover:bg-black/50 pointer-events-none md:pointer-events-auto z-20">
                                <ChevronLeft size={32} />
                            </button>
                        )}
                        {selectedPhotoIndex < photos.length - 1 && (
                            <button onClick={nextPhoto} className="absolute right-4 p-2 bg-black/30 rounded-full text-white/80 hover:bg-black/50 pointer-events-none md:pointer-events-auto z-20">
                                <ChevronRight size={32} />
                            </button>
                        )}
                    </div>
                </div>
            )}

            {/* MODALE CONFIRMATION SUPPRESSION PHOTO UNIQUE */}
            <Modal isOpen={!!photoToDelete} onClose={() => setPhotoToDelete(null)} title="Supprimer la photo ?" zIndex={200}>
                <div className="space-y-4 text-center">
                    <p className="text-zinc-400">
                        Cette photo sera définitivement supprimée.
                    </p>
                    <div className="flex gap-3 mt-6">
                        <Button variant="secondary" onClick={() => setPhotoToDelete(null)} className="flex-1">Annuler</Button>
                        <Button 
                            variant="danger" 
                            onClick={() => photoToDelete && deletePhotoMutation.mutate(photoToDelete.id)} 
                            className="flex-1"
                        >
                            Supprimer
                        </Button>
                    </div>
                </div>
            </Modal>

            {/* MODALE CONFIRMATION SUPPRESSION MULTIPLE */}
            <Modal isOpen={showBulkDeleteConfirm} onClose={() => setShowBulkDeleteConfirm(false)} title="Supprimer la sélection ?" zIndex={200}>
                <div className="space-y-4 text-center">
                    <p className="text-zinc-400">
                        Vous allez supprimer <strong>{selectedPhotoIds.size}</strong> photo(s).<br/>
                        Cette action est irréversible.
                    </p>
                    <div className="flex gap-3 mt-6">
                        <Button variant="secondary" onClick={() => setShowBulkDeleteConfirm(false)} className="flex-1">Annuler</Button>
                        <Button 
                            variant="danger" 
                            onClick={() => deleteMultiplePhotosMutation.mutate(Array.from(selectedPhotoIds))} 
                            className="flex-1"
                        >
                            Supprimer tout
                        </Button>
                    </div>
                </div>
            </Modal>
        </div>
    );
}