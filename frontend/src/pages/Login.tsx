import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useState } from 'react';

export default function Login() {
    const { login } = useAuth();
    const navigate = useNavigate();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await login(email, password);
            navigate('/');
        } catch (err) {
            alert("Erreur de connexion");
        }
    };

    return (
        <div className="min-h-screen bg-background flex flex-col items-center justify-center p-6 text-white">
            <div className="w-full max-w-sm">
                <div className="flex justify-center mb-8">
                    <img src="/logo-mini.svg" alt="Hooked" className="w-24 h-24" />
                </div>

                <h1 className="text-center text-xl mb-8 text-gray-400">Suivi de projets crochet</h1>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <input
                        type="email"
                        placeholder="Adresse e-mail"
                        className="w-full p-4 rounded-xl bg-secondary border border-zinc-700 text-white placeholder-gray-500 focus:outline-none focus:border-primary transition-colors"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                    />
                    <input
                        type="password"
                        placeholder="Mot de passe"
                        className="w-full p-4 rounded-xl bg-secondary border border-zinc-700 text-white placeholder-gray-500 focus:outline-none focus:border-primary transition-colors"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                    />
                    <button
                        type="submit"
                        className="w-full bg-primary text-background font-bold py-4 rounded-xl hover:opacity-90 transition"
                    >
                        Ouvrir mon atelier
                    </button>
                </form>

                <p className="text-center text-xs text-gray-600 mt-8">
                    Instance auto-hébergée • Fonctionne hors ligne
                </p>
            </div>
        </div>
    );
}