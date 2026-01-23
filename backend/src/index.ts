/// <reference path="./types/fastify-jwt.d.ts" />
import fastify, { FastifyRequest, FastifyReply } from 'fastify';
import cors from '@fastify/cors';
import jwt from '@fastify/jwt';
import multipart from '@fastify/multipart'; // <--- AJOUT
import fastifyStatic from '@fastify/static'; // <--- AJOUT
import path from 'path'; // <--- AJOUT
import fs from 'fs'; // <--- AJOUT
import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';
import { authRoutes } from './routes/auth';
import { usersRoutes } from './routes/users';
import { projectsRoutes } from './routes/projects';
import { materialsRoutes } from './routes/materials';
import { sessionsRoutes } from './routes/sessions';
import { photosRoutes } from './routes/photos'; // <--- AJOUT IMPORT

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

    // --- GESTION DES FICHIERS (HOOK-52) ---

    // A. Plugin Multipart (pour recevoir les fichiers)
    await server.register(multipart, {
      limits: {
        fileSize: 5 * 1024 * 1024, // Limite à 5MB par image
      }
    });

    // B. Création du dossier 'uploads' s'il n'existe pas
    const uploadDir = path.join(__dirname, '../uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir);
    }

    // C. Plugin Static (pour servir les images via HTTP)
    // Les images seront accessibles via : http://localhost:3000/uploads/nom_image.jpg
    await server.register(fastifyStatic, {
      root: uploadDir,
      prefix: '/uploads/',
    });

    // ---------------------------------------

    // 3. MIDDLEWARE DE SÉCURITÉ
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
    await server.register(projectsRoutes, { prefix: '/projects' });
    await server.register(materialsRoutes, { prefix: '/materials' });
    await server.register(sessionsRoutes, { prefix: '/sessions' });

    // NOUVELLE ROUTE PHOTOS (HOOK-52)
    await server.register(photosRoutes, { prefix: '/photos' });

    // 5. Routes Publiques
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