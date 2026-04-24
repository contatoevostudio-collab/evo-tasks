import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Props {
  userName: string;
  userPhoto: string;
  hasPin: boolean;
  onUnlock: () => void;
}

export function LockScreen({ userName, userPhoto, hasPin, onUnlock }: Props) {
  const [now, setNow]     = useState(new Date());
  const [digits, setDigits] = useState(['', '', '', '']);
  const [error, setError]   = useState(false);
  const [showPin, setShowPin] = useState(() => hasPin);
  const refs = [
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
  ];

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (showPin) setTimeout(() => refs[0].current?.focus(), 120);
  }, [showPin]);

  const handleEnter = () => {
    if (!hasPin) { onUnlock(); return; }
    setShowPin(true);
  };

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
    if (e.key === 'Escape') { setShowPin(false); setDigits(['', '', '', '']); setError(false); }
  };

  const timeStr = format(now, 'HH:mm');
  const dateStr = format(now, "EEEE, d 'de' MMMM", { locale: ptBR });
  const initials = userName ? userName.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2) : 'U';

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.4 }}
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        background: 'linear-gradient(160deg, #04080f 0%, #0a1228 40%, #080c1f 70%, #04080f 100%)',
        cursor: 'default',
        userSelect: 'none',
        overflow: 'hidden',
      }}
    >
      {/* Ambient glow orbs */}
      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: '15%', left: '20%', width: 400, height: 400, borderRadius: '50%', background: 'radial-gradient(circle, rgba(53,107,255,0.08) 0%, transparent 70%)', filter: 'blur(40px)' }} />
        <div style={{ position: 'absolute', bottom: '20%', right: '15%', width: 300, height: 300, borderRadius: '50%', background: 'radial-gradient(circle, rgba(100,196,255,0.06) 0%, transparent 70%)', filter: 'blur(40px)' }} />
      </div>

      {/* Clock */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1, duration: 0.5 }}
        style={{ textAlign: 'center', marginBottom: 8 }}
      >
        <div style={{
          fontSize: 88, fontWeight: 200, letterSpacing: '-4px',
          color: 'rgba(255,255,255,0.92)', lineHeight: 1,
          fontVariantNumeric: 'tabular-nums',
        }}>
          {timeStr}
        </div>
        <div style={{
          fontSize: 16, fontWeight: 400, letterSpacing: '0.5px',
          color: 'rgba(255,255,255,0.5)', marginTop: 8,
          textTransform: 'capitalize',
        }}>
          {dateStr}
        </div>
      </motion.div>

      {/* User + PIN area */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.5 }}
        style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14, marginTop: 48 }}
      >
        {/* Avatar */}
        <div style={{
          width: 72, height: 72, borderRadius: '50%',
          background: userPhoto ? 'transparent' : 'linear-gradient(135deg, #356BFF, #64C4FF)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 26, fontWeight: 700, color: '#fff',
          boxShadow: '0 0 0 3px rgba(255,255,255,0.12)',
          overflow: 'hidden', flexShrink: 0,
        }}>
          {userPhoto
            ? <img src={userPhoto} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            : initials
          }
        </div>

        <div style={{ fontSize: 17, fontWeight: 500, color: 'rgba(255,255,255,0.85)', letterSpacing: '-0.2px' }}>
          {userName || 'Usuário'}
        </div>

        <AnimatePresence mode="wait">
          {showPin ? (
            <motion.div
              key="pin"
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}
            >
              <div style={{ display: 'flex', gap: 10 }}>
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
                      width: 52, height: 60, textAlign: 'center',
                      fontSize: 22, fontWeight: 700,
                      background: error ? 'rgba(255,69,58,0.15)' : 'rgba(255,255,255,0.10)',
                      border: `1.5px solid ${error ? 'rgba(255,69,58,0.5)' : 'rgba(255,255,255,0.18)'}`,
                      borderRadius: 14, color: '#fff', outline: 'none',
                      backdropFilter: 'blur(8px)',
                      transition: 'border-color .2s, background .2s',
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
              <button
                onClick={() => { setShowPin(false); setDigits(['', '', '', '']); setError(false); }}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.35)', fontSize: 12, marginTop: 4, transition: 'color .15s' }}
                onMouseEnter={e => ((e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.6)')}
                onMouseLeave={e => ((e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.35)')}
              >
                Cancelar
              </button>
            </motion.div>
          ) : (
            <motion.button
              key="enter-btn"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              onClick={handleEnter}
              style={{
                marginTop: 8,
                padding: '9px 36px', borderRadius: 99,
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.12)',
                color: 'rgba(255,255,255,0.55)',
                fontSize: 13, fontWeight: 400, letterSpacing: '0.5px',
                cursor: 'pointer',
                backdropFilter: 'blur(20px) saturate(1.4)',
                WebkitBackdropFilter: 'blur(20px) saturate(1.4)',
                transition: 'background .2s, border-color .2s, color .2s',
              } as React.CSSProperties}
              onMouseEnter={e => {
                (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.10)';
                (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.22)';
                (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.80)';
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.05)';
                (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.12)';
                (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.55)';
              }}
            >
              {hasPin ? 'Inserir PIN' : 'Entrar'}
            </motion.button>
          )}
        </AnimatePresence>
      </motion.div>
    </motion.div>
  );
}
