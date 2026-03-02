export type ProjectStepSource = 'chapter' | 'subtitle' | 'whisper';
export type ProjectStepConfidence = 'high' | 'medium' | 'low';

export interface ProjectStepMetadata {
    source?: ProjectStepSource;
    confidence?: ProjectStepConfidence;
    start_seconds?: number;
    end_seconds?: number;
}

export interface GeneratedProjectStep extends ProjectStepMetadata {
    id: string;
    title: string;
    target_rows: null;
    current_rows: number;
    instruction?: string;
    source: Exclude<ProjectStepSource, 'whisper'>;
    confidence: Extract<ProjectStepConfidence, 'high' | 'medium'>;
}

export interface SubtitleCue {
    start_seconds: number;
    end_seconds: number;
    text: string;
}

export interface YoutubeChapter {
    title: string;
    start_seconds: number;
    end_seconds?: number;
}

export interface YoutubeMetadata {
    id: string;
    title: string;
    chapters: YoutubeChapter[];
}

export interface YoutubeStepGenerationSuccess {
    ok: true;
    video_title: string;
    source_used: 'chapter' | 'subtitle';
    confidence: 'high' | 'medium';
    steps: GeneratedProjectStep[];
}

export interface YoutubeStepGenerationFailure {
    ok: false;
    reason: 'no_structure_available' | 'invalid_url' | 'youtube_fetch_failed';
    message: string;
}

export type YoutubeStepGenerationResult =
    | YoutubeStepGenerationSuccess
    | YoutubeStepGenerationFailure;
