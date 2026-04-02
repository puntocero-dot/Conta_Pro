'use client';

import { createContext, useContext, useEffect, ReactNode } from 'react';
import { useCompany } from '@/context/CompanyContext';

interface CompanyTheme {
    primaryColor?: string;
    sidebarBg?: string;
    sidebarFg?: string;
    logoUrl?: string | null;
    fontFamily?: string;
}

interface ThemeContextType {
    theme: CompanyTheme;
}

const ThemeContext = createContext<ThemeContextType>({ theme: {} });

const CSS_VAR_MAP: Record<keyof Omit<CompanyTheme, 'logoUrl' | 'fontFamily'>, string> = {
    primaryColor: '--primary',
    sidebarBg: '--sidebar-bg',
    sidebarFg: '--sidebar-fg',
};

function applyTheme(theme: CompanyTheme) {
    const root = document.documentElement;
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
    Object.values(CSS_VAR_MAP).forEach(cssVar => root.style.removeProperty(cssVar));
    root.style.removeProperty('--font-override');
}

export function ThemeProvider({ children }: { children: ReactNode }) {
    const { activeCompany } = useCompany();

    useEffect(() => {
        const theme = (activeCompany as any)?.metadata?.theme as CompanyTheme | undefined;
        if (theme && Object.keys(theme).length > 0) {
            applyTheme(theme);
        } else {
            resetTheme();
        }
        return () => {
            resetTheme();
        };
    }, [activeCompany]);

    const theme = ((activeCompany as any)?.metadata?.theme as CompanyTheme) || {};

    return (
        <ThemeContext.Provider value={{ theme }}>
            {children}
        </ThemeContext.Provider>
    );
}

export function useTheme() {
    return useContext(ThemeContext);
}
