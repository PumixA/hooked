import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Loader2, Save } from 'lucide-react';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';
import { useCreateMaterial } from '../hooks/useOfflineData';

export default function MaterialCreate() {
    const navigate = useNavigate();

    const types = [
        { label: 'Crochets', value: 'hook' },
        { label: 'Laine', value: 'yarn' },
        { label: 'Aiguilles', value: 'needle' }
    ];

    const [formData, setFormData] = useState({
        category_type: 'hook',
        name: '',
        size: '',
        brand: '',
        material_composition: ''
    });

    // OFFLINE-FIRST: Utilisation du hook local
    const createMaterialMutation = useCreateMaterial();

    // Validation taille: seulement des chiffres (max 1 chiffre apres la virgule)
    const handleSizeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        // Accepter: vide, chiffres, un point/virgule suivi d'un chiffre max
        if (value === '' || /^\d{1,2}([.,]\d?)?$/.test(value)) {
            setFormData({...formData, size: value.replace(',', '.')});
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.name) return;

        createMaterialMutation.mutate(formData, {
            onSuccess: () => {
                navigate('/inventory');
            }
        });
    };

    const isYarn = formData.category_type === 'yarn';

    return (
        <div className="min-h-screen bg-background p-4 text-white animate-fade-in pb-20">

            {/* Header */}
            <div className="flex items-center gap-4 mb-6">
                <button onClick={() => navigate(-1)} className="text-zinc-400 hover:text-white transition p-2">
                    <ArrowLeft size={24} />
                </button>
                <h1 className="text-xl font-bold">Nouveau matériel</h1>
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

                {/* 2. Nom (obligatoire) */}
                <Input
                    label="Nom *"
                    placeholder={isYarn ? "Ex: Merino Rouge" : "Ex: Mon crochet préféré"}
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    required
                />

                {/* 3. Taille (optionnel, surtout pour crochets/aiguilles) */}
                {!isYarn && (
                    <div className="space-y-2">
                        <label className="text-xs text-zinc-400 ml-1">Taille (mm)</label>
                        <div className="relative">
                            <input
                                type="text"
                                inputMode="decimal"
                                placeholder="Ex: 4"
                                value={formData.size}
                                onChange={handleSizeChange}
                                className="w-full p-4 pr-12 rounded-xl bg-secondary border border-zinc-800 text-white placeholder-zinc-500 focus:outline-none focus:border-primary transition-colors"
                            />
                            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-500">mm</span>
                        </div>
                    </div>
                )}

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
                        <span>Ajouter au stock</span>
                    </Button>
                </div>

            </form>
        </div>
    );
}
