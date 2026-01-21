import fastify from 'fastify';
import cors from '@fastify/cors';
import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';
import { authRoutes } from './routes/auth';

dotenv.config();

// SIMPLIFICATION : Plus besoin de passer datasources ici.
// Prisma lit automatiquement le .env grâce au schema.prisma
export const prisma = new PrismaClient();

const server = fastify({ logger: true });

const start = async () => {
  try {
    // 1. Plugins Globaux
    await server.register(cors, { origin: '*' });

    // 2. Enregistrement des Routes
    await server.register(authRoutes, { prefix: '/auth' });

    // 3. Route de Santé
    server.get('/', async () => {
      return { status: 'online', system: 'Hooked API 🧶' };
    });

    // Route Categories (Test Prisma)
    server.get('/categories', async () => {
      const categories = await prisma.categories.findMany({ orderBy: { label: 'asc' } });
      return categories;
    });

    // 4. Lancement
    const port = Number(process.env.PORT) || 3000;
    const host = process.env.HOST || '0.0.0.0';

    await server.listen({ port, host });
    console.log(`🚀 Server listening at http://${host}:${port}`);

  } catch (err) {
    server.log.error(err);
    await prisma.$disconnect();
    process.exit(1);
  }
};

start();