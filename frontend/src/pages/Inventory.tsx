import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Loader2, PackageOpen, Trash2 } from 'lucide-react';
import Card from '../components/ui/Card';
import Modal from '../components/ui/Modal';
import Button from '../components/ui/Button';
import { useMaterials, useDeleteMaterial } from '../hooks/useOfflineData';

interface Material {
    id: string;
    category_type: 'hook' | 'yarn' | 'needle';
    name: string;
    size?: string;
    brand?: string;
    material_composition?: string;
    description?: string;
    color_number?: string;
    yardage_meters?: number;
    grammage_grams?: number;
    _syncStatus?: string;
}

export default function Inventory() {
    const navigate = useNavigate();
    const [filter, setFilter] = useState<string>('all');
    const [itemToDelete, setItemToDelete] = useState<Material | null>(null);

    // 🔥 OFFLINE-FIRST: Utilisation des hooks locaux
    const { data: materials = [], isLoading, isError } = useMaterials();
    const deleteMutation = useDeleteMaterial();

    const handleDeleteClick = (e: React.MouseEvent, item: Material) => {
        e.stopPropagation();
        setItemToDelete(item);
    };

    const confirmDelete = () => {
        if (itemToDelete) {
            deleteMutation.mutate(itemToDelete.id, {
                onSuccess: () => setItemToDelete(null)
            });
        }
    };

    // Logique de filtrage
    const filteredMaterials = materials.filter(m =>
        filter === 'all' ? true : m.category_type === filter
    );


    // Helpers UI
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

    // --- RENDER ---

    if (isLoading) return (
        <div className="h-screen flex items-center justify-center text-primary bg-background">
            <Loader2 className="animate-spin" size={40} />
        </div>
    );

    if (isError && materials.length === 0) return (
        <div className="h-screen flex flex-col items-center justify-center text-zinc-500 bg-background gap-4 p-4 text-center">
            <PackageOpen size={48} />
            <p className="text-lg font-medium">Erreur de chargement</p>
            <p className="text-sm">Impossible de charger l'inventaire pour le moment.</p>
            <button
                onClick={() => window.location.reload()}
                className="mt-4 px-6 py-2 bg-zinc-800 rounded-full text-white hover:bg-zinc-700 transition"
            >
                Réessayer
            </button>
        </div>
    );

    return (
        <div className="p-4 min-h-screen bg-background pb-24 animate-fade-in text-white">

            {/* Header */}
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold">Inventaire</h1>
            </div>

            {/* Filtres */}
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

            {/* Liste */}
            <div className="space-y-3">
                {filteredMaterials.length === 0 ? (
                    <div className="text-center py-12 text-zinc-500 flex flex-col items-center gap-2 border-2 border-dashed border-zinc-800 rounded-2xl">
                        <PackageOpen size={48} className="opacity-50" />
                        <p>Aucun matériel trouvé.</p>
                        <p className="text-xs">Ajoutez vos pelotes et crochets !</p>
                    </div>
                ) : (
                    filteredMaterials.map((item) => (
                        <Card
                            key={item.id}
                            onClick={() => navigate(`/inventory/${item.id}`)}
                            className="flex items-center justify-between p-4 group bg-secondary border-zinc-800 cursor-pointer active:scale-[0.98] transition-transform relative"
                        >
                            <div className="flex items-center gap-4">
                                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-xl bg-zinc-800`}>
                                    {getIcon(item.category_type)}
                                </div>
                                <div>
                                    <div className="flex items-center gap-2">
                                        <h3 className="font-bold text-white">
                                            {item.name}
                                            {item.size ? (
                                                <span className="text-xs text-zinc-400 font-medium ml-2">
                                                    {item.size}mm
                                                </span>
                                            ) : null}
                                        </h3>
                                        <span className={`text-[10px] px-2 py-0.5 rounded-full uppercase tracking-wider font-bold ${getCategoryColor(item.category_type)}`}>
                                            {getCategoryLabel(item.category_type)}
                                        </span>
                                    </div>
                                    <p className="text-xs text-zinc-400">
                                        {[
                                            item.brand,
                                            item.material_composition,
                                            item.color_number ? `couleur ${item.color_number}` : undefined,
                                            typeof item.yardage_meters === 'number' ? `${item.yardage_meters}m` : undefined,
                                            typeof item.grammage_grams === 'number' ? `${item.grammage_grams}g` : undefined,
                                        ].filter(Boolean).join(' - ')}
                                    </p>
                                    {item.description && (
                                        <p className="text-[11px] text-zinc-500 mt-1 line-clamp-2">
                                            {item.description}
                                        </p>
                                    )}
                                </div>
                            </div>
                            <button
                                onClick={(e) => handleDeleteClick(e, item)}
                                className="text-zinc-600 hover:text-red-400 p-3 -mr-2 transition-colors rounded-full hover:bg-red-500/10"
                            >
                                <Trash2 size={20} />
                            </button>
                        </Card>
                    ))
                )}
            </div>

            {/* FAB */}
            <button
                onClick={() => navigate('/inventory/new')}
                className="fixed bottom-24 right-6 w-14 h-14 bg-primary text-background rounded-full flex items-center justify-center shadow-lg hover:scale-110 active:scale-90 transition-all z-40"
            >
                <Plus size={32} strokeWidth={2.5} />
            </button>

            {/* MODALE SUPPRESSION */}
            <Modal isOpen={!!itemToDelete} onClose={() => setItemToDelete(null)} title="Supprimer ?">
                <div className="space-y-4 text-center">
                    <p className="text-zinc-400">
                        Voulez-vous vraiment supprimer <span className="text-white font-bold">{itemToDelete?.name}</span> ?
                        <br />Cette action est irréversible.
                    </p>
                    <div className="flex gap-3 mt-6">
                        <Button variant="secondary" onClick={() => setItemToDelete(null)} className="flex-1">Annuler</Button>
                        <Button
                            variant="danger"
                            onClick={confirmDelete}
                            isLoading={deleteMutation.isPending}
                            className="flex-1"
                        >
                            Supprimer
                        </Button>
                    </div>
                </div>
            </Modal>
        </div>
    );
}
