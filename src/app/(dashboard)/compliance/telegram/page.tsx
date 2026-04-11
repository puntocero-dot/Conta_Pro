'use client';

import { useState, useEffect } from 'react';
import styles from '../../layout.module.css';

export default function TelegramBotPage() {
  const [isLinked, setIsLinked] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    fetchStatus();
  }, []);

  const fetchStatus = async () => {
    try {
      const res = await fetch('/api/auth/telegram-link');
      const data = await res.json();
      setIsLinked(data.linked);
    } catch (err) {
      console.error('Error fetching telegram status:', err);
    } finally {
      setLoading(false);
    }
  };

  const generateToken = async () => {
    setGenerating(true);
    try {
      const res = await fetch('/api/auth/telegram-link', { method: 'POST' });
      const data = await res.json();
      setToken(data.token);
    } catch (err) {
      console.error('Error generating token:', err);
    } finally {
      setGenerating(false);
    }
  };

  if (loading) {
    return <div style={{ padding: 40, textAlign: 'center', color: '#94a3b8' }}>Cargando configuración...</div>;
  }

  return (
    <div style={{ maxWidth: 800, margin: '0 auto', padding: '24px' }}>
      <div style={{ 
        background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)', 
        borderRadius: 24, 
        padding: 40,
        border: '1px solid rgba(255,255,255,0.1)',
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginBottom: 32 }}>
          <div style={{ 
            width: 64, height: 64, borderRadius: 20, 
            background: 'linear-gradient(135deg, #0088cc 0%, #00aaff 100%)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 0 20px rgba(0, 136, 204, 0.4)'
          }}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 2L11 13" />
              <path d="M22 2L15 22L11 13L2 9L22 2Z" />
            </svg>
          </div>
          <div>
            <h1 style={{ fontSize: 28, fontWeight: 800, margin: 0, color: '#fff', letterSpacing: '-0.5px' }}>
              bookkeeping_bot
            </h1>
            <p style={{ color: '#94a3b8', margin: '4px 0 0', fontSize: 15 }}>
              Tu asistente contable inteligente en Telegram
            </p>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 24 }}>
          {/* Status Card */}
          <div style={{ 
            background: 'rgba(255,255,255,0.03)', 
            borderRadius: 20, 
            padding: 24,
            border: `1px solid ${isLinked ? 'rgba(16,185,129,0.2)' : 'rgba(255,255,255,0.05)'}`
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600, color: '#f8fafc' }}>Estado de Vinculación</h3>
                <p style={{ margin: '4px 0 0', fontSize: 14, color: isLinked ? '#10b981' : '#94a3b8' }}>
                  {isLinked ? '✅ Tu cuenta está vinculada y activa' : '❌ Aún no has vinculado tu cuenta'}
                </p>
              </div>
              {isLinked && (
                <span style={{ 
                  background: 'rgba(16,185,129,0.1)', 
                  color: '#10b981', 
                  padding: '6px 14px', 
                  borderRadius: 100, 
                  fontSize: 12, 
                  fontWeight: 600,
                  border: '1px solid rgba(16,185,129,0.2)' 
                }}>
                  ACTIVO
                </span>
              )}
            </div>
          </div>

          {!isLinked && (
            <div style={{ 
              background: 'rgba(59,130,246,0.05)', 
              borderRadius: 20, 
              padding: 32,
              border: '1px solid rgba(59,130,246,0.1)'
            }}>
              <h3 style={{ margin: '0 0 16px', fontSize: 18, fontWeight: 700, color: '#fff' }}>Cómo vincular tu cuenta</h3>
              <ol style={{ padding: 0, margin: 0, listStyle: 'none', color: '#94a3b8', fontSize: 14 }}>
                <li style={{ marginBottom: 12, display: 'flex', gap: 12 }}>
                  <span style={{ color: '#3b82f6', fontWeight: 800 }}>1.</span> 
                  Busca a <b>@bookkeeping_bot</b> en Telegram e inicia un chat.
                </li>
                <li style={{ marginBottom: 12, display: 'flex', gap: 12 }}>
                  <span style={{ color: '#3b82f6', fontWeight: 800 }}>2.</span> 
                  Haz clic en el botón de abajo para generar tu código de seguridad.
                </li>
                <li style={{ marginBottom: 12, display: 'flex', gap: 12 }}>
                  <span style={{ color: '#3b82f6', fontWeight: 800 }}>3.</span> 
                  Escribe <code>/link [tu_codigo]</code> en el chat de Telegram.
                </li>
              </ol>

              <div style={{ marginTop: 24, textAlign: 'center' }}>
                {token ? (
                  <div style={{ 
                    background: 'rgba(0,0,0,0.3)', 
                    padding: '20px', 
                    borderRadius: 16, 
                    border: '1px dashed rgba(59,130,246,0.3)'
                  }}>
                    <p style={{ margin: '0 0 8px', fontSize: 12, color: '#3b82f6', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '1px' }}>
                      Tu Código de Seguridad
                    </p>
                    <div style={{ fontSize: 36, fontWeight: 800, color: '#fff', letterSpacing: '8px', fontFamily: 'monospace' }}>
                      {token}
                    </div>
                    <p style={{ margin: '12px 0 0', fontSize: 12, color: '#64748b' }}>
                      Este código expira en 10 minutos
                    </p>
                  </div>
                ) : (
                  <button 
                    onClick={generateToken}
                    disabled={generating}
                    style={{
                      background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                      color: 'white',
                      border: 'none',
                      padding: '16px 32px',
                      borderRadius: 14,
                      fontWeight: 700,
                      cursor: 'pointer',
                      fontSize: 15,
                      transition: 'all 0.2s',
                      boxShadow: '0 10px 15px -3px rgba(59, 130, 246, 0.3)'
                    }}
                  >
                    {generating ? 'Generando...' : 'Generar Código de Vinculación'}
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Features Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginTop: 16 }}>
            {[
              { title: 'Registro con Fotos', desc: 'Envía una foto de tus tickets y Gemini extraerá los datos.', icon: '📸' },
              { title: 'Métricas Express', desc: 'Escribe /resumen para conocer el estado de tu empresa.', icon: '📉' }
            ].map(f => (
              <div key={f.title} style={{ padding: 20, borderRadius: 16, background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)' }}>
                <div style={{ fontSize: 24, marginBottom: 12 }}>{f.icon}</div>
                <h4 style={{ margin: '0 0 6px', fontSize: 14, fontWeight: 600, color: '#f1f5f9' }}>{f.title}</h4>
                <p style={{ margin: 0, fontSize: 12, color: '#64748b', lineHeight: 1.5 }}>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
