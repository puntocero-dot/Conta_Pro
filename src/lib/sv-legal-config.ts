/**
 * Configuración Legal por Tipo de Sociedad Mercantil (El Salvador)
 * Basado en: Código de Comercio de El Salvador
 * 
 * - S.A. (Art. 123): Reserva Legal 7%, tope 1/5 del capital social
 * - S. de R.L. (Art. 123): Reserva Legal 7%, tope 1/5 del capital social
 * - S.N.C. (Art. 50): Reserva Legal 5%, tope 1/6 del capital social
 * - Cooperativa (Ley de Cooperativas): Reserva Legal 10%, tope 1/5
 * - Persona Natural: No aplica reserva legal
 */

export type CompanyTypeKey = 'SA' | 'SRL' | 'SNC' | 'COOPERATIVA' | 'PERSONA_NATURAL';

export interface ReservaLegalConfig {
  rate: number;         // Porcentaje de reserva legal (decimal)
  capitalFraction: number; // Fracción del capital como tope (1/5 = 0.20, 1/6 = 0.1667)
  label: string;        // Descripción legible
  legalBasis: string;   // Artículo de referencia legal
}

export const RESERVA_LEGAL_CONFIG: Record<CompanyTypeKey, ReservaLegalConfig> = {
  SA: {
    rate: 0.07,
    capitalFraction: 1 / 5,   // 20% del capital social
    label: '7% hasta 1/5 del capital social',
    legalBasis: 'Código de Comercio Art. 123',
  },
  SRL: {
    rate: 0.07,
    capitalFraction: 1 / 5,
    label: '7% hasta 1/5 del capital social',
    legalBasis: 'Código de Comercio Art. 123',
  },
  SNC: {
    rate: 0.05,
    capitalFraction: 1 / 6,   // ~16.67% del capital social
    label: '5% hasta 1/6 del capital social',
    legalBasis: 'Código de Comercio Art. 50',
  },
  COOPERATIVA: {
    rate: 0.10,
    capitalFraction: 1 / 5,
    label: '10% hasta 1/5 del capital social',
    legalBasis: 'Ley General de Asociaciones Cooperativas Art. 58',
  },
  PERSONA_NATURAL: {
    rate: 0,
    capitalFraction: 0,
    label: 'No aplica reserva legal',
    legalBasis: 'N/A',
  },
};

/**
 * Calcula la reserva legal del período considerando:
 * 1. El tipo de sociedad (tasa variable)
 * 2. El tope máximo (fracción del capital social)
 * 3. La reserva acumulada existente
 */
export function calcReservaLegal(
  netIncome: number,
  companyType: CompanyTypeKey | null | undefined,
  capitalSocial: number,
  reservaAcumulada: number
): { amount: number; rate: number; capped: boolean; config: ReservaLegalConfig } {
  const type = companyType ?? 'SA'; // Default a S.A. si no está configurado
  const config = RESERVA_LEGAL_CONFIG[type];

  if (config.rate === 0 || netIncome <= 0) {
    return { amount: 0, rate: 0, capped: false, config };
  }

  const topeMaximo = capitalSocial * config.capitalFraction;

  // Si ya se alcanzó el tope, no se deduce más
  if (reservaAcumulada >= topeMaximo) {
    return { amount: 0, rate: config.rate, capped: true, config };
  }

  const reservaPeriodo = netIncome * config.rate;
  const espacioDisponible = topeMaximo - reservaAcumulada;

  // La reserva no puede exceder el espacio disponible
  const amount = Math.min(reservaPeriodo, espacioDisponible);
  const capped = reservaPeriodo > espacioDisponible;

  return {
    amount: Math.round(amount * 100) / 100,
    rate: config.rate,
    capped,
    config,
  };
}

/**
 * Tipos de libros legales requeridos por tipo de sociedad
 */
export const REQUIRED_LEGAL_BOOKS: Record<CompanyTypeKey, string[]> = {
  SA: ['ACTAS', 'ACCIONISTAS', 'DIARIO', 'MAYOR'],
  SRL: ['ACTAS', 'ACCIONISTAS', 'DIARIO', 'MAYOR'],
  SNC: ['ACTAS', 'DIARIO', 'MAYOR'],
  COOPERATIVA: ['ACTAS', 'DIARIO', 'MAYOR'],
  PERSONA_NATURAL: ['DIARIO', 'MAYOR'],
};

export const LEGAL_BOOK_LABELS: Record<string, string> = {
  ACTAS: 'Libro de Actas de Juntas Generales',
  ACCIONISTAS: 'Libro de Registro de Accionistas',
  CAPITAL_VARIABLE: 'Libro de Aumentos y Disminuciones de Capital',
  DIARIO: 'Libro Diario (Foliado)',
  MAYOR: 'Libro Mayor (Foliado)',
};
