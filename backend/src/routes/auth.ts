import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import bcrypt from 'bcrypt';
import { prisma } from '../index';

const registerSchema = z.object({
    email: z.string().email("Format d'email invalide"),
    password: z.string().min(6, "Le mot de passe doit faire au moins 6 caractères")
});

export async function authRoutes(server: FastifyInstance) {

    server.post('/register', async (request, reply) => {
        // A. Validation avec safeParse (Plus robuste que try/catch)
        const result = registerSchema.safeParse(request.body);

        // Si la validation échoue, on arrête tout de suite
        if (!result.success) {
            return reply.code(400).send({
                error: "Données invalides",
                details: result.error.issues // Ici TypeScript est content !
            });
        }

        // On récupère les données validées
        const { email, password } = result.data;

        try {
            // B. Vérifier si l'email existe déjà
            const existingUser = await prisma.users.findUnique({ where: { email } });

            if (existingUser) {
                return reply.code(409).send({ error: "Cet email est déjà utilisé." });
            }

            // C. Hachage du mot de passe
            const passwordHash = await bcrypt.hash(password, 10);

            // D. Insertion
            const newUser = await prisma.users.create({
                data: {
                    email,
                    password_hash: passwordHash,
                    role: 'user'
                },
                select: {
                    id: true,
                    email: true,
                    role: true,
                    created_at: true
                }
            });

            // E. Succès
            server.log.info(`Nouvel utilisateur inscrit : ${email}`);
            return reply.code(201).send({
                message: "Inscription réussie ! Bienvenue chez Hooked.",
                user: newUser
            });

        } catch (error) {
            server.log.error(error);
            return reply.code(500).send({ error: "Erreur serveur interne" });
        }
    });
}