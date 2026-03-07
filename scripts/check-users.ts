import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    try {
        const count = await prisma.user.count();
        console.log(`Total usuarios: ${count}`);

        const users = await prisma.user.findMany({
            select: { email: true, role: true }
        });
        users.forEach(u => console.log(`- ${u.email} (${u.role})`));

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await prisma.$disconnect();
    }
}

main();
