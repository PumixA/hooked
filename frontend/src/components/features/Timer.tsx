import { Play, Pause, RotateCcw } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';

export default function Timer() {
    // On ne stocke plus juste les secondes, mais le temps écoulé total
    const [elapsed, setElapsed] = useState(0);
    const [isActive, setIsActive] = useState(false);

    // Refs pour stocker les timestamps sans provoquer de re-rendu inutile
    const startTimeRef = useRef<number | null>(null);
    const savedTimeRef = useRef<number>(0); // Temps accumulé avant la dernière pause

    useEffect(() => {
        let interval: any = null;

        if (isActive) {
            // Si on active, on démarre l'intervalle d'affichage
            interval = setInterval(() => {
                const now = Date.now();
                // Formule : Temps total = (Temps sauvegardé avant pause) + (Temps écoulé depuis le clic sur Play)
                // On divise par 1000 pour avoir des secondes, et Math.floor pour l'entier
                const currentSessionDuration = Math.floor((now - (startTimeRef.current || now)) / 1000);
                setElapsed(savedTimeRef.current + currentSessionDuration);
            }, 1000);
        } else {
            clearInterval(interval);
        }

        return () => clearInterval(interval);
    }, [isActive]);

    const toggleTimer = () => {
        if (isActive) {
            // PAUSE : On sauvegarde ce qu'on a compté jusqu'ici
            savedTimeRef.current = elapsed;
            setIsActive(false);
        } else {
            // PLAY : On marque le top départ
            startTimeRef.current = Date.now();
            setIsActive(true);
        }
    };

    const resetTimer = () => {
        setIsActive(false);
        setElapsed(0);
        savedTimeRef.current = 0;
        startTimeRef.current = null;
    };

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
                        onClick={resetTimer}
                        className="absolute -right-8 p-1 text-zinc-600 hover:text-red-400 transition animate-fade-in"
                        title="Réinitialiser"
                    >
                        <RotateCcw size={14} />
                    </button>
                )}
            </div>

            {/* Bouton Play / Pause avec effet visuel */}
            <button
                onClick={toggleTimer}
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