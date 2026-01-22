import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Play, Camera, StickyNote, Minus, Plus, Loader2 } from 'lucide-react';
import api from '../services/api';

interface Project {
    id: string;
    title: string;
    current_row: number;
    goal_rows?: number;
}

export default function ProjectDetail() {
    const { id } = useParams(); // On récupère l'ID depuis l'URL
    const navigate = useNavigate();

    const [project, setProject] = useState<Project | null>(null);
    const [loading, setLoading] = useState(true);

    // Utiliser un "debounce" ou sauvegarde différée pourrait être mieux,
    // mais pour l'instant on fait simple : Update API à chaque clic.

    useEffect(() => {
        fetchProject();
    }, [id]);

    const fetchProject = async () => {
        try {
            const { data } = await api.get(`/projects/${id}`);
            setProject(data);
        } catch (error) {
            console.error("Erreur chargement projet", error);
            // Si projet introuvable, retour accueil
            navigate('/');
        } finally {
            setLoading(false);
        }
    };

    const updateCounter = async (increment: number) => {
        if (!project) return;

        // 1. Optimistic UI : On met à jour l'affichage TOUT DE SUITE
        const newCount = Math.max(0, project.current_row + increment); // Pas de négatif
        setProject({ ...project, current_row: newCount });

        // 2. On envoie au serveur en arrière-plan
        try {
            await api.patch(`/projects/${project.id}`, {
                current_row: newCount,
                updated_at: new Date().toISOString()
            });
        } catch (error) {
            console.error("Erreur sauvegarde compteur", error);
            // En cas d'erreur, on pourrait rollback, mais restons simple pour l'instant
        }
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
            <div className="flex justify-between items-center mb-10">
                <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-zinc-400 hover:text-white transition">
                    <ArrowLeft />
                    <span className="text-sm">Retour</span>
                </button>
                <button className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center text-zinc-400 hover:bg-zinc-700 hover:text-white transition">
                    <Play size={18} fill="currentColor" />
                </button>
            </div>

            {/* --- INFO PROJET --- */}
            <div className="text-center space-y-2 mb-12">
                <h1 className="text-2xl font-bold">{project.title}</h1>
                <div className="font-mono text-primary text-xl tracking-widest">
                    00:00:00 <span className="text-xs text-zinc-500 ml-1">✎</span>
                </div>
            </div>

            {/* --- COMPTEUR GÉANT --- */}
            <div className="flex-1 flex flex-col items-center justify-center -mt-10">
                <p className="text-zinc-500 text-sm mb-4">Rang actuel</p>
                <div className="text-[120px] font-bold leading-none tracking-tighter select-none">
                    {project.current_row}
                </div>
                <div className="mt-4 text-zinc-500 flex items-center gap-2 cursor-pointer hover:text-zinc-300">
                    <span>sur {project.goal_rows || '?'} rangs</span>
                    <span className="text-[10px]">✎</span>
                </div>
            </div>

            {/* --- CONTROLES --- */}
            <div className="flex items-center justify-center gap-8 mb-12">

                {/* Bouton MOINS */}
                <button
                    onClick={() => updateCounter(-1)}
                    className="w-20 h-20 rounded-full bg-zinc-800 flex items-center justify-center text-zinc-400 shadow-lg active:scale-90 transition-transform"
                >
                    <Minus size={32} />
                </button>

                {/* Bouton PLUS (Le gros) */}
                <button
                    onClick={() => updateCounter(1)}
                    className="w-32 h-32 rounded-full bg-primary text-background flex items-center justify-center shadow-[0_0_30px_-5px_rgba(196,181,253,0.4)] active:scale-95 transition-transform hover:shadow-[0_0_40px_-5px_rgba(196,181,253,0.6)]"
                >
                    <Plus size={64} />
                </button>

            </div>

            {/* --- BOTTOM ACTIONS --- */}
            <div className="grid grid-cols-2 gap-4">
                <button className="flex flex-col items-center justify-center gap-2 bg-zinc-800/50 border border-zinc-700/50 p-4 rounded-2xl text-zinc-400 hover:bg-zinc-800 hover:text-white transition">
                    <StickyNote size={24} />
                    <span className="text-sm">Notes</span>
                </button>
                <button className="flex flex-col items-center justify-center gap-2 bg-zinc-800/50 border border-zinc-700/50 p-4 rounded-2xl text-zinc-400 hover:bg-zinc-800 hover:text-white transition">
                    <Camera size={24} />
                    <span className="text-sm">Photos</span>
                </button>
            </div>

        </div>
    );
}