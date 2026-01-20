import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import bcrypt from 'bcrypt';

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

        const connection = await server.pg.connect();

        try {
            // B. Vérifier si l'email existe déjà
            const { rowCount } = await connection.query(
                'SELECT 1 FROM users WHERE email = $1',
                [email]
            );

            if (rowCount && rowCount > 0) {
                return reply.code(409).send({ error: "Cet email est déjà utilisé." });
            }

            // C. Hachage du mot de passe
            const passwordHash = await bcrypt.hash(password, 10);

            // D. Insertion
            const { rows } = await connection.query(
                `INSERT INTO users (email, password_hash, role) 
         VALUES ($1, $2, 'user') 
         RETURNING id, email, role, created_at`,
                [email, passwordHash]
            );

            // E. Succès
            server.log.info(`Nouvel utilisateur inscrit : ${email}`);
            return reply.code(201).send({
                message: "Inscription réussie ! Bienvenue chez Hooked.",
                user: rows[0]
            });

        } catch (error) {
            server.log.error(error);
            return reply.code(500).send({ error: "Erreur serveur interne" });
        } finally {
            connection.release();
        }
    });
}