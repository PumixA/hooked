import { Play, Pause, RotateCcw } from 'lucide-react';

interface TimerProps {
    elapsed: number;
    isActive: boolean;
    onToggle: () => void;
    onReset: () => void;
}

export default function Timer({ elapsed, isActive, onToggle, onReset }: TimerProps) {
    
    // Fonction de formatage sécurisée
    const formatTime = (totalSeconds: number) => {
        if (isNaN(totalSeconds) || totalSeconds < 0) return "00:00:00";
        
        const h = Math.floor(totalSeconds / 3600);
        const m = Math.floor((totalSeconds % 3600) / 60);
        const s = Math.floor(totalSeconds % 60);

        return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    };

    return (
        <div className="flex flex-col items-center gap-4">
            <div className="text-5xl font-mono font-bold tracking-wider text-white tabular-nums">
                {formatTime(elapsed)}
            </div>

            <div className="flex items-center gap-4">
                <button 
                    onClick={onReset}
                    className="p-4 rounded-full bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-white transition active:scale-95"
                >
                    <RotateCcw size={20} />
                </button>

                <button 
                    onClick={onToggle}
                    className={`p-6 rounded-full transition-all active:scale-95 shadow-lg ${
                        isActive 
                            ? 'bg-red-500/20 text-red-500 hover:bg-red-500/30 border border-red-500/50' 
                            : 'bg-primary text-background hover:bg-primary/90 shadow-primary/20'
                    }`}
                >
                    {isActive ? <Pause size={32} fill="currentColor" /> : <Play size={32} fill="currentColor" className="ml-1" />}
                </button>
            </div>
        </div>
    );
}