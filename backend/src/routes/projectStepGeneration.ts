/// <reference path="../types/fastify-jwt.d.ts" />
import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { generateProjectStepsFromYoutube } from '../services/youtubeStepGenerator';

const youtubeStepGenerationSchema = z.object({
    url: z.string().min(1, 'Le lien est requis'),
});

export async function projectStepGenerationRoutes(server: FastifyInstance) {
    server.addHook('onRequest', server.authenticate);

    server.post('/from-youtube', async (request, reply) => {
        const result = youtubeStepGenerationSchema.safeParse(request.body);
        if (!result.success) {
            return reply.code(400).send({
                error: 'unavailable',
                reason: 'invalid_url',
                message: 'Le lien fourni n’est pas valide.',
            });
        }

        const generation = await generateProjectStepsFromYoutube(result.data.url);
        if (!generation.ok) {
            const statusCode = generation.reason === 'invalid_url'
                ? 400
                : generation.reason === 'youtube_fetch_failed'
                    ? 503
                    : 422;

            return reply.code(statusCode).send({
                error: 'unavailable',
                reason: generation.reason,
                message: generation.message,
            });
        }

        return reply.code(200).send({
            video_title: generation.video_title,
            source_used: generation.source_used,
            confidence: generation.confidence,
            steps: generation.steps,
        });
    });
}
