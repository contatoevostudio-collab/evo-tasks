import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiX, FiEdit2, FiTrash2, FiPlus, FiCheck, FiDownload, FiUpload, FiLock, FiUnlock } from 'react-icons/fi';
import type { SubClient, Theme } from '../types';
import { useTaskStore } from '../store/tasks';

interface Props { onClose: () => void; }

const PRESET_COLORS = [
  '#30d158','#ff9f0a','#ff453a','#bf5af2','#636366',
  '#356BFF','#64C4FF','#ff6b6b','#ffd60a','#5e5ce6',
];

const SURFACE = 'var(--s1)';
const BORDER  = 'var(--b2)';

const THEMES: { id: Theme; label: string; bg: string; textColor: string }[] = [
  { id: 'dark-blue', label: 'Azul Escuro', bg: '#080C18', textColor: '#fff' },
  { id: 'dark-pure', label: 'Preto Puro',  bg: '#050505', textColor: '#fff' },
  { id: 'dark-warm', label: 'Dark Warm',   bg: '#0d0907', textColor: '#fff' },
  { id: 'light-soft', label: 'Claro Soft', bg: '#F2F2F7', textColor: '#000' },
  { id: 'light-pure', label: 'Branco Puro', bg: '#FFFFFF', textColor: '#000' },
];

function ColorPicker({ value, onChange }: { value: string; onChange: (c: string) => void }) {
  return (
    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 8 }}>
      {PRESET_COLORS.map(c => (
        <button key={c} onClick={() => onChange(c)} style={{
          width: 22, height: 22, borderRadius: '50%', background: c,
          border: value === c ? '2px solid #fff' : '2px solid transparent',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer', transition: 'transform .15s',
        }}
          onMouseEnter={e => ((e.currentTarget as HTMLElement).style.transform = 'scale(1.15)')}
          onMouseLeave={e => ((e.currentTarget as HTMLElement).style.transform = 'none')}
        >
          {value === c && <FiCheck size={10} color="#fff" />}
        </button>
      ))}
    </div>
  );
}

function SubRow({ sub, onUpdate, onDelete }: { sub: SubClient; onUpdate: (id: string, name: string) => void; onDelete: (id: string) => void }) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(sub.name);
  const save = () => { if (name.trim()) onUpdate(sub.id, name.trim()); setEditing(false); };
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 10px', borderRadius: 8, transition: 'background .15s' }}
      onMouseEnter={e => ((e.currentTarget as HTMLElement).style.background = 'var(--s1)')}
      onMouseLeave={e => ((e.currentTarget as HTMLElement).style.background = 'transparent')}
    >
      {editing ? (
        <input autoFocus value={name} onChange={e => setName(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') save(); if (e.key === 'Escape') { setName(sub.name); setEditing(false); } }}
          onBlur={save}
          style={{ flex: 1, fontSize: 13, background: 'var(--ib)', border: '1px solid var(--b3)', borderRadius: 6, padding: '4px 8px', color: 'var(--t1)', outline: 'none' }}
        />
      ) : (
        <span style={{ flex: 1, fontSize: 13, color: 'var(--t2)' }}>{sub.name}</span>
      )}
      <button onClick={() => setEditing(true)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--t4)', padding: 3, transition: 'color .15s' }}
        onMouseEnter={e => ((e.currentTarget as HTMLElement).style.color = '#64C4FF')}
        onMouseLeave={e => ((e.currentTarget as HTMLElement).style.color = 'var(--t4)')}
      ><FiEdit2 size={11} /></button>
      <button onClick={() => onDelete(sub.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--t4)', padding: 3, transition: 'color .15s' }}
        onMouseEnter={e => ((e.currentTarget as HTMLElement).style.color = '#ff453a')}
        onMouseLeave={e => ((e.currentTarget as HTMLElement).style.color = 'var(--t4)')}
      ><FiTrash2 size={11} /></button>
    </div>
  );
}

export function SettingsModal({ onClose }: Props) {
  const {
    companies, subClients, tasks, leads,
    addCompany, updateCompany, deleteCompany,
    addSubClient, updateSubClient, deleteSubClient,
    theme, setTheme, replaceAll,
  } = useTaskStore();

  const [selectedId,   setSelectedId]   = useState<string>(companies[0]?.id ?? '');
  const [newName,      setNewName]      = useState('');
  const [newColor,     setNewColor]     = useState(PRESET_COLORS[5]);
  const [showNew,      setShowNew]      = useState(false);
  const [newSub,       setNewSub]       = useState('');
  const [showNewSub,   setShowNewSub]   = useState(false);
  const [activeTab,    setActiveTab]    = useState<'empresas' | 'aparencia' | 'dados' | 'seguranca'>('empresas');
  const [importError,  setImportError]  = useState('');
  const [importOk,     setImportOk]    = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const selected    = companies.find(c => c.id === selectedId);
  const companySubs = subClients.filter(s => !s.deletedAt && s.companyId === selectedId);

  const addCo  = () => { const n = newName.trim().toUpperCase(); if (!n) return; addCompany({ name: n, color: newColor }); setNewName(''); setShowNew(false); };
  const addSub = () => { const n = newSub.trim(); if (!n || !selectedId) return; addSubClient({ name: n, companyId: selectedId }); setNewSub(''); setShowNewSub(false); };

  // #58 — export JSON (include leads so they survive backup/restore)
  const handleExport = () => {
    const data = { companies, subClients, tasks, leads, exportedAt: new Date().toISOString() };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `evo-tasks-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // #59 — import JSON (use replaceAll via store instead of writing localStorage directly,
  // which could corrupt hydration if fields are missing or version mismatches)
  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportError('');
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const parsed = JSON.parse(ev.target?.result as string);
        if (!parsed.companies || !parsed.subClients || !parsed.tasks) {
          setImportError('Arquivo inválido — faltam campos obrigatórios.');
          return;
        }
        replaceAll({
          companies: parsed.companies,
          subClients: parsed.subClients,
          tasks: parsed.tasks,
          leads: parsed.leads ?? [],
        });
        setImportOk(true);
        setTimeout(() => window.location.reload(), 1200);
      } catch {
        setImportError('Erro ao ler o arquivo JSON.');
      }
    };
    reader.readAsText(file);
  };

  // .ics export
  const handleIcsExport = () => {
    const lines = [
      'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//EvoTasks//EN', 'CALSCALE:GREGORIAN',
    ];
    tasks.filter(t => !t.inbox && !t.deletedAt).forEach(t => {
      const sub = subClients.find(s => s.id === t.subClientId);
      const comp = companies.find(c => c.id === t.companyId);
      const dateStr = t.date.replace(/-/g, '');
      const title = `[${comp?.name ?? '?'}] ${sub?.name ?? '?'} [${t.taskType.toUpperCase()}]`;
      lines.push('BEGIN:VEVENT');
      lines.push(`UID:${t.id}@evotasks`);
      lines.push(`DTSTART;VALUE=DATE:${dateStr}`);
      lines.push(`DTEND;VALUE=DATE:${dateStr}`);
      lines.push(`SUMMARY:${title}`);
      if (t.notes) lines.push(`DESCRIPTION:${t.notes.replace(/\n/g, '\\n')}`);
      lines.push('END:VEVENT');
    });
    lines.push('END:VCALENDAR');
    const blob = new Blob([lines.join('\r\n')], { type: 'text/calendar' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url;
    a.download = `evo-tasks-${new Date().toISOString().slice(0, 10)}.ics`; a.click();
    URL.revokeObjectURL(url);
  };

  // PIN management
  const [pinInput, setPinInput] = useState('');
  const [pinConfirm, setPinConfirm] = useState('');
  const [pinMsg, setPinMsg] = useState('');
  const storedPin = localStorage.getItem('evo-tasks-pin');

  const handleSetPin = () => {
    if (!/^\d{4}$/.test(pinInput)) { setPinMsg('PIN deve ter exatamente 4 dígitos.'); return; }
    if (pinInput !== pinConfirm) { setPinMsg('PINs não coincidem.'); return; }
    localStorage.setItem('evo-tasks-pin', pinInput);
    setPinInput(''); setPinConfirm(''); setPinMsg('PIN definido com sucesso!');
  };
  const handleRemovePin = () => {
    localStorage.removeItem('evo-tasks-pin');
    setPinMsg('PIN removido.');
  };

  const tabBtn = (id: typeof activeTab, label: string) => (
    <button onClick={() => setActiveTab(id)} style={{
      padding: '8px 16px', borderRadius: 8, fontSize: 12, fontWeight: activeTab === id ? 600 : 400,
      background: activeTab === id ? 'rgba(53,107,255,0.15)' : 'transparent',
      border: `1px solid ${activeTab === id ? 'rgba(53,107,255,0.3)' : 'transparent'}`,
      color: activeTab === id ? '#64C4FF' : 'var(--t3)',
      cursor: 'pointer', transition: 'all .15s',
    }}>
      {label}
    </button>
  );

  return (
    <AnimatePresence>
      <motion.div style={{ position: 'fixed', inset: 0, zIndex: 60, display: 'flex', alignItems: 'center', justifyContent: 'center' }} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
        <motion.div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)' }} onClick={onClose} />
        <motion.div
          style={{ position: 'relative', zIndex: 10, width: '100%', maxWidth: 680, margin: '0 16px', borderRadius: 20, overflow: 'hidden', maxHeight: '85vh', display: 'flex', flexDirection: 'column', background: 'var(--modal-bg)', border: '1px solid var(--b3)', boxShadow: '0 40px 100px rgba(0,0,0,0.4)' }}
          initial={{ scale: 0.94, opacity: 0, y: 16 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.94, opacity: 0, y: 16 }}
          transition={{ type: 'spring', damping: 26, stiffness: 320 }}
        >
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 22px', borderBottom: `1px solid ${BORDER}`, flexShrink: 0 }}>
            <div>
              <h2 style={{ fontSize: 15, fontWeight: 700, color: 'var(--t1)' }}>Configurações</h2>
              <p style={{ fontSize: 12, color: 'var(--t3)', marginTop: 2 }}>Gerencie empresas, aparência e dados</p>
            </div>
            <button onClick={onClose} style={{ background: SURFACE, border: 'none', borderRadius: 8, padding: 8, cursor: 'pointer', color: 'var(--t2)', transition: 'all .15s' }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--s2)'; (e.currentTarget as HTMLElement).style.color = 'var(--t1)'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = SURFACE; (e.currentTarget as HTMLElement).style.color = 'var(--t2)'; }}
            >
              <FiX size={16} />
            </button>
          </div>

          {/* Tabs */}
          <div style={{ display: 'flex', gap: 6, padding: '12px 22px', borderBottom: `1px solid ${BORDER}`, flexShrink: 0 }}>
            {tabBtn('empresas',   'Empresas')}
            {tabBtn('aparencia',  'Aparência')}
            {tabBtn('dados',      'Dados')}
            {tabBtn('seguranca',  'Segurança')}
          </div>

          {/* Body */}
          <div style={{ flex: 1, overflowY: 'auto' }}>

            {/* ─── EMPRESAS TAB ─── */}
            {activeTab === 'empresas' && (
              <div style={{ display: 'flex', flex: 1, overflow: 'hidden', height: '100%' }}>
                {/* Left */}
                <div style={{ width: 240, flexShrink: 0, borderRight: `1px solid ${BORDER}`, display: 'flex', flexDirection: 'column' }}>
                  <div style={{ flex: 1, overflowY: 'auto', padding: '10px 8px' }}>
                    <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase', color: 'var(--t4)', padding: '0 8px', marginBottom: 6 }}>Empresas</div>
                    {companies.filter(c => !c.deletedAt).map(c => (
                      <button key={c.id} onClick={() => setSelectedId(c.id)} style={{
                        width: '100%', display: 'flex', alignItems: 'center', gap: 9, padding: '9px 10px', borderRadius: 10, marginBottom: 2,
                        background: selectedId === c.id ? `${c.color}18` : 'transparent',
                        border: `1px solid ${selectedId === c.id ? `${c.color}40` : 'transparent'}`,
                        cursor: 'pointer', transition: 'all .15s',
                      }}>
                        <div style={{ width: 9, height: 9, borderRadius: '50%', background: c.color, flexShrink: 0 }} />
                        <span style={{ flex: 1, fontSize: 13, fontWeight: selectedId === c.id ? 600 : 400, color: selectedId === c.id ? 'var(--t1)' : 'var(--t2)', textAlign: 'left' }}>{c.name}</span>
                        <button onClick={e => { e.stopPropagation(); deleteCompany(c.id); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--t4)', padding: 3, borderRadius: 4 }}
                          onMouseEnter={e => ((e.currentTarget as HTMLElement).style.color = '#ff453a')}
                          onMouseLeave={e => ((e.currentTarget as HTMLElement).style.color = 'var(--t4)')}
                        ><FiTrash2 size={10} /></button>
                      </button>
                    ))}
                  </div>
                  <div style={{ padding: '8px 8px 12px', flexShrink: 0, borderTop: `1px solid ${BORDER}` }}>
                    {showNew ? (
                      <div style={{ background: SURFACE, borderRadius: 10, padding: 12 }}>
                        <input autoFocus value={newName} onChange={e => setNewName(e.target.value)}
                          onKeyDown={e => { if (e.key === 'Enter') addCo(); if (e.key === 'Escape') setShowNew(false); }}
                          placeholder="Nome..." style={{ width: '100%', background: 'var(--ib)', border: '1px solid var(--b3)', borderRadius: 7, padding: '7px 9px', color: 'var(--t1)', fontSize: 13, outline: 'none', marginBottom: 8 }} />
                        <ColorPicker value={newColor} onChange={setNewColor} />
                        <div style={{ display: 'flex', gap: 6, marginTop: 10 }}>
                          <button onClick={() => setShowNew(false)} style={{ flex: 1, padding: '7px 0', borderRadius: 8, background: 'var(--s2)', border: 'none', color: 'var(--t2)', fontSize: 12, cursor: 'pointer' }}>Cancelar</button>
                          <button onClick={addCo} style={{ flex: 1, padding: '7px 0', borderRadius: 8, background: newColor, border: 'none', color: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>Adicionar</button>
                        </div>
                      </div>
                    ) : (
                      <button onClick={() => setShowNew(true)} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 7, padding: '8px 10px', borderRadius: 10, background: 'transparent', border: '1px dashed var(--b3)', color: 'var(--t3)', fontSize: 12, cursor: 'pointer' }}
                        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = '#356BFF'; (e.currentTarget as HTMLElement).style.color = '#64C4FF'; }}
                        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--b3)'; (e.currentTarget as HTMLElement).style.color = 'var(--t3)'; }}
                      ><FiPlus size={12} /> Nova Empresa</button>
                    )}
                  </div>
                </div>

                {/* Right */}
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', padding: 16 }}>
                  {selected ? (
                    <>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14, flexShrink: 0 }}>
                        <div style={{ width: 10, height: 10, borderRadius: '50%', background: selected.color }} />
                        <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--t1)' }}>{selected.name}</span>
                      </div>
                      <div style={{ marginBottom: 14, flexShrink: 0 }}>
                        <p style={{ fontSize: 10, color: 'var(--t3)', marginBottom: 4, letterSpacing: '1px', textTransform: 'uppercase' }}>Cor</p>
                        <ColorPicker value={selected.color} onChange={color => updateCompany(selected.id, { color })} />
                      </div>
                      <div style={{ flex: 1, overflowY: 'auto' }}>
                        <p style={{ fontSize: 10, color: 'var(--t3)', marginBottom: 8, letterSpacing: '1px', textTransform: 'uppercase' }}>Subclients</p>
                        {companySubs.map(s => (
                          <SubRow key={s.id} sub={s} onUpdate={(id, name) => updateSubClient(id, { name })} onDelete={deleteSubClient} />
                        ))}
                        {showNewSub ? (
                          <div style={{ display: 'flex', gap: 6, marginTop: 6, alignItems: 'center' }}>
                            <input autoFocus value={newSub} onChange={e => setNewSub(e.target.value)}
                              onKeyDown={e => { if (e.key === 'Enter') addSub(); if (e.key === 'Escape') setShowNewSub(false); }}
                              placeholder="Nome do subclient..." style={{ flex: 1, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 8, padding: '8px 10px', color: 'var(--t1)', fontSize: 13, outline: 'none' }} />
                            <button onClick={addSub} style={{ padding: '8px 12px', borderRadius: 8, background: selected.color, border: 'none', color: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>OK</button>
                            <button onClick={() => setShowNewSub(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--t3)', padding: 6 }}><FiX size={14} /></button>
                          </div>
                        ) : (
                          <button onClick={() => setShowNewSub(true)} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 7, padding: '8px 10px', borderRadius: 10, background: 'transparent', border: '1px dashed var(--b2)', color: 'var(--t3)', fontSize: 12, cursor: 'pointer', marginTop: 6 }}
                            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = selected.color; (e.currentTarget as HTMLElement).style.color = selected.color; }}
                            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--b2)'; (e.currentTarget as HTMLElement).style.color = 'var(--t3)'; }}
                          ><FiPlus size={12} /> Novo Subclient</button>
                        )}
                      </div>
                    </>
                  ) : (
                    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, color: 'var(--t4)' }}>Selecione uma empresa</div>
                  )}
                </div>
              </div>
            )}

            {/* ─── APARÊNCIA TAB ─── (#60) */}
            {activeTab === 'aparencia' && (
              <div style={{ padding: 24 }}>
                <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase', color: 'var(--t3)', marginBottom: 16 }}>Tema</div>
                <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                  {THEMES.map(t => (
                    <button key={t.id} onClick={() => setTheme(t.id)} style={{
                      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
                      padding: '16px 20px', borderRadius: 14, cursor: 'pointer', transition: 'all .15s',
                      background: theme === t.id ? 'rgba(53,107,255,0.12)' : SURFACE,
                      border: `1px solid ${theme === t.id ? 'rgba(53,107,255,0.4)' : BORDER}`,
                    }}>
                      <div style={{ width: 48, height: 32, borderRadius: 8, background: t.bg, border: '1px solid var(--b3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        {theme === t.id && <FiCheck size={12} color="#64C4FF" />}
                      </div>
                      <span style={{ fontSize: 12, fontWeight: theme === t.id ? 600 : 400, color: theme === t.id ? '#64C4FF' : 'var(--t3)' }}>
                        {t.label}
                      </span>
                    </button>
                  ))}
                </div>
                <p style={{ marginTop: 12, fontSize: 11, color: 'var(--t4)' }}>
                  O tema afeta a cor de fundo e o esquema de cores da aplicação.
                </p>
              </div>
            )}

            {/* ─── DADOS TAB ─── (#58/#59) */}
            {activeTab === 'dados' && (
              <div style={{ padding: 24 }}>
                <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase', color: 'var(--t3)', marginBottom: 16 }}>Backup & Restore</div>

                <div style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
                  {/* Export */}
                  <button onClick={handleExport} style={{
                    flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                    padding: '14px 20px', borderRadius: 12, cursor: 'pointer', transition: 'all .15s',
                    background: 'rgba(48,209,88,0.08)', border: '1px solid rgba(48,209,88,0.25)',
                    color: '#30d158', fontSize: 13, fontWeight: 600,
                  }}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(48,209,88,0.15)'; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(48,209,88,0.08)'; }}
                  >
                    <FiDownload size={16} /> Exportar JSON
                  </button>

                  {/* Import */}
                  <button onClick={() => fileRef.current?.click()} style={{
                    flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                    padding: '14px 20px', borderRadius: 12, cursor: 'pointer', transition: 'all .15s',
                    background: importOk ? 'rgba(48,209,88,0.1)' : 'rgba(53,107,255,0.08)',
                    border: `1px solid ${importOk ? 'rgba(48,209,88,0.3)' : 'rgba(53,107,255,0.25)'}`,
                    color: importOk ? '#30d158' : '#64C4FF', fontSize: 13, fontWeight: 600,
                  }}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(53,107,255,0.15)'; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = importOk ? 'rgba(48,209,88,0.1)' : 'rgba(53,107,255,0.08)'; }}
                  >
                    <FiUpload size={16} /> {importOk ? 'Importado! Recarregando...' : 'Importar JSON'}
                  </button>
                  <input ref={fileRef} type="file" accept=".json" onChange={handleImport} style={{ display: 'none' }} />
                </div>

                {/* .ics export */}
                <button onClick={handleIcsExport} style={{
                  width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  padding: '12px 20px', borderRadius: 12, cursor: 'pointer', transition: 'all .15s', marginBottom: 16,
                  background: 'rgba(255,159,10,0.08)', border: '1px solid rgba(255,159,10,0.25)',
                  color: '#ff9f0a', fontSize: 13, fontWeight: 600,
                }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,159,10,0.15)'; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,159,10,0.08)'; }}
                >
                  <FiDownload size={14} /> Exportar .ics (Google / Apple Calendar)
                </button>

                {importError && (
                  <p style={{ fontSize: 12, color: '#ff453a', background: 'rgba(255,69,58,0.1)', border: '1px solid rgba(255,69,58,0.2)', padding: '8px 12px', borderRadius: 8 }}>
                    {importError}
                  </p>
                )}

                <div style={{ padding: '14px 16px', background: 'var(--s1)', border: '1px solid var(--b1)', borderRadius: 10 }}>
                  <div style={{ fontSize: 11, color: 'var(--t3)', marginBottom: 8 }}>Resumo dos dados</div>
                  <div style={{ display: 'flex', gap: 16 }}>
                    {[
                      { label: 'Empresas', value: companies.filter(c => !c.deletedAt).length },
                      { label: 'Subclients', value: subClients.filter(s => !s.deletedAt).length },
                      { label: 'Tarefas', value: tasks.filter(t => !t.deletedAt).length },
                    ].map(({ label, value }) => (
                      <div key={label}>
                        <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--t1)' }}>{value}</div>
                        <div style={{ fontSize: 11, color: 'var(--t3)' }}>{label}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* ─── SEGURANÇA TAB ─── */}
            {activeTab === 'seguranca' && (
              <div style={{ padding: 24 }}>
                <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase', color: 'var(--t3)', marginBottom: 16 }}>PIN de Acesso</div>
                {storedPin ? (
                  <div style={{ marginBottom: 20, padding: '12px 16px', background: 'rgba(48,209,88,0.08)', border: '1px solid rgba(48,209,88,0.2)', borderRadius: 10, display: 'flex', alignItems: 'center', gap: 10 }}>
                    <FiLock size={14} color="#30d158" />
                    <span style={{ fontSize: 13, color: '#30d158', fontWeight: 500 }}>PIN ativo — app bloqueado ao abrir</span>
                    <button onClick={handleRemovePin} style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 5, padding: '5px 12px', borderRadius: 8, background: 'rgba(255,69,58,0.1)', border: '1px solid rgba(255,69,58,0.25)', color: '#ff453a', fontSize: 12, cursor: 'pointer' }}>
                      <FiUnlock size={11} /> Remover PIN
                    </button>
                  </div>
                ) : (
                  <div style={{ marginBottom: 20, padding: '12px 16px', background: 'var(--s1)', border: '1px solid var(--b2)', borderRadius: 10, display: 'flex', alignItems: 'center', gap: 10 }}>
                    <FiUnlock size={14} color="var(--t4)" />
                    <span style={{ fontSize: 13, color: 'var(--t3)' }}>Sem PIN definido</span>
                  </div>
                )}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <div>
                    <p style={{ fontSize: 10, color: 'var(--t3)', marginBottom: 6, letterSpacing: '1px', textTransform: 'uppercase' }}>Novo PIN (4 dígitos)</p>
                    <input type="password" inputMode="numeric" maxLength={4} value={pinInput} onChange={e => { if (/^\d{0,4}$/.test(e.target.value)) setPinInput(e.target.value); setPinMsg(''); }}
                      placeholder="••••"
                      style={{ background: 'var(--ib)', border: '1px solid var(--b2)', borderRadius: 8, padding: '8px 12px', color: 'var(--t1)', fontSize: 16, outline: 'none', width: 100, letterSpacing: 6 }} />
                  </div>
                  <div>
                    <p style={{ fontSize: 10, color: 'var(--t3)', marginBottom: 6, letterSpacing: '1px', textTransform: 'uppercase' }}>Confirmar PIN</p>
                    <input type="password" inputMode="numeric" maxLength={4} value={pinConfirm} onChange={e => { if (/^\d{0,4}$/.test(e.target.value)) setPinConfirm(e.target.value); setPinMsg(''); }}
                      placeholder="••••"
                      style={{ background: 'var(--ib)', border: '1px solid var(--b2)', borderRadius: 8, padding: '8px 12px', color: 'var(--t1)', fontSize: 16, outline: 'none', width: 100, letterSpacing: 6 }} />
                  </div>
                  <button onClick={handleSetPin} style={{ alignSelf: 'flex-start', display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', borderRadius: 8, background: 'rgba(53,107,255,0.15)', border: '1px solid rgba(53,107,255,0.3)', color: '#64C4FF', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                    <FiLock size={12} /> {storedPin ? 'Alterar PIN' : 'Definir PIN'}
                  </button>
                  {pinMsg && <p style={{ fontSize: 12, color: pinMsg.includes('sucesso') || pinMsg.includes('removido') ? '#30d158' : '#ff453a', fontWeight: 500 }}>{pinMsg}</p>}
                </div>
                <p style={{ marginTop: 16, fontSize: 11, color: 'var(--t4)' }}>
                  O PIN é armazenado localmente. Ao abrir o app, você precisará digitá-lo.
                </p>
              </div>
            )}

          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
