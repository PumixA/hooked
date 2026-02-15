/// <reference path="../types/fastify-jwt.d.ts" />
import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { prisma } from '../index';

const createMaterialSchema = z.object({
    category_type: z.enum(['hook', 'yarn', 'needle']),
    name: z.string().min(1),
    size: z.string().optional(),
    brand: z.string().optional(),
    material_composition: z.string().optional(),
    description: z.string().max(2000).optional(),
    color_number: z.string().optional(),
    yardage_meters: z.number().int().min(0).optional(),
    grammage_grams: z.number().int().min(0).optional(),
});

// MODIFICATION : On autorise null pour les champs optionnels car le frontend peut envoyer null
const updateMaterialSchema = z.object({
    category_type: z.enum(['hook', 'yarn', 'needle']).optional(),
    name: z.string().min(1).optional(),
    size: z.string().nullable().optional(),
    brand: z.string().nullable().optional(),
    material_composition: z.string().nullable().optional(),
    description: z.string().max(2000).nullable().optional(),
    color_number: z.string().nullable().optional(),
    yardage_meters: z.number().int().min(0).nullable().optional(),
    grammage_grams: z.number().int().min(0).nullable().optional(),
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

    // 2. VOIR UN MATÉRIEL (GET /materials/:id)
    server.get('/:id', async (request, reply) => {
        const { id } = request.params as { id: string };
        const userId = request.user.id;

        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        if (!uuidRegex.test(id)) {
             return reply.code(400).send({ error: "ID invalide" });
        }

        try {
            const material = await prisma.materials.findFirst({
                where: { id, user_id: userId }
            });

            if (!material) return reply.code(404).send({ error: "Matériel introuvable" });

            return material;
        } catch (err) {
            server.log.error(err);
            return reply.code(500).send({ error: "Erreur serveur" });
        }
    });

    // 3. AJOUTER DU MATÉRIEL (POST /materials)
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

    // 4. MODIFIER DU MATÉRIEL (PATCH /materials/:id)
    server.patch('/:id', async (request, reply) => {
        const { id } = request.params as { id: string };
        const result = updateMaterialSchema.safeParse(request.body);
        
        if (!result.success) {
            // Log pour debug
            server.log.error({ err: result.error }, "Erreur validation Zod PATCH");
            return reply.code(400).send(result.error.issues);
        }

        // Vérif appartenance
        const existing = await prisma.materials.findFirst({
            where: { id, user_id: request.user.id }
        });

        if (!existing) return reply.code(404).send({ error: "Introuvable" });

        try {
            const updated = await prisma.materials.update({
                where: { id },
                data: result.data
            });
            return updated;
        } catch (err) {
            return reply.code(500).send({ error: "Erreur mise à jour" });
        }
    });

    // 5. SUPPRIMER DU MATÉRIEL (DELETE /materials/:id)
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
