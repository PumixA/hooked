import type {
    GeneratedProjectStep,
    ProjectStepConfidence,
    SubtitleCue,
    YoutubeChapter,
} from '../types/projectSteps';
import { getConfidenceForSource, getConfidenceForSubtitleText } from './stepConfidence';

const TRANSITION_MARKERS = [
    'maintenant',
    'ensuite',
    'puis',
    'on passe a',
    'on passe à',
    'pour la suite',
    'on va faire',
];

const DOMAIN_KEYWORDS: Array<{ keyword: string; title: string }> = [
    { keyword: 'chainette', title: 'Monter les mailles' },
    { keyword: 'maille serree', title: 'Travailler en mailles serrées' },
    { keyword: 'maille serrée', title: 'Travailler en mailles serrées' },
    { keyword: 'augmentation', title: 'Faire les augmentations' },
    { keyword: 'diminution', title: 'Faire les diminutions' },
    { keyword: 'tour', title: 'Continuer le tour' },
    { keyword: 'rang', title: 'Travailler le rang' },
    { keyword: 'bordure', title: 'Réaliser la bordure' },
    { keyword: 'assemblage', title: 'Assembler les pièces' },
    { keyword: 'finition', title: 'Faire les finitions' },
    { keyword: 'manche', title: 'Travailler les manches' },
    { keyword: 'corps', title: 'Travailler le corps' },
];

const MIN_SEGMENT_SECONDS = 20;
const MAX_SEGMENT_SECONDS = 120;
const HARD_SPLIT_GAP_SECONDS = 6;
const MAX_TITLE_LENGTH = 80;
const MAX_INSTRUCTION_LENGTH = 500;

interface SubtitleSegment {
    start_seconds: number;
    end_seconds: number;
    text: string;
}

function truncate(value: string, maxLength: number): string {
    if (value.length <= maxLength) return value;
    return `${value.slice(0, Math.max(0, maxLength - 1)).trim()}…`;
}

function normalizeWhitespace(value: string): string {
    return value
        .replace(/<[^>]+>/g, ' ')
        .replace(/&nbsp;/gi, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}

function sanitizeSentence(value: string): string {
    const normalized = normalizeWhitespace(value);
    if (!normalized) return '';
    return normalized.replace(/^[-–—\s]+/, '').trim();
}

function sanitizeVttTime(raw: string): number | null {
    const match = raw.trim().match(/(?:(\d+):)?(\d{2}):(\d{2})\.(\d{3})/);
    if (!match) return null;

    const hours = match[1] ? parseInt(match[1], 10) : 0;
    const minutes = parseInt(match[2], 10);
    const seconds = parseInt(match[3], 10);
    const milliseconds = parseInt(match[4], 10);

    if ([hours, minutes, seconds, milliseconds].some((value) => Number.isNaN(value))) return null;

    return (hours * 3600) + (minutes * 60) + seconds + (milliseconds / 1000);
}

function cueTextToSentences(text: string): string[] {
    return text
        .split(/(?<=[.!?])\s+/)
        .map(sanitizeSentence)
        .filter(Boolean);
}

function createFallbackInstruction(title: string): string {
    return truncate(`Étape générée à partir de "${title}".`, MAX_INSTRUCTION_LENGTH);
}

export function parseVttSubtitleCues(content: string): SubtitleCue[] {
    const cues: SubtitleCue[] = [];
    const lines = content.replace(/\r/g, '').split('\n');

    let index = 0;
    while (index < lines.length) {
        const line = lines[index].trim();
        if (!line || line === 'WEBVTT' || line.startsWith('NOTE') || line.startsWith('STYLE')) {
            index += 1;
            continue;
        }

        if (!line.includes('-->')) {
            index += 1;
            continue;
        }

        const [rawStart, rawEnd] = line.split('-->').map((part) => part.trim().split(' ')[0]);
        const start = sanitizeVttTime(rawStart);
        const end = sanitizeVttTime(rawEnd);
        index += 1;

        if (start === null || end === null || end <= start) {
            continue;
        }

        const textLines: string[] = [];
        while (index < lines.length && lines[index].trim()) {
            textLines.push(lines[index].trim());
            index += 1;
        }

        const text = normalizeWhitespace(textLines.join(' '));
        if (!text) continue;

        cues.push({
            start_seconds: start,
            end_seconds: end,
            text,
        });
    }

    return cues;
}

function containsTransitionMarker(text: string): boolean {
    const lower = text.toLowerCase();
    return TRANSITION_MARKERS.some((marker) => lower.includes(marker));
}

function buildSubtitleSegments(cues: SubtitleCue[]): SubtitleSegment[] {
    if (cues.length === 0) return [];

    const segments: SubtitleSegment[] = [];
    let current: SubtitleSegment | null = null;

    for (const cue of cues) {
        if (!current) {
            current = {
                start_seconds: cue.start_seconds,
                end_seconds: cue.end_seconds,
                text: cue.text,
            };
            continue;
        }

        const gap = cue.start_seconds - current.end_seconds;
        const projectedDuration = cue.end_seconds - current.start_seconds;
        const shouldSplitForGap = gap >= HARD_SPLIT_GAP_SECONDS;
        const shouldSplitForDuration = projectedDuration > MAX_SEGMENT_SECONDS;
        const shouldSplitForMarker =
            projectedDuration >= MIN_SEGMENT_SECONDS &&
            containsTransitionMarker(cue.text);

        if (shouldSplitForGap || shouldSplitForDuration || shouldSplitForMarker) {
            segments.push(current);
            current = {
                start_seconds: cue.start_seconds,
                end_seconds: cue.end_seconds,
                text: cue.text,
            };
            continue;
        }

        current = {
            start_seconds: current.start_seconds,
            end_seconds: cue.end_seconds,
            text: `${current.text} ${cue.text}`.trim(),
        };
    }

    if (current) {
        segments.push(current);
    }

    return segments;
}

function buildStepTitleFromText(text: string, fallbackIndex: number): string {
    const normalized = normalizeWhitespace(text);
    const lower = normalized.toLowerCase();

    for (const { keyword, title } of DOMAIN_KEYWORDS) {
        if (lower.includes(keyword)) {
            return truncate(title, MAX_TITLE_LENGTH);
        }
    }

    const firstSentence = cueTextToSentences(normalized)[0] || normalized;
    let candidate = firstSentence
        .replace(/^(maintenant|ensuite|puis)\s+/i, '')
        .replace(/^(on va faire|on passe a|on passe à)\s+/i, '')
        .trim();

    if (!candidate) {
        return `Étape ${fallbackIndex}`;
    }

    const words = candidate.split(' ').filter(Boolean).slice(0, 8);
    candidate = words.join(' ');

    if (!candidate) {
        return `Étape ${fallbackIndex}`;
    }

    const capitalized = candidate.charAt(0).toUpperCase() + candidate.slice(1);
    return truncate(capitalized, MAX_TITLE_LENGTH);
}

function buildInstructionFromText(text: string, fallbackTitle: string): string {
    const sentences = cueTextToSentences(text);
    if (sentences.length === 0) {
        return createFallbackInstruction(fallbackTitle);
    }

    const summary = sentences.slice(0, 3).join(' ');
    return truncate(summary, MAX_INSTRUCTION_LENGTH);
}

function buildGeneratedStep(params: {
    index: number;
    title: string;
    instruction: string;
    source: 'chapter' | 'subtitle';
    start_seconds?: number;
    end_seconds?: number;
    textLength?: number;
}): GeneratedProjectStep {
    const derivedConfidence: ProjectStepConfidence = params.source === 'chapter'
        ? getConfidenceForSource('chapter')
        : getConfidenceForSubtitleText(params.textLength ?? params.instruction.length);

    return {
        id: `generated-step-${params.index}`,
        title: truncate(params.title.trim() || `Étape ${params.index}`, MAX_TITLE_LENGTH),
        instruction: truncate(params.instruction.trim() || createFallbackInstruction(params.title), MAX_INSTRUCTION_LENGTH),
        current_rows: 0,
        target_rows: null,
        source: params.source,
        confidence: params.source === 'chapter'
            ? 'high'
            : (derivedConfidence === 'high' ? 'high' : 'medium'),
        start_seconds: params.start_seconds,
        end_seconds: params.end_seconds,
    };
}

export function buildStepsFromChapters(
    chapters: YoutubeChapter[],
    cues: SubtitleCue[],
): GeneratedProjectStep[] {
    return chapters.map((chapter, index) => {
        const relevantText = extractTextForRange(cues, chapter.start_seconds, chapter.end_seconds);
        const instruction = relevantText
            ? buildInstructionFromText(relevantText, chapter.title)
            : createFallbackInstruction(chapter.title);

        return buildGeneratedStep({
            index: index + 1,
            title: chapter.title,
            instruction,
            source: 'chapter',
            start_seconds: chapter.start_seconds,
            end_seconds: chapter.end_seconds,
            textLength: relevantText.length,
        });
    });
}

export function buildStepsFromSubtitleCues(cues: SubtitleCue[]): GeneratedProjectStep[] {
    const segments = buildSubtitleSegments(cues);

    return segments.map((segment, index) => {
        const title = buildStepTitleFromText(segment.text, index + 1);
        const instruction = buildInstructionFromText(segment.text, title);

        return buildGeneratedStep({
            index: index + 1,
            title,
            instruction,
            source: 'subtitle',
            start_seconds: segment.start_seconds,
            end_seconds: segment.end_seconds,
            textLength: segment.text.length,
        });
    });
}

export function extractTextForRange(
    cues: SubtitleCue[],
    startSeconds: number,
    endSeconds?: number,
): string {
    const relevant = cues.filter((cue) => {
        const cueStartsAfterStart = cue.end_seconds > startSeconds;
        const cueBeforeEnd = endSeconds === undefined || cue.start_seconds < endSeconds;
        return cueStartsAfterStart && cueBeforeEnd;
    });

    return normalizeWhitespace(relevant.map((cue) => cue.text).join(' '));
}
