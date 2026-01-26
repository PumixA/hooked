import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Loader2, Save, WifiOff } from 'lucide-react';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';
import { useCreateMaterial } from '../hooks/useOfflineData';

export default function MaterialCreate() {
    const navigate = useNavigate();

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

    const types = [
        { label: 'Crochets', value: 'hook' },
        { label: 'Laine', value: 'yarn' },
        { label: 'Aiguilles', value: 'needle' }
    ];

    const [formData, setFormData] = useState({
        category_type: 'hook',
        name: '',
        brand: '',
        material_composition: ''
    });

    // 🔥 OFFLINE-FIRST: Utilisation du hook local
    const createMaterialMutation = useCreateMaterial();

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.name) return;

        createMaterialMutation.mutate(formData, {
            onSuccess: () => {
                navigate('/inventory');
            }
        });
    };

    return (
        <div className="min-h-screen bg-background p-4 text-white animate-fade-in pb-20">

            {/* Header */}
            <div className="flex items-center gap-4 mb-6">
                <button onClick={() => navigate(-1)} className="text-zinc-400 hover:text-white transition p-2">
                    <ArrowLeft size={24} />
                </button>
                <h1 className="text-xl font-bold">Nouveau matériel</h1>
                {!isOnline && (
                    <span className="text-[10px] bg-orange-500/20 text-orange-400 px-2 py-1 rounded-full border border-orange-500/50 flex items-center gap-1 ml-auto">
                        <WifiOff size={12} /> Hors ligne
                    </span>
                )}
            </div>

            <form onSubmit={handleSubmit} className="space-y-6 max-w-md mx-auto">

                {/* 1. Type */}
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

                {/* 2. Champs */}
                <Input
                    label={formData.category_type === 'yarn' ? "Nom / Couleur *" : "Taille (ex: 4.0mm) *"}
                    placeholder={formData.category_type === 'yarn' ? "Ex: Merino Rouge" : "Ex: 4.0mm"}
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    required
                />

                <Input
                    label="Marque"
                    placeholder="ex: Clover, Drops..."
                    value={formData.brand}
                    onChange={(e) => setFormData({...formData, brand: e.target.value})}
                />

                <Input
                    label="Matière"
                    placeholder="ex: Aluminium, Merino, Bambou..."
                    value={formData.material_composition}
                    onChange={(e) => setFormData({...formData, material_composition: e.target.value})}
                />

                {/* Bouton Action */}
                <div className="pt-4">
                    <Button
                        type="submit"
                        isLoading={createMaterialMutation.isPending}
                        disabled={!formData.name}
                        className="w-full flex items-center justify-center gap-2"
                    >
                        {createMaterialMutation.isPending ? <Loader2 className="animate-spin" /> : <Save size={20} />}
                        <span>{isOnline ? 'Ajouter au stock' : 'Ajouter hors ligne'}</span>
                    </Button>
                </div>

            </form>
        </div>
    );
}
