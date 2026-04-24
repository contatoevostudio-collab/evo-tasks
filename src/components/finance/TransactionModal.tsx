import { useState } from 'react';
import { motion } from 'framer-motion';
import { FiX } from 'react-icons/fi';
import { format } from 'date-fns';
import { useFinanceStore } from '../../store/finance';
import type { TransactionType, TransactionStatus } from '../../types';

const RECEITA_CATEGORIES = ['Salário', 'Freelance', 'Investimentos', 'Venda', 'Presente', 'Outros'];
const DESPESA_CATEGORIES = ['Alimentação', 'Transporte', 'Moradia', 'Saúde', 'Lazer', 'Educação', 'Tecnologia', 'Serviços', 'Assinaturas', 'Outros'];

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
  initialType?: TransactionType;
}

export function TransactionModal({ onClose, initialType = 'despesa' }: Props) {
  const { addTransaction } = useFinanceStore();
  const [type, setType] = useState<TransactionType>(initialType);
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('');
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [status, setStatus] = useState<TransactionStatus>('pago');

  const categories = type === 'receita' ? RECEITA_CATEGORIES : DESPESA_CATEGORIES;
  const accentColor = type === 'receita' ? '#30d158' : '#ff453a';

  const handleSubmit = () => {
    if (!description.trim() || !amount || !category) return;
    addTransaction({
      type,
      description: description.trim(),
      category,
      amount: parseFloat(amount.replace(',', '.')),
      date,
      status,
    });
    onClose();
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      style={{ position: 'fixed', inset: 0, zIndex: 500, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.5)' }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="glass-panel"
        style={{ width: 420, background: 'var(--modal-bg)', borderRadius: 18, padding: 24, boxShadow: '0 24px 80px rgba(0,0,0,0.45)' }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 32, height: 32, borderRadius: 10, background: `${accentColor}20`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ fontSize: 16 }}>{type === 'receita' ? '↑' : '↓'}</span>
            </div>
            <span style={{ fontSize: 16, fontWeight: 700, color: 'var(--t1)' }}>Novo Lançamento</span>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--t4)', padding: 4, borderRadius: 6 }}>
            <FiX size={16} />
          </button>
        </div>

        {/* Type toggle */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 18, background: 'var(--s1)', borderRadius: 10, padding: 4 }}>
          {(['receita', 'despesa'] as TransactionType[]).map((t) => (
            <button key={t} onClick={() => { setType(t); setCategory(''); }}
              style={{ flex: 1, padding: '7px 0', borderRadius: 7, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600, transition: 'all .15s',
                background: type === t ? (t === 'receita' ? 'rgba(48,209,88,0.18)' : 'rgba(255,69,58,0.18)') : 'transparent',
                color: type === t ? (t === 'receita' ? '#30d158' : '#ff453a') : 'var(--t3)',
              }}>
              {t === 'receita' ? '↑ Receita' : '↓ Despesa'}
            </button>
          ))}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label style={labelStyle}>Descrição</label>
            <input style={inputStyle} placeholder="Ex: Salário, Aluguel..." value={description} onChange={e => setDescription(e.target.value)} autoFocus />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={labelStyle}>Valor (R$)</label>
              <input style={inputStyle} placeholder="0,00" type="number" min="0" step="0.01" value={amount} onChange={e => setAmount(e.target.value)} />
            </div>
            <div>
              <label style={labelStyle}>Data</label>
              <input style={{ ...inputStyle, colorScheme: 'dark' }} type="date" value={date} onChange={e => setDate(e.target.value)} />
            </div>
          </div>

          <div>
            <label style={labelStyle}>Categoria</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {categories.map((cat) => (
                <button key={cat} onClick={() => setCategory(cat)}
                  style={{ padding: '5px 12px', borderRadius: 99, fontSize: 11, fontWeight: category === cat ? 700 : 400, border: `1px solid ${category === cat ? accentColor : 'var(--b2)'}`, background: category === cat ? `${accentColor}18` : 'transparent', color: category === cat ? accentColor : 'var(--t3)', cursor: 'pointer', transition: 'all .12s' }}>
                  {cat}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label style={labelStyle}>Status</label>
            <div style={{ display: 'flex', gap: 6 }}>
              {([['pago', 'Pago', '#30d158'], ['pendente', 'Pendente', '#ff9f0a'], ['cancelado', 'Cancelado', '#636366']] as [TransactionStatus, string, string][]).map(([s, label, color]) => (
                <button key={s} onClick={() => setStatus(s)}
                  style={{ flex: 1, padding: '7px 0', borderRadius: 8, border: `1px solid ${status === s ? color : 'var(--b2)'}`, background: status === s ? `${color}18` : 'transparent', color: status === s ? color : 'var(--t3)', fontSize: 12, fontWeight: status === s ? 700 : 400, cursor: 'pointer', transition: 'all .12s' }}>
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <button
          onClick={handleSubmit}
          disabled={!description.trim() || !amount || !category}
          style={{ width: '100%', marginTop: 22, padding: '12px 0', borderRadius: 12, border: 'none', background: accentColor, color: '#fff', fontSize: 14, fontWeight: 700, cursor: 'pointer', opacity: (!description.trim() || !amount || !category) ? 0.4 : 1, transition: 'opacity .15s' }}>
          Adicionar Lançamento
        </button>
      </motion.div>
    </motion.div>
  );
}
