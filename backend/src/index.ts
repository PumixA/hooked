/// <reference path="./types/fastify-jwt.d.ts" />
import fastify, { FastifyRequest, FastifyReply } from 'fastify';
import cors from '@fastify/cors';
import jwt from '@fastify/jwt';
import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';
import { authRoutes } from './routes/auth';
import { usersRoutes } from './routes/users';
import { projectsRoutes } from './routes/projects'; // <--- AJOUT
import { materialsRoutes } from './routes/materials'; // <--- AJOUT

dotenv.config();

export const prisma = new PrismaClient();

const server = fastify({ logger: true });

const start = async () => {
  try {
    // 1. Plugins Globaux
    await server.register(cors, { origin: '*' });

    // 2. Configuration JWT
    await server.register(jwt, {
      secret: process.env.JWT_SECRET || 'secret_par_defaut_a_changer_absolument'
    });

    // 3. MIDDLEWARE DE SÉCURITÉ (Le Gardien)
    server.decorate("authenticate", async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        await request.jwtVerify();
      } catch (err) {
        reply.send(err);
      }
    });

    // 4. Enregistrement des Routes
    await server.register(authRoutes, { prefix: '/auth' });
    await server.register(usersRoutes, { prefix: '/users' });

    // NOUVELLES ROUTES (HOOK-34)
    await server.register(projectsRoutes, { prefix: '/projects' });
    await server.register(materialsRoutes, { prefix: '/materials' });

    // 5. Routes API Publiques / Utilitaires
    server.get('/', async () => {
      return { status: 'online', system: 'Hooked API 🧶' };
    });

    server.get('/categories', async () => {
      const categories = await prisma.categories.findMany({ orderBy: { label: 'asc' } });
      return categories;
    });

    // 6. Lancement
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