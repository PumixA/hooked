import type { YoutubeStepGenerationResult } from '../types/projectSteps';
import { buildStepsFromChapters, buildStepsFromSubtitleCues, parseVttSubtitleCues } from './stepSegmentation';
import { getYoutubeMetadata, getYoutubeSubtitleContent, isValidYoutubeUrl } from './youtubeMetadata';

export async function generateProjectStepsFromYoutube(url: string): Promise<YoutubeStepGenerationResult> {
    const trimmedUrl = url.trim();
    if (!trimmedUrl || !isValidYoutubeUrl(trimmedUrl)) {
        return {
            ok: false,
            reason: 'invalid_url',
            message: 'Le lien fourni n’est pas une URL YouTube valide.',
        };
    }

    try {
        const metadata = await getYoutubeMetadata(trimmedUrl);
        const subtitleContent = await getYoutubeSubtitleContent(trimmedUrl);
        const subtitleCues = subtitleContent ? parseVttSubtitleCues(subtitleContent) : [];

        if (metadata.chapters.length > 0) {
            const steps = buildStepsFromChapters(metadata.chapters, subtitleCues);
            return {
                ok: true,
                video_title: metadata.title,
                source_used: 'chapter',
                confidence: 'high',
                steps,
            };
        }

        if (subtitleCues.length > 0) {
            const steps = buildStepsFromSubtitleCues(subtitleCues);
            if (steps.length > 0) {
                return {
                    ok: true,
                    video_title: metadata.title,
                    source_used: 'subtitle',
                    confidence: 'medium',
                    steps,
                };
            }
        }

        return {
            ok: false,
            reason: 'no_structure_available',
            message: 'La vidéo ne fournit ni chapitres ni sous-titres exploitables.',
        };
    } catch {
        return {
            ok: false,
            reason: 'youtube_fetch_failed',
            message: 'Impossible d’analyser cette vidéo YouTube pour le moment.',
        };
    }
}
