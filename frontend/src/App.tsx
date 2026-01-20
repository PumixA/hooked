import { useEffect, useState } from 'react';
import {
    Shirt, Smile, Scroll, LayoutGrid, Hand, ShoppingBag, ToyBrick, Box,
    Loader2
} from 'lucide-react';

// 1. Définition du type de données (ce que le backend renvoie)
interface Category {
    id: string;
    label: string;
    icon_key: string;
}

// 2. Mapping : On relie le texte de la BDD au composant Lucide
// Record<string, any> permet d'associer une chaîne de caractères à un composant
const iconMap: Record<string, any> = {
    'shirt': Shirt,
    'smile': Smile,
    'scroll': Scroll,
    'layout-grid': LayoutGrid,
    'hand': Hand,
    'shopping-bag': ShoppingBag,
    'toy-brick': ToyBrick,
    'box': Box
};

function App() {
    const [categories, setCategories] = useState<Category[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // 3. Charger les données au démarrage
    useEffect(() => {
        fetch('http://localhost:3000/categories')
            .then(response => {
                if (!response.ok) throw new Error('Erreur réseau');
                return response.json();
            })
            .then(data => {
                setCategories(data);
                setLoading(false);
            })
            .catch(err => {
                console.error(err);
                setError("Impossible de contacter le serveur 🧶");
                setLoading(false);
            });
    }, []);

    return (
        <div className="min-h-screen bg-[#1E1E1E] text-gray-100 p-6 flex flex-col items-center">

            <header className="mb-10 text-center">
                <h1 className="text-3xl font-bold text-[#C4B5FD] mb-2">Hooked</h1>
                <p className="text-gray-400">Choisis ta catégorie pour démarrer</p>
            </header>

            {/* État de Chargement */}
            {loading && (
                <div className="flex flex-col items-center gap-4 mt-20">
                    <Loader2 className="w-10 h-10 text-[#C4B5FD] animate-spin" />
                    <p className="text-gray-500">Récupération des pelotes...</p>
                </div>
            )}

            {/* État d'Erreur */}
            {error && (
                <div className="bg-red-900/20 border border-red-800 p-4 rounded-lg text-red-300">
                    {error}
                </div>
            )}

            {/* La Grille de Catégories */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 w-full max-w-2xl">
                {categories.map((cat) => {
                    // On récupère l'icône correspondante, ou 'Box' par défaut
                    const IconComponent = iconMap[cat.icon_key] || Box;

                    return (
                        <button
                            key={cat.id}
                            className="bg-[#2D2D2D] hover:bg-[#3D3D3D] border border-gray-700 hover:border-[#C4B5FD]
                         transition-all duration-300 p-6 rounded-xl flex flex-col items-center gap-3 group"
                        >
                            <div className="p-3 bg-[#1E1E1E] rounded-full group-hover:bg-[#C4B5FD]/20 transition-colors">
                                <IconComponent className="w-8 h-8 text-[#C4B5FD]" />
                            </div>
                            <span className="font-medium text-gray-200">{cat.label}</span>
                        </button>
                    );
                })}
            </div>

        </div>
    );
}

export default App;