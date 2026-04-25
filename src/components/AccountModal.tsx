import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiX, FiCamera, FiCheck, FiAlertTriangle, FiLock, FiUnlock, FiDatabase } from 'react-icons/fi';
import { useTaskStore } from '../store/tasks';
import { useAuthStore } from '../store/auth';
import { supabase } from '../lib/supabase';
import { DeleteDataModal } from './DeleteDataModal';
import type { Theme } from '../types';

interface Props {
  onClose: () => void;
  onOpenBackup?: () => void;
}

const THEMES: { id: Theme; label: string; bg: string; accent: string }[] = [
  { id: 'dark-blue',  label: 'Escuro', bg: '#080C18', accent: '#356BFF' },
  { id: 'light-soft', label: 'Claro',  bg: '#F2F2F7', accent: '#356BFF' },
];

const ACCENT_COLORS = [
  '#356BFF', '#64C4FF', '#5e5ce6', '#bf5af2',
  '#30d158', '#ff9f0a', '#ff453a', '#ff6b6b',
  '#0A84FF', '#34C759', '#FF9500', '#FF2D55',
];

const labelStyle: React.CSSProperties = {
  fontSize: 10, fontWeight: 700, letterSpacing: '1.5px',
  textTransform: 'uppercase', color: 'var(--t4)',
  marginBottom: 8, display: 'block',
};

export function AccountModal({ onClose, onOpenBackup }: Props) {
  const {
    userName, setUserName,
    userPhoto, setUserPhoto,
    accentColor, setAccentColor,
    theme, setTheme,
  } = useTaskStore();

  const { user, signOut, updatePassword } = useAuthStore();

  const [name, setName] = useState(userName);
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [newPwd, setNewPwd] = useState('');
  const [pwdMsg, setPwdMsg] = useState<{ text: string; ok: boolean } | null>(null);
  const [pwdLoading, setPwdLoading] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [saved, setSaved] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // PIN
  const [showPinForm, setShowPinForm] = useState(false);
  const [pinDigits, setPinDigits] = useState(['', '', '', '']);
  const [pinConfirm, setPinConfirm] = useState(['', '', '', '']);
  const [pinStep, setPinStep] = useState<'enter' | 'confirm'>('enter');
  const [pinMsg, setPinMsg] = useState<{ text: string; ok: boolean } | null>(null);
  const hasPin = !!localStorage.getItem('evo-tasks-pin');

  const handlePinDigit = (arr: string[], setArr: (v: string[]) => void, i: number, val: string) => {
    if (!/^\d?$/.test(val)) return;
    const next = [...arr]; next[i] = val; setArr(next);
    setPinMsg(null);
    if (val && i < 3) { setTimeout(() => (document.getElementById(`pin-${pinStep}-${i + 1}`) as HTMLInputElement)?.focus(), 0); }
    if (next.every(d => d !== '') && val) {
      if (pinStep === 'enter') { setPinStep('confirm'); setTimeout(() => (document.getElementById('pin-confirm-0') as HTMLInputElement)?.focus(), 80); }
      else {
        const entered = pinDigits.join('');
        const confirmed = next.join('');
        if (entered !== confirmed) { setPinMsg({ text: 'PINs não coincidem, tente novamente', ok: false }); setPinConfirm(['', '', '', '']); setPinStep('enter'); setPinDigits(['', '', '', '']); setTimeout(() => (document.getElementById('pin-enter-0') as HTMLInputElement)?.focus(), 80); }
        else { localStorage.setItem('evo-tasks-pin', entered); setPinMsg({ text: 'PIN definido com sucesso!', ok: true }); setTimeout(() => { setShowPinForm(false); setPinDigits(['', '', '', '']); setPinConfirm(['', '', '', '']); setPinStep('enter'); setPinMsg(null); }, 1500); }
      }
    }
  };

  const handlePinKeyDown = (arr: string[], i: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !arr[i] && i > 0) { (document.getElementById(`pin-${pinStep}-${i - 1}`) as HTMLInputElement)?.focus(); }
  };

  const handleRemovePin = () => { localStorage.removeItem('evo-tasks-pin'); setPinMsg({ text: 'PIN removido', ok: true }); setTimeout(() => setPinMsg(null), 1500); };

  const handleSaveName = () => {
    const trimmed = name.trim() || 'Usuário';
    setUserName(trimmed);
    supabase.auth.updateUser({ data: { displayName: trimmed } }).catch(console.error);
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      // ⚠️ Foto fica APENAS no localStorage. NUNCA salvar em user_metadata
      // do Supabase auth — isso vai pro JWT toda hora e causa header > 8KB
      // que o Cloudflare rejeita com 520. (incidente 2026-04-25)
      setUserPhoto(dataUrl);
    };
    reader.readAsDataURL(file);
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwdLoading(true);
    setPwdMsg(null);
    await updatePassword(newPwd);
    const err = useAuthStore.getState().error;
    setPwdMsg(err ? { text: err, ok: false } : { text: 'Senha atualizada!', ok: true });
    setPwdLoading(false);
    if (!err) { setNewPwd(''); setTimeout(() => setShowPasswordForm(false), 1500); }
  };


  const initials = (userName || name || 'U').charAt(0).toUpperCase();

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-50 flex items-center justify-center"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      >
        <motion.div className="absolute inset-0 bg-black/60 glass-backdrop" onClick={onClose} />

        <motion.div
          className="relative z-10 w-full mx-4 rounded-[20px] overflow-hidden shadow-2xl glass-panel"
          style={{ background: 'var(--modal-bg)', maxWidth: 480, maxHeight: '90vh', overflowY: 'auto' }}
          initial={{ scale: 0.92, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.92, opacity: 0, y: 20 }}
          transition={{ type: 'spring', damping: 26, stiffness: 320 }}
        >
          <div style={{ height: 3, background: accentColor, opacity: 0.9 }} />

          <div style={{ padding: '20px 24px 28px', display: 'flex', flexDirection: 'column', gap: 24 }}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 16, fontWeight: 700, color: 'var(--t1)' }}>Conta</span>
              <button onClick={onClose} style={{ background: 'var(--s1)', border: 'none', cursor: 'pointer', color: 'var(--t3)', padding: 8, borderRadius: 8, display: 'flex', transition: 'all .15s' }}
                onMouseEnter={e => (e.currentTarget.style.background = 'var(--s2)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'var(--s1)')}>
                <FiX size={16} />
              </button>
            </div>

            {/* Avatar + Name */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
              <div style={{ position: 'relative', flexShrink: 0 }}>
                <div style={{
                  width: 72, height: 72, borderRadius: '50%',
                  background: userPhoto ? 'transparent' : `linear-gradient(135deg, ${accentColor}, #64C4FF)`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  overflow: 'hidden',
                  boxShadow: `0 4px 16px ${accentColor}50`,
                }}>
                  {userPhoto
                    ? <img src={userPhoto} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    : <span style={{ fontSize: 28, fontWeight: 700, color: '#fff' }}>{initials}</span>
                  }
                </div>
                <button
                  onClick={() => fileRef.current?.click()}
                  style={{
                    position: 'absolute', bottom: 0, right: 0,
                    width: 24, height: 24, borderRadius: '50%',
                    background: 'var(--modal-bg)', border: 'none', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.3)', color: 'var(--t2)',
                    transition: 'color .15s',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.color = accentColor)}
                  onMouseLeave={e => (e.currentTarget.style.color = 'var(--t2)')}
                >
                  <FiCamera size={11} />
                </button>
                <input ref={fileRef} type="file" accept="image/*" onChange={handlePhotoUpload} style={{ display: 'none' }} />
              </div>

              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 6 }}>
                <span style={labelStyle}>Nome de exibição</span>
                <div style={{ display: 'flex', gap: 6 }}>
                  <input
                    value={name}
                    onChange={e => setName(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') handleSaveName(); }}
                    placeholder="Seu nome"
                    style={{ flex: 1, background: 'var(--ib)', border: '1px solid var(--b2)', borderRadius: 8, padding: '8px 12px', color: 'var(--t1)', fontSize: 13, outline: 'none' }}
                  />
                  <button onClick={handleSaveName} style={{
                    padding: '8px 14px', borderRadius: 8, border: 'none', cursor: 'pointer',
                    background: saved ? 'rgba(48,209,88,0.2)' : `${accentColor}20`,
                    color: saved ? '#30d158' : accentColor,
                    fontSize: 12, fontWeight: 600, transition: 'all .15s',
                  }}>
                    {saved ? <FiCheck size={13} /> : 'Salvar'}
                  </button>
                </div>
              </div>
            </div>

            {/* Email */}
            {user && (
              <div>
                <span style={labelStyle}>E-mail</span>
                <div style={{ padding: '8px 12px', background: 'var(--s1)', borderRadius: 8, fontSize: 13, color: 'var(--t3)' }}>
                  {user.email}
                </div>
              </div>
            )}

            {/* Password */}
            {user && (
              <div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: showPasswordForm ? 10 : 0 }}>
                  <span style={{ ...labelStyle, marginBottom: 0 }}>Senha</span>
                  <button
                    onClick={() => setShowPasswordForm(v => !v)}
                    style={{ fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 999, background: `${accentColor}15`, color: accentColor, border: 'none', cursor: 'pointer' }}
                  >
                    {showPasswordForm ? 'Cancelar' : 'Trocar senha'}
                  </button>
                </div>
                {showPasswordForm && (
                  <form onSubmit={handleChangePassword} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <input
                      type="password" value={newPwd} onChange={e => setNewPwd(e.target.value)}
                      required minLength={6} placeholder="Nova senha (mín. 6 caracteres)" autoFocus
                      style={{ background: 'var(--ib)', border: '1px solid var(--b2)', borderRadius: 8, padding: '8px 12px', color: 'var(--t1)', fontSize: 12, outline: 'none' }}
                    />
                    {pwdMsg && (
                      <div style={{ fontSize: 11, color: pwdMsg.ok ? '#30d158' : '#ff453a', display: 'flex', alignItems: 'center', gap: 5 }}>
                        {pwdMsg.ok && <FiCheck size={11} />} {pwdMsg.text}
                      </div>
                    )}
                    <button type="submit" disabled={pwdLoading} style={{
                      padding: '8px', borderRadius: 8, border: 'none',
                      background: accentColor, color: '#fff', fontSize: 12, fontWeight: 600,
                      cursor: pwdLoading ? 'not-allowed' : 'pointer', opacity: pwdLoading ? 0.6 : 1,
                    }}>
                      {pwdLoading ? 'Salvando...' : 'Salvar senha'}
                    </button>
                  </form>
                )}
              </div>
            )}

            {/* PIN */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: showPinForm ? 12 : 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                  <span style={{ ...labelStyle, marginBottom: 0 }}>PIN de bloqueio</span>
                  {hasPin && !showPinForm && (
                    <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.5px', textTransform: 'uppercase', color: '#30d158', background: 'rgba(48,209,88,0.12)', borderRadius: 4, padding: '1px 6px' }}>Ativo</span>
                  )}
                </div>
                <div style={{ display: 'flex', gap: 6 }}>
                  {hasPin && !showPinForm && (
                    <button onClick={handleRemovePin} style={{ fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 999, background: 'rgba(255,69,58,0.1)', color: '#ff453a', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
                      <FiUnlock size={10} /> Remover
                    </button>
                  )}
                  <button
                    onClick={() => { setShowPinForm(v => !v); setPinDigits(['', '', '', '']); setPinConfirm(['', '', '', '']); setPinStep('enter'); setPinMsg(null); }}
                    style={{ fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 999, background: `${accentColor}15`, color: accentColor, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}
                  >
                    <FiLock size={10} /> {showPinForm ? 'Cancelar' : hasPin ? 'Trocar PIN' : 'Definir PIN'}
                  </button>
                </div>
              </div>

              {pinMsg && !showPinForm && (
                <div style={{ fontSize: 11, color: pinMsg.ok ? '#30d158' : '#ff453a', display: 'flex', alignItems: 'center', gap: 5, marginTop: 4 }}>
                  {pinMsg.ok && <FiCheck size={11} />} {pinMsg.text}
                </div>
              )}

              {showPinForm && (
                <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  <div style={{ fontSize: 11, color: 'var(--t3)' }}>
                    {pinStep === 'enter' ? 'Digite um PIN de 4 dígitos:' : 'Confirme o PIN:'}
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    {(pinStep === 'enter' ? pinDigits : pinConfirm).map((d, i) => (
                      <input
                        key={`${pinStep}-${i}`}
                        id={`pin-${pinStep}-${i}`}
                        type="password"
                        inputMode="numeric"
                        maxLength={1}
                        value={d}
                        autoFocus={i === 0}
                        onChange={e => pinStep === 'enter'
                          ? handlePinDigit(pinDigits, setPinDigits, i, e.target.value)
                          : handlePinDigit(pinConfirm, setPinConfirm, i, e.target.value)
                        }
                        onKeyDown={e => handlePinKeyDown(pinStep === 'enter' ? pinDigits : pinConfirm, i, e)}
                        style={{
                          width: 44, height: 48, textAlign: 'center', fontSize: 18, fontWeight: 700,
                          background: 'var(--ib)', border: '1.5px solid var(--b2)', borderRadius: 10,
                          color: 'var(--t1)', outline: 'none', transition: 'border-color .15s',
                        }}
                        onFocus={e => (e.currentTarget.style.borderColor = accentColor)}
                        onBlur={e => (e.currentTarget.style.borderColor = 'var(--b2)')}
                      />
                    ))}
                  </div>
                  {pinMsg && (
                    <div style={{ fontSize: 11, color: pinMsg.ok ? '#30d158' : '#ff453a', display: 'flex', alignItems: 'center', gap: 5 }}>
                      {pinMsg.ok && <FiCheck size={11} />} {pinMsg.text}
                    </div>
                  )}
                </motion.div>
              )}
            </div>

            {/* Theme */}
            <div>
              <span style={labelStyle}>Tema padrão</span>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {THEMES.map(t => (
                  <button key={t.id} onClick={() => setTheme(t.id)} style={{
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
                    padding: '10px 14px', borderRadius: 12, border: theme === t.id ? `2px solid ${accentColor}` : '2px solid transparent',
                    background: theme === t.id ? `${accentColor}15` : 'var(--s1)',
                    cursor: 'pointer', transition: 'all .15s',
                  }}>
                    <div style={{ width: 32, height: 20, borderRadius: 6, background: t.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <div style={{ width: 8, height: 8, borderRadius: '50%', background: t.accent }} />
                    </div>
                    <span style={{ fontSize: 10, fontWeight: 600, color: theme === t.id ? accentColor : 'var(--t3)', whiteSpace: 'nowrap' }}>
                      {t.label}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Accent color */}
            <div>
              <span style={labelStyle}>Cor de destaque</span>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {ACCENT_COLORS.map(c => (
                  <button key={c} onClick={() => setAccentColor(c)} style={{
                    width: 26, height: 26, borderRadius: '50%', background: c,
                    border: accentColor === c ? '3px solid var(--t1)' : '3px solid transparent',
                    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    transition: 'transform .15s', flexShrink: 0,
                  }}
                    onMouseEnter={e => ((e.currentTarget as HTMLElement).style.transform = 'scale(1.15)')}
                    onMouseLeave={e => ((e.currentTarget as HTMLElement).style.transform = 'none')}
                  >
                    {accentColor === c && <FiCheck size={10} color="#fff" strokeWidth={3} />}
                  </button>
                ))}
              </div>
              <div style={{ marginTop: 10, padding: '10px 14px', background: `${accentColor}15`, borderRadius: 10, display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 28, height: 28, borderRadius: '50%', background: `linear-gradient(135deg, ${accentColor}, #64C4FF)`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: '#fff' }}>{initials}</span>
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--t1)' }}>{name || 'Usuário'}</div>
                  <div style={{ fontSize: 10, color: accentColor, marginTop: 2 }}>Prévia da cor de destaque</div>
                </div>
                <div style={{ padding: '4px 12px', borderRadius: 8, background: accentColor, fontSize: 11, fontWeight: 600, color: '#fff' }}>
                  Botão
                </div>
              </div>
            </div>

            {/* Backup & Data */}
            {onOpenBackup && (
              <div>
                <span style={labelStyle}>Dados & Backup</span>
                <button
                  onClick={onOpenBackup}
                  style={{
                    width: '100%', display: 'flex', alignItems: 'center', gap: 10,
                    padding: '12px 14px', borderRadius: 12, border: 'none', cursor: 'pointer',
                    background: `${accentColor}10`, transition: 'background .15s',
                    textAlign: 'left',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = `${accentColor}20`)}
                  onMouseLeave={e => (e.currentTarget.style.background = `${accentColor}10`)}
                >
                  <div style={{ width: 32, height: 32, borderRadius: 8, background: `${accentColor}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <FiDatabase size={14} style={{ color: accentColor }} />
                  </div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--t1)', marginBottom: 1 }}>Exportar / Importar / Perfis</div>
                    <div style={{ fontSize: 11, color: 'var(--t4)' }}>Backup JSON e perfis salvos localmente</div>
                  </div>
                </button>
              </div>
            )}

            {/* Danger zone */}
            <div style={{ paddingTop: 8 }}>
              <span style={{ ...labelStyle, color: '#ff453a' }}>Zona de Perigo</span>
              <div style={{ padding: 14, background: 'rgba(255,69,58,0.06)', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--t1)', marginBottom: 2 }}>Apagar dados</div>
                  <div style={{ fontSize: 11, color: 'var(--t4)' }}>
                    Escolha categorias pra remover local e remotamente
                  </div>
                </div>
                <button onClick={() => setShowDeleteModal(true)} style={{
                  display: 'flex', alignItems: 'center', gap: 5,
                  padding: '6px 14px', borderRadius: 8, background: 'rgba(255,69,58,0.12)', border: '1px solid rgba(255,69,58,0.25)',
                  color: '#ff453a', fontSize: 11, fontWeight: 600, cursor: 'pointer', flexShrink: 0,
                  transition: 'background .15s',
                }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,69,58,0.22)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255,69,58,0.12)')}
                >
                  <FiAlertTriangle size={12} /> Escolher o que apagar
                </button>
              </div>

              {user && (
                <button onClick={() => { signOut(); onClose(); }} style={{
                  width: '100%', marginTop: 8, padding: '10px', borderRadius: 10, background: 'transparent', border: 'none',
                  color: '#ff453a', fontSize: 13, fontWeight: 500, cursor: 'pointer', transition: 'background .15s',
                }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,69,58,0.08)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                >
                  Sair da conta
                </button>
              )}
            </div>
          </div>
        </motion.div>
      </motion.div>

      {showDeleteModal && <DeleteDataModal onClose={() => setShowDeleteModal(false)} />}
    </AnimatePresence>
  );
}
