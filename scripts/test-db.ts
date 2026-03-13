
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('--- Database Diagnostic ---');
    try {
        console.log('Connecting to database...');
        await prisma.$connect();
        console.log('✓ Connected successfully!');

        console.log('Testing access to Transaction model...');
        const count = await prisma.transaction.count();
        console.log(`✓ Transaction count: ${count}`);

        console.log('Testing access to AccountClient model...');
        const clientCount = await prisma.accountClient.count();
        console.log(`✓ AccountClient count: ${clientCount}`);

        console.log('Testing access to JournalEntry model...');
        console.log('Available models in prisma:', Object.keys(prisma).filter(k => !k.startsWith('_') && typeof (prisma as any)[k] === 'object'));
        
        if (!(prisma as any).journalEntry) {
            console.error('✖ journalEntry is MISSING from prisma object!');
        } else {
            const ledgerCount = await prisma.journalEntry.count();
            console.log(`✓ JournalEntry count: ${ledgerCount}`);
        }

    } catch (error: any) {
        console.error('✖ Diagnostic failed!');
        console.error('Error Code:', error.code);
        console.error('Error Message:', error.message);
        if (error.meta) console.error('Error Meta:', error.meta);
    } finally {
        await prisma.$disconnect();
    }
}

main();
