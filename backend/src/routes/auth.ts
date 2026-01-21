/// <reference path="../types/fastify-jwt.d.ts" />
import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import bcrypt from 'bcrypt';
import { prisma } from '../index';

// --- Schémas de Validation (Zod) ---

const registerSchema = z.object({
    email: z.string().email("Format d'email invalide"),
    password: z.string().min(6, "Le mot de passe doit faire au moins 6 caractères")
});

const loginSchema = z.object({
    email: z.string().email("Format d'email invalide"),
    password: z.string().min(1, "Mot de passe requis")
});

export async function authRoutes(server: FastifyInstance) {

    // ---------------------------------------------------------
    // ROUTE : INSCRIPTION (POST /auth/register)
    // ---------------------------------------------------------
    server.post('/register', async (request, reply) => {
        // 1. Validation des données
        const result = registerSchema.safeParse(request.body);

        if (!result.success) {
            return reply.code(400).send({
                error: "Données invalides",
                details: result.error.issues // Utilisation de .issues pour Zod
            });
        }

        const { email, password } = result.data;

        try {
            // 2. Vérifier si l'email existe déjà
            const existingUser = await prisma.users.findUnique({
                where: { email: email }
            });

            if (existingUser) {
                return reply.code(409).send({ error: "Cet email est déjà utilisé." });
            }

            // 3. Hachage du mot de passe
            const passwordHash = await bcrypt.hash(password, 10);

            // 4. Création de l'utilisateur
            const newUser = await prisma.users.create({
                data: {
                    email: email,
                    password_hash: passwordHash,
                    role: 'user' // Par défaut
                },
                select: {
                    id: true,
                    email: true,
                    role: true,
                    created_at: true
                }
            });

            server.log.info(`Nouvel utilisateur inscrit : ${email}`);
            return reply.code(201).send({
                message: "Inscription réussie !",
                user: newUser
            });

        } catch (error) {
            server.log.error(error);
            return reply.code(500).send({ error: "Erreur serveur interne" });
        }
    });

    // ---------------------------------------------------------
    // ROUTE : CONNEXION (POST /auth/login)
    // ---------------------------------------------------------
    server.post('/login', async (request, reply) => {
        // 1. Validation des entrées
        const result = loginSchema.safeParse(request.body);

        if (!result.success) {
            return reply.code(400).send({ error: "Données invalides" });
        }

        const { email, password } = result.data;

        try {
            // 2. Recherche de l'utilisateur
            const user = await prisma.users.findUnique({ where: { email } });

            if (!user) {
                return reply.code(401).send({ error: "Email ou mot de passe incorrect" });
            }

            // 3. Vérification du mot de passe
            const validPassword = await bcrypt.compare(password, user.password_hash);
            if (!validPassword) {
                return reply.code(401).send({ error: "Email ou mot de passe incorrect" });
            }

            // 4. Génération du Token JWT
            const token = server.jwt.sign({
                id: user.id,
                email: user.email,
                // CORRECTION ICI : Si le rôle est null, on force 'user'
                role: user.role || 'user'
            });

            // 5. Réponse
            return reply.send({
                token: token,
                user: {
                    id: user.id,
                    email: user.email,
                    theme_pref: user.theme_pref,
                    role: user.role
                }
            });

        } catch (error) {
            server.log.error(error);
            return reply.code(500).send({ error: "Erreur serveur interne" });
        }
    });
}