import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Loader2 } from 'lucide-react';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';
import { useCreateProject, useCategories, useMaterials } from '../hooks/useOfflineData';

export default function ProjectCreate() {
    const navigate = useNavigate();

    // États du formulaire
    const [title, setTitle] = useState('');
    const [goalRows, setGoalRows] = useState('');
    const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
    const [selectedMaterialIds, setSelectedMaterialIds] = useState<string[]>([]);

    // OFFLINE-FIRST: Utilisation des hooks locaux
    const { data: categories = [], isLoading: isLoadingCategories } = useCategories();
    const { data: materials = [], isLoading: isLoadingMaterials } = useMaterials();
    const createProjectMutation = useCreateProject();

    // Gestion de l'input numérique strict
    const handleGoalRowsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        if (value === '' || /^\d+$/.test(value)) {
            setGoalRows(value);
        }
    };

    const toggleMaterial = (materialId: string) => {
        setSelectedMaterialIds(prev =>
            prev.includes(materialId)
                ? prev.filter(id => id !== materialId)
                : [...prev, materialId]
        );
    };

    const handleSubmit = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        if (!title || createProjectMutation.isPending) return;

        createProjectMutation.mutate(
            {
                title,
                category_id: selectedCategoryId || undefined,
                goal_rows: goalRows ? parseInt(goalRows) : undefined,
                material_ids: selectedMaterialIds.length > 0 ? selectedMaterialIds : undefined,
            },
            {
                onSuccess: (project) => {
                    navigate(`/projects/${project.id}`, { replace: true });
                }
            }
        );
    };

    // Helpers pour l'affichage des matériaux
    const getIcon = (type: string) => {
        switch(type) {
            case 'hook': return '🪄';
            case 'yarn': return '🧶';
            case 'needle': return '🥢';
            default: return '📦';
        }
    };

    return (
        <div className="flex flex-col h-screen bg-background text-white animate-fade-in">

            {/* --- HEADER FIXE --- */}
            <div className="fixed top-0 left-0 right-0 z-20 bg-background/95 backdrop-blur-sm p-4 border-b border-zinc-800/50">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => navigate(-1)}
                        className="text-zinc-400 hover:text-white transition p-2 -ml-2 rounded-full hover:bg-zinc-800"
                    >
                        <ArrowLeft size={24} />
                    </button>
                    <span className="text-zinc-400 text-sm font-medium">Retour</span>
                </div>
            </div>

            {/* --- CONTENU SCROLLABLE --- */}
            <div className="flex-1 overflow-y-auto pt-20 px-4 pb-8">

                <h1 className="text-3xl font-bold mb-2">Nouveau projet</h1>
                <p className="text-zinc-500 mb-8">Créez un nouveau projet de crochet</p>

                <form onSubmit={handleSubmit} className="space-y-8">

                    {/* 1. Nom du projet (OBLIGATOIRE) */}
                    <Input
                        label="Nom du projet *"
                        placeholder="Mon super projet..."
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        required
                    />

                    {/* 2. Catégories */}
                    <div className="space-y-3">
                        <label className="text-xs text-zinc-400 ml-1 uppercase tracking-wider font-bold">Catégorie</label>

                        {isLoadingCategories ? (
                            <div className="flex gap-2 text-zinc-500 text-sm items-center">
                                <Loader2 className="animate-spin" size={16} /> Chargement...
                            </div>
                        ) : categories.length === 0 ? (
                            <p className="text-zinc-500 text-sm">Aucune catégorie disponible</p>
                        ) : (
                            <div className="flex flex-wrap gap-2">
                                {categories.map((cat) => (
                                    <button
                                        key={cat.id}
                                        type="button"
                                        onClick={() => setSelectedCategoryId(selectedCategoryId === cat.id ? null : cat.id)}
                                        className={`px-4 py-2 rounded-full text-sm font-medium border transition-all ${
                                            selectedCategoryId === cat.id
                                                ? "bg-secondary border-primary text-white shadow-[0_0_10px_-3px_rgba(196,181,254,0.5)]"
                                                : "bg-zinc-800/50 border-zinc-700 text-zinc-400 hover:border-zinc-500 hover:bg-zinc-800"
                                        }`}
                                    >
                                        {cat.label}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* 3. Matériaux */}
                    <div className="space-y-3">
                        <label className="text-xs text-zinc-400 ml-1 uppercase tracking-wider font-bold">Matériaux utilisés</label>

                        {isLoadingMaterials ? (
                            <div className="flex gap-2 text-zinc-500 text-sm items-center">
                                <Loader2 className="animate-spin" size={16} /> Chargement...
                            </div>
                        ) : materials.length === 0 ? (
                            <p className="text-zinc-500 text-sm">Aucun matériel dans l'inventaire</p>
                        ) : (
                            <div className="flex flex-wrap gap-2">
                                {materials.map((mat) => (
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
                        )}
                    </div>

                    {/* 4. Nombre de rangs */}
                    <Input
                        label="Nombre de rangs (optionnel)"
                        type="text"
                        inputMode="numeric"
                        placeholder="Ex: 60"
                        value={goalRows}
                        onChange={handleGoalRowsChange}
                    />
                    <p className="text-[10px] text-zinc-500 ml-1 -mt-6">
                        Laissez vide si vous ne connaissez pas encore le nombre de rangs
                    </p>

                    {/* Espace vide */}
                    <div className="h-4" />

                    {/* Bouton d'action */}
                    <Button
                        type="submit"
                        isLoading={createProjectMutation.isPending}
                        disabled={!title || createProjectMutation.isPending}
                        className="w-full py-4 text-lg shadow-lg shadow-primary/20"
                    >
                        {createProjectMutation.isPending ? 'Création...' : 'Commencer le projet'}
                    </Button>

                </form>
            </div>
        </div>
    );
}
