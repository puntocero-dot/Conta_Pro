'use client';

import { useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { CompanyProvider } from '@/context/CompanyContext';
import { CompanySelector } from '@/components/ui/CompanySelector';
import styles from './layout.module.css';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
    const { user, role, logout } = useAuth();
    const router = useRouter();
    const pathname = usePathname();
    const [sidebarOpen, setSidebarOpen] = useState(true);

    const handleLogout = async () => {
        await logout();
    };

    const menuItems = [
        { path: '/dashboard', icon: '🏠', label: 'Dashboard', roles: ['all'] },
        { path: '/invisible-ledger', icon: '✨', label: 'Bienestar Financiero', roles: ['all'] },
        { path: '/companies', icon: '🏢', label: 'Empresas', roles: ['all'] },
        { path: '/clients', icon: '👥', label: 'Clientes', roles: ['all'] },
        { path: '/transactions', icon: '💰', label: 'Transacciones', roles: ['all'] },
        { path: '/reports', icon: '📊', label: 'Reportes', roles: ['all'] },
        { path: '/security-dashboard', icon: '🔐', label: 'Seguridad', roles: ['SUPER_ADMIN'] },
    ];

    const filteredMenu = menuItems.filter(item =>
        item.roles.includes('all') || item.roles.includes(role || '')
    );

    const getSectionTitle = (path: string) => {
        const item = menuItems.find(i => i.path === path);
        return item ? item.label : 'Plataforma';
    };

    return (
        <CompanyProvider>
            <div className={styles.layout}>
                {/* Sidebar */}
                <aside className={`${styles.sidebar} ${!sidebarOpen ? styles.collapsed : ''}`}>
                    <div className={styles.sidebarHeader}>
                        <div className={styles.logo}>
                            <div className={styles.logoIcon}>
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                                    <polyline points="9 22 9 12 15 12 15 22" />
                                </svg>
                            </div>
                            {sidebarOpen && <span>Conta2Go</span>}
                        </div>
                        <button
                            onClick={() => setSidebarOpen(!sidebarOpen)}
                            className={styles.toggleBtn}
                            title={sidebarOpen ? "Colapsar" : "Expandir"}
                        >
                            {sidebarOpen ? '❮' : '❯'}
                        </button>
                    </div>

                    <CompanySelector isCollapsed={!sidebarOpen} />

                    <nav className={styles.nav}>
                        {filteredMenu.map(item => (
                            <button
                                key={item.path}
                                onClick={() => router.push(item.path)}
                                className={`${styles.navItem} ${pathname === item.path ? styles.active : ''}`}
                            >
                                <span className={styles.navIcon}>{item.icon}</span>
                                {sidebarOpen && <span>{item.label}</span>}
                            </button>
                        ))}
                    </nav>

                    <div className={styles.sidebarFooter}>
                        <div className={styles.userCard}>
                            <div className={styles.avatar}>
                                {user?.email?.charAt(0).toUpperCase() || 'U'}
                            </div>
                            {sidebarOpen && (
                                <div className={styles.userInfo}>
                                    <p className={styles.userName}>{user?.email}</p>
                                    <span className={styles.userRole}>{role?.replace('_', ' ')}</span>
                                </div>
                            )}
                        </div>
                        <button onClick={handleLogout} className={styles.logoutBtn}>
                            <span>🚪</span> {sidebarOpen && <span>Cerrar Sesión</span>}
                        </button>
                    </div>
                </aside>

                {/* Main Content */}
                <main className={styles.main}>
                    <header className={styles.topBar}>
                        <div className={styles.sectionTitle}>
                            {getSectionTitle(pathname)}
                        </div>
                        <div className={styles.topBarActions}>
                            <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                                {new Date().toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                            </span>
                        </div>
                    </header>
                    <div className={styles.contentWrapper}>
                        <div className="animate-fade-in">
                            {children}
                        </div>
                    </div>
                </main>
            </div>
        </CompanyProvider>
    );
}
