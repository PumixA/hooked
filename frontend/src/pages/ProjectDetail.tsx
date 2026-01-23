import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Camera, StickyNote, Minus, Plus, Loader2, Settings, TrendingUp, ImagePlus, Eye } from 'lucide-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'; // <--- AJOUT useQuery
import api from '../services/api';
import Timer from '../components/features/Timer';
import Modal from '../components/ui/Modal';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';

interface Project {
    id: string;
    title: string;
    current_row: number;
    goal_rows?: number;
}

// Interface pour les photos (HOOK-54)
interface Photo {
    id: string;
    file_path: string;
    created_at: string;
}

export default function ProjectDetail() {
    const { id } = useParams();
    const navigate = useNavigate();
    const queryClient = useQueryClient();

    const [project, setProject] = useState<Project | null>(null);
    const [loading, setLoading] = useState(true);

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

    // --- UPLOAD PHOTOS (HOOK-53) ---
    const fileInputRef = useRef<HTMLInputElement>(null);

    const uploadPhotoMutation = useMutation({
        mutationFn: async (file: File) => {
            if (!project) throw new Error("Projet manquant");

            const formData = new FormData();
            formData.append('file', file);

            // CORRECTION HEADER FASTIFY
            return await api.post(`/photos?project_id=${project.id}`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
        },
        onSuccess: () => {
            // On invalide le cache pour forcer le rechargement de la liste (HOOK-54)
            queryClient.invalidateQueries({ queryKey: ['photos'] });
            alert("Photo ajoutée ! 📸");
        },
        onError: (err) => {
            console.error("Erreur upload", err);
            alert("Erreur lors de l'envoi.");
        }
    });

    const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            uploadPhotoMutation.mutate(file);
        }
    };

    // --- RÉCUPÉRATION DES PHOTOS (HOOK-54) ---
    const { data: photos = [] } = useQuery({
        queryKey: ['photos', id], // La clé dépend de l'ID du projet
        queryFn: async () => {
            if (!id) return [];
            const { data } = await api.get(`/photos?project_id=${id}`);
            return data as Photo[];
        },
        enabled: showPhotos // On ne charge que si la modale est ouverte
    });

    useEffect(() => {
        fetchProject();
    }, [id]);

    const saveSessionMutation = useMutation({
        mutationFn: async (sessionData: any) => {
            return await api.post('/sessions', sessionData);
        },
        onError: (err) => console.error("Erreur sauvegarde session", err)
    });

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
        setIsActive(false);
        setElapsed(0);
        savedTimeRef.current = 0;
        startTimeRef.current = null;
        setSessionStartRow(null);
    };

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

    const fetchProject = async () => {
        try {
            const { data } = await api.get(`/projects/${id}`);
            setProject(data);
            if (data.goal_rows) setTempGoal(data.goal_rows.toString());
        } catch (error) {
            navigate('/');
        } finally {
            setLoading(false);
        }
    };

    const saveProjectChanges = async (updates: Partial<Project>) => {
        if (!project) return;
        setProject({ ...project, ...updates });
        try {
            await api.patch(`/projects/${project.id}`, {
                ...updates,
                updated_at: new Date().toISOString()
            });
        } catch (error) { console.error(error); }
    };

    const updateCounter = (increment: number) => {
        if (!project) return;
        const amount = increment * step;
        const newCount = Math.max(0, project.current_row + amount);
        saveProjectChanges({ current_row: newCount });
    };

    const handleSaveSettings = () => {
        const newGoal = tempGoal ? parseInt(tempGoal) : undefined;
        saveProjectChanges({ goal_rows: newGoal });
        setShowSettings(false);
    };

    if (loading || !project) {
        return (
            <div className="h-screen flex items-center justify-center bg-background text-primary">
                <Loader2 className="animate-spin" size={40} />
            </div>
        );
    }

    const estimation = getEstimation();

    return (
        <div className="min-h-screen bg-background text-white flex flex-col px-6 py-6 animate-fade-in relative">

            {/* Header */}
            <div className="flex justify-between items-center mb-6">
                <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-zinc-400 hover:text-white transition">
                    <ArrowLeft />
                    <span className="text-sm">Retour</span>
                </button>
                <button onClick={() => setShowSettings(true)} className="p-2 rounded-full bg-zinc-800 text-zinc-400 hover:text-white transition">
                    <Settings size={20} />
                </button>
            </div>

            {/* Titre & Timer */}
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

            {/* Compteur */}
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

            {/* Contrôles */}
            <div className="flex items-center justify-center gap-8 mb-12">
                <button onClick={() => updateCounter(-1)} className="w-20 h-20 rounded-full bg-zinc-800 flex items-center justify-center text-zinc-400 shadow-lg active:scale-90 transition-transform">
                    <Minus size={32} />
                </button>
                <button onClick={() => updateCounter(1)} className="w-32 h-32 rounded-full bg-primary text-background flex items-center justify-center shadow-[0_0_30px_-5px_rgba(196,181,253,0.4)] active:scale-95 transition-transform hover:shadow-[0_0_40px_-5px_rgba(196,181,253,0.6)]">
                    <Plus size={64} />
                </button>
            </div>

            {/* Footer */}
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

            <Modal isOpen={showNotes} onClose={() => setShowNotes(false)} title="Notes">
                <textarea className="w-full h-32 bg-transparent text-white resize-none focus:outline-none placeholder-zinc-600 border-none" placeholder="Écrivez vos notes ici..." />
                <Button onClick={() => setShowNotes(false)} className="mt-4">Sauvegarder</Button>
            </Modal>

            {/* --- MODALE PHOTOS (HOOK-53 & HOOK-54) --- */}
            <Modal isOpen={showPhotos} onClose={() => setShowPhotos(false)} title="Photos">

                {/* Zone Upload */}
                <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileSelect}
                    accept="image/*"
                    className="hidden"
                />

                <div
                    onClick={() => fileInputRef.current?.click()}
                    className={`border-2 border-dashed border-zinc-700 rounded-xl h-24 flex flex-col items-center justify-center text-zinc-500 hover:border-zinc-500 hover:text-zinc-400 transition cursor-pointer bg-zinc-800/30 mb-6 ${uploadPhotoMutation.isPending ? 'opacity-50 pointer-events-none' : ''}`}
                >
                    {uploadPhotoMutation.isPending ? (
                        <Loader2 size={24} className="animate-spin text-primary" />
                    ) : (
                        <div className="flex items-center gap-2">
                            <ImagePlus size={20} />
                            <span className="text-sm font-medium">Ajouter une photo</span>
                        </div>
                    )}
                </div>

                {/* Grille des photos (HOOK-54) */}
                {photos.length === 0 ? (
                    <div className="text-center text-zinc-600 py-8 text-sm">
                        Aucune photo pour l'instant.
                    </div>
                ) : (
                    <div className="grid grid-cols-2 gap-3 max-h-[40vh] overflow-y-auto pr-1 scrollbar-hide">
                        {photos.map((photo: Photo) => (
                            <div key={photo.id} className="relative aspect-square rounded-lg overflow-hidden group bg-zinc-800">
                                <img
                                    src={`http://localhost:3000${photo.file_path}`}
                                    alt="Projet"
                                    className="w-full h-full object-cover transition-transform group-hover:scale-110"
                                />
                                {/* Overlay au survol */}
                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                    <a
                                        href={`http://localhost:3000${photo.file_path}`}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="bg-white/20 p-2 rounded-full backdrop-blur-sm text-white hover:bg-white/40 transition"
                                    >
                                        <Eye size={16} />
                                    </a>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </Modal>
        </div>
    );
}