import crypto from 'crypto';

/**
 * Verifica si una contraseña ha sido comprometida usando la API de Have I Been Pwned
 * Usa k-Anonymity para proteger la privacidad (solo envía los primeros 5 caracteres del hash SHA-1)
 */

export async function isPasswordCompromised(password: string): Promise<boolean> {
    try {
        // Generar hash SHA-1 de la contraseña
        const sha1Hash = crypto.createHash('sha1').update(password).digest('hex').toUpperCase();

        // Usar k-Anonymity: solo enviar los primeros 5 caracteres
        const prefix = sha1Hash.substring(0, 5);
        const suffix = sha1Hash.substring(5);

        // Consultar la API de HIBP
        const response = await fetch(`https://api.pwnedpasswords.com/range/${prefix}`, {
            headers: {
                'User-Agent': 'Conta_pro-Security-Check',
            },
        });

        if (!response.ok) {
            // Si la API falla, no bloquear al usuario (fail-safe)
            console.error('HIBP API error:', response.status);
            return false;
        }

        const text = await response.text();
        const hashes = text.split('\n');

        // Buscar si nuestro hash sufijo está en la lista
        for (const line of hashes) {
            const [hashSuffix, count] = line.split(':');
            if (hashSuffix === suffix) {
                console.warn(`Password found in ${count.trim()} breaches`);
                return true;
            }
        }

        return false;
    } catch (error) {
        console.error('Error checking password with HIBP:', error);
        // En caso de error, no bloquear (fail-safe)
        return false;
    }
}

/**
 * Valida una contraseña contra múltiples criterios de seguridad
 */
export async function validatePasswordSecurity(password: string): Promise<{
    isSecure: boolean;
    warnings: string[];
}> {
    const warnings: string[] = [];

    // Verificar contra HIBP
    const isCompromised = await isPasswordCompromised(password);
    if (isCompromised) {
        warnings.push('Esta contraseña ha sido comprometida en brechas de seguridad públicas. Por favor usa otra.');
    }

    // Verificar patrones comunes
    const commonPatterns = [
        /^123456/,
        /password/i,
        /qwerty/i,
        /admin/i,
        /welcome/i,
        /12345678/,
    ];

    for (const pattern of commonPatterns) {
        if (pattern.test(password)) {
            warnings.push('La contraseña contiene patrones comunes que son fáciles de adivinar.');
            break;
        }
    }

    // Verificar repetición de caracteres
    if (/(.)\1{3,}/.test(password)) {
        warnings.push('La contraseña contiene muchos caracteres repetidos seguidos.');
    }

    return {
        isSecure: warnings.length === 0,
        warnings,
    };
}
