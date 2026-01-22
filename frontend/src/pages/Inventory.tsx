import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, X, Loader2, PackageOpen } from 'lucide-react';
import api from '../services/api';
import Card from '../components/ui/Card';

interface Material {
    id: string;
    category_type: 'hook' | 'yarn' | 'needle';
    name: string;
    brand?: string;
    material_composition?: string;
}

export default function Inventory() {
    const navigate = useNavigate();
    const [materials, setMaterials] = useState<Material[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<string>('all');

    // Chargement initial
    useEffect(() => {
        fetchMaterials();
    }, []);

    const fetchMaterials = async () => {
        try {
            // On récupère TOUT et on filtre côté client pour l'instant (plus fluide pour l'UI)
            const { data } = await api.get('/materials');
            setMaterials(data);
        } catch (error) {
            console.error("Erreur chargement inventaire", error);
        } finally {
            setLoading(false);
        }
    };

    const deleteMaterial = async (e: React.MouseEvent, id: string) => {
        e.stopPropagation(); // Empêche le clic sur la carte si on clique sur la croix
        if (!confirm("Supprimer cet élément ?")) return;

        try {
            await api.delete(`/materials/${id}`);
            // Mise à jour optimiste de l'interface (on retire l'élément de la liste locale)
            setMaterials(prev => prev.filter(m => m.id !== id));
        } catch (error) {
            alert("Erreur suppression");
        }
    };

    // Logique de filtrage local
    const filteredMaterials = materials.filter(m =>
        filter === 'all' ? true : m.category_type === filter
    );

    // Helpers pour l'affichage (Textes et Couleurs)
    const getCategoryLabel = (type: string) => {
        switch(type) {
            case 'hook': return 'Crochet';
            case 'yarn': return 'Laine';
            case 'needle': return 'Aiguille';
            default: return type;
        }
    };

    const getCategoryColor = (type: string) => {
        switch(type) {
            case 'hook': return 'bg-purple-500/20 text-purple-300';
            case 'yarn': return 'bg-emerald-500/20 text-emerald-300';
            case 'needle': return 'bg-rose-500/20 text-rose-300';
            default: return 'bg-zinc-700 text-zinc-400';
        }
    };

    const getIcon = (type: string) => {
        switch(type) {
            case 'hook': return '🪄';
            case 'yarn': return '🧶';
            case 'needle': return '🥢';
            default: return '📦';
        }
    }

    if (loading) return (
        <div className="h-screen flex items-center justify-center text-primary bg-background">
            <Loader2 className="animate-spin" size={40} />
        </div>
    );

    return (
        <div className="p-4 min-h-screen bg-background pb-24 animate-fade-in text-white">

            {/* Header */}
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold">Inventaire</h1>
            </div>

            {/* Filtres (Tabs) */}
            <div className="flex gap-2 overflow-x-auto pb-4 scrollbar-hide">
                {[
                    { id: 'all', label: 'Tout' },
                    { id: 'hook', label: 'Crochets' },
                    { id: 'yarn', label: 'Laine' },
                    { id: 'needle', label: 'Aiguilles' },
                ].map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setFilter(tab.id)}
                        className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                            filter === tab.id
                                ? 'bg-primary text-background shadow-lg shadow-primary/20'
                                : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
                        }`}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Liste des matériels */}
            <div className="space-y-3">
                {filteredMaterials.length === 0 ? (
                    <div className="text-center py-12 text-zinc-500 flex flex-col items-center gap-2 border-2 border-dashed border-zinc-800 rounded-2xl">
                        <PackageOpen size={48} className="opacity-50" />
                        <p>Aucun matériel trouvé.</p>
                        <p className="text-xs">Ajoutez vos pelotes et crochets !</p>
                    </div>
                ) : (
                    filteredMaterials.map((item) => (
                        <Card key={item.id} className="flex items-center justify-between p-4 group bg-secondary border-zinc-800">
                            <div className="flex items-center gap-4">
                                {/* Icône ronde */}
                                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-xl bg-zinc-800`}>
                                    {getIcon(item.category_type)}
                                </div>

                                <div>
                                    <div className="flex items-center gap-2">
                                        <h3 className="font-bold text-white">{item.name}</h3>
                                        <span className={`text-[10px] px-2 py-0.5 rounded-full uppercase tracking-wider font-bold ${getCategoryColor(item.category_type)}`}>
                                            {getCategoryLabel(item.category_type)}
                                        </span>
                                    </div>
                                    <p className="text-xs text-zinc-400">
                                        {[item.brand, item.material_composition].filter(Boolean).join(' - ')}
                                    </p>
                                </div>
                            </div>

                            {/* Bouton Supprimer (X) */}
                            <button
                                onClick={(e) => deleteMaterial(e, item.id)}
                                className="text-zinc-600 hover:text-red-400 p-2 transition-colors rounded-full hover:bg-red-500/10"
                            >
                                <X size={20} />
                            </button>
                        </Card>
                    ))
                )}
            </div>

            {/* FAB (Bouton Ajout) */}
            <button
                onClick={() => navigate('/inventory/new')}
                className="fixed bottom-24 right-6 w-14 h-14 bg-primary text-background rounded-full flex items-center justify-center shadow-lg hover:scale-110 active:scale-90 transition-all z-40"
            >
                <Plus size={32} strokeWidth={2.5} />
            </button>
        </div>
    );
}