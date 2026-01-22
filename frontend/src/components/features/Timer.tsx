import { Play, Pause } from 'lucide-react';
import { useState, useEffect } from 'react';

export default function Timer() {
    const [seconds, setSeconds] = useState(0);
    const [isActive, setIsActive] = useState(false);

    useEffect(() => {
        let interval: any = null;
        if (isActive) {
            interval = setInterval(() => {
                setSeconds(s => s + 1);
            }, 1000);
        } else if (!isActive && seconds !== 0) {
            clearInterval(interval);
        }
        return () => clearInterval(interval);
    }, [isActive, seconds]);

    // Formatage HH:MM:SS
    const formatTime = (totalSeconds: number) => {
        const h = Math.floor(totalSeconds / 3600).toString().padStart(2, '0');
        const m = Math.floor((totalSeconds % 3600) / 60).toString().padStart(2, '0');
        const s = (totalSeconds % 60).toString().padStart(2, '0');
        return `${h}:${m}:${s}`;
    };

    return (
        <div className="flex flex-col items-center gap-2">
            <div className="font-mono text-primary text-xl tracking-widest flex items-center gap-2">
                {formatTime(seconds)}
                <button className="text-xs text-zinc-500 hover:text-white">✎</button>
            </div>

            {/* Petit contrôle play/pause visuel */}
            <button
                onClick={() => setIsActive(!isActive)}
                className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${isActive ? 'bg-primary/20 text-primary' : 'bg-zinc-800 text-zinc-400'}`}
            >
                {isActive ? <Pause size={12} /> : <Play size={12} />}
            </button>
        </div>
    );
}