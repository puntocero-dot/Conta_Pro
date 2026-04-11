'use client';

import { useState, useEffect, useCallback } from 'react';
import { useCompany } from '@/context/CompanyContext';

interface Alert {
  id: string;
  alertType: string;
  amount: number;
  description: string;
  status: string;
  createdAt: string;
  reviewedBy: string | null;
  reportNumber: string | null;
}

interface Stats {
  pending: number;
  reviewed: number;
  reported: number;
  total: number;
  pendingKYC: number;
  expiredKYC: number;
}

const STATUS_COLORS: Record<string, { bg: string; text: string; label: string }> = {
  PENDING: { bg: 'rgba(245,158,11,0.15)', text: '#fbbf24', label: 'Pendiente' },
  REVIEWED: { bg: 'rgba(59,130,246,0.15)', text: '#60a5fa', label: 'Revisada' },
  REPORTED: { bg: 'rgba(239,68,68,0.15)', text: '#f87171', label: 'Reportada (ROS)' },
  DISMISSED: { bg: 'rgba(107,114,128,0.15)', text: '#9ca3af', label: 'Descartada' },
};

const ALERT_ICONS: Record<string, string> = {
  THRESHOLD_EXCEEDED: '🚨',
  STRUCTURING_SUSPECTED: '🔍',
  KYC_MISSING: '📋',
  MANUAL: '✍️',
};

export default function CompliancePage() {
  const { selectedCompanyId } = useCompany();
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');
  const [showBypassModal, setShowBypassModal] = useState(false);
  const [bypassReason, setBypassReason] = useState('');
  const [bypassToken, setBypassToken] = useState('');

  const fetchData = useCallback(async () => {
    if (!selectedCompanyId) return;
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filter) params.set('status', filter);
      const res = await fetch(`/api/compliance?${params}`, {
        headers: { 'x-company-id': selectedCompanyId },
      });
      const data = await res.json();
      setAlerts(data.alerts || []);
      setStats(data.stats || null);
    } catch (err) {
      console.error('Error loading compliance data:', err);
    } finally {
      setLoading(false);
    }
  }, [selectedCompanyId, filter]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const updateAlertStatus = async (alertId: string, status: string) => {
    try {
      await fetch('/api/compliance', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-company-id': selectedCompanyId || '',
        },
        body: JSON.stringify({ alertId, status }),
      });
      fetchData();
    } catch (err) {
      console.error('Error updating alert:', err);
    }
  };

  const generateToken = async () => {
    if (!bypassReason.trim()) return;
    try {
      const res = await fetch('/api/compliance', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-company-id': selectedCompanyId || '',
        },
        body: JSON.stringify({
          action: 'GENERATE_BYPASS_TOKEN',
          reason: bypassReason,
        }),
      });
      const data = await res.json();
      setBypassToken(data.token || '');
    } catch (err) {
      console.error('Error generating token:', err);
    }
  };

  const formatAmount = (n: number) => `$${n.toLocaleString('en-US', { minimumFractionDigits: 2 })}`;

  return (
    <div style={{ padding: '24px', maxWidth: 1200, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, margin: 0, color: 'var(--text-primary, #fff)' }}>
            🛡️ Cumplimiento Anti-Lavado (UIF)
          </h1>
          <p style={{ color: 'var(--text-secondary, #94a3b8)', margin: '4px 0 0' }}>
            Ley Contra el Lavado de Dinero y Activos — El Salvador
          </p>
        </div>
        <button
          onClick={() => setShowBypassModal(true)}
          style={{
            padding: '10px 20px', borderRadius: 8, border: '1px solid rgba(245,158,11,0.3)',
            background: 'rgba(245,158,11,0.1)', color: '#fbbf24', cursor: 'pointer',
            fontWeight: 600, fontSize: 13,
          }}
        >
          🔑 Token de Bypass
        </button>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 12, marginBottom: 24 }}>
          {[
            { label: 'Alertas Pendientes', value: stats.pending, color: '#fbbf24', icon: '⚠️' },
            { label: 'Revisadas', value: stats.reviewed, color: '#60a5fa', icon: '✅' },
            { label: 'Reportadas (ROS)', value: stats.reported, color: '#f87171', icon: '🚨' },
            { label: 'KYC Pendientes', value: stats.pendingKYC, color: '#fb923c', icon: '📋' },
            { label: 'KYC Vencidos', value: stats.expiredKYC, color: '#ef4444', icon: '⏰' },
            { label: 'Total Alertas', value: stats.total, color: '#8b5cf6', icon: '📊' },
          ].map(card => (
            <div
              key={card.label}
              style={{
                padding: 16, borderRadius: 12,
                background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
              }}
            >
              <div style={{ fontSize: 12, color: 'var(--text-secondary, #94a3b8)', marginBottom: 6 }}>
                {card.icon} {card.label}
              </div>
              <div style={{ fontSize: 28, fontWeight: 700, color: card.color }}>
                {card.value}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Filter */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        {['', 'PENDING', 'REVIEWED', 'REPORTED', 'DISMISSED'].map(s => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            style={{
              padding: '8px 16px', borderRadius: 8, border: 'none', cursor: 'pointer',
              background: filter === s ? 'rgba(59,130,246,0.2)' : 'rgba(255,255,255,0.05)',
              color: filter === s ? '#60a5fa' : 'var(--text-secondary, #94a3b8)',
              fontWeight: filter === s ? 600 : 400, fontSize: 13,
            }}
          >
            {s === '' ? 'Todas' : STATUS_COLORS[s]?.label || s}
          </button>
        ))}
      </div>

      {/* Alerts List */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: 60, color: 'var(--text-secondary, #94a3b8)' }}>
          Cargando...
        </div>
      ) : alerts.length === 0 ? (
        <div style={{
          textAlign: 'center', padding: 60,
          background: 'rgba(255,255,255,0.03)', borderRadius: 12, border: '1px dashed rgba(255,255,255,0.1)',
        }}>
          <p style={{ fontSize: 48, margin: 0 }}>🛡️</p>
          <p style={{ color: 'var(--text-secondary, #94a3b8)', margin: '12px 0 0' }}>
            No hay alertas {filter ? `con estado "${STATUS_COLORS[filter]?.label}"` : ''}
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {alerts.map(alert => {
            const sc = STATUS_COLORS[alert.status] || STATUS_COLORS.PENDING;
            return (
              <div
                key={alert.id}
                style={{
                  padding: 18, borderRadius: 12,
                  background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', gap: 12 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                      <span style={{ fontSize: 18 }}>{ALERT_ICONS[alert.alertType] || '⚠️'}</span>
                      <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary, #fff)' }}>
                        {formatAmount(alert.amount)}
                      </span>
                      <span style={{
                        padding: '2px 8px', borderRadius: 4, fontSize: 11, fontWeight: 600,
                        background: sc.bg, color: sc.text,
                      }}>
                        {sc.label}
                      </span>
                    </div>
                    <p style={{ margin: 0, fontSize: 13, color: 'var(--text-secondary, #94a3b8)', lineHeight: 1.5 }}>
                      {alert.description}
                    </p>
                    <p style={{ margin: '6px 0 0', fontSize: 11, color: 'rgba(148,163,184,0.6)' }}>
                      {new Date(alert.createdAt).toLocaleString('es-SV')}
                      {alert.reportNumber && <> · ROS: {alert.reportNumber}</>}
                    </p>
                  </div>

                  {alert.status === 'PENDING' && (
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button
                        onClick={() => updateAlertStatus(alert.id, 'REVIEWED')}
                        style={{
                          padding: '6px 12px', borderRadius: 6, border: 'none', cursor: 'pointer',
                          background: 'rgba(59,130,246,0.15)', color: '#60a5fa', fontSize: 12, fontWeight: 600,
                        }}
                      >
                        ✅ Revisar
                      </button>
                      <button
                        onClick={() => updateAlertStatus(alert.id, 'DISMISSED')}
                        style={{
                          padding: '6px 12px', borderRadius: 6, border: 'none', cursor: 'pointer',
                          background: 'rgba(107,114,128,0.15)', color: '#9ca3af', fontSize: 12, fontWeight: 600,
                        }}
                      >
                        Descartar
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Bypass Token Modal */}
      {showBypassModal && (
        <div
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999,
          }}
          onClick={() => { setShowBypassModal(false); setBypassToken(''); setBypassReason(''); }}
        >
          <div
            style={{
              background: 'var(--bg-card, #1e293b)', padding: 28, borderRadius: 16,
              width: '90%', maxWidth: 460, border: '1px solid rgba(245,158,11,0.2)',
            }}
            onClick={e => e.stopPropagation()}
          >
            <h2 style={{ margin: '0 0 8px', fontSize: 18, fontWeight: 700, color: '#fbbf24' }}>
              🔑 Generar Token de Bypass
            </h2>
            <p style={{ margin: '0 0 16px', fontSize: 13, color: 'var(--text-secondary, #94a3b8)' }}>
              Este token permite autorizar una transacción ≥$10,000 con un cliente sin KYC verificado.
              Válido por 1 hora. Se registra en el log de auditoría.
            </p>

            {bypassToken ? (
              <div style={{
                padding: 16, borderRadius: 8,
                background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)',
              }}>
                <p style={{ margin: '0 0 8px', fontSize: 12, color: '#10b981', fontWeight: 600 }}>
                  Token generado exitosamente:
                </p>
                <code style={{
                  display: 'block', padding: 10, borderRadius: 6,
                  background: 'rgba(0,0,0,0.3)', color: '#fbbf24',
                  fontSize: 14, fontFamily: 'monospace', wordBreak: 'break-all',
                }}>
                  {bypassToken}
                </code>
                <p style={{ margin: '8px 0 0', fontSize: 11, color: 'var(--text-secondary, #94a3b8)' }}>
                  ⏰ Válido por 1 hora. Copie este código y úselo al registrar la transacción.
                </p>
              </div>
            ) : (
              <>
                <textarea
                  placeholder="Razón para el bypass (obligatorio)..."
                  value={bypassReason}
                  onChange={e => setBypassReason(e.target.value)}
                  rows={3}
                  style={{
                    width: '100%', padding: 10, borderRadius: 8,
                    border: '1px solid rgba(255,255,255,0.15)',
                    background: 'rgba(0,0,0,0.3)', color: '#fff', fontSize: 14,
                    resize: 'vertical', boxSizing: 'border-box',
                  }}
                />
                <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 16 }}>
                  <button
                    type="button"
                    onClick={() => { setShowBypassModal(false); setBypassReason(''); }}
                    style={{
                      padding: '10px 20px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.15)',
                      background: 'transparent', color: '#94a3b8', cursor: 'pointer', fontSize: 14,
                    }}
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={generateToken}
                    disabled={!bypassReason.trim()}
                    style={{
                      padding: '10px 24px', borderRadius: 8, border: 'none', cursor: 'pointer',
                      background: bypassReason.trim()
                        ? 'linear-gradient(135deg, #f59e0b, #d97706)'
                        : 'rgba(107,114,128,0.3)',
                      color: '#fff', fontWeight: 600, fontSize: 14,
                      opacity: bypassReason.trim() ? 1 : 0.5,
                    }}
                  >
                    Generar Token
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
