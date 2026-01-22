import { X, Maximize2 } from 'lucide-react';
import { ReactNode } from 'react';

interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    children: ReactNode;
}

export default function Modal({ isOpen, onClose, title, children }: ModalProps) {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-sm animate-fade-in">
            {/* Contenu de la modale (Bottom Sheet sur mobile) */}
            <div className="bg-zinc-900 w-full sm:w-[400px] sm:rounded-2xl rounded-t-3xl border-t sm:border border-zinc-700 p-6 shadow-2xl animate-slide-up">

                {/* Barre de poignée pour le look "Sheet" */}
                <div className="w-12 h-1 bg-zinc-700 rounded-full mx-auto mb-6 sm:hidden" />

                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-xl font-bold text-white">{title}</h3>
                    <div className="flex gap-2">
                        <button className="p-2 text-zinc-400 hover:text-white"><Maximize2 size={18}/></button>
                        <button onClick={onClose} className="p-2 text-zinc-400 hover:text-red-400"><X size={18}/></button>
                    </div>
                </div>

                <div className="min-h-[200px]">
                    {children}
                </div>
            </div>
        </div>
    );
}