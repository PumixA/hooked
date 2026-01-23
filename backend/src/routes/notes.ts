import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { prisma } from '../index';

const noteSchema = z.object({
    project_id: z.string().uuid(),
    content: z.string().optional(),
});

export async function notesRoutes(server: FastifyInstance) {
    server.addHook('onRequest', server.authenticate);

    // GET /notes?project_id=... -> Récupérer la note du projet
    server.get('/', async (request, reply) => {
        const { project_id } = request.query as { project_id: string };
        if (!project_id) return reply.code(400).send({ error: "project_id requis" });

        // Vérif sécurité
        const project = await prisma.projects.findUnique({ where: { id: project_id } });
        if (!project || project.user_id !== request.user.id) {
            return reply.code(403).send({ error: "Interdit" });
        }

        // On cherche la note la plus récente
        const note = await prisma.notes.findFirst({
            where: { project_id },
            orderBy: { updated_at: 'desc' }
        });

        return note || { content: "" }; // Renvoie vide si pas de note
    });

    // POST /notes -> Créer ou Mettre à jour la note
    server.post('/', async (request, reply) => {
        const result = noteSchema.safeParse(request.body);
        if (!result.success) return reply.code(400).send(result.error);

        const { project_id, content } = result.data;
        const userId = request.user.id;

        // Vérif sécurité
        const project = await prisma.projects.findFirst({ where: { id: project_id, user_id: userId } });
        if (!project) return reply.code(403).send({ error: "Interdit" });

        // Stratégie : On cherche s'il existe déjà une note pour ce projet
        const existingNote = await prisma.notes.findFirst({
            where: { project_id }
        });

        if (existingNote) {
            // MISE À JOUR
            const updated = await prisma.notes.update({
                where: { id: existingNote.id },
                data: { content, updated_at: new Date() }
            });
            return updated;
        } else {
            // CRÉATION
            const created = await prisma.notes.create({
                data: {
                    project_id,
                    content: content || ""
                }
            });
            return reply.code(201).send(created);
        }
    });
}