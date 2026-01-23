import { Play, Pause, RotateCcw } from 'lucide-react';

// Props reçues du parent (ProjectDetail)
interface TimerProps {
    elapsed: number;
    isActive: boolean;
    onToggle: () => void;
    onReset: () => void;
}

export default function Timer({ elapsed, isActive, onToggle, onReset }: TimerProps) {

    // Formatage HH:MM:SS
    const formatTime = (totalSeconds: number) => {
        const h = Math.floor(totalSeconds / 3600).toString().padStart(2, '0');
        const m = Math.floor((totalSeconds % 3600) / 60).toString().padStart(2, '0');
        const s = (totalSeconds % 60).toString().padStart(2, '0');
        return `${h}:${m}:${s}`;
    };

    return (
        <div className="flex flex-col items-center gap-3">
            <div className="font-mono text-primary text-xl tracking-widest flex items-center gap-2 relative group">
                <span>{formatTime(elapsed)}</span>

                {/* Bouton Reset (Apparaît seulement si en pause et temps > 0) */}
                {!isActive && elapsed > 0 && (
                    <button
                        onClick={onReset}
                        className="absolute -right-8 p-1 text-zinc-600 hover:text-red-400 transition animate-fade-in"
                        title="Réinitialiser"
                    >
                        <RotateCcw size={14} />
                    </button>
                )}
            </div>

            {/* Bouton Play / Pause */}
            <button
                onClick={onToggle}
                className={`w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 ${
                    isActive
                        ? 'bg-primary/20 text-primary ring-2 ring-primary/50 shadow-[0_0_15px_-3px_rgba(196,181,253,0.3)]'
                        : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700'
                }`}
            >
                {isActive ? <Pause size={16} fill="currentColor" /> : <Play size={16} fill="currentColor" className="ml-0.5" />}
            </button>
        </div>
    );
}