import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertCircle, ArrowLeft, Cloud } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useSyncStatus } from '../context/AppContext';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';

/**
 * Page de connexion - OPTIONNELLE
 *
 * Cette page permet de connecter un compte pour activer
 * la synchronisation cloud. Elle n'est PAS obligatoire
 * pour utiliser l'application.
 */
export default function Login() {
    const { login, isAuthenticating } = useAuth();
    const { hasAccount } = useSyncStatus();
    const navigate = useNavigate();

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState<string | null>(null);

    // Si deja connecte, rediriger vers settings (dans useEffect pour eviter l'erreur React)
    useEffect(() => {
        if (hasAccount) {
            navigate('/settings', { replace: true });
        }
    }, [hasAccount, navigate]);

    // Ne pas afficher le formulaire si deja connecte
    if (hasAccount) {
        return null;
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        const result = await login(email, password);

        if (result.success) {
            // Retourner aux parametres ou au dashboard
            navigate('/settings', { replace: true });
        } else {
            setError(result.error || 'Erreur de connexion');
        }
    };

    const handleSkip = () => {
        navigate(-1);
    };

    return (
        <div className="min-h-screen bg-background flex flex-col p-6 text-white">
            {/* Header avec retour */}
            <div className="flex items-center gap-4 mb-8">
                <button onClick={handleSkip} className="text-gray-400">
                    <ArrowLeft />
                </button>
                <h1 className="text-xl font-bold">Connexion</h1>
            </div>

            <div className="flex-1 flex flex-col items-center justify-center max-w-sm mx-auto w-full">
                {/* Icone */}
                <div className="mb-8 p-4 bg-violet-500/20 rounded-2xl">
                    <Cloud className="w-12 h-12 text-violet-400" />
                </div>

                {/* Titre */}
                <h2 className="text-2xl font-bold text-center mb-2">
                    Activer la synchronisation
                </h2>
                <p className="text-gray-400 text-center mb-8">
                    Connectez un compte pour sauvegarder vos donnees sur le serveur
                    et les synchroniser entre vos appareils.
                </p>

                {/* Formulaire */}
                <form onSubmit={handleSubmit} className="w-full space-y-4">
                    {error && (
                        <div className="bg-red-500/10 border border-red-500/50 text-red-400 p-3 rounded-xl flex items-center gap-2 text-sm">
                            <AlertCircle size={18} />
                            <span>{error}</span>
                        </div>
                    )}

                    <Input
                        type="email"
                        placeholder="Adresse e-mail"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        disabled={isAuthenticating}
                        required
                    />

                    <Input
                        type="password"
                        placeholder="Mot de passe"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        disabled={isAuthenticating}
                        required
                    />

                    <Button
                        type="submit"
                        isLoading={isAuthenticating}
                        className="mt-4"
                    >
                        Se connecter
                    </Button>
                </form>

                {/* Option pour ignorer */}
                <button
                    onClick={handleSkip}
                    className="mt-6 text-gray-400 text-sm"
                >
                    Continuer sans compte
                </button>

                {/* Info */}
                <p className="text-center text-xs text-zinc-600 mt-8">
                    Vos donnees locales seront conservees
                    <br />
                    et synchronisees apres connexion.
                </p>
            </div>
        </div>
    );
}
