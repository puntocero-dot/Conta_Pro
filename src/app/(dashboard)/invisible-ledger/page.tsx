'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

// Inline SVG Icons to avoid lucide-react dependency issues
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
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M4 14.5a1 1 0 0 1-1-1 4 4 0 0 1 4-4h3V4.7a1 1 0 0 1 1.6-.8l9 6a1 1 0 0 1 0 1.6l-9 6a1 1 0 0 1-1.6-.8V14.5H7a1 1 0 0 1-1-1 4 4 0 0 1-4-4Z" /></svg>
);
const Wallet = ({ className }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><path d="M19 7V4a1 1 0 0 0-1-1H5a2 2 0 0 0 0 4h15a1 1 0 0 1 1 1v4h-3a2 2 0 0 0 0 4h3a1 1 0 0 1 1 1v2a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V7" /><circle cx="16" cy="11.5" r="1.5" /></svg>
);
const Calendar = ({ className }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><rect width="18" height="18" x="3" y="4" rx="2" ry="2" /><line x1="16" x2="16" y1="2" y2="6" /><line x1="8" x2="8" y1="2" y2="6" /><line x1="3" x2="21" y1="10" y2="10" /></svg>
);
const Search = ({ className }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}><circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" /></svg>
);

interface HumanFriendlyEntry {
    id: string;
    date: string;
    description: string;
    amount: number;
    type: 'INGRESO' | 'EGRESO';
    securityStatus: 'CLEAR' | 'WATCH';
    humanInterpretation: string;
}

export default function HumanFriendlyLedger() {
    const [entries, setEntries] = useState<HumanFriendlyEntry[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Simulación de carga desde el nuevo Ledger inyectado
        setTimeout(() => {
            setEntries([
                {
                    id: '1',
                    date: 'Hoy, 14:30',
                    description: 'Gasolina Puma San Benito',
                    amount: 45.50,
                    type: 'EGRESO',
                    securityStatus: 'CLEAR',
                    humanInterpretation: 'Tu negocio gastó en movilidad. El sistema ya preparó tu reporte de IVA.'
                },
                {
                    id: '2',
                    date: 'Hoy, 10:15',
                    description: 'Venta - Proyecto Alpha',
                    amount: 12500.00,
                    type: 'INGRESO',
                    securityStatus: 'WATCH',
                    humanInterpretation: '¡Gran ingreso! Al superar los $10k, hemos preparado los documentos para cumplimiento AML.'
                },
                {
                    id: '3',
                    date: 'Ayer',
                    description: 'Pago de Alquiler Oficina',
                    amount: 600.00,
                    type: 'EGRESO',
                    securityStatus: 'CLEAR',
                    humanInterpretation: 'Gasto fijo registrado. La rentabilidad mensual se mantiene en verde.'
                }
            ]);
            setLoading(false);
        }, 1000);
    }, []);

    return (
        <div className="p-6 space-y-6 animate-in fade-in duration-500">
            <header className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-emerald-400 bg-clip-text text-transparent">
                        Bienestar Financiero
                    </h1>
                    <p className="text-slate-400">Tu contabilidad sucede en silencio por detrás.</p>
                </div>
                <div className="flex gap-2">
                    <Badge variant="outline" className="py-1 px-3 border-emerald-500/30 text-emerald-400">
                        <ShieldCheck className="w-4 h-4 mr-1" /> Protección AML Activa
                    </Badge>
                    <Badge variant="outline" className="py-1 px-3 border-blue-500/30 text-blue-400">
                        <Zap className="w-4 h-4 mr-1" /> NIIF 2025 Cumplida
                    </Badge>
                </div>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="bg-slate-900/50 border-slate-800 backdrop-blur-sm">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <CardTitle className="text-sm font-medium text-slate-400">Dinero Disponible</CardTitle>
                        <Wallet className="w-4 h-4 text-emerald-400" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold text-slate-100">$24,560.80</div>
                        <p className="text-xs text-emerald-400 flex items-center mt-1">
                            <ArrowUpRight className="w-3 h-3 mr-1" /> +12% vs mes pasado
                        </p>
                    </CardContent>
                </Card>

                {/* Placeholder cards for other stats */}
            </div>

            <div className="bg-slate-900/40 border border-slate-800 rounded-xl overflow-hidden">
                <div className="p-4 border-b border-slate-800 flex justify-between items-center bg-slate-900/60">
                    <h2 className="font-semibold text-slate-200">Actividad Reciente</h2>
                    <div className="relative">
                        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                        <input
                            type="text"
                            placeholder="¿Qué buscas?"
                            className="bg-slate-950 border border-slate-800 rounded-full py-1.5 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                        />
                    </div>
                </div>

                <div className="divide-y divide-slate-800">
                    {loading ? (
                        <div className="p-8 text-center text-slate-500">Cargando tu historia...</div>
                    ) : (
                        entries.map((entry) => (
                            <div key={entry.id} className="p-4 hover:bg-white/5 transition-colors group">
                                <div className="flex justify-between items-start">
                                    <div className="flex gap-4">
                                        <div className={`p-3 rounded-full ${entry.type === 'INGRESO' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>
                                            {entry.type === 'INGRESO' ? <ArrowDownLeft className="w-5 h-5" /> : <ArrowUpRight className="w-5 h-5" />}
                                        </div>
                                        <div>
                                            <div className="font-medium text-slate-200">{entry.description}</div>
                                            <div className="text-xs text-slate-500 flex items-center mt-1">
                                                <Calendar className="w-3 h-3 mr-1" /> {entry.date}
                                            </div>
                                            <div className="mt-2 text-sm text-slate-400 bg-slate-950/50 p-2 rounded border-l-2 border-slate-700">
                                                {entry.humanInterpretation}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <div className={`font-bold ${entry.type === 'INGRESO' ? 'text-emerald-400' : 'text-red-400'}`}>
                                            {entry.type === 'INGRESO' ? '+' : '-'}${entry.amount.toLocaleString()}
                                        </div>
                                        {entry.securityStatus === 'WATCH' && (
                                            <Badge variant="secondary" className="mt-1 bg-amber-500/20 text-amber-500 hover:bg-amber-500/30 text-[10px] py-0 px-2">
                                                BAJO REVISIÓN AML
                                            </Badge>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}
