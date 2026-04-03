# Conta Pro — Contexto de Sesión
# Última actualización: 2026-04-03
# Repo: https://github.com/puntocero-dot/Conta_Pro
# Stack: Next.js 16 App Router, Prisma, PostgreSQL (Railway), CSS Modules

## ✅ TODO IMPLEMENTADO — Motor Contable Completo

### FASE 1 — Catálogo de Cuentas SV (NIIF PYMES)
- `src/lib/sv-chart-of-accounts.ts` — 66 cuentas 1101-6302
- `src/app/api/companies/[id]/seed-accounts/route.ts` — POST para sembrar catálogo

### FASE 2 — Auto-Journal en Transacciones
- `src/lib/auto-journal.ts` — Crea JournalEntry automático al crear transacción
- `src/app/api/transactions/route.ts` — POST llama createAutoJournalEntry()
- Category.debitAccountCode + Category.creditAccountCode añadidos al schema
- Transaction.dueDate + isPaid + creditDays añadidos al schema

### FASE 3 — Activos Fijos (FixedAsset + AssetDepreciation)
- `src/app/api/fixed-assets/route.ts` — GET/POST
- `src/app/api/fixed-assets/[id]/depreciate/route.ts` — POST mensual
- `src/app/(dashboard)/fixed-assets/page.tsx` — UI con tabla y modal
- Tasas SV: Edificios 5%, Maquinaria 20%, Vehículos 25%, Cómputo 50%, Mobiliario 50%

### FASE 4 — Aging CxC / CxP
- `src/app/api/receivables/route.ts` — INGRESO isPaid=false, buckets 30/60/90
- `src/app/api/payables/route.ts` — EGRESO isPaid=false, buckets 30/60/90
- `src/app/(dashboard)/receivables/page.tsx` — tabs CxC / CxP con colores

### FASE 5 — Estados Financieros (4 estados)
- `src/lib/financial-statements.ts` — buildBalanceSheet, buildIncomeStatement, buildCashFlow, buildEquityStatement
- `src/app/api/financial-statements/balance-sheet/route.ts`
- `src/app/api/financial-statements/income-statement/route.ts`
- `src/app/api/financial-statements/cash-flow/route.ts`
- `src/app/api/financial-statements/equity-statement/route.ts`
- `src/app/(dashboard)/financial-statements/page.tsx` — 4 tabs + print PDF

### FASE 6 — Métricas EBITDA
- `src/lib/financial-metrics.ts` — calcFinancialMetrics()
- `src/app/api/financial-metrics/route.ts`
- `src/app/(dashboard)/financial-metrics/page.tsx` — KPI cards con semáforo

### FASE 7 — Reportes Fiscales SV
- `src/app/api/tax-reports/iva/route.ts` — F-07 IVA 13%
- `src/app/api/tax-reports/pago-a-cuenta/route.ts` — F-14 1.75%
- `src/app/api/tax-reports/isr/route.ts` — F-11 ISR 25%/30%
- `src/app/(dashboard)/tax-reports/page.tsx` — selector mes/año, 3 tabs

### Sidebar Actualizado
- Grupos: main, labor, finance, **accounting**, **fiscal**, admin
- Contabilidad: Activos Fijos, CxC/CxP, Estados Financieros, Métricas EBITDA
- Fiscal: Reportes Fiscales

---

## Migraciones aplicadas en Railway
- Category: +debitAccountCode, +creditAccountCode
- Transaction: +dueDate, +isPaid (default true), +creditDays
- FixedAsset: nueva tabla
- AssetDepreciation: nueva tabla

---

## Lo que PODRÍA quedar pendiente / mejoras futuras

### Funcional
1. **Seed automático al crear empresa** — Llamar POST /api/companies/{id}/seed-accounts automáticamente en el POST de /api/companies cuando se crea una empresa nueva
2. **Categorías con mapeo contable** — En la UI de categorías, agregar campos para debitAccountCode/creditAccountCode (select del catálogo SV)
3. **Marcar transacción como cobrada/pagada** — Botón en transacciones para flipar isPaid=true (para aging)
4. **Estado de Cambios en Situación Financiera** (FASE 5E del roadmap) — pendiente
5. **Bulk depreciation** — Botón "Depreciar todos los activos" del mes con un solo click

### Técnico
6. **Unit tests** para calcISRMensual, buildBalanceSheet, calcFinancialMetrics
7. **Cache de estados financieros** — Son queries pesadas; considerar revalidación por tiempo
8. **Exportar a Excel** — Usar xlsx library para estados financieros y planillas

---

## Contexto clave

### Auth
- JWT en cookie httpOnly (`x-company-id` header o membresía del usuario)
- Roles: SUPER_ADMIN, CONTADOR, CLIENTE, AUDITOR

### Ledger
- `src/lib/accounting/ledger.ts` — LedgerService.processTransaction() legacy (sigue activo)
- `src/lib/auto-journal.ts` — nuevo hook que usa catálogo SV

### Planillas SV
- `src/lib/sv-payroll.ts` — AFP 7.25%/8.75%, ISSS 3%/7.5%, INSAFORP 1%, ISR Art.154
- `src/app/api/payroll/route.ts` + `src/app/api/payroll/[id]/approve/route.ts`

### Préstamos
- `src/app/api/loans/route.ts` + `src/app/api/loans/[id]/payments/route.ts`
- Split capital (FINANCING) vs interés (OPERATING) para flujo de efectivo

### Previsiones
- `src/app/api/provisions/route.ts` — affectsCash en metadata para no-cash items
- Tipos: VACATION, AGUINALDO, INDEMNIZACION, BONO_SEMESTRAL, OTHER

### DB Railway
- Para aplicar migraciones: node scripts/apply-migration.mjs
- `npx prisma migrate diff --from-schema-datasource prisma/schema.prisma --to-schema-datamodel prisma/schema.prisma --script` para generar SQL

---

## Decisiones de migración pendientes
El usuario quiere evaluar migrar a **Vercel (hosting) + Supabase (DB)** después de terminar el roadmap.
- Supabase = mismo PostgreSQL, solo cambiar DATABASE_URL, código Prisma no cambia
- Vercel = deploy automático desde GitHub, mejor para Next.js
- Recomendación: Vercel + Supabase (ambos free tiers generosos)
