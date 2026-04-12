/**
 * Configuración por país - Multi-Country Support
 * Conta_pro - Sistema Contable para Centroamérica
 */

import { encrypt, decrypt } from '../encryption/crypto';

export enum Country {
    SV = 'SV', // El Salvador
    GT = 'GT', // Guatemala
    HN = 'HN', // Honduras
    NI = 'NI', // Nicaragua
    CR = 'CR', // Costa Rica
    PA = 'PA', // Panamá
}

export interface CountryConfig {
    code: Country;
    name: string;
    currency: string;
    currencySymbol: string;
    taxIdFormat: RegExp;
    taxIdLabel: string;
    dateFormat: string;
    timezone: string;
    fiscalYearStart: string; // MM-DD
    vatRate: number; // IVA
    locale: string;
    phonePrefix: string;
    features: {
        electronicInvoicing: boolean;
        cfdi: boolean; // Comprobante Fiscal Digital
        retentions: boolean;
    };
}

/**
 * Configuraciones por país
 */
export const COUNTRY_CONFIGS: Record<Country, CountryConfig> = {
    [Country.SV]: {
        code: Country.SV,
        name: 'El Salvador',
        currency: 'USD',
        currencySymbol: '$',
        taxIdFormat: /^\d{4}-\d{6}-\d{3}-\d$/,
        taxIdLabel: 'NIT',
        dateFormat: 'DD/MM/YYYY',
        timezone: 'America/El_Salvador',
        fiscalYearStart: '01-01',
        vatRate: 0.13, // 13%
        locale: 'es-SV',
        phonePrefix: '+503',
        features: {
            electronicInvoicing: true,
            cfdi: false,
            retentions: true,
        },
    },
    [Country.GT]: {
        code: Country.GT,
        name: 'Guatemala',
        currency: 'GTQ',
        currencySymbol: 'Q',
        taxIdFormat: /^\d{7,8}-\d$/,
        taxIdLabel: 'NIT',
        dateFormat: 'DD/MM/YYYY',
        timezone: 'America/Guatemala',
        fiscalYearStart: '01-01',
        vatRate: 0.12, // 12%
        locale: 'es-GT',
        phonePrefix: '+502',
        features: {
            electronicInvoicing: true,
            cfdi: true,
            retentions: true,
        },
    },
    [Country.HN]: {
        code: Country.HN,
        name: 'Honduras',
        currency: 'HNL',
        currencySymbol: 'L',
        taxIdFormat: /^\d{14}$/,
        taxIdLabel: 'RTN',
        dateFormat: 'DD/MM/YYYY',
        timezone: 'America/Tegucigalpa',
        fiscalYearStart: '01-01',
        vatRate: 0.15, // 15%
        locale: 'es-HN',
        phonePrefix: '+504',
        features: {
            electronicInvoicing: true,
            cfdi: false,
            retentions: true,
        },
    },
    [Country.NI]: {
        code: Country.NI,
        name: 'Nicaragua',
        currency: 'NIO',
        currencySymbol: 'C$',
        taxIdFormat: /^\d{3}-\d{6}-\d{4}[A-Z]$/,
        taxIdLabel: 'RUC',
        dateFormat: 'DD/MM/YYYY',
        timezone: 'America/Managua',
        fiscalYearStart: '01-01',
        vatRate: 0.15, // 15%
        locale: 'es-NI',
        phonePrefix: '+505',
        features: {
            electronicInvoicing: true,
            cfdi: false,
            retentions: true,
        },
    },
    [Country.CR]: {
        code: Country.CR,
        name: 'Costa Rica',
        currency: 'CRC',
        currencySymbol: '₡',
        taxIdFormat: /^\d{9,12}$/,
        taxIdLabel: 'Cédula Jurídica',
        dateFormat: 'DD/MM/YYYY',
        timezone: 'America/Costa_Rica',
        fiscalYearStart: '10-01', // Octubre 1
        vatRate: 0.13, // 13%
        locale: 'es-CR',
        phonePrefix: '+506',
        features: {
            electronicInvoicing: true,
            cfdi: false,
            retentions: true,
        },
    },
    [Country.PA]: {
        code: Country.PA,
        name: 'Panamá',
        currency: 'USD',
        currencySymbol: '$',
        taxIdFormat: /^\d{1,9}-\d{1,2}-\d{1,6}$/,
        taxIdLabel: 'RUC',
        dateFormat: 'DD/MM/YYYY',
        timezone: 'America/Panama',
        fiscalYearStart: '01-01',
        vatRate: 0.07, // 7% ITBMS
        locale: 'es-PA',
        phonePrefix: '+507',
        features: {
            electronicInvoicing: true,
            cfdi: false,
            retentions: true,
        },
    },
};

/**
 * Obtiene la configuración de un país
 */
export function getCountryConfig(countryCode: Country): CountryConfig {
    const config = COUNTRY_CONFIGS[countryCode];
    if (!config) {
        throw new Error(`Country configuration not found: ${countryCode}`);
    }
    return config;
}

/**
 * Valida un Tax ID según el país
 */
export function validateTaxId(taxId: string, country: Country): boolean {
    const config = getCountryConfig(country);
    return config.taxIdFormat.test(taxId);
}

/**
 * Formatea un monto de dinero según el país
 */
export function formatCurrency(amount: number, country: Country): string {
    const config = getCountryConfig(country);
    return new Intl.NumberFormat(config.locale, {
        style: 'currency',
        currency: config.currency,
    }).format(amount);
}

/**
 * Formatea una fecha según el país
 */
export function formatDate(date: Date, country: Country): string {
    const config = getCountryConfig(country);
    return new Intl.DateTimeFormat(config.locale).format(date);
}

/**
 * Calcula el IVA según el país
 */
export function calculateVAT(amount: number, country: Country): {
    subtotal: number;
    vat: number;
    total: number;
} {
    const config = getCountryConfig(country);
    const subtotal = amount;
    const vat = amount * config.vatRate;
    const total = subtotal + vat;

    return {
        subtotal: Math.round(subtotal * 100) / 100,
        vat: Math.round(vat * 100) / 100,
        total: Math.round(total * 100) / 100,
    };
}

/**
 * Guarda configuración encriptada en la base de datos
 */
export function encryptCountrySpecificData(data: unknown): string {
    return encrypt(JSON.stringify(data));
}

/**
 * Recupera configuración encriptada de la base de datos
 */
export function decryptCountrySpecificData<T>(encryptedData: string): T {
    const decrypted = decrypt(encryptedData);
    return JSON.parse(decrypted);
}

/**
 * Obtiene el país desde el contexto de la sesión
 */
export function getCurrentCountry(): Country {
    // En producción, esto vendría del contexto del usuario/empresa
    // Por ahora, usar variable de entorno o default
    const countryCode = process.env.NEXT_PUBLIC_DEFAULT_COUNTRY || 'SV';
    return countryCode as Country;
}

/**
 * Lista todos los países soportados
 */
export function getSupportedCountries(): CountryConfig[] {
    return Object.values(COUNTRY_CONFIGS);
}
