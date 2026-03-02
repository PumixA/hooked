import type { ProjectStepConfidence } from '../types/projectSteps';

export function getConfidenceForSource(source: 'chapter' | 'subtitle'): Extract<ProjectStepConfidence, 'high' | 'medium'> {
    return source === 'chapter' ? 'high' : 'medium';
}

export function getConfidenceForSubtitleText(textLength: number): ProjectStepConfidence {
    if (textLength >= 180) return 'high';
    if (textLength >= 80) return 'medium';
    return 'low';
}
