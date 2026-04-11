'use client';

import { useState, useEffect, useCallback } from 'react';
import { useCompany } from '@/context/CompanyContext';

const BOOK_TYPES = [
  { key: 'ACTAS', label: 'Libro de Actas', icon: '📜' },
  { key: 'ACCIONISTAS', label: 'Registro de Accionistas', icon: '👥' },
  { key: 'DIARIO', label: 'Libro Diario (Foliado)', icon: '📒' },
  { key: 'MAYOR', label: 'Libro Mayor (Foliado)', icon: '📗' },
  { key: 'CAPITAL_VARIABLE', label: 'Capital Variable', icon: '📊' },
];

interface LegalBook {
  id: string;
  type: string;
  title: string;
  content: Record<string, unknown>;
  folioNumber: number | null;
  date: string;
  createdAt: string;
}

interface BookType {
  type: string;
  label: string;
  count: number;
}

export default function LegalBooksPage() {
  const { activeCompanyId } = useCompany();
  const [books, setBooks] = useState<LegalBook[]>([]);
  const [bookTypes, setBookTypes] = useState<BookType[]>([]);
  const [activeTab, setActiveTab] = useState('ACTAS');
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ type: 'ACTAS', title: '', content: '', folioNumber: '', date: '' });

  const fetchBooks = useCallback(async () => {
    if (!activeCompanyId) return;
    setLoading(true);
    try {
      const res = await fetch('/api/legal-books', {
        headers: { 'x-company-id': activeCompanyId },
      });
      const data = await res.json();
      setBooks(data.books || []);
      setBookTypes(data.bookTypes || []);
    } catch (err) {
      console.error('Error loading legal books:', err);
    } finally {
      setLoading(false);
    }
  }, [activeCompanyId]);

  useEffect(() => { fetchBooks(); }, [fetchBooks]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/legal-books', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-company-id': activeCompanyId || '',
        },
        body: JSON.stringify(form),
      });
      if (res.ok) {
        setShowModal(false);
        setForm({ type: 'ACTAS', title: '', content: '', folioNumber: '', date: '' });
        fetchBooks();
      }
    } catch (err) {
      console.error('Error creating book:', err);
    }
  };

  const filteredBooks = books.filter(b => b.type === activeTab);
  const activeConfig = BOOK_TYPES.find(t => t.key === activeTab);

  return (
    <div style={{ padding: '24px', maxWidth: 1200, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, margin: 0, color: 'var(--text-primary, #fff)' }}>
            📚 Libros Legales
          </h1>
          <p style={{ color: 'var(--text-secondary, #94a3b8)', margin: '4px 0 0' }}>
            Código de Comercio de El Salvador — Registros obligatorios
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          style={{
            padding: '10px 20px', borderRadius: 8, border: 'none', cursor: 'pointer',
            background: 'linear-gradient(135deg, #3b82f6, #2563eb)', color: '#fff',
            fontWeight: 600, fontSize: 14,
          }}
        >
          + Nuevo Registro
        </button>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 24, overflowX: 'auto', paddingBottom: 4 }}>
        {BOOK_TYPES.map(t => {
          const count = bookTypes.find(bt => bt.type === t.key)?.count || 0;
          return (
            <button
              key={t.key}
              onClick={() => setActiveTab(t.key)}
              style={{
                padding: '10px 18px', borderRadius: 8, border: 'none', cursor: 'pointer',
                background: activeTab === t.key ? 'rgba(59,130,246,0.2)' : 'rgba(255,255,255,0.05)',
                color: activeTab === t.key ? '#60a5fa' : 'var(--text-secondary, #94a3b8)',
                fontWeight: activeTab === t.key ? 600 : 400, fontSize: 13, whiteSpace: 'nowrap',
                transition: 'all 0.2s',
              }}
            >
              {t.icon} {t.label} ({count})
            </button>
          );
        })}
      </div>

      {/* Content */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: 60, color: 'var(--text-secondary, #94a3b8)' }}>
          Cargando...
        </div>
      ) : filteredBooks.length === 0 ? (
        <div style={{
          textAlign: 'center', padding: 60,
          background: 'rgba(255,255,255,0.03)', borderRadius: 12, border: '1px dashed rgba(255,255,255,0.1)',
        }}>
          <p style={{ fontSize: 48, margin: 0 }}>{activeConfig?.icon}</p>
          <p style={{ color: 'var(--text-secondary, #94a3b8)', margin: '12px 0 0' }}>
            No hay registros en {activeConfig?.label}
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {filteredBooks.map(book => (
            <div
              key={book.id}
              style={{
                padding: 20, borderRadius: 12,
                background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: 16, fontWeight: 600, color: 'var(--text-primary, #fff)' }}>
                    {book.title}
                  </h3>
                  <p style={{ margin: '6px 0 0', fontSize: 13, color: 'var(--text-secondary, #94a3b8)' }}>
                    📅 {new Date(book.date).toLocaleDateString('es-SV')}
                    {book.folioNumber && <> &nbsp;·&nbsp; Folio #{book.folioNumber}</>}
                  </p>
                </div>
                <span style={{
                  padding: '4px 10px', borderRadius: 6, fontSize: 11, fontWeight: 600,
                  background: 'rgba(59,130,246,0.15)', color: '#60a5fa',
                }}>
                  {activeConfig?.label}
                </span>
              </div>
              {book.content && (
                <div style={{
                  marginTop: 12, padding: 12, borderRadius: 8,
                  background: 'rgba(0,0,0,0.2)', fontSize: 13, color: 'var(--text-secondary, #94a3b8)',
                  whiteSpace: 'pre-wrap', maxHeight: 150, overflow: 'auto',
                }}>
                  {typeof book.content === 'object' && 'text' in book.content
                    ? String(book.content.text)
                    : JSON.stringify(book.content, null, 2)}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999,
        }}
          onClick={() => setShowModal(false)}
        >
          <div
            style={{
              background: 'var(--bg-card, #1e293b)', padding: 28, borderRadius: 16,
              width: '90%', maxWidth: 520, border: '1px solid rgba(255,255,255,0.1)',
            }}
            onClick={e => e.stopPropagation()}
          >
            <h2 style={{ margin: '0 0 20px', fontSize: 18, fontWeight: 700, color: 'var(--text-primary, #fff)' }}>
              Nuevo Registro Legal
            </h2>
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <select
                value={form.type}
                onChange={e => setForm({ ...form, type: e.target.value })}
                style={{
                  padding: 10, borderRadius: 8, border: '1px solid rgba(255,255,255,0.15)',
                  background: 'rgba(0,0,0,0.3)', color: '#fff', fontSize: 14,
                }}
              >
                {BOOK_TYPES.map(t => (
                  <option key={t.key} value={t.key}>{t.icon} {t.label}</option>
                ))}
              </select>
              <input
                type="text" placeholder="Título del registro"
                value={form.title} onChange={e => setForm({ ...form, title: e.target.value })}
                required
                style={{
                  padding: 10, borderRadius: 8, border: '1px solid rgba(255,255,255,0.15)',
                  background: 'rgba(0,0,0,0.3)', color: '#fff', fontSize: 14,
                }}
              />
              <div style={{ display: 'flex', gap: 10 }}>
                <input
                  type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })}
                  required
                  style={{
                    flex: 1, padding: 10, borderRadius: 8, border: '1px solid rgba(255,255,255,0.15)',
                    background: 'rgba(0,0,0,0.3)', color: '#fff', fontSize: 14,
                  }}
                />
                <input
                  type="number" placeholder="Folio #" min="1"
                  value={form.folioNumber} onChange={e => setForm({ ...form, folioNumber: e.target.value })}
                  style={{
                    width: 100, padding: 10, borderRadius: 8, border: '1px solid rgba(255,255,255,0.15)',
                    background: 'rgba(0,0,0,0.3)', color: '#fff', fontSize: 14,
                  }}
                />
              </div>
              <textarea
                placeholder="Contenido del acta o registro..."
                value={form.content} onChange={e => setForm({ ...form, content: e.target.value })}
                required rows={6}
                style={{
                  padding: 10, borderRadius: 8, border: '1px solid rgba(255,255,255,0.15)',
                  background: 'rgba(0,0,0,0.3)', color: '#fff', fontSize: 14, resize: 'vertical',
                }}
              />
              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 8 }}>
                <button
                  type="button" onClick={() => setShowModal(false)}
                  style={{
                    padding: '10px 20px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.15)',
                    background: 'transparent', color: '#94a3b8', cursor: 'pointer', fontSize: 14,
                  }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  style={{
                    padding: '10px 24px', borderRadius: 8, border: 'none', cursor: 'pointer',
                    background: 'linear-gradient(135deg, #3b82f6, #2563eb)', color: '#fff',
                    fontWeight: 600, fontSize: 14,
                  }}
                >
                  Guardar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
