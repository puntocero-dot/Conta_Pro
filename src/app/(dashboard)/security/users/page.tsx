'use client';

import { useState, useEffect, useCallback } from 'react';
import { useToast } from '@/context/ToastContext';
import { formatDate } from '@/lib/formatting';
import { Modal } from '@/components/ui/Modal';

interface AppUser {
    id: string;
    email: string;
    role: string;
    createdAt: string;
    _count?: { companies: number };
}

const ROLE_LABELS: Record<string, string> = {
    SUPER_ADMIN: 'Super Admin',
    CONTADOR: 'Contador',
    AUDITOR: 'Auditor',
    CLIENTE: 'Cliente',
};

const ROLE_COLORS: Record<string, string> = {
    SUPER_ADMIN: '#7c3aed',
    CONTADOR: '#2563eb',
    AUDITOR: '#0891b2',
    CLIENTE: '#64748b',
};

export default function SecurityUsersPage() {
    const { showToast } = useToast();
    const [users, setUsers] = useState<AppUser[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [editingUser, setEditingUser] = useState<AppUser | null>(null);

    const fetchUsers = useCallback(async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/users', { headers: { 'X-Requested-With': 'XMLHttpRequest' } });
            if (res.ok) {
                const data = await res.json();
                setUsers(data.users || []);
            }
        } catch {
            // silent
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchUsers(); }, [fetchUsers]);

    const handleRoleChange = async (userId: string, newRole: string) => {
        const res = await fetch(`/api/users/${userId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
            body: JSON.stringify({ role: newRole }),
        });
        if (res.ok) {
            showToast('Rol actualizado', 'success');
            setEditingUser(null);
            fetchUsers();
        } else {
            showToast('Error al actualizar rol', 'error');
        }
    };

    const filteredUsers = search
        ? users.filter(u => u.email.toLowerCase().includes(search.toLowerCase()) || u.role.toLowerCase().includes(search.toLowerCase()))
        : users;

    return (
        <div className="animate-fade-in">
            <div style={{ marginBottom: '2rem' }}>
                <h1 style={{ marginBottom: '0.25rem' }}>Gestión de Usuarios</h1>
                <p>Administración de roles y accesos del sistema</p>
            </div>

            <div className="card" style={{ padding: '1rem 1.5rem', marginBottom: '1.5rem' }}>
                <input
                    type="text"
                    placeholder="Buscar por email o rol..."
                    className="input"
                    style={{ maxWidth: '320px' }}
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                />
            </div>

            <div className="card" style={{ overflow: 'hidden' }}>
                {loading ? (
                    <div style={{ padding: '3rem', textAlign: 'center', color: '#94a3b8' }}>Cargando usuarios...</div>
                ) : filteredUsers.length === 0 ? (
                    <div style={{ padding: '3rem', textAlign: 'center', color: '#94a3b8' }}>No se encontraron usuarios</div>
                ) : (
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                        <thead>
                            <tr style={{ background: '#f8fafc', borderBottom: '1px solid var(--border)' }}>
                                {['Usuario', 'Rol', 'Empresas', 'Registrado', 'Acciones'].map(h => (
                                    <th key={h} style={{ padding: '0.75rem 1rem', textAlign: 'left', fontWeight: 700, color: '#64748b' }}>{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {filteredUsers.map(user => (
                                <tr key={user.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                    <td style={{ padding: '0.875rem 1rem' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                            <div style={{
                                                width: '32px', height: '32px', borderRadius: '50%',
                                                background: '#e0f2fe', display: 'flex', alignItems: 'center',
                                                justifyContent: 'center', fontSize: '0.8125rem', fontWeight: 700, color: '#0369a1',
                                            }}>
                                                {user.email.charAt(0).toUpperCase()}
                                            </div>
                                            <span style={{ fontWeight: 600, color: '#1e293b' }}>{user.email}</span>
                                        </div>
                                    </td>
                                    <td style={{ padding: '0.875rem 1rem' }}>
                                        <span style={{
                                            display: 'inline-flex', alignItems: 'center',
                                            padding: '0.2rem 0.7rem',
                                            background: `${ROLE_COLORS[user.role] || '#64748b'}18`,
                                            color: ROLE_COLORS[user.role] || '#64748b',
                                            borderRadius: '100px',
                                            fontSize: '0.6875rem', fontWeight: 700,
                                            textTransform: 'uppercase', letterSpacing: '0.04em',
                                        }}>
                                            {ROLE_LABELS[user.role] || user.role}
                                        </span>
                                    </td>
                                    <td style={{ padding: '0.875rem 1rem', color: '#64748b' }}>
                                        {user._count?.companies ?? '—'}
                                    </td>
                                    <td style={{ padding: '0.875rem 1rem', color: '#94a3b8', fontSize: '0.8125rem' }}>
                                        {formatDate(user.createdAt)}
                                    </td>
                                    <td style={{ padding: '0.875rem 1rem' }}>
                                        <button
                                            className="btn btn-ghost"
                                            style={{ fontSize: '0.8125rem' }}
                                            onClick={() => setEditingUser(user)}
                                        >
                                            Cambiar rol
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>

            {editingUser && (
                <ChangeRoleModal
                    user={editingUser}
                    onClose={() => setEditingUser(null)}
                    onConfirm={(newRole) => handleRoleChange(editingUser.id, newRole)}
                />
            )}
        </div>
    );
}

function ChangeRoleModal({
    user,
    onClose,
    onConfirm,
}: {
    user: AppUser;
    onClose: () => void;
    onConfirm: (role: string) => void;
}) {
    const [role, setRole] = useState(user.role);

    return (
        <Modal isOpen onClose={onClose} title="Cambiar Rol de Usuario" size="sm">
            <p style={{ fontSize: '0.875rem', color: '#64748b', marginBottom: '1.25rem' }}>
                Usuario: <strong>{user.email}</strong>
            </p>
            <div className="form-group">
                <label className="label">Nuevo Rol</label>
                <select className="input" value={role} onChange={e => setRole(e.target.value)}>
                    <option value="SUPER_ADMIN">Super Admin</option>
                    <option value="CONTADOR">Contador</option>
                    <option value="AUDITOR">Auditor</option>
                    <option value="CLIENTE">Cliente</option>
                </select>
            </div>
            <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
                <button onClick={onClose} className="btn btn-secondary" style={{ flex: 1 }}>Cancelar</button>
                <button onClick={() => onConfirm(role)} className="btn btn-primary" style={{ flex: 2 }}>
                    Guardar cambio
                </button>
            </div>
        </Modal>
    );
}
