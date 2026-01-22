/// <reference path="../types/fastify-jwt.d.ts" />
import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { prisma } from '../index';

// Validation Zod pour la création
const createProjectSchema = z.object({
    title: z.string().min(1, "Le titre est requis"),
    category_id: z.string().uuid().optional(),
    goal_rows: z.number().optional()
});

// Validation Zod pour la mise à jour (PATCH)
const updateProjectSchema = z.object({
    current_row: z.number().optional(),
    status: z.enum(['in_progress', 'completed', 'archived']).optional(),
    goal_rows: z.number().optional(),
    updated_at: z.string().datetime().optional() // Pour la synchro
});

export async function projectsRoutes(server: FastifyInstance) {

    // Sécurisation globale de toutes les routes /projects
    server.addHook('onRequest', server.authenticate);

    // 1. LISTER LES PROJETS (GET /projects)
    server.get('/', async (request, reply) => {
        const userId = request.user.id;

        const projects = await prisma.projects.findMany({
            where: { user_id: userId },
            orderBy: { updated_at: 'desc' },
            include: {
                categories: true
            }
        });

        return projects;
    });

    // 2. CRÉER UN PROJET (POST /projects)
    server.post('/', async (request, reply) => {
        const result = createProjectSchema.safeParse(request.body);
        if (!result.success) return reply.code(400).send(result.error.issues);

        const { title, category_id, goal_rows } = result.data;
        const userId = request.user.id;

        try {
            const newProject = await prisma.projects.create({
                data: {
                    user_id: userId,
                    title,
                    category_id,
                    goal_rows,
                    status: 'in_progress'
                }
            });
            return reply.code(201).send(newProject);
        } catch (err) {
            server.log.error(err);
            return reply.code(500).send({ error: "Erreur lors de la création" });
        }
    });

    // 3. VOIR UN PROJET (GET /projects/:id) <--- C'EST CETTE ROUTE QUI MANQUAIT
    server.get('/:id', async (request, reply) => {
        const { id } = request.params as { id: string };
        const userId = request.user.id;

        const project = await prisma.projects.findFirst({
            where: {
                id: id,
                user_id: userId // Sécurité : on vérifie que c'est bien son projet
            },
            include: {
                categories: true
            }
        });

        if (!project) {
            return reply.code(404).send({ error: "Projet introuvable" });
        }

        return project;
    });

    // 4. METTRE À JOUR UN PROJET (PATCH /projects/:id)
    server.patch('/:id', async (request, reply) => {
        const { id } = request.params as { id: string };
        const result = updateProjectSchema.safeParse(request.body);

        if (!result.success) return reply.code(400).send(result.error.issues);

        // Vérifier que le projet appartient bien à l'utilisateur
        const existing = await prisma.projects.findFirst({
            where: { id, user_id: request.user.id }
        });

        if (!existing) return reply.code(404).send({ error: "Projet introuvable" });

        try {
            const updated = await prisma.projects.update({
                where: { id },
                data: {
                    ...result.data,
                    // Si le frontend envoie une date updated_at (synchro), on la prend, sinon Date.now()
                    updated_at: result.data.updated_at ? result.data.updated_at : new Date()
                }
            });
            return updated;
        } catch (err) {
            server.log.error(err);
            return reply.code(500).send({ error: "Erreur de mise à jour" });
        }
    });
}