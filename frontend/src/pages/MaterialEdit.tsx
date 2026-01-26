import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Loader2, Save, WifiOff } from 'lucide-react';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';
import { useMaterial, useUpdateMaterial } from '../hooks/useOfflineData';

interface MaterialForm {
    category_type: 'hook' | 'yarn' | 'needle';
    name: string;
    brand?: string;
    material_composition?: string;
}

export default function MaterialEdit() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();

    const [formData, setFormData] = useState<MaterialForm | null>(null);

    // État de connexion
    const [isOnline, setIsOnline] = useState(navigator.onLine);

    useEffect(() => {
        const handleOnline = () => setIsOnline(true);
        const handleOffline = () => setIsOnline(false);
        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);
        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);

    // 🔥 OFFLINE-FIRST: Utilisation des hooks locaux
    const { data: material, isLoading: isLoadingMaterial, isError } = useMaterial(id);
    const updateMutation = useUpdateMaterial();

    // Effet pour mettre à jour le formulaire quand les données arrivent
    useEffect(() => {
        if (material) {
            setFormData({
                category_type: material.category_type,
                name: material.name,
                brand: material.brand,
                material_composition: material.material_composition
            });
        }
    }, [material]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData || !formData.name || !id) return;

        updateMutation.mutate(
            { id, ...formData },
            {
                onSuccess: () => {
                    navigate('/inventory');
                }
            }
        );
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

    return (
        <div className="min-h-screen bg-background p-4 text-white animate-fade-in pb-20">
            <div className="flex items-center gap-4 mb-6">
                <button onClick={() => navigate(-1)} className="text-zinc-400 hover:text-white transition p-2">
                    <ArrowLeft size={24} />
                </button>
                <h1 className="text-xl font-bold">Modifier le matériel</h1>
                {!isOnline && (
                    <span className="text-[10px] bg-orange-500/20 text-orange-400 px-2 py-1 rounded-full border border-orange-500/50 flex items-center gap-1 ml-auto">
                        <WifiOff size={12} /> Hors ligne
                    </span>
                )}
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
