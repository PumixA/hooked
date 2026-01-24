import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Camera, StickyNote, Minus, Plus, Loader2, Settings, TrendingUp, ImagePlus, Eye, WifiOff } from 'lucide-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';
import Timer from '../components/features/Timer';
import Modal from '../components/ui/Modal';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import { useSafeMutation } from '../hooks/useSafeMutation'; // <--- IMPORT DU SUPER HOOK
import { useSync } from '../context/SyncContext'; // Pour savoir si on est online (photos)

interface Project {
    id: string;
    title: string;
    current_row: number;
    goal_rows?: number;
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
    const { isOnline } = useSync(); // Pour gérer l'upload photo

    // --- 1. CHARGEMENT INTELLIGENT (CACHE FIRST) ---
    // On cherche d'abord dans la liste globale si le projet existe (ex: temp-123)
    const cachedProject = queryClient.getQueryData<Project[]>(['projects'])
        ?.find((p) => p.id === id);

    const { data: project, isLoading } = useQuery({
        queryKey: ['projects', id],
        queryFn: async () => {
            const { data } = await api.get(`/projects/${id}`);
            return data as Project;
        },
        // Si on a le projet en cache (créé offline), on l'utilise direct
        initialData: cachedProject,
        // Si c'est un ID temporaire, on INTERDIT l'appel réseau
        enabled: !!id && !String(id).startsWith('temp-'),
    });

    // --- LOGIQUE TIMER ---
    const [elapsed, setElapsed] = useState(0);
    const [isActive, setIsActive] = useState(false);
    const startTimeRef = useRef<number | null>(null);
    const savedTimeRef = useRef<number>(0);
    const [sessionStartRow, setSessionStartRow] = useState<number | null>(null);

    // --- ÉTATS UI ---
    const [step, setStep] = useState(1);
    const [showNotes, setShowNotes] = useState(false);
    const [showPhotos, setShowPhotos] = useState(false);
    const [showSettings, setShowSettings] = useState(false);
    const [tempGoal, setTempGoal] = useState<string>('');

    // Init tempGoal quand le projet charge
    useEffect(() => {
        if (project?.goal_rows) setTempGoal(project.goal_rows.toString());
    }, [project]);


    // --- 2. MUTATIONS OFFLINE-READY ---

    // A. Mise à jour Projet (Compteur & Objectif)
    const updateProjectMutation = useSafeMutation({
        mutationFn: async (updates: any) => await api.patch(`/projects/${id}`, updates),
        syncType: 'UPDATE_PROJECT',
        queryKey: ['projects', id!],
        // On met aussi à jour la liste globale pour que le dashboard soit synchro
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['projects'] })
    });

    // B. Sauvegarde Session (Timer)
    const saveSessionMutation = useSafeMutation({
        mutationFn: async (sessionData: any) => await api.post('/sessions', sessionData),
        syncType: 'SAVE_SESSION',
        queryKey: ['sessions', id!]
    });

    // C. Notes (Chargement + Sauvegarde Offline)
    const [noteContent, setNoteContent] = useState('');

    // Query Notes (Seulement si vrai ID et Online, sinon faudra gérer le cache local plus tard)
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
        syncType: 'ADD_NOTE', // Attention, ton SyncContext doit gérer ADD_NOTE ou UPDATE_NOTE
        queryKey: ['notes', id!],
        onSuccess: () => {
            // alert("Note sauvegardée !"); // Optionnel, safeMutation gère déjà le fallback
            setShowNotes(false);
        }
    });

    // --- 3. MUTATION ONLINE ONLY (PHOTOS) ---
    // Les photos en Base64 dans le localStorage, c'est trop lourd.
    // On garde l'upload classique et on désactive le bouton si Offline.
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

            if (duration > 2 && project) {
                saveSessionMutation.mutate({
                    project_id: project.id,
                    start_time: new Date(start).toISOString(),
                    end_time: new Date(now).toISOString(),
                    duration_seconds: duration
                });
            }
            savedTimeRef.current = elapsed;
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

        // Optimistic Update local (pour réactivité immédiate de l'UI)
        queryClient.setQueryData(['projects', id], (old: Project) => ({
            ...old,
            current_row: newCount
        }));

        // Envoi via SafeMutation (API ou Queue)
        updateProjectMutation.mutate({
            id: project.id, // IMPORTANT: passer l'ID pour le SyncContext
            current_row: newCount
        });
    };

    const handleSaveSettings = () => {
        if (!project) return;
        const newGoal = tempGoal ? parseInt(tempGoal) : undefined;

        updateProjectMutation.mutate({
            id: project.id,
            goal_rows: newGoal
        });
        setShowSettings(false);
    };


    // --- RENDER ---

    if (isLoading && !project) {
        return (
            <div className="h-screen flex items-center justify-center bg-background text-primary">
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
        <div className="min-h-screen bg-background text-white flex flex-col px-6 py-6 animate-fade-in relative">

            {/* HEADER */}
            <div className="flex justify-between items-center mb-6">
                <button onClick={() => navigate('/')} className="flex items-center gap-2 text-zinc-400 hover:text-white transition">
                    <ArrowLeft />
                    <span className="text-sm">Retour</span>
                </button>
                <div className="flex gap-2">
                    {isOfflineProject && (
                        <span className="text-[10px] bg-orange-500/20 text-orange-400 px-2 py-1 rounded-full border border-orange-500/50 flex items-center gap-1">
                            <WifiOff size={10} /> Local
                        </span>
                    )}
                    <button onClick={() => setShowSettings(true)} className="p-2 rounded-full bg-zinc-800 text-zinc-400 hover:text-white transition">
                        <Settings size={20} />
                    </button>
                </div>
            </div>

            {/* INFO & TIMER */}
            <div className="text-center space-y-4 mb-8">
                <h1 className="text-2xl font-bold">{project.title}</h1>
                <Timer
                    elapsed={elapsed}
                    isActive={isActive}
                    onToggle={handleToggleTimer}
                    onReset={handleResetTimer}
                />
                {estimation && (
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-green-400/10 text-green-400 text-xs font-medium animate-fade-in mt-2 border border-green-400/20">
                        <TrendingUp size={12} />
                        <span>{estimation}</span>
                    </div>
                )}
            </div>

            {/* COMPTEUR */}
            <div className="flex-1 flex flex-col items-center justify-center -mt-6">
                <p className="text-zinc-500 text-sm mb-4">Rang actuel</p>
                <div className="text-[120px] font-bold leading-none tracking-tighter select-none">
                    {project.current_row}
                </div>
                {step > 1 && (
                    <div className="bg-primary/20 text-primary text-xs px-2 py-1 rounded-full mt-2 font-bold mb-2">
                        Pas : +/- {step}
                    </div>
                )}
                <div onClick={() => setShowSettings(true)} className="mt-2 text-zinc-500 flex items-center gap-2 cursor-pointer hover:text-zinc-300 transition p-2 rounded-lg hover:bg-zinc-800/50">
                    <span>sur {project.goal_rows || '?'} rangs</span>
                    <span className="text-[10px]">✎</span>
                </div>
            </div>

            {/* BOUTONS +/- */}
            <div className="flex items-center justify-center gap-8 mb-12">
                <button onClick={() => updateCounter(-1)} className="w-20 h-20 rounded-full bg-zinc-800 flex items-center justify-center text-zinc-400 shadow-lg active:scale-90 transition-transform">
                    <Minus size={32} />
                </button>
                <button onClick={() => updateCounter(1)} className="w-32 h-32 rounded-full bg-primary text-background flex items-center justify-center shadow-[0_0_30px_-5px_rgba(196,181,253,0.4)] active:scale-95 transition-transform hover:shadow-[0_0_40px_-5px_rgba(196,181,253,0.6)]">
                    <Plus size={64} />
                </button>
            </div>

            {/* ACTIONS FOOTER */}
            <div className="grid grid-cols-2 gap-4">
                <button onClick={() => setShowNotes(true)} className="flex flex-col items-center justify-center gap-2 bg-zinc-800/50 border border-zinc-700/50 p-4 rounded-2xl text-zinc-400 hover:bg-zinc-800 hover:text-white transition">
                    <StickyNote size={24} />
                    <span className="text-sm">Notes</span>
                </button>
                <button onClick={() => setShowPhotos(true)} className="flex flex-col items-center justify-center gap-2 bg-zinc-800/50 border border-zinc-700/50 p-4 rounded-2xl text-zinc-400 hover:bg-zinc-800 hover:text-white transition">
                    <Camera size={24} />
                    <span className="text-sm">Photos</span>
                </button>
            </div>

            {/* MODALE SETTINGS */}
            <Modal isOpen={showSettings} onClose={() => setShowSettings(false)} title="Réglages du projet">
                <div className="space-y-6">
                    <div className="space-y-2">
                        <label className="text-xs text-zinc-400 ml-1">Pas d'incrémentation</label>
                        <div className="flex gap-2">
                            {[1, 2, 5, 10].map((val) => (
                                <button key={val} onClick={() => setStep(val)} className={`flex-1 py-3 rounded-xl font-bold transition-all ${step === val ? 'bg-primary text-background' : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'}`}>{val}</button>
                            ))}
                        </div>
                    </div>
                    <Input label="Objectif de rangs" type="number" value={tempGoal} onChange={(e) => setTempGoal(e.target.value)} placeholder="Infini" />
                    <Button onClick={handleSaveSettings}>Enregistrer</Button>
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