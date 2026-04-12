'use client';

import { createContext, useContext, useEffect, ReactNode } from 'react';
import { useCompany } from '@/context/CompanyContext';

interface CompanyTheme {
    primaryColor?: string;
    sidebarBg?: string;
    sidebarFg?: string;
    logoUrl?: string | null;
    fontFamily?: string;
    mode?: 'light' | 'dark';
}

interface ThemeContextType {
    theme: CompanyTheme;
    toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType>({ 
    theme: { mode: 'light' }, 
    toggleTheme: () => {} 
});

const CSS_VAR_MAP: Record<keyof Omit<CompanyTheme, 'logoUrl' | 'fontFamily' | 'mode'>, string> = {
    primaryColor: '--primary',
    sidebarBg: '--sidebar-bg',
    sidebarFg: '--sidebar-fg',
};

function applyTheme(theme: CompanyTheme) {
    const root = document.documentElement;
    
    // Aplicar modo (light/dark)
    root.setAttribute('data-theme', theme.mode || 'light');

    (Object.keys(CSS_VAR_MAP) as Array<keyof typeof CSS_VAR_MAP>).forEach(key => {
        const cssVar = CSS_VAR_MAP[key];
        const value = theme[key];
        if (value) {
            root.style.setProperty(cssVar, value);
        } else {
            root.style.removeProperty(cssVar);
        }
    });

    if (theme.fontFamily) {
        root.style.setProperty('--font-override', theme.fontFamily);
    } else {
        root.style.removeProperty('--font-override');
    }
}

function resetTheme() {
    const root = document.documentElement;
    root.removeAttribute('data-theme');
    Object.values(CSS_VAR_MAP).forEach(cssVar => root.style.removeProperty(cssVar));
    root.style.removeProperty('--font-override');
}

import { useState } from 'react';

export function ThemeProvider({ children }: { children: ReactNode }) {
    const { activeCompany } = useCompany();
    const [mode, setMode] = useState<'light' | 'dark'>(() => {
        if (typeof window !== 'undefined') {
            return (localStorage.getItem('theme-mode') as 'light' | 'dark') || 'light';
        }
        return 'light';
    });

    const toggleTheme = () => {
        const newMode = mode === 'light' ? 'dark' : 'light';
        setMode(newMode);
        localStorage.setItem('theme-mode', newMode);
    };

    const companyTheme = ((activeCompany as any)?.metadata?.theme as CompanyTheme) || {};
    const theme: CompanyTheme = { ...companyTheme, mode };

    useEffect(() => {
        applyTheme(theme);
    }, [theme]);

    return (
        <ThemeContext.Provider value={{ theme, toggleTheme }}>
            {children}
        </ThemeContext.Provider>
    );
}

export function useTheme() {
    return useContext(ThemeContext);
}

