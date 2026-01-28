import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { ArrowLeft, Plus, Trash2, User, Shield, ChevronRight } from 'lucide-react';

interface UserData {
    id: string;
    email: string;
    role: string;
    created_at: string;
}

export default function AdminUsers() {
    const navigate = useNavigate();
    const [users, setUsers] = useState<UserData[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    
    // Form state
    const [showForm, setShowForm] = useState(false);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [role, setRole] = useState('user');
    const [createError, setCreateError] = useState('');

    useEffect(() => {
        fetchUsers();
    }, []);

    const fetchUsers = async () => {
        try {
            const response = await api.get('/users');
            setUsers(response.data);
        } catch (err: any) {
            console.error(err);
            if (err.response?.status === 403) {
                setError("Accès refusé. Vous n'êtes pas administrateur.");
            } else {
                setError("Impossible de charger les utilisateurs.");
            }
        } finally {
            setLoading(false);
        }
    };

    const handleCreateUser = async (e: React.FormEvent) => {
        e.preventDefault();
        setCreateError('');

        try {
            await api.post('/users', {
                email,
                password,
                role
            });
            
            // Reset form and refresh list
            setEmail('');
            setPassword('');
            setRole('user');
            setShowForm(false);
            fetchUsers();
        } catch (err: any) {
            console.error(err);
            setCreateError(err.response?.data?.error || "Erreur lors de la création");
        }
    };

    if (loading) return <div className="p-4 text-center">Chargement...</div>;

    if (error) return (
        <div className="p-4 text-center">
            <p className="text-red-500 mb-4">{error}</p>
            <button onClick={() => navigate('/')} className="text-primary underline">
                Retour à l'accueil
            </button>
        </div>
    );

    return (
        <div className="p-4 max-w-4xl mx-auto pb-24">
            <header className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                    <button onClick={() => navigate('/settings')} className="p-2">
                        <ArrowLeft className="w-6 h-6" />
                    </button>
                    <h1 className="text-2xl font-bold">Administration</h1>
                </div>
                <button 
                    onClick={() => setShowForm(!showForm)}
                    className="bg-primary text-white px-4 py-2 rounded-lg flex items-center gap-2"
                >
                    <Plus className="w-4 h-4" />
                    Nouveau
                </button>
            </header>

            {showForm && (
                <div className="bg-surface p-4 rounded-xl mb-6 border border-border">
                    <h2 className="text-lg font-semibold mb-4">Créer un utilisateur</h2>
                    {createError && <p className="text-red-500 mb-2 text-sm">{createError}</p>}
                    <form onSubmit={handleCreateUser} className="space-y-4">
                        <div>
                            <label className="block text-sm text-text-secondary mb-1">Email</label>
                            <input 
                                type="email" 
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full bg-background border border-border rounded-lg p-2 text-white"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-sm text-text-secondary mb-1">Mot de passe</label>
                            <input 
                                type="password" 
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full bg-background border border-border rounded-lg p-2 text-white"
                                required
                                minLength={6}
                            />
                        </div>
                        <div>
                            <label className="block text-sm text-text-secondary mb-1">Rôle</label>
                            <select 
                                value={role}
                                onChange={(e) => setRole(e.target.value)}
                                className="w-full bg-background border border-border rounded-lg p-2 text-white"
                            >
                                <option value="user">Utilisateur</option>
                                <option value="admin">Administrateur</option>
                            </select>
                        </div>
                        <div className="flex justify-end gap-2 pt-2">
                            <button 
                                type="button"
                                onClick={() => setShowForm(false)}
                                className="px-4 py-2 text-text-secondary"
                            >
                                Annuler
                            </button>
                            <button 
                                type="submit"
                                className="bg-primary text-white px-4 py-2 rounded-lg"
                            >
                                Créer
                            </button>
                        </div>
                    </form>
                </div>
            )}

            <div className="space-y-2">
                {users.map(user => (
                    <button 
                        key={user.id} 
                        onClick={() => navigate(`/admin/users/${user.id}`)}
                        className="w-full bg-surface p-4 rounded-xl flex items-center justify-between border border-border hover:bg-surface/80 transition-colors text-left"
                    >
                        <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-full ${user.role === 'admin' ? 'bg-purple-500/20 text-purple-400' : 'bg-gray-700 text-gray-400'}`}>
                                {user.role === 'admin' ? <Shield className="w-5 h-5" /> : <User className="w-5 h-5" />}
                            </div>
                            <div>
                                <p className="font-medium">{user.email}</p>
                                <p className="text-xs text-text-secondary">
                                    Inscrit le {new Date(user.created_at).toLocaleDateString()}
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <span className={`text-xs px-2 py-1 rounded-full ${
                                user.role === 'admin' ? 'bg-purple-500/20 text-purple-400' : 'bg-gray-700 text-gray-300'
                            }`}>
                                {user.role}
                            </span>
                            <ChevronRight className="w-5 h-5 text-text-secondary" />
                        </div>
                    </button>
                ))}
            </div>
        </div>
    );
}
