import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import api from '../services/api';
import { ArrowLeft, Save, User, Shield, Calendar, Package, FolderOpen, Key } from 'lucide-react';

interface UserDetail {
    id: string;
    email: string;
    role: string;
    theme_pref: string;
    created_at: string;
    updated_at: string;
    _count?: {
        projects: number;
        materials: number;
    };
}

export default function AdminUserDetail() {
    const { id } = useParams();
    const navigate = useNavigate();
    
    const [user, setUser] = useState<UserDetail | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [successMsg, setSuccessMsg] = useState('');

    // Form state
    const [email, setEmail] = useState('');
    const [role, setRole] = useState('user');
    const [newPassword, setNewPassword] = useState('');

    useEffect(() => {
        fetchUser();
    }, [id]);

    const fetchUser = async () => {
        try {
            const response = await api.get(`/users/${id}`);
            const userData = response.data;
            setUser(userData);
            setEmail(userData.email);
            setRole(userData.role);
        } catch (err: any) {
            console.error(err);
            setError("Impossible de charger l'utilisateur.");
        } finally {
            setLoading(false);
        }
    };

    const handleUpdate = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setSuccessMsg('');

        try {
            const updateData: any = {
                email,
                role
            };

            if (newPassword) {
                updateData.password = newPassword;
            }

            const response = await api.patch(`/users/${id}`, updateData);
            setUser({ ...user!, ...response.data });
            setNewPassword(''); // Reset password field
            setSuccessMsg('Utilisateur mis à jour avec succès !');
            
            // Effacer le message de succès après 3 secondes
            setTimeout(() => setSuccessMsg(''), 3000);
        } catch (err: any) {
            console.error(err);
            setError(err.response?.data?.error || "Erreur lors de la mise à jour");
        }
    };

    if (loading) return <div className="p-4 text-center">Chargement...</div>;
    if (!user) return <div className="p-4 text-center text-red-500">Utilisateur introuvable</div>;

    return (
        <div className="p-4 max-w-2xl mx-auto pb-24">
            <header className="flex items-center gap-4 mb-6">
                <button onClick={() => navigate('/admin/users')} className="p-2">
                    <ArrowLeft className="w-6 h-6" />
                </button>
                <h1 className="text-xl font-bold">Détails Utilisateur</h1>
            </header>

            {error && (
                <div className="bg-red-500/20 text-red-200 p-4 rounded-xl mb-4 border border-red-500/50">
                    {error}
                </div>
            )}

            {successMsg && (
                <div className="bg-green-500/20 text-green-200 p-4 rounded-xl mb-4 border border-green-500/50">
                    {successMsg}
                </div>
            )}

            <form onSubmit={handleUpdate} className="space-y-6">
                {/* Carte d'identité */}
                <div className="bg-surface p-6 rounded-xl border border-border space-y-6">
                    <div className="flex items-center gap-4 mb-4">
                        <div className={`p-3 rounded-full ${user.role === 'admin' ? 'bg-purple-500/20 text-purple-400' : 'bg-gray-700 text-gray-400'}`}>
                            {user.role === 'admin' ? <Shield className="w-8 h-8" /> : <User className="w-8 h-8" />}
                        </div>
                        <div>
                            <h2 className="text-lg font-bold">{user.email}</h2>
                            <p className="text-sm text-text-secondary">ID: {user.id}</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm text-text-secondary mb-1">Email</label>
                            <input 
                                type="email" 
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full bg-background border border-border rounded-lg p-3 text-white focus:border-primary outline-none"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-sm text-text-secondary mb-1">Rôle</label>
                            <select 
                                value={role}
                                onChange={(e) => setRole(e.target.value)}
                                className="w-full bg-background border border-border rounded-lg p-3 text-white focus:border-primary outline-none"
                            >
                                <option value="user">Utilisateur</option>
                                <option value="admin">Administrateur</option>
                            </select>
                        </div>
                    </div>

                    <div className="pt-4 border-t border-border">
                        <label className="block text-sm text-text-secondary mb-1 flex items-center gap-2">
                            <Key className="w-4 h-4" />
                            Réinitialiser le mot de passe
                        </label>
                        <input 
                            type="password" 
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            placeholder="Laisser vide pour ne pas changer"
                            className="w-full bg-background border border-border rounded-lg p-3 text-white focus:border-primary outline-none"
                            minLength={6}
                        />
                        <p className="text-xs text-text-secondary mt-1">
                            Si rempli, le mot de passe sera modifié immédiatement.
                        </p>
                    </div>
                </div>

                {/* Statistiques */}
                <div className="grid grid-cols-2 gap-4">
                    <div className="bg-surface p-4 rounded-xl border border-border flex flex-col items-center justify-center text-center">
                        <FolderOpen className="w-6 h-6 text-primary mb-2" />
                        <span className="text-2xl font-bold">{user._count?.projects || 0}</span>
                        <span className="text-xs text-text-secondary">Projets</span>
                    </div>
                    <div className="bg-surface p-4 rounded-xl border border-border flex flex-col items-center justify-center text-center">
                        <Package className="w-6 h-6 text-secondary mb-2" />
                        <span className="text-2xl font-bold">{user._count?.materials || 0}</span>
                        <span className="text-xs text-text-secondary">Matériaux</span>
                    </div>
                </div>

                {/* Infos techniques */}
                <div className="bg-surface p-4 rounded-xl border border-border text-sm text-text-secondary space-y-2">
                    <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4" />
                        <span>Créé le : {new Date(user.created_at).toLocaleString()}</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4" />
                        <span>Mis à jour le : {new Date(user.updated_at).toLocaleString()}</span>
                    </div>
                </div>

                <button 
                    type="submit"
                    className="w-full bg-primary text-white py-4 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-primary/90 transition-colors"
                >
                    <Save className="w-5 h-5" />
                    Enregistrer les modifications
                </button>
            </form>
        </div>
    );
}
