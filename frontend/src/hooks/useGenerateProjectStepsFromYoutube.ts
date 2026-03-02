import { useMutation } from '@tanstack/react-query';
import api from '../services/api';
import type { ProjectStep } from '../services/projectSteps';

export interface GenerateProjectStepsFromYoutubeResponse {
    video_title: string;
    source_used: 'chapter' | 'subtitle';
    confidence: 'high' | 'medium';
    steps: ProjectStep[];
}

export function useGenerateProjectStepsFromYoutube() {
    return useMutation({
        mutationFn: async (url: string) => {
            const response = await api.post<GenerateProjectStepsFromYoutubeResponse>('/projects/steps/from-youtube', { url });
            return response.data;
        },
    });
}
