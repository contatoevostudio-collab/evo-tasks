import { useState } from 'react';
import { motion } from 'framer-motion';
import { FiMail, FiLock, FiLoader, FiX } from 'react-icons/fi';
import { useAuthStore } from '../store/auth';

export function AuthModal({ onClose }: { onClose?: () => void }) {
  const { signIn, signUp, loading, error, clearError, setGuestMode } = useAuthStore();
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [signupDone, setSignupDone] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    if (mode === 'signin') {
      await signIn(email, password);
    } else {
      await signUp(email, password);
      if (!useAuthStore.getState().error) setSignupDone(true);
    }
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)',
    }}>
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        style={{
          position: 'relative',
          background: 'var(--modal-bg)',
          borderRadius: 20, padding: '36px 32px', width: 360,
          boxShadow: '0 30px 80px rgba(0,0,0,0.4)',
        }}
      >
        {/* Fechar (só quando aberto manualmente) */}
        {onClose && (
          <button
            onClick={onClose}
            style={{
              position: 'absolute', top: 16, right: 16,
              background: 'none', border: 'none', cursor: 'pointer',
              color: 'var(--t4)', padding: 4, borderRadius: 6,
              display: 'flex', transition: 'color .15s',
            }}
            onMouseEnter={e => ((e.currentTarget as HTMLElement).style.color = 'var(--t1)')}
            onMouseLeave={e => ((e.currentTarget as HTMLElement).style.color = 'var(--t4)')}
          >
            <FiX size={16} />
          </button>
        )}

        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{
            width: 48, height: 48, borderRadius: 14, margin: '0 auto 12px',
            background: 'linear-gradient(135deg, #356BFF, #64C4FF)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 8px 24px rgba(53,107,255,0.4)',
            fontSize: 22, fontWeight: 700, color: '#fff',
          }}>E</div>
          <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--t1)' }}>
            Evo<span style={{ fontWeight: 300, opacity: 0.5 }}> Tasks</span>
          </div>
          <div style={{ fontSize: 12, color: 'var(--t4)', marginTop: 4 }}>
            {mode === 'signin' ? 'Entre na sua conta' : 'Criar nova conta'}
          </div>
        </div>

        {signupDone ? (
          <div style={{ textAlign: 'center', padding: '12px 0' }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>✉️</div>
            <p style={{ fontSize: 13, color: 'var(--t2)', lineHeight: 1.6 }}>
              Conta criada! Verifique seu e-mail para confirmar antes de fazer login.
            </p>
            <button
              onClick={() => { setMode('signin'); setSignupDone(false); }}
              style={{ marginTop: 16, fontSize: 13, color: '#356BFF', background: 'none', border: 'none', cursor: 'pointer' }}
            >
              Ir para login
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--t3)', textTransform: 'uppercase', letterSpacing: '1px' }}>E-mail</span>
              <div style={{ position: 'relative' }}>
                <FiMail size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--t4)' }} />
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  autoFocus
                  placeholder="email@exemplo.com"
                  style={{
                    width: '100%', padding: '10px 12px 10px 36px', borderRadius: 10,
                    background: 'var(--s1)',
                    color: 'var(--t1)', fontSize: 13, outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
              </div>
            </label>

            <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--t3)', textTransform: 'uppercase', letterSpacing: '1px' }}>Senha</span>
              <div style={{ position: 'relative' }}>
                <FiLock size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--t4)' }} />
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  minLength={6}
                  placeholder="••••••••"
                  style={{
                    width: '100%', padding: '10px 12px 10px 36px', borderRadius: 10,
                    background: 'var(--s1)',
                    color: 'var(--t1)', fontSize: 13, outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
              </div>
            </label>

            {error && (
              <div style={{ fontSize: 12, color: '#ff453a', background: 'rgba(255,69,58,0.1)', padding: '8px 12px', borderRadius: 8 }}>
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              style={{
                marginTop: 4, padding: '11px', borderRadius: 12, border: 'none',
                background: loading ? 'rgba(53,107,255,0.5)' : '#356BFF',
                color: '#fff', fontSize: 14, fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                transition: 'opacity .15s',
              }}
            >
              {loading && <FiLoader size={14} style={{ animation: 'spin 1s linear infinite' }} />}
              {mode === 'signin' ? 'Entrar' : 'Criar conta'}
            </button>

            <button
              type="button"
              onClick={() => { clearError(); setMode(mode === 'signin' ? 'signup' : 'signin'); }}
              style={{ fontSize: 12, color: 'var(--t4)', background: 'none', border: 'none', cursor: 'pointer', marginTop: 4 }}
            >
              {mode === 'signin' ? 'Não tem conta? Cadastre-se' : 'Já tem conta? Faça login'}
            </button>

            {/* Divider */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '4px 0' }}>
              <div style={{ flex: 1, height: 1, background: 'var(--b2)' }} />
              <span style={{ fontSize: 11, color: 'var(--t4)' }}>ou</span>
              <div style={{ flex: 1, height: 1, background: 'var(--b2)' }} />
            </div>

            <button
              type="button"
              onClick={() => setGuestMode(true)}
              style={{
                padding: '10px', borderRadius: 12,
                background: 'var(--s2)',
                color: 'var(--t2)', fontSize: 13, fontWeight: 500, cursor: 'pointer',
                transition: 'color .15s',
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = 'var(--t1)'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'var(--t2)'; }}
            >
              Continuar como Convidado
            </button>
            <p style={{ fontSize: 11, color: 'var(--t4)', textAlign: 'center', margin: 0, lineHeight: 1.5 }}>
              Dados salvos apenas localmente — sem sincronização entre dispositivos.
            </p>
          </form>
        )}
      </motion.div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
