import { useState } from 'react';
import { motion } from 'framer-motion';
import { FiX, FiShield, FiMap, FiHome, FiTruck, FiTrendingUp, FiAward, FiTarget, FiHeart } from 'react-icons/fi';
import { useFinanceStore } from '../../store/finance';
import type { GoalIcon, FinancialGoal } from '../../types';

const GOAL_ICONS: { id: GoalIcon; label: string; Icon: React.ElementType }[] = [
  { id: 'reserva',  label: 'Reserva',  Icon: FiShield },
  { id: 'viagem',   label: 'Viagem',   Icon: FiMap },
  { id: 'casa',     label: 'Casa',     Icon: FiHome },
  { id: 'carro',    label: 'Carro',    Icon: FiTruck },
  { id: 'investir', label: 'Investir', Icon: FiTrendingUp },
  { id: 'premio',   label: 'Prêmio',   Icon: FiAward },
  { id: 'meta',     label: 'Meta',     Icon: FiTarget },
  { id: 'saude',    label: 'Saúde',    Icon: FiHeart },
];

const GOAL_COLORS = ['#30d158', '#ff453a', '#356BFF', '#bf5af2', '#ff6b6b', '#ff9f0a'];

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
  editing?: FinancialGoal;
}

export function GoalModal({ onClose, editing }: Props) {
  const { addGoal, updateGoal } = useFinanceStore();
  const [name, setName]     = useState(editing?.name ?? '');
  const [target, setTarget] = useState(editing ? String(editing.target) : '');
  const [current, setCurrent] = useState(editing ? String(editing.current) : '0');
  const [icon, setIcon]     = useState<GoalIcon>(editing?.icon ?? 'reserva');
  const [color, setColor]   = useState(editing?.color ?? '#30d158');

  const handleSubmit = () => {
    if (!name.trim() || !target) return;
    const data = {
      name: name.trim(),
      target: parseFloat(target.replace(',', '.')),
      current: parseFloat((current || '0').replace(',', '.')),
      icon,
      color,
    };
    if (editing) {
      updateGoal(editing.id, data);
    } else {
      addGoal(data);
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
        style={{ width: 400, background: 'var(--modal-bg)', borderRadius: 18, padding: 24, boxShadow: '0 24px 80px rgba(0,0,0,0.45)' }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 32, height: 32, borderRadius: 10, background: `${color}20`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {(() => { const ic = GOAL_ICONS.find(i => i.id === icon); return ic ? <ic.Icon size={16} style={{ color }} /> : null; })()}
            </div>
            <span style={{ fontSize: 16, fontWeight: 700, color: 'var(--t1)' }}>{editing ? 'Editar Meta' : 'Nova Meta'}</span>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--t4)', padding: 4 }}><FiX size={16} /></button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label style={labelStyle}>Nome da Meta</label>
            <input style={inputStyle} placeholder="Ex: Reserva de emergência" value={name} onChange={e => setName(e.target.value)} autoFocus />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={labelStyle}>Meta (R$)</label>
              <input style={inputStyle} placeholder="10000" type="number" min="0" value={target} onChange={e => setTarget(e.target.value)} />
            </div>
            <div>
              <label style={labelStyle}>Já Guardado (R$)</label>
              <input style={inputStyle} placeholder="0" type="number" min="0" value={current} onChange={e => setCurrent(e.target.value)} />
            </div>
          </div>

          <div>
            <label style={labelStyle}>Ícone</label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
              {GOAL_ICONS.map(({ id, label, Icon }) => (
                <button key={id} onClick={() => setIcon(id)}
                  style={{ padding: '10px 6px', borderRadius: 10, border: `1px solid ${icon === id ? color : 'var(--b2)'}`, background: icon === id ? `${color}18` : 'transparent', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, transition: 'all .12s' }}>
                  <Icon size={16} style={{ color: icon === id ? color : 'var(--t3)' }} />
                  <span style={{ fontSize: 10, color: icon === id ? color : 'var(--t3)', fontWeight: icon === id ? 700 : 400 }}>{label}</span>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label style={labelStyle}>Cor</label>
            <div style={{ display: 'flex', gap: 8 }}>
              {GOAL_COLORS.map((c) => (
                <button key={c} onClick={() => setColor(c)}
                  style={{ width: 28, height: 28, borderRadius: '50%', background: c, border: `2px solid ${color === c ? '#fff' : 'transparent'}`, cursor: 'pointer', transition: 'border .12s', outline: 'none' }} />
              ))}
            </div>
          </div>
        </div>

        <button
          onClick={handleSubmit}
          disabled={!name.trim() || !target}
          style={{ width: '100%', marginTop: 22, padding: '12px 0', borderRadius: 12, border: 'none', background: color, color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer', opacity: (!name.trim() || !target) ? 0.4 : 1, transition: 'opacity .15s' }}>
          {editing ? 'Salvar Meta' : 'Criar Meta'}
        </button>
      </motion.div>
    </motion.div>
  );
}
