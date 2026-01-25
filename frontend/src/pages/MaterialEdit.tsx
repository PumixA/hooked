import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Loader2, Save, Trash2 } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';
import { useSync } from '../context/SyncContext';

interface Material {
    category_type: string;
    name: string;
    brand?: string;
    material_composition?: string;
}

export default function MaterialEdit() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const { isOnline, addToQueue } = useSync();

    const [formData, setFormData] = useState<Material | null>(null);

    // 1. Récupérer les données de l'élément
    const { data: material, isLoading: isLoadingMaterial, isError } = useQuery({
        queryKey: ['materials', id],
        queryFn: async () => {
            const { data } = await api.get(`/materials/${id}`);
            return data as Material;
        },
        enabled: !!id,
        // 🔥 OFFLINE-FIRST : On utilise le cache si dispo
        staleTime: 1000 * 60 * 5,
        retry: false
    });

    // Effet pour mettre à jour le formulaire quand les données arrivent
    useEffect(() => {
        if (material) {
            setFormData(material);
        }
    }, [material]);

    // 2. Mutation pour la mise à jour
    const updateMutation = useMutation({
        mutationFn: async (updatedMaterial: any) => {
            if (isOnline) {
                await api.patch(`/materials/${id}`, updatedMaterial);
            } else {
                addToQueue('UPDATE_MATERIAL', { id, ...updatedMaterial });
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['materials'] });
            navigate('/inventory');
        },
        onError: () => alert("Erreur lors de la mise à jour.")
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData || !formData.name) return;
        updateMutation.mutate(formData);
    };

    const types = [
        { label: 'Crochets', value: 'hook' },
        { label: 'Laine', value: 'yarn' },
        { label: 'Aiguilles', value: 'needle' }
    ];

    if (isLoadingMaterial) {
        return (
            <div className="h-screen flex items-center justify-center text-primary bg-background">
                <Loader2 className="animate-spin" size={40} />
            </div>
        );
    }

    if (isError || !formData) {
        return (
            <div className="h-screen flex flex-col items-center justify-center text-zinc-500 bg-background gap-4 p-4 text-center">
                <p className="text-lg font-medium">Impossible de charger l'élément.</p>
                <button
                    onClick={() => navigate('/inventory')}
                    className="mt-4 px-6 py-2 bg-zinc-800 rounded-full text-white hover:bg-zinc-700 transition"
                >
                    Retour à l'inventaire
                </button>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background p-4 text-white animate-fade-in pb-20">
            <div className="flex items-center gap-4 mb-6">
                <button onClick={() => navigate(-1)} className="text-zinc-400 hover:text-white transition p-2">
                    <ArrowLeft size={24} />
                </button>
                <h1 className="text-xl font-bold">Modifier le matériel</h1>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6 max-w-md mx-auto">
                <div className="space-y-2">
                    <label className="text-xs text-zinc-400 ml-1">Type</label>
                    <div className="flex flex-wrap gap-2">
                        {types.map((type) => (
                            <button
                                key={type.value}
                                type="button"
                                onClick={() => setFormData({...formData, category_type: type.value})}
                                className={`px-4 py-2 rounded-full text-sm font-medium border transition-all ${
                                    formData.category_type === type.value
                                        ? "bg-primary text-background border-primary shadow-lg shadow-primary/20"
                                        : "bg-zinc-800/50 border-zinc-700 text-zinc-400 hover:border-zinc-500"
                                }`}
                            >
                                {type.label}
                            </button>
                        ))}
                    </div>
                </div>

                <Input
                    label={formData.category_type === 'yarn' ? "Nom / Couleur *" : "Taille (ex: 4.0mm) *"}
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    required
                />

                <Input
                    label="Marque"
                    value={formData.brand || ''}
                    onChange={(e) => setFormData({...formData, brand: e.target.value})}
                />

                <Input
                    label="Matière"
                    value={formData.material_composition || ''}
                    onChange={(e) => setFormData({...formData, material_composition: e.target.value})}
                />

                <div className="pt-4">
                    <Button
                        type="submit"
                        isLoading={updateMutation.isPending}
                        disabled={!formData.name}
                        className="w-full flex items-center justify-center gap-2"
                    >
                        <Save size={20} />
                        <span>Enregistrer les modifications</span>
                    </Button>
                </div>
            </form>
        </div>
    );
}