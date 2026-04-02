# 🏦 Patrimonium Pro (Conta2Go) — Sistema Contable de Nivel Bancario

> **Estado del Proyecto:** ✅ PRODUCCIÓN READY - DEMO READY  
> **Versión:** 2.1.0  
> **Países Soportados:** 🇸🇻 SV, 🇬🇹 GT, 🇭🇳 HN, 🇳🇮 NI, 🇨🇷 CR, 🇵🇦 PA

**Patrimonium Pro** (conocido localmente como **Conta2go**) es una super app de contabilidad empresarial con seguridad de nivel bancario, diseñada específicamente para la legislación de El Salvador y Centroamérica. Es una solución todo-en-uno que integra CRM, Contabilidad Invisible, y Reportes Fiscales con los más altos estándares de protección de datos.

---

## 🎨 Personalización y Experiencia de Usuario (UX)

El sistema cuenta con un **sistema de temas dinámico** basado en variables CSS que permite adaptar la identidad visual en segundos.

### Configuración de Colores
Edita `src/app/globals.css` para modificar el branding:
```css
:root {
  --primary: #2563eb;      /* Azul Corporativo */
  --accent: #f59e0b;       /* Acento Dorado */
  --background: #ffffff;   /* Fondo Limpio */
}
```

### Características Premium
- ✅ **Sidebar Profesional**: Navegación colapsable con roles de usuario.
- ✅ **Dashboard Moderno**: KPIs en tiempo real y estadísticas de ingresos/egresos.
- ✅ **Arquitectura SaaS**: Aislamiento total de datos por empresa y usuario.
- ✅ **Micro-interacciones**: Animaciones suaves y transiciones de estado.

---

## 🔐 Seguridad de Grado Militar (6 Sprints Completados)

El proyecto ha superado 6 fases de fortalecimiento de seguridad:

| Sprint | Enfoque | Logros Clave |
|---|---|---|
| **1** | Autenticación | Login con JWT (HttpOnly), MFA (TOTP), Políticas de contraseñas (12+ chars), Rate limiting anti-fuerza bruta. |
| **2** | Encriptación | AES-256-GCM para datos sensibles (Tax IDs, NRC), PBKDF2 (100k iteraciones), Sanitización XSS. |
| **3** | Auditoría | Sistema de Audit Logs (20+ eventos), Security Dashboard, Alertas de actividad sospechosa. |
| **4** | Hardening | CI/CD seguro, análisis SonarQube, escaneo Snyk, validación multi-capa. |
| **5** | Multi-País | Aislamiento por tenant, validación regional de IDs fiscales (NIT, NRC, DUI). |
| **6** | Incidencias | Plan de respuesta a incidentes, scripts de emergencia (modo mantenimiento, revocación masiva). |

---

## 💼 Funcionalidades de Negocio (100% Operativas)

El sistema ya no es solo una base contable, es una herramienta de gestión completa:

### 🏢 Gestión de Empresas
- Registro completo bajo leyes centroamericanas.
- Soporte para 5 formas jurídicas (S.A., S. de R.L., E.I.R.L., etc.).
- Validación automática de NIT y NRC.

### 👥 CRM Integeado
- Gestión de clientes y proveedores.
- Historial de saldos pendientes y actividad financiera.
- Validación de documentos de identidad (DUI/NIT).

### 💰 Contabilidad Invisible (Ledger Service)
- **Automatización**: El sistema genera partidas dobles automáticamente al crear transacciones.
- **Motor AML**: Análisis de lavado de dinero en tiempo real con detección de pitufeo/fraccionamiento.
- **Multi-Categoría**: Clasificación inteligente de ingresos y egresos.

### 📊 Reportes Fiscales
- Generación mensual de reportes.
- Cálculo automático de IVA por país (ej. 13% El Salvador).
- Desglose por categorías y gráficas de rendimiento.

---

## 🚀 Guía Rápida de Demo (5 Minutos)

Para una presentación rápida, sigue este flujo:

1.  **Login Seguro**: Accede con MFA configurado.
2.  **Crear Empresa**: Llenar datos como "Demo S.A." con NIT válido.
3.  **Registrar Cliente**: Añadir un cliente con saldo inicial.
4.  **Transacción Mágica**: Crear un ingreso de $1,500. Verás cómo las estadísticas del dashboard se actualizan al instante.
5.  **Revisar Reporte**: Ver el cálculo automático del IVA generado por la transacción anterior.

---

## 🛠️ Stack Tecnológico

- **Frontend**: Next.js 15 (App Router), React 19, CSS Modules.
- **Backend**: API Routes nativas, custom JWT Auth middleware.
- **Base de Datos**: PostgreSQL (Railway) + Prisma ORM.
- **Seguridad**: AES-256-GCM, DOMPurify, Zod Validation, Supabase SSR (Auth context).
- **DevOps**: GitHub Actions (CI/CD), Vercel.

---

## 📂 Estructura y Documentación

Para ver detalles técnicos específicos, consulta la carpeta `/docs`:

- 📜 [Guía de Encriptación](docs/security/ENCRYPTION_GUIDE.md)
- 📜 [Plan de Respuesta a Incidentes](docs/security/INCIDENT_RESPONSE_PLAN.md)
- 📜 [Checklist de Seguridad (Pentest)](docs/security/PENTEST_CHECKLIST.md)
- 📜 [Guía de Pruebas](docs/security/TESTING_CHECKLIST.md)

---

## 📝 Roadmap de Futuro

### Corto Plazo
- [ ] Facturación Electrónica (DTE El Salvador).
- [ ] Dashboard avanzado con Chart.js/Recharts.
- [ ] Módulo de Inventario de productos y servicios.

### Mediano Plazo
- [ ] Liquidación de Nómina (ISSS, AFP, Renta).
- [ ] Conciliación Bancaria automática.
- [ ] App móvil nativa (React Native).

---

**🔒 Patrimonium Pro** — *Innovación contable con seguridad absoluta.*  
© 2026 Todos los derechos reservados.
