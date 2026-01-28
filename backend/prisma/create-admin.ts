import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
    const email = 'admin@hooked.local';
    const password = 'admin'; // À changer après la première connexion !

    console.log(`👑 Création de l'administrateur ${email}...`);

    const existingUser = await prisma.users.findUnique({
        where: { email }
    });

    if (existingUser) {
        console.log('⚠️  Cet utilisateur existe déjà. Mise à jour du rôle en ADMIN...');
        await prisma.users.update({
            where: { email },
            data: { role: 'admin' }
        });
    } else {
        const passwordHash = await bcrypt.hash(password, 10);
        await prisma.users.create({
            data: {
                email,
                password_hash: passwordHash,
                role: 'admin',
                theme_pref: 'dark'
            }
        });
        console.log('✅ Administrateur créé avec succès !');
        console.log(`📧 Email: ${email}`);
        console.log(`🔑 Password: ${password}`);
    }
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
