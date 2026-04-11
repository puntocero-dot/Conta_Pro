// Catálogo de Cuentas — El Salvador (NIIF PYMES)
// Ley de Impuesto sobre la Renta + Código Tributario SV

export interface ChartAccount {
  code: string;
  name: string;
  type: 'ACTIVO' | 'PASIVO' | 'PATRIMONIO' | 'INGRESO' | 'COSTO' | 'GASTO';
  group: string; // agrupación para estados financieros
  isDepreciation?: boolean; // cuenta de depreciación acumulada
}

export const SV_CHART_OF_ACCOUNTS: ChartAccount[] = [
  // ─── ACTIVO CORRIENTE ────────────────────────────────────────────────────────
  { code: '1101', name: 'Caja y Bancos',                        type: 'ACTIVO', group: 'Activo Corriente' },
  { code: '1102', name: 'Cuentas por Cobrar Clientes',          type: 'ACTIVO', group: 'Activo Corriente' },
  { code: '1103', name: 'Documentos por Cobrar',                type: 'ACTIVO', group: 'Activo Corriente' },
  { code: '1104', name: 'Inventarios',                          type: 'ACTIVO', group: 'Activo Corriente' },
  { code: '1105', name: 'IVA Crédito Fiscal',                   type: 'ACTIVO', group: 'Activo Corriente' },
  { code: '1106', name: 'Pago a Cuenta por Recuperar',          type: 'ACTIVO', group: 'Activo Corriente' },
  { code: '1107', name: 'Anticipos a Proveedores',              type: 'ACTIVO', group: 'Activo Corriente' },
  { code: '1108', name: 'Otros Activos Corrientes',             type: 'ACTIVO', group: 'Activo Corriente' },
  { code: '1109', name: 'ISR Diferido Activo (Dif. Temporaria)',type: 'ACTIVO', group: 'Activo Corriente' },

  // ─── ACTIVO NO CORRIENTE ─────────────────────────────────────────────────────
  { code: '1201', name: 'Terrenos',                             type: 'ACTIVO', group: 'Activo No Corriente' },
  { code: '1202', name: 'Edificios y Construcciones',           type: 'ACTIVO', group: 'Activo No Corriente' },
  { code: '1202D', name: 'Depreciación Acumulada — Edificios',  type: 'ACTIVO', group: 'Activo No Corriente', isDepreciation: true },
  { code: '1203', name: 'Maquinaria y Equipo',                  type: 'ACTIVO', group: 'Activo No Corriente' },
  { code: '1203D', name: 'Depreciación Acumulada — Maquinaria', type: 'ACTIVO', group: 'Activo No Corriente', isDepreciation: true },
  { code: '1204', name: 'Vehículos',                            type: 'ACTIVO', group: 'Activo No Corriente' },
  { code: '1204D', name: 'Depreciación Acumulada — Vehículos',  type: 'ACTIVO', group: 'Activo No Corriente', isDepreciation: true },
  { code: '1205', name: 'Mobiliario y Equipo de Oficina',       type: 'ACTIVO', group: 'Activo No Corriente' },
  { code: '1205D', name: 'Depreciación Acumulada — Mobiliario', type: 'ACTIVO', group: 'Activo No Corriente', isDepreciation: true },
  { code: '1206', name: 'Equipo de Cómputo',                    type: 'ACTIVO', group: 'Activo No Corriente' },
  { code: '1206D', name: 'Depreciación Acumulada — Cómputo',    type: 'ACTIVO', group: 'Activo No Corriente', isDepreciation: true },
  { code: '1207', name: 'Activos Intangibles (Software/Lic.)',  type: 'ACTIVO', group: 'Activo No Corriente' },
  { code: '1207D', name: 'Amortización Acumulada — Intangibles',type: 'ACTIVO', group: 'Activo No Corriente', isDepreciation: true },

  // ─── PASIVO CORRIENTE ────────────────────────────────────────────────────────
  { code: '2101', name: 'Cuentas por Pagar Proveedores',        type: 'PASIVO', group: 'Pasivo Corriente' },
  { code: '2102', name: 'Documentos por Pagar CP',              type: 'PASIVO', group: 'Pasivo Corriente' },
  { code: '2103', name: 'AFP por Pagar (Laboral + Patronal)',    type: 'PASIVO', group: 'Pasivo Corriente' },
  { code: '2104', name: 'ISSS por Pagar (Laboral + Patronal)',   type: 'PASIVO', group: 'Pasivo Corriente' },
  { code: '2105', name: 'INSAFORP por Pagar',                    type: 'PASIVO', group: 'Pasivo Corriente' },
  { code: '2106', name: 'ISR Retenido por Pagar (Empleados)',    type: 'PASIVO', group: 'Pasivo Corriente' },
  { code: '2107', name: 'ISR Pago a Cuenta por Pagar',          type: 'PASIVO', group: 'Pasivo Corriente' },
  { code: '2108', name: 'IVA Débito Fiscal por Pagar',          type: 'PASIVO', group: 'Pasivo Corriente' },
  { code: '2109', name: 'Impuesto Municipal por Pagar',         type: 'PASIVO', group: 'Pasivo Corriente' },
  { code: '2110', name: 'Sueldos por Pagar',                    type: 'PASIVO', group: 'Pasivo Corriente' },
  { code: '2111', name: 'Vacaciones por Pagar (Previsión)',      type: 'PASIVO', group: 'Pasivo Corriente' },
  { code: '2112', name: 'Aguinaldo por Pagar (Previsión)',       type: 'PASIVO', group: 'Pasivo Corriente' },
  { code: '2113', name: 'Indemnización por Pagar (Previsión)',   type: 'PASIVO', group: 'Pasivo Corriente' },
  { code: '2114', name: 'Bonos por Pagar',                      type: 'PASIVO', group: 'Pasivo Corriente' },
  { code: '2115', name: 'Cuotas de Préstamos CP',               type: 'PASIVO', group: 'Pasivo Corriente' },
  { code: '2116', name: 'Intereses por Pagar',                  type: 'PASIVO', group: 'Pasivo Corriente' },
  { code: '2117', name: 'ISR Diferido por Pagar (Dif. Temporaria)', type: 'PASIVO', group: 'Pasivo Corriente' },

  // ─── PASIVO NO CORRIENTE ─────────────────────────────────────────────────────
  { code: '2201', name: 'Préstamos Bancarios LP',               type: 'PASIVO', group: 'Pasivo No Corriente' },
  { code: '2202', name: 'Documentos por Pagar LP',              type: 'PASIVO', group: 'Pasivo No Corriente' },

  // ─── PATRIMONIO ──────────────────────────────────────────────────────────────
  { code: '3101', name: 'Capital Social',                       type: 'PATRIMONIO', group: 'Patrimonio' },
  { code: '3102', name: 'Reserva Legal (7% Cód. Comercio)',     type: 'PATRIMONIO', group: 'Patrimonio' },
  { code: '3103', name: 'Utilidades Retenidas de Años Ant.',    type: 'PATRIMONIO', group: 'Patrimonio' },
  { code: '3104', name: 'Utilidad / Pérdida del Ejercicio',     type: 'PATRIMONIO', group: 'Patrimonio' },

  // ─── INGRESOS ────────────────────────────────────────────────────────────────
  { code: '4101', name: 'Ventas de Bienes',                     type: 'INGRESO', group: 'Ingresos Operacionales' },
  { code: '4102', name: 'Prestación de Servicios',              type: 'INGRESO', group: 'Ingresos Operacionales' },
  { code: '4103', name: 'Ingresos Financieros (Int. Ganados)',  type: 'INGRESO', group: 'Ingresos No Operacionales' },
  { code: '4104', name: 'Otros Ingresos No Operacionales',      type: 'INGRESO', group: 'Ingresos No Operacionales' },

  // ─── COSTOS ──────────────────────────────────────────────────────────────────
  { code: '5101', name: 'Costo de Ventas',                      type: 'COSTO', group: 'Costos' },
  { code: '5102', name: 'Costo de Servicios',                   type: 'COSTO', group: 'Costos' },

  // ─── GASTOS DE OPERACIÓN ─────────────────────────────────────────────────────
  { code: '6101', name: 'Sueldos y Salarios',                   type: 'GASTO', group: 'Gastos de Operación' },
  { code: '6102', name: 'Cargas Sociales (AFP+ISSS+INSAFORP)',  type: 'GASTO', group: 'Gastos de Operación' },
  { code: '6103', name: 'Vacaciones',                           type: 'GASTO', group: 'Gastos de Operación' },
  { code: '6104', name: 'Aguinaldo',                            type: 'GASTO', group: 'Gastos de Operación' },
  { code: '6105', name: 'Indemnizaciones',                      type: 'GASTO', group: 'Gastos de Operación' },
  { code: '6106', name: 'Bonos y Comisiones',                   type: 'GASTO', group: 'Gastos de Operación' },
  { code: '6107', name: 'Alquiler',                             type: 'GASTO', group: 'Gastos de Operación' },
  { code: '6108', name: 'Energía Eléctrica',                    type: 'GASTO', group: 'Gastos de Operación' },
  { code: '6109', name: 'Agua',                                 type: 'GASTO', group: 'Gastos de Operación' },
  { code: '6110', name: 'Telecomunicaciones',                   type: 'GASTO', group: 'Gastos de Operación' },
  { code: '6111', name: 'Papelería y Útiles',                   type: 'GASTO', group: 'Gastos de Operación' },
  { code: '6112', name: 'Publicidad y Marketing',               type: 'GASTO', group: 'Gastos de Operación' },
  { code: '6113', name: 'Mantenimiento y Reparaciones',         type: 'GASTO', group: 'Gastos de Operación' },
  { code: '6114', name: 'Seguros',                              type: 'GASTO', group: 'Gastos de Operación' },
  { code: '6115', name: 'Impuesto Municipal',                   type: 'GASTO', group: 'Gastos de Operación' },
  { code: '6116', name: 'Depreciaciones',                       type: 'GASTO', group: 'Gastos de Operación' },
  { code: '6117', name: 'Amortizaciones de Intangibles',        type: 'GASTO', group: 'Gastos de Operación' },
  { code: '6118', name: 'Gastos Generales y Administrativos',   type: 'GASTO', group: 'Gastos de Operación' },

  // ─── GASTOS FINANCIEROS ──────────────────────────────────────────────────────
  { code: '6201', name: 'Intereses Bancarios',                  type: 'GASTO', group: 'Gastos Financieros' },
  { code: '6202', name: 'Comisiones Bancarias',                 type: 'GASTO', group: 'Gastos Financieros' },

  // ─── OTROS GASTOS ────────────────────────────────────────────────────────────
  { code: '6301', name: 'Pérdidas en Venta de Activos',         type: 'GASTO', group: 'Otros Gastos' },
  { code: '6302', name: 'Gastos Varios',                        type: 'GASTO', group: 'Otros Gastos' },
];

// Tasas de depreciación fiscal (Ley ISR El Salvador, Art. 30)
export const SV_DEPRECIATION_RATES: Record<string, { rate: number; years: number; deprCode: string }> = {
  '1202': { rate: 0.05,  years: 20, deprCode: '1202D' }, // Edificios
  '1203': { rate: 0.20,  years: 5,  deprCode: '1203D' }, // Maquinaria
  '1204': { rate: 0.25,  years: 4,  deprCode: '1204D' }, // Vehículos
  '1205': { rate: 0.50,  years: 2,  deprCode: '1205D' }, // Mobiliario
  '1206': { rate: 0.50,  years: 2,  deprCode: '1206D' }, // Cómputo
  '1207': { rate: 0.20,  years: 5,  deprCode: '1207D' }, // Intangibles
};

// Mapeo por defecto de categorías comunes → cuentas contables
// Se usa cuando una categoría NO tiene debitAccountCode/creditAccountCode asignados
export const DEFAULT_ACCOUNT_MAPPING: Record<string, { debit: string; credit: string }> = {
  // INGRESOS
  'INGRESO_DEFAULT': { debit: '1101', credit: '4102' },
  'INGRESO_VENTAS':  { debit: '1101', credit: '4101' },
  'INGRESO_SERVICIO':{ debit: '1101', credit: '4102' },
  // EGRESOS
  'EGRESO_DEFAULT':  { debit: '6302', credit: '1101' },
  'EGRESO_SUELDOS':  { debit: '6101', credit: '1101' },
  'EGRESO_AFP':      { debit: '6102', credit: '2103' },
  'EGRESO_ISSS':     { debit: '6102', credit: '2104' },
  'EGRESO_INSAFORP': { debit: '6102', credit: '2105' },
  'EGRESO_ISR':      { debit: '2106', credit: '1101' },
  'EGRESO_ALQUILER': { debit: '6107', credit: '1101' },
  'EGRESO_INTERES':  { debit: '6201', credit: '1101' },
  'EGRESO_CAPITAL':  { debit: '2201', credit: '1101' },
};

export function getAccountByCode(code: string): ChartAccount | undefined {
  return SV_CHART_OF_ACCOUNTS.find(a => a.code === code);
}
