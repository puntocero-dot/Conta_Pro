'use client';

import { useRouter } from 'next/navigation';

export default function AuditLogsPage() {
    const router = useRouter();

    return (
        <div className="card animate-fade-in">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <h2>Registro de Auditoría Completo</h2>
                <button onClick={() => router.back()} className="btn btn-secondary">
                    Volver
                </button>
            </div>
            <p>Aquí se mostrarán todos los registros de seguridad del sistema.</p>
            {/* TODO: Implement full audit logs table */}
        </div>
    );
}
