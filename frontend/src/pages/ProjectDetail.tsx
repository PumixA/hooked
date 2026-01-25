import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Camera, StickyNote, Minus, Plus, Loader2, Settings, TrendingUp, ImagePlus, WifiOff, Trash2 } from 'lucide-react';
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

    // Initialisation du timer avec la durée totale venant du back
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
    
    // États pour les réglages
    const [tempGoal, setTempGoal] = useState<string>('');
    const [tempTitle, setTempTitle] = useState<string>('');
    const [tempTimer, setTempTimer] = useState<string>('');

    // Init des états temporaires quand le projet charge
    useEffect(() => {
        if (project) {
            setTempGoal(project.goal_rows ? project.goal_rows.toString() : '');
            setTempTitle(project.title);
        }
    }, [project]);

    // Init du timer temporaire quand la modale s'ouvre
    useEffect(() => {
        if (showSettings) {
            const h = Math.floor(elapsed / 3600);
            const m = Math.floor((elapsed % 3600) / 60);
            const s = elapsed % 60;
            setTempTimer(`${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`);
        }
    }, [showSettings, elapsed]);


    // --- 2. MUTATIONS OFFLINE-READY ---

    // A. Mise à jour Projet (Compteur, Objectif, Titre, Chrono)
    const updateProjectMutation = useSafeMutation({
        mutationFn: async (updates: any) => await api.patch(`/projects/${id}`, updates),
        syncType: 'UPDATE_PROJECT',
        queryKey: ['projects', id!],
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['projects'] })
    });

    // B. Suppression Projet
    const deleteProjectMutation = useSafeMutation({
        mutationFn: async () => await api.delete(`/projects/${id}`),
        syncType: 'DELETE_PROJECT',
        queryKey: ['projects'], // On invalide la liste
        onSuccess: () => {
            navigate('/');
        }
    });

    // C. Sauvegarde Session (Timer)
    const saveSessionMutation = useSafeMutation({
        mutationFn: async (sessionData: any) => await api.post('/sessions', sessionData),
        syncType: 'SAVE_SESSION',
        queryKey: ['sessions', id!]
    });

    // D. Notes
    const [noteContent, setNoteContent] = useState('');

    useQuery({
        queryKey: ['notes', id],
        queryFn: async () => {
            if (!id || id.startsWith('temp-')) return null;
            const { data } = await api.get(`/notes?project_id=${id}`);
            if (data?.content) setNoteContent(data.content);
            return data;
        },
        enabled: showNotes && isOnline && !!id && !id.startsWith('temp-')
    });

    const saveNoteMutation = useSafeMutation({
        mutationFn: async () => {
            if (!project) return;
            await api.post('/notes', { project_id: project.id, content: noteContent });
        },
        syncType: 'ADD_NOTE',
        queryKey: ['notes', id!],
        onSuccess: () => setShowNotes(false)
    });

    // --- 3. MUTATION ONLINE ONLY (PHOTOS) ---
    const fileInputRef = useRef<HTMLInputElement>(null);

    const uploadPhotoMutation = useMutation({
        mutationFn: async (file: File) => {
            if (!project) throw new Error("Projet manquant");
            const formData = new FormData();
            formData.append('file', file);
            return await api.post(`/photos?project_id=${project.id}`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['photos'] });
            alert("Photo ajoutée ! 📸");
        },
        onError: () => alert("Erreur lors de l'envoi.")
    });

    const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) uploadPhotoMutation.mutate(file);
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

    // --- LOGIQUE METIER ---

    // Timer Interval
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

    // Actions Timer
    const handleToggleTimer = () => {
        if (isActive) {
            // STOP
            const now = Date.now();
            const start = startTimeRef.current || now;
            const duration = Math.floor((now - start) / 1000);

            // 1. Sauvegarder la session (historique)
            if (duration > 2 && project) {
                saveSessionMutation.mutate({
                    project_id: project.id,
                    start_time: new Date(start).toISOString(),
                    end_time: new Date(now).toISOString(),
                    duration_seconds: duration
                });
            }

            // 2. Mettre à jour le temps total du projet
            const newTotalDuration = elapsed;
            savedTimeRef.current = newTotalDuration;
            
            if (project) {
                updateProjectMutation.mutate({
                    id: project.id,
                    total_duration: newTotalDuration
                });
            }

            setIsActive(false);
        } else {
            // START
            startTimeRef.current = Date.now();
            setIsActive(true);
            if (sessionStartRow === null && project) {
                setSessionStartRow(project.current_row);
            }
        }
    };

    const handleResetTimer = () => {
        setIsActive(false);
        setElapsed(0);
        savedTimeRef.current = 0;
        startTimeRef.current = null;
        setSessionStartRow(null);
        
        // Reset en base aussi
        if (project) {
            updateProjectMutation.mutate({
                id: project.id,
                total_duration: 0
            });
        }
    };

    // Estimation
    const getEstimation = () => {
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

    // Compteur
    const updateCounter = (increment: number) => {
        if (!project) return;
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
        }

        // Optimistic Update local
        queryClient.setQueryData(['projects', id], (old: Project) => ({
            ...old,
            ...updates
        }));

        updateProjectMutation.mutate(updates);
    };

    const handleSaveSettings = () => {
        if (!project) return;
        const newGoal = tempGoal ? parseInt(tempGoal) : null; // null pour supprimer l'objectif

        // Mise à jour du timer manuel
        const [h, m, s] = tempTimer.split(':').map(Number);
        let newElapsed = elapsed;
        
        if (!isNaN(h) && !isNaN(m) && !isNaN(s)) {
            newElapsed = h * 3600 + m * 60 + s;
            setElapsed(newElapsed);
            savedTimeRef.current = newElapsed;
            if (isActive) startTimeRef.current = Date.now(); // Reset start time pour éviter les sauts
        }

        updateProjectMutation.mutate({
            id: project.id,
            title: tempTitle,
            goal_rows: newGoal,
            total_duration: newElapsed // On sauvegarde aussi le temps modifié
        });
        setShowSettings(false);
    };

    const handleDeleteProject = () => {
        if (!project) return;
        deleteProjectMutation.mutate({ id: project.id });
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

    return (
        <div className="h-[100dvh] w-screen bg-background text-white flex flex-col animate-fade-in overflow-hidden">

            {/* 1. HEADER FIXED */}
            <div className="fixed top-0 left-0 right-0 z-20 flex justify-between items-center px-4 py-2 bg-background/95 backdrop-blur-sm h-14 border-b border-zinc-800/30">
                <button onClick={() => navigate('/')} className="flex items-center gap-1 text-zinc-400 hover:text-white transition p-2 -ml-2">
                    <ArrowLeft size={20} />
                    <span className="text-xs">Retour</span>
                </button>
                <div className="flex gap-2">
                    {isOfflineProject && (
                        <span className="text-[10px] bg-orange-500/20 text-orange-400 px-1 py-1 rounded-full border border-orange-500/50 flex items-center gap-1">
                            <WifiOff size={10} /> Local
                        </span>
                    )}
                    <button onClick={() => setShowSettings(true)} className="p-2 rounded-full bg-zinc-800 text-zinc-400 hover:text-white transition">
                        <Settings size={18} />
                    </button>
                </div>
            </div>

            {/* 2. CONTENU PRINCIPAL (entre header et menu natif) */}
            <div className="fixed top-14 left-0 right-0 bottom-[60px] flex flex-col overflow-hidden">
                
                {/* TIMER */}
                <div className="shrink-0 flex flex-col items-center justify-center py-2 bg-background">
                    <div className="scale-75">
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

                {/* COMPTEUR (Prend l'espace restant) */}
                <div className="flex-1 flex flex-col items-center justify-center min-h-0 relative">
                    <div className="text-[20vh] font-bold leading-none tracking-tighter select-none flex items-center justify-center">
                        {project.current_row}
                    </div>
                    
                    {/* Objectif + Pas */}
                    <div className="flex flex-col items-center gap-1 mt-1">
                        {step > 1 && (
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
                <div className="shrink-0 flex items-center justify-center gap-8 py-3 bg-background">
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
                <textarea
                    className="w-full h-48 bg-zinc-800/50 text-white p-4 rounded-xl resize-none focus:outline-none focus:ring-1 focus:ring-primary placeholder-zinc-600 border border-zinc-700"
                    placeholder="Écrivez vos notes ici..."
                    value={noteContent}
                    onChange={(e) => setNoteContent(e.target.value)}
                />
                <div className="mt-4 flex justify-end">
                    <Button
                        onClick={() => saveNoteMutation.mutate()}
                        isLoading={saveNoteMutation.isPending}
                    >
                        Sauvegarder
                    </Button>
                </div>
            </Modal>

            {/* MODALE PHOTOS */}
            <Modal isOpen={showPhotos} onClose={() => setShowPhotos(false)} title="Photos">
                <input type="file" ref={fileInputRef} onChange={handleFileSelect} accept="image/*" className="hidden" />

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
                                {(!isOnline || isOfflineProject) ? "Disponible en ligne" : "Ajouter une photo"}
                            </span>
                        </div>
                    )}
                </div>

                <div className="grid grid-cols-2 gap-3 max-h-[40vh] overflow-y-auto pr-1 scrollbar-hide">
                    {photos.map((photo: Photo) => (
                        <div key={photo.id} className="relative aspect-square rounded-lg overflow-hidden group bg-zinc-800">
                            <img src={`http://192.168.1.96:3000${photo.file_path}`} alt="Projet" className="w-full h-full object-cover" />
                        </div>
                    ))}
                </div>
            </Modal>
        </div>
    );
}