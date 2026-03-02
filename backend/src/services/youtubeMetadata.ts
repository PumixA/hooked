import { execFile } from 'child_process';
import { promises as fs } from 'fs';
import os from 'os';
import path from 'path';
import { promisify } from 'util';
import type { YoutubeMetadata, YoutubeChapter } from '../types/projectSteps';

const execFileAsync = promisify(execFile);
const YTDLP_TIMEOUT_MS = 30_000;
const YTDLP_MAX_BUFFER = 10 * 1024 * 1024;
const SUBTITLE_LANGS = 'fr.*,fr,en.*,en';

interface RawYoutubeChapter {
    title?: string;
    start_time?: number;
    end_time?: number;
}

interface RawYoutubeMetadata {
    id?: string;
    title?: string;
    chapters?: RawYoutubeChapter[];
}

function normalizeNumber(value: unknown): number | null {
    if (typeof value !== 'number' || !Number.isFinite(value)) return null;
    return value;
}

function normalizeTitle(value: unknown, fallback: string): string {
    if (typeof value !== 'string') return fallback;
    const trimmed = value.trim();
    return trimmed || fallback;
}

function normalizeChapters(rawChapters: RawYoutubeChapter[] | undefined): YoutubeChapter[] {
    if (!Array.isArray(rawChapters)) return [];

    return rawChapters
        .map((chapter, index) => {
            const startSeconds = normalizeNumber(chapter.start_time);
            const endSeconds = normalizeNumber(chapter.end_time);
            if (startSeconds === null || startSeconds < 0) return null;

            const normalizedChapter: YoutubeChapter = {
                title: normalizeTitle(chapter.title, `Étape ${index + 1}`),
                start_seconds: startSeconds,
            };

            if (endSeconds !== null && endSeconds > startSeconds) {
                normalizedChapter.end_seconds = endSeconds;
            }

            return normalizedChapter;
        })
        .filter((chapter): chapter is YoutubeChapter => chapter !== null);
}

async function runYtDlp(args: string[]): Promise<string> {
    try {
        const { stdout } = await execFileAsync('yt-dlp', args, {
            timeout: YTDLP_TIMEOUT_MS,
            maxBuffer: YTDLP_MAX_BUFFER,
        });
        return stdout;
    } catch (error) {
        const message = error instanceof Error ? error.message : 'yt-dlp execution failed';
        throw new Error(message);
    }
}

export function isValidYoutubeUrl(value: string): boolean {
    try {
        const parsed = new URL(value);
        const host = parsed.hostname.replace(/^www\./, '').toLowerCase();
        return host === 'youtube.com' || host === 'm.youtube.com' || host === 'youtu.be';
    } catch {
        return false;
    }
}

export async function getYoutubeMetadata(url: string): Promise<YoutubeMetadata> {
    const stdout = await runYtDlp([
        '--skip-download',
        '--no-warnings',
        '--dump-single-json',
        url,
    ]);

    const raw = JSON.parse(stdout) as RawYoutubeMetadata;
    const title = normalizeTitle(raw.title, 'Vidéo YouTube');
    const id = normalizeTitle(raw.id, 'youtube-video');

    return {
        id,
        title,
        chapters: normalizeChapters(raw.chapters),
    };
}

function pickPreferredSubtitleFile(files: string[]): string | null {
    const priorities = [
        /\.fr(?:[-_].+)?\.vtt$/i,
        /\.en(?:[-_].+)?\.vtt$/i,
        /\.vtt$/i,
    ];

    for (const pattern of priorities) {
        const found = files.find((file) => pattern.test(file));
        if (found) return found;
    }

    return null;
}

export async function getYoutubeSubtitleContent(url: string): Promise<string | null> {
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'hooked-youtube-'));

    try {
        try {
            await runYtDlp([
                '--skip-download',
                '--no-warnings',
                '--write-subs',
                '--write-auto-subs',
                '--sub-langs',
                SUBTITLE_LANGS,
                '--sub-format',
                'vtt',
                '--paths',
                tempDir,
                '-o',
                '%(id)s.%(ext)s',
                url,
            ]);
        } catch (error) {
            const message = error instanceof Error ? error.message.toLowerCase() : '';
            const isRecoverable =
                message.includes('subtitle') ||
                message.includes('subtitles') ||
                message.includes('requested format not available');

            if (!isRecoverable) {
                throw error;
            }
        }

        const files = await fs.readdir(tempDir);
        const subtitleFile = pickPreferredSubtitleFile(files);
        if (!subtitleFile) return null;

        return await fs.readFile(path.join(tempDir, subtitleFile), 'utf-8');
    } finally {
        await fs.rm(tempDir, { recursive: true, force: true });
    }
}
