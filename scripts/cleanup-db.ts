import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('🧹 Iniciando limpieza por orden de dependencias...');

    try {
        // Orden seguro para borrar (hijos antes que padres)
        await prisma.auditLog.deleteMany({});
        console.log('Borrado AuditLog');

        await prisma.journalEntryLine.deleteMany({});
        console.log('Borrado JournalEntryLine');

        await prisma.journalEntry.deleteMany({});
        console.log('Borrado JournalEntry');

        await prisma.transaction.deleteMany({});
        console.log('Borrado Transaction');

        await prisma.category.deleteMany({});
        console.log('Borrado Category');

        // El orden de Client/Company/Account es crítico
        await prisma.client.deleteMany({});
        console.log('Borrado Client');

        await prisma.account.deleteMany({});
        console.log('Borrado Account');

        // Limpiar relación implícita si es necesario (Prisma suele manejarlo)
        // Pero por si acaso:
        await (prisma as any).company.updateMany({
            data: {},
            where: {},
        });

        await prisma.company.deleteMany({});
        console.log('Borrado Company');

        console.log('✅ Limpieza completada con éxito.');

    } catch (error) {
        console.error('❌ Error durante la limpieza:', error);
        // No salimos con error para permitir que el flujo continúe si algunas ya están vacías
    } finally {
        await prisma.$disconnect();
    }
}

main();
