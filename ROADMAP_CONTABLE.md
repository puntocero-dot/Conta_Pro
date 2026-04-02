# ROADMAP CONTABLE — Conta Pro
# Próxima sesión: continuar desde aquí
# Repo: https://github.com/puntocero-dot/Conta_Pro
# Stack: Next.js 16 App Router, Prisma, PostgreSQL (Railway), CSS Modules

## ESTADO ACTUAL (lo que ya existe)
- Transaction INGRESO/EGRESO con Category + JournalEntry doble partida
- Account model (code, name, type, companyId) — existe pero sin catálogo SV
- JournalEntry + JournalEntryLine (debit/credit) — existe pero no se auto-genera al crear transacción
- Payroll, Loan, Provision models (recién creados)
- FilterContext, ThemeContext, layout moderno

## PROBLEMA CRÍTICO A RESOLVER PRIMERO
Al crear un INGRESO o EGRESO, el sistema NO genera automáticamente el asiento
contable (JournalEntry) en las cuentas correctas del catálogo. Eso impide generar
Balance General, Estado de Resultados y Flujo de Efectivo reales.

---

## FASE 1 — CATÁLOGO DE CUENTAS EL SALVADOR (NIIF PYMES)

### 1A. Seed del Catálogo Estándar SV
Crear `src/lib/sv-chart-of-accounts.ts` con el catálogo completo:

```
ACTIVOS (1xxxx)
  1.1 Activo Corriente
    1101 Caja y Bancos
    1102 Cuentas por Cobrar Clientes        ← aging 30/60/90
    1103 Documentos por Cobrar
    1104 Inventarios
    1105 IVA Crédito Fiscal
    1106 Pago a Cuenta por recuperar
    1107 Anticipos a proveedores
  1.2 Activo No Corriente
    1201 Terrenos
    1202 Edificios y Construcciones
    1202D Depreciación Acumulada — Edificios
    1203 Maquinaria y Equipo
    1203D Depreciación Acumulada — Maquinaria
    1204 Vehículos
    1204D Depreciación Acumulada — Vehículos
    1205 Mobiliario y Equipo de Oficina
    1205D Depreciación Acumulada — Mobiliario
    1206 Equipo de Cómputo
    1206D Depreciación Acumulada — Cómputo
    1207 Activos Intangibles (software, licencias)

PASIVOS (2xxxx)
  2.1 Pasivo Corriente
    2101 Cuentas por Pagar Proveedores      ← aging 30/60/90
    2102 Documentos por Pagar
    2103 AFP por Pagar (laboral + patronal)
    2104 ISSS por Pagar (laboral + patronal)
    2105 INSAFORP por Pagar
    2106 ISR Retenido por Pagar (empleados)
    2107 ISR Pago a Cuenta por Pagar
    2108 IVA Débito Fiscal por Pagar
    2109 Impuesto Municipal por Pagar
    2110 Sueldos por Pagar
    2111 Vacaciones por Pagar (previsión)
    2112 Aguinaldo por Pagar (previsión)
    2113 Indemnización por Pagar (previsión)
    2114 Bonos por Pagar
    2115 Cuotas de Préstamos CP (corriente)
    2116 Intereses por Pagar
  2.2 Pasivo No Corriente
    2201 Préstamos Bancarios LP
    2202 Documentos por Pagar LP

PATRIMONIO (3xxxx)
    3101 Capital Social
    3102 Reserva Legal (7% util. neta / año)
    3103 Utilidades Retenidas
    3104 Utilidad / Pérdida del Ejercicio

INGRESOS (4xxxx)
    4101 Ventas de Bienes
    4102 Prestación de Servicios
    4103 Ingresos Financieros (intereses ganados)
    4104 Otros Ingresos no Operacionales

COSTOS (5xxxx)
    5101 Costo de Ventas
    5102 Costo de Servicios

GASTOS (6xxxx)
  6.1 Gastos de Operación
    6101 Sueldos y Salarios
    6102 Cargas Sociales (AFP+ISSS+INSAFORP patronal)
    6103 Vacaciones
    6104 Aguinaldo
    6105 Indemnizaciones
    6106 Bonos y Comisiones
    6107 Alquiler
    6108 Energía Eléctrica
    6109 Agua
    6110 Telecomunicaciones
    6111 Papelería y Útiles
    6112 Publicidad y Marketing
    6113 Mantenimiento y Reparaciones
    6114 Seguros
    6115 Impuesto Municipal
    6116 Depreciaciones                      ← EBITDA starts here
    6117 Amortizaciones de Intangibles
  6.2 Gastos Financieros
    6201 Intereses Bancarios
    6202 Comisiones Bancarias
  6.3 Otros Gastos
    6301 Pérdidas en venta de activos
    6302 Gastos varios
```

### 1B. API para sembrar catálogo
`POST /api/companies/[id]/seed-accounts`
- Si la empresa no tiene cuentas, inserta el catálogo completo
- Llamado automáticamente al crear una empresa nueva

---

## FASE 2 — MAPEADOR TRANSACCIÓN → ASIENTO CONTABLE

### 2A. Tabla de mapeo Category → Cuentas contables
Añadir a Category model:
```prisma
model Category {
  ...
  debitAccountCode  String?   // cuenta que se debita
  creditAccountCode String?   // cuenta que se acredita
}
```

Mapeo estándar:
```
INGRESO — Ventas:           DB 1101 Caja/Bancos | CR 4101 Ventas
INGRESO — Servicios:        DB 1101 Caja/Bancos | CR 4102 Servicios
EGRESO — Sueldos netos:     DB 6101 Sueldos     | CR 1101 Caja
EGRESO — AFP:               DB 6102 Cargas Soc. | CR 2103 AFP x Pagar
EGRESO — ISSS:              DB 6102 Cargas Soc. | CR 2104 ISSS x Pagar
EGRESO — Alquiler:          DB 6107 Alquiler    | CR 1101 Caja
EGRESO — Capital préstamo:  DB 2201 Préstamos   | CR 1101 Caja
EGRESO — Intereses:         DB 6201 Intereses   | CR 1101 Caja
PROVISION — Vacaciones:     DB 6103 Vacaciones  | CR 2111 Vac x Pagar
PROVISION — Aguinaldo:      DB 6104 Aguinaldo   | CR 2112 Aguin x Pagar
```

### 2B. Hook automático en POST /api/transactions
Después de crear la transacción, auto-generar JournalEntry:
```typescript
// src/lib/auto-journal.ts
export async function createAutoJournalEntry(
  tx: Transaction,
  category: Category & { debitAccountCode, creditAccountCode }
) {
  // Buscar las cuentas por código
  // Crear JournalEntry con dos JournalEntryLines (débito + crédito)
  // Referenciar transactionId en JournalEntry.metadata
}
```

---

## FASE 3 — ACTIVOS FIJOS Y DEPRECIACIONES

### 3A. Nuevo modelo FixedAsset
```prisma
model FixedAsset {
  id              String   @id @default(uuid())
  companyId       String
  name            String
  accountCode     String   // 1202, 1203, 1204, etc.
  purchaseDate    DateTime
  purchaseCost    Float
  residualValue   Float    @default(0)
  usefulLifeYears Int      // vida útil fiscal SV
  depreciationMethod String @default("STRAIGHT_LINE") // o ACCELERATED
  accumulatedDepr Float    @default(0)
  bookValue       Float    // purchaseCost - accumulatedDepr
  status          String   @default("ACTIVE") // ACTIVE, SOLD, SCRAPPED
  metadata        Json?
  company         Company  @relation(...)
  depreciations   AssetDepreciation[]
}

model AssetDepreciation {
  id            String   @id @default(uuid())
  assetId       String
  year          Int
  month         Int
  amount        Float    // cuota mensual
  accumulatedDepr Float
  journalEntryId String?
  asset         FixedAsset @relation(...)
}
```

Tasas de depreciación (Ley ISR El Salvador):
- Edificios: 5% anual (20 años)
- Vehículos: 25% anual (4 años)
- Maquinaria: 20% anual (5 años)
- Cómputo: 50% anual (2 años)
- Mobiliario: 50% anual (2 años)
- Intangibles: 20% anual (5 años)

API: `POST /api/fixed-assets/[id]/depreciate` → genera asiento DB 6116 / CR 1202D

---

## FASE 4 — CUENTAS POR COBRAR Y PAGAR CON AGING

### 4A. Aging de Cuentas por Cobrar
Nuevo campo en Transaction:
```prisma
model Transaction {
  ...
  dueDate       DateTime?  // fecha de vencimiento
  isPaid        Boolean    @default(true)
  creditDays    Int?       // 30, 60, 90
}
```

API: `GET /api/receivables?aging=true`
Responde:
```json
{
  "current":  [{ clientId, clientName, amount, dueDate }],
  "days30":   [...],  // vencidas 1-30 días
  "days60":   [...],  // vencidas 31-60 días
  "days90":   [...],  // vencidas 61-90 días
  "over90":   [...]   // más de 90 días
}
```

### 4B. Aging de Cuentas por Pagar
Igual pero para EGRESO con dueDate en el futuro.

---

## FASE 5 — ESTADOS FINANCIEROS COMPLETOS

### 5A. Balance General
`GET /api/financial-statements/balance-sheet?date=2025-12-31`

Algoritmo:
1. Sumar todos los JournalEntryLine agrupados por accountCode
2. Calcular saldo neto (débitos - créditos) por cuenta
3. Agrupar: Activos / Pasivos / Patrimonio
4. Verificar: Activos = Pasivos + Patrimonio ✓

Estructura respuesta:
```json
{
  "date": "2025-12-31",
  "assets": {
    "current": { "total": 0, "accounts": [...] },
    "nonCurrent": { "total": 0, "accounts": [...] }
  },
  "liabilities": {
    "current": { "total": 0 },
    "nonCurrent": { "total": 0 }
  },
  "equity": { "total": 0, "accounts": [...] },
  "balanced": true
}
```

### 5B. Estado de Resultados
`GET /api/financial-statements/income-statement?startDate=&endDate=`

```
(+) Ingresos por Ventas/Servicios         (4xxx)
(-) Costo de Ventas/Servicios             (5xxx)
= UTILIDAD BRUTA
(-) Gastos de Operación sin depreciación  (6101-6115)
= EBITDA
(-) Depreciaciones y Amortizaciones       (6116-6117)
= EBIT (Utilidad Operativa)
(-) Gastos Financieros                    (6201-6202)
= EBT (Utilidad antes ISR)
(-) ISR (25% sobre renta neta SV)
= UTILIDAD NETA
(-) Reserva Legal (7% si es S.A. o S de R.L.)
= UTILIDAD DISTRIBUIBLE
```

### 5C. Estado de Flujo de Efectivo (Método Indirecto — NIIF PYMES §7)
`GET /api/financial-statements/cash-flow?startDate=&endDate=`

```
ACTIVIDADES DE OPERACIÓN
  Utilidad Neta
  + Depreciaciones (non-cash)
  + Amortizaciones (non-cash)
  + Previsiones devengadas (affectsCash=false)
  ± Cambio en Cuentas por Cobrar
  ± Cambio en Inventarios
  ± Cambio en Cuentas por Pagar
  ± Cambio en IVA por Pagar
= Flujo Neto de Operación

ACTIVIDADES DE INVERSIÓN
  - Compra de Activos Fijos
  + Venta de Activos Fijos
= Flujo Neto de Inversión

ACTIVIDADES DE FINANCIAMIENTO
  + Préstamos recibidos
  - Abono a capital (cashFlowCategory=FINANCING)
  - Dividendos pagados
= Flujo Neto de Financiamiento

VARIACIÓN NETA DE EFECTIVO
+ Saldo inicial de caja
= SALDO FINAL DE CAJA
```

### 5D. Estado de Capital Contable
`GET /api/financial-statements/equity-statement?year=2025`

```
Saldo inicial Capital Social
+ Aportaciones del período
+ Utilidad Neta del período
- Distribución de utilidades
- Dividendos decretados
+ Reserva Legal constituida
= Saldo final Patrimonio
```

### 5E. Estado de Cambios en la Situación Financiera
(Similar a flujo de efectivo pero en base devengado, requerido Código de Comercio SV)

---

## FASE 6 — MÉTRICAS FINANCIERAS Y EBITDA

### 6A. Dashboard de Métricas
`GET /api/financial-metrics?startDate=&endDate=`

```typescript
{
  // Rentabilidad
  ebitda: number,
  ebitdaMargin: number,          // EBITDA / Ingresos
  ebit: number,
  netMargin: number,             // Utilidad Neta / Ingresos
  grossMargin: number,           // Utilidad Bruta / Ingresos

  // Liquidez
  currentRatio: number,          // Activo Corriente / Pasivo Corriente
  quickRatio: number,            // (AC - Inventarios) / PC
  cashRatio: number,             // Caja / PC

  // Endeudamiento
  debtToEquity: number,          // Total Pasivo / Patrimonio
  debtToAssets: number,          // Total Pasivo / Total Activo
  coverageRatio: number,         // EBIT / Intereses

  // Actividad
  daysReceivable: number,        // Cuentas x Cobrar / (Ingresos/365)
  daysPayable: number,           // Cuentas x Pagar / (Costos/365)

  // Impuestos SV
  ivaBalance: number,            // IVA Débito - IVA Crédito
  pagoACuenta: number,           // 1.75% ingresos brutos
  isrEstimado: number,           // ISR estimado del período
  reservaLegal: number           // 7% utilidad neta
}
```

---

## FASE 7 — REPORTES FISCALES SV

### 7A. Declaración de IVA (F-07)
`GET /api/tax-reports/iva?month=&year=`
- Débito Fiscal (IVA en ventas 13%)
- Crédito Fiscal (IVA en compras)
- Saldo a pagar o remanente

### 7B. Pago a Cuenta (F-14)
`GET /api/tax-reports/pago-a-cuenta?month=&year=`
- 1.75% de ingresos brutos del mes
- Anticipos ISR pagados
- Saldo acumulado vs ISR estimado anual

### 7C. Declaración ISR (F-11 anual)
- Renta neta imponible
- ISR causado (25% o 30% para ingresos > $150,000)
- Pagos a cuenta deducibles
- ISR por pagar / saldo a favor

---

## ORDEN DE IMPLEMENTACIÓN RECOMENDADO

1. **FASE 1** — Catálogo de cuentas + seed automático al crear empresa
2. **FASE 2A** — Agregar debitAccountCode/creditAccountCode a Category + migration
3. **FASE 2B** — Hook auto-journal en POST /api/transactions (CRÍTICO para todo lo demás)
4. **FASE 5A** — Balance General (ya que JournalEntries estarán pobladas)
5. **FASE 5B** — Estado de Resultados + EBITDA
6. **FASE 5C** — Flujo de Efectivo
7. **FASE 3** — Activos Fijos + Depreciaciones (FixedAsset model + migration)
8. **FASE 4** — Aging CxC y CxP (dueDate en Transaction)
9. **FASE 6** — Métricas financieras dashboard
10. **FASE 7** — Reportes fiscales IVA / Pago a Cuenta / ISR
11. **FASE 5D/5E** — Capital contable + cambios situación financiera

## ARCHIVOS CLAVE A CREAR

src/lib/sv-chart-of-accounts.ts     ← catálogo completo
src/lib/auto-journal.ts             ← hook automático asientos
src/lib/financial-statements.ts     ← lógica de los 5 estados
src/lib/financial-metrics.ts        ← EBITDA, ratios, métricas
src/app/api/companies/[id]/seed-accounts/route.ts
src/app/api/fixed-assets/route.ts
src/app/api/fixed-assets/[id]/depreciate/route.ts
src/app/api/receivables/route.ts     ← aging CxC
src/app/api/payables/route.ts        ← aging CxP
src/app/api/financial-statements/balance-sheet/route.ts
src/app/api/financial-statements/income-statement/route.ts
src/app/api/financial-statements/cash-flow/route.ts
src/app/api/financial-statements/equity-statement/route.ts
src/app/api/financial-metrics/route.ts
src/app/api/tax-reports/iva/route.ts
src/app/api/tax-reports/pago-a-cuenta/route.ts
src/app/(dashboard)/fixed-assets/page.tsx
src/app/(dashboard)/receivables/page.tsx
src/app/(dashboard)/financial-statements/page.tsx  ← tabs con 5 estados
src/app/(dashboard)/financial-metrics/page.tsx     ← dashboard EBITDA + KPIs

## MIGRATIONS PENDIENTES

1. Category: + debitAccountCode String?, + creditAccountCode String?
2. Transaction: + dueDate DateTime?, + isPaid Boolean @default(true), + creditDays Int?
3. FixedAsset + AssetDepreciation (nuevos modelos)
4. Account: + isSystemAccount Boolean @default(false) (para el catálogo SV)

## NOTAS IMPORTANTES

- Todo JournalEntry debe referenciar el transactionId en metadata para trazabilidad
- El catálogo de cuentas SV usa NIIF PYMES (no NIIF completas)
- ISR El Salvador: 25% sobre renta neta (30% si ingresos > $150,000 anuales)
- IVA: 13% tasa única, declaración mensual, pago antes del 31 del mes siguiente
- Pago a Cuenta: 1.75% ingresos brutos mensuales, formulario F-14
- Reserva Legal: 7% de utilidad neta hasta completar 20% del capital (Código de Comercio Art. 123)
- Depreciación fiscal vs contable puede diferir — generar diferencia temporaria
- EBITDA = Earnings Before Interest, Taxes, Depreciation and Amortization
