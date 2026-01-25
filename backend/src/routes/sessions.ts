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

    // GET /api/sessions/weekly -> Récupérer le temps total de la semaine
    server.get('/weekly', async (request, reply) => {
        const userId = request.user.id;
        
        // Calcul JS robuste du début de semaine (Lundi 00:00)
        const now = new Date();
        const day = now.getDay(); // 0 (Dimanche) à 6 (Samedi)
        
        // Formule pour obtenir le décalage par rapport au Lundi précédent
        // Si Lundi (1) -> diff 0
        // Si Dimanche (0) -> diff 6
        const diffToMonday = (day + 6) % 7;
        
        const startOfWeek = new Date(now);
        startOfWeek.setDate(now.getDate() - diffToMonday);
        startOfWeek.setHours(0, 0, 0, 0);

        console.log(`[Weekly] --------------------------------------------------`);
        console.log(`[Weekly] User ID: ${userId}`);
        console.log(`[Weekly] Date actuelle: ${now.toISOString()}`);
        console.log(`[Weekly] Début semaine calculé (Local): ${startOfWeek.toString()}`);
        console.log(`[Weekly] Début semaine calculé (ISO): ${startOfWeek.toISOString()}`);

        try {
            // On récupère les sessions via Prisma
            const sessions = await prisma.sessions.findMany({
                where: {
                    start_time: {
                        gte: startOfWeek,
                    },
                    projects: {
                        user_id: userId
                    }
                },
                select: {
                    id: true,
                    start_time: true,
                    duration_seconds: true,
                    project_id: true
                }
            });

            console.log(`[Weekly] Sessions trouvées: ${sessions.length}`);
            if (sessions.length > 0) {
                sessions.forEach(s => {
                    console.log(`   - Session ${s.id}: Start=${s.start_time.toISOString()}, Duration=${s.duration_seconds}s, Project=${s.project_id}`);
                });
            } else {
                console.log(`[Weekly] Aucune session trouvée depuis ${startOfWeek.toISOString()}`);
                
                // DEBUG : Vérifions s'il y a des sessions tout court pour cet utilisateur
                const allSessions = await prisma.sessions.findMany({
                    where: { projects: { user_id: userId } },
                    take: 5,
                    orderBy: { start_time: 'desc' },
                    select: { start_time: true, duration_seconds: true }
                });
                console.log(`[Weekly] DEBUG: 5 dernières sessions de l'utilisateur (toutes dates confondues):`);
                allSessions.forEach(s => console.log(`   - ${s.start_time.toISOString()} (${s.duration_seconds}s)`));
            }

            const totalSeconds = sessions.reduce((acc, session) => acc + (session.duration_seconds || 0), 0);
            console.log(`[Weekly] Total calculé: ${totalSeconds} secondes`);
            console.log(`[Weekly] --------------------------------------------------`);

            return { totalSeconds };
        } catch (err) {
            server.log.error(err);
            return reply.code(500).send({ error: "Erreur lors du calcul du temps hebdomadaire" });
        }
    });
}