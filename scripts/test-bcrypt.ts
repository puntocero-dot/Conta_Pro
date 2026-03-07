import bcrypt from 'bcryptjs';

async function test() {
    const password = 'admin123';
    // Hash created in seed script (conceptually)
    const hash = await bcrypt.hash(password, 10);
    console.log('Hash created:', hash);

    // Simulating login check
    const isValid = await bcrypt.compare('admin123', hash);
    console.log('Is valid:', isValid);

    // Simulating wrong password
    const isInvalid = await bcrypt.compare('wrong', hash);
    console.log('Is invalid (expected false):', isInvalid);
}

test();
