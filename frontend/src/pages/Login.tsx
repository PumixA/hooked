import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { Loader2, AlertCircle } from 'lucide-react';
import clsx from 'clsx';

export default function Login() {
    const { login } = useAuth();
    const navigate = useNavigate();

    // États pour gérer l'expérience utilisateur (chargement et erreurs)
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);      // On efface les anciennes erreurs
        setIsLoading(true);  // On active le mode chargement

        try {
            await login(email, password);
            navigate('/');
        } catch (err) {
            // En cas d'échec, on arrête le chargement et on affiche l'erreur
            setError("Email ou mot de passe incorrect.");
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 text-white">
            <div className="w-full max-w-sm animate-fade-in">

                {/* Logo & Titre */}
                <div className="flex flex-col items-center mb-10">
                    <img src="/logo-mini.svg" alt="Hooked" className="w-24 h-24 mb-6" />
                    <h1 className="text-gray-400 text-lg font-medium">Suivi de projets crochet</h1>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">

                    {/* Zone d'affichage de l'erreur */}
                    {error && (
                        <div className="bg-red-500/10 border border-red-500/50 text-red-400 p-3 rounded-xl flex items-center gap-2 text-sm">
                            <AlertCircle size={18} />
                            <span>{error}</span>
                        </div>
                    )}

                    <div className="space-y-4">
                        <input
                            type="email"
                            placeholder="Adresse e-mail"
                            required
                            disabled={isLoading}
                            className="w-full p-4 rounded-xl bg-secondary border border-zinc-800 text-white placeholder-zinc-500 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all disabled:opacity-50"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                        />
                        <input
                            type="password"
                            placeholder="Mot de passe"
                            required
                            disabled={isLoading}
                            className="w-full p-4 rounded-xl bg-secondary border border-zinc-800 text-white placeholder-zinc-500 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all disabled:opacity-50"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={isLoading}
                        className={clsx(
                            "w-full font-bold py-4 rounded-xl transition-all flex items-center justify-center gap-2",
                            isLoading
                                ? "bg-zinc-700 text-zinc-400 cursor-not-allowed"
                                : "bg-primary text-background hover:opacity-90 active:scale-[0.98]"
                        )}
                    >
                        {isLoading ? (
                            <>
                                <Loader2 className="animate-spin" size={20} />
                                <span>Connexion...</span>
                            </>
                        ) : (
                            "Ouvrir mon atelier"
                        )}
                    </button>
                </form>

                <p className="text-center text-xs text-zinc-600 mt-12">
                    Instance auto-hébergée • Fonctionne hors ligne
                </p>
            </div>
        </div>
    );
}