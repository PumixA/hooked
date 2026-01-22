import { NavLink } from 'react-router-dom';
import { Home, Package } from 'lucide-react';
import clsx from 'clsx';

export default function BottomNavBar() {
    return (
        <nav className="fixed bottom-0 left-0 w-full bg-secondary border-t border-zinc-800 pb-safe z-50">
            <div className="flex justify-around items-center h-16">

                <NavLink
                    to="/"
                    className={({ isActive }) => clsx(
                        "flex flex-col items-center gap-1 text-xs font-medium transition-colors",
                        isActive ? "text-primary" : "text-gray-500"
                    )}
                >
                    <Home size={24} />
                    <span>Accueil</span>
                </NavLink>

                <NavLink
                    to="/inventory"
                    className={({ isActive }) => clsx(
                        "flex flex-col items-center gap-1 text-xs font-medium transition-colors",
                        isActive ? "text-primary" : "text-gray-500"
                    )}
                >
                    <Package size={24} />
                    <span>Inventaire</span>
                </NavLink>

            </div>
        </nav>
    );
}