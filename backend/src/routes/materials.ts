/// <reference path="../types/fastify-jwt.d.ts" />
import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { prisma } from '../index';

const createMaterialSchema = z.object({
    category_type: z.enum(['hook', 'yarn', 'needle']),
    name: z.string().min(1),
    size: z.string().optional(),
    brand: z.string().optional(),
    material_composition: z.string().optional()
});

export async function materialsRoutes(server: FastifyInstance) {

    server.addHook('onRequest', server.authenticate);

    // 1. LISTER L'INVENTAIRE (GET /materials?category_type=hook)
    server.get('/', async (request, reply) => {
        const userId = request.user.id;
        const { category_type } = request.query as { category_type?: string };

        const whereClause: any = { user_id: userId };
        if (category_type) {
            whereClause.category_type = category_type;
        }

        const materials = await prisma.materials.findMany({
            where: whereClause,
            orderBy: { name: 'asc' }
        });

        return materials;
    });

    // 2. AJOUTER DU MATÉRIEL (POST /materials)
    server.post('/', async (request, reply) => {
        const result = createMaterialSchema.safeParse(request.body);
        if (!result.success) return reply.code(400).send(result.error.issues);

        try {
            const material = await prisma.materials.create({
                data: {
                    user_id: request.user.id,
                    ...result.data
                }
            });
            return reply.code(201).send(material);
        } catch (err) {
            return reply.code(500).send({ error: "Erreur création matériel" });
        }
    });

    // 3. SUPPRIMER DU MATÉRIEL (DELETE /materials/:id)
    server.delete('/:id', async (request, reply) => {
        const { id } = request.params as { id: string };

        // Vérif appartenance
        const existing = await prisma.materials.findFirst({
            where: { id, user_id: request.user.id }
        });

        if (!existing) return reply.code(404).send({ error: "Introuvable" });

        await prisma.materials.delete({ where: { id } });
        return { success: true };
    });
}