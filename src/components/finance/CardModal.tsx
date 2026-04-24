import { useState } from 'react';
import { motion } from 'framer-motion';
import { FiX, FiCreditCard } from 'react-icons/fi';
import { useCardsStore } from '../../store/cards';
import { useTaskStore } from '../../store/tasks';
import type { Card, CardBrand } from '../../types';

const BRANDS: { id: CardBrand; label: string }[] = [
  { id: 'visa',       label: 'VISA' },
  { id: 'mastercard', label: 'Mastercard' },
  { id: 'amex',       label: 'Amex' },
  { id: 'elo',        label: 'Elo' },
  { id: 'hipercard',  label: 'Hipercard' },
  { id: 'paypal',     label: 'PayPal' },
  { id: 'nubank',     label: 'Nubank' },
  { id: 'outro',      label: 'Outro' },
];

const PRESET_COLORS = [
  '#356BFF', '#5856D6', '#af52de', '#ff375f',
  '#ff9500', '#30d158', '#64d2ff', '#1a1a1a',
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
  editing?: Card;
}

export function CardModal({ onClose, editing }: Props) {
  const { addCard, updateCard } = useCardsStore();
  const { accentColor } = useTaskStore();

  const [brand, setBrand]   = useState<CardBrand>(editing?.brand ?? 'visa');
  const [last4, setLast4]   = useState(editing?.last4 ?? '');
  const [holder, setHolder] = useState(editing?.holder ?? '');
  const [expiry, setExpiry] = useState(editing?.expiry ?? '');
  const [color, setColor]   = useState(editing?.color ?? accentColor);

  const handleSubmit = () => {
    if (last4.length !== 4 || !holder.trim()) return;
    const data = { brand, last4, holder: holder.trim(), expiry: expiry.trim(), color };
    if (editing) updateCard(editing.id, data);
    else addCard(data);
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
        style={{ width: 440, background: 'var(--modal-bg)', borderRadius: 18, padding: 24, boxShadow: '0 24px 80px rgba(0,0,0,0.45)' }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 32, height: 32, borderRadius: 10, background: `${accentColor}20`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <FiCreditCard size={16} style={{ color: accentColor }} />
            </div>
            <span style={{ fontSize: 16, fontWeight: 700, color: 'var(--t1)' }}>{editing ? 'Editar Cartão' : 'Novo Cartão'}</span>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--t4)', padding: 4 }}><FiX size={16} /></button>
        </div>

        {/* Preview */}
        <div style={{
          position: 'relative', height: 120, borderRadius: 14, padding: 16, marginBottom: 18,
          background: `linear-gradient(135deg, ${color}, ${color}aa)`,
          boxShadow: `0 18px 50px -12px ${color}66, 0 0 40px -10px ${color}55`,
          color: '#fff', overflow: 'hidden',
        }}>
          <div style={{ position: 'absolute', top: -30, right: -20, width: 140, height: 140, borderRadius: '50%', background: 'rgba(255,255,255,0.08)' }} />
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase', opacity: 0.85 }}>
            {BRANDS.find(b => b.id === brand)?.label}
          </div>
          <div style={{ marginTop: 28, fontSize: 16, fontFamily: 'ui-monospace, monospace', letterSpacing: '2px' }}>
            •••• •••• •••• {last4 || '••••'}
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: 14 }}>
            <div style={{ fontSize: 11, opacity: 0.85 }}>{holder || 'NOME DO TITULAR'}</div>
            <div style={{ fontSize: 11, opacity: 0.85 }}>{expiry || 'MM/AA'}</div>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label style={labelStyle}>Bandeira</label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6 }}>
              {BRANDS.map((b) => (
                <button key={b.id} onClick={() => setBrand(b.id)}
                  style={{
                    padding: '8px 6px', borderRadius: 8,
                    border: `1px solid ${brand === b.id ? accentColor : 'var(--b2)'}`,
                    background: brand === b.id ? `${accentColor}18` : 'transparent',
                    color: brand === b.id ? accentColor : 'var(--t3)',
                    fontSize: 11, fontWeight: 600, cursor: 'pointer', transition: 'all .12s',
                  }}>
                  {b.label}
                </button>
              ))}
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={labelStyle}>Últimos 4 dígitos</label>
              <input style={inputStyle} placeholder="0000" maxLength={4} value={last4}
                onChange={e => setLast4(e.target.value.replace(/\D/g, '').slice(0, 4))} />
            </div>
            <div>
              <label style={labelStyle}>Validade</label>
              <input style={inputStyle} placeholder="MM/AA" maxLength={5} value={expiry}
                onChange={(e) => {
                  let v = e.target.value.replace(/\D/g, '').slice(0, 4);
                  if (v.length >= 3) v = v.slice(0, 2) + '/' + v.slice(2);
                  setExpiry(v);
                }} />
            </div>
          </div>

          <div>
            <label style={labelStyle}>Titular</label>
            <input style={inputStyle} placeholder="Nome impresso no cartão" value={holder}
              onChange={e => setHolder(e.target.value.toUpperCase())} />
          </div>

          <div>
            <label style={labelStyle}>Cor</label>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {PRESET_COLORS.map((c) => (
                <button key={c} onClick={() => setColor(c)}
                  style={{
                    width: 30, height: 30, borderRadius: 8,
                    background: `linear-gradient(135deg, ${c}, ${c}aa)`,
                    border: color === c ? '2px solid var(--t1)' : '2px solid transparent',
                    cursor: 'pointer', padding: 0,
                  }} />
              ))}
              <label style={{ width: 30, height: 30, borderRadius: 8, border: '2px dashed var(--b3)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', overflow: 'hidden', position: 'relative' }}>
                <span style={{ fontSize: 10, color: 'var(--t3)' }}>+</span>
                <input type="color" value={color} onChange={e => setColor(e.target.value)}
                  style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer' }} />
              </label>
            </div>
          </div>
        </div>

        <button
          onClick={handleSubmit}
          disabled={last4.length !== 4 || !holder.trim()}
          style={{ width: '100%', marginTop: 22, padding: '12px 0', borderRadius: 12, border: 'none', background: accentColor, color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer', opacity: (last4.length !== 4 || !holder.trim()) ? 0.4 : 1, transition: 'opacity .15s' }}>
          {editing ? 'Salvar Cartão' : 'Adicionar Cartão'}
        </button>
      </motion.div>
    </motion.div>
  );
}
