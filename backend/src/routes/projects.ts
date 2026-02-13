/// <reference path="../types/fastify-jwt.d.ts" />
import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { prisma } from '../index';
import util from 'util';
import { pipeline } from 'stream';
import fs from 'fs';
import path from 'path';

const pump = util.promisify(pipeline);

// Validation Zod pour la création
const createProjectSchema = z.object({
    title: z.string().min(1, "Le titre est requis"),
    category_id: z.string().uuid().optional(),
    goal_rows: z.number().optional(),
    current_row: z.number().optional(),
    total_duration: z.number().optional(),
    status: z.enum(['in_progress', 'completed', 'archived']).optional(),
    material_ids: z.array(z.string().uuid()).optional()
});

// Validation Zod pour la mise à jour (PATCH)
const updateProjectSchema = z.object({
    title: z.string().optional(),
    current_row: z.number().optional(),
    status: z.enum(['in_progress', 'completed', 'archived']).optional(),
    goal_rows: z.number().nullable().optional(),
    total_duration: z.number().optional(),
    end_date: z.string().datetime().nullable().optional(), // Permet null pour reprendre un projet
    updated_at: z.string().datetime().optional(),
    material_ids: z.array(z.string().uuid()).optional()
});

export async function projectsRoutes(server: FastifyInstance) {

    server.addHook('onRequest', server.authenticate);

    // 1. LISTER LES PROJETS
    server.get('/', async (request, reply) => {
        const userId = request.user.id;
        const projects = await prisma.projects.findMany({
            where: { user_id: userId },
            orderBy: { updated_at: 'desc' },
            include: {
                categories: true,
                project_materials: {
                    include: { materials: true }
                }
            }
        });
        // Transformer pour inclure material_ids directement
        return projects.map(p => ({
            ...p,
            material_ids: p.project_materials.map(pm => pm.material_id)
        }));
    });

    // 2. CRÉER UN PROJET
    server.post('/', async (request, reply) => {
        const result = createProjectSchema.safeParse(request.body);
        if (!result.success) return reply.code(400).send(result.error.issues);

        const { title, category_id, goal_rows, current_row, total_duration, status, material_ids } = result.data;
        const userId = request.user.id;

        try {
            const newProject = await prisma.projects.create({
                data: {
                    user_id: userId,
                    title,
                    category_id,
                    goal_rows,
                    current_row: current_row || 0,
                    total_duration: total_duration || 0,
                    status: status || 'in_progress',
                    // Créer les relations avec les matériaux si fournis
                    project_materials: material_ids && material_ids.length > 0 ? {
                        create: material_ids.map(material_id => ({ material_id }))
                    } : undefined
                },
                include: {
                    project_materials: {
                        include: { materials: true }
                    }
                }
            });
            return reply.code(201).send(newProject);
        } catch (err) {
            server.log.error(err);
            return reply.code(500).send({ error: "Erreur lors de la création" });
        }
    });

    // 3. VOIR UN PROJET
    server.get('/:id', async (request, reply) => {
        const { id } = request.params as { id: string };
        const userId = request.user.id;

        const project = await prisma.projects.findFirst({
            where: { id: id, user_id: userId },
            include: { categories: true } // On n'inclut plus sessions pour le calcul forcé
        });

        if (!project) {
            return reply.code(404).send({ error: "Projet introuvable" });
        }

        return project;
    });

    // 4. METTRE À JOUR UN PROJET
    server.patch('/:id', async (request, reply) => {
        const { id } = request.params as { id: string };
        const result = updateProjectSchema.safeParse(request.body);

        if (!result.success) return reply.code(400).send(result.error.issues);

        const existing = await prisma.projects.findFirst({
            where: { id, user_id: request.user.id }
        });

        if (!existing) return reply.code(404).send({ error: "Projet introuvable" });

        const { material_ids, ...updateData } = result.data;

        try {
            // Si material_ids est fourni, mettre à jour les relations
            if (material_ids !== undefined) {
                // Supprimer les anciennes relations
                await prisma.project_materials.deleteMany({
                    where: { project_id: id }
                });
                // Créer les nouvelles relations
                if (material_ids.length > 0) {
                    await prisma.project_materials.createMany({
                        data: material_ids.map(material_id => ({
                            project_id: id,
                            material_id
                        }))
                    });
                }
            }

            const updated = await prisma.projects.update({
                where: { id },
                data: {
                    ...updateData,
                    updated_at: updateData.updated_at ? updateData.updated_at : new Date()
                },
                include: {
                    project_materials: {
                        include: { materials: true }
                    }
                }
            });
            return {
                ...updated,
                material_ids: updated.project_materials.map(pm => pm.material_id)
            };
        } catch (err) {
            server.log.error(err);
            return reply.code(500).send({ error: "Erreur de mise à jour" });
        }
    });

    // 5. SUPPRIMER UN PROJET
    server.delete('/:id', async (request, reply) => {
        const { id } = request.params as { id: string };
        const userId = request.user.id;

        const existing = await prisma.projects.findFirst({
            where: { id, user_id: userId }
        });

        if (!existing) return reply.code(404).send({ error: "Projet introuvable" });

        try {
            if (existing.cover_file_path) {
                const coverPath = path.join(__dirname, '../../', existing.cover_file_path);
                if (fs.existsSync(coverPath)) {
                    try {
                        fs.unlinkSync(coverPath);
                    } catch (err) {
                        server.log.warn({ err }, 'Impossible de supprimer la couverture projet');
                    }
                }
            }

            await prisma.sessions.deleteMany({ where: { project_id: id } });
            await prisma.notes.deleteMany({ where: { project_id: id } });
            await prisma.photos.deleteMany({ where: { project_id: id } });
            await prisma.project_materials.deleteMany({ where: { project_id: id } });

            await prisma.projects.delete({ where: { id } });
            return reply.code(204).send();
        } catch (err) {
            server.log.error(err);
            return reply.code(500).send({ error: "Erreur lors de la suppression" });
        }
    });

    // 6. UPLOAD COUVERTURE PROJET
    server.post('/:id/cover', async (request, reply) => {
        const { id } = request.params as { id: string };
        const userId = request.user.id;
        const data = await request.file();

        if (!data) {
            return reply.code(400).send({ error: 'Aucun fichier envoyé' });
        }

        const project = await prisma.projects.findFirst({
            where: { id, user_id: userId },
            select: { id: true, cover_file_path: true }
        });

        if (!project) {
            return reply.code(404).send({ error: 'Projet introuvable' });
        }

        const extFromName = path.extname(data.filename || '');
        const ext = extFromName || '.jpg';
        const newFilename = `cover_${id}_${Date.now()}${ext}`;
        const uploadPath = path.join(__dirname, '../../uploads', newFilename);
        const fileUrl = `/uploads/${newFilename}`;

        try {
            await pump(data.file, fs.createWriteStream(uploadPath));

            if (project.cover_file_path) {
                const previousCoverPath = path.join(__dirname, '../../', project.cover_file_path);
                if (fs.existsSync(previousCoverPath)) {
                    try {
                        fs.unlinkSync(previousCoverPath);
                    } catch (err) {
                        server.log.warn({ err }, 'Impossible de supprimer l’ancienne couverture');
                    }
                }
            }

            const updated = await prisma.projects.update({
                where: { id },
                data: {
                    cover_file_path: fileUrl,
                    updated_at: new Date()
                }
            });

            return reply.code(200).send(updated);
        } catch (err) {
            server.log.error(err);
            return reply.code(500).send({ error: 'Erreur lors de l’upload de la couverture' });
        }
    });

    // 7. SUPPRIMER COUVERTURE PROJET
    server.delete('/:id/cover', async (request, reply) => {
        const { id } = request.params as { id: string };
        const userId = request.user.id;

        const project = await prisma.projects.findFirst({
            where: { id, user_id: userId },
            select: { id: true, cover_file_path: true }
        });

        if (!project) {
            return reply.code(404).send({ error: 'Projet introuvable' });
        }

        try {
            if (project.cover_file_path) {
                const coverPath = path.join(__dirname, '../../', project.cover_file_path);
                if (fs.existsSync(coverPath)) {
                    try {
                        fs.unlinkSync(coverPath);
                    } catch (err) {
                        server.log.warn({ err }, 'Impossible de supprimer le fichier de couverture');
                    }
                }
            }

            const updated = await prisma.projects.update({
                where: { id },
                data: {
                    cover_file_path: null,
                    updated_at: new Date()
                }
            });

            return reply.code(200).send(updated);
        } catch (err) {
            server.log.error(err);
            return reply.code(500).send({ error: 'Erreur lors de la suppression de la couverture' });
        }
    });
}
