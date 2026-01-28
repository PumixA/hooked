/// <reference path="../types/fastify-jwt.d.ts" />
import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { prisma } from '../index';

const updateUserSchema = z.object({
    theme_pref: z.enum(['dark', 'light', 'warm']).optional()
});

export async function usersRoutes(server: FastifyInstance) {

    // ROUTE : Mon Profil (GET /users/me)
    server.get('/me', {
        onRequest: [server.authenticate]
    }, async (request, reply) => {

        try {
            const userId = request.user.id;

            const user = await prisma.users.findUnique({
                where: { id: userId },
                select: {
                    id: true,
                    email: true,
                    role: true,
                    theme_pref: true,
                    created_at: true,
                    updated_at: true
                }
            });

            if (!user) {
                return reply.code(404).send({ error: "Utilisateur introuvable" });
            }

            return user;

        } catch (error) {
            server.log.error(error);
            return reply.code(500).send({ error: "Erreur serveur" });
        }
    });

    // ROUTE : Mettre a jour profil (PATCH /users/me)
    server.patch('/me', {
        onRequest: [server.authenticate]
    }, async (request, reply) => {

        const result = updateUserSchema.safeParse(request.body);
        if (!result.success) {
            return reply.code(400).send(result.error.issues);
        }

        try {
            const userId = request.user.id;

            const updated = await prisma.users.update({
                where: { id: userId },
                data: {
                    ...result.data,
                    updated_at: new Date()
                },
                select: {
                    id: true,
                    email: true,
                    theme_pref: true
                }
            });

            return updated;

        } catch (error) {
            server.log.error(error);
            return reply.code(500).send({ error: "Erreur serveur" });
        }
    });
}