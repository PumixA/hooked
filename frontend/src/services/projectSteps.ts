export type ProjectStepSource = 'chapter' | 'subtitle' | 'whisper';
export type ProjectStepConfidence = 'high' | 'medium' | 'low';

export interface ProjectStep {
  id: string;
  title: string;
  target_rows?: number | null;
  current_rows: number;
  instruction?: string;
  source?: ProjectStepSource;
  confidence?: ProjectStepConfidence;
  start_seconds?: number;
  end_seconds?: number;
}

function toFiniteNumber(value: unknown): number | null {
  if (typeof value !== 'number' || !Number.isFinite(value)) return null;
  return value;
}

function isProjectStepSource(value: unknown): value is ProjectStepSource {
  return value === 'chapter' || value === 'subtitle' || value === 'whisper';
}

function isProjectStepConfidence(value: unknown): value is ProjectStepConfidence {
  return value === 'high' || value === 'medium' || value === 'low';
}

export function sanitizeProjectSteps(input: unknown): ProjectStep[] {
  if (!Array.isArray(input)) return [];

  return input
    .map((rawStep, index) => {
      if (!rawStep || typeof rawStep !== 'object') return null;

      const source = rawStep as Record<string, unknown>;
      const title = typeof source.title === 'string' ? source.title.trim() : '';
      const targetRows = toFiniteNumber(source.target_rows);
      const currentRows = toFiniteNumber(source.current_rows) ?? 0;
      const instruction = typeof source.instruction === 'string' ? source.instruction.trim() : '';
      const providedId = typeof source.id === 'string' ? source.id.trim() : '';
      const stepSource = isProjectStepSource(source.source) ? source.source : undefined;
      const confidence = isProjectStepConfidence(source.confidence) ? source.confidence : undefined;
      const startSeconds = toFiniteNumber(source.start_seconds);
      const endSeconds = toFiniteNumber(source.end_seconds);

      if (!title) return null;
      const normalizedTargetRows = targetRows && targetRows > 0 ? Math.floor(targetRows) : null;
      const normalizedStartSeconds = startSeconds !== null && startSeconds >= 0 ? startSeconds : undefined;
      const normalizedEndSeconds = endSeconds !== null && endSeconds >= 0 ? endSeconds : undefined;

      return {
        id: providedId || `step-${index + 1}`,
        title,
        target_rows: normalizedTargetRows,
        current_rows: Math.max(0, Math.floor(currentRows)),
        instruction: instruction || undefined,
        source: stepSource,
        confidence,
        start_seconds: normalizedStartSeconds,
        end_seconds: normalizedEndSeconds,
      } as ProjectStep;
    })
    .filter((step): step is ProjectStep => step !== null);
}

export function normalizeActiveStepIndex(index: unknown, steps: ProjectStep[]): number {
  if (steps.length === 0) return 0;
  const parsed = toFiniteNumber(index);
  if (parsed === null) return 0;
  return Math.min(Math.max(Math.floor(parsed), 0), steps.length - 1);
}

export function getTotalRowsFromSteps(steps: ProjectStep[]): number {
  return steps.reduce((acc, step) => acc + (step.current_rows || 0), 0);
}
