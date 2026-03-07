import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
    console.log('🌱 Seeding test users...');

    const password = 'admin123';
    const passwordHash = await bcrypt.hash(password, 10);

    // Usuario SUPER_ADMIN para pruebas
    const admin = await prisma.user.upsert({
        where: { email: 'admin@conta2go.com' },
        update: { passwordHash, role: 'SUPER_ADMIN' },
        create: {
            email: 'admin@conta2go.com',
            passwordHash,
            role: 'SUPER_ADMIN',
        },
    });

    // Usuario CONTADOR
    const contador = await prisma.user.upsert({
        where: { email: 'contador@conta2go.com' },
        update: { passwordHash, role: 'CONTADOR' },
        create: {
            email: 'contador@conta2go.com',
            passwordHash,
            role: 'CONTADOR',
        },
    });

    // Usuario CLIENTE
    const cliente = await prisma.user.upsert({
        where: { email: 'cliente@conta2go.com' },
        update: { passwordHash, role: 'CLIENTE' },
        create: {
            email: 'cliente@conta2go.com',
            passwordHash,
            role: 'CLIENTE',
        },
    });

    console.log('✅ Users seeded:');
    console.log(`   📧 admin@conta2go.com    | Role: SUPER_ADMIN | Pass: ${password}`);
    console.log(`   📧 contador@conta2go.com | Role: CONTADOR    | Pass: ${password}`);
    console.log(`   📧 cliente@conta2go.com  | Role: CLIENTE     | Pass: ${password}`);
    console.log('');
    console.log('IDs:', { admin: admin.id, contador: contador.id, cliente: cliente.id });
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
