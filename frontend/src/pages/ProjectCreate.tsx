import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import { useSync } from '../context/SyncContext';
import api from '../services/api';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';

export default function ProjectCreate() {
    const navigate = useNavigate();
    const { isOnline, addToQueue } = useSync();
    const queryClient = useQueryClient();

    // États du formulaire
    const [title, setTitle] = useState('');
    const [goalRows, setGoalRows] = useState('');
    const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    // Données statiques pour l'UI
    const categories = ["Pull", "Bonnet", "Echarpe", "Couverture", "Gants", "Sac", "Amigurumi", "Autre"];
    const hookSizes = ["2.0mm", "2.5mm", "3.0mm", "3.5mm", "4.0mm", "4.5mm", "5.0mm", "5.5mm", "6.0mm"];

    const handleSubmit = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        if (!title || isLoading) return;

        console.log("📝 Soumission du formulaire");

        const payload = {
            title,
            goal_rows: goalRows ? parseInt(goalRows) : undefined,
        };

        console.log("📦 Payload:", payload);
        console.log("🔍 État connexion:", { isOnline, navigatorOnline: navigator.onLine });

        setIsLoading(true);

        try {
            // Vérifier si on est vraiment offline
            if (!isOnline || !navigator.onLine) {
                console.log("📡 MODE OFFLINE - Ajout à la queue");

                // Ajouter à la queue
                addToQueue('CREATE_PROJECT', payload);

                // Mise à jour optimiste du cache
                const tempProject = {
                    ...payload,
                    id: `temp-${Date.now()}`,
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString(),
                    completed_rows: 0,
                    isOffline: true
                };

                queryClient.setQueryData(['projects'], (oldData: any) => {
                    if (Array.isArray(oldData)) {
                        return [tempProject, ...oldData];
                    }
                    return [tempProject];
                });

                console.log("✅ Ajouté à la queue, navigation...");

                // Attendre un tout petit peu pour être sûr
                await new Promise(resolve => setTimeout(resolve, 100));

                setIsLoading(false);

                // Navigation
                navigate('/', { replace: true });

                return;
            }

            console.log("🌐 MODE ONLINE - Appel API");

            // Appel API normal
            const response = await api.post('/projects', payload);

            console.log("✅ Projet créé:", response.data);

            // Invalider le cache
            await queryClient.invalidateQueries({ queryKey: ['projects'] });

            setIsLoading(false);

            // Navigation
            navigate('/', { replace: true });

        } catch (error: any) {
            console.error("❌ Erreur:", error);

            // Vérifier si c'est une erreur réseau
            if (!error.response || error.code === 'ECONNABORTED' || error.message === 'Network Error') {
                console.log("⚠️ Erreur réseau détectée - Fallback offline");

                // Ajouter à la queue
                addToQueue('CREATE_PROJECT', payload);

                // Mise à jour optimiste
                const tempProject = {
                    ...payload,
                    id: `temp-${Date.now()}`,
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString(),
                    completed_rows: 0,
                    isOffline: true
                };

                queryClient.setQueryData(['projects'], (oldData: any) => {
                    if (Array.isArray(oldData)) {
                        return [tempProject, ...oldData];
                    }
                    return [tempProject];
                });

                setIsLoading(false);
                navigate('/', { replace: true });
            } else {
                // Erreur métier
                setIsLoading(false);
                alert("Erreur lors de la création du projet");
            }
        }
    };

    return (
        <div className="min-h-screen bg-background p-4 text-white animate-fade-in pb-20">

            {/* Header avec bouton Retour */}
            <div className="flex items-center gap-4 mb-8">
                <button
                    onClick={() => navigate(-1)}
                    className="text-zinc-400 hover:text-white transition"
                >
                    <ArrowLeft />
                </button>
                <span className="text-zinc-400 text-sm">Retour</span>
            </div>

            {/* Indicateur de statut de connexion */}
            {!isOnline && (
                <div className="mb-4 p-3 bg-yellow-900/30 border border-yellow-600/50 rounded-lg text-yellow-200 text-sm">
                    📡 Mode hors ligne - Votre projet sera synchronisé automatiquement
                </div>
            )}

            <h1 className="text-3xl font-bold mb-2">Nouveau projet</h1>
            <p className="text-zinc-500 mb-8">Créez un nouveau projet de crochet</p>

            <form onSubmit={handleSubmit} className="space-y-6">

                {/* 1. Nom du projet */}
                <Input
                    label="Nom du projet *"
                    placeholder="Mon super projet..."
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    required
                />

                {/* 2. Catégories (Chips) */}
                <div className="space-y-2">
                    <label className="text-xs text-zinc-400 ml-1">Catégorie</label>
                    <div className="flex flex-wrap gap-2">
                        {categories.map((cat) => (
                            <button
                                key={cat}
                                type="button"
                                onClick={() => setSelectedCategory(cat)}
                                className={`px-4 py-2 rounded-full text-sm font-medium border transition-all ${
                                    selectedCategory === cat
                                        ? "bg-secondary border-primary text-white shadow-[0_0_10px_-3px_rgba(196,181,254,0.5)]"
                                        : "bg-zinc-800/50 border-zinc-700 text-zinc-400 hover:border-zinc-500"
                                }`}
                            >
                                {cat}
                            </button>
                        ))}
                    </div>
                </div>

                {/* 3. Taille du crochet */}
                <div className="space-y-1">
                    <label className="text-xs text-zinc-400 ml-1">Taille du crochet</label>
                    <div className="relative">
                        <select
                            className="w-full p-4 rounded-xl bg-secondary border border-zinc-800 text-white focus:outline-none focus:border-primary appearance-none"
                            defaultValue=""
                        >
                            <option value="" disabled>Sélectionner une taille</option>
                            {hookSizes.map(size => (
                                <option key={size} value={size}>{size}</option>
                            ))}
                        </select>
                        <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-zinc-500">
                            ▼
                        </div>
                    </div>
                </div>

                {/* 4. Nombre de rangs */}
                <Input
                    label="Nombre de rangs (optionnel)"
                    type="number"
                    placeholder="Ex: 60"
                    value={goalRows}
                    onChange={(e) => setGoalRows(e.target.value)}
                />
                <p className="text-[10px] text-zinc-500 ml-1 -mt-4">
                    Laissez vide si vous ne connaissez pas encore le nombre de rangs
                </p>

                {/* Bouton d'action */}
                <div className="pt-4">
                    <Button
                        type="submit"
                        isLoading={isLoading}
                        disabled={!title || isLoading}
                    >
                        {isLoading
                            ? 'Création en cours...'
                            : isOnline
                                ? 'Commencer le projet'
                                : 'Créer hors ligne'
                        }
                    </Button>
                </div>

                {/* Debug info */}
                {process.env.NODE_ENV === 'development' && (
                    <div className="mt-4 p-2 bg-zinc-900 rounded text-xs">
                        <div>isLoading: {isLoading ? 'true' : 'false'}</div>
                        <div>isOnline: {isOnline ? 'true' : 'false'}</div>
                        <div>navigator.onLine: {navigator.onLine ? 'true' : 'false'}</div>
                    </div>
                )}

            </form>
        </div>
    );
}