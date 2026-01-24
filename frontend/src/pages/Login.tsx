import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { AlertCircle } from 'lucide-react';
// IMPORT DES NOUVEAUX COMPOSANTS
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';

export default function Login() {
    const { login } = useAuth();
    const navigate = useNavigate();

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setIsLoading(true);

        try {
            await login(email, password);
            navigate('/');
        } catch (err) {
            setError("Email ou mot de passe incorrect.");
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 text-white">
            <div className="w-full max-w-sm animate-fade-in">

                {/* Header */}
                <div className="flex flex-col items-center mb-10">
                    <img src="/logo.svg" alt="Hooked" className="w-24 h-24 mb-6" />
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">

                    {/* Gestion d'erreur */}
                    {error && (
                        <div className="bg-red-500/10 border border-red-500/50 text-red-400 p-3 rounded-xl flex items-center gap-2 text-sm">
                            <AlertCircle size={18} />
                            <span>{error}</span>
                        </div>
                    )}

                    {/* COMPOSANTS UI KIT : Beaucoup plus propre ! */}
                    <Input
                        type="email"
                        placeholder="Adresse e-mail"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        disabled={isLoading}
                        required
                    />

                    <Input
                        type="password"
                        placeholder="Mot de passe"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        disabled={isLoading}
                        required
                    />

                    <Button
                        type="submit"
                        isLoading={isLoading}
                        className="mt-4"
                    >
                        Ouvrir mon atelier
                    </Button>
                </form>

                <p className="text-center text-xs text-zinc-600 mt-12">
                    Instance auto-hébergée • Fonctionne hors ligne
                </p>
            </div>
        </div>
    );
}