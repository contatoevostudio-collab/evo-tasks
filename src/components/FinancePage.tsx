import { useState, useMemo } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  FiPlus, FiChevronLeft, FiChevronRight, FiEye, FiEyeOff, FiTrash2, FiEdit2,
  FiTrendingUp, FiTrendingDown, FiShield, FiMap, FiHome, FiTruck, FiAward,
  FiTarget, FiHeart, FiWifi, FiPhone, FiZap, FiDroplet, FiMusic, FiActivity,
  FiCode, FiRefreshCw, FiSearch, FiCalendar, FiMoreHorizontal,
  FiCreditCard, FiArrowRight, FiCheck,
} from 'react-icons/fi';
import { format, addMonths, subMonths, startOfMonth, endOfMonth, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useFinanceStore } from '../store/finance';
import { useTaskStore } from '../store/tasks';
import { useCardsStore } from '../store/cards';
import { TransactionModal } from './finance/TransactionModal';
import { GoalModal } from './finance/GoalModal';
import { RecurringModal } from './finance/RecurringModal';
import { CardModal } from './finance/CardModal';
import { fmtBRL, fmtShort } from '../lib/format';
import type { Transaction, FinancialGoal, RecurringBill, Card, GoalIcon, RecurringIcon } from '../types';

type DisplayTransaction = Transaction & { isRecurring?: boolean; recurringBillId?: string };

// ─── Helpers ─────────────────────────────────────────────────────────────────

const hexToRgb = (hex: string): string => {
  const clean = hex.replace('#', '');
  const v = clean.length === 3 ? clean.split('').map(c => c + c).join('') : clean;
  const r = parseInt(v.slice(0, 2), 16) || 0;
  const g = parseInt(v.slice(2, 4), 16) || 0;
  const b = parseInt(v.slice(4, 6), 16) || 0;
  return `${r},${g},${b}`;
};

const GOAL_ICON_MAP: Record<GoalIcon, React.ElementType> = {
  reserva: FiShield, viagem: FiMap, casa: FiHome, carro: FiTruck,
  investir: FiTrendingUp, premio: FiAward, meta: FiTarget, saude: FiHeart,
};

const RECURRING_ICON_MAP: Record<RecurringIcon, React.ElementType> = {
  aluguel: FiHome, internet: FiWifi, celular: FiPhone, luz: FiZap, agua: FiDroplet,
  streaming: FiMusic, academia: FiActivity, software: FiCode, outra: FiRefreshCw,
};

const STATUS_COLOR: Record<string, string> = {
  pago: '#30d158', pendente: '#ff9f0a', cancelado: '#636366',
};
const STATUS_LABEL: Record<string, string> = {
  pago: 'Pago', pendente: 'Pendente', cancelado: 'Cancelado',
};

const CAT_COLORS = ['#30d158', '#ff9f0a', '#ff453a', '#64d2ff', '#bf5af2', '#ffd60a', '#ff375f', '#5e5ce6'];

// ─── Revenue Flow (bar chart) ────────────────────────────────────────────────

function RevenueBarChart({
  transactions, recurringBills, accentColor,
}: { transactions: Transaction[]; recurringBills: RecurringBill[]; accentColor: string }) {
  const now = new Date();
  const months = useMemo(
    () => Array.from({ length: 5 }, (_, i) => {
      const d = subMonths(now, 4 - i);
      return { key: format(d, 'yyyy-MM'), label: format(d, 'MMM', { locale: ptBR }).replace('.', '').toUpperCase() };
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  const data = useMemo(() =>
    months.map(({ key, label }) => {
      const mt = transactions.filter(t => t.date.startsWith(key) && t.status !== 'cancelado');
      const recurring = recurringBills.filter(b => b.paidMonths.includes(key)).reduce((s, b) => s + b.amount, 0);
      const income = mt.filter(t => t.type === 'receita').reduce((s, t) => s + t.amount, 0);
      const expense = mt.filter(t => t.type === 'despesa').reduce((s, t) => s + t.amount, 0) + recurring;
      return { key, label, net: income - expense };
    }),
  [months, transactions, recurringBills]);

  const maxAbs = Math.max(...data.map(d => Math.abs(d.net)), 100);
  const currentIdx = data.length - 1;
  const selected = data[currentIdx];

  return (
    <div>
      <div style={{ position: 'relative', height: 160, display: 'flex', alignItems: 'flex-end', gap: 14, padding: '10px 4px 0' }}>
        {data.map((d, i) => {
          const hpct = Math.max(6, (Math.abs(d.net) / maxAbs) * 100);
          const active = i === currentIdx;
          const barGrad = active
            ? `linear-gradient(180deg, ${accentColor} 0%, ${accentColor}66 100%)`
            : 'linear-gradient(180deg, rgba(255,255,255,0.18) 0%, rgba(255,255,255,0.05) 100%)';
          return (
            <div key={d.key} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, position: 'relative' }}>
              {active && (
                <div style={{
                  position: 'absolute', bottom: `calc(${hpct}% + 14px)`,
                  left: '50%', transform: 'translateX(-50%)',
                  background: 'var(--s1)', border: '1px solid var(--b2)', borderRadius: 10, padding: '6px 10px',
                  boxShadow: `0 8px 24px -6px rgba(${hexToRgb(accentColor)}, 0.35)`,
                  whiteSpace: 'nowrap', zIndex: 2,
                  // Se a barra ativa for a última (caso comum), empurra tooltip pra esquerda
                  // pra não vazar do card.
                  ...(i === data.length - 1 ? { left: 'auto', right: 0, transform: 'none' } : {}),
                  ...(i === 0 ? { left: 0, transform: 'none' } : {}),
                }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--t1)' }}>{fmtShort(selected.net)}</div>
                  <div style={{ fontSize: 9, color: '#30d158', fontWeight: 600 }}>+16%</div>
                </div>
              )}
              <div style={{
                width: '100%', maxWidth: 40, height: `${hpct}%`, borderRadius: 10,
                background: barGrad,
                boxShadow: active ? `0 0 24px -2px ${accentColor}88, 0 0 60px -20px ${accentColor}99` : 'none',
                transition: 'all .3s',
              }} />
              <div style={{ fontSize: 10, fontWeight: 700, color: active ? 'var(--t1)' : 'var(--t4)', letterSpacing: '1px' }}>
                {d.net >= 0 ? '+' : '−'}{fmtShort(Math.abs(d.net)).replace('R$ ', '').replace('.', ',')}
              </div>
              <div style={{ fontSize: 9, color: 'var(--t4)', letterSpacing: '1.5px' }}>{d.label}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Expense Split (donut) ───────────────────────────────────────────────────

function DonutChart({ segments, total }: { segments: { label: string; value: number; color: string }[]; total: number }) {
  const R = 54, STROKE = 14;
  const C = 2 * Math.PI * R;
  let offset = 0;
  const sum = segments.reduce((s, x) => s + x.value, 0) || 1;

  return (
    <svg width={140} height={140} viewBox="0 0 140 140" style={{ transform: 'rotate(-90deg)' }}>
      <circle cx={70} cy={70} r={R} stroke="var(--s2)" strokeWidth={STROKE} fill="none" />
      {segments.map((s, i) => {
        const len = (s.value / sum) * C;
        const el = (
          <circle
            key={i}
            cx={70} cy={70} r={R}
            stroke={s.color} strokeWidth={STROKE} fill="none"
            strokeLinecap="round"
            strokeDasharray={`${len} ${C - len}`}
            strokeDashoffset={-offset}
            style={{ filter: `drop-shadow(0 0 4px ${s.color}cc)` }}
          />
        );
        offset += len;
        return el;
      })}
      <g transform="rotate(90 70 70)">
        <text x={70} y={66} textAnchor="middle" fontSize="9" fill="rgba(255,255,255,0.4)" fontWeight="600" letterSpacing="1.5">TOTAL</text>
        <text x={70} y={84} textAnchor="middle" fontSize="18" fill="#fff" fontWeight="700">
          {total >= 1000 ? `${(total / 1000).toFixed(1)}k` : total.toFixed(0)}$
        </text>
      </g>
    </svg>
  );
}

// ─── Year balance mini-calendar ──────────────────────────────────────────────

function YearBalanceCalendar({
  year, transactions, recurringBills, selectedMonth, accentColor, onSelect, onChangeYear,
}: {
  year: number;
  transactions: Transaction[];
  recurringBills: RecurringBill[];
  selectedMonth: Date;
  accentColor: string;
  onSelect: (d: Date) => void;
  onChangeYear: (y: number) => void;
}) {
  const today = new Date();
  const selectedKey = format(selectedMonth, 'yyyy-MM');

  const monthsData = useMemo(() => {
    return Array.from({ length: 12 }, (_, i) => {
      const d = new Date(year, i, 1);
      const key = format(d, 'yyyy-MM');
      const mt = transactions.filter(t => t.date.startsWith(key) && t.status !== 'cancelado');
      const income = mt.filter(t => t.type === 'receita').reduce((s, t) => s + t.amount, 0);
      const expenseTx = mt.filter(t => t.type === 'despesa').reduce((s, t) => s + t.amount, 0);
      const recurringPaid = recurringBills.filter(b => b.paidMonths.includes(key)).reduce((s, b) => s + b.amount, 0);
      const expense = expenseTx + recurringPaid;
      return {
        date: d, key,
        label: format(d, 'MMM', { locale: ptBR }).replace('.', ''),
        balance: income - expense,
        hasData: mt.length > 0 || recurringPaid > 0,
      };
    });
  }, [year, transactions, recurringBills]);

  const yearBalance = monthsData.reduce((s, m) => s + m.balance, 0);

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
            <FiCalendar size={14} style={{ color: accentColor }} />
            <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--t1)' }}>Controle Mensal</span>
          </div>
          <div style={{ fontSize: 10, color: 'var(--t4)' }}>
            Saldo por mês — ano {year} · total {yearBalance >= 0 ? '+' : '−'}
            {Math.abs(yearBalance) >= 1000 ? `R$ ${(Math.abs(yearBalance)/1000).toLocaleString('pt-BR',{maximumFractionDigits:1})}k` : `R$ ${Math.abs(yearBalance).toLocaleString('pt-BR',{maximumFractionDigits:0})}`}
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'var(--s2)', borderRadius: 10, border: '1px solid var(--b2)', padding: '4px 6px' }}>
          <button onClick={() => onChangeYear(year - 1)}
            style={{ width: 24, height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--t3)', borderRadius: 5 }}>
            <FiChevronLeft size={13} />
          </button>
          <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--t1)', minWidth: 40, textAlign: 'center' }}>{year}</span>
          <button onClick={() => onChangeYear(year + 1)}
            style={{ width: 24, height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--t3)', borderRadius: 5 }}>
            <FiChevronRight size={13} />
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 8 }}>
        {monthsData.map((m) => {
          const isSelected = m.key === selectedKey;
          const isCurrent = format(today, 'yyyy-MM') === m.key;
          const positive = m.balance >= 0;
          const color = !m.hasData ? 'var(--t4)' : positive ? '#30d158' : '#ff453a';
          return (
            <button key={m.key} onClick={() => onSelect(m.date)}
              style={{
                display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 4,
                padding: '10px 10px', borderRadius: 10,
                background: isSelected ? `${accentColor}18` : 'var(--s2)',
                border: isSelected ? `1px solid ${accentColor}` : isCurrent ? '1px solid var(--b3)' : '1px solid transparent',
                cursor: 'pointer', textAlign: 'left', transition: 'all .12s',
              }}
              onMouseEnter={e => { if (!isSelected) (e.currentTarget as HTMLElement).style.background = 'var(--s1)'; }}
              onMouseLeave={e => { if (!isSelected) (e.currentTarget as HTMLElement).style.background = 'var(--s2)'; }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                <span style={{ fontSize: 10, fontWeight: 700, color: isSelected ? accentColor : 'var(--t3)', textTransform: 'uppercase', letterSpacing: '1px' }}>
                  {m.label}
                </span>
                {isCurrent && <span style={{ width: 5, height: 5, borderRadius: '50%', background: accentColor }} />}
              </div>
              <div style={{ fontSize: 12, fontWeight: 700, color, lineHeight: 1.1 }}>
                {!m.hasData ? '—' : `${positive ? '+' : '−'} ${Math.abs(m.balance) >= 1000 ? `${(Math.abs(m.balance)/1000).toLocaleString('pt-BR',{maximumFractionDigits:1})}k` : Math.abs(m.balance).toLocaleString('pt-BR',{maximumFractionDigits:0})}`}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── My Cards stack ──────────────────────────────────────────────────────────

const BRAND_LABELS: Record<string, string> = {
  visa: 'VISA', mastercard: 'Mastercard', amex: 'AMEX', elo: 'ELO',
  hipercard: 'Hipercard', paypal: 'PayPal', nubank: 'Nubank', outro: 'Cartão',
};

function CardsStack({ cards, onAdd, onEdit, onDelete }: {
  cards: Card[];
  onAdd: () => void;
  onEdit: (c: Card) => void;
  onDelete: (id: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const showing = expanded ? cards : cards.slice(0, 3);

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
          <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--t1)' }}>My Cards</span>
          <span style={{ fontSize: 11, color: 'var(--t4)', fontWeight: 600 }}>{cards.length}</span>
        </div>
        <button onClick={onAdd}
          style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 12px', borderRadius: 99, background: 'var(--s2)', border: '1px solid var(--b2)', color: 'var(--t1)', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>
          Add <FiPlus size={11} />
        </button>
      </div>

      {cards.length === 0 ? (
        <button onClick={onAdd}
          style={{
            width: '100%', padding: '28px 16px', borderRadius: 14,
            border: '1px dashed var(--b3)', background: 'var(--s2)',
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
            cursor: 'pointer', color: 'var(--t4)',
          }}>
          <FiCreditCard size={22} style={{ opacity: 0.5 }} />
          <span style={{ fontSize: 12 }}>Adicionar cartão</span>
        </button>
      ) : (
        <div style={{ position: 'relative', minHeight: expanded ? showing.length * 140 + 20 : 180 + (showing.length - 1) * 34 }}>
          {showing.map((c, i) => {
            // Collapsed: front card (i=0) at top fully-expanded, others peek out BELOW it.
            // Expanded: all shown stacked vertically with full details.
            const isFront = i === 0;
            const offset = expanded ? i * 140 : isFront ? 0 : 120 + (i - 1) * 24;
            return (
              <motion.div
                key={c.id}
                layout
                onClick={() => onEdit(c)}
                style={{
                  position: 'absolute', top: offset, left: 0, right: 0,
                  height: expanded || isFront ? 130 : 44,
                  borderRadius: 14, padding: expanded || isFront ? 16 : '12px 16px',
                  background: `
                    linear-gradient(115deg, transparent 40%, rgba(255,255,255,0.09) 50%, transparent 60%),
                    repeating-linear-gradient(115deg, rgba(255,255,255,0.022) 0 1.5px, transparent 1.5px 16px),
                    linear-gradient(135deg, ${c.color}, ${c.color}aa)
                  `,
                  boxShadow: `0 14px 40px -10px ${c.color}55, 0 0 28px -8px ${c.color}88`,
                  color: '#fff', overflow: 'hidden', cursor: 'pointer',
                  zIndex: expanded ? showing.length - i : showing.length + 10 - i,
                  transition: 'transform .2s',
                }}
                whileHover={{ y: -4 }}>
                {(expanded || isFront) ? (
                  <>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'relative' }}>
                      <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '1.2px', textTransform: 'uppercase' }}>
                        {BRAND_LABELS[c.brand]}
                      </span>
                      <span style={{ fontSize: 12, fontWeight: 600, letterSpacing: '1.5px' }}>•••• {c.last4}</span>
                    </div>
                    <div style={{ marginTop: 34, fontSize: 13, fontFamily: 'ui-monospace, monospace', letterSpacing: '3px', opacity: 0.92 }}>
                      •••• •••• •••• {c.last4}
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: 14 }}>
                      <div style={{ fontSize: 10, opacity: 0.85, letterSpacing: '0.5px' }}>{c.holder || '—'}</div>
                      <div style={{ fontSize: 10, opacity: 0.85, letterSpacing: '0.5px' }}>{c.expiry || 'MM/AA'}</div>
                    </div>
                    {expanded && (
                      <button
                        onClick={(e) => { e.stopPropagation(); onDelete(c.id); }}
                        style={{ position: 'absolute', top: 10, right: 10, background: 'rgba(0,0,0,0.25)', border: 'none', width: 24, height: 24, borderRadius: 6, cursor: 'pointer', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <FiTrash2 size={11} />
                      </button>
                    )}
                  </>
                ) : (
                  // Peek strip for back cards
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'relative' }}>
                    <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '1.2px', textTransform: 'uppercase' }}>
                      {BRAND_LABELS[c.brand]}
                    </span>
                    <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: '1.5px', opacity: 0.9 }}>•••• {c.last4}</span>
                  </div>
                )}
              </motion.div>
            );
          })}
        </div>
      )}

      {cards.length > 3 && (
        <button onClick={() => setExpanded(!expanded)}
          style={{ marginTop: 8, width: '100%', padding: '6px 0', borderRadius: 8, background: 'transparent', border: 'none', color: 'var(--t3)', fontSize: 11, cursor: 'pointer' }}>
          {expanded ? 'Mostrar menos' : `Ver todos (${cards.length})`}
        </button>
      )}
    </div>
  );
}

// ─── Subscriptions list (reuses RecurringBill) ───────────────────────────────

function SubscriptionsList({
  bills, accentColor, onAdd, onEdit, onDelete, onTogglePaid,
}: {
  bills: RecurringBill[];
  accentColor: string;
  onAdd: () => void;
  onEdit: (b: RecurringBill) => void;
  onDelete: (id: string) => void;
  onTogglePaid: (id: string, key: string) => void;
}) {
  const [menuOpen, setMenuOpen] = useState<string | null>(null);
  const today = new Date();
  const todayKey = format(today, 'yyyy-MM');

  // Compute state for each bill relative to TODAY (not the viewed month).
  const billState = (b: RecurringBill) => {
    const recurring = b.isRecurring !== false;
    const paidThisMonth = b.paidMonths.includes(todayKey);
    const dueThisMonth = new Date(today.getFullYear(), today.getMonth(), Math.min(b.dueDay, 28));
    const overdue = !paidThisMonth && today.getTime() > dueThisMonth.getTime() + 24 * 3600 * 1000;

    // Next visible date: if paid this month OR due passed → next month; if non-recurring and paid ever → "quitada"
    let nextD = dueThisMonth;
    if (paidThisMonth || today > dueThisMonth) nextD = new Date(today.getFullYear(), today.getMonth() + 1, Math.min(b.dueDay, 28));
    const quitada = !recurring && b.paidMonths.length > 0;

    return { recurring, paidThisMonth, overdue, nextD, quitada };
  };

  // Bills for the viewed month — hide "quitadas" (non-recurring + already paid) to keep list clean.
  const visible = bills.filter(b => !(b.isRecurring === false && b.paidMonths.length > 0));

  const nextDateStr = (b: RecurringBill) => {
    const { nextD, quitada } = billState(b);
    if (quitada) return 'Quitada';
    return `Próx. ${format(nextD, "d 'de' MMMM", { locale: ptBR })}`;
  };

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
          <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--t1)' }}>Subscriptions</span>
          <span style={{ fontSize: 11, color: 'var(--t4)', fontWeight: 600 }}>{bills.length}</span>
        </div>
        <button onClick={onAdd}
          style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 10px', borderRadius: 99, background: 'transparent', border: 'none', color: 'var(--t3)', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>
          Manage <FiArrowRight size={11} />
        </button>
      </div>

      {/* Icon row */}
      {visible.length > 0 && (
        <div style={{ display: 'flex', gap: 6, marginBottom: 10, flexWrap: 'wrap' }}>
          {visible.slice(0, 6).map((b) => {
            const Icon = RECURRING_ICON_MAP[b.icon];
            return (
              <div key={b.id}
                title={b.name}
                style={{
                  width: 30, height: 30, borderRadius: '50%',
                  background: 'var(--s2)', border: '1px solid var(--b2)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                <Icon size={13} style={{ color: 'var(--t2)' }} />
              </div>
            );
          })}
          {visible.length > 6 && (
            <div style={{ width: 30, height: 30, borderRadius: '50%', background: 'var(--s2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, color: 'var(--t3)', fontWeight: 600 }}>
              +{visible.length - 6}
            </div>
          )}
        </div>
      )}

      {visible.length === 0 ? (
        <button onClick={onAdd}
          style={{
            width: '100%', padding: '24px 16px', borderRadius: 12,
            border: '1px dashed var(--b3)', background: 'var(--s2)',
            display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
            cursor: 'pointer', color: 'var(--t4)',
          }}>
          <FiRefreshCw size={20} style={{ opacity: 0.5 }} />
          <span style={{ fontSize: 12 }}>Nenhuma subscription</span>
        </button>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {visible.map((b) => {
            const Icon = RECURRING_ICON_MAP[b.icon];
            const { paidThisMonth: paid, overdue, quitada } = billState(b);
            const accentBar = overdue ? '#ff453a' : paid ? '#30d158' : accentColor;
            const accentRgb = overdue ? '255,69,58' : paid ? '48,209,88' : hexToRgb(accentColor);
            return (
              <div key={b.id}
                style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '10px 12px', borderRadius: 12,
                  background: overdue ? 'rgba(255,69,58,0.06)' : 'var(--s2)',
                  border: `1px solid ${overdue ? 'rgba(255,69,58,0.25)' : 'transparent'}`,
                  opacity: paid || quitada ? 0.75 : 1, position: 'relative',
                  zIndex: menuOpen === b.id ? 50 : 'auto',
                }}>
                <div style={{
                  width: 34, height: 34, borderRadius: 10,
                  background: paid ? 'rgba(48,209,88,0.15)' : overdue ? 'rgba(255,69,58,0.12)' : 'var(--s1)',
                  border: `1px solid ${paid ? 'rgba(48,209,88,0.3)' : overdue ? 'rgba(255,69,58,0.3)' : 'var(--b2)'}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <Icon size={15} style={{ color: paid ? '#30d158' : overdue ? '#ff453a' : 'var(--t2)' }} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--t1)' }}>{b.name}</span>
                    {b.isRecurring === false && !quitada && (
                      <span style={{ fontSize: 8, fontWeight: 700, letterSpacing: '0.5px', textTransform: 'uppercase', color: 'var(--t4)', background: 'var(--s1)', borderRadius: 4, padding: '1px 5px' }}>única</span>
                    )}
                    {overdue && (
                      <span className="glow" style={{ fontSize: 8, fontWeight: 700, letterSpacing: '0.5px', textTransform: 'uppercase', color: '#fff', background: '#ff453a', borderRadius: 4, padding: '1px 5px', ['--glow' as any]: '255,69,58' }}>atrasada</span>
                    )}
                  </div>
                  <div style={{ fontSize: 10, color: overdue ? '#ff453a' : 'var(--t4)', fontWeight: overdue ? 600 : 400 }}>
                    {nextDateStr(b)}
                  </div>
                </div>
                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--t1)' }}>
                  R${b.amount.toFixed(2).replace('.', ',')}
                </div>
                {/* quick check */}
                <button
                  onClick={() => onTogglePaid(b.id, todayKey)}
                  title={paid ? 'Desmarcar pagamento' : 'Marcar como paga'}
                  className={paid ? 'glow-soft' : ''}
                  style={{
                    width: 26, height: 26, borderRadius: 8,
                    background: paid ? '#30d158' : 'transparent',
                    border: `1px solid ${paid ? '#30d158' : 'var(--b3)'}`,
                    cursor: 'pointer', color: paid ? '#071007' : 'var(--t3)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    ['--glow' as any]: '48,209,88',
                  }}>
                  <FiCheck size={13} />
                </button>
                <button onClick={() => setMenuOpen(menuOpen === b.id ? null : b.id)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--t4)', padding: 3 }}>
                  <FiMoreHorizontal size={14} />
                </button>
                {menuOpen === b.id && (
                  <>
                    <div onClick={() => setMenuOpen(null)} style={{ position: 'fixed', inset: 0, zIndex: 49 }} />
                    <div style={{
                      position: 'absolute', right: 8, top: 40, zIndex: 51,
                      background: 'var(--s1)', border: '1px solid var(--b2)', borderRadius: 10,
                      padding: 4, boxShadow: '0 12px 30px rgba(0,0,0,0.45)', minWidth: 170,
                    }}>
                      <button onClick={() => { onTogglePaid(b.id, todayKey); setMenuOpen(null); }}
                        style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '8px 10px', borderRadius: 6, background: 'none', border: 'none', color: 'var(--t2)', fontSize: 12, cursor: 'pointer', textAlign: 'left' }}>
                        <FiCheck size={11} /> {paid ? 'Marcar não paga' : 'Marcar como paga'}
                      </button>
                      <button onClick={() => { onEdit(b); setMenuOpen(null); }}
                        style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '8px 10px', borderRadius: 6, background: 'none', border: 'none', color: 'var(--t2)', fontSize: 12, cursor: 'pointer', textAlign: 'left' }}>
                        <FiEdit2 size={11} /> Editar
                      </button>
                      <button onClick={() => { onDelete(b.id); setMenuOpen(null); }}
                        style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '8px 10px', borderRadius: 6, background: 'none', border: 'none', color: '#ff453a', fontSize: 12, cursor: 'pointer', textAlign: 'left' }}>
                        <FiTrash2 size={11} /> Excluir
                      </button>
                    </div>
                  </>
                )}
                {/* left accent bar with color-matching glow */}
                {!quitada && (
                  <div style={{
                    position: 'absolute', left: 0, top: '50%', width: 3, height: 18,
                    borderRadius: 2, transform: 'translateY(-50%)',
                    background: accentBar,
                    boxShadow: `0 0 10px rgba(${accentRgb},0.9), 0 0 22px rgba(${accentRgb},0.4)`,
                  }} />
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export function FinancePage() {
  const {
    transactions, goals, recurringBills,
    addToGoal, deleteGoal, deleteTransaction, toggleRecurringPaid, deleteRecurringBill,
  } = useFinanceStore();
  const { accentColor } = useTaskStore();
  const { cards, deleteCard } = useCardsStore();

  const accentRgb = hexToRgb(accentColor);

  const [viewMonth, setViewMonth] = useState(() => startOfMonth(new Date()));
  const [showTransaction, setShowTransaction] = useState(false);
  const [showGoal, setShowGoal] = useState(false);
  const [editGoal, setEditGoal] = useState<FinancialGoal | undefined>();
  const [showRecurring, setShowRecurring] = useState(false);
  const [editRecurring, setEditRecurring] = useState<RecurringBill | undefined>();
  const [showCard, setShowCard] = useState(false);
  const [editCard, setEditCard] = useState<Card | undefined>();
  const [hideBalance, setHideBalance] = useState(false);
  const [txSearch, setTxSearch] = useState('');
  const [calendarYear, setCalendarYear] = useState(() => new Date().getFullYear());

  const monthKey = format(viewMonth, 'yyyy-MM');
  const monthEnd = endOfMonth(viewMonth);

  const monthTx = useMemo(() =>
    transactions.filter(t => t.date >= format(viewMonth, 'yyyy-MM-dd') && t.date <= format(monthEnd, 'yyyy-MM-dd')),
    [transactions, viewMonth, monthEnd]
  );

  const virtualRecurringForMonth = (key: string): DisplayTransaction[] =>
    recurringBills
      .filter(b => b.paidMonths.includes(key))
      .map(b => ({
        id: `rec-${b.id}-${key}`,
        type: 'despesa',
        description: b.name,
        category: 'Conta Recorrente',
        amount: b.amount,
        date: `${key}-${String(Math.min(b.dueDay, 28)).padStart(2, '0')}`,
        status: 'pago',
        createdAt: '',
        isRecurring: true,
        recurringBillId: b.id,
      }));

  const monthTxAll = useMemo<DisplayTransaction[]>(
    () => [...monthTx, ...virtualRecurringForMonth(monthKey)],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [monthTx, monthKey, recurringBills],
  );

  const prevMonthKey = format(subMonths(viewMonth, 1), 'yyyy-MM');
  const prevStart = startOfMonth(subMonths(viewMonth, 1));
  const prevEnd   = endOfMonth(subMonths(viewMonth, 1));
  const prevTxAll: DisplayTransaction[] = [
    ...transactions.filter(t => t.date >= format(prevStart, 'yyyy-MM-dd') && t.date <= format(prevEnd, 'yyyy-MM-dd')),
    ...virtualRecurringForMonth(prevMonthKey),
  ];

  const income   = monthTxAll.filter(t => t.type === 'receita' && t.status !== 'cancelado').reduce((s, t) => s + t.amount, 0);
  const expense  = monthTxAll.filter(t => t.type === 'despesa' && t.status !== 'cancelado').reduce((s, t) => s + t.amount, 0);
  const balance  = income - expense;

  const prevIncome  = prevTxAll.filter(t => t.type === 'receita' && t.status !== 'cancelado').reduce((s, t) => s + t.amount, 0);
  const prevExpense = prevTxAll.filter(t => t.type === 'despesa' && t.status !== 'cancelado').reduce((s, t) => s + t.amount, 0);
  const prevBalance = prevIncome - prevExpense;

  const pctChange = (curr: number, prev: number) => {
    if (prev === 0) return curr > 0 ? 100 : 0;
    return ((curr - prev) / prev) * 100;
  };

  const balancePct = pctChange(balance, prevBalance);
  const incomePct  = pctChange(income, prevIncome);
  const expensePct = pctChange(expense, prevExpense);

  // Expense split by category (for donut)
  const splitData = useMemo(() => {
    const map: Record<string, number> = {};
    monthTxAll.filter(t => t.type === 'despesa' && t.status !== 'cancelado').forEach(t => {
      map[t.category] = (map[t.category] ?? 0) + t.amount;
    });
    const entries = Object.entries(map).sort((a, b) => b[1] - a[1]);
    return entries.slice(0, 6).map(([label, value], i) => ({
      label, value, pct: expense > 0 ? (value / expense) * 100 : 0, color: CAT_COLORS[i % CAT_COLORS.length],
    }));
  }, [monthTxAll, expense]);

  const filteredTx = useMemo(() =>
    monthTxAll.filter(t => !txSearch || t.description.toLowerCase().includes(txSearch.toLowerCase()) || t.category.toLowerCase().includes(txSearch.toLowerCase()))
      .sort((a, b) => b.date.localeCompare(a.date)),
    [monthTxAll, txSearch]
  );

  const maskedVal = (v: string) => hideBalance ? '••••••' : v;

  const cardStyle: React.CSSProperties = {
    background: 'var(--s1)', borderRadius: 16,
    padding: 18, border: '1px solid var(--b2)',
  };

  const balanceColor = balance >= 0 ? '#30d158' : '#ff453a';
  const balanceRgb = balance >= 0 ? '48,209,88' : '255,69,58';
  const fmtPct = (n: number) => `${n >= 0 ? '+' : ''}${n.toFixed(0)}%`;

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* Compact sticky header */}
      <div style={{ padding: '14px 20px', flexShrink: 0, borderBottom: '1px solid var(--b2)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
        <div>
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase', color: 'var(--t4)', marginBottom: 2 }}>Finanças</div>
          <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--t1)', letterSpacing: '-0.4px' }}>Finanças</div>
        </div>

        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
          {/* Stat chips */}
          {([
            { label: 'Receita',  value: fmtShort(income).replace('R$ ', 'R$ '),  pct: incomePct,  color: '#30d158', rgb: '48,209,88' },
            { label: 'Despesa',  value: fmtShort(expense).replace('R$ ', 'R$ '), pct: expensePct, color: '#ff453a', rgb: '255,69,58' },
            { label: 'Saldo',    value: `${balance >= 0 ? '' : '−'}${fmtShort(Math.abs(balance)).replace('R$ ', 'R$ ')}`, pct: balancePct, color: balanceColor, rgb: balanceRgb },
          ] as { label: string; value: string; pct: number; color: string; rgb: string }[]).map(k => (
            <div key={k.label} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 10px', borderRadius: 8, background: `rgba(${k.rgb},0.08)`, border: `1px solid rgba(${k.rgb},0.2)` }}>
              <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.8px', textTransform: 'uppercase', color: `rgba(${k.rgb},0.6)` }}>{k.label}</span>
              <span style={{ fontSize: 13, fontWeight: 700, color: k.color }}>{k.value}</span>
              <span style={{ fontSize: 9, fontWeight: 700, color: k.pct >= 0 ? '#30d158' : '#ff453a', opacity: 0.85 }}>{fmtPct(k.pct)}</span>
            </div>
          ))}

          {/* Month nav */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 2, background: 'var(--s2)', border: '1px solid var(--b2)', borderRadius: 8, padding: 2 }}>
            <button onClick={() => setViewMonth(subMonths(viewMonth, 1))}
              style={{ padding: '4px 7px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--t3)', borderRadius: 6 }}>
              <FiChevronLeft size={12} />
            </button>
            <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--t1)', minWidth: 72, textAlign: 'center' }}>
              {format(viewMonth, 'MMM yyyy', { locale: ptBR }).replace(/^\w/, c => c.toUpperCase())}
            </span>
            <button onClick={() => setViewMonth(addMonths(viewMonth, 1))}
              style={{ padding: '4px 7px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--t3)', borderRadius: 6 }}>
              <FiChevronRight size={12} />
            </button>
          </div>

          {/* Lançamento */}
          <button
            onClick={() => setShowTransaction(true)}
            style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '7px 14px', borderRadius: 8, background: accentColor, border: 'none', color: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer', boxShadow: `0 4px 14px rgba(${accentRgb},0.35)` }}>
            <FiPlus size={12} /> Lançamento
          </button>
        </div>
      </div>

      {/* Scrollable bento layout */}
      <div className="bento-grid bento-sidebar" style={{ flex: 1, overflowY: 'auto', padding: '16px 20px 20px', gridAutoRows: 'min-content' }}>

        {/* LEFT COLUMN (main) */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

          {/* Row 1: Total balance (big) + Income/Expense stacked */}
          <div className="bento-grid bento-chart">
            {/* Total balance — blue gradient with aurora halo */}
            <div
              className="ambient-glow"
              style={{
                position: 'relative',
                background: `
                  linear-gradient(115deg, transparent 40%, rgba(255,255,255,0.07) 50%, transparent 60%),
                  repeating-linear-gradient(115deg, rgba(255,255,255,0.018) 0 1.5px, transparent 1.5px 18px),
                  linear-gradient(135deg, ${accentColor} 0%, ${accentColor}aa 50%, #1a8ad4 100%)
                `,
                borderRadius: 18, padding: 22, overflow: 'hidden',
                ['--glow' as any]: accentRgb,
                boxShadow: `0 20px 60px -20px rgba(${accentRgb}, 0.45)`,
              }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                <span style={{ fontSize: 10, fontWeight: 600, color: 'rgba(255,255,255,0.85)' }}>Total balance</span>
                <button onClick={() => setHideBalance(!hideBalance)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.7)', padding: 2 }}>
                  {hideBalance ? <FiEyeOff size={13} /> : <FiEye size={13} />}
                </button>
              </div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginTop: 10, marginBottom: 8 }}>
                <span style={{ fontSize: 38, fontWeight: 700, color: '#fff', lineHeight: 1 }}>
                  {maskedVal(balance.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }))}
                </span>
                <span style={{ fontSize: 16, fontWeight: 500, color: 'rgba(255,255,255,0.85)' }}>$</span>
              </div>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.75)', marginBottom: 20 }}>
                {balancePct >= 0 ? '+' : ''}{fmtShort(balance - prevBalance).replace('R$ ', '')} vs. mês anterior
              </div>
              <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                <button onClick={() => setShowTransaction(true)}
                  style={{ padding: '9px 18px', borderRadius: 99, background: '#0e1220', color: '#fff', border: 'none', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>
                  Lançar
                </button>
                <button onClick={() => setShowCard(true)}
                  style={{ padding: '9px 18px', borderRadius: 99, background: 'rgba(255,255,255,0.92)', color: '#0e1220', border: 'none', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>
                  Add cartão
                </button>
              </div>
            </div>

            {/* Income + Expense stacked */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {[
                { label: 'Income', value: income, pct: incomePct, positive: true, glowRgb: '48,209,88', accent: '#30d158' },
                { label: 'Expense', value: expense, pct: expensePct, positive: false, glowRgb: '255,69,58', accent: '#ff453a' },
              ].map((row) => {
                const pillPos = row.positive ? row.pct >= 0 : row.pct <= 0;
                return (
                  <div
                    key={row.label}
                    style={{
                      ...cardStyle,
                      position: 'relative', overflow: 'hidden',
                      // soft tint on the card surface in the accent color
                      backgroundImage: `radial-gradient(circle at 110% 100%, rgba(${row.glowRgb}, 0.22), transparent 58%)`,
                      boxShadow: `0 0 0 1px var(--b2), 0 0 30px -8px rgba(${row.glowRgb}, 0.35)`,
                    }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'relative' }}>
                      <span style={{ fontSize: 11, color: 'var(--t3)', fontWeight: 500 }}>{row.label}</span>
                      {row.positive ? <FiTrendingUp size={12} style={{ color: row.accent }} /> : <FiTrendingDown size={12} style={{ color: row.accent }} />}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 8, position: 'relative' }}>
                      <div style={{ display: 'flex', alignItems: 'baseline', gap: 3 }}>
                        <span style={{ fontSize: 22, fontWeight: 700, color: 'var(--t1)', lineHeight: 1 }}>
                          {row.positive ? '+' : '−'}{maskedVal(row.value.toLocaleString('pt-BR', { maximumFractionDigits: 0 }))}
                        </span>
                        <span style={{ fontSize: 13, color: 'var(--t3)' }}>$</span>
                      </div>
                      <span
                        className="glow"
                        style={{
                          fontSize: 10, fontWeight: 700, padding: '3px 9px', borderRadius: 99,
                          background: pillPos ? row.accent : '#636366',
                          color: '#071007',
                          ['--glow' as any]: pillPos ? row.glowRgb : '99,99,102',
                        }}>
                        {row.pct >= 0 ? '+' : ''}{row.pct.toFixed(1)}%
                      </span>
                    </div>
                    <div style={{ fontSize: 10, color: 'var(--t4)', marginTop: 4, position: 'relative' }}>Do mês</div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Row 2: Revenue flow + Expense split */}
          <div className="bento-grid bento-chart">
            <div style={cardStyle}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--t1)' }}>Revenue flow</span>
                <button style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '4px 12px', borderRadius: 99, background: 'var(--s2)', border: '1px solid var(--b2)', color: 'var(--t2)', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>
                  Mensal
                </button>
              </div>
              <div style={{ fontSize: 10, color: 'var(--t4)', marginBottom: 4 }}>Saldo líquido — últimos 5 meses</div>
              <RevenueBarChart transactions={transactions} recurringBills={recurringBills} accentColor={accentColor} />
            </div>

            <div style={cardStyle}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--t1)' }}>Expense split</span>
                <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--t3)', padding: '3px 10px', borderRadius: 99, background: 'var(--s2)', border: '1px solid var(--b2)' }}>
                  {format(viewMonth, 'MMM', { locale: ptBR }).replace(/^\w/, c => c.toUpperCase())}
                </span>
              </div>
              <div style={{ display: 'flex', gap: 14, alignItems: 'center', marginTop: 10 }}>
                <div style={{ flexShrink: 0 }}>
                  <DonutChart segments={splitData} total={expense} />
                </div>
                <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {splitData.length === 0 ? (
                    <div style={{ fontSize: 11, color: 'var(--t4)' }}>Sem despesas</div>
                  ) : splitData.slice(0, 5).map((s) => (
                    <div key={s.label} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ width: 6, height: 6, borderRadius: 2, background: s.color, boxShadow: `0 0 6px ${s.color}` }} />
                      <span style={{ fontSize: 11, color: 'var(--t2)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{s.label}</span>
                      <span style={{ fontSize: 11, color: 'var(--t1)', fontWeight: 700 }}>{s.pct.toFixed(0)}%</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Year calendar + Budget */}
          <div className="bento-grid bento-split">
            <div style={cardStyle}>
              <YearBalanceCalendar
                year={calendarYear}
                transactions={transactions}
                recurringBills={recurringBills}
                selectedMonth={viewMonth}
                accentColor={accentColor}
                onSelect={setViewMonth}
                onChangeYear={setCalendarYear}
              />
            </div>

            <div style={cardStyle}>
              {/* Metas */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <FiTarget size={14} style={{ color: '#30d158' }} />
                  <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--t1)' }}>Metas</span>
                  {goals.length > 0 && (
                    <span style={{ fontSize: 10, color: 'var(--t4)', background: 'var(--s2)', borderRadius: 99, padding: '2px 8px', fontWeight: 700 }}>
                      {goals.length}
                    </span>
                  )}
                </div>
                <button onClick={() => { setEditGoal(undefined); setShowGoal(true); }}
                  style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 10px', borderRadius: 8, background: 'rgba(48,209,88,0.1)', border: '1px solid rgba(48,209,88,0.25)', color: '#30d158', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>
                  <FiPlus size={10} /> Nova
                </button>
              </div>
              {goals.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '18px 0', color: 'var(--t4)', fontSize: 12 }}>
                  <FiTarget size={22} style={{ opacity: 0.3, marginBottom: 6 }} />
                  <div>Nenhuma meta</div>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {goals.map((g) => {
                    const Icon = GOAL_ICON_MAP[g.icon];
                    const pct = Math.min((g.current / g.target) * 100, 100);
                    return (
                      <div key={g.id} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{ width: 28, height: 28, borderRadius: 8, background: `${g.color}20`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <Icon size={13} style={{ color: g.color }} />
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 4 }}>
                            <span style={{ color: 'var(--t1)', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{g.name}</span>
                            <span style={{ color: g.color, fontWeight: 700, flexShrink: 0, marginLeft: 8 }}>{pct.toFixed(0)}%</span>
                          </div>
                          <div style={{ height: 5, background: 'var(--b2)', borderRadius: 3, overflow: 'hidden' }}>
                            <div style={{ height: '100%', width: `${pct}%`, background: g.color, borderRadius: 3, boxShadow: `0 0 8px ${g.color}aa`, transition: 'width .4s ease' }} />
                          </div>
                          <div style={{ fontSize: 10, color: 'var(--t4)', marginTop: 3 }}>
                            {fmtShort(g.current)} de {fmtShort(g.target)}
                          </div>
                        </div>
                        <div style={{ display: 'flex', gap: 2, flexShrink: 0 }}>
                          <button onClick={() => addToGoal(g.id, 50)} title="+R$50"
                            style={{ background: 'none', border: 'none', cursor: 'pointer', color: g.color, padding: 4, fontSize: 12, fontWeight: 700 }}>+</button>
                          <button onClick={() => { setEditGoal(g); setShowGoal(true); }}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--t4)', padding: 4, display: 'flex' }}><FiEdit2 size={11} /></button>
                          <button onClick={() => deleteGoal(g.id)}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--t4)', padding: 4, display: 'flex' }}><FiTrash2 size={11} /></button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Recent transactions */}
          <div style={cardStyle}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--t1)' }}>Atividades Recentes</span>
                <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--t4)', background: 'var(--s2)', borderRadius: 99, padding: '1px 7px' }}>{monthTxAll.length}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'var(--s2)', border: '1px solid var(--b2)', borderRadius: 8, padding: '5px 10px' }}>
                <FiSearch size={12} style={{ color: 'var(--t4)' }} />
                <input
                  placeholder="Buscar..."
                  value={txSearch}
                  onChange={e => setTxSearch(e.target.value)}
                  style={{ background: 'none', border: 'none', outline: 'none', color: 'var(--t1)', fontSize: 12, width: 140 }}
                />
              </div>
            </div>

            {filteredTx.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '28px 0', color: 'var(--t4)', fontSize: 12 }}>
                Nenhuma transação nesse mês
              </div>
            ) : (
              <>
                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 100px 110px 90px', gap: 8, padding: '0 8px 8px', borderBottom: '1px solid var(--b2)', marginBottom: 4 }}>
                  {['Descrição', 'Categoria', 'Data', 'Valor', 'Status'].map((h) => (
                    <span key={h} style={{ fontSize: 9, fontWeight: 700, letterSpacing: '1.5px', textTransform: 'uppercase', color: 'var(--t4)' }}>{h}</span>
                  ))}
                </div>

                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  {filteredTx.map((tx) => (
                    <div key={tx.id} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 100px 110px 90px', gap: 8, padding: '10px 8px', borderRadius: 8, alignItems: 'center', transition: 'background .12s', cursor: 'default' }}
                      onMouseEnter={e => ((e.currentTarget as HTMLElement).style.background = 'var(--s2)')}
                      onMouseLeave={e => ((e.currentTarget as HTMLElement).style.background = 'transparent')}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                        <div style={{ width: 28, height: 28, borderRadius: 8, background: tx.isRecurring ? 'rgba(191,90,242,0.12)' : tx.type === 'receita' ? 'rgba(48,209,88,0.12)' : 'rgba(255,69,58,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          {tx.isRecurring
                            ? <FiRefreshCw size={12} style={{ color: '#bf5af2' }} />
                            : <span style={{ fontSize: 12, color: tx.type === 'receita' ? '#30d158' : '#ff453a' }}>{tx.type === 'receita' ? '↑' : '↓'}</span>}
                        </div>
                        <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--t1)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{tx.description}</span>
                      </div>
                      <span style={{ fontSize: 11, color: 'var(--t3)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{tx.category}</span>
                      <span style={{ fontSize: 11, color: 'var(--t4)' }}>{format(parseISO(tx.date), 'dd/MM/yyyy')}</span>
                      <span style={{ fontSize: 12, fontWeight: 700, color: tx.type === 'receita' ? '#30d158' : '#ff453a' }}>
                        {tx.type === 'receita' ? '+' : '-'} {fmtBRL(tx.amount)}
                      </span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span
                          className="glow"
                          style={{
                            fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 99,
                            background: STATUS_COLOR[tx.status], color: '#071007',
                            ['--glow' as any]: hexToRgb(STATUS_COLOR[tx.status]),
                          }}>{STATUS_LABEL[tx.status]}</span>
                        {tx.isRecurring ? (
                          <button onClick={() => tx.recurringBillId && toggleRecurringPaid(tx.recurringBillId, monthKey)}
                            title="Desmarcar como paga"
                            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--t4)', padding: 2 }}>
                            <FiRefreshCw size={11} />
                          </button>
                        ) : (
                          <button onClick={() => deleteTransaction(tx.id)}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--t4)', padding: 2 }}>
                            <FiTrash2 size={11} />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>

        {/* RIGHT SIDEBAR */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={cardStyle}>
            <CardsStack
              cards={cards}
              onAdd={() => { setEditCard(undefined); setShowCard(true); }}
              onEdit={(c) => { setEditCard(c); setShowCard(true); }}
              onDelete={deleteCard}
            />
          </div>

          <div style={cardStyle}>
            <SubscriptionsList
              bills={recurringBills}
              accentColor={accentColor}
              onAdd={() => { setEditRecurring(undefined); setShowRecurring(true); }}
              onEdit={(b) => { setEditRecurring(b); setShowRecurring(true); }}
              onDelete={deleteRecurringBill}
              onTogglePaid={toggleRecurringPaid}
            />
          </div>
        </div>
      </div>

      {/* Modals */}
      <AnimatePresence>
        {showTransaction && <TransactionModal onClose={() => setShowTransaction(false)} />}
      </AnimatePresence>
      <AnimatePresence>
        {showGoal && <GoalModal onClose={() => { setShowGoal(false); setEditGoal(undefined); }} editing={editGoal} />}
      </AnimatePresence>
      <AnimatePresence>
        {showRecurring && <RecurringModal onClose={() => { setShowRecurring(false); setEditRecurring(undefined); }} editing={editRecurring} />}
      </AnimatePresence>
      <AnimatePresence>
        {showCard && <CardModal onClose={() => { setShowCard(false); setEditCard(undefined); }} editing={editCard} />}
      </AnimatePresence>
    </div>
  );
}
