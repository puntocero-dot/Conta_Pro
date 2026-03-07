'use client';

import { useRouter } from 'next/navigation';

export default function SecurityAlertsPage() {
    const router = useRouter();

    return (
        <div className="card animate-fade-in">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <h2>Configuración de Alertas</h2>
                <button onClick={() => router.back()} className="btn btn-secondary">
                    Volver
                </button>
            </div>
            <p>Define umbrales y notificaciones para eventos de seguridad.</p>
        </div>
    );
}
