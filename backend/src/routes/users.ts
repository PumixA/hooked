/// <reference path="../types/fastify-jwt.d.ts" />
import { FastifyInstance } from 'fastify';
import { prisma } from '../index';

export async function usersRoutes(server: FastifyInstance) {

    // ROUTE : Mon Profil (GET /users/me)
    // 🔒 Protégée par le middleware [server.authenticate]
    server.get('/me', {
        onRequest: [server.authenticate]
    }, async (request, reply) => {

        try {
            // request.user est disponible car le token a été validé !
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
                    // ⚠️ IMPORTANT : On ne sélectionne PAS password_hash
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
}