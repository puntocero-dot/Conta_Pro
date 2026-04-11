'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useCompany } from '@/context/CompanyContext';
import { useToast } from '@/context/ToastContext';
import { Modal } from '@/components/ui/Modal';
import { EmptyState } from '@/components/ui/EmptyState';
import { SkeletonStatsGrid } from '@/components/ui/Skeleton';
import styles from './companies.module.css';

interface Company {
    id: string;
    name: string;
    taxId: string;
    country: string;
    groupId?: string | null;
    metadata?: {
        legalForm?: string;
        nrc?: string;
        address?: string;
        economicActivity?: string;
    };
}

interface CompanyGroup {
    id: string;
    name: string;
    ownerId: string;
    companies: Company[];
}

interface Member {
    id: string;
    role: string;
    joinedAt: string;
    user: { id: string; email: string; role: string };
}

type TabType = 'companies' | 'groups' | 'members';

export default function CompaniesPage() {
    const router = useRouter();
    const { setActiveCompanyId, refreshCompanies, companies, companyGroups, activeCompanyId } = useCompany();
    const { showToast } = useToast();
    const [loading, setLoading] = useState(true);
    const [localCompanies, setLocalCompanies] = useState<Company[]>([]);
    const [groups, setGroups] = useState<CompanyGroup[]>([]);
    const [members, setMembers] = useState<Member[]>([]);
    const [membersLoading, setMembersLoading] = useState(false);
    const [tab, setTab] = useState<TabType>('companies');
    const [showNewModal, setShowNewModal] = useState(false);
    const [showNewGroupModal, setShowNewGroupModal] = useState(false);
    const [showInviteModal, setShowInviteModal] = useState(false);
    const [editingMember, setEditingMember] = useState<Member | null>(null);
    const [resettingPasswordMember, setResettingPasswordMember] = useState<Member | null>(null);

    const fetchAll = useCallback(async () => {
        setLoading(true);
        try {
            const [companiesRes, groupsRes] = await Promise.all([
                fetch('/api/companies', { headers: { 'X-Requested-With': 'XMLHttpRequest' } }),
                fetch('/api/company-groups', { headers: { 'X-Requested-With': 'XMLHttpRequest' } }),
            ]);
            if (companiesRes.ok) {
                const data = await companiesRes.json();
                setLocalCompanies(data.companies || []);
            }
            if (groupsRes.ok) {
                const data = await groupsRes.json();
                setGroups(data.groups || []);
            }
        } catch {
            // silent
        } finally {
            setLoading(false);
        }
    }, []);

    const fetchMembers = useCallback(async () => {
        if (!activeCompanyId) return;
        setMembersLoading(true);
        try {
            const res = await fetch(`/api/companies/${activeCompanyId}/members`, {
                headers: { 'X-Requested-With': 'XMLHttpRequest' },
            });
            if (res.ok) {
                const data = await res.json();
                setMembers(data.members || []);
            }
        } catch {
            // silent
        } finally {
            setMembersLoading(false);
        }
    }, [activeCompanyId]);

    useEffect(() => { fetchAll(); }, [fetchAll]);

    useEffect(() => {
        if (tab === 'members') fetchMembers();
    }, [tab, fetchMembers]);

    const handleSelectCompany = (id: string) => {
        setActiveCompanyId(id);
        router.push('/dashboard');
    };

    const handleDeleteGroup = async (groupId: string) => {
        if (!confirm('¿Eliminar este grupo? Las empresas no serán eliminadas.')) return;
        const res = await fetch(`/api/company-groups/${groupId}`, {
            method: 'DELETE',
            headers: { 'X-Requested-With': 'XMLHttpRequest' },
        });
        if (res.ok) {
            showToast('Grupo eliminado', 'success');
            fetchAll();
            refreshCompanies();
        } else {
            showToast('Error al eliminar grupo', 'error');
        }
    };

    const handleRemoveFromGroup = async (groupId: string, companyId: string) => {
        const res = await fetch(`/api/company-groups/${groupId}/companies`, {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
            body: JSON.stringify({ companyId }),
        });
        if (res.ok) {
            showToast('Empresa removida del grupo', 'success');
            fetchAll();
            refreshCompanies();
        }
    };

    const handleRemoveMember = async (memberId: string) => {
        if (!activeCompanyId) return;
        const res = await fetch(`/api/companies/${activeCompanyId}/members/${memberId}`, {
            method: 'DELETE',
            headers: { 'X-Requested-With': 'XMLHttpRequest' },
        });
        if (res.ok) {
            showToast('Miembro removido', 'success');
            fetchMembers();
        } else {
            showToast('Error al remover miembro', 'error');
        }
    };

    const handleUpdateMemberRole = async (memberId: string, newRole: string) => {
        if (!activeCompanyId) return;
        const res = await fetch(`/api/companies/${activeCompanyId}/members/${memberId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
            body: JSON.stringify({ role: newRole }),
        });
        if (res.ok) {
            showToast('Rol actualizado', 'success');
            fetchMembers();
            setEditingMember(null);
        } else {
            showToast('Error al actualizar rol', 'error');
        }
    };

    const handleResetPassword = async (userId: string, newPass: string) => {
        const res = await fetch(`/api/admin/users/${userId}/reset-password`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
            body: JSON.stringify({ newPassword: newPass }),
        });
        if (res.ok) {
            showToast('Contraseña restablecida correctamente', 'success');
            setResettingPasswordMember(null);
        } else {
            const d = await res.json();
            showToast(d.error || 'Error al resetear contraseña', 'error');
        }
    };

    if (loading) {
        return (
            <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2rem' }}>
                    <div><h1>Empresas</h1><p>Entidades legales y configuraciones fiscales</p></div>
                </div>
                <SkeletonStatsGrid count={3} />
            </div>
        );
    }

    const ungroupedCompanies = localCompanies.filter(c =>
        !groups.some(g => g.companies.some(gc => gc.id === c.id))
    );

    return (
        <div className="animate-fade-in">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem' }}>
                <div>
                    <h1 style={{ marginBottom: '0.25rem' }}>Empresas</h1>
                    <p>Entidades legales y configuraciones fiscales</p>
                </div>
                <div style={{ display: 'flex', gap: '0.75rem' }}>
                    {tab === 'companies' && (
                        <button onClick={() => setShowNewModal(true)} className="btn btn-primary">
                            <span style={{ fontSize: '1.2rem' }}>+</span> Nueva Empresa
                        </button>
                    )}
                    {tab === 'groups' && (
                        <button onClick={() => setShowNewGroupModal(true)} className="btn btn-primary">
                            <span style={{ fontSize: '1.2rem' }}>+</span> Nuevo Grupo
                        </button>
                    )}
                    {tab === 'members' && activeCompanyId && (
                        <button onClick={() => setShowInviteModal(true)} className="btn btn-primary">
                            <span style={{ fontSize: '1.2rem' }}>+</span> Invitar Miembro
                        </button>
                    )}
                </div>
            </div>

            <div className={styles.tabs}>
                {(['companies', 'groups', 'members'] as TabType[]).map(t => (
                    <button
                        key={t}
                        className={`${styles.tab} ${tab === t ? styles.tabActive : ''}`}
                        onClick={() => setTab(t)}
                    >
                        {t === 'companies' ? 'Empresas' : t === 'groups' ? 'Grupos' : 'Miembros'}
                    </button>
                ))}
            </div>

            {/* TAB: EMPRESAS */}
            {tab === 'companies' && (
                <div className={styles.companiesList}>
                    {localCompanies.length === 0 ? (
                        <EmptyState
                            icon="🏢"
                            title="Sin empresas registradas"
                            description="Comienza registrando tu primera entidad legal para gestionar su contabilidad."
                            actionLabel="Registrar Mi Empresa"
                            onAction={() => setShowNewModal(true)}
                        />
                    ) : (
                        localCompanies.map(company => (
                            <div key={company.id} className={styles.companyCard}>
                                <div className={styles.cardHeader}>
                                    <div className={styles.icon}>🏢</div>
                                    <div>
                                        <h3>{company.name}</h3>
                                        <p className={styles.legalForm}>{company.metadata?.legalForm || 'Persona Jurídica'}</p>
                                    </div>
                                </div>
                                <div className={styles.details}>
                                    <div className={styles.detailRow}>
                                        <span style={{ fontWeight: 600, color: '#1e293b', minWidth: '40px' }}>NIT:</span>
                                        <span>{company.taxId}</span>
                                    </div>
                                    {company.metadata?.nrc && (
                                        <div className={styles.detailRow}>
                                            <span style={{ fontWeight: 600, color: '#1e293b', minWidth: '40px' }}>NRC:</span>
                                            <span>{company.metadata.nrc}</span>
                                        </div>
                                    )}
                                    {company.metadata?.economicActivity && (
                                        <div className={styles.detailRow}>
                                            <span style={{ fontWeight: 600, color: '#1e293b', minWidth: '40px' }}>Giro:</span>
                                            <span>{company.metadata.economicActivity}</span>
                                        </div>
                                    )}
                                </div>
                                <div className={styles.cardActions}>
                                    <button onClick={() => handleSelectCompany(company.id)} className={styles.selectBtn}>
                                        Gestionar
                                    </button>
                                    <button
                                        onClick={() => router.push(`/companies/${company.id}/settings`)}
                                        className="btn btn-secondary"
                                        title="Personalizar tema"
                                    >
                                        🎨 Personalizar
                                    </button>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            )}

            {/* TAB: GRUPOS */}
            {tab === 'groups' && (
                <div>
                    {groups.length === 0 && ungroupedCompanies.length === 0 ? (
                        <EmptyState
                            icon="📁"
                            title="Sin grupos creados"
                            description="Organiza tus empresas en grupos para una gestión más sencilla."
                            actionLabel="Crear Primer Grupo"
                            onAction={() => setShowNewGroupModal(true)}
                        />
                    ) : (
                        <>
                            {groups.map(group => (
                                <div key={group.id} className={styles.groupCard}>
                                    <div className={styles.groupHeader}>
                                        <div className={styles.groupTitle}>
                                            <span>📁</span>
                                            {group.name}
                                            <span style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 400 }}>
                                                ({group.companies.length} empresa{group.companies.length !== 1 ? 's' : ''})
                                            </span>
                                        </div>
                                        <div className={styles.groupActions}>
                                            <AddToGroupDropdown
                                                groupId={group.id}
                                                ungrouped={ungroupedCompanies}
                                                onAdded={() => { fetchAll(); refreshCompanies(); showToast('Empresa agregada al grupo', 'success'); }}
                                            />
                                            <button
                                                className="btn btn-ghost"
                                                style={{ fontSize: '0.75rem', color: '#dc2626' }}
                                                onClick={() => handleDeleteGroup(group.id)}
                                            >
                                                Eliminar grupo
                                            </button>
                                        </div>
                                    </div>
                                    {group.companies.length === 0 ? (
                                        <div className={styles.emptyGroup}>Sin empresas en este grupo</div>
                                    ) : (
                                        <div className={styles.groupCompanies}>
                                            {group.companies.map(c => (
                                                <div key={c.id} className={styles.groupCompanyChip}>
                                                    🏢 {c.name}
                                                    <button
                                                        className={styles.removeChipBtn}
                                                        onClick={() => handleRemoveFromGroup(group.id, c.id)}
                                                        title="Quitar del grupo"
                                                    >
                                                        ×
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            ))}

                            {ungroupedCompanies.length > 0 && (
                                <div className={styles.groupCard}>
                                    <div className={styles.groupHeader}>
                                        <div className={styles.groupTitle}>
                                            <span>📋</span> Sin grupo
                                            <span style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 400 }}>
                                                ({ungroupedCompanies.length})
                                            </span>
                                        </div>
                                    </div>
                                    <div className={styles.groupCompanies}>
                                        {ungroupedCompanies.map(c => (
                                            <div key={c.id} className={styles.groupCompanyChip} style={{ background: '#f8fafc', borderColor: '#e2e8f0', color: '#64748b' }}>
                                                🏢 {c.name}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </div>
            )}

            {/* TAB: MIEMBROS */}
            {tab === 'members' && (
                <div className="card" style={{ padding: '1.5rem' }}>
                    {!activeCompanyId ? (
                        <EmptyState
                            icon="🏢"
                            title="Sin empresa seleccionada"
                            description="Selecciona una empresa activa para ver sus miembros."
                        />
                    ) : membersLoading ? (
                        <p style={{ color: '#94a3b8', textAlign: 'center', padding: '2rem' }}>Cargando miembros...</p>
                    ) : members.length === 0 ? (
                        <EmptyState
                            icon="👥"
                            title="Sin miembros"
                            description="Invita usuarios a colaborar en esta empresa."
                            actionLabel="Invitar Miembro"
                            onAction={() => setShowInviteModal(true)}
                        />
                    ) : (
                        <div>
                            <p style={{ fontSize: '0.8125rem', color: '#64748b', marginBottom: '1rem' }}>
                                Empresa activa: <strong>{localCompanies.find(c => c.id === activeCompanyId)?.name}</strong>
                            </p>
                            {members.map(member => (
                                <div key={member.id} className={styles.memberRow}>
                                    <div className={styles.memberAvatar}>
                                        {member.user.email.charAt(0).toUpperCase()}
                                    </div>
                                    <div className={styles.memberInfo}>
                                        <div className={styles.memberEmail}>{member.user.email}</div>
                                        <div className={styles.memberRole}>
                                            <span className={styles.roleBadge}>{member.role}</span>
                                        </div>
                                    </div>
                                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                                        <button className="btn btn-ghost" style={{ fontSize: '0.8125rem' }} onClick={() => setEditingMember(member)}>
                                            ✏️ Editar
                                        </button>
                                        <button className="btn btn-ghost" style={{ fontSize: '0.8125rem' }} onClick={() => setResettingPasswordMember(member)}>
                                            🔑 Clave
                                        </button>
                                        <button
                                            className="btn btn-ghost"
                                            style={{ fontSize: '0.8125rem', color: '#dc2626' }}
                                            onClick={() => {
                                                if (confirm(`¿Remover a ${member.user.email} de la empresa?`)) {
                                                    handleRemoveMember(member.id);
                                                }
                                            }}
                                        >
                                            Remover
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* Modals */}
            {showNewModal && (
                <NewCompanyModal
                    onClose={() => setShowNewModal(false)}
                    onSuccess={() => {
                        setShowNewModal(false);
                        fetchAll();
                        refreshCompanies();
                        showToast('Empresa registrada correctamente', 'success');
                    }}
                    onError={msg => showToast(msg, 'error')}
                />
            )}

            {showNewGroupModal && (
                <NewGroupModal
                    onClose={() => setShowNewGroupModal(false)}
                    onSuccess={() => {
                        setShowNewGroupModal(false);
                        fetchAll();
                        refreshCompanies();
                        showToast('Grupo creado correctamente', 'success');
                    }}
                    onError={msg => showToast(msg, 'error')}
                />
            )}

            {showInviteModal && activeCompanyId && (
                <InviteMemberModal
                    companyId={activeCompanyId}
                    onClose={() => setShowInviteModal(false)}
                    onSuccess={() => {
                        setShowInviteModal(false);
                        fetchMembers();
                        showToast('Miembro invitado correctamente', 'success');
                    }}
                    onError={msg => showToast(msg, 'error')}
                />
            )}

            {editingMember && (
                <EditMemberRoleModal
                    member={editingMember}
                    onClose={() => setEditingMember(null)}
                    onSave={(newRole: string) => handleUpdateMemberRole(editingMember.id, newRole)}
                />
            )}

            {resettingPasswordMember && (
                <ResetPasswordModal
                    member={resettingPasswordMember}
                    onClose={() => setResettingPasswordMember(null)}
                    onReset={(pass: string) => handleResetPassword(resettingPasswordMember.user.id, pass)}
                />
            )}
        </div>
    );
}

// ---- Subcomponents ----

function AddToGroupDropdown({
    groupId,
    ungrouped,
    onAdded,
}: {
    groupId: string;
    ungrouped: Company[];
    onAdded: () => void;
}) {
    const [open, setOpen] = useState(false);

    if (ungrouped.length === 0) return null;

    const handleAdd = async (companyId: string) => {
        setOpen(false);
        const res = await fetch(`/api/company-groups/${groupId}/companies`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
            body: JSON.stringify({ companyId }),
        });
        if (res.ok) onAdded();
    };

    return (
        <div style={{ position: 'relative' }}>
            <button className="btn btn-ghost" style={{ fontSize: '0.75rem' }} onClick={() => setOpen(o => !o)}>
                + Agregar empresa
            </button>
            {open && (
                <div style={{
                    position: 'absolute', right: 0, top: '100%', background: 'white',
                    border: '1px solid var(--border)', borderRadius: 'var(--radius)', boxShadow: 'var(--shadow)',
                    zIndex: 10, minWidth: '200px', overflow: 'hidden',
                }}>
                    {ungrouped.map(c => (
                        <button
                            key={c.id}
                            onClick={() => handleAdd(c.id)}
                            style={{
                                display: 'block', width: '100%', padding: '0.625rem 1rem',
                                textAlign: 'left', background: 'none', border: 'none',
                                fontSize: '0.875rem', cursor: 'pointer', color: '#1e293b',
                            }}
                            onMouseEnter={e => (e.currentTarget.style.background = '#f8fafc')}
                            onMouseLeave={e => (e.currentTarget.style.background = 'none')}
                        >
                            🏢 {c.name}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}

function NewGroupModal({
    onClose,
    onSuccess,
    onError,
}: {
    onClose: () => void;
    onSuccess: () => void;
    onError: (msg: string) => void;
}) {
    const [name, setName] = useState('');
    const [submitting, setSubmitting] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim()) return;
        setSubmitting(true);
        try {
            const res = await fetch('/api/company-groups', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
                body: JSON.stringify({ name }),
            });
            if (res.ok) {
                onSuccess();
            } else {
                const data = await res.json().catch(() => ({}));
                onError(data.error || 'Error al crear grupo');
            }
        } catch {
            onError('Error de conexión');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <Modal isOpen onClose={onClose} title="Crear Grupo de Empresas" size="sm">
            <form onSubmit={handleSubmit}>
                <div className="form-group">
                    <label className="label">Nombre del Grupo *</label>
                    <input
                        type="text" className="input" value={name} autoFocus
                        onChange={e => setName(e.target.value)}
                        placeholder="Ej: Grupo Familiar, Holding XYZ"
                        required
                    />
                </div>
                <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
                    <button type="button" onClick={onClose} className="btn btn-secondary" style={{ flex: 1 }}>Cancelar</button>
                    <button type="submit" disabled={submitting} className="btn btn-primary" style={{ flex: 2 }}>
                        {submitting ? 'Creando...' : 'Crear Grupo'}
                    </button>
                </div>
            </form>
        </Modal>
    );
}

function InviteMemberModal({
    companyId,
    onClose,
    onSuccess,
    onError,
}: {
    companyId: string;
    onClose: () => void;
    onSuccess: () => void;
    onError: (msg: string) => void;
}) {
    const [email, setEmail] = useState('');
    const [role, setRole] = useState('CLIENTE');
    const [submitting, setSubmitting] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            const res = await fetch(`/api/companies/${companyId}/members`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
                body: JSON.stringify({ email, role }),
            });
            if (res.ok) {
                onSuccess();
            } else {
                const data = await res.json().catch(() => ({}));
                onError(data.error || 'Error al invitar miembro');
            }
        } catch {
            onError('Error de conexión');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <Modal isOpen onClose={onClose} title="Invitar Miembro" size="sm">
            <form onSubmit={handleSubmit}>
                <div className="form-group">
                    <label className="label">Correo del usuario *</label>
                    <input type="email" className="input" value={email} autoFocus
                        onChange={e => setEmail(e.target.value)} placeholder="usuario@ejemplo.com" required />
                </div>
                <div className="form-group">
                    <label className="label">Rol</label>
                    <select className="input" value={role} onChange={e => setRole(e.target.value)}>
                        <option value="CONTADOR">Contador</option>
                        <option value="AUDITOR">Auditor</option>
                        <option value="CLIENTE">Cliente (solo lectura)</option>
                    </select>
                </div>
                <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
                    <button type="button" onClick={onClose} className="btn btn-secondary" style={{ flex: 1 }}>Cancelar</button>
                    <button type="submit" disabled={submitting} className="btn btn-primary" style={{ flex: 2 }}>
                        {submitting ? 'Invitando...' : 'Invitar'}
                    </button>
                </div>
            </form>
        </Modal>
    );
}

function NewCompanyModal({
    onClose,
    onSuccess,
    onError,
}: {
    onClose: () => void;
    onSuccess: () => void;
    onError: (msg: string) => void;
}) {
    const [formData, setFormData] = useState({
        legalForm: 'SA',
        name: '',
        nit: '',
        nrc: '',
        address: '',
        economicActivity: '',
        shareCapital: '',
        municipality: '',
        department: '',
    });
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState('');

    const legalForms = [
        { value: 'SA', label: 'Sociedad Anónima (S.A.)' },
        { value: 'SAS', label: 'Sociedad por Acciones Simplificada (S.A.S.)' },
        { value: 'SRL', label: 'Sociedad de R.L. (S. de R.L.)' },
        { value: 'EIRL', label: 'Empresa Individual de R.L. (E.I.R.L.)' },
        { value: 'PERSONA_NATURAL', label: 'Persona Natural (Comerciante Individual)' },
        { value: 'SC', label: 'Sociedad Colectiva' },
        { value: 'SCS', label: 'Sociedad en Comandita Simple' },
    ];

    const departments = [
        'San Salvador', 'La Libertad', 'Santa Ana', 'Sonsonate', 'San Miguel',
        'Usulután', 'La Paz', 'Chalatenango', 'Cuscatlán', 'Ahuachapán',
        'La Unión', 'Morazán', 'Cabañas', 'San Vicente',
    ];

    const economicActivities = [
        'Comercio al por mayor y menor',
        'Servicios profesionales',
        'Construcción',
        'Manufactura',
        'Agricultura',
        'Transporte',
        'Restaurantes y hoteles',
        'Servicios financieros',
        'Tecnología e informática',
    ];

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        const nitClean = formData.nit.replace(/[^0-9]/g, '');
        if (nitClean.length < 13) {
            setError('NIT inválido. Debe tener al menos 13 dígitos. Formato: XXXX-XXXXXX-XXX-X');
            return;
        }

        const nrcClean = formData.nrc.replace(/[^0-9]/g, '');
        if (formData.legalForm !== 'PERSONA_NATURAL') {
            if (nrcClean.length < 6 || nrcClean.length > 8) {
                setError('NRC inválido. Debe contener entre 6 y 8 dígitos.');
                return;
            }
        }

        setSubmitting(true);
        try {
            const res = await fetch('/api/companies', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest',
                },
                body: JSON.stringify({
                    ...formData,
                    shareCapital: formData.shareCapital ? parseFloat(formData.shareCapital) : null,
                    country: 'SV',
                }),
            });
            const data = await res.json();
            if (res.ok) {
                onSuccess();
            } else {
                setError(data.error || 'Error al registrar empresa');
            }
        } catch {
            onError('Error de conexión al servidor');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <Modal isOpen onClose={onClose} title="🏢 Registrar Entidad Legal" size="lg">
            <form onSubmit={handleSubmit}>
                <div className="form-group">
                    <label className="label">Tipo de Entidad *</label>
                    <select className="input" value={formData.legalForm} onChange={e => setFormData(p => ({ ...p, legalForm: e.target.value }))} required>
                        {legalForms.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
                    </select>
                </div>

                <div className="form-group">
                    <label className="label">Razón Social o Nombre Legal *</label>
                    <input type="text" className="input" value={formData.name} onChange={e => setFormData(p => ({ ...p, name: e.target.value }))} placeholder="Ej: Inversiones ABC S.A. de C.V." required />
                </div>

                <div className={styles.formRow}>
                    <div className="form-group">
                        <label className="label">NIT *</label>
                        <input type="text" className="input" value={formData.nit} onChange={e => setFormData(p => ({ ...p, nit: e.target.value }))} placeholder="0614-210188-101-2" maxLength={17} required />
                    </div>
                    <div className="form-group">
                        <label className="label">NRC {formData.legalForm === 'PERSONA_NATURAL' ? '(Opcional)' : '*'}</label>
                        <input type="text" className="input" value={formData.nrc} onChange={e => setFormData(p => ({ ...p, nrc: e.target.value }))} placeholder="123456-7" maxLength={10} required={formData.legalForm !== 'PERSONA_NATURAL'} />
                    </div>
                </div>

                <div className="form-group">
                    <label className="label">Giro o Actividad Económica *</label>
                    <select className="input" value={formData.economicActivity} onChange={e => setFormData(p => ({ ...p, economicActivity: e.target.value }))} required>
                        <option value="">Seleccionar actividad...</option>
                        {economicActivities.map(a => <option key={a} value={a}>{a}</option>)}
                    </select>
                </div>

                <div className="form-group">
                    <label className="label">Dirección Fiscal *</label>
                    <textarea className="input" value={formData.address} onChange={e => setFormData(p => ({ ...p, address: e.target.value }))} placeholder="Dirección completa exacta" rows={2} required />
                </div>

                <div className={styles.formRow}>
                    <div className="form-group">
                        <label className="label">Departamento *</label>
                        <select className="input" value={formData.department} onChange={e => setFormData(p => ({ ...p, department: e.target.value }))} required>
                            <option value="">Seleccionar...</option>
                            {departments.map(d => <option key={d} value={d}>{d}</option>)}
                        </select>
                    </div>
                    <div className="form-group">
                        <label className="label">Municipio *</label>
                        <input type="text" className="input" value={formData.municipality} onChange={e => setFormData(p => ({ ...p, municipality: e.target.value }))} placeholder="Ej: Antiguo Cuscatlán" required />
                    </div>
                </div>

                {error && (
                    <div className={styles.error}>
                        <span>⚠️</span> {error}
                    </div>
                )}

                <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
                    <button type="button" onClick={onClose} className="btn btn-secondary" style={{ flex: 1 }}>Cancelar</button>
                    <button type="submit" disabled={submitting} className="btn btn-primary" style={{ flex: 2 }}>
                        {submitting ? 'Registrando...' : 'Finalizar Registro'}
                    </button>
                </div>
            </form>
        </Modal>
    );
}

function EditMemberRoleModal({ member, onClose, onSave }: any) {
    const [role, setRole] = useState(member.role);
    return (
        <Modal isOpen onClose={onClose} title="Editar Rol de Miembro" size="sm">
            <div className="form-group">
                <label className="label">Rol en la empresa</label>
                <select className="input" value={role} onChange={e => setRole(e.target.value)}>
                    <option value="CONTADOR">Contador</option>
                    <option value="AUDITOR">Auditor</option>
                    <option value="CLIENTE">Cliente (Solo Lectura)</option>
                    <option value="DUEÑO">Dueño (Admin de Empresa)</option>
                </select>
            </div>
            <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
                <button onClick={onClose} className="btn btn-secondary" style={{ flex: 1 }}>Cancelar</button>
                <button onClick={() => onSave(role)} className="btn btn-primary" style={{ flex: 2 }}>Guardar Cambios</button>
            </div>
        </Modal>
    );
}

function ResetPasswordModal({ member, onClose, onReset }: any) {
    const [pass, setPass] = useState('');
    return (
        <Modal isOpen onClose={onClose} title="Restablecer Contraseña" size="sm">
            <p style={{ fontSize: '0.875rem', color: '#64748b', marginBottom: '1rem' }}>
                Establece una nueva contraseña para <strong>{member.user.email}</strong>.
            </p>
            <div className="form-group">
                <label className="label">Nueva Contraseña</label>
                <input type="password" className="input" value={pass} onChange={e => setPass(e.target.value)} placeholder="Mínimo 6 caracteres" />
            </div>
            <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
                <button onClick={onClose} className="btn btn-secondary" style={{ flex: 1 }}>Cancelar</button>
                <button 
                    disabled={pass.length < 6} 
                    onClick={() => onReset(pass)} 
                    className="btn btn-primary" 
                    style={{ flex: 2 }}
                >
                    Actualizar Contraseña
                </button>
            </div>
        </Modal>
    );
}
