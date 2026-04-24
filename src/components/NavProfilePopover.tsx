import { useState } from 'react';
import { FiKey, FiLogOut, FiLogIn, FiX, FiCheck } from 'react-icons/fi';
import { useAuthStore } from '../store/auth';

interface Props {
  profilePos: { left: number; bottom: number };
  onClose: () => void;
  onLogin: () => void;
}

export function NavProfilePopover({ profilePos, onClose, onLogin }: Props) {
  const { user, signOut, updatePassword } = useAuthStore();
  const [view, setView] = useState<'menu' | 'password'>('menu');
  const [newPwd, setNewPwd] = useState('');
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMsg(null);
    await updatePassword(newPwd);
    const err = useAuthStore.getState().error;
    setMsg(err ? { text: err, ok: false } : { text: 'Senha atualizada!', ok: true });
    setLoading(false);
    if (!err) { setNewPwd(''); setTimeout(onClose, 1500); }
  };

  return (
    <div
      onMouseDown={e => e.stopPropagation()}
      style={{
        position: 'fixed', left: profilePos.left, bottom: profilePos.bottom,
        width: 220, background: 'var(--modal-bg)',
        borderRadius: 14, boxShadow: '0 12px 40px rgba(0,0,0,0.3)',
        zIndex: 9999, overflow: 'hidden',
      }}
    >
      {view === 'menu' ? (
        <>
          {user ? (
            <>
              <div style={{ padding: '12px 14px 8px' }}>
                <div style={{ fontSize: 10, color: 'var(--t4)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 3 }}>Conta</div>
                <div style={{ fontSize: 12, color: 'var(--t2)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {user.email}
                </div>
              </div>
              <button
                onClick={() => setView('password')}
                style={{
                  width: '100%', display: 'flex', alignItems: 'center', gap: 9,
                  padding: '10px 14px', background: 'transparent', border: 'none',
                  cursor: 'pointer', color: 'var(--t2)', fontSize: 13, transition: 'background .15s',
                }}
                onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'var(--s2)'}
                onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}
              >
                <FiKey size={13} /> Trocar senha
              </button>
              <button
                onClick={() => { signOut(); onClose(); }}
                style={{
                  width: '100%', display: 'flex', alignItems: 'center', gap: 9,
                  padding: '10px 14px', background: 'transparent', border: 'none',
                  cursor: 'pointer', color: '#ff453a', fontSize: 13, transition: 'background .15s',
                }}
                onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'rgba(255,69,58,0.08)'}
                onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}
              >
                <FiLogOut size={13} /> Sair
              </button>
            </>
          ) : (
            <button
              onClick={() => { onClose(); onLogin(); }}
              style={{
                width: '100%', display: 'flex', alignItems: 'center', gap: 9,
                padding: '12px 14px', background: 'transparent', border: 'none',
                cursor: 'pointer', color: '#356BFF', fontSize: 13, fontWeight: 600, transition: 'background .15s',
              }}
              onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'var(--s2)'}
              onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'transparent'}
            >
              <FiLogIn size={13} /> Fazer login
            </button>
          )}
        </>
      ) : (
        <form onSubmit={handleChangePassword} style={{ padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--t1)' }}>Nova senha</span>
            <button
              type="button"
              onClick={() => setView('menu')}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--t4)', display: 'flex' }}
            >
              <FiX size={13} />
            </button>
          </div>
          <input
            type="password"
            value={newPwd}
            onChange={e => setNewPwd(e.target.value)}
            required
            minLength={6}
            placeholder="Mínimo 6 caracteres"
            autoFocus
            style={{
              padding: '8px 10px', borderRadius: 8, border: '1px solid var(--b2)',
              background: 'var(--s1)', color: 'var(--t1)', fontSize: 12, outline: 'none',
            }}
          />
          {msg && (
            <div style={{ fontSize: 11, color: msg.ok ? '#30d158' : '#ff453a', display: 'flex', alignItems: 'center', gap: 5 }}>
              {msg.ok ? <FiCheck size={11} /> : null} {msg.text}
            </div>
          )}
          <button
            type="submit"
            disabled={loading}
            style={{
              padding: '8px', borderRadius: 8, border: 'none',
              background: '#356BFF', color: '#fff', fontSize: 12, fontWeight: 600,
              cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.6 : 1,
            }}
          >
            {loading ? 'Salvando...' : 'Salvar senha'}
          </button>
        </form>
      )}
    </div>
  );
}
