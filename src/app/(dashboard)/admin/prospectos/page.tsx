'use client';

import React, { useState, useEffect } from 'react';
import styles from './prospectos.module.css';

interface Lead {
    id: string;
    email: string;
    name: string | null;
    phone: string | null;
    plan: string;
    status: string;
    createdAt: string;
}

export default function ProspectosPage() {
    const [leads, setLeads] = useState<Lead[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchLeads();
    }, []);

    const fetchLeads = async () => {
        try {
            const res = await fetch('/api/admin/leads');
            const data = await res.json();
            if (res.ok) {
                setLeads(data);
            }
        } catch (error) {
            console.error('Error fetching leads:', error);
        } finally {
            setLoading(false);
        }
    };

    const updateStatus = async (id: string, status: string) => {
        // Implementar actualización de estado si se desea
        console.log('Update lead', id, status);
    };

    if (loading) return <div className={styles.loading}>Cargando prospectos...</div>;

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <h1>Gestión de Prospectos (Punto Cero)</h1>
                <p>Usuarios interesados en planes de suscripción que aún no tienen empresa.</p>
            </div>

            <div className={styles.tableCard}>
                <table className={styles.table}>
                    <thead>
                        <tr>
                            <th>Fecha</th>
                            <th>Nombre / Email</th>
                            <th>Plan Interés</th>
                            <th>Estado</th>
                            <th>Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        {leads.length === 0 ? (
                            <tr>
                                <td colSpan={5} className={styles.empty}>No hay prospectos registrados aún.</td>
                            </tr>
                        ) : (
                            leads.map((lead) => (
                                <tr key={lead.id}>
                                    <td>{new Date(lead.createdAt).toLocaleDateString()}</td>
                                    <td>
                                        <div className={styles.userInfo}>
                                            <span className={styles.name}>{lead.name || 'N/A'}</span>
                                            <span className={styles.email}>{lead.email}</span>
                                        </div>
                                    </td>
                                    <td>
                                        <span className={`${styles.planBadge} ${styles[lead.plan]}`}>
                                            {lead.plan}
                                        </span>
                                    </td>
                                    <td>
                                        <span className={`${styles.statusBadge} ${styles[lead.status]}`}>
                                            {lead.status}
                                        </span>
                                    </td>
                                    <td>
                                        <button className={styles.actionBtn}>Contactar</button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
