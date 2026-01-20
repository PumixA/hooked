import fastify from 'fastify';
import cors from '@fastify/cors';
import postgres from '@fastify/postgres';
import dotenv from 'dotenv';

// 1. Charger les variables d'environnement (.env)
dotenv.config();

const server = fastify({ logger: true });

const start = async () => {
  try {
    // 2. Configurer CORS
    // (Permet au Frontend React sur le port 5173 de parler au Backend sur le 3000)
    await server.register(cors, {
      origin: '*' // ⚠️ À restreindre en production, mais OK pour le dev local
    });

    // 3. Connecter la Base de Données
    // Fastify va gérer le pool de connexion automatiquement
    await server.register(postgres, {
      connectionString: process.env.DATABASE_URL
    });

    // 4. Route de Santé (Health Check)
    server.get('/', async () => {
      return { status: 'online', system: 'Hooked API 🧶' };
    });

    // 5. TA PREMIÈRE VRAIE ROUTE : Récupérer les catégories
    server.get('/categories', async (request, reply) => {
      // On demande une connexion au pool
      const connection = await server.pg.connect();
      try {
        // On exécute la requête SQL brute
        const { rows } = await connection.query(
            'SELECT * FROM categories ORDER BY label ASC'
        );
        // On renvoie directement le tableau JSON
        return rows;
      } finally {
        // IMPORTANT : Toujours libérer la connexion (la rendre au pool)
        connection.release();
      }
    });

    // 6. Lancement du serveur
    const port = Number(process.env.PORT) || 3000;
    const host = process.env.HOST || '0.0.0.0';

    await server.listen({ port, host });
    console.log(`🚀 Server listening at http://${host}:${port}`);

  } catch (err) {
    server.log.error(err);
    process.exit(1);
  }
};

start();