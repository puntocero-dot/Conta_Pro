'use client';

import { useRouter } from 'next/navigation';

export default function SecurityUsersPage() {
    const router = useRouter();

    return (
        <div className="card animate-fade-in">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <h2>Gestión de Usuarios</h2>
                <button onClick={() => router.back()} className="btn btn-secondary">
                    Volver
                </button>
            </div>
            <p>Módulo para gestionar permisos y accesos de usuarios.</p>
        </div>
    );
}
