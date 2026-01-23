import { FastifyInstance } from 'fastify';
import { prisma } from '../index';
import util from 'util';
import { pipeline } from 'stream';
import fs from 'fs';
import path from 'path';

const pump = util.promisify(pipeline);

export async function photosRoutes(server: FastifyInstance) {
    server.addHook('onRequest', server.authenticate);

    // POST /photos -> Upload d'une image liée à un projet
    server.post('/', async (request, reply) => {
        const data = await request.file();

        if (!data) {
            return reply.code(400).send({ error: "Aucun fichier envoyé" });
        }

        // On récupère le project_id qui est envoyé dans un champ texte à côté du fichier
        // Note: avec @fastify/multipart, les champs sont dans data.fields, mais pour un mix fichier/champs,
        // l'accès est un peu particulier. Simplifions : on passe project_id en query param pour ce ticket,
        // ou on le parse depuis les headers si besoin.
        // Pour faire simple et robuste ici : on va demander project_id dans l'URL.
        // ex: POST /photos?project_id=123

        // MAIS pour être plus propre (Body multipart), on va extraire les champs.
        // Fastify multipart gère ça un peu différemment.
        // Pour ce ticket, on va utiliser l'approche "Stream" vers disque.

        // Hack simple : Le client enverra l'ID dans les query params pour éviter de parser le multipart complexe.
        const { project_id } = request.query as { project_id: string };

        if (!project_id) {
            return reply.code(400).send({ error: "project_id manquant (query param)" });
        }

        // Vérif sécurité
        const project = await prisma.projects.findUnique({ where: { id: project_id } });
        if (!project || project.user_id !== request.user.id) {
            return reply.code(403).send({ error: "Projet introuvable ou interdit" });
        }

        // Génération nom de fichier unique
        const timestamp = Date.now();
        const ext = path.extname(data.filename);
        const newFilename = `${project_id}_${timestamp}${ext}`;
        const uploadPath = path.join(__dirname, '../../uploads', newFilename);

        // Sauvegarde sur le disque
        await pump(data.file, fs.createWriteStream(uploadPath));

        // Sauvegarde en BDD
        // Note: on stocke le chemin relatif accessible via l'URL
        const fileUrl = `/uploads/${newFilename}`;

        try {
            const photo = await prisma.photos.create({
                data: {
                    project_id,
                    file_path: fileUrl
                }
            });
            return reply.code(201).send(photo);
        } catch (err) {
            return reply.code(500).send({ error: "Erreur sauvegarde BDD" });
        }
    });

    // GET /photos?project_id=... -> Lister les photos d'un projet
    server.get('/', async (request, reply) => {
        const { project_id } = request.query as { project_id: string };
        if (!project_id) return reply.code(400).send({ error: "project_id requis" });

        const photos = await prisma.photos.findMany({
            where: { project_id },
            orderBy: { created_at: 'desc' }
        });

        return photos;
    });
}