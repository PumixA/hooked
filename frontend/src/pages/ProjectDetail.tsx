import { useCallback, useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Camera, StickyNote, Minus, Plus, Loader2, Settings, TrendingUp, ImagePlus, Trash2, CheckCircle, Flag, X, ChevronLeft, ChevronRight, Check, Package, RotateCcw } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import Timer from '../components/features/Timer';
import Modal from '../components/ui/Modal';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import { resolveServerFilePath } from '../services/media';
import {
    clearProjectCounterNotification,
    requestNotificationPermission,
    showProjectCounterNotification
} from '../services/lockscreenNotifications';
import {
    useProject,
    useUpdateProject,
    useDeleteProject,
    useNote,
    useSaveNote,
    useDeleteNote,
    usePhotos,
    useUploadPhoto,
    useDeletePhoto,
    useSaveSession,
    useMaterials
} from '../hooks/useOfflineData';
import { useProjectTimer } from '../hooks/useProjectTimer';

interface Photo {
    id: string;
    file_path?: string;
    created_at: string;
    _isLocal?: boolean;
    base64?: string;
}

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

    // OFFLINE-FIRST: Utilisation des hooks locaux
    const { data: project, isLoading } = useProject(id);
    const { data: noteData } = useNote(id);
    const { data: photos = [] } = usePhotos(id);
    const { data: allMaterials = [] } = useMaterials();

    const updateProjectMutation = useUpdateProject();
    const deleteProjectMutation = useDeleteProject();
    const saveNoteMutation = useSaveNote();
    const deleteNoteMutation = useDeleteNote();
    const uploadPhotoMutation = useUploadPhoto();
    const deletePhotoMutation = useDeletePhoto();
    const saveSessionMutation = useSaveSession();

    const saveDuration = useCallback((seconds: number) => {
        if (!id) return;
        updateProjectMutation.mutate({
            id,
            total_duration: seconds
        });
    }, [id, updateProjectMutation]);

    const saveSession = useCallback((payload: { project_id: string; start_time: string; end_time: string; duration_seconds: number }) => {
        saveSessionMutation.mutate(payload);
    }, [saveSessionMutation]);

    const {
        elapsed,
        isActive,
        sessionStartRow,
        toggleTimer: handleToggleTimer,
        resetTimer: handleResetTimer,
        setElapsedFromSettings,
    } = useProjectTimer({
        projectId: id,
        projectStatus: project?.status,
        currentRow: project?.current_row,
        initialTotalDuration: project?.total_duration,
        onSaveDuration: saveDuration,
        onSaveSession: saveSession,
    });

    const [step, setStep] = useState(1);
    const [showNotes, setShowNotes] = useState(false);
    const [showPhotos, setShowPhotos] = useState(false);
    const [showSettings, setShowSettings] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [showFinishConfirm, setShowFinishConfirm] = useState(false);
    const [showResumeConfirm, setShowResumeConfirm] = useState(false);
    const [toastMessage, setToastMessage] = useState<string | null>(null);

    const [selectedPhotoIndex, setSelectedPhotoIndex] = useState<number | null>(null);
    const [showGallery, setShowGallery] = useState(false);
    const [photoToDelete, setPhotoToDelete] = useState<Photo | null>(null);

    const [isSelectionMode, setIsSelectionMode] = useState(false);
    const [selectedPhotoIds, setSelectedPhotoIds] = useState<Set<string>>(new Set());
    const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false);
    const [showMaterials, setShowMaterials] = useState(false);
    const [selectedMaterialIds, setSelectedMaterialIds] = useState<string[]>([]);
    const photoLongPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const notificationPermissionRequestedRef = useRef(false);
    const notificationWasActiveRef = useRef(false);

    const [tempGoal, setTempGoal] = useState<string>('');
    const [tempTitle, setTempTitle] = useState<string>('');
    const [tempTimer, setTempTimer] = useState<string>('');
    const [noteContent, setNoteContent] = useState('');
    const [coverPreview, setCoverPreview] = useState<string>('/logo-mini.svg');

    useEffect(() => {
        if (project) {
            setTempGoal(project.goal_rows ? project.goal_rows.toString() : '');
            setTempTitle(project.title);
            setSelectedMaterialIds(project.material_ids || []);
            setCoverPreview(project.cover_base64 || resolveServerFilePath(project.cover_file_path) || '/logo-mini.svg');
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

    useEffect(() => {
        if (noteData?.content) {
            setNoteContent(noteData.content);
        }
    }, [noteData]);

    const fileInputRef = useRef<HTMLInputElement>(null);
    const coverInputRef = useRef<HTMLInputElement>(null);

    const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
        const files = event.target.files;
        if (files && files.length > 0 && id) {
            Array.from(files).forEach(file => {
                uploadPhotoMutation.mutate(
                    { project_id: id, file },
                    {
                        onSuccess: () => setToastMessage('Photo ajoutée !')
                    }
                );
            });
        }
    };

    const handleCoverFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file || !id) return;

        const reader = new FileReader();
        reader.onload = () => {
            const base64 = reader.result as string;
            setCoverPreview(base64);
            updateProjectMutation.mutate({
                id,
                cover_base64: base64,
                cover_sync_status: 'pending'
            });
            setToastMessage('Photo de couverture mise à jour');
        };
        reader.readAsDataURL(file);
    };

    const handleRemoveCover = () => {
        if (!id) return;

        setCoverPreview('/logo-mini.svg');
        updateProjectMutation.mutate({
            id,
            cover_base64: undefined,
            cover_file_path: undefined,
            cover_sync_status: 'pending'
        });
        setToastMessage('Couverture supprimée');
    };

    const openGallery = (index: number) => {
        if (isSelectionMode) return;
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
        }, 500);
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

    const getEstimation = () => {
        if (project?.status === 'completed') return "Projet terminé ! 🎉";
        if (!project?.goal_rows || elapsed < 60 || sessionStartRow === null) return null;
        const currentRow = project.current_row || 0;
        const rowsDoneInSession = currentRow - sessionStartRow;

        if (rowsDoneInSession <= 0) return null;
        const secondsPerRow = elapsed / rowsDoneInSession;
        const rowsRemaining = project.goal_rows - currentRow;
        if (rowsRemaining <= 0) return "Terminé ! 🎉";
        const totalSecondsRemaining = rowsRemaining * secondsPerRow;
        const h = Math.floor(totalSecondsRemaining / 3600);
        const m = Math.floor((totalSecondsRemaining % 3600) / 60);
        if (h === 0 && m === 0) return "Moins d'une minute";
        return `Fin estimée dans ${h > 0 ? `${h}h ` : ''}${m}m`;
    };

    const updateCounter = useCallback((increment: number) => {
        if (!project || !id || project.status === 'completed') return;

        const amount = increment * step;
        const currentRow = project.current_row || 0;
        const newCount = Math.max(0, currentRow + amount);

        const updates: { id: string; current_row: number; status?: string; end_date?: string } = {
            id,
            current_row: newCount
        };

        if (project.goal_rows && newCount >= project.goal_rows && project.status !== 'completed') {
            updates.status = 'completed';
            updates.end_date = new Date().toISOString();
        }

        // Mise à jour optimiste locale
        queryClient.setQueryData(['projects', id], (old: Record<string, unknown>) => ({
            ...old,
            ...updates
        }));

        updateProjectMutation.mutate(updates);
    }, [id, project, queryClient, step, updateProjectMutation]);

    const handleToggleTimerFromUI = useCallback(async () => {
        if (!id || !project || project.status === 'completed') return;

        if (!isActive) {
            if (!notificationPermissionRequestedRef.current) {
                notificationPermissionRequestedRef.current = true;
                const permission = await requestNotificationPermission().catch(() => 'denied' as NotificationPermission);
                if (permission !== 'granted') {
                    handleToggleTimer();
                    return;
                }
            }

            notificationWasActiveRef.current = true;
            showProjectCounterNotification({
                projectId: id,
                projectTitle: project.title,
                currentRow: project.current_row || 0,
            }).catch(console.error);
        } else {
            notificationWasActiveRef.current = false;
            clearProjectCounterNotification(id).catch(console.error);
        }

        handleToggleTimer();
    }, [handleToggleTimer, id, isActive, project]);

    useEffect(() => {
        if (!id || !project) return;

        if (!isActive) {
            if (notificationWasActiveRef.current) {
                clearProjectCounterNotification(id).catch(console.error);
            }
            notificationWasActiveRef.current = false;
            return;
        }

        if (!('Notification' in window) || Notification.permission !== 'granted') return;

        notificationWasActiveRef.current = true;

        const pushNotification = () => {
            showProjectCounterNotification({
                projectId: id,
                projectTitle: project.title,
                currentRow: project.current_row || 0,
            }).catch(console.error);
        };

        pushNotification();
        const refreshInterval = window.setInterval(pushNotification, 15000);
        return () => window.clearInterval(refreshInterval);
    }, [id, isActive, project?.title, project?.current_row]);

    useEffect(() => {
        if (!('serviceWorker' in navigator) || !id) return;

        const onServiceWorkerMessage = (event: MessageEvent) => {
            const message = event.data as { type?: string; projectId?: string } | undefined;
            if (!message || message.projectId !== id) return;

            if (message.type === 'LOCKSCREEN_INCREMENT_ROW') {
                updateCounter(1);
                setToastMessage('Rang +1 depuis notification');
                return;
            }

            if (message.type === 'LOCKSCREEN_DECREMENT_ROW') {
                updateCounter(-1);
                setToastMessage('Rang -1 depuis notification');
            }
        };

        navigator.serviceWorker.addEventListener('message', onServiceWorkerMessage);

        return () => {
            navigator.serviceWorker.removeEventListener('message', onServiceWorkerMessage);
        };
    }, [id, updateCounter]);

    const handleSaveSettings = () => {
        if (!project || !id) return;
        const newGoal = tempGoal ? parseInt(tempGoal) : undefined;

        const [h, m, s] = tempTimer.split(':').map(Number);
        let newElapsed = elapsed;

        if (!isNaN(h) && !isNaN(m) && !isNaN(s)) {
            newElapsed = h * 3600 + m * 60 + s;
            setElapsedFromSettings(newElapsed);
        }

        // Si le projet est terminé et qu'on augmente l'objectif au-delà du nombre de rangs actuel,
        // remettre automatiquement le projet en cours
        const updates: { id: string; title: string; goal_rows: number | undefined; total_duration: number; status?: string; end_date?: string | undefined } = {
            id,
            title: tempTitle,
            goal_rows: newGoal,
            total_duration: newElapsed
        };

        if (project.status === 'completed' && newGoal && newGoal > (project.current_row || 0)) {
            updates.status = 'in_progress';
            updates.end_date = undefined;
            setToastMessage("Projet repris automatiquement !");
        }

        updateProjectMutation.mutate(updates);
        setShowSettings(false);
    };

    const handleDeleteProject = () => {
        if (!project || !id) return;
        deleteProjectMutation.mutate(id, {
            onSuccess: () => navigate('/')
        });
    };

    const handleFinishProject = () => {
        if (!project || !id) return;

        if (isActive) {
            handleToggleTimerFromUI().catch(console.error);
        }

        updateProjectMutation.mutate({
            id,
            status: 'completed',
            end_date: new Date().toISOString()
        });
        setShowFinishConfirm(false);
    };

    const handleResumeProject = () => {
        if (!project || !id) return;

        updateProjectMutation.mutate({
            id,
            status: 'in_progress',
            end_date: undefined
        });
        setShowResumeConfirm(false);
        setToastMessage("Projet repris !");
    };

    // Gestion des matériaux
    const toggleMaterial = (materialId: string) => {
        setSelectedMaterialIds(prev =>
            prev.includes(materialId)
                ? prev.filter(mid => mid !== materialId)
                : [...prev, materialId]
        );
    };

    const handleSaveMaterials = () => {
        if (!id) return;
        updateProjectMutation.mutate({
            id,
            material_ids: selectedMaterialIds
        });
        setShowMaterials(false);
    };

    const getIcon = (type: string) => {
        switch(type) {
            case 'hook': return '🪄';
            case 'yarn': return '🧶';
            case 'needle': return '🥢';
            default: return '📦';
        }
    };

    // Matériaux liés au projet
    const projectMaterials = allMaterials.filter(m => selectedMaterialIds.includes(m.id));

    const handleSaveNote = () => {
        if (!id) return;
        saveNoteMutation.mutate(
            { project_id: id, content: noteContent },
            { onSuccess: () => setShowNotes(false) }
        );
    };

    const handleDeleteNote = () => {
        if (!noteData?.id || !id) return;
        deleteNoteMutation.mutate(
            { id: noteData.id, project_id: id },
            {
                onSuccess: () => {
                    setNoteContent('');
                    setShowNotes(false);
                    setToastMessage("Note supprimée");
                }
            }
        );
    };

    const handleDeletePhoto = (photoId: string) => {
        if (!id) return;
        deletePhotoMutation.mutate(
            { id: photoId, project_id: id },
            {
                onSuccess: () => {
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
            }
        );
    };

    const handleBulkDeletePhotos = () => {
        if (!id) return;
        selectedPhotoIds.forEach(photoId => {
            deletePhotoMutation.mutate({ id: photoId, project_id: id });
        });
        setShowBulkDeleteConfirm(false);
        setIsSelectionMode(false);
        setSelectedPhotoIds(new Set());
        setToastMessage(`${selectedPhotoIds.size} photos supprimées`);
    };

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
    const isCompleted = project.status === 'completed';
    const currentRowDisplay = project.current_row || 0;

    return (
        <div className="h-[100dvh] w-screen bg-background text-white flex flex-col animate-fade-in overflow-hidden">

            {toastMessage && <Toast message={toastMessage} onClose={() => setToastMessage(null)} />}

            <div className="fixed top-0 left-0 right-0 z-20 flex justify-between items-center px-4 py-2 bg-background/95 backdrop-blur-sm h-14 border-b border-zinc-800/30">
                <button onClick={() => navigate('/')} className="flex items-center gap-1 text-zinc-400 hover:text-white transition p-2 -ml-2">
                    <ArrowLeft size={20} />
                    <span className="text-xs">Retour</span>
                </button>

                <h1 className="font-bold text-lg truncate text-center flex-1 px-2 flex items-center justify-center gap-2">
                    {project.title}
                    {isCompleted && <CheckCircle size={16} className="text-green-400" />}
                </h1>

                <div className="flex justify-end gap-1">
                    {isCompleted ? (
                        <button onClick={() => setShowResumeConfirm(true)} className="p-2 rounded-full bg-zinc-800 text-amber-400 hover:text-amber-300 transition">
                            <RotateCcw size={18} />
                        </button>
                    ) : (
                        <button onClick={() => setShowFinishConfirm(true)} className="p-2 rounded-full bg-zinc-800 text-green-400 hover:text-green-300 transition">
                            <Flag size={18} />
                        </button>
                    )}

                    <button onClick={() => setShowSettings(true)} className="p-2 rounded-full bg-zinc-800 text-zinc-400 hover:text-white transition">
                        <Settings size={18} />
                    </button>
                </div>
            </div>

            <div className="fixed top-14 left-0 right-0 bottom-[60px] flex flex-col overflow-hidden">

                <div className="shrink-0 flex flex-col items-center justify-center py-2 bg-background">
                    <div className={`scale-75 transition-opacity ${isCompleted ? 'opacity-50 grayscale' : ''}`}>
                        <Timer
                            elapsed={elapsed}
                            isActive={isActive}
                            onToggle={handleToggleTimerFromUI}
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

                <div className="flex-1 flex flex-col items-center justify-center min-h-0 relative">
                    <div className={`text-[20vh] font-bold leading-none tracking-tighter select-none flex items-center justify-center transition-colors ${isCompleted ? 'text-green-400' : ''}`}>
                        {currentRowDisplay}
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

                <div className={`shrink-0 flex items-center justify-center gap-8 py-3 bg-background transition-opacity ${isCompleted ? 'opacity-0 pointer-events-none' : ''}`}>
                    <button onClick={() => updateCounter(-1)} className="w-14 h-14 rounded-full bg-zinc-800 flex items-center justify-center text-zinc-400 shadow-lg active:scale-90 transition-transform">
                        <Minus size={22} />
                    </button>
                    <button onClick={() => updateCounter(1)} className="w-20 h-20 rounded-full bg-primary text-background flex items-center justify-center shadow-[0_0_30px_-5px_rgba(196,181,253,0.4)] active:scale-95 transition-transform hover:shadow-[0_0_40px_-5px_rgba(196,181,253,0.6)]">
                        <Plus size={40} />
                    </button>
                </div>

                <div className="shrink-0 bg-background border-t border-zinc-800/30 px-6 py-2">
                    <div className="grid grid-cols-3 gap-3">
                        <button onClick={() => setShowNotes(true)} className="flex flex-col items-center justify-center gap-0.5 bg-zinc-800/50 border border-zinc-700/50 rounded-xl text-zinc-400 hover:bg-zinc-800 hover:text-white transition h-12">
                            <StickyNote size={16} />
                            <span className="text-[9px]">Notes</span>
                        </button>
                        <button onClick={() => setShowPhotos(true)} className="flex flex-col items-center justify-center gap-0.5 bg-zinc-800/50 border border-zinc-700/50 rounded-xl text-zinc-400 hover:bg-zinc-800 hover:text-white transition h-12">
                            <Camera size={16} />
                            <span className="text-[9px]">Photos</span>
                        </button>
                        <button onClick={() => setShowMaterials(true)} className="flex flex-col items-center justify-center gap-0.5 bg-zinc-800/50 border border-zinc-700/50 rounded-xl text-zinc-400 hover:bg-zinc-800 hover:text-white transition h-12 relative">
                            <Package size={16} />
                            <span className="text-[9px]">Matériaux</span>
                            {projectMaterials.length > 0 && (
                                <span className="absolute -top-1 -right-1 w-4 h-4 bg-primary text-background text-[8px] font-bold rounded-full flex items-center justify-center">
                                    {projectMaterials.length}
                                </span>
                            )}
                        </button>
                    </div>
                </div>
            </div>

            {/* MODALS */}
            <Modal isOpen={showSettings} onClose={() => setShowSettings(false)} title="Réglages du projet">
                <div className="space-y-6">
                    <input
                        type="file"
                        ref={coverInputRef}
                        onChange={handleCoverFileSelect}
                        accept="image/*"
                        className="hidden"
                    />

                    <Input label="Nom du projet" value={tempTitle} onChange={(e) => setTempTitle(e.target.value)} />

                    <div className="space-y-2">
                        <label className="text-xs text-zinc-400 ml-1">Pas d'incrémentation</label>
                        <div className="flex gap-2">
                            {[1, 2, 5, 10].map((val) => (
                                <button key={val} onClick={() => setStep(val)} className={`flex-1 py-3 rounded-xl font-bold transition-all ${step === val ? 'bg-primary text-background' : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'}`}>{val}</button>
                            ))}
                        </div>
                    </div>

                    <Input label="Objectif de rangs" type="number" value={tempGoal} onChange={(e) => setTempGoal(e.target.value)} placeholder="Infini" />
                    <Input label="Temps écoulé (HH:MM:SS)" value={tempTimer} onChange={(e) => setTempTimer(e.target.value)} placeholder="00:00:00" />

                    <div className="space-y-3">
                        <label className="text-xs text-zinc-400 ml-1">Photo de couverture</label>
                        <div className="rounded-xl border border-zinc-700 bg-zinc-800/40 p-3">
                            <div className="w-full aspect-[16/9] rounded-lg overflow-hidden bg-zinc-900 mb-3">
                                <img
                                    src={coverPreview || '/logo-mini.svg'}
                                    alt="Couverture du projet"
                                    className="w-full h-full object-cover"
                                    onError={(event) => {
                                        event.currentTarget.src = '/logo-mini.svg';
                                    }}
                                />
                            </div>
                            <div className="flex gap-2">
                                <Button variant="secondary" onClick={() => coverInputRef.current?.click()} className="flex-1">
                                    Changer la couverture
                                </Button>
                                <button
                                    type="button"
                                    onClick={handleRemoveCover}
                                    className="px-4 rounded-xl bg-red-500/10 text-red-400 hover:bg-red-500/20 transition"
                                >
                                    Retirer
                                </button>
                            </div>
                            <p className="text-[11px] text-zinc-500 mt-2">
                                Par défaut, le logo de l&apos;app est affiché.
                            </p>
                        </div>
                    </div>

                    <div className="pt-4 space-y-3">
                        <Button onClick={handleSaveSettings}>Enregistrer</Button>
                        <button onClick={() => { setShowSettings(false); setShowDeleteConfirm(true); }} className="w-full py-3 text-red-400 hover:bg-red-500/10 rounded-xl transition flex items-center justify-center gap-2">
                            <Trash2 size={18} /> Supprimer le projet
                        </button>
                    </div>
                </div>
            </Modal>

            <Modal isOpen={showFinishConfirm} onClose={() => setShowFinishConfirm(false)} title="Terminer ?">
                <div className="space-y-4 text-center">
                    <p className="text-zinc-400">Bravo ! Vous avez terminé ce projet ?<br/>Il sera marqué comme complété.</p>
                    <div className="flex gap-3 mt-6">
                        <Button variant="secondary" onClick={() => setShowFinishConfirm(false)} className="flex-1">Annuler</Button>
                        <Button onClick={handleFinishProject} className="flex-1 bg-green-500 hover:bg-green-600 text-white">Oui, terminé !</Button>
                    </div>
                </div>
            </Modal>

            <Modal isOpen={showResumeConfirm} onClose={() => setShowResumeConfirm(false)} title="Reprendre le projet ?">
                <div className="space-y-4 text-center">
                    <p className="text-zinc-400">Ce projet sera remis en cours.<br/>Vous pourrez continuer à ajouter des rangs.</p>
                    <div className="flex gap-3 mt-6">
                        <Button variant="secondary" onClick={() => setShowResumeConfirm(false)} className="flex-1">Annuler</Button>
                        <Button onClick={handleResumeProject} className="flex-1 bg-amber-500 hover:bg-amber-600 text-white">Reprendre</Button>
                    </div>
                </div>
            </Modal>

            <Modal isOpen={showDeleteConfirm} onClose={() => setShowDeleteConfirm(false)} title="Supprimer ?">
                <div className="space-y-4 text-center">
                    <p className="text-zinc-400">Voulez-vous vraiment supprimer ce projet ?<br/>Cette action est irréversible.</p>
                    <div className="flex gap-3 mt-6">
                        <Button variant="secondary" onClick={() => setShowDeleteConfirm(false)} className="flex-1">Annuler</Button>
                        <Button variant="danger" onClick={handleDeleteProject} className="flex-1">Supprimer</Button>
                    </div>
                </div>
            </Modal>

            <Modal isOpen={showNotes} onClose={() => setShowNotes(false)} title="Notes">
                <div className="flex flex-col h-full">
                    <textarea
                        className="flex-1 w-full bg-zinc-800/50 text-white p-4 rounded-xl resize-none focus:outline-none focus:ring-1 focus:ring-primary placeholder-zinc-600 border border-zinc-700 mb-4"
                        placeholder="Écrivez vos notes ici..."
                        value={noteContent}
                        onChange={(e) => setNoteContent(e.target.value)}
                    />
                    <div className="flex justify-between shrink-0 gap-3">
                        {noteData?.id && (
                            <button onClick={handleDeleteNote} className="p-3 rounded-xl bg-red-500/10 text-red-400 hover:bg-red-500/20 transition">
                                <Trash2 size={20} />
                            </button>
                        )}
                        <Button onClick={handleSaveNote} isLoading={saveNoteMutation.isPending} className="flex-1">Sauvegarder</Button>
                    </div>
                </div>
            </Modal>

            <Modal isOpen={showPhotos} onClose={() => { setShowPhotos(false); setIsSelectionMode(false); setSelectedPhotoIds(new Set()); }} title={isSelectionMode ? `${selectedPhotoIds.size} sélectionnée(s)` : "Photos"}>
                <input type="file" ref={fileInputRef} onChange={handleFileSelect} accept="image/*" multiple className="hidden" />

                {isSelectionMode ? (
                    <div className="flex gap-3 mb-4">
                        <button onClick={() => { setIsSelectionMode(false); setSelectedPhotoIds(new Set()); }} className="flex-1 py-3 bg-zinc-800 rounded-xl text-zinc-400 font-medium">Annuler</button>
                        <button onClick={() => setShowBulkDeleteConfirm(true)} disabled={selectedPhotoIds.size === 0} className="flex-1 py-3 bg-red-500/10 text-red-400 rounded-xl font-medium flex items-center justify-center gap-2 disabled:opacity-50"><Trash2 size={18} /> Supprimer</button>
                    </div>
                ) : (
                    <div
                        onClick={() => fileInputRef.current?.click()}
                        className="border-2 border-dashed border-zinc-700 rounded-xl h-24 flex flex-col items-center justify-center text-zinc-500 hover:border-zinc-500 hover:text-zinc-400 transition cursor-pointer bg-zinc-800/30 mb-6"
                    >
                        {uploadPhotoMutation.isPending ? (
                            <Loader2 size={24} className="animate-spin text-primary" />
                        ) : (
                            <div className="flex items-center gap-2">
                                <ImagePlus size={20} />
                                <span className="text-sm font-medium">Ajouter des photos</span>
                            </div>
                        )}
                    </div>
                )}

                <div className="grid grid-cols-2 gap-3 max-h-[40vh] overflow-y-auto pr-1 scrollbar-hide select-none">
                    {photos.map((photo: Photo, index: number) => {
                        const isSelected = selectedPhotoIds.has(photo.id);
                        const imgSrc = photo._isLocal && photo.base64 ? photo.base64 : resolveServerFilePath(photo.file_path);
                        return (
                            <div
                                key={photo.id}
                                onPointerDown={() => handlePhotoPointerDown(photo.id)}
                                onPointerUp={handlePhotoPointerUp}
                                onClick={() => handlePhotoClick(index, photo.id)}
                                className={`relative aspect-square rounded-lg overflow-hidden group cursor-pointer active:scale-95 transition-all ${isSelected ? 'ring-4 ring-primary scale-95' : 'bg-zinc-800'}`}
                            >
                                <img src={imgSrc} alt="Projet" className="w-full h-full object-cover" />
                                {isSelected && (
                                    <div className="absolute inset-0 bg-primary/20 flex items-center justify-center">
                                        <div className="bg-primary text-white rounded-full p-1"><Check size={24} strokeWidth={3} /></div>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </Modal>

            {showGallery && selectedPhotoIndex !== null && photos[selectedPhotoIndex] && (
                <div className="fixed inset-0 z-[150] bg-black flex flex-col animate-fade-in">
                    <div className="absolute top-0 left-0 right-0 p-4 flex justify-between items-center z-20 bg-gradient-to-b from-black/50 to-transparent pointer-events-none">
                        <button onClick={() => setShowGallery(false)} className="p-2 text-white/80 hover:text-white pointer-events-auto"><X size={24} /></button>
                        <span className="text-sm font-medium text-white/80">{selectedPhotoIndex + 1} / {photos.length}</span>
                        <button onClick={() => setPhotoToDelete(photos[selectedPhotoIndex])} className="p-2 text-red-400 hover:text-red-300 pointer-events-auto"><Trash2 size={20} /></button>
                    </div>

                    <div className="flex-1 flex items-center justify-center relative overflow-hidden">
                        <div className="absolute inset-y-0 left-0 w-1/4 z-10" onClick={prevPhoto} />
                        <img
                            src={photos[selectedPhotoIndex]._isLocal && photos[selectedPhotoIndex].base64 ? photos[selectedPhotoIndex].base64 : resolveServerFilePath(photos[selectedPhotoIndex].file_path)}
                            alt="Galerie"
                            className="max-w-full max-h-full object-contain"
                        />
                        <div className="absolute inset-y-0 right-0 w-1/4 z-10" onClick={nextPhoto} />

                        {selectedPhotoIndex > 0 && <button onClick={prevPhoto} className="absolute left-4 p-2 bg-black/30 rounded-full text-white/80 hover:bg-black/50 pointer-events-none md:pointer-events-auto z-20"><ChevronLeft size={32} /></button>}
                        {selectedPhotoIndex < photos.length - 1 && <button onClick={nextPhoto} className="absolute right-4 p-2 bg-black/30 rounded-full text-white/80 hover:bg-black/50 pointer-events-none md:pointer-events-auto z-20"><ChevronRight size={32} /></button>}
                    </div>
                </div>
            )}

            <Modal isOpen={!!photoToDelete} onClose={() => setPhotoToDelete(null)} title="Supprimer la photo ?" zIndex={200}>
                <div className="space-y-4 text-center">
                    <p className="text-zinc-400">Cette photo sera définitivement supprimée.</p>
                    <div className="flex gap-3 mt-6">
                        <Button variant="secondary" onClick={() => setPhotoToDelete(null)} className="flex-1">Annuler</Button>
                        <Button variant="danger" onClick={() => photoToDelete && handleDeletePhoto(photoToDelete.id)} className="flex-1">Supprimer</Button>
                    </div>
                </div>
            </Modal>

            <Modal isOpen={showBulkDeleteConfirm} onClose={() => setShowBulkDeleteConfirm(false)} title="Supprimer la sélection ?" zIndex={200}>
                <div className="space-y-4 text-center">
                    <p className="text-zinc-400">Vous allez supprimer <strong>{selectedPhotoIds.size}</strong> photo(s).<br/>Cette action est irréversible.</p>
                    <div className="flex gap-3 mt-6">
                        <Button variant="secondary" onClick={() => setShowBulkDeleteConfirm(false)} className="flex-1">Annuler</Button>
                        <Button variant="danger" onClick={handleBulkDeletePhotos} className="flex-1">Supprimer tout</Button>
                    </div>
                </div>
            </Modal>

            <Modal isOpen={showMaterials} onClose={() => setShowMaterials(false)} title="Matériaux">
                <div className="space-y-4">
                    {allMaterials.length === 0 ? (
                        <div className="text-center py-8 text-zinc-500">
                            <Package size={48} className="mx-auto mb-3 opacity-50" />
                            <p>Aucun matériel dans l'inventaire</p>
                            <p className="text-xs mt-1">Ajoutez des matériaux depuis l'inventaire</p>
                        </div>
                    ) : (
                        <>
                            <p className="text-xs text-zinc-400">Sélectionnez les matériaux utilisés pour ce projet</p>
                            <div className="flex flex-wrap gap-2 max-h-[40vh] overflow-y-auto">
                                {allMaterials.map((mat) => (
                                    <button
                                        key={mat.id}
                                        type="button"
                                        onClick={() => toggleMaterial(mat.id)}
                                        className={`px-3 py-2 rounded-xl text-sm font-medium border transition-all flex items-center gap-2 ${
                                            selectedMaterialIds.includes(mat.id)
                                                ? "bg-secondary border-primary text-white shadow-[0_0_10px_-3px_rgba(196,181,254,0.5)]"
                                                : "bg-zinc-800/50 border-zinc-700 text-zinc-400 hover:border-zinc-500 hover:bg-zinc-800"
                                        }`}
                                    >
                                        <span>{getIcon(mat.category_type)}</span>
                                        <span>{mat.name}</span>
                                    </button>
                                ))}
                            </div>
                            <Button onClick={handleSaveMaterials} className="w-full mt-4">
                                Enregistrer
                            </Button>
                        </>
                    )}
                </div>
            </Modal>
        </div>
    );
}
