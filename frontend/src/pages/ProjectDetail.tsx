import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Camera, StickyNote, Minus, Plus, Loader2, Settings, TrendingUp } from 'lucide-react';
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

export default function ProjectDetail() {
    const { id } = useParams();
    const navigate = useNavigate();

    const [project, setProject] = useState<Project | null>(null);
    const [loading, setLoading] = useState(true);

    // --- LOGIQUE TIMER & ESTIMATION (HOOK-50) ---
    // On remonte l'état du Timer ici pour avoir accès à 'elapsed' pour les calculs
    const [elapsed, setElapsed] = useState(0);
    const [isActive, setIsActive] = useState(false);
    const startTimeRef = useRef<number | null>(null);
    const savedTimeRef = useRef<number>(0);

    // Pour calculer la vitesse : on mémorise le rang au début de la session de travail
    const [sessionStartRow, setSessionStartRow] = useState<number | null>(null);

    // ÉTATS UI
    const [step, setStep] = useState(1);
    const [showNotes, setShowNotes] = useState(false);
    const [showPhotos, setShowPhotos] = useState(false);
    const [showSettings, setShowSettings] = useState(false);
    const [tempGoal, setTempGoal] = useState<string>('');

    useEffect(() => {
        fetchProject();
    }, [id]);

    // --- EFFET DU TIMER (Déplacé depuis Timer.tsx) ---
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

    // Handlers du Timer
    const handleToggleTimer = () => {
        if (isActive) {
            // PAUSE
            savedTimeRef.current = elapsed;
            setIsActive(false);
        } else {
            // PLAY
            startTimeRef.current = Date.now();
            setIsActive(true);

            // Si c'est le tout début de la session, on note à quel rang on a commencé
            // Cela servira de point de référence pour calculer la vitesse (Rangs faits / Temps)
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
        setSessionStartRow(null); // On reset la session de calcul
    };

    // --- CALCUL DE L'ESTIMATION ---
    const getEstimation = () => {
        // Conditions : Il faut un objectif, un début de session, et au moins 60s de travail pour être fiable
        if (!project?.goal_rows || elapsed < 60 || sessionStartRow === null) return null;

        const rowsDoneInSession = project.current_row - sessionStartRow;

        // Si on n'a pas avancé (ou reculé), pas d'estimation possible
        if (rowsDoneInSession <= 0) return null;

        // 1. Vitesse : Temps moyen par rang (en secondes)
        const secondsPerRow = elapsed / rowsDoneInSession;

        // 2. Reste à faire
        const rowsRemaining = project.goal_rows - project.current_row;
        if (rowsRemaining <= 0) return "Terminé ! 🎉";

        // 3. Calcul du temps total restant
        const totalSecondsRemaining = rowsRemaining * secondsPerRow;

        // 4. Formatage
        const h = Math.floor(totalSecondsRemaining / 3600);
        const m = Math.floor((totalSecondsRemaining % 3600) / 60);

        // Affichage conditionnel (si < 1m, on affiche "Moins d'une minute")
        if (h === 0 && m === 0) return "Moins d'une minute";

        return `Fin estimée dans ${h > 0 ? `${h}h ` : ''}${m}m`;
    };

    const fetchProject = async () => {
        try {
            const { data } = await api.get(`/projects/${id}`);
            setProject(data);
            if (data.goal_rows) setTempGoal(data.goal_rows.toString());
        } catch (error) {
            console.error("Erreur chargement projet", error);
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

                {/* Timer contrôlé par le parent */}
                <Timer
                    elapsed={elapsed}
                    isActive={isActive}
                    onToggle={handleToggleTimer}
                    onReset={handleResetTimer}
                />

                {/* --- AFFICHAGE DE L'ESTIMATION (HOOK-50) --- */}
                {estimation && (
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-green-400/10 text-green-400 text-xs font-medium animate-fade-in mt-2 border border-green-400/20">
                        <TrendingUp size={12} />
                        <span>{estimation}</span>
                    </div>
                )}
            </div>

            {/* Compteur Géant */}
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

            {/* Contrôles + / - */}
            <div className="flex items-center justify-center gap-8 mb-12">
                <button onClick={() => updateCounter(-1)} className="w-20 h-20 rounded-full bg-zinc-800 flex items-center justify-center text-zinc-400 shadow-lg active:scale-90 transition-transform">
                    <Minus size={32} />
                </button>
                <button onClick={() => updateCounter(1)} className="w-32 h-32 rounded-full bg-primary text-background flex items-center justify-center shadow-[0_0_30px_-5px_rgba(196,181,253,0.4)] active:scale-95 transition-transform hover:shadow-[0_0_40px_-5px_rgba(196,181,253,0.6)]">
                    <Plus size={64} />
                </button>
            </div>

            {/* Footer Buttons (Notes/Photos) */}
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

            {/* --- MODALES --- */}

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

            <Modal isOpen={showPhotos} onClose={() => setShowPhotos(false)} title="Photos">
                <div className="border-2 border-dashed border-zinc-700 rounded-xl h-32 flex flex-col items-center justify-center text-zinc-500 hover:border-zinc-500 hover:text-zinc-400 transition cursor-pointer bg-zinc-800/30">
                    <Camera size={32} className="mb-2" />
                    <span className="text-sm">Ajouter une photo</span>
                </div>
                <p className="text-center text-zinc-600 text-sm mt-4">Aucune photo pour l'instant</p>
            </Modal>
        </div>
    );
}