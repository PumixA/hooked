import '@fastify/jwt';

declare module 'fastify' {
    interface FastifyInstance {
        // On déclare que la méthode authenticate existe sur le serveur
        authenticate: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
    }
}

declare module '@fastify/jwt' {
    interface FastifyJWT {
        // Ce que contient ton token (payload)
        payload: {
            id: string;
            email: string;
            role: string;
        };
        // Ce que request.user renverra une fois décodé
        user: {
            id: string;
            email: string;
            role: string;
        };
    }
}