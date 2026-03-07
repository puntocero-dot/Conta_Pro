import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    try {
        const tables: any = await prisma.$queryRaw`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public'
        `;
        console.log('Tablas encontradas:', tables.map((t: any) => t.table_name));
    } catch (error) {
        console.error('Error listing tables:', error);
    } finally {
        await prisma.$disconnect();
    }
}

main();
