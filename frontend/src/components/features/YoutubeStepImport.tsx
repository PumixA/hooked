import { useEffect, useState } from 'react';
import axios from 'axios';
import Button from '../ui/Button';
import Input from '../ui/Input';
import { useGenerateProjectStepsFromYoutube } from '../../hooks/useGenerateProjectStepsFromYoutube';
import {
    sanitizeProjectSteps,
    type ProjectStep,
    type ProjectStepConfidence,
} from '../../services/projectSteps';
import { getOfflineMode } from '../../services/api';

type ApplyMode = 'replace' | 'append';

interface YoutubeStepImportProps {
    onApply: (steps: ProjectStep[], mode: ApplyMode) => void;
    allowAppend?: boolean;
    debugContext?: 'project-create' | 'project-detail';
}

function getConfidenceLabel(confidence: ProjectStepConfidence | 'high' | 'medium' | undefined): string {
    switch (confidence) {
        case 'high':
            return 'Fiabilité élevée';
        case 'medium':
            return 'À vérifier';
        case 'low':
            return 'Fiabilité faible';
        default:
            return 'Brouillon généré';
    }
}

function formatTimestamp(seconds?: number): string {
    if (typeof seconds !== 'number' || seconds < 0) return '';

    const totalSeconds = Math.floor(seconds);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const remainingSeconds = totalSeconds % 60;

    if (hours > 0) {
        return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
    }

    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
}

export default function YoutubeStepImport({
    onApply,
    allowAppend = false,
    debugContext = 'project-detail',
}: YoutubeStepImportProps) {
    const [youtubeUrl, setYoutubeUrl] = useState('');
    const [draftSteps, setDraftSteps] = useState<ProjectStep[]>([]);
    const [videoTitle, setVideoTitle] = useState('');
    const [resultConfidence, setResultConfidence] = useState<'high' | 'medium' | undefined>(undefined);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [applyMode, setApplyMode] = useState<ApplyMode>('replace');
    const [isNetworkOffline, setIsNetworkOffline] = useState(!navigator.onLine);

    const generateMutation = useGenerateProjectStepsFromYoutube();
    const isOffline = isNetworkOffline || getOfflineMode();

    useEffect(() => {
        const handleOnline = () => setIsNetworkOffline(false);
        const handleOffline = () => setIsNetworkOffline(true);

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);

    useEffect(() => {
        console.log('[YouTubeStepImport] Network state updated', {
            context: debugContext,
            navigatorOnline: navigator.onLine,
            isNetworkOffline,
            apiOfflineMode: getOfflineMode(),
            effectiveOffline: isOffline,
        });
    }, [debugContext, isNetworkOffline, isOffline]);

    const clearDraft = () => {
        console.log('[YouTubeStepImport] Clearing generated draft', {
            context: debugContext,
            currentVideoTitle: videoTitle,
            currentDraftStepCount: draftSteps.length,
        });
        setDraftSteps([]);
        setVideoTitle('');
        setResultConfidence(undefined);
        setErrorMessage(null);
    };

    const updateStep = (stepIndex: number, patch: Partial<ProjectStep>) => {
        setDraftSteps((prev) => prev.map((step, index) => {
            if (index !== stepIndex) return step;

            return {
                ...step,
                ...patch,
            };
        }));
    };

    const removeStep = (stepIndex: number) => {
        console.log('[YouTubeStepImport] Removing generated draft step', {
            context: debugContext,
            stepIndex,
            removedStep: draftSteps[stepIndex],
        });
        setDraftSteps((prev) => prev.filter((_, index) => index !== stepIndex));
    };

    const handleAnalyze = () => {
        const normalizedUrl = youtubeUrl.trim();
        if (!normalizedUrl || generateMutation.isPending) {
            console.log('[YouTubeStepImport] Analysis skipped', {
                context: debugContext,
                hasUrl: Boolean(normalizedUrl),
                isPending: generateMutation.isPending,
                isOffline,
            });
            return;
        }

        setErrorMessage(null);
        console.log('[YouTubeStepImport] Starting YouTube analysis', {
            context: debugContext,
            url: normalizedUrl,
            allowAppend,
            isOffline,
        });

        generateMutation.mutate(normalizedUrl, {
            onSuccess: (response) => {
                const sanitizedSteps = sanitizeProjectSteps(response.steps);
                console.log('[YouTubeStepImport] Analysis success', {
                    context: debugContext,
                    url: normalizedUrl,
                    videoTitle: response.video_title,
                    sourceUsed: response.source_used,
                    confidence: response.confidence,
                    rawStepCount: response.steps.length,
                    sanitizedStepCount: sanitizedSteps.length,
                    firstStep: sanitizedSteps[0],
                });
                setVideoTitle(response.video_title);
                setResultConfidence(response.confidence);
                setDraftSteps(sanitizedSteps);
            },
            onError: (error) => {
                setDraftSteps([]);
                setVideoTitle('');
                setResultConfidence(undefined);

                if (axios.isAxiosError<{ message?: string }>(error)) {
                    console.log('[YouTubeStepImport] Analysis failed with axios error', {
                        context: debugContext,
                        url: normalizedUrl,
                        status: error.response?.status,
                        responseData: error.response?.data,
                        message: error.message,
                    });
                    setErrorMessage(error.response?.data?.message || 'Impossible d’analyser cette vidéo.');
                    return;
                }

                console.log('[YouTubeStepImport] Analysis failed with unknown error', {
                    context: debugContext,
                    url: normalizedUrl,
                    error,
                });
                setErrorMessage(error instanceof Error ? error.message : 'Impossible d’analyser cette vidéo.');
            },
        });
    };

    const handleApply = () => {
        const normalizedSteps = sanitizeProjectSteps(draftSteps);
        if (normalizedSteps.length === 0) {
            console.log('[YouTubeStepImport] Apply skipped because draft is empty', {
                context: debugContext,
                applyMode,
            });
            return;
        }

        console.log('[YouTubeStepImport] Applying generated draft', {
            context: debugContext,
            applyMode,
            videoTitle,
            stepCount: normalizedSteps.length,
            firstStep: normalizedSteps[0],
        });
        onApply(normalizedSteps, applyMode);
    };

    return (
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-4 space-y-4">
            <div className="space-y-1">
                <h3 className="text-sm font-semibold text-white">Importer des étapes depuis YouTube</h3>
                <p className="text-xs text-zinc-400">
                    Collez un lien YouTube pour générer un brouillon d’étapes, puis relisez-le avant de l’utiliser.
                </p>
            </div>

            <Input
                label="Lien YouTube"
                value={youtubeUrl}
                onChange={(event) => setYoutubeUrl(event.target.value)}
                placeholder="https://www.youtube.com/watch?v=..."
            />

            {isOffline && (
                <p className="text-xs text-amber-400">
                    Connexion requise pour analyser une vidéo YouTube.
                </p>
            )}

            {errorMessage && (
                <p className="text-xs text-red-400">
                    {errorMessage}
                </p>
            )}

            <div className="flex gap-3">
                <Button
                    type="button"
                    variant="secondary"
                    onClick={handleAnalyze}
                    isLoading={generateMutation.isPending}
                    disabled={isOffline || !youtubeUrl.trim()}
                    className="flex-1"
                >
                    Analyser la vidéo
                </Button>
                <Button
                    type="button"
                    variant="ghost"
                    onClick={clearDraft}
                    disabled={draftSteps.length === 0 && !videoTitle}
                    className="w-auto px-4"
                >
                    Effacer
                </Button>
            </div>

            {draftSteps.length > 0 && (
                <div className="space-y-4">
                    <div className="rounded-xl border border-zinc-700 bg-zinc-800/50 p-3">
                        <p className="text-xs uppercase tracking-wide text-zinc-400">Vidéo analysée</p>
                        <p className="text-sm font-semibold text-white mt-1">{videoTitle}</p>
                        <span className="inline-flex mt-2 rounded-full border border-zinc-600 px-3 py-1 text-[11px] font-semibold text-zinc-300">
                            {getConfidenceLabel(resultConfidence)}
                        </span>
                    </div>

                    {allowAppend && (
                        <div className="grid grid-cols-2 gap-2">
                            <button
                                type="button"
                                onClick={() => setApplyMode('replace')}
                                className={`rounded-xl border px-3 py-2 text-sm font-semibold transition ${
                                    applyMode === 'replace'
                                        ? 'border-primary bg-primary/10 text-primary'
                                        : 'border-zinc-700 bg-zinc-800 text-zinc-300'
                                }`}
                            >
                                Remplacer
                            </button>
                            <button
                                type="button"
                                onClick={() => setApplyMode('append')}
                                className={`rounded-xl border px-3 py-2 text-sm font-semibold transition ${
                                    applyMode === 'append'
                                        ? 'border-primary bg-primary/10 text-primary'
                                        : 'border-zinc-700 bg-zinc-800 text-zinc-300'
                                }`}
                            >
                                Ajouter à la suite
                            </button>
                        </div>
                    )}

                    <div className="space-y-3 max-h-[45vh] overflow-y-auto pr-1">
                        {draftSteps.map((step, index) => (
                            <div key={step.id} className="rounded-xl border border-zinc-700 bg-zinc-900/50 p-3 space-y-2">
                                <div className="flex items-center justify-between gap-2">
                                    <span className="text-[11px] font-bold uppercase tracking-wide text-zinc-400">
                                        Étape {index + 1}
                                    </span>
                                    <button
                                        type="button"
                                        onClick={() => removeStep(index)}
                                        className="text-xs text-red-400 hover:text-red-300"
                                    >
                                        Retirer
                                    </button>
                                </div>

                                <Input
                                    value={step.title}
                                    onChange={(event) => updateStep(index, { title: event.target.value })}
                                    placeholder="Titre de l’étape"
                                />

                                <textarea
                                    value={step.instruction || ''}
                                    onChange={(event) => updateStep(index, { instruction: event.target.value })}
                                    placeholder="Description"
                                    className="w-full min-h-24 rounded-xl border border-zinc-700 bg-zinc-800/60 p-3 text-sm text-white resize-none"
                                />

                                <div className="flex flex-wrap gap-2 text-[11px] text-zinc-400">
                                    {step.source && (
                                        <span className="rounded-full border border-zinc-700 px-2 py-1">
                                            Source: {step.source}
                                        </span>
                                    )}
                                    {step.confidence && (
                                        <span className="rounded-full border border-zinc-700 px-2 py-1">
                                            {getConfidenceLabel(step.confidence)}
                                        </span>
                                    )}
                                    {(typeof step.start_seconds === 'number' || typeof step.end_seconds === 'number') && (
                                        <span className="rounded-full border border-zinc-700 px-2 py-1">
                                            {formatTimestamp(step.start_seconds)}{step.end_seconds !== undefined ? ` -> ${formatTimestamp(step.end_seconds)}` : ''}
                                        </span>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>

                    <Button type="button" onClick={handleApply} disabled={draftSteps.length === 0}>
                        Utiliser ces étapes
                    </Button>
                </div>
            )}
        </div>
    );
}
