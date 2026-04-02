'use client';

import { useState, useEffect, useCallback } from 'react';
import { useCompany } from '@/context/CompanyContext';
import { formatDateTime } from '@/lib/formatting';

interface AuditLog {
    id: string;
    timestamp: string;
    action: string;
    resource: string;
    resourceId?: string;
    ipAddress: string;
    result: string;
    user?: { email: string };
}

const RESULT_COLORS: Record<string, string> = {
    SUCCESS: '#16a34a',
    FAILURE: '#dc2626',
    WARNING: '#d97706',
};

const PAGE_SIZE = 25;

export default function AuditLogsPage() {
    const { activeCompanyId } = useCompany();
    const [logs, setLogs] = useState<AuditLog[]>([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(0);
    const [hasMore, setHasMore] = useState(false);
    const [filters, setFilters] = useState({ action: '', result: '', search: '' });

    const fetchLogs = useCallback(async (pageNum = 0) => {
        setLoading(true);
        try {
            const params = new URLSearchParams({
                limit: String(PAGE_SIZE + 1),
                offset: String(pageNum * PAGE_SIZE),
                ...(filters.action && { action: filters.action }),
                ...(filters.result && { result: filters.result }),
            });
            const res = await fetch(`/api/audit/logs?${params}`, {
                headers: {
                    'X-Requested-With': 'XMLHttpRequest',
                    ...(activeCompanyId ? { 'x-company-id': activeCompanyId } : {}),
                },
            });
            if (res.ok) {
                const data = await res.json();
                const items: AuditLog[] = data.logs || [];
                setHasMore(items.length > PAGE_SIZE);
                setLogs(items.slice(0, PAGE_SIZE));
            }
        } catch {
            // silent
        } finally {
            setLoading(false);
        }
    }, [activeCompanyId, filters]);

    useEffect(() => {
        setPage(0);
        fetchLogs(0);
    }, [filters, fetchLogs]);

    const handlePageChange = (newPage: number) => {
        setPage(newPage);
        fetchLogs(newPage);
    };

    const filteredLogs = filters.search
        ? logs.filter(l =>
            l.action.toLowerCase().includes(filters.search.toLowerCase()) ||
            l.resource.toLowerCase().includes(filters.search.toLowerCase()) ||
            l.user?.email?.toLowerCase().includes(filters.search.toLowerCase()) ||
            l.ipAddress.includes(filters.search)
        )
        : logs;

    const uniqueActions = Array.from(new Set(logs.map(l => l.action))).sort();

    return (
        <div className="animate-fade-in">
            <div style={{ marginBottom: '2rem' }}>
                <h1 style={{ marginBottom: '0.25rem' }}>Registro de Auditoría</h1>
                <p>Historial completo de acciones del sistema</p>
            </div>

            <div className="card" style={{ padding: '1rem 1.5rem', marginBottom: '1.5rem' }}>
                <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
                    <input
                        type="text"
                        placeholder="Buscar por acción, recurso, IP o usuario..."
                        className="input"
                        style={{ flex: 1, minWidth: '220px' }}
                        value={filters.search}
                        onChange={e => setFilters(f => ({ ...f, search: e.target.value }))}
                    />
                    <select className="input" style={{ width: '180px' }} value={filters.action}
                        onChange={e => setFilters(f => ({ ...f, action: e.target.value }))}>
                        <option value="">Todas las acciones</option>
                        {uniqueActions.map(a => <option key={a} value={a}>{a}</option>)}
                    </select>
                    <select className="input" style={{ width: '140px' }} value={filters.result}
                        onChange={e => setFilters(f => ({ ...f, result: e.target.value }))}>
                        <option value="">Todos los resultados</option>
                        <option value="SUCCESS">Exitoso</option>
                        <option value="FAILURE">Fallido</option>
                        <option value="WARNING">Advertencia</option>
                    </select>
                    {(filters.action || filters.result || filters.search) && (
                        <button className="btn btn-ghost" onClick={() => setFilters({ action: '', result: '', search: '' })}
                            style={{ fontSize: '0.8125rem' }}>
                            Limpiar filtros
                        </button>
                    )}
                </div>
            </div>

            <div className="card" style={{ overflow: 'hidden' }}>
                {loading ? (
                    <div style={{ padding: '3rem', textAlign: 'center', color: '#94a3b8' }}>Cargando registros...</div>
                ) : filteredLogs.length === 0 ? (
                    <div style={{ padding: '3rem', textAlign: 'center', color: '#94a3b8' }}>
                        <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>🔍</div>
                        <p>No se encontraron registros</p>
                    </div>
                ) : (
                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8125rem' }}>
                            <thead>
                                <tr style={{ background: '#f8fafc', borderBottom: '1px solid var(--border)' }}>
                                    {['Fecha / Hora', 'Acción', 'Recurso', 'Usuario', 'IP', 'Resultado'].map(h => (
                                        <th key={h} style={{ padding: '0.75rem 1rem', textAlign: 'left', fontWeight: 700, color: '#64748b', whiteSpace: 'nowrap' }}>{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {filteredLogs.map(log => (
                                    <tr key={log.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                        <td style={{ padding: '0.75rem 1rem', color: '#94a3b8', whiteSpace: 'nowrap' }}>
                                            {formatDateTime(log.timestamp)}
                                        </td>
                                        <td style={{ padding: '0.75rem 1rem', fontWeight: 600, color: '#1e293b' }}>
                                            {log.action}
                                        </td>
                                        <td style={{ padding: '0.75rem 1rem', color: '#475569' }}>
                                            {log.resource}
                                            {log.resourceId && (
                                                <span style={{ color: '#94a3b8', marginLeft: '0.375rem', fontSize: '0.6875rem' }}>
                                                    #{log.resourceId.slice(0, 8)}
                                                </span>
                                            )}
                                        </td>
                                        <td style={{ padding: '0.75rem 1rem', color: '#475569' }}>
                                            {log.user?.email || <span style={{ color: '#cbd5e1' }}>—</span>}
                                        </td>
                                        <td style={{ padding: '0.75rem 1rem', color: '#94a3b8', fontFamily: 'monospace' }}>
                                            {log.ipAddress}
                                        </td>
                                        <td style={{ padding: '0.75rem 1rem' }}>
                                            <span style={{
                                                display: 'inline-flex', alignItems: 'center',
                                                padding: '0.2rem 0.6rem',
                                                background: `${RESULT_COLORS[log.result] || '#94a3b8'}18`,
                                                color: RESULT_COLORS[log.result] || '#94a3b8',
                                                borderRadius: '100px',
                                                fontSize: '0.6875rem',
                                                fontWeight: 700,
                                                textTransform: 'uppercase',
                                                letterSpacing: '0.04em',
                                            }}>
                                                {log.result}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {!loading && (hasMore || page > 0) && (
                    <div style={{ display: 'flex', justifyContent: 'center', gap: '0.75rem', padding: '1rem', borderTop: '1px solid var(--border)' }}>
                        <button className="btn btn-secondary" disabled={page === 0}
                            onClick={() => handlePageChange(page - 1)} style={{ fontSize: '0.875rem' }}>
                            Anterior
                        </button>
                        <span style={{ display: 'flex', alignItems: 'center', fontSize: '0.875rem', color: '#64748b' }}>
                            Página {page + 1}
                        </span>
                        <button className="btn btn-secondary" disabled={!hasMore}
                            onClick={() => handlePageChange(page + 1)} style={{ fontSize: '0.875rem' }}>
                            Siguiente
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
