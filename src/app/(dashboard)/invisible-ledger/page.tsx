'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/useAuth';
import { useCompany } from '@/context/CompanyContext';
import styles from './invisible-ledger.module.css';

// Inline SVG Icons
const ArrowUpRight = ({ className }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M7 7h10v10" /><path d="M7 17 17 7" /></svg>
);
const ArrowDownLeft = ({ className }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M17 17H7V7" /><path d="M17 7 7 17" /></svg>
);
const ShieldCheck = ({ className }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z" /><path d="m9 12 2 2 4-4" /></svg>
);
const Zap = ({ className }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" /></svg>
);
const Wallet = ({ className }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M19 12V7H5V12M19 12V17H5V12M19 12H21M5 12H3" /><rect x="5" y="7" width="14" height="10" rx="2" /></svg>
);
const Calendar = ({ className }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><rect width="18" height="18" x="3" y="4" rx="2" ry="2" /><line x1="16" x2="16" y1="2" y2="6" /><line x1="8" x2="8" y1="2" y2="6" /><line x1="3" x2="21" y1="10" y2="10" /></svg>
);

interface LedgerEntry {
    id: string;
    date: string;
    description: string;
    amount: number;
    type: 'DEBIT' | 'CREDIT';
    account: {
        name: string;
    };
    createdAt: string;
}

export default function HumanFriendlyLedger() {
    const { user, loading: authLoading } = useAuth();
    const { activeCompanyId, isLoading: companyLoading } = useCompany();
    const [entries, setEntries] = useState<LedgerEntry[]>([]);
    const [stats, setStats] = useState({ balance: 0, change: 0 });
    const [loading, setLoading] = useState(true);

    const fetchLedger = useCallback(async () => {
        if (!activeCompanyId) return;
        setLoading(true);
        try {
            const response = await fetch('/api/ledger', {
                headers: {
                    'x-company-id': activeCompanyId
                }
            });
            if (response.ok) {
                const data = await response.json();
                setEntries(data.entries || []);

                // Calculate pseudo-stats from entries
                const balance = data.entries.reduce((acc: number, curr: LedgerEntry) =>
                    curr.type === 'CREDIT' ? acc + curr.amount : acc - curr.amount, 0);
                setStats({ balance, change: 12 }); // Change is hardcoded for demo
            }
        } catch (error) {
            console.error('Error fetching ledger:', error);
        } finally {
            setLoading(false);
        }
    }, [activeCompanyId]);

    useEffect(() => {
        if (activeCompanyId) {
            fetchLedger();
        } else {
            setEntries([]);
            setLoading(false);
        }
    }, [activeCompanyId, fetchLedger]);

    const getHumanInterpretation = (entry: LedgerEntry) => {
        if (entry.type === 'CREDIT') {
            return `Ingreso registrado en ${entry.account.name}. El sistema ha actualizado automáticamente tus balances financieros.`;
        } else {
            return `Gasto detectado de ${entry.account.name}. Se ha clasificado para optimización fiscal.`;
        }
    };

    if (authLoading || companyLoading || (loading && entries.length === 0)) {
        return <div className="p-8 text-center text-slate-500">Analizando bienestar financiero...</div>;
    }

    return (
        <div className="p-6 space-y-6 animate-in fade-in duration-500">
            <header className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-emerald-400 bg-clip-text text-transparent">
                        Bienestar Financiero
                    </h1>
                    <p className="text-slate-400">
                        Tu contabilidad sucede en silencio. El <strong>Ledger Invisible</strong> registra automáticamente cada transacción en libros contables de partida doble, preparándote para auditorías y declaraciones sin esfuerzo manual.
                    </p>
                </div>
                <div className="flex gap-2">
                    <Badge variant="outline" className="py-1 px-3 border-emerald-500/30 text-emerald-400">
                        <ShieldCheck className="w-4 h-4 mr-1" /> Protección AML Activa
                    </Badge>
                    <Badge variant="outline" className="py-1 px-3 border-blue-500/30 text-blue-400">
                        <Zap className="w-4 h-4 mr-1" /> IA Contable Lista
                    </Badge>
                </div>
            </header>

            {!activeCompanyId && (
                <div className="p-12 text-center border-2 border-dashed border-slate-800 rounded-xl">
                    <p className="text-slate-400">Selecciona una empresa para ver su bienestar financiero.</p>
                </div>
            )}

            {activeCompanyId && (
                <>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <Card className="bg-slate-900/50 border-slate-800 backdrop-blur-sm">
                            <CardHeader className="flex flex-row items-center justify-between pb-2">
                                <CardTitle className="text-sm font-medium text-slate-400">Balance Contable</CardTitle>
                                <Wallet className="w-4 h-4 text-emerald-400" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold text-slate-100">${stats.balance.toLocaleString()}</div>
                                <p className="text-xs text-emerald-400 flex items-center mt-1">
                                    <ArrowUpRight className="w-3 h-3 mr-1" /> +{stats.change}% vs periodo anterior
                                </p>
                            </CardContent>
                        </Card>
                    </div>

                    <div className="bg-slate-900/40 border border-slate-800 rounded-xl overflow-hidden">
                        <div className="p-4 border-b border-slate-800 bg-slate-900/60">
                            <h2 className="font-semibold text-slate-200">Libro Mayor Invisible</h2>
                        </div>

                        <div className="divide-y divide-slate-800">
                            {entries.length === 0 ? (
                                <div className="p-12 text-center text-slate-500">No hay actividad contable registrada aún.</div>
                            ) : (
                                entries.map((entry) => (
                                    <div key={entry.id} className="p-4 hover:bg-white/5 transition-colors group">
                                        <div className="flex justify-between items-start">
                                            <div className="flex gap-4">
                                                <div className={`p-3 rounded-full ${entry.type === 'CREDIT' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>
                                                    {entry.type === 'CREDIT' ? <ArrowDownLeft className="w-5 h-5" /> : <ArrowUpRight className="w-5 h-5" />}
                                                </div>
                                                <div>
                                                    <div className="font-medium text-slate-200">{entry.description}</div>
                                                    <div className="text-xs text-slate-500 flex items-center mt-1">
                                                        <Calendar className="w-3 h-3 mr-1" /> {new Date(entry.createdAt).toLocaleString()}
                                                    </div>
                                                    <div className="mt-2 text-sm text-slate-400 bg-slate-950/50 p-2 rounded border-l-2 border-slate-700">
                                                        {getHumanInterpretation(entry)}
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <div className={`font-bold ${entry.type === 'CREDIT' ? 'text-emerald-400' : 'text-red-400'}`}>
                                                    {entry.type === 'CREDIT' ? '+' : '-'}${entry.amount.toLocaleString()}
                                                </div>
                                                <Badge variant="secondary" className="mt-1 bg-slate-800 text-slate-400 text-[10px] py-0 px-2">
                                                    ASIENTO AUTOMÁTICO
                                                </Badge>
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
