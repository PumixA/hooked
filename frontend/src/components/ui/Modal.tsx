import { X, Maximize2, Minimize2 } from 'lucide-react';
import { useState, useEffect, type ReactNode } from 'react';

interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    children: ReactNode;
}

export default function Modal({ isOpen, onClose, title, children }: ModalProps) {
    const [isMaximized, setIsMaximized] = useState(false);

    // 1. Bloquer le scroll de l'arrière-plan quand la modale est ouverte
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
        return () => {
            document.body.style.overflow = '';
        };
    }, [isOpen]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-sm animate-fade-in">
            
            {/* Zone cliquable pour fermer en cliquant dehors */}
            <div className="absolute inset-0" onClick={onClose} />

            {/* Contenu de la modale */}
            <div 
                className={`
                    relative bg-zinc-900 w-full sm:w-[400px] sm:rounded-2xl border-t sm:border border-zinc-700 p-6 shadow-2xl flex flex-col transition-all duration-300 ease-in-out
                    ${isMaximized 
                        ? 'h-[95vh] rounded-t-3xl' 
                        : 'h-auto max-h-[85vh] animate-slide-up rounded-t-3xl'
                    }
                `}
            >

                {/* Barre de poignée (juste visuelle maintenant) */}
                <div 
                    className="w-12 h-1.5 bg-zinc-700/50 rounded-full mx-auto mb-6 sm:hidden shrink-0" 
                    onClick={() => setIsMaximized(!isMaximized)} // Optionnel : clic pour agrandir
                />

                <div className="flex justify-between items-center mb-4 shrink-0">
                    <h3 className="text-xl font-bold text-white">{title}</h3>
                    <div className="flex gap-2">
                        <button 
                            onClick={() => setIsMaximized(!isMaximized)} 
                            className="p-2 text-zinc-400 hover:text-white sm:hidden"
                        >
                            {isMaximized ? <Minimize2 size={18}/> : <Maximize2 size={18}/>}
                        </button>
                        <button onClick={onClose} className="p-2 text-zinc-400 hover:text-red-400"><X size={18}/></button>
                    </div>
                </div>

                {/* Contenu scrollable */}
                <div className="flex-1 overflow-y-auto min-h-[150px]">
                    {children}
                </div>
            </div>
        </div>
    );
}