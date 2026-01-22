import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import api from '../services/api';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';

export default function ProjectCreate() {
    const navigate = useNavigate();
    const [isLoading, setIsLoading] = useState(false);

    // États du formulaire
    const [title, setTitle] = useState('');
    const [goalRows, setGoalRows] = useState('');
    const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

    // Données statiques pour l'UI
    const categories = ["Pull", "Bonnet", "Echarpe", "Couverture", "Gants", "Sac", "Amigurumi", "Autre"];
    const hookSizes = ["2.0mm", "2.5mm", "3.0mm", "3.5mm", "4.0mm", "4.5mm", "5.0mm", "5.5mm", "6.0mm"];

    const handleSubmit = async (e?: React.FormEvent) => {
        // Empêcher le rechargement si déclenché par le formulaire
        if (e) e.preventDefault();

        if (!title) return;
        setIsLoading(true);

        try {
            // CORRECTION ICI : Si goalRows est vide, on envoie undefined (le champ sera absent du JSON)
            // Plutôt que null (qui peut être rejeté par le backend qui attend un entier)
            const payload = {
                title,
                goal_rows: goalRows ? parseInt(goalRows) : undefined,
            };

            await api.post('/projects', payload);

            // Succès -> Retour au Dashboard
            navigate('/');
        } catch (error) {
            console.error("Erreur création", error);
            // On pourrait afficher un toast d'erreur ici plus tard
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-background p-4 text-white animate-fade-in pb-20">

            {/* Header avec bouton Retour */}
            <div className="flex items-center gap-4 mb-8">
                <button onClick={() => navigate(-1)} className="text-zinc-400 hover:text-white transition">
                    <ArrowLeft />
                </button>
                <span className="text-zinc-400 text-sm">Retour</span>
            </div>

            <h1 className="text-3xl font-bold mb-2">Nouveau projet</h1>
            <p className="text-zinc-500 mb-8">Créez un nouveau projet de crochet</p>

            {/* On encapsule dans <form> pour gérer la touche "Entrée" sur clavier mobile */}
            <form onSubmit={handleSubmit} className="space-y-6">

                {/* 1. Nom du projet */}
                <Input
                    label="Nom du projet *"
                    placeholder="Mon super projet..."
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    required // HTML5 validation visuelle
                />

                {/* 2. Catégories (Chips) */}
                <div className="space-y-2">
                    <label className="text-xs text-zinc-400 ml-1">Catégorie</label>
                    <div className="flex flex-wrap gap-2">
                        {categories.map((cat) => (
                            <button
                                key={cat}
                                type="button" // Important pour ne pas submit le form
                                onClick={() => setSelectedCategory(cat)}
                                className={`px-4 py-2 rounded-full text-sm font-medium border transition-all ${
                                    selectedCategory === cat
                                        ? "bg-secondary border-primary text-white shadow-[0_0_10px_-3px_rgba(196,181,253,0.5)]"
                                        : "bg-zinc-800/50 border-zinc-700 text-zinc-400 hover:border-zinc-500"
                                }`}
                            >
                                {cat}
                            </button>
                        ))}
                    </div>
                </div>

                {/* 3. Taille du crochet (Select stylisé) */}
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
                        disabled={!title}
                    >
                        Commencer le projet
                    </Button>
                </div>

            </form>
        </div>
    );
}