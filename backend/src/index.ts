import fastify from 'fastify';
import cors from '@fastify/cors';
import jwt from '@fastify/jwt'; // <--- AJOUT IMPORTANT
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

    // 2. Configuration JWT (JSON Web Token)
    // Cela permet de signer et vérifier les tokens d'authentification
    await server.register(jwt, {
      secret: process.env.JWT_SECRET || 'secret_par_defaut_a_changer_absolument'
    });

    // 3. Enregistrement des Routes
    await server.register(authRoutes, { prefix: '/auth' });

    // 4. Route de Santé
    server.get('/', async () => {
      return { status: 'online', system: 'Hooked API 🧶' };
    });

    // Route Categories (Test Prisma)
    server.get('/categories', async () => {
      const categories = await prisma.categories.findMany({ orderBy: { label: 'asc' } });
      return categories;
    });

    // 5. Lancement
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