# 🏦 Conta2Go - Sistema Contable con Seguridad de Nivel Bancario

Sistema de contabilidad empresarial diseñado con los más altos estándares de seguridad, equiparable a instituciones bancarias.

## 🎨 Personalización de Colores

El sistema cuenta con un **sistema de temas basado en CSS Variables** que permite cambiar fácilmente todos los colores de la aplicación.

### Cómo Cambiar los Colores

Edita el archivo `src/app/globals.css` y modifica las variables CSS en la sección `:root`:

```css
:root {
  /* Colores Principales */
  --primary: #2563eb;              /* Color primario (botones, enlaces) */
  --primary-foreground: #ffffff;   /* Texto sobre color primario */
  
  --secondary: #64748b;            /* Color secundario */
  --secondary-foreground: #ffffff; /* Texto sobre color secundario */
  
  --accent: #f59e0b;               /* Color de acento (destacados) */
  --accent-foreground: #ffffff;    /* Texto sobre color de acento */

  /* Fondos */
  --background: #ffffff;           /* Fondo principal */
  --foreground: #0f172a;           /* Texto principal */
  
  /* Colores de Estado */
  --success: #10b981;              /* Verde (éxito) */
  --warning: #f59e0b;              /* Naranja (advertencia) */
  --error: #ef4444;                /* Rojo (error) */
  --info: #3b82f6;                 /* Azul (información) */
}
```

### Ejemplo: Cambiar a Tema Verde Esmeralda

```css
:root {
  --primary: #10b981;              /* Verde esmeralda */
  --secondary: #6b7280;
  --accent: #f59e0b;
}
```

### Ejemplo: Cambiar a Tema Corporativo Gris/Azul

```css
:root {
  --primary: #1e40af;              /* Azul oscuro */
  --secondary: #475569;            /* Gris pizarra */
  --accent: #0ea5e9;               /* Azul cielo */
}
```

## 🚀 Instalación

1. **Clonar el repositorio**
   ```bash
   git clone <repo-url>
   cd Conta_2go
   ```

2. **Instalar dependencias**
   ```bash
   npm install
   ```

3. **Configurar variables de entorno**
   
   Crea un archivo `.env` en la raíz con:
   ```env
   DATABASE_URL="postgresql://..."
   DIRECT_URL="postgresql://..."
   ENCRYPTION_MASTER_KEY="..."
   ```

4. **Sincronizar base de datos**
   ```bash
   npx prisma db push
   npx prisma generate
   ```

5. **Ejecutar en desarrollo**
   ```bash
   npm run dev
   ```

   Abre [http://localhost:3001](http://localhost:3001)

## 🔐 Características de Seguridad (6 Sprints)

### Sprint 1: Autenticación y Autorización ✅
- ✅ Autenticación Multi-Factor (MFA) personalizada
- ✅ Control de acceso basado en roles (RBAC): SUPER_ADMIN, CONTADOR, CLIENTE, AUDITOR
- ✅ Políticas de contraseñas robustas (12+ caracteres, validación HIBP)
- ✅ Gestión de sesiones seguras con JWT (HttpOnly Cookies)
- ✅ Middleware de seguridad con headers HTTP estrictos

### Sprint 2: Encriptación ✅
- ✅ Encriptación AES-256-GCM en reposo para datos sensibles
- ✅ Sistema de key derivation con PBKDF2 (100k iterations)
- ✅ Validación y sanitización de inputs (Zod + DOMPurify)
- ✅ Logging seguro con enmascaramiento automático
- ✅ Rate limiting implementado
- ⏳ HTTPS obligatorio con TLS 1.3 (Requiere deployment)
- ⏳ Escaneo de archivos subidos (Planificado)

### Sprint 3: Auditoría ✅
- ✅ Sistema completo de Audit Logs en Prisma
- ✅ Servicio centralizado de auditoría con detección de actividad sospechosa
- ✅ Logging automático de todas las acciones críticas
- ✅ Security Dashboard para Super Admin con estadísticas en tiempo real
- ✅ Sistema de alertas para eventos de seguridad
- ✅ Visualización de actividad reciente y análisis de logs

### Sprint 4: Hardening ✅
- ✅ GitHub Actions CI/CD con Snyk, SonarQube y OWASP ZAP
- ✅ Sistema de validación multi-capa (Cliente, API, Database)
- ✅ Checklist completo de Penetration Testing (200+ checks)
- ✅ Scripts automatizados de security testing local
- ✅ Configuración de SonarQube para análisis de código
- ✅ Pre-deploy validation scripts

### Sprint 5: Multi-País ✅
- ✅ Aislamiento de datos por empresa y usuario
- ✅ Configuración segura por país (6 países: SV, GT, HN, NI, CR, PA)
- ✅ Sistema de Tax ID validation por país
- ✅ Formateo de moneda y fechas regionalizado
- ✅ Cálculo automático de IVA según país
- ✅ Scripts de migración de datos entre países
- ✅ Export/Import de datos por país

### Sprint 6: Incident Response ✅
- ✅ Plan completo de Respuesta a Incidentes (5 fases)
- ✅ Clasificación de incidentes (4 niveles de severidad)
- ✅ Scripts de emergencia (maintenance mode, backup, session revoke)
- ✅ Checklist imprimible para respuesta rápida
- ✅ Contactos de emergencia 24/7
- ✅ Procedimientos de post-mortem

## 🛠️ Tecnologías

- **Framework**: Next.js 14+ (App Router)
- **Lenguaje**: TypeScript
- **Base de Datos**: PostgreSQL (Railway)
- **ORM**: Prisma
- **Autenticación**: JWT Auth (Custom)
- **Estilos**: Vanilla CSS (CSS Modules + Variables)
- **Deployment**: Vercel

## 📂 Estructura del Proyecto

```
Conta_2go/
├── src/
│   ├── app/
│   │   ├── login/          # Página de inicio de sesión
│   │   ├── dashboard/      # Dashboard principal
│   │   ├── globals.css     # ⭐ Variables CSS (Personalización de colores)
│   │   └── layout.tsx
│   └── middleware.ts       # Security middleware
├── lib/
│   ├── auth/
│   │   ├── rbac.ts         # Definiciones de roles y permisos
│   │   ├── password-policy.ts
│   │   └── session-manager.ts
│   │   ├── session-manager.ts
│   └── prisma.ts           # Cliente de Prisma
├── hooks/
│   └── useAuth.ts          # Hook de autenticación
├── prisma/
│   └── schema.prisma       # Esquema de base de datos
└── .env                    # Variables de entorno (NO COMMITEAR)
```

## 👥 Roles del Sistema

1. **SUPER_ADMIN**: Control total del sistema
2. **CONTADOR**: Gestiona múltiples empresas, crea reportes fiscales
3. **CLIENTE**: Solo lectura de su propia empresa
4. **AUDITOR**: Solo lectura total, acceso a logs

## 📝 Roadmap

- [x] Inicialización del proyecto
- [x] Sistema de personalización de colores
- [x] Autenticación básica con Supabase
- [x] RBAC y middleware de seguridad
- [ ] Implementar MFA obligatorio
- [ ] Encriptación de datos sensibles
- [ ] Sistema de audit logs
- [ ] Dashboard de seguridad
- [ ] Módulo de ingresos y egresos
- [ ] Generación de reportes fiscales
- [ ] Soporte multi-país (SV, GT, HN, NI, CR, PA)

## 📄 Licencia

Privado - Todos los derechos reservados

---

**🔒 Conta2Go** - *Contabilidad con seguridad de nivel bancario*
