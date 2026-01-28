# Build stage
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
# Installation propre (ci)
RUN npm ci
COPY . .
# Compilation TypeScript -> JavaScript
RUN npm run build
# Génération du client Prisma
RUN npx prisma generate

# Production stage
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
# Installation uniquement des dépendances de prod
RUN npm ci --only=production
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma
# On copie aussi uploads s'il existe, sinon on le crée
RUN mkdir -p uploads

EXPOSE 3000
# Commande de démarrage (migration + start)
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/index.js"]