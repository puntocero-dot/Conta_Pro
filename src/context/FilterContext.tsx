'use client';

import { createContext, useContext, useState, useEffect, useCallback } from 'react';

export type DatePreset =
    | 'THIS_MONTH'
    | 'LAST_MONTH'
    | 'THIS_QUARTER'
    | 'THIS_YEAR'
    | 'LAST_7_DAYS'
    | 'LAST_30_DAYS'
    | 'CUSTOM';

interface FilterContextType {
    startDate: string;
    endDate: string;
    preset: DatePreset;
    setDateRange: (start: string, end: string) => void;
    setPreset: (preset: DatePreset) => void;
}

const STORAGE_KEY = 'contapro_date_filter';

function toLocalDateString(d: Date): string {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
}

function calcDatesForPreset(preset: DatePreset): { start: string; end: string } {
    const now = new Date();
    const today = toLocalDateString(now);

    switch (preset) {
        case 'THIS_MONTH': {
            const start = new Date(now.getFullYear(), now.getMonth(), 1);
            return { start: toLocalDateString(start), end: today };
        }
        case 'LAST_MONTH': {
            const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
            const end = new Date(now.getFullYear(), now.getMonth(), 0);
            return { start: toLocalDateString(start), end: toLocalDateString(end) };
        }
        case 'THIS_QUARTER': {
            const q = Math.floor(now.getMonth() / 3);
            const start = new Date(now.getFullYear(), q * 3, 1);
            return { start: toLocalDateString(start), end: today };
        }
        case 'THIS_YEAR': {
            const start = new Date(now.getFullYear(), 0, 1);
            return { start: toLocalDateString(start), end: today };
        }
        case 'LAST_7_DAYS': {
            const start = new Date(now);
            start.setDate(start.getDate() - 6);
            return { start: toLocalDateString(start), end: today };
        }
        case 'LAST_30_DAYS': {
            const start = new Date(now);
            start.setDate(start.getDate() - 29);
            return { start: toLocalDateString(start), end: today };
        }
        default:
            return { start: today, end: today };
    }
}

const FilterContext = createContext<FilterContextType | null>(null);

export function FilterProvider({ children }: { children: React.ReactNode }) {
    const defaultPreset: DatePreset = 'THIS_MONTH';
    const defaultDates = calcDatesForPreset(defaultPreset);

    const [startDate, setStartDate] = useState(defaultDates.start);
    const [endDate, setEndDate] = useState(defaultDates.end);
    const [preset, setPresetState] = useState<DatePreset>(defaultPreset);
    const [hydrated, setHydrated] = useState(false);

    useEffect(() => {
        try {
            const stored = localStorage.getItem(STORAGE_KEY);
            if (stored) {
                const parsed = JSON.parse(stored);
                if (parsed.preset && parsed.preset !== 'CUSTOM') {
                    const dates = calcDatesForPreset(parsed.preset);
                    setStartDate(dates.start);
                    setEndDate(dates.end);
                    setPresetState(parsed.preset);
                } else if (parsed.startDate && parsed.endDate) {
                    setStartDate(parsed.startDate);
                    setEndDate(parsed.endDate);
                    setPresetState('CUSTOM');
                }
            }
        } catch {
            // ignore
        }
        setHydrated(true);
    }, []);

    const setDateRange = useCallback((start: string, end: string) => {
        setStartDate(start);
        setEndDate(end);
        setPresetState('CUSTOM');
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify({ preset: 'CUSTOM', startDate: start, endDate: end }));
        } catch { /* ignore */ }
    }, []);

    const setPreset = useCallback((p: DatePreset) => {
        const dates = calcDatesForPreset(p);
        setStartDate(dates.start);
        setEndDate(dates.end);
        setPresetState(p);
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify({ preset: p }));
        } catch { /* ignore */ }
    }, []);

    if (!hydrated) return null;

    return (
        <FilterContext.Provider value={{ startDate, endDate, preset, setDateRange, setPreset }}>
            {children}
        </FilterContext.Provider>
    );
}

export function useFilter(): FilterContextType {
    const ctx = useContext(FilterContext);
    if (!ctx) throw new Error('useFilter must be used inside FilterProvider');
    return ctx;
}
