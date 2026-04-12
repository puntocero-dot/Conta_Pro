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
import { useCompany } from '@/context/CompanyContext';
import { DateRangePicker } from '@/components/ui/DateRangePicker';
import {
    HomeIcon, SparklesIcon, BuildingIcon, UsersIcon,
    WalletIcon, BarChartIcon, ShieldIcon, ClipboardIcon, LogOutIcon,
    FileTextIcon, DollarSignIcon, AlertTriangleIcon, ArrowLeftIcon
} from '@/components/icons';
import styles from './layout.module.css';

function DashboardContent({ children }: { children: React.ReactNode }) {
    const { user, role, logout } = useAuth();
    const { theme } = useTheme();
    const router = useRouter();
    const pathname = usePathname();
    const { companies, isLoading: companyLoading } = useCompany();
    const [sidebarOpen, setSidebarOpen] = useState(true);
    const [mobileOpen, setMobileOpen] = useState(false);

    // Redirección a onboarding si no hay empresas
    useEffect(() => {
        if (!companyLoading && companies.length === 0 && pathname !== '/onboarding' && user) {
            router.push('/onboarding');
        }
    }, [companies, companyLoading, pathname, router, user]);

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
        { path: '/dashboard', icon: <HomeIcon size={18} />, label: 'Dashboard', roles: ['all'], group: 'main' },
        { path: '/transactions', icon: <WalletIcon size={18} />, label: 'Transacciones', roles: ['all'], group: 'main' },
        { path: '/reports', icon: <BarChartIcon size={18} />, label: 'Reportes', roles: ['all'], group: 'main' },
        { path: '/invisible-ledger', icon: <SparklesIcon size={18} />, label: 'Libro Contable', roles: ['all'], group: 'main' },
        
        { path: '/laboral-hub', icon: <UsersIcon size={18} />, label: 'Laboral', roles: ['all'], group: 'labor' },
        { path: '/accounting-hub', icon: <BuildingIcon size={18} />, label: 'Contabilidad', roles: ['all'], group: 'accounting' },
        { path: '/fiscal-hub', icon: <ClipboardIcon size={18} />, label: 'Fiscal', roles: ['all'], group: 'fiscal' },
        { path: '/admin-hub', icon: <BuildingIcon size={18} />, label: 'Administración', roles: ['all'], group: 'admin' },
        { path: '/compliance-hub', icon: <ShieldIcon size={18} />, label: 'Cumplimiento', roles: ['all'], group: 'compliance' },
        { path: '/security-hub', icon: <ShieldIcon size={18} />, label: 'Seguridad', roles: ['SUPER_ADMIN', 'AUDITOR'], group: 'admin' },
        
        { path: '/categories', icon: <FileTextIcon size={18} />, label: 'Configuración', roles: ['all'], group: 'system' },
    ];

    const filteredMenu = menuItems.filter(item =>
        item.roles.includes('all') || item.roles.includes(role || '')
    );

    const getSectionTitle = (path: string) => {
        const securityTitles: Record<string, string> = {
            '/security/audit-logs': 'Registro de Auditoría',
            '/security/users': 'Gestión de Usuarios',
            '/security/alerts': 'Alertas de Seguridad',
            '/payroll': 'Gestión de Planillas',
            '/loans': 'Control de Préstamos',
            '/provisions': 'Previsiones Laborales',
            '/compliance': 'Cumplimiento Anti-Lavado',
            '/compliance/telegram': 'Configuración bookkeeping_bot',
            '/legal-books': 'Custodia de Libros Legales',
            '/admin/prospectos': 'Gestión de Leads',
            '/laboral-hub': 'Centro de Mando Laboral',
            '/accounting-hub': 'Contabilidad Avanzada',
            '/fiscal-hub': 'Portal Fiscal',
            '/admin-hub': 'Administración General',
            '/compliance-hub': 'Centro de Cumplimiento',
            '/security-hub': 'Seguridad y Auditoría',
            '/categories': 'Categorías y Conceptos',
            '/dashboard': 'Panel Principal',
            '/invisible-ledger': 'Libro Contable Inteligente',
            '/transactions': 'Registro de Movimientos',
            '/reports': 'Reportes y Análisis'
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
                                    <path d="M9 22V12h6v10" />
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
                    {filteredMenu.reduce<{ group: string; items: typeof filteredMenu }[]>((acc, item) => {
                        const last = acc[acc.length - 1];
                        if (!last || last.group !== item.group) acc.push({ group: item.group, items: [item] });
                        else last.items.push(item);
                        return acc;
                    }, []).map(({ group, items }) => (
                        <div key={group}>
                            {sidebarOpen && group !== 'main' && (
                                <p className={styles.navGroupLabel}>
                                    {group === 'labor' ? 'LABORAL'
                                      : group === 'finance' ? 'FINANCIERO'
                                      : group === 'accounting' ? 'CONTABILIDAD'
                                      : group === 'fiscal' ? 'FISCAL'
                                      : group === 'compliance' ? 'CUMPLIMIENTO'
                                      : 'ADMINISTRACIÓN'}
                                </p>
                            )}
                            {items.map(item => (
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
                        </div>
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
                    <div className={styles.topBarLeft}>
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
                        
                        {pathname !== '/dashboard' && pathname !== '/security-dashboard' && (
                            <button 
                                onClick={() => router.back()}
                                className={styles.backBtn}
                                title="Regresar"
                            >
                                <ArrowLeftIcon size={18} />
                            </button>
                        )}

                        <div className={styles.sectionTitle}>
                            {getSectionTitle(pathname)}
                        </div>
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
    );
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
    return (
        <CompanyProvider>
            <ThemeProvider>
                <FilterProvider>
                    <ToastProvider>
                        <DashboardContent>{children}</DashboardContent>
                    </ToastProvider>
                </FilterProvider>
            </ThemeProvider>
        </CompanyProvider>
    );
}

