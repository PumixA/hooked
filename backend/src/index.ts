import fastify from 'fastify';
import cors from '@fastify/cors';
import postgres from '@fastify/postgres';
import dotenv from 'dotenv';
import { authRoutes } from './routes/auth'; // <--- Import de nos routes

dotenv.config();

const server = fastify({ logger: true });

const start = async () => {
  try {
    // 1. Plugins Globaux
    await server.register(cors, { origin: '*' });
    await server.register(postgres, { connectionString: process.env.DATABASE_URL });

    // 2. Enregistrement des Routes
    // Toutes les routes dans auth.ts seront préfixées par "/auth"
    // Ex: /register devient /auth/register
    await server.register(authRoutes, { prefix: '/auth' });

    // 3. Route de Santé (Toujours utile)
    server.get('/', async () => {
      return { status: 'online', system: 'Hooked API 🧶' };
    });

    // 4. Lancement
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