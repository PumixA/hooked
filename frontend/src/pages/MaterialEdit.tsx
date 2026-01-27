import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Loader2, Save } from 'lucide-react';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';
import { useMaterial, useUpdateMaterial } from '../hooks/useOfflineData';

interface MaterialForm {
    category_type: 'hook' | 'yarn' | 'needle';
    name: string;
    size?: string;
    brand?: string;
    material_composition?: string;
}

export default function MaterialEdit() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();

    const [formData, setFormData] = useState<MaterialForm | null>(null);

    // OFFLINE-FIRST: Utilisation des hooks locaux
    const { data: material, isLoading: isLoadingMaterial, isError } = useMaterial(id);
    const updateMutation = useUpdateMaterial();

    // Effet pour mettre à jour le formulaire quand les données arrivent
    useEffect(() => {
        if (material) {
            setFormData({
                category_type: material.category_type,
                name: material.name,
                size: material.size,
                brand: material.brand,
                material_composition: material.material_composition
            });
        }
    }, [material]);

    // Validation taille: seulement des chiffres (max 1 chiffre apres la virgule)
    const handleSizeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!formData) return;
        const value = e.target.value;
        if (value === '' || /^\d{1,2}([.,]\d?)?$/.test(value)) {
            setFormData({...formData, size: value.replace(',', '.')});
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData || !id) return;

        const isYarn = formData.category_type === 'yarn';
        if (isYarn && !formData.name) return;
        if (!isYarn && !formData.size) return;

        // Si pas de nom mais une taille, utiliser la taille comme nom
        const materialData = {
            id,
            ...formData,
            name: formData.name || (formData.size ? `${formData.size}mm` : '')
        };

        updateMutation.mutate(materialData, {
            onSuccess: () => {
                navigate('/inventory');
            }
        });
    };

    const types: { label: string; value: 'hook' | 'yarn' | 'needle' }[] = [
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

    const isYarn = formData.category_type === 'yarn';

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

                {isYarn ? (
                    <Input
                        label="Nom / Couleur *"
                        value={formData.name}
                        onChange={(e) => setFormData({...formData, name: e.target.value})}
                        required
                    />
                ) : (
                    <>
                        <div className="space-y-2">
                            <label className="text-xs text-zinc-400 ml-1">Taille (mm) *</label>
                            <div className="relative">
                                <input
                                    type="text"
                                    inputMode="decimal"
                                    placeholder="Ex: 4"
                                    value={formData.size || ''}
                                    onChange={handleSizeChange}
                                    className="w-full p-4 pr-12 rounded-xl bg-secondary border border-zinc-800 text-white placeholder-zinc-500 focus:outline-none focus:border-primary transition-colors"
                                    required
                                />
                                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-500">mm</span>
                            </div>
                        </div>
                        <Input
                            label="Nom (optionnel)"
                            value={formData.name}
                            onChange={(e) => setFormData({...formData, name: e.target.value})}
                        />
                    </>
                )}

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
                        disabled={isYarn ? !formData.name : !formData.size}
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
