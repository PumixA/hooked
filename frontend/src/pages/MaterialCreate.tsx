import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Loader2, Save } from 'lucide-react'; // Ajout icônes
import api from '../services/api';
import Input from '../components/ui/Input';
import Button from '../components/ui/Button';

export default function MaterialCreate() {
    const navigate = useNavigate();
    const [isLoading, setIsLoading] = useState(false);

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

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.name) return;
        setIsLoading(true);

        try {
            await api.post('/materials', formData);
            navigate('/inventory');
        } catch (error) {
            console.error("Erreur ajout matériel", error);
            // Protection : On avertit l'utilisateur au lieu de laisser planter
            alert("Erreur : Impossible d'ajouter le matériel. Vérifiez votre connexion.");
        } finally {
            setIsLoading(false);
        }
    };

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
                        isLoading={isLoading}
                        disabled={!formData.name}
                        className="w-full flex items-center justify-center gap-2"
                    >
                        {isLoading ? <Loader2 className="animate-spin" /> : <Save size={20} />}
                        <span>Ajouter au stock</span>
                    </Button>
                </div>

            </form>
        </div>
    );
}