'use client';

import { useState, useEffect, useCallback } from 'react';
import { useToast } from '@/context/ToastContext';
import { useCompany } from '@/context/CompanyContext';
import { formatDate } from '@/lib/formatting';
import { Modal } from '@/components/ui/Modal';

interface AppUser {
    id: string;
    email: string;
    role: string;
    createdAt: string;
    companies?: { id: string; name: string }[];
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

type ModalMode = 'create' | 'edit-role' | 'edit-email' | 'delete' | 'assign-company' | null;

interface CompanyOption { id: string; name: string; }

export default function SecurityUsersPage() {
    const { showToast } = useToast();
    const { refreshCompanies } = useCompany();
    const [users, setUsers] = useState<AppUser[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [selectedUser, setSelectedUser] = useState<AppUser | null>(null);
    const [modalMode, setModalMode] = useState<ModalMode>(null);
    const [currentUserId, setCurrentUserId] = useState<string | null>(null);

    const fetchUsers = useCallback(async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/users', { headers: { 'X-Requested-With': 'XMLHttpRequest' } });
            if (res.ok) {
                const data = await res.json();
                setUsers(data.users || []);
            }
            // Get current user id from token
            const meRes = await fetch('/api/auth/me', { headers: { 'X-Requested-With': 'XMLHttpRequest' } });
            if (meRes.ok) {
                const me = await meRes.json();
                setCurrentUserId(me.user?.id || null);
            }
        } catch {
            // silent
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchUsers(); }, [fetchUsers]);

    const openModal = (user: AppUser | null, mode: ModalMode) => {
        setSelectedUser(user);
        setModalMode(mode);
    };

    const closeModal = () => {
        setSelectedUser(null);
        setModalMode(null);
    };

    const handleCreate = async (email: string, password: string, role: string) => {
        const res = await fetch('/api/users', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
            body: JSON.stringify({ email, password, role }),
        });
        if (res.ok) {
            showToast('Usuario creado correctamente', 'success');
            closeModal();
            fetchUsers();
        } else {
            const data = await res.json();
            showToast(data.error || 'Error al crear usuario', 'error');
        }
    };

    const handleRoleChange = async (userId: string, newRole: string) => {
        const res = await fetch(`/api/users/${userId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
            body: JSON.stringify({ role: newRole }),
        });
        if (res.ok) {
            showToast('Rol actualizado', 'success');
            closeModal();
            fetchUsers();
        } else {
            showToast('Error al actualizar rol', 'error');
        }
    };

    const handleEmailChange = async (userId: string, newEmail: string) => {
        const res = await fetch(`/api/users/${userId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
            body: JSON.stringify({ email: newEmail }),
        });
        if (res.ok) {
            showToast('Email actualizado', 'success');
            closeModal();
            fetchUsers();
        } else {
            const data = await res.json();
            showToast(data.error || 'Error al actualizar email', 'error');
        }
    };

    const handleAssignCompany = async (email: string, companyId: string, role: string) => {
        const res = await fetch(`/api/companies/${companyId}/members`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
            body: JSON.stringify({ email, role }),
        });
        if (res.ok) {
            showToast('Usuario asignado a la empresa', 'success');
            closeModal();
            await fetchUsers();
            await refreshCompanies();
        } else {
            const data = await res.json();
            showToast(data.error || 'Error al asignar empresa', 'error');
        }
    };

    const handleDelete = async (userId: string) => {
        const res = await fetch(`/api/users/${userId}`, {
            method: 'DELETE',
            headers: { 'X-Requested-With': 'XMLHttpRequest' },
        });
        if (res.ok) {
            showToast('Usuario eliminado', 'success');
            closeModal();
            fetchUsers();
        } else {
            const data = await res.json();
            showToast(data.error || 'Error al eliminar usuario', 'error');
        }
    };

    const filteredUsers = search
        ? users.filter(u => u.email.toLowerCase().includes(search.toLowerCase()) || u.role.toLowerCase().includes(search.toLowerCase()))
        : users;

    return (
        <div className="animate-fade-in">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem' }}>
                <div>
                    <h1 style={{ marginBottom: '0.25rem' }}>Gestión de Usuarios</h1>
                    <p>Administración de roles y accesos del sistema</p>
                </div>
                <button className="btn btn-primary" onClick={() => openModal(null, 'create')}>
                    + Crear Usuario
                </button>
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
                                        {user.companies && user.companies.length > 0 ? (
                                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.25rem' }}>
                                                {user.companies.map(c => (
                                                    <span
                                                        key={c.id}
                                                        title={c.name}
                                                        style={{
                                                            display: 'inline-block',
                                                            padding: '0.15rem 0.55rem',
                                                            background: '#e0f2fe',
                                                            color: '#0369a1',
                                                            borderRadius: '100px',
                                                            fontSize: '0.6875rem',
                                                            fontWeight: 600,
                                                            maxWidth: '160px',
                                                            overflow: 'hidden',
                                                            textOverflow: 'ellipsis',
                                                            whiteSpace: 'nowrap',
                                                        }}
                                                    >
                                                        {c.name}
                                                    </span>
                                                ))}
                                            </div>
                                        ) : (
                                            <span style={{ color: '#94a3b8', fontStyle: 'italic' }}>Sin asignar</span>
                                        )}
                                    </td>
                                    <td style={{ padding: '0.875rem 1rem', color: '#94a3b8', fontSize: '0.8125rem' }}>
                                        {formatDate(user.createdAt)}
                                    </td>
                                    <td style={{ padding: '0.875rem 1rem' }}>
                                        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                                            <button
                                                className="btn btn-ghost"
                                                style={{ fontSize: '0.8125rem' }}
                                                onClick={() => openModal(user, 'edit-role')}
                                            >
                                                Cambiar rol
                                            </button>
                                            <button
                                                className="btn btn-ghost"
                                                style={{ fontSize: '0.8125rem' }}
                                                onClick={() => openModal(user, 'edit-email')}
                                            >
                                                Editar email
                                            </button>
                                            <button
                                                className="btn btn-ghost"
                                                style={{ fontSize: '0.8125rem' }}
                                                onClick={() => openModal(user, 'assign-company')}
                                            >
                                                Asignar empresa
                                            </button>
                                            {user.id !== currentUserId && (
                                                <button
                                                    className="btn btn-ghost"
                                                    style={{ fontSize: '0.8125rem', color: '#dc2626' }}
                                                    onClick={() => openModal(user, 'delete')}
                                                >
                                                    Eliminar
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>

            {modalMode === 'create' && (
                <CreateUserModal onClose={closeModal} onConfirm={handleCreate} />
            )}
            {modalMode === 'edit-role' && selectedUser && (
                <ChangeRoleModal
                    user={selectedUser}
                    onClose={closeModal}
                    onConfirm={(role) => handleRoleChange(selectedUser.id, role)}
                />
            )}
            {modalMode === 'edit-email' && selectedUser && (
                <EditEmailModal
                    user={selectedUser}
                    onClose={closeModal}
                    onConfirm={(email) => handleEmailChange(selectedUser.id, email)}
                />
            )}
            {modalMode === 'assign-company' && selectedUser && (
                <AssignCompanyModal
                    user={selectedUser}
                    onClose={closeModal}
                    onConfirm={(companyId, role) => handleAssignCompany(selectedUser.email, companyId, role)}
                />
            )}
            {modalMode === 'delete' && selectedUser && (
                <DeleteUserModal
                    user={selectedUser}
                    onClose={closeModal}
                    onConfirm={() => handleDelete(selectedUser.id)}
                />
            )}
        </div>
    );
}

function CreateUserModal({ onClose, onConfirm }: { onClose: () => void; onConfirm: (email: string, password: string, role: string) => void }) {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [role, setRole] = useState('CLIENTE');

    return (
        <Modal isOpen onClose={onClose} title="Crear Nuevo Usuario" size="sm">
            <div className="form-group">
                <label className="label">Email</label>
                <input type="email" className="input" value={email} onChange={e => setEmail(e.target.value)} placeholder="usuario@empresa.com" />
            </div>
            <div className="form-group" style={{ marginTop: '1rem' }}>
                <label className="label">Contraseña inicial</label>
                <input type="password" className="input" value={password} onChange={e => setPassword(e.target.value)} placeholder="Mínimo 8 caracteres" />
            </div>
            <div className="form-group" style={{ marginTop: '1rem' }}>
                <label className="label">Rol</label>
                <select className="input" value={role} onChange={e => setRole(e.target.value)}>
                    <option value="SUPER_ADMIN">Super Admin</option>
                    <option value="CONTADOR">Contador</option>
                    <option value="AUDITOR">Auditor</option>
                    <option value="CLIENTE">Cliente</option>
                </select>
            </div>
            <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
                <button onClick={onClose} className="btn btn-secondary" style={{ flex: 1 }}>Cancelar</button>
                <button onClick={() => onConfirm(email, password, role)} className="btn btn-primary" style={{ flex: 2 }}>
                    Crear Usuario
                </button>
            </div>
        </Modal>
    );
}

function ChangeRoleModal({ user, onClose, onConfirm }: { user: AppUser; onClose: () => void; onConfirm: (role: string) => void }) {
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
                <button onClick={() => onConfirm(role)} className="btn btn-primary" style={{ flex: 2 }}>Guardar cambio</button>
            </div>
        </Modal>
    );
}

function EditEmailModal({ user, onClose, onConfirm }: { user: AppUser; onClose: () => void; onConfirm: (email: string) => void }) {
    const [email, setEmail] = useState(user.email);
    return (
        <Modal isOpen onClose={onClose} title="Editar Email de Usuario" size="sm">
            <div className="form-group">
                <label className="label">Nuevo Email</label>
                <input type="email" className="input" value={email} onChange={e => setEmail(e.target.value)} />
            </div>
            <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
                <button onClick={onClose} className="btn btn-secondary" style={{ flex: 1 }}>Cancelar</button>
                <button onClick={() => onConfirm(email)} className="btn btn-primary" style={{ flex: 2 }}>Guardar</button>
            </div>
        </Modal>
    );
}

function AssignCompanyModal({ user, onClose, onConfirm }: { user: AppUser; onClose: () => void; onConfirm: (companyId: string, role: string) => void }) {
    const [companies, setCompanies] = useState<CompanyOption[]>([]);
    const [companyId, setCompanyId] = useState('');
    const [role, setRole] = useState('CLIENTE');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch('/api/companies', { headers: { 'X-Requested-With': 'XMLHttpRequest' } })
            .then(r => r.ok ? r.json() : { companies: [] })
            .then(data => {
                setCompanies((data.companies || []).map((c: any) => ({ id: c.id, name: c.name })));
                setLoading(false);
            })
            .catch(() => setLoading(false));
    }, []);

    return (
        <Modal isOpen onClose={onClose} title="Asignar Usuario a Empresa" size="sm">
            <p style={{ fontSize: '0.875rem', color: '#64748b', marginBottom: '1.25rem' }}>
                Usuario: <strong>{user.email}</strong>
            </p>
            <div className="form-group">
                <label className="label">Empresa</label>
                {loading ? (
                    <div style={{ padding: '0.5rem', color: '#94a3b8' }}>Cargando empresas…</div>
                ) : companies.length === 0 ? (
                    <div style={{ padding: '0.5rem', color: '#94a3b8' }}>No hay empresas disponibles</div>
                ) : (
                    <select className="input" value={companyId} onChange={e => setCompanyId(e.target.value)}>
                        <option value="">Selecciona una empresa…</option>
                        {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                )}
            </div>
            <div className="form-group" style={{ marginTop: '1rem' }}>
                <label className="label">Rol en la empresa</label>
                <select className="input" value={role} onChange={e => setRole(e.target.value)}>
                    <option value="SUPER_ADMIN">Super Admin</option>
                    <option value="CONTADOR">Contador</option>
                    <option value="AUDITOR">Auditor</option>
                    <option value="CLIENTE">Cliente</option>
                </select>
            </div>
            <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
                <button onClick={onClose} className="btn btn-secondary" style={{ flex: 1 }}>Cancelar</button>
                <button
                    onClick={() => companyId && onConfirm(companyId, role)}
                    className="btn btn-primary"
                    style={{ flex: 2 }}
                    disabled={!companyId}
                >
                    Asignar
                </button>
            </div>
        </Modal>
    );
}

function DeleteUserModal({ user, onClose, onConfirm }: { user: AppUser; onClose: () => void; onConfirm: () => void }) {
    return (
        <Modal isOpen onClose={onClose} title="Eliminar Usuario" size="sm">
            <p style={{ fontSize: '0.875rem', color: '#64748b', marginBottom: '1.25rem' }}>
                ¿Estás seguro de eliminar a <strong>{user.email}</strong>? Esta acción no se puede deshacer.
            </p>
            <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
                <button onClick={onClose} className="btn btn-secondary" style={{ flex: 1 }}>Cancelar</button>
                <button onClick={onConfirm} className="btn btn-primary" style={{ flex: 2, background: '#dc2626', borderColor: '#dc2626' }}>
                    Eliminar
                </button>
            </div>
        </Modal>
    );
}
