import { useState } from 'react';
import { motion } from 'framer-motion';
import { FiX, FiHome, FiWifi, FiPhone, FiZap, FiDroplet, FiMusic, FiActivity, FiCode, FiRefreshCw } from 'react-icons/fi';
import { useFinanceStore } from '../../store/finance';
import type { RecurringIcon, RecurringBill } from '../../types';

const RECURRING_ICONS: { id: RecurringIcon; label: string; Icon: React.ElementType }[] = [
  { id: 'aluguel',   label: 'Aluguel',   Icon: FiHome },
  { id: 'internet',  label: 'Internet',  Icon: FiWifi },
  { id: 'celular',   label: 'Celular',   Icon: FiPhone },
  { id: 'luz',       label: 'Luz',       Icon: FiZap },
  { id: 'agua',      label: 'Água',      Icon: FiDroplet },
  { id: 'streaming', label: 'Streaming', Icon: FiMusic },
  { id: 'academia',  label: 'Academia',  Icon: FiActivity },
  { id: 'software',  label: 'Software',  Icon: FiCode },
  { id: 'outra',     label: 'Outra',     Icon: FiRefreshCw },
];

const inputStyle: React.CSSProperties = {
  width: '100%', background: 'var(--ib)', border: '1px solid var(--b2)',
  borderRadius: 8, padding: '9px 12px', color: 'var(--t1)', fontSize: 13, outline: 'none',
};
const labelStyle: React.CSSProperties = {
  fontSize: 10, fontWeight: 700, letterSpacing: '1.5px', textTransform: 'uppercase',
  color: 'var(--t3)', display: 'block', marginBottom: 6,
};

interface Props {
  onClose: () => void;
  editing?: RecurringBill;
}

export function RecurringModal({ onClose, editing }: Props) {
  const { addRecurringBill, updateRecurringBill } = useFinanceStore();
  const [name, setName]           = useState(editing?.name ?? '');
  const [amount, setAmount]       = useState(editing ? String(editing.amount) : '');
  const [dueDay, setDueDay]       = useState(editing ? String(editing.dueDay) : '1');
  const [icon, setIcon]           = useState<RecurringIcon>(editing?.icon ?? 'outra');
  const [isEssential, setIsEssential] = useState(editing?.isEssential ?? false);
  const [isRecurring, setIsRecurring] = useState(editing?.isRecurring ?? true);

  const accentColor = '#bf5af2';

  const handleSubmit = () => {
    if (!name.trim() || !amount) return;
    const data = {
      name: name.trim(),
      amount: parseFloat(amount.replace(',', '.')),
      dueDay: Math.max(1, Math.min(31, parseInt(dueDay) || 1)),
      icon,
      isEssential,
      isRecurring,
    };
    if (editing) {
      updateRecurringBill(editing.id, data);
    } else {
      addRecurringBill(data);
    }
    onClose();
  };

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      style={{ position: 'fixed', inset: 0, zIndex: 500, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.5)' }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
        className="glass-panel"
        style={{ width: 420, background: 'var(--modal-bg)', borderRadius: 18, padding: 24, boxShadow: '0 24px 80px rgba(0,0,0,0.45)' }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 32, height: 32, borderRadius: 10, background: `${accentColor}20`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <FiRefreshCw size={16} style={{ color: accentColor }} />
            </div>
            <span style={{ fontSize: 16, fontWeight: 700, color: 'var(--t1)' }}>{editing ? 'Editar Conta' : 'Nova Conta Recorrente'}</span>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--t4)', padding: 4 }}><FiX size={16} /></button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label style={labelStyle}>Nome</label>
            <input style={inputStyle} placeholder="Ex: Aluguel, Netflix, Internet..." value={name} onChange={e => setName(e.target.value)} autoFocus />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={labelStyle}>Valor (R$)</label>
              <input style={inputStyle} placeholder="0,00" type="number" min="0" step="0.01" value={amount} onChange={e => setAmount(e.target.value)} />
            </div>
            <div>
              <label style={labelStyle}>Dia do Vencimento</label>
              <input style={inputStyle} placeholder="1" type="number" min="1" max="31" value={dueDay} onChange={e => setDueDay(e.target.value)} />
            </div>
          </div>

          <div>
            <label style={labelStyle}>Ícone</label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
              {RECURRING_ICONS.map(({ id, label, Icon }) => (
                <button key={id} onClick={() => setIcon(id)}
                  style={{ padding: '10px 8px', borderRadius: 10, border: `1px solid ${icon === id ? accentColor : 'var(--b2)'}`, background: icon === id ? `${accentColor}18` : 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8, transition: 'all .12s' }}>
                  <Icon size={14} style={{ color: icon === id ? accentColor : 'var(--t3)' }} />
                  <span style={{ fontSize: 11, color: icon === id ? accentColor : 'var(--t3)', fontWeight: icon === id ? 700 : 400 }}>{label}</span>
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={() => setIsRecurring(!isRecurring)}
            style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', borderRadius: 10, border: `1px solid ${isRecurring ? accentColor : 'var(--b2)'}`, background: isRecurring ? `${accentColor}10` : 'transparent', cursor: 'pointer', textAlign: 'left', transition: 'all .12s' }}>
            <div style={{ width: 18, height: 18, borderRadius: 5, border: `2px solid ${isRecurring ? accentColor : 'var(--b3)'}`, background: isRecurring ? accentColor : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all .12s', flexShrink: 0 }}>
              {isRecurring && <span style={{ color: '#fff', fontSize: 10, fontWeight: 700 }}>✓</span>}
            </div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--t1)' }}>Recorrente</div>
              <div style={{ fontSize: 11, color: 'var(--t4)', marginTop: 1 }}>Aparece todo mês. Desmarque para conta única (ex: IPTU de uma parcela)</div>
            </div>
          </button>

          <button
            onClick={() => setIsEssential(!isEssential)}
            style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', borderRadius: 10, border: `1px solid ${isEssential ? accentColor : 'var(--b2)'}`, background: isEssential ? `${accentColor}10` : 'transparent', cursor: 'pointer', textAlign: 'left', transition: 'all .12s' }}>
            <div style={{ width: 18, height: 18, borderRadius: 5, border: `2px solid ${isEssential ? accentColor : 'var(--b3)'}`, background: isEssential ? accentColor : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all .12s', flexShrink: 0 }}>
              {isEssential && <span style={{ color: '#fff', fontSize: 10, fontWeight: 700 }}>✓</span>}
            </div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--t1)' }}>Conta essencial</div>
              <div style={{ fontSize: 11, color: 'var(--t4)', marginTop: 1 }}>Aluguel, energia, saúde — algo que não pode cortar</div>
            </div>
          </button>
        </div>

        <button
          onClick={handleSubmit}
          disabled={!name.trim() || !amount}
          style={{ width: '100%', marginTop: 22, padding: '12px 0', borderRadius: 12, border: 'none', background: accentColor, color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer', opacity: (!name.trim() || !amount) ? 0.4 : 1, transition: 'opacity .15s' }}>
          {editing ? 'Salvar Conta' : 'Adicionar Conta'}
        </button>
      </motion.div>
    </motion.div>
  );
}
