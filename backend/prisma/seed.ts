import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('🌱 Début du seeding...');

    const categoriesData = [
        { label: 'Pull', icon_key: 'shirt' },
        { label: 'Bonnet', icon_key: 'smile' },
        { label: 'Écharpe', icon_key: 'scroll' },
        { label: 'Couverture', icon_key: 'layout-grid' },
        { label: 'Gants', icon_key: 'hand' },
        { label: 'Sac', icon_key: 'shopping-bag' },
        { label: 'Amigurumi', icon_key: 'toy-brick' },
        { label: 'Autre', icon_key: 'box' },
    ];

    for (const cat of categoriesData) {
        const exists = await prisma.categories.findFirst({
            where: { label: cat.label }
        });

        if (!exists) {
            await prisma.categories.create({ data: cat });
            console.log(`+ Catégorie créée : ${cat.label}`);
        } else {
            console.log(`= Catégorie existante : ${cat.label}`);
        }
    }

    console.log('✅ Seeding terminé !');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });