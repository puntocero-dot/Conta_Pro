'use client';

/**
 * Cliente fetch seguro que incluye headers necesarios:
 * - X-Requested-With: para protección CSRF básica
 * - x-company-id: para multi-tenant isolation
 * - Content-Type: para peticiones con body
 */
export async function apiFetch<T = unknown>(
    url: string,
    options: RequestInit & { skipCompanyHeader?: boolean } = {}
): Promise<T> {
    const { skipCompanyHeader, ...fetchOptions } = options;

    const headers: Record<string, string> = {
        'X-Requested-With': 'XMLHttpRequest',
        ...(fetchOptions.headers as Record<string, string> || {}),
    };

    // Agregar company ID desde localStorage si no está excluido
    if (!skipCompanyHeader && typeof window !== 'undefined') {
        const companyId = localStorage.getItem('contapro_active_company');
        if (companyId) {
            headers['x-company-id'] = companyId;
        }
    }

    // Agregar Content-Type para peticiones con body
    if (fetchOptions.body && !headers['Content-Type']) {
        headers['Content-Type'] = 'application/json';
    }

    const response = await fetch(url, {
        ...fetchOptions,
        headers,
    });

    if (!response.ok) {
        const data = await response.json().catch(() => ({ error: 'Error desconocido' }));
        throw new ApiError(data.error || 'Error del servidor', response.status);
    }

    return response.json() as Promise<T>;
}

export class ApiError extends Error {
    constructor(
        message: string,
        public readonly status: number
    ) {
        super(message);
        this.name = 'ApiError';
    }
}
