import { useState, useMemo } from 'react';
import { FiPlus, FiTrash2, FiEdit2, FiX, FiCheck, FiDollarSign } from 'react-icons/fi';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useInvoicesStore, INVOICE_STATUS_CONFIG } from '../store/invoices';
import { useTaskStore } from '../store/tasks';
import type { Invoice, InvoiceStatus, InvoiceItem } from '../types';

type EditState = Invoice | 'new' | null;

const fmt = (n: number) => n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

export function FaturasPage() {
  const { invoices, deleteInvoice, permanentDelete, restoreInvoice, markPaid } = useInvoicesStore();
  const { companies, accentColor } = useTaskStore();
  const [editing, setEditing] = useState<EditState>(null);
  const [statusFilter, setStatusFilter] = useState<InvoiceStatus | 'all'>('all');
  const [showTrash, setShowTrash] = useState(false);

  const active = useMemo(() => invoices.filter(i => !i.deletedAt), [invoices]);
  const trashed = useMemo(() => invoices.filter(i => !!i.deletedAt), [invoices]);

  const filtered = useMemo(() => {
    return active.filter(i => statusFilter === 'all' || i.status === statusFilter);
  }, [active, statusFilter]);

  // Totals per status
  const totals = useMemo(() => {
    const t: Record<string, number> = {};
    active.forEach(i => { t[i.status] = (t[i.status] ?? 0) + i.total; });
    return t;
  }, [active]);

  const companyName = (id: string) => companies.find(c => c.id === id)?.name ?? '—';

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: 24, gap: 20, overflowY: 'auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: 'var(--t1)', margin: 0 }}>Faturas</h1>
          <p style={{ fontSize: 12, color: 'var(--t4)', margin: '2px 0 0' }}>Cobranças e notas para clientes</p>
        </div>
        <div style={{ flex: 1 }} />
        <button
          onClick={() => setEditing('new')}
          style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 10, background: accentColor, border: 'none', cursor: 'pointer', color: '#fff', fontSize: 12, fontWeight: 600 }}
        >
          <FiPlus size={13} /> Nova fatura
        </button>
      </div>

      {/* Summary cards */}
      {active.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 10 }}>
          {(['rascunho', 'enviada', 'paga', 'cancelada'] as InvoiceStatus[]).map(s => {
            const cfg = INVOICE_STATUS_CONFIG[s];
            const count = active.filter(i => i.status === s).length;
            if (count === 0) return null;
            return (
              <div key={s} style={{ padding: '12px 14px', borderRadius: 12, background: `${cfg.color}10`, border: `1px solid ${cfg.color}28` }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: cfg.color, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 4 }}>{cfg.label}</div>
                <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--t1)', marginBottom: 2 }}>{count}</div>
                <div style={{ fontSize: 11, color: cfg.color }}>{fmt(totals[s] ?? 0)}</div>
              </div>
            );
          })}
        </div>
      )}

      {/* Filter */}
      <div style={{ display: 'flex', gap: 6, flexShrink: 0, flexWrap: 'wrap' }}>
        {(['all', 'rascunho', 'enviada', 'paga', 'cancelada'] as const).map(f => {
          const cfg = f !== 'all' ? INVOICE_STATUS_CONFIG[f] : null;
          const isActive = statusFilter === f;
          return (
            <button
              key={f}
              onClick={() => setStatusFilter(f)}
              style={{
                padding: '6px 12px', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer',
                border: `1px solid ${isActive ? (cfg?.color ?? accentColor) : 'var(--b2)'}`,
                background: isActive ? `${cfg?.color ?? accentColor}18` : 'transparent',
                color: isActive ? (cfg?.color ?? accentColor) : 'var(--t3)',
              }}
            >
              {f === 'all' ? 'Todas' : INVOICE_STATUS_CONFIG[f].label}
              <span style={{ marginLeft: 5, fontSize: 10, opacity: 0.7 }}>
                {f === 'all' ? active.length : active.filter(i => i.status === f).length}
              </span>
            </button>
          );
        })}
      </div>

      {/* Table / List */}
      {filtered.length === 0 ? (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 12 }}>
          <FiDollarSign size={36} style={{ color: 'var(--t4)', opacity: 0.4 }} />
          <p style={{ fontSize: 13, color: 'var(--t4)', margin: 0 }}>
            {active.length === 0 ? 'Nenhuma fatura. Crie a primeira!' : 'Nenhuma fatura neste filtro.'}
          </p>
        </div>
      ) : (
        <div style={{ background: 'var(--s1)', borderRadius: 14, border: '1px solid var(--b1)', overflow: 'hidden' }}>
          {/* Table header */}
          <div style={{ display: 'grid', gridTemplateColumns: '60px 1fr 140px 110px 110px 110px', gap: 0, padding: '8px 16px', borderBottom: '1px solid var(--b1)', background: 'var(--s2)' }}>
            {['Nº', 'Cliente', 'Data', 'Vencimento', 'Total', 'Status'].map(h => (
              <span key={h} style={{ fontSize: 10, fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase', color: 'var(--t4)' }}>{h}</span>
            ))}
          </div>
          {filtered.map((inv, i) => {
            const cfg = INVOICE_STATUS_CONFIG[inv.status];
            return (
              <div
                key={inv.id}
                style={{ display: 'grid', gridTemplateColumns: '60px 1fr 140px 110px 110px 110px', gap: 0, padding: '10px 16px', borderBottom: i < filtered.length - 1 ? '1px solid var(--b1)' : 'none', alignItems: 'center', transition: 'background .12s', cursor: 'default' }}
                onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'var(--s2)'}
                onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = ''}
              >
                <span style={{ fontSize: 12, color: 'var(--t4)', fontFamily: 'monospace' }}>#{String(inv.number).padStart(4, '0')}</span>
                <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--t1)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{companyName(inv.clientId)}</span>
                <span style={{ fontSize: 12, color: 'var(--t3)' }}>{format(new Date(inv.date + 'T12:00'), "d MMM yyyy", { locale: ptBR })}</span>
                <span style={{ fontSize: 12, color: inv.dueDate && new Date(inv.dueDate) < new Date() && inv.status !== 'paga' ? '#ff453a' : 'var(--t3)' }}>
                  {inv.dueDate ? format(new Date(inv.dueDate + 'T12:00'), "d MMM", { locale: ptBR }) : '—'}
                </span>
                <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--t1)' }}>{fmt(inv.total)}</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontSize: 11, fontWeight: 600, padding: '3px 8px', borderRadius: 6, background: `${cfg.color}18`, color: cfg.color }}>
                    {cfg.label}
                  </span>
                  <div style={{ marginLeft: 'auto', display: 'flex', gap: 2 }}>
                    {inv.status === 'enviada' && (
                      <button onClick={() => markPaid(inv.id)} title="Marcar como paga" style={{ width: 26, height: 26, borderRadius: 6, background: 'none', border: 'none', cursor: 'pointer', color: '#30d158', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><FiCheck size={12} /></button>
                    )}
                    <button onClick={() => setEditing(inv)} title="Editar" style={{ width: 26, height: 26, borderRadius: 6, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--t4)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><FiEdit2 size={11} /></button>
                    <button onClick={() => deleteInvoice(inv.id)} title="Mover para lixeira" style={{ width: 26, height: 26, borderRadius: 6, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--t4)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><FiTrash2 size={11} /></button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Trash */}
      {trashed.length > 0 && (
        <div style={{ marginTop: 8 }}>
          <button onClick={() => setShowTrash(s => !s)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, color: 'var(--t4)', padding: '4px 0', display: 'flex', alignItems: 'center', gap: 6 }}>
            {showTrash ? '▼' : '▶'} Lixeira ({trashed.length})
          </button>
          {showTrash && (
            <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 4 }}>
              {trashed.map(inv => (
                <div key={inv.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 14px', borderRadius: 10, background: 'var(--s1)', border: '1px solid var(--b1)', opacity: 0.6 }}>
                  <span style={{ fontSize: 12, color: 'var(--t4)', fontFamily: 'monospace' }}>#{String(inv.number).padStart(4, '0')}</span>
                  <span style={{ flex: 1, fontSize: 13, color: 'var(--t3)' }}>{companyName(inv.clientId)}</span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--t1)' }}>{fmt(inv.total)}</span>
                  <button onClick={() => restoreInvoice(inv.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 11, color: accentColor, fontWeight: 600 }}>Restaurar</button>
                  <button onClick={() => { if (confirm('Excluir permanentemente?')) permanentDelete(inv.id); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ff453a', display: 'flex', padding: 4 }}><FiTrash2 size={11} /></button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {editing !== null && (
        <InvoiceModal
          key={editing === 'new' ? 'new' : (editing as Invoice).id}
          accentColor={accentColor}
          invoice={editing === 'new' ? null : editing as Invoice}
          companies={companies.filter(c => !c.deletedAt)}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  );
}

function InvoiceModal({
  accentColor, invoice, companies, onClose,
}: {
  accentColor: string;
  invoice: Invoice | null;
  companies: { id: string; name: string; color: string }[];
  onClose: () => void;
}) {
  const { addInvoice, updateInvoice } = useInvoicesStore();
  const uid = () => Math.random().toString(36).slice(2, 10);

  const [clientId, setClientId] = useState(invoice?.clientId ?? companies[0]?.id ?? '');
  const [date, setDate] = useState(invoice?.date ?? format(new Date(), 'yyyy-MM-dd'));
  const [dueDate, setDueDate] = useState(invoice?.dueDate ?? '');
  const [notes, setNotes] = useState(invoice?.notes ?? '');
  const [taxes, setTaxes] = useState(invoice?.taxes ?? 0);
  const [items, setItems] = useState<InvoiceItem[]>(invoice?.items ?? [{ id: uid(), description: '', qty: 1, unitPrice: 0 }]);

  const subtotal = items.reduce((s, i) => s + i.qty * i.unitPrice, 0);
  const total = subtotal + (taxes ?? 0);

  const addItem = () => setItems(prev => [...prev, { id: uid(), description: '', qty: 1, unitPrice: 0 }]);
  const removeItem = (id: string) => setItems(prev => prev.filter(i => i.id !== id));
  const updateItem = (id: string, field: keyof InvoiceItem, value: string | number) =>
    setItems(prev => prev.map(i => i.id === id ? { ...i, [field]: value } : i));

  const save = () => {
    if (!clientId) return;
    const payload = { clientId, date, dueDate: dueDate || undefined, notes: notes.trim() || undefined, taxes: taxes || undefined, items, status: invoice?.status ?? 'rascunho' as const };
    if (invoice) updateInvoice(invoice.id, { ...payload, subtotal, total });
    else addInvoice(payload);
    onClose();
  };

  return (
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.5)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{ background: 'var(--modal-bg)', borderRadius: 16, padding: 24, width: 560, maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 24px 64px rgba(0,0,0,0.4)', display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <span style={{ fontSize: 16, fontWeight: 700, color: 'var(--t1)', flex: 1 }}>{invoice ? `Fatura #${String(invoice.number).padStart(4, '0')}` : 'Nova fatura'}</span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--t4)', display: 'flex', padding: 4 }}><FiX size={16} /></button>
        </div>

        {/* Top fields */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5, gridColumn: '1 / -1' }}>
            <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--t4)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Cliente</label>
            <select value={clientId} onChange={e => setClientId(e.target.value)} style={{ padding: '8px 10px', borderRadius: 8, background: 'var(--s1)', border: '1px solid var(--b2)', color: 'var(--t1)', fontSize: 13, outline: 'none', cursor: 'pointer' }}>
              {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--t4)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Emissão</label>
            <input type="date" value={date} onChange={e => setDate(e.target.value)} style={{ padding: '8px 10px', borderRadius: 8, background: 'var(--s1)', border: '1px solid var(--b2)', color: 'var(--t1)', fontSize: 13, outline: 'none' }} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--t4)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Vencimento</label>
            <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} style={{ padding: '8px 10px', borderRadius: 8, background: 'var(--s1)', border: '1px solid var(--b2)', color: 'var(--t1)', fontSize: 13, outline: 'none' }} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--t4)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Impostos (R$)</label>
            <input type="number" min={0} value={taxes || ''} onChange={e => setTaxes(Number(e.target.value))} placeholder="0" style={{ padding: '8px 10px', borderRadius: 8, background: 'var(--s1)', border: '1px solid var(--b2)', color: 'var(--t1)', fontSize: 13, outline: 'none' }} />
          </div>
        </div>

        {/* Line items */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: 8 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--t4)', textTransform: 'uppercase', letterSpacing: '1px', flex: 1 }}>Itens</span>
            <button onClick={addItem} style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '4px 10px', borderRadius: 7, background: `${accentColor}15`, border: 'none', cursor: 'pointer', color: accentColor, fontSize: 11, fontWeight: 600 }}>
              <FiPlus size={11} /> Adicionar
            </button>
          </div>

          {/* Header row */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 70px 120px 28px', gap: 6, padding: '4px 0', marginBottom: 4 }}>
            {['Descrição', 'Qtd', 'Valor unit.', ''].map(h => (
              <span key={h} style={{ fontSize: 10, fontWeight: 700, color: 'var(--t4)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{h}</span>
            ))}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {items.map(item => (
              <div key={item.id} style={{ display: 'grid', gridTemplateColumns: '1fr 70px 120px 28px', gap: 6, alignItems: 'center' }}>
                <input
                  value={item.description} onChange={e => updateItem(item.id, 'description', e.target.value)}
                  placeholder="Serviço ou produto"
                  style={{ padding: '8px 10px', borderRadius: 8, background: 'var(--s1)', border: '1px solid var(--b2)', color: 'var(--t1)', fontSize: 12, outline: 'none' }}
                />
                <input
                  type="number" min={1} value={item.qty} onChange={e => updateItem(item.id, 'qty', Number(e.target.value))}
                  style={{ padding: '8px 10px', borderRadius: 8, background: 'var(--s1)', border: '1px solid var(--b2)', color: 'var(--t1)', fontSize: 12, outline: 'none', textAlign: 'center' }}
                />
                <input
                  type="number" min={0} value={item.unitPrice || ''} onChange={e => updateItem(item.id, 'unitPrice', Number(e.target.value))}
                  placeholder="0,00"
                  style={{ padding: '8px 10px', borderRadius: 8, background: 'var(--s1)', border: '1px solid var(--b2)', color: 'var(--t1)', fontSize: 12, outline: 'none' }}
                />
                <button onClick={() => removeItem(item.id)} style={{ width: 28, height: 28, borderRadius: 7, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--t4)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <FiTrash2 size={11} />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Totals */}
        <div style={{ background: 'var(--s1)', borderRadius: 10, padding: '10px 14px', display: 'flex', flexDirection: 'column', gap: 5 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--t3)' }}>
            <span>Subtotal</span><span>{fmt(subtotal)}</span>
          </div>
          {(taxes ?? 0) > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--t3)' }}>
              <span>Impostos</span><span>{fmt(taxes ?? 0)}</span>
            </div>
          )}
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 15, fontWeight: 700, color: 'var(--t1)', paddingTop: 6, borderTop: '1px solid var(--b2)' }}>
            <span>Total</span><span>{fmt(total)}</span>
          </div>
        </div>

        {/* Notes */}
        <textarea
          value={notes} onChange={e => setNotes(e.target.value)}
          placeholder="Observações (opcional)"
          rows={2}
          style={{ padding: '9px 12px', borderRadius: 8, background: 'var(--s1)', border: '1px solid var(--b2)', color: 'var(--t1)', fontSize: 12, outline: 'none', resize: 'none', fontFamily: 'inherit' }}
        />

        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={onClose} style={{ flex: 1, padding: '10px', borderRadius: 10, background: 'var(--s1)', border: '1px solid var(--b2)', cursor: 'pointer', color: 'var(--t3)', fontSize: 13 }}>
            Cancelar
          </button>
          <button onClick={save} style={{ flex: 2, padding: '10px', borderRadius: 10, background: accentColor, border: 'none', cursor: 'pointer', color: '#fff', fontSize: 13, fontWeight: 600 }}>
            {invoice ? 'Salvar' : 'Criar fatura'}
          </button>
        </div>
      </div>
    </div>
  );
}
