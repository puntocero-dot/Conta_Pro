# 📊 CONTA PRO — Documentación Técnica y Funcional

**Conta Pro** es un ERP contable y financiero diseñado específicamente para el mercado de El Salvador (PYMES), cumpliendo con las normativas de **NIIF para PYMES** y las regulaciones fiscales de la **Dirección General de Impuestos Internos (DGII)**.

---

## 🏗️ 1. Arquitectura del Sistema

El sistema utiliza un stack moderno enfocado en velocidad, escalabilidad y robustez:

- **Framework:** Next.js 16 (App Router) — Renderizado híbrido (SSR/Client).
- **Base de Datos:** PostgreSQL (Alojado en Railway/Supabase).
- **ORM:** Prisma — Para modelado de datos y migraciones seguras.
- **Autenticación:** JWT con cookies de seguridad (HttpOnly).
- **UI/UX:** CSS Modules (Vanilla CSS) para un diseño premium, minimalista y de alto rendimiento.
- **Hosting:** Railway (actual) / Preparado para Vercel.

---

## 👥 2. Roles y Permisos

El sistema maneja una jerarquía de acceso basada en roles:

1.  **SUPER_ADMIN:** Gestión total de empresas, grupos de empresas y usuarios globales.
2.  **CONTADOR:** Acceso completo al motor contable, ajustes de diario, estados financieros y reportes fiscales.
3.  **CLIENTE:** Visualización de dashboards, métricas EBITDA, carga de transacciones y consulta de estados financieros (lectura).
4.  **AUDITOR:** Acceso de solo lectura a todos los módulos contables y logs de auditoría.

---

## 🛠️ 3. Funciones Principales (Módulos)

### A. Motor Contable (Core)
- **Catálogo de Cuentas SV:** Catálogo estándar de 66 cuentas basado en NIIF PYMES (1101 a 6302).
- **Auto-Journaling:** Generación automática de asientos de doble partida al registrar cualquier transacción (Ingreso/Egreso).
- **Libro Mayor y Diario:** Registro detallado de cada movimiento con trazabilidad total.

### B. Gestión Financiera
- **Cuentas por Cobrar/Pagar (Aging):** Seguimiento de facturas con vencimiento a 30, 60 y 90 días.
- **Activos Fijos:** Control de activos (Mobiliario, Vehículos, Cómputo, Edificios) con **Depreciación Automática** mensual según tasas fiscales de El Salvador.
- **Préstamos:** Amortización de créditos bancarios con separación automática de Capital (Act. Financiamiento) e Intereses (Act. Operación).

### C. Planillas y Laboral
- **Cálculo de Nómina SV:** Deducciones automáticas de AFP (7.25% laboral / 8.75% patronal), ISSS (3% / 7.5%) e ISR según tablas de retención mensual.
- **Previsiones:** Devengo mensual de Vacaciones, Aguinaldo e Indemnizaciones.

### D. Reportes Fiscales (El Salvador)
- **F-07 (IVA):** Débito vs Crédito fiscal (13%).
- **F-14 (Pago a Cuenta):** Cálculo del 1.75% sobre ingresos brutos mensuales.
- **F-11 (ISR Anual):** Estimación de impuesto sobre la renta (25% o 30%).

---

## 🏢 4. Tipos de Empresas y Servicios
El ERP está optimizado para:
- **Empresas de Servicios:** Consultorías, agencias, freelancers.
- **Comerciales/Retail:** Compra y venta de bienes con manejo de costo de ventas.
- **Outsourcing Contable:** Despachos contables que manejan múltiples empresas (soporta `CompanyGroups`).

---

## ⚙️ 5. Configuraciones Globales
- **Moneda:** USD ($).
- **Tasas Impositivas:**
  - IVA: 13%
  - ISR PYME: 25% (Ingresos < $150k) / 30% (Ingresos > $150k).
  - Pago a Cuenta: 1.75%.
  - Reserva Legal: 7% de la utilidad neta (hasta el 20% del capital).
- **Depreciación:** Método de línea recta (Edificios 20 años, Vehículos 4 años, Maquinaria 5 años, Cómputo 2 años).

---

## 📂 6. Desglose de Componentes

### Backend (APIs - `src/app/api/...`)
- `/transactions`: Registro y mapeo contable.
- `/fixed-assets`: Gestión y depreciación de activos.
- `/financial-statements`: Generación de Balance, Resultados y Flujo.
- `/payroll`: Procesamiento de nóminas.

### Lógica de Negocio (`src/lib/...`)
- `auto-journal.ts`: El "corazón" que traduce transacciones a contabilidad.
- `financial-statements.ts`: Algoritmos para construir estados financieros en tiempo real.
- `sv-payroll.ts`: Motor de cálculos laborales salvadoreños.

### UI (Dashboard - `src/app/(dashboard)/...`)
- **Métricas EBITDA:** Dashboard visual con semáforos de rentabilidad y liquidez.
- **Panel Fiscal:** Selector de períodos para declaraciones de impuestos.

---

## 📈 7. Resumen de Implementación (Logros)
Hasta la fecha se han completado las 7 fases críticas:
1. ✅ Catálogo de cuentas SV sembrado.
2. ✅ Motor de asientos automáticos.
3. ✅ Control de Activos Fijos y Depreciaciones.
4. ✅ Aging de CxC y CxP.
5. ✅ Los 4 Estados Financieros básicos (NIIF).
6. ✅ Dashboard de métricas EBITDA.
7. ✅ Reportes fiscales automáticos.
