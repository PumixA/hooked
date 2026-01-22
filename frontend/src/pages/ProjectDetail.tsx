import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Camera, StickyNote, Minus, Plus, Loader2, Settings } from 'lucide-react';
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

    // ÉTATS LOCAUX
    const [step, setStep] = useState(1); // Le "Pas" par défaut est 1

    // ÉTATS POUR LES MODALES
    const [showNotes, setShowNotes] = useState(false);
    const [showPhotos, setShowPhotos] = useState(false);
    const [showSettings, setShowSettings] = useState(false); // Nouvelle modale réglages

    // État temporaire pour l'édition de l'objectif dans la modale
    const [tempGoal, setTempGoal] = useState<string>('');

    useEffect(() => {
        fetchProject();
    }, [id]);

    const fetchProject = async () => {
        try {
            const { data } = await api.get(`/projects/${id}`);
            setProject(data);
            // On initialise l'input de l'objectif
            if (data.goal_rows) setTempGoal(data.goal_rows.toString());
        } catch (error) {
            console.error("Erreur chargement projet", error);
            navigate('/');
        } finally {
            setLoading(false);
        }
    };

    // Fonction centralisée pour sauvegarder les modifs (Compteur ou Objectif)
    const saveProjectChanges = async (updates: Partial<Project>) => {
        if (!project) return;

        // 1. Optimistic UI : Mise à jour immédiate
        setProject({ ...project, ...updates });

        // 2. Envoi API
        try {
            await api.patch(`/projects/${project.id}`, {
                ...updates,
                updated_at: new Date().toISOString()
            });
        } catch (error) {
            console.error("Erreur sauvegarde", error);
        }
    };

    const updateCounter = (increment: number) => {
        if (!project) return;
        // On multiplie l'incrément (+1 ou -1) par le "Pas" (step)
        const amount = increment * step;
        const newCount = Math.max(0, project.current_row + amount);

        saveProjectChanges({ current_row: newCount });
    };

    const handleSaveSettings = () => {
        // Conversion de l'input string en nombre (ou undefined si vide)
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

    return (
        <div className="min-h-screen bg-background text-white flex flex-col px-6 py-6 animate-fade-in relative">

            {/* --- HEADER --- */}
            <div className="flex justify-between items-center mb-6">
                <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-zinc-400 hover:text-white transition">
                    <ArrowLeft />
                    <span className="text-sm">Retour</span>
                </button>

                {/* Nouveau Bouton Réglages */}
                <button
                    onClick={() => setShowSettings(true)}
                    className="p-2 rounded-full bg-zinc-800 text-zinc-400 hover:text-white transition"
                >
                    <Settings size={20} />
                </button>
            </div>

            {/* --- INFO PROJET & TIMER --- */}
            <div className="text-center space-y-4 mb-8">
                <h1 className="text-2xl font-bold">{project.title}</h1>
                <Timer />
            </div>

            {/* --- COMPTEUR GÉANT --- */}
            <div className="flex-1 flex flex-col items-center justify-center -mt-6">
                <p className="text-zinc-500 text-sm mb-4">Rang actuel</p>
                <div className="text-[120px] font-bold leading-none tracking-tighter select-none">
                    {project.current_row}
                </div>

                {/* Badge "Pas" visible seulement si > 1 */}
                {step > 1 && (
                    <div className="bg-primary/20 text-primary text-xs px-2 py-1 rounded-full mt-2 font-bold mb-2">
                        Pas : +/- {step}
                    </div>
                )}

                <div
                    onClick={() => setShowSettings(true)}
                    className="mt-2 text-zinc-500 flex items-center gap-2 cursor-pointer hover:text-zinc-300 transition p-2 rounded-lg hover:bg-zinc-800/50"
                >
                    <span>sur {project.goal_rows || '?'} rangs</span>
                    <span className="text-[10px]">✎</span>
                </div>
            </div>

            {/* --- CONTROLES --- */}
            <div className="flex items-center justify-center gap-8 mb-12">
                <button
                    onClick={() => updateCounter(-1)}
                    className="w-20 h-20 rounded-full bg-zinc-800 flex items-center justify-center text-zinc-400 shadow-lg active:scale-90 transition-transform"
                >
                    <Minus size={32} />
                </button>

                <button
                    onClick={() => updateCounter(1)}
                    className="w-32 h-32 rounded-full bg-primary text-background flex items-center justify-center shadow-[0_0_30px_-5px_rgba(196,181,253,0.4)] active:scale-95 transition-transform hover:shadow-[0_0_40px_-5px_rgba(196,181,253,0.6)]"
                >
                    <Plus size={64} />
                </button>
            </div>

            {/* --- BOTTOM ACTIONS --- */}
            <div className="grid grid-cols-2 gap-4">
                <button
                    onClick={() => setShowNotes(true)}
                    className="flex flex-col items-center justify-center gap-2 bg-zinc-800/50 border border-zinc-700/50 p-4 rounded-2xl text-zinc-400 hover:bg-zinc-800 hover:text-white transition"
                >
                    <StickyNote size={24} />
                    <span className="text-sm">Notes</span>
                </button>
                <button
                    onClick={() => setShowPhotos(true)}
                    className="flex flex-col items-center justify-center gap-2 bg-zinc-800/50 border border-zinc-700/50 p-4 rounded-2xl text-zinc-400 hover:bg-zinc-800 hover:text-white transition"
                >
                    <Camera size={24} />
                    <span className="text-sm">Photos</span>
                </button>
            </div>

            {/* --- MODALES --- */}

            {/* 1. Modale Réglages (NOUVEAU HOOK-47) */}
            <Modal isOpen={showSettings} onClose={() => setShowSettings(false)} title="Réglages du projet">
                <div className="space-y-6">

                    {/* Choix du Pas */}
                    <div className="space-y-2">
                        <label className="text-xs text-zinc-400 ml-1">Pas d'incrémentation (Boutons +/-)</label>
                        <div className="flex gap-2">
                            {[1, 2, 5, 10].map((val) => (
                                <button
                                    key={val}
                                    onClick={() => setStep(val)}
                                    className={`flex-1 py-3 rounded-xl font-bold transition-all ${
                                        step === val
                                            ? 'bg-primary text-background'
                                            : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
                                    }`}
                                >
                                    {val}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Édition de l'objectif */}
                    <Input
                        label="Objectif de rangs"
                        type="number"
                        value={tempGoal}
                        onChange={(e) => setTempGoal(e.target.value)}
                        placeholder="Infini"
                    />

                    <Button onClick={handleSaveSettings}>Enregistrer</Button>
                </div>
            </Modal>

            {/* 2. Modale Notes */}
            <Modal isOpen={showNotes} onClose={() => setShowNotes(false)} title="Notes">
                <textarea
                    className="w-full h-32 bg-transparent text-white resize-none focus:outline-none placeholder-zinc-600 border-none"
                    placeholder="Écrivez vos notes ici... Astuces, modifications du patron, rappels..."
                />
                <Button onClick={() => setShowNotes(false)} className="mt-4">Sauvegarder</Button>
            </Modal>

            {/* 3. Modale Photos */}
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