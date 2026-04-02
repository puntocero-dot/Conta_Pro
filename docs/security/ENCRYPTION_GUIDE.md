# 🔐 Guía de Encriptación y Seguridad - Conta2Go

## Sistema de Encriptación AES-256-GCM

### Características
- **Algoritmo**: AES-256-GCM (Galois/Counter Mode)
- **Derivación de claves**: PBKDF2 con SHA-512 (100,000 iteraciones)
- **Salt aleatorio**: 64 bytes por encriptación
- **IV aleatorio**: 16 bytes por encriptación
- **Authentication Tag**: Protección contra manipulación

### Uso Básico

```typescript
import { encrypt, decrypt } from '@/lib/encryption/crypto';

// Encriptar datos sensibles
const sensitive = "Número de cuenta: 1234-5678-9012";
const encrypted = encrypt(sensitive);
// Resultado: "base64Salt:base64IV:base64AuthTag:base64Encrypted"

// Desencriptar
const decrypted = decrypt(encrypted);
// Resultado: "Número de cuenta: 1234-5678-9012"
```

### Uso con Prisma

```typescript
import { prepareCompanyForStorage, retrieveCompanyFromStorage } from '@/lib/encryption/encrypted-fields';

// Al guardar en la base de datos
const companyData = {
  legal Name: "Mi Empresa S.A.",
  taxId: "ABC123456789",
  address: "Calle Principal 123",
  phone: "+52 555 1234567",
  bankAccount: "0123456789",
};

const encryptedData = prepareCompanyForStorage(companyData);

await prisma.company.create({
  data: encryptedData,
});

// Al recuperar de la base de datos
const storedCompany = await prisma.company.findUnique({ where: { id } });
const decryptedCompany = retrieveCompanyFromStorage(storedCompany);
```

## Validación y Sanitización

### Con Zod Schemas

```typescript
import { validateAndSanitize, companySchema } from '@/lib/validation/sanitize';

const result = validateAndSanitize(userInput, companySchema);

if (result.success) {
  // Datos validados y seguros
  const safeData = result.data;
} else {
  // Errores de validación
  console.error(result.errors);
}
```

### Sanitización de HTML

```typescript
import { sanitizeHtml, sanitizeText } from '@/lib/validation/sanitize';

// Permitir solo tags seguros
const safe = sanitizeHtml("<script>alert('XSS')</script><p>Hola</p>");
// Resultado: "<p>Hola</p>"

// Remover todo HTML
const plainText = sanitizeText("<b>Bold</b> text");
// Resultado: "Bold text"
```

## Logging Seguro

### Uso del Logger

```typescript
import { logger } from '@/lib/logging/logger';

// Log normal
logger.info('Usuario creado', { userId: '123', email: 'user@example.com' });

// Log de seguridad
logger.security('Login attempt', { 
  email: 'admin@conta2go.com',
  success: true 
});

// Log de acceso a datos
logger.dataAccess('user123', 'READ', 'financial_records');

// Log de autenticación
logger.auth('login', 'user@example.com');

// Log de cambios
logger.auditChange('user123', 'Company', 'comp456', {
  legalName: { old: 'Old Name', new: 'New Name' },
  taxId: { old: 'ABC123', new: 'XYZ789' }
});
```

**Los datos sensibles son automáticamente enmascarados:**
- Passwords: `Ad****89!`
- Emails: `ad**@conta2go.com`
- Tax IDs: `AB****789`

## Hashing

### Hash One-Way

```typescript
import { hash } from '@/lib/encryption/crypto';

// Para IDs únicos o checksums
const hashed = hash("sensitive-identifier");
// Resultado: "a1b2c3d4e5..." (SHA-256)
```

### Hash de Contraseñas (con salt)

```typescript
import { hashPassword, verifyPassword } from '@/lib/encryption/crypto';

// Al crear usuario
const hashedPw = hashPassword("MySecurePassword123!");
// Guardar en DB: "salt:hash"

// Al verificar login
const isValid = verifyPassword("MySecurePassword123!", hashedPw);
```

## Tokens Seguros

```typescript
import { generateSecureToken } from '@/lib/encryption/crypto';

// Generar token aleatorio
const resetToken = generateSecureToken(32);
// Resultado: "a1b2c3...64 caracteres hex"
```

## Enmascaramiento para Logs

```typescript
import { maskSensitiveData } from '@/lib/encryption/crypto';

const creditCard = "4532-1234-5678-9012";
const masked = maskSensitiveData(creditCard, 4);
// Resultado: "4532************9012"
```

## Validación de Archivos

```typescript
import { validateFileUpload, sanitizeFilename } from '@/lib/validation/sanitize';

const file = event.target.files[0];

const validation = validateFileUpload(file, {
  maxSizeMB: 5,
  allowedTypes: ['application/pdf', 'image/jpeg', 'image/png'],
});

if (validation.valid) {
  const safeName = sanitizeFilename(file.name);
  // Procesar archivo
} else {
  alert(validation.error);
}
```

## Variables de Entorno Requeridas

```env
# .env.local
ENCRYPTION_MASTER_KEY="tu-clave-maestra-de-32-caracteres-minimo"
```

⚠️ **IMPORTANTE**: 
- La clave maestra debe tener AL MENOS 32 caracteres
- Usa un generador de claves criptográficamente seguro
- NUNCA commitees esta clave a Git
- Rota la clave periódicamente (cada 90 días)

## Mejores Prácticas

### ✅ DO
- Encriptar TODOS los datos sensibles antes de guardar
- Validar y sanitizar TODAS las entradas de usuario
- Usar el logger para eventos de seguridad
- Rotar claves de encriptación regularmente
- Mantener backups encriptados de las claves

### ❌ DON'T
- Almacenar datos sensibles en texto plano
- Loguear datos sensibles sin enmascarar
- Usar la misma clave para diferentes propósitos
- Hardcodear claves en el código
- Confiar en validación solo del cliente

## Roadmap de Mejoras

- [ ] Rotación automática de claves
- [ ] Key Management Service (KMS) integration
- [ ] Hardware Security Module (HSM) support
- [ ] Audit log encryption
- [ ] Backup codes encryption

---

**Última actualización**: Sprint 2 - Encriptación y Protección de Datos
