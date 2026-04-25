import { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';

interface Props {
  onUnlock: () => void;
}

export function PinModal({ onUnlock }: Props) {
  const [digits, setDigits] = useState(['', '', '', '']);
  const [error, setError] = useState(false);
  const refs = [
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
  ];

  useEffect(() => { refs[0].current?.focus(); }, []);

  const handleChange = (i: number, val: string) => {
    if (!/^\d?$/.test(val)) return;
    const next = [...digits];
    next[i] = val;
    setDigits(next);
    setError(false);
    if (val && i < 3) refs[i + 1].current?.focus();
    if (next.every(d => d !== '') && val) {
      const pin = next.join('');
      const stored = localStorage.getItem('evo-tasks-pin');
      if (pin === stored) {
        onUnlock();
      } else {
        setError(true);
        setDigits(['', '', '', '']);
        setTimeout(() => refs[0].current?.focus(), 50);
      }
    }
  };

  const handleKeyDown = (i: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !digits[i] && i > 0) {
      refs[i - 1].current?.focus();
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'rgba(0,0,0,0.85)', backdropFilter: 'blur(16px)',
      }}
    >
      <motion.div
        initial={{ scale: 0.92, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        transition={{ type: 'spring', damping: 26, stiffness: 320 }}
        style={{
          background: 'var(--modal-bg)',
          borderRadius: 24, padding: '40px 48px',
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 24,
          boxShadow: '0 40px 80px rgba(0,0,0,0.5)',
        }}
      >
        <div style={{ fontSize: 32 }}>🔐</div>
        <div style={{ textAlign: 'center' }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, color: 'var(--t1)', marginBottom: 4 }}>App bloqueado</h2>
          <p style={{ fontSize: 12, color: 'var(--t3)' }}>Digite seu PIN de 4 dígitos</p>
        </div>

        <div style={{ display: 'flex', gap: 12 }}>
          {digits.map((d, i) => (
            <input
              key={i}
              ref={refs[i]}
              type="password"
              inputMode="numeric"
              maxLength={1}
              value={d}
              onChange={e => handleChange(i, e.target.value)}
              onKeyDown={e => handleKeyDown(i, e)}
              style={{
                width: 48, height: 56, textAlign: 'center',
                fontSize: 20, fontWeight: 700,
                background: error ? 'rgba(255,69,58,0.1)' : 'var(--ib)',
                borderRadius: 12, color: 'var(--t1)',
                outline: 'none',
              }}
            />
          ))}
        </div>

        {error && (
          <motion.p
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            style={{ fontSize: 12, color: '#ff453a', fontWeight: 600 }}
          >
            PIN incorreto — tente novamente
          </motion.p>
        )}
      </motion.div>
    </motion.div>
  );
}
