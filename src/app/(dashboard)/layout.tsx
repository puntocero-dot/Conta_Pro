'use client';

import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { CompanyProvider } from '@/context/CompanyContext';
import { FilterProvider } from '@/context/FilterContext';
import { ToastProvider } from '@/context/ToastContext';
import { ThemeProvider, useTheme } from '@/context/ThemeContext';
import { ErrorBoundary } from '@/components/ui/ErrorBoundary';
import { CompanySelector } from '@/components/ui/CompanySelector';
import { DateRangePicker } from '@/components/ui/DateRangePicker';
import {
    HomeIcon, SparklesIcon, BuildingIcon, UsersIcon,
    WalletIcon, BarChartIcon, ShieldIcon, ClipboardIcon, LogOutIcon
} from '@/components/icons';
import styles from './layout.module.css';

function DashboardContent({ children }: { children: React.ReactNode }) {
    const { user, role, logout } = useAuth();
    const { theme } = useTheme();
    const router = useRouter();
    const pathname = usePathname();
    const [sidebarOpen, setSidebarOpen] = useState(true);
    const [mobileOpen, setMobileOpen] = useState(false);

    // Cerrar sidebar mobile al cambiar de ruta
    useEffect(() => {
        setMobileOpen(false);
    }, [pathname]);

    // Inicializar sidebar colapsado en pantallas pequeñas
    useEffect(() => {
        if (window.innerWidth < 768) {
            setSidebarOpen(false);
        }
    }, []);

    const handleLogout = async () => {
        await logout();
    };

    const menuItems = [
        { path: '/dashboard', icon: <HomeIcon size={18} />, label: 'Dashboard', roles: ['all'] },
        { path: '/invisible-ledger', icon: <SparklesIcon size={18} />, label: 'Bienestar Financiero', roles: ['all'] },
        { path: '/companies', icon: <BuildingIcon size={18} />, label: 'Empresas', roles: ['all'] },
        { path: '/clients', icon: <UsersIcon size={18} />, label: 'Clientes', roles: ['all'] },
        { path: '/transactions', icon: <WalletIcon size={18} />, label: 'Transacciones', roles: ['all'] },
        { path: '/reports', icon: <BarChartIcon size={18} />, label: 'Reportes', roles: ['all'] },
        { path: '/security-dashboard', icon: <ShieldIcon size={18} />, label: 'Seguridad', roles: ['SUPER_ADMIN'] },
        { path: '/security/audit-logs', icon: <ClipboardIcon size={18} />, label: 'Auditoría', roles: ['AUDITOR'] },
    ];

    const filteredMenu = menuItems.filter(item =>
        item.roles.includes('all') || item.roles.includes(role || '')
    );

    const getSectionTitle = (path: string) => {
        const securityTitles: Record<string, string> = {
            '/security/audit-logs': 'Registro de Auditoría',
            '/security/users': 'Gestión de Usuarios',
            '/security/alerts': 'Alertas de Seguridad',
        };
        if (securityTitles[path]) return securityTitles[path];
        const item = menuItems.find(i => i.path === path || path.startsWith(i.path + '/'));
        return item ? item.label : 'Conta Pro';
    };

    const handleNavClick = (path: string) => {
        router.push(path);
        setMobileOpen(false);
    };

    return (
        <CompanyProvider>
            <ThemeProvider>
            <FilterProvider>
            <ToastProvider>
                <div className={styles.layout}>
                    {/* Mobile overlay */}
                    {mobileOpen && (
                        <div
                            className={styles.mobileOverlay}
                            onClick={() => setMobileOpen(false)}
                        />
                    )}

                    {/* Sidebar */}
                    <aside className={`${styles.sidebar} ${!sidebarOpen ? styles.collapsed : ''} ${mobileOpen ? styles.mobileOpen : ''}`}>
                        <div className={styles.sidebarHeader}>
                            <div className={styles.logo}>
                                <div className={styles.logoIcon}>
                                    {theme.logoUrl ? (
                                        // eslint-disable-next-line @next/next/no-img-element
                                        <img src={theme.logoUrl} alt="Logo" style={{ width: 20, height: 20, objectFit: 'contain', borderRadius: 4 }} />
                                    ) : (
                                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                                            <polyline points="9 22 9 12 15 12 15 22" />
                                        </svg>
                                    )}
                                </div>
                                {sidebarOpen && <span>Conta Pro</span>}
                            </div>
                            <button
                                onClick={() => setSidebarOpen(!sidebarOpen)}
                                className={`${styles.toggleBtn} ${styles.desktopToggle}`}
                                title={sidebarOpen ? 'Colapsar' : 'Expandir'}
                                aria-label={sidebarOpen ? 'Colapsar menú' : 'Expandir menú'}
                            >
                                {sidebarOpen ? '❮' : '❯'}
                            </button>
                        </div>

                        <CompanySelector isCollapsed={!sidebarOpen} />

                        <nav className={styles.nav}>
                            {filteredMenu.map(item => (
                                <button
                                    key={item.path}
                                    onClick={() => handleNavClick(item.path)}
                                    className={`${styles.navItem} ${pathname === item.path || pathname.startsWith(item.path + '/') ? styles.active : ''}`}
                                    aria-current={pathname === item.path ? 'page' : undefined}
                                >
                                    <span className={styles.navIcon}>{item.icon}</span>
                                    {sidebarOpen && <span>{item.label}</span>}
                                </button>
                            ))}
                        </nav>

                        <div className={styles.sidebarFooter}>
                            <div className={styles.userCard}>
                                <div className={styles.avatar} aria-hidden="true">
                                    {user?.email?.charAt(0).toUpperCase() || 'U'}
                                </div>
                                {sidebarOpen && (
                                    <div className={styles.userInfo}>
                                        <p className={styles.userName}>{user?.email}</p>
                                        <span className={styles.userRole}>{role?.replace('_', ' ')}</span>
                                    </div>
                                )}
                            </div>
                            <button onClick={handleLogout} className={styles.logoutBtn} aria-label="Cerrar sesión">
                                <LogOutIcon size={16} />
                                {sidebarOpen && <span>Cerrar Sesión</span>}
                            </button>
                        </div>
                    </aside>

                    {/* Main Content */}
                    <main className={styles.main}>
                        <header className={styles.topBar}>
                            {/* Hamburger button (mobile only) */}
                            <button
                                className={styles.hamburger}
                                onClick={() => setMobileOpen(true)}
                                aria-label="Abrir menú"
                            >
                                <span />
                                <span />
                                <span />
                            </button>
                            <div className={styles.sectionTitle}>
                                {getSectionTitle(pathname)}
                            </div>
                            <div className={styles.topBarActions}>
                                <DateRangePicker />
                            </div>
                        </header>
                        <div className={styles.contentWrapper}>
                            <div className={styles.contentInner}>
                                <ErrorBoundary>
                                    <div className="animate-fade-in">
                                        {children}
                                    </div>
                                </ErrorBoundary>
                            </div>
                        </div>
                    </main>
                </div>
            </ToastProvider>
            </FilterProvider>
            </ThemeProvider>
        </CompanyProvider>
    );
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
    return <DashboardContent>{children}</DashboardContent>;
}
