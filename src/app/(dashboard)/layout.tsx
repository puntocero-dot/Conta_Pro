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
    FileTextIcon, DollarSignIcon, AlertTriangleIcon, ArrowLeftIcon,
    SettingsIcon, XIcon, PencilIcon, CheckIcon
} from '@/components/icons';
import styles from './layout.module.css';

function DashboardContent({ children }: { children: React.ReactNode }) {
    const { user, role, logout } = useAuth();
    const { theme, toggleTheme } = useTheme();
    const router = useRouter();
    const pathname = usePathname();
    const { companies, isLoading: companyLoading } = useCompany();
    const [sidebarOpen, setSidebarOpen] = useState(true);
    const [mobileOpen, setMobileOpen] = useState(false);
    const [showUserSettings, setShowUserSettings] = useState(false);

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
        
        { path: '/laboral-hub', icon: <UsersIcon size={18} />, label: 'Laboral', roles: ['all'], group: 'modules' },
        { path: '/accounting-hub', icon: <BuildingIcon size={18} />, label: 'Contabilidad', roles: ['all'], group: 'modules' },
        { path: '/fiscal-hub', icon: <ClipboardIcon size={18} />, label: 'Fiscal', roles: ['all'], group: 'modules' },
        { path: '/admin-hub', icon: <BuildingIcon size={18} />, label: 'Administración', roles: ['all'], group: 'modules' },
        { path: '/compliance-hub', icon: <ShieldIcon size={18} />, label: 'Cumplimiento', roles: ['all'], group: 'modules' },
        { path: '/security-hub', icon: <ShieldIcon size={18} />, label: 'Seguridad', roles: ['SUPER_ADMIN', 'AUDITOR'], group: 'modules' },
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
                        <div className={styles.logoIcon}>◈</div>
                        {sidebarOpen && <span>Conta_pro</span>}
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
                                    {group === 'modules' ? 'MÓDULOS DEL NEGOCIO' : 'OTRO'}
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
                    <div 
                        className={`${styles.userCard} ${showUserSettings ? styles.userCardActive : ''}`}
                        onClick={() => setShowUserSettings(!showUserSettings)}
                        style={{ cursor: 'pointer' }}
                    >
                        <div className={styles.avatar} aria-hidden="true">
                            {user?.email?.charAt(0).toUpperCase() || 'U'}
                        </div>
                        {sidebarOpen && (
                            <div className={styles.userInfo}>
                                <p className={styles.userName}>{user?.email}</p>
                                <span className={styles.userRole}>{role?.replace('_', ' ')}</span>
                            </div>
                        )}
                        {sidebarOpen && (
                            <div className={styles.userActionIcon}>
                                <SettingsIcon size={14} />
                            </div>
                        )}
                    </div>

                    {showUserSettings && (
                        <div className={styles.userPopover}>
                            <div className={styles.popoverHeader}>
                                <span>Ajustes de Usuario</span>
                                <button 
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setShowUserSettings(false);
                                    }}
                                >
                                    <XIcon size={14} />
                                </button>
                            </div>
                            <div className={styles.popoverContent}>
                                <button className={styles.popoverItem} onClick={() => {
                                    router.push('/categories');
                                    setShowUserSettings(false);
                                }}>
                                    <SettingsIcon size={16} />
                                    <span>Configuración General</span>
                                </button>
                                <button className={styles.popoverItem}>
                                    <PencilIcon size={16} />
                                    <span>Cambiar Contraseña</span>
                                </button>
                                <button className={styles.popoverItem} onClick={() => {
                                    toggleTheme();
                                }}>
                                    {theme.mode === 'dark' ? '☀️ Modo Claro' : '🌙 Modo Oscuro'}
                                </button>
                            </div>
                            <button onClick={handleLogout} className={styles.popoverLogout}>
                                <LogOutIcon size={16} />
                                <span>Cerrar Sesión</span>
                            </button>
                        </div>
                    )}
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

