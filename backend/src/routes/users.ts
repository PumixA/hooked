/// <reference path="../types/fastify-jwt.d.ts" />
import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import bcrypt from 'bcrypt';
import { prisma } from '../index';

const updateUserSchema = z.object({
    theme_pref: z.enum(['dark', 'light', 'warm']).optional()
});

const createUserSchema = z.object({
    email: z.string().email("Format d'email invalide"),
    password: z.string().min(6, "Le mot de passe doit faire au moins 6 caractères"),
    role: z.enum(['user', 'admin']).optional().default('user')
});

const adminUpdateUserSchema = z.object({
    email: z.string().email("Format d'email invalide").optional(),
    role: z.enum(['user', 'admin']).optional(),
    password: z.string().min(6, "Le mot de passe doit faire au moins 6 caractères").optional()
});

export async function usersRoutes(server: FastifyInstance) {

    // Middleware de vérification du rôle Admin
    const checkAdmin = async (request: any, reply: any) => {
        if (request.user.role !== 'admin') {
            return reply.code(403).send({ error: "Accès refusé. Rôle administrateur requis." });
        }
    };

    // ---------------------------------------------------------
    // ROUTE : LISTE DES UTILISATEURS (GET /users) - ADMIN ONLY
    // ---------------------------------------------------------
    server.get('/', {
        onRequest: [server.authenticate, checkAdmin]
    }, async (request, reply) => {
        try {
            const users = await prisma.users.findMany({
                select: {
                    id: true,
                    email: true,
                    role: true,
                    theme_pref: true,
                    created_at: true,
                    updated_at: true
                },
                orderBy: { created_at: 'desc' }
            });
            return users;
        } catch (error) {
            server.log.error(error);
            return reply.code(500).send({ error: "Erreur serveur" });
        }
    });

    // ---------------------------------------------------------
    // ROUTE : CRÉER UN UTILISATEUR (POST /users) - ADMIN ONLY
    // ---------------------------------------------------------
    server.post('/', {
        onRequest: [server.authenticate, checkAdmin]
    }, async (request, reply) => {
        const result = createUserSchema.safeParse(request.body);

        if (!result.success) {
            return reply.code(400).send({
                error: "Données invalides",
                details: result.error.issues
            });
        }

        const { email, password, role } = result.data;

        try {
            // Vérifier si l'email existe déjà
            const existingUser = await prisma.users.findUnique({
                where: { email: email }
            });

            if (existingUser) {
                return reply.code(409).send({ error: "Cet email est déjà utilisé." });
            }

            // Hachage du mot de passe
            const passwordHash = await bcrypt.hash(password, 10);

            // Création de l'utilisateur
            const newUser = await prisma.users.create({
                data: {
                    email: email,
                    password_hash: passwordHash,
                    role: role
                },
                select: {
                    id: true,
                    email: true,
                    role: true,
                    created_at: true
                }
            });

            return reply.code(201).send(newUser);

        } catch (error) {
            server.log.error(error);
            return reply.code(500).send({ error: "Erreur serveur interne" });
        }
    });

    // ---------------------------------------------------------
    // ROUTE : DÉTAILS D'UN UTILISATEUR (GET /users/:id) - ADMIN ONLY
    // ---------------------------------------------------------
    server.get('/:id', {
        onRequest: [server.authenticate, checkAdmin]
    }, async (request: any, reply) => {
        const { id } = request.params;

        try {
            const user = await prisma.users.findUnique({
                where: { id },
                select: {
                    id: true,
                    email: true,
                    role: true,
                    theme_pref: true,
                    created_at: true,
                    updated_at: true,
                    // On peut ajouter des stats ici si besoin (nombre de projets, etc.)
                    _count: {
                        select: {
                            projects: true,
                            materials: true
                        }
                    }
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

    // ---------------------------------------------------------
    // ROUTE : MODIFIER UN UTILISATEUR (PATCH /users/:id) - ADMIN ONLY
    // ---------------------------------------------------------
    server.patch('/:id', {
        onRequest: [server.authenticate, checkAdmin]
    }, async (request: any, reply) => {
        const { id } = request.params;
        
        const result = adminUpdateUserSchema.safeParse(request.body);
        if (!result.success) {
            return reply.code(400).send({ error: "Données invalides", details: result.error.issues });
        }

        const { email, role, password } = result.data;

        try {
            // Préparer les données à mettre à jour
            const updateData: any = {
                updated_at: new Date()
            };

            if (email) updateData.email = email;
            if (role) updateData.role = role;
            if (password) {
                updateData.password_hash = await bcrypt.hash(password, 10);
            }

            const updatedUser = await prisma.users.update({
                where: { id },
                data: updateData,
                select: {
                    id: true,
                    email: true,
                    role: true,
                    updated_at: true
                }
            });

            return updatedUser;

        } catch (error: any) {
            // Gestion erreur unicité email
            if (error.code === 'P2002') {
                return reply.code(409).send({ error: "Cet email est déjà utilisé." });
            }
            server.log.error(error);
            return reply.code(500).send({ error: "Erreur serveur" });
        }
    });

    // ---------------------------------------------------------
    // ROUTE : Mon Profil (GET /users/me)
    // ---------------------------------------------------------
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

    // ---------------------------------------------------------
    // ROUTE : Mettre a jour profil (PATCH /users/me)
    // ---------------------------------------------------------
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
