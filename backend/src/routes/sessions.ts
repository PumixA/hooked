import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { prisma } from '../index';

const createSessionSchema = z.object({
    project_id: z.string().uuid(),
    start_time: z.string().datetime(),
    end_time: z.string().datetime(),
    duration_seconds: z.number().int().positive()
});

export async function sessionsRoutes(server: FastifyInstance) {

    // Protection par JWT
    server.addHook('onRequest', server.authenticate);

    // POST /api/sessions -> Créer une session
    server.post('/', async (request, reply) => {
        const result = createSessionSchema.safeParse(request.body);

        if (!result.success) {
            return reply.code(400).send(result.error.issues);
        }

        const { project_id, start_time, end_time, duration_seconds } = result.data;
        const userId = request.user.id;

        // 1. Vérification : Le projet appartient-il bien à l'utilisateur ?
        const project = await prisma.projects.findFirst({
            where: {
                id: project_id,
                user_id: userId
            }
        });

        if (!project) {
            return reply.code(403).send({ error: "Projet introuvable ou accès interdit" });
        }

        // 2. Création de la session
        try {
            const session = await prisma.sessions.create({
                data: {
                    project_id,
                    start_time,
                    end_time,
                    duration_seconds
                }
            });
            return reply.code(201).send(session);
        } catch (err) {
            server.log.error(err);
            return reply.code(500).send({ error: "Erreur lors de la sauvegarde de la session" });
        }
    });
}