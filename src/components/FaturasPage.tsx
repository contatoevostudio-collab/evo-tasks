import { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import QRCode from 'qrcode';
import {
  FiPlus, FiTrash2, FiEdit2, FiX, FiCheck, FiDollarSign,
  FiLink, FiPrinter, FiChevronDown, FiArrowLeft, FiCopy,
} from 'react-icons/fi';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useInvoicesStore, INVOICE_STATUS_CONFIG } from '../store/invoices';
import { useTaskStore } from '../store/tasks';
import type { Invoice, InvoiceStatus, InvoiceItem } from '../types';

// ── QR Code component (client-side, no external service) ─────────────────────
function PixQRCode({ pixKey, pixName, total }: { pixKey: string; pixName?: string; total: number }) {
  const [src, setSrc] = useState('');
  const generate = useCallback(async () => {
    if (!pixKey) return;
    try {
      const payload = generatePixPayload(pixKey, pixName ?? '', total);
      const url = await QRCode.toDataURL(payload, {
        width: 140,
        margin: 2,
        errorCorrectionLevel: 'M',
        color: { dark: '#000000', light: '#ffffff' },
      });
      setSrc(url);
    } catch (e) {
      console.error('PIX QR error', e);
    }
  }, [pixKey, pixName, total]);

  useEffect(() => { generate(); }, [generate]);

  if (!src) return <div style={{ width: 140, height: 140, borderRadius: 10, background: '#f0f0f0' }} />;
  return (
    <img src={src} alt="QR Code PIX" width={140} height={140}
      style={{ borderRadius: 10, display: 'block', background: '#fff' }} />
  );
}

type EditState = Invoice | 'new' | null;

const fmt = (n: number) => n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const mkToken = () => Math.random().toString(36).slice(2, 10) + Math.random().toString(36).slice(2, 10);

// ── PIX BR Code (EMV QRCPS-MPM-001) ──────────────────────────────────────────
function crc16ccitt(str: string): string {
  let crc = 0xFFFF;
  for (let i = 0; i < str.length; i++) {
    crc ^= str.charCodeAt(i) << 8;
    for (let j = 0; j < 8; j++) {
      crc = crc & 0x8000 ? (crc << 1) ^ 0x1021 : crc << 1;
      crc &= 0xFFFF;
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, '0');
}

function tlv(id: string, value: string): string {
  return `${id}${String(value.length).padStart(2, '0')}${value}`;
}

// Sanitize to ASCII, strip accents, max length
function asciiTrunc(s: string, max: number): string {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^\x20-\x7E]/g, '').trim().slice(0, max).toUpperCase();
}

function generatePixPayload(key: string, name: string, amount: number): string {
  const mai = tlv('00', 'br.gov.bcb.pix') + tlv('01', key);
  const parts = [
    tlv('00', '01'),
    tlv('01', '11'),                               // static QR (reusável)
    tlv('26', mai),
    tlv('52', '0000'),
    tlv('53', '986'),                              // BRL
    tlv('54', amount.toFixed(2)),
    tlv('58', 'BR'),
    tlv('59', asciiTrunc(name || 'Prestador', 25)),
    tlv('60', 'SAO PAULO'),
    tlv('62', tlv('05', '***')),
  ];
  const base = parts.join('') + '6304';
  return base + crc16ccitt(base);
}

// ── StatusDropdown ────────────────────────────────────────────────────────────
function StatusDropdown({ invoiceId, currentStatus }: { invoiceId: string; currentStatus: InvoiceStatus }) {
  const { setStatus } = useInvoicesStore();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const cfg = INVOICE_STATUS_CONFIG[currentStatus];

  useEffect(() => {
    if (!open) return;
    const onOut = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', onOut);
    return () => document.removeEventListener('mousedown', onOut);
  }, [open]);

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        onClick={e => { e.stopPropagation(); setOpen(p => !p); }}
        title="Alterar status"
        style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 600, padding: '3px 8px', borderRadius: 6, background: `${cfg.color}18`, color: cfg.color, border: `1px solid ${cfg.color}30`, cursor: 'pointer', transition: 'all .12s', whiteSpace: 'nowrap' }}
      >
        {cfg.label} <FiChevronDown size={9} />
      </button>
      {open && (
        <div style={{ position: 'absolute', top: '100%', right: 0, zIndex: 400, marginTop: 4, background: 'var(--modal-bg)', border: '1px solid var(--b2)', borderRadius: 10, padding: 5, boxShadow: '0 8px 24px rgba(0,0,0,0.35)', minWidth: 140 }}>
          {(['rascunho', 'enviada', 'paga', 'cancelada'] as InvoiceStatus[]).map(s => {
            const c = INVOICE_STATUS_CONFIG[s];
            const active = s === currentStatus;
            return (
              <button key={s} onClick={e => { e.stopPropagation(); setStatus(invoiceId, s); setOpen(false); }}
                style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '7px 10px', borderRadius: 7, background: active ? `${c.color}12` : 'transparent', border: 'none', cursor: 'pointer', transition: 'background .1s' }}
                onMouseEnter={e => { if (!active) (e.currentTarget as HTMLElement).style.background = 'var(--s2)'; }}
                onMouseLeave={e => { if (!active) (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
              >
                <div style={{ width: 7, height: 7, borderRadius: '50%', background: c.color, flexShrink: 0 }} />
                <span style={{ fontSize: 12, color: active ? c.color : 'var(--t2)', fontWeight: active ? 700 : 400, flex: 1, textAlign: 'left' }}>{c.label}</span>
                {active && <FiCheck size={10} style={{ color: c.color }} />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export function FaturasPage() {
  const { invoices, deleteInvoice, permanentDelete, restoreInvoice, updateInvoice } = useInvoicesStore();
  const { companies, accentColor } = useTaskStore();
  const [editing, setEditing] = useState<EditState>(null);
  const [statusFilter, setStatusFilter] = useState<InvoiceStatus | 'all'>('all');
  const [showTrash, setShowTrash] = useState(false);
  const [viewingId, setViewingId] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  const active = useMemo(() => invoices.filter(i => !i.deletedAt), [invoices]);
  const trashed = useMemo(() => invoices.filter(i => !!i.deletedAt), [invoices]);
  const filtered = useMemo(() => active.filter(i => statusFilter === 'all' || i.status === statusFilter), [active, statusFilter]);

  const totals = useMemo(() => {
    const t: Record<string, number> = {};
    active.forEach(i => { t[i.status] = (t[i.status] ?? 0) + i.total; });
    return t;
  }, [active]);

  const companyName = (id: string) => companies.find(c => c.id === id)?.name ?? '—';

  const ensureToken = (inv: Invoice): string => {
    if (inv.shareToken) return inv.shareToken;
    const t = mkToken();
    updateInvoice(inv.id, { shareToken: t });
    return t;
  };

  const copyLink = (inv: Invoice) => {
    const t = ensureToken(inv);
    const url = `${window.location.origin}${window.location.pathname}#fatura=${t}`;
    navigator.clipboard.writeText(url);
    setCopied(inv.id);
    setTimeout(() => setCopied(null), 1600);
  };

  const openView = (inv: Invoice) => {
    ensureToken(inv);
    setViewingId(inv.id);
  };

  // In-app overlay: show invoice as public view
  if (viewingId) {
    const inv = invoices.find(i => i.id === viewingId);
    if (inv) {
      const co = companies.find(c => c.id === inv.clientId);
      return (
        <PublicInvoiceView
          invoice={inv}
          clientName={co?.name ?? '—'}
          accentColor={accentColor}
          onBack={() => setViewingId(null)}
          onCopyLink={() => copyLink(inv)}
          copied={copied === inv.id}
        />
      );
    }
  }

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
            <button key={f} onClick={() => setStatusFilter(f)}
              style={{ padding: '6px 12px', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer', border: `1px solid ${isActive ? (cfg?.color ?? accentColor) : 'var(--b2)'}`, background: isActive ? `${cfg?.color ?? accentColor}18` : 'transparent', color: isActive ? (cfg?.color ?? accentColor) : 'var(--t3)' }}
            >
              {f === 'all' ? 'Todas' : INVOICE_STATUS_CONFIG[f].label}
              <span style={{ marginLeft: 5, fontSize: 10, opacity: 0.7 }}>
                {f === 'all' ? active.length : active.filter(i => i.status === f).length}
              </span>
            </button>
          );
        })}
      </div>

      {/* Table */}
      {filtered.length === 0 ? (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 14 }}>
          <div style={{ width: 60, height: 60, borderRadius: 18, background: 'var(--s1)', border: '1px solid var(--b1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <FiDollarSign size={24} style={{ color: 'var(--t4)', opacity: 0.5 }} />
          </div>
          <div style={{ textAlign: 'center' }}>
            <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--t2)', margin: '0 0 4px' }}>
              {active.length === 0 ? 'Nenhuma fatura ainda' : 'Nenhuma fatura neste filtro'}
            </p>
            <p style={{ fontSize: 12, color: 'var(--t4)', margin: 0 }}>
              {active.length === 0 ? 'Crie uma fatura e envie o link para seu cliente' : 'Mude o filtro acima'}
            </p>
          </div>
          {active.length === 0 && (
            <button onClick={() => setEditing('new')}
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 18px', borderRadius: 10, background: accentColor, border: 'none', cursor: 'pointer', color: '#fff', fontSize: 13, fontWeight: 600 }}
            >
              <FiPlus size={14} /> Criar primeira fatura
            </button>
          )}
        </div>
      ) : (
        <div style={{ background: 'var(--s1)', borderRadius: 14, border: '1px solid var(--b1)', overflow: 'hidden' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '60px 1fr 130px 110px 110px 160px 110px', gap: 0, padding: '8px 16px', borderBottom: '1px solid var(--b1)', background: 'var(--s2)' }}>
            {['Nº', 'Cliente', 'Data', 'Vencimento', 'Total', 'Status', ''].map(h => (
              <span key={h} style={{ fontSize: 10, fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase', color: 'var(--t4)' }}>{h}</span>
            ))}
          </div>
          {filtered.map((inv, i) => (
            <div key={inv.id}
              style={{ display: 'grid', gridTemplateColumns: '60px 1fr 130px 110px 110px 160px 110px', gap: 0, padding: '10px 16px', borderBottom: i < filtered.length - 1 ? '1px solid var(--b1)' : 'none', alignItems: 'center', transition: 'background .12s' }}
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
              {/* Clickable status dropdown */}
              <StatusDropdown invoiceId={inv.id} currentStatus={inv.status} />
              {/* Row actions */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 2, justifyContent: 'flex-end' }}>
                <button onClick={() => openView(inv)} title="Ver / imprimir fatura"
                  style={{ width: 28, height: 28, borderRadius: 6, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--t4)', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all .12s' }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = accentColor; (e.currentTarget as HTMLElement).style.background = `${accentColor}12`; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'var(--t4)'; (e.currentTarget as HTMLElement).style.background = 'none'; }}
                ><FiPrinter size={12} /></button>
                <button onClick={() => copyLink(inv)} title="Copiar link público"
                  style={{ width: 28, height: 28, borderRadius: 6, background: copied === inv.id ? `${accentColor}12` : 'none', border: 'none', cursor: 'pointer', color: copied === inv.id ? accentColor : 'var(--t4)', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all .12s' }}
                  onMouseEnter={e => { if (copied !== inv.id) { (e.currentTarget as HTMLElement).style.color = accentColor; } }}
                  onMouseLeave={e => { if (copied !== inv.id) { (e.currentTarget as HTMLElement).style.color = 'var(--t4)'; } }}
                >{copied === inv.id ? <FiCheck size={12} /> : <FiLink size={12} />}</button>
                <button onClick={() => setEditing(inv)} title="Editar"
                  style={{ width: 28, height: 28, borderRadius: 6, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--t4)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = 'var(--t1)'; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'var(--t4)'; }}
                ><FiEdit2 size={11} /></button>
                <button onClick={() => deleteInvoice(inv.id)} title="Mover para lixeira"
                  style={{ width: 28, height: 28, borderRadius: 6, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--t4)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = '#ff453a'; (e.currentTarget as HTMLElement).style.background = 'rgba(255,69,58,0.1)'; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'var(--t4)'; (e.currentTarget as HTMLElement).style.background = 'none'; }}
                ><FiTrash2 size={11} /></button>
              </div>
            </div>
          ))}
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

// ── InvoiceModal ──────────────────────────────────────────────────────────────
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
  const [pixKey, setPixKey] = useState(invoice?.pixKey ?? '');
  const [pixName, setPixName] = useState(invoice?.pixName ?? '');
  const [items, setItems] = useState<InvoiceItem[]>(invoice?.items ?? [{ id: uid(), description: '', qty: 1, unitPrice: 0 }]);

  const subtotal = items.reduce((s, i) => s + i.qty * i.unitPrice, 0);
  const total = subtotal + (taxes ?? 0);

  const addItem = () => setItems(prev => [...prev, { id: uid(), description: '', qty: 1, unitPrice: 0 }]);
  const removeItem = (id: string) => setItems(prev => prev.filter(i => i.id !== id));
  const updateItem = (id: string, field: keyof InvoiceItem, value: string | number) =>
    setItems(prev => prev.map(i => i.id === id ? { ...i, [field]: value } : i));

  const save = () => {
    if (!clientId) return;
    const payload = {
      clientId, date, dueDate: dueDate || undefined, notes: notes.trim() || undefined,
      taxes: taxes || undefined, items, status: invoice?.status ?? 'rascunho' as const,
      pixKey: pixKey.trim() || undefined,
      pixName: pixName.trim() || undefined,
    };
    if (invoice) updateInvoice(invoice.id, { ...payload, subtotal, total });
    else addInvoice(payload);
    onClose();
  };

  const label: React.CSSProperties = { fontSize: 11, fontWeight: 600, color: 'var(--t4)', textTransform: 'uppercase', letterSpacing: '0.5px' };
  const field: React.CSSProperties = { padding: '8px 10px', borderRadius: 8, background: 'var(--s1)', border: '1px solid var(--b2)', color: 'var(--t1)', fontSize: 13, outline: 'none' };

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.5)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{ background: 'var(--modal-bg)', borderRadius: 16, padding: 24, width: 580, maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 24px 64px rgba(0,0,0,0.4)', display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <span style={{ fontSize: 16, fontWeight: 700, color: 'var(--t1)', flex: 1 }}>
            {invoice ? `Fatura #${String(invoice.number).padStart(4, '0')}` : 'Nova fatura'}
          </span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--t4)', display: 'flex', padding: 4 }}><FiX size={16} /></button>
        </div>

        {/* Top fields */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5, gridColumn: '1 / -1' }}>
            <label style={label}>Cliente</label>
            <select value={clientId} onChange={e => setClientId(e.target.value)} style={{ ...field, cursor: 'pointer' }}>
              {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            <label style={label}>Emissão</label>
            <input type="date" value={date} onChange={e => setDate(e.target.value)} style={field} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            <label style={label}>Vencimento</label>
            <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} style={field} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            <label style={label}>Impostos (R$)</label>
            <input type="number" min={0} value={taxes || ''} onChange={e => setTaxes(Number(e.target.value))} placeholder="0" style={field} />
          </div>
        </div>

        {/* Line items */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: 8 }}>
            <span style={{ ...label, flex: 1 }}>Itens</span>
            <button onClick={addItem} style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '4px 10px', borderRadius: 7, background: `${accentColor}15`, border: 'none', cursor: 'pointer', color: accentColor, fontSize: 11, fontWeight: 600 }}>
              <FiPlus size={11} /> Adicionar
            </button>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 70px 120px 28px', gap: 6, padding: '4px 0', marginBottom: 4 }}>
            {['Descrição', 'Qtd', 'Valor unit.', ''].map(h => (
              <span key={h} style={{ ...label }}>{h}</span>
            ))}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {items.map(item => (
              <div key={item.id} style={{ display: 'grid', gridTemplateColumns: '1fr 70px 120px 28px', gap: 6, alignItems: 'center' }}>
                <input value={item.description} onChange={e => updateItem(item.id, 'description', e.target.value)} placeholder="Serviço ou produto" style={{ ...field, fontSize: 12 }} />
                <input type="number" min={1} value={item.qty} onChange={e => updateItem(item.id, 'qty', Number(e.target.value))} style={{ ...field, fontSize: 12, textAlign: 'center' }} />
                <input type="number" min={0} value={item.unitPrice || ''} onChange={e => updateItem(item.id, 'unitPrice', Number(e.target.value))} placeholder="0,00" style={{ ...field, fontSize: 12 }} />
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

        {/* PIX */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
              <label style={label}>Chave PIX (opcional)</label>
              <input
                value={pixKey} onChange={e => setPixKey(e.target.value)}
                placeholder="CPF, CNPJ, e-mail, telefone…"
                style={{ ...field, fontSize: 12 }}
              />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
              <label style={label}>Nome do recebedor (app do banco)</label>
              <input
                value={pixName} onChange={e => setPixName(e.target.value)}
                placeholder="Seu nome ou empresa"
                style={{ ...field, fontSize: 12 }}
              />
            </div>
          </div>
          <p style={{ fontSize: 11, color: 'var(--t4)', margin: 0 }}>
            O QR Code gerado é lido por qualquer app bancário (Nubank, BB, Caixa…).
          </p>
        </div>

        {/* Notes */}
        <textarea
          value={notes} onChange={e => setNotes(e.target.value)}
          placeholder="Observações (opcional)"
          rows={2}
          style={{ ...field, resize: 'none', fontFamily: 'inherit', fontSize: 12 }}
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

// ── PublicInvoiceView ─────────────────────────────────────────────────────────
// Used both as in-app overlay (invoice prop) and via #fatura=TOKEN hash (token prop)
export function PublicInvoiceView({
  token,
  invoice: propInvoice,
  clientName: propClientName,
  accentColor: propAccent,
  onBack,
  onCopyLink,
  copied,
}: {
  token?: string;
  invoice?: Invoice;
  clientName?: string;
  accentColor?: string;
  onBack: () => void;
  onCopyLink?: () => void;
  copied?: boolean;
}) {
  const { invoices, updateInvoice } = useInvoicesStore();
  const { companies, accentColor: storeAccent } = useTaskStore();
  const [pixCopied, setPixCopied] = useState(false);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'auto';
    return () => { document.body.style.overflow = prev; };
  }, []);

  // Resolve invoice from token or prop
  const inv = propInvoice ?? (token ? invoices.find(i => i.shareToken === token && !i.deletedAt) : null);
  const accent = propAccent ?? storeAccent;
  const company = inv ? companies.find(c => c.id === inv.clientId) : null;
  const clientName = propClientName ?? company?.name ?? '—';

  // Track viewed
  useEffect(() => {
    if (inv && token && inv.status === 'enviada') {
      // mark as viewed by updating nothing meaningful (just sync)
      updateInvoice(inv.id, {});
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inv?.id]);

  if (!inv) return (
    <div style={{ minHeight: '100vh', background: 'var(--bg, #0a0e1a)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 14, padding: 24, color: 'var(--t1)' }}>
      <div style={{ fontSize: 40 }}>🔍</div>
      <div style={{ fontSize: 18, fontWeight: 700 }}>Fatura não encontrada</div>
      <div style={{ fontSize: 13, color: 'var(--t4)' }}>Este link pode ter expirado ou a fatura foi removida.</div>
    </div>
  );

  const cfg = INVOICE_STATUS_CONFIG[inv.status];
  const copyPix = () => {
    if (!inv.pixKey) return;
    navigator.clipboard.writeText(inv.pixKey);
    setPixCopied(true);
    setTimeout(() => setPixCopied(false), 1600);
  };

  const handlePrint = () => window.print();

  const ensureToken = () => {
    if (!inv.shareToken) {
      const t = mkToken();
      updateInvoice(inv.id, { shareToken: t });
    }
  };

  const handleCopyLink = () => {
    ensureToken();
    if (onCopyLink) { onCopyLink(); return; }
    const t = inv.shareToken ?? '';
    const url = `${window.location.origin}${window.location.pathname}#fatura=${t}`;
    navigator.clipboard.writeText(url);
  };

  return (
    <div style={{ flex: 1, overflowY: 'auto', background: 'var(--bg, #0a0e1a)' }}>
      <style>{`
        @media print {
          .invoice-no-print { display: none !important; }
          body { background: white !important; color: black !important; overflow: auto !important; }
          .invoice-doc { background: white !important; border: none !important; box-shadow: none !important; margin: 0 !important; max-width: 100% !important; border-radius: 0 !important; }
          .invoice-doc * { color: black !important; border-color: #ddd !important; }
          .invoice-total-row { border-top-color: #ccc !important; }
        }
      `}</style>

      <div style={{ maxWidth: 720, margin: '0 auto', padding: '32px 24px 80px' }}>

        {/* Toolbar (in-app / no-print) */}
        <div className="invoice-no-print" style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 24 }}>
          <button onClick={onBack}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 12px', borderRadius: 9, background: 'transparent', border: '1px solid var(--b2)', color: 'var(--t3)', fontSize: 12, cursor: 'pointer' }}
          >
            <FiArrowLeft size={12} /> Voltar
          </button>
          <div style={{ flex: 1 }} />
          <button onClick={handleCopyLink}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 12px', borderRadius: 9, background: copied ? `${accent}15` : 'transparent', border: `1px solid ${copied ? accent : 'var(--b2)'}`, color: copied ? accent : 'var(--t3)', fontSize: 12, cursor: 'pointer', transition: 'all .15s' }}
          >
            {copied ? <FiCheck size={12} /> : <FiLink size={12} />}
            {copied ? 'Copiado!' : 'Copiar link'}
          </button>
          <button onClick={handlePrint}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 9, background: accent, border: 'none', color: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
          >
            <FiPrinter size={12} /> Imprimir / PDF
          </button>
        </div>

        {/* Invoice document */}
        <div className="invoice-doc" style={{ background: 'var(--s1)', borderRadius: 18, border: '1px solid var(--b1)', padding: '40px 44px', boxShadow: '0 8px 40px rgba(0,0,0,0.28)' }}>

          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 36 }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                <div style={{ width: 32, height: 32, borderRadius: 8, background: `linear-gradient(135deg, ${accent}, ${accent}bb)`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <FiDollarSign size={16} color="#fff" />
                </div>
                <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--t3)', textTransform: 'uppercase', letterSpacing: '1.5px' }}>Nota de Serviço</span>
              </div>
              <div style={{ fontSize: 28, fontWeight: 700, color: 'var(--t1)', letterSpacing: '-0.5px' }}>
                #{String(inv.number).padStart(4, '0')}
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <span style={{ fontSize: 12, fontWeight: 700, padding: '5px 12px', borderRadius: 8, background: `${cfg.color}18`, color: cfg.color, border: `1px solid ${cfg.color}30` }}>
                {cfg.label}
              </span>
              {inv.paidAt && (
                <div style={{ fontSize: 11, color: '#30d158', marginTop: 6 }}>
                  Pago em {format(new Date(inv.paidAt), "d 'de' MMM yyyy", { locale: ptBR })}
                </div>
              )}
            </div>
          </div>

          {/* Client + dates */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginBottom: 32 }}>
            <div>
              <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--t4)', marginBottom: 8 }}>Para</div>
              <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--t1)', marginBottom: 2 }}>{clientName}</div>
              {company?.color && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: company.color }} />
                  <span style={{ fontSize: 12, color: 'var(--t4)' }}>Cliente</span>
                </div>
              )}
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div>
                  <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--t4)', marginBottom: 3 }}>Emissão</div>
                  <div style={{ fontSize: 14, color: 'var(--t2)' }}>{format(new Date(inv.date + 'T12:00'), "d 'de' MMMM yyyy", { locale: ptBR })}</div>
                </div>
                {inv.dueDate && (
                  <div>
                    <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--t4)', marginBottom: 3 }}>Vencimento</div>
                    <div style={{ fontSize: 14, color: new Date(inv.dueDate) < new Date() && inv.status !== 'paga' ? '#ff453a' : 'var(--t2)' }}>
                      {format(new Date(inv.dueDate + 'T12:00'), "d 'de' MMMM yyyy", { locale: ptBR })}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Divider */}
          <div style={{ height: 1, background: 'var(--b1)', marginBottom: 24 }} />

          {/* Line items */}
          <div style={{ marginBottom: 24 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 60px 120px 120px', gap: 0, marginBottom: 10 }}>
              {['Serviço / Produto', 'Qtd', 'Valor unit.', 'Total'].map((h, i) => (
                <span key={h} style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--t4)', textAlign: i > 1 ? 'right' : 'left' }}>{h}</span>
              ))}
            </div>
            {inv.items.map((item, idx) => (
              <div key={item.id} style={{ display: 'grid', gridTemplateColumns: '1fr 60px 120px 120px', gap: 0, padding: '11px 0', borderTop: idx > 0 ? '1px solid var(--b1)' : 'none', alignItems: 'center' }}>
                <span style={{ fontSize: 14, color: 'var(--t1)', fontWeight: 500 }}>{item.description || '—'}</span>
                <span style={{ fontSize: 13, color: 'var(--t3)', textAlign: 'center' }}>{item.qty}</span>
                <span style={{ fontSize: 13, color: 'var(--t3)', textAlign: 'right' }}>{fmt(item.unitPrice)}</span>
                <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--t1)', textAlign: 'right' }}>{fmt(item.qty * item.unitPrice)}</span>
              </div>
            ))}
          </div>

          {/* Totals */}
          <div style={{ background: 'var(--s2)', borderRadius: 12, padding: '16px 20px', marginBottom: 28 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: 'var(--t3)', marginBottom: 8 }}>
              <span>Subtotal</span><span>{fmt(inv.subtotal)}</span>
            </div>
            {(inv.taxes ?? 0) > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: 'var(--t3)', marginBottom: 8 }}>
                <span>Impostos</span><span>{fmt(inv.taxes ?? 0)}</span>
              </div>
            )}
            <div className="invoice-total-row" style={{ display: 'flex', justifyContent: 'space-between', fontSize: 20, fontWeight: 700, color: 'var(--t1)', paddingTop: 10, borderTop: '1px solid var(--b2)', marginTop: 4 }}>
              <span>Total</span><span style={{ color: accent }}>{fmt(inv.total)}</span>
            </div>
          </div>

          {/* PIX Payment */}
          {inv.pixKey && (
            <>
              <div style={{ height: 1, background: 'var(--b1)', marginBottom: 24 }} />
              <div style={{ display: 'flex', gap: 24, alignItems: 'flex-start', marginBottom: 28 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--t4)', marginBottom: 12 }}>Pagamento via PIX</div>
                  <div style={{ fontSize: 13, color: 'var(--t3)', marginBottom: 8 }}>Chave PIX:</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', borderRadius: 10, background: 'var(--s1)', border: `1px solid ${accent}25` }}>
                    <span style={{ flex: 1, fontSize: 14, color: 'var(--t1)', fontWeight: 600, wordBreak: 'break-all' }}>{inv.pixKey}</span>
                    <button onClick={copyPix} className="invoice-no-print"
                      style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 10px', borderRadius: 7, background: pixCopied ? `${accent}15` : 'var(--s2)', border: `1px solid ${pixCopied ? accent : 'var(--b2)'}`, color: pixCopied ? accent : 'var(--t4)', fontSize: 11, cursor: 'pointer', transition: 'all .15s', flexShrink: 0 }}
                    >
                      {pixCopied ? <FiCheck size={10} /> : <FiCopy size={10} />}
                      {pixCopied ? 'Copiado!' : 'Copiar'}
                    </button>
                  </div>
                  <p style={{ fontSize: 12, color: 'var(--t4)', marginTop: 8 }}>
                    Transfira exatamente <strong style={{ color: accent }}>{fmt(inv.total)}</strong> para esta chave PIX.
                  </p>
                </div>
                {/* QR Code PIX (EMV BR Code — gerado client-side) */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, flexShrink: 0 }}>
                  <PixQRCode pixKey={inv.pixKey} pixName={inv.pixName} total={inv.total} />
                  <span style={{ fontSize: 10, color: 'var(--t4)' }}>Escaneie para pagar</span>
                </div>
              </div>
            </>
          )}

          {/* Notes */}
          {inv.notes && (
            <>
              <div style={{ height: 1, background: 'var(--b1)', marginBottom: 24 }} />
              <div style={{ marginBottom: 24 }}>
                <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--t4)', marginBottom: 10 }}>Observações</div>
                <p style={{ fontSize: 13, color: 'var(--t3)', lineHeight: 1.6, margin: 0 }}>{inv.notes}</p>
              </div>
            </>
          )}

          {/* Footer */}
          <div style={{ height: 1, background: 'var(--b1)', marginTop: 8, marginBottom: 16 }} />
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 10, color: 'var(--t4)', opacity: 0.6 }}>Powered by EvoStudio</span>
            <span style={{ fontSize: 10, color: 'var(--t4)', opacity: 0.5 }}>#{String(inv.number).padStart(4, '0')} · {format(new Date(inv.createdAt), "d MMM yyyy", { locale: ptBR })}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
