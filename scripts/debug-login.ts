import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function testLogin() {
    const email = 'admin@conta2go.com';
    const password = 'admin123';

    console.log(`[TEST] Intentando login para: ${email}`);

    try {
        const user = await prisma.user.findUnique({
            where: { email: email.toLowerCase() }
        });

        if (!user) {
            console.log('❌ ERROR: Usuario no encontrado en la DB');
            return;
        }

        console.log('✅ Usuario encontrado. Verificando password...');
        console.log('Hash en DB:', user.passwordHash);

        const isValid = await bcrypt.compare(password, user.passwordHash);

        if (isValid) {
            console.log('✅ LOGIN EXITOSO! El password coincide.');
        } else {
            console.log('❌ ERROR: Password NO coincide.');

            // Verifiquemos si coincide con el password viejo
            const isOldValid = await bcrypt.compare('Admin123456!', user.passwordHash);
            if (isOldValid) {
                console.log('💡 NOTA: Coincide con el password viejo "Admin123456!"');
            }
        }
    } catch (error) {
        console.error('Error durante el test:', error);
    } finally {
        await prisma.$disconnect();
    }
}

testLogin();
