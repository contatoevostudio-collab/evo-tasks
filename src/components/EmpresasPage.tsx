import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FiPlus, FiEdit2, FiTrash2, FiCheck, FiX,
  FiUsers, FiFileText, FiChevronUp, FiChevronDown,
  FiTarget, FiAlertTriangle, FiStar, FiLink,
  FiPhone, FiMail, FiInstagram, FiArchive, FiRotateCcw,
} from 'react-icons/fi';
import { format, parseISO, startOfWeek, endOfWeek, isWithinInterval, differenceInDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { SubClient } from '../types';
import { getTaskTitle } from '../types';
import { useTaskStore } from '../store/tasks';

const PRESET_COLORS = [
  '#30d158','#ff9f0a','#ff453a','#bf5af2','#636366',
  '#356BFF','#64C4FF','#ff6b6b','#ffd60a','#5e5ce6',
];

const CARD: React.CSSProperties = {
  background: 'var(--s1)',
  border: '1px solid var(--b2)',
  borderRadius: 14,
};

const STATUS_COLOR: Record<string, string> = { todo: '#ff9f0a', doing: '#64C4FF', done: '#30d158' };
const STATUS_LABEL: Record<string, string> = { todo: 'A Fazer', doing: 'Fazendo', done: 'Feito' };

function ColorDot({ color, selected, onClick }: { color: string; selected: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} style={{
      width: 22, height: 22, borderRadius: '50%', background: color,
      border: selected ? '2px solid #fff' : '2px solid transparent',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      cursor: 'pointer', transition: 'transform .15s', flexShrink: 0,
    }}
      onMouseEnter={e => ((e.currentTarget as HTMLElement).style.transform = 'scale(1.15)')}
      onMouseLeave={e => ((e.currentTarget as HTMLElement).style.transform = 'none')}
    >
      {selected && <FiCheck size={10} color="#fff" />}
    </button>
  );
}

// ── Client Modal (Notes + Tips + Plataformas tabs) ────────────────────────────
interface ClientModalProps {
  sub: SubClient;
  companyColor: string;
  initialTab?: 'notas' | 'dicas' | 'plataformas';
  onClose: () => void;
  onSaveNotes: (notes: string) => void;
  onSaveTips: (tips: string[]) => void;
  onSavePlatforms: (platforms: SubClient['platforms']) => void;
}

function ClientModal({ sub, companyColor, initialTab = 'notas', onClose, onSaveNotes, onSaveTips, onSavePlatforms }: ClientModalProps) {
  const [tab, setTab]       = useState<'notas' | 'dicas' | 'plataformas'>(initialTab);
  const [notes, setNotes]   = useState(sub.notes ?? '');
  const [tips, setTips]     = useState<string[]>(sub.tips ?? []);
  const [newTip, setNewTip] = useState('');
  const [whatsapp,  setWhatsapp]  = useState(sub.platforms?.whatsapp ?? '');
  const [instagram, setInstagram] = useState(sub.platforms?.instagram ?? '');
  const [email,     setEmail]     = useState(sub.platforms?.email ?? '');

  const addTip = () => {
    const t = newTip.trim();
    if (!t) return;
    setTips(prev => [...prev, t]);
    setNewTip('');
  };

  const removeTip = (i: number) => setTips(prev => prev.filter((_, idx) => idx !== i));

  const handleSave = () => {
    onSaveNotes(notes);
    onSaveTips(tips);
    onSavePlatforms({
      whatsapp:  whatsapp.trim()  || undefined,
      instagram: instagram.trim() || undefined,
      email:     email.trim()     || undefined,
    });
    onClose();
  };

  return (
    <AnimatePresence>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        style={{ position: 'fixed', inset: 0, zIndex: 60, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
      >
        <motion.div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(4px)' }} onClick={onClose} />
        <motion.div
          initial={{ scale: 0.94, opacity: 0, y: 12 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.94, opacity: 0, y: 12 }}
          transition={{ type: 'spring', damping: 26, stiffness: 320 }}
          style={{ position: 'relative', zIndex: 1, width: '100%', maxWidth: 460, margin: '0 16px', background: 'var(--modal-bg)', border: '1px solid var(--b2)', borderRadius: 16, overflow: 'hidden' }}
        >
          <div style={{ height: 3, background: companyColor, opacity: 0.8 }} />
          <div style={{ padding: '18px 20px 20px' }}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: companyColor }} />
                <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--t1)' }}>{sub.name}</span>
              </div>
              <button onClick={onClose} style={{ background: 'var(--s2)', border: 'none', cursor: 'pointer', color: 'var(--t2)', padding: 7, borderRadius: 8, display: 'flex', alignItems: 'center' }}>
                <FiX size={14} />
              </button>
            </div>

            {/* Tabs */}
            <div style={{ display: 'flex', gap: 4, marginBottom: 14, background: 'var(--s1)', borderRadius: 9, padding: 3 }}>
              {(['notas', 'dicas', 'plataformas'] as const).map(t => (
                <button key={t} onClick={() => setTab(t)} style={{
                  flex: 1, padding: '6px 0', borderRadius: 7, fontSize: 11, fontWeight: 600,
                  background: tab === t ? companyColor : 'transparent',
                  border: 'none', cursor: 'pointer',
                  color: tab === t ? '#fff' : 'var(--t3)',
                  transition: 'all .15s',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4,
                }}>
                  {t === 'notas' ? <><FiFileText size={10} /> Notas</>
                    : t === 'dicas' ? (
                      <><FiStar size={10} /> Dicas
                        {tips.length > 0 && (
                          <span style={{ fontSize: 9, background: tab === 'dicas' ? 'rgba(255,255,255,0.25)' : `${companyColor}25`, color: tab === 'dicas' ? '#fff' : companyColor, borderRadius: 99, padding: '0 4px', fontWeight: 700 }}>
                            {tips.length}
                          </span>
                        )}
                      </>
                    ) : <><FiLink size={10} /> Redes</>}
                </button>
              ))}
            </div>

            {/* Notes tab */}
            {tab === 'notas' && (
              <textarea autoFocus value={notes} onChange={e => setNotes(e.target.value)}
                placeholder="Notas, referências, links, contexto do cliente..."
                rows={6}
                style={{ width: '100%', boxSizing: 'border-box', background: 'var(--ib)', border: '1px solid var(--b2)', borderRadius: 10, padding: '10px 14px', color: 'var(--t1)', fontSize: 13, lineHeight: 1.6, outline: 'none', resize: 'vertical', fontFamily: 'inherit' }}
                onFocus={e => { e.currentTarget.style.borderColor = `${companyColor}60`; }}
                onBlur={e => { e.currentTarget.style.borderColor = 'var(--b2)'; }}
              />
            )}

            {/* Dicas tab */}
            {tab === 'dicas' && (
              <div>
                <p style={{ fontSize: 11, color: 'var(--t3)', marginBottom: 10 }}>
                  Lembrete rápido sobre como trabalhar com este cliente. Ex: "não gosta de degradê", "logo sempre pequena".
                </p>

                {/* Existing tips */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 10, maxHeight: 180, overflowY: 'auto' }}>
                  <AnimatePresence>
                    {tips.length === 0 && (
                      <div style={{ textAlign: 'center', padding: '20px 0', color: 'var(--t4)', fontSize: 12 }}>
                        Nenhuma dica ainda. Adicione abaixo.
                      </div>
                    )}
                    {tips.map((tip, i) => (
                      <motion.div
                        key={`${tip}-${i}`}
                        initial={{ opacity: 0, x: -8 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 8, height: 0 }}
                        style={{
                          display: 'flex', alignItems: 'flex-start', gap: 8,
                          padding: '8px 10px', borderRadius: 8,
                          background: `${companyColor}10`, border: `1px solid ${companyColor}25`,
                        }}
                      >
                        <FiStar size={11} style={{ color: companyColor, flexShrink: 0, marginTop: 2 }} />
                        <span style={{ flex: 1, fontSize: 13, color: 'var(--t1)', lineHeight: 1.4 }}>{tip}</span>
                        <button onClick={() => removeTip(i)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--t4)', padding: 2, display: 'flex', transition: 'color .15s', flexShrink: 0 }}
                          onMouseEnter={e => ((e.currentTarget as HTMLElement).style.color = '#ff453a')}
                          onMouseLeave={e => ((e.currentTarget as HTMLElement).style.color = 'var(--t4)')}
                        ><FiX size={11} /></button>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>

                {/* Add tip input */}
                <div style={{ display: 'flex', gap: 6 }}>
                  <input
                    autoFocus={tab === 'dicas'}
                    value={newTip}
                    onChange={e => setNewTip(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') addTip(); }}
                    placeholder="Adicionar dica..."
                    style={{ flex: 1, background: 'var(--ib)', border: '1px solid var(--b2)', borderRadius: 8, padding: '8px 10px', color: 'var(--t1)', fontSize: 13, outline: 'none' }}
                    onFocus={e => { e.currentTarget.style.borderColor = `${companyColor}60`; }}
                    onBlur={e => { e.currentTarget.style.borderColor = 'var(--b2)'; }}
                  />
                  <button onClick={addTip} style={{ padding: '8px 12px', borderRadius: 8, background: companyColor, border: 'none', color: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                    <FiPlus size={13} />
                  </button>
                </div>
              </div>
            )}

            {/* Plataformas tab */}
            {tab === 'plataformas' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <p style={{ fontSize: 11, color: 'var(--t3)', marginBottom: 2 }}>
                  Contatos e redes sociais do subclient.
                </p>
                {[
                  { icon: FiPhone,    label: 'WhatsApp',  value: whatsapp,  setter: setWhatsapp,  placeholder: '(00) 00000-0000' },
                  { icon: FiInstagram, label: 'Instagram', value: instagram, setter: setInstagram, placeholder: '@perfil' },
                  { icon: FiMail,    label: 'E-mail',    value: email,     setter: setEmail,     placeholder: 'email@exemplo.com' },
                ].map(({ icon: Icon, label, value, setter, placeholder }) => (
                  <div key={label}>
                    <label style={{ fontSize: 10, fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase', color: 'var(--t3)', display: 'flex', alignItems: 'center', gap: 5, marginBottom: 6 }}>
                      <Icon size={10} /> {label}
                    </label>
                    <input
                      value={value} onChange={e => setter(e.target.value)}
                      placeholder={placeholder}
                      style={{ width: '100%', boxSizing: 'border-box', background: 'var(--ib)', border: '1px solid var(--b2)', borderRadius: 8, padding: '8px 12px', color: 'var(--t1)', fontSize: 13, outline: 'none' }}
                      onFocus={e => { e.currentTarget.style.borderColor = `${companyColor}60`; }}
                      onBlur={e => { e.currentTarget.style.borderColor = 'var(--b2)'; }}
                    />
                  </div>
                ))}
              </div>
            )}

            <div style={{ display: 'flex', gap: 8, marginTop: 14, justifyContent: 'flex-end' }}>
              <button onClick={onClose} style={{ padding: '7px 16px', borderRadius: 8, fontSize: 12, fontWeight: 500, background: 'var(--s2)', border: '1px solid var(--b2)', color: 'var(--t2)', cursor: 'pointer' }}>Cancelar</button>
              <button onClick={handleSave} style={{ padding: '7px 20px', borderRadius: 8, fontSize: 12, fontWeight: 600, background: companyColor, border: 'none', color: '#fff', cursor: 'pointer' }}>Salvar</button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

export function EmpresasPage() {
  const {
    companies, subClients, tasks,
    addCompany, updateCompany, deleteCompany,
    permanentlyDeleteCompany, restoreCompany,
    moveCompanyUp, moveCompanyDown,
    addSubClient, updateSubClient, deleteSubClient,
    restoreSubClient,
    permanentlyDeleteTask, restoreTask,
    updateSubClientNotes, updateSubClientTips,
    showToast, hideToast,
  } = useTaskStore();

  // Active (non-trashed) lists
  const activeCompanies = companies.filter(c => !c.deletedAt);

  // Trash window: items deleted within last 30 days
  const cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000;
  const trashedCompanies = companies
    .filter(c => c.deletedAt && new Date(c.deletedAt).getTime() >= cutoff)
    .sort((a, b) => (b.deletedAt ?? '').localeCompare(a.deletedAt ?? ''));

  const [selectedId, setSelectedId]   = useState<string>(activeCompanies[0]?.id ?? '');
  const [newName, setNewName]         = useState('');
  const [newColor, setNewColor]       = useState(PRESET_COLORS[5]);
  const [showNew, setShowNew]         = useState(false);
  const [newSub, setNewSub]           = useState('');
  const [showNewSub, setShowNewSub]   = useState(false);
  const [editingSubId, setEditingSubId]     = useState<string | null>(null);
  const [editingSubName, setEditingSubName] = useState('');
  const [editingCompanyName, setEditingCompanyName] = useState(false);
  const [newCompanyNameVal, setNewCompanyNameVal]   = useState('');
  const [selectedSubForClient, setSelectedSubForClient] = useState<string | null>(null);
  const [clientModalTab, setClientModalTab] = useState<'notas' | 'dicas'>('notas');
  const [showTaskList, setShowTaskList] = useState(true);
  const [editingQuota, setEditingQuota] = useState(false);
  const [quotaVal, setQuotaVal]         = useState('');
  const [editingSubQuotaId, setEditingSubQuotaId] = useState<string | null>(null);
  const [editingSubQuotaVal, setEditingSubQuotaVal] = useState('');
  const [confirmDeleteCompanyId, setConfirmDeleteCompanyId] = useState<string | null>(null);
  const [showCompanyTrash, setShowCompanyTrash] = useState(false);
  const [confirmPermaCompanyId, setConfirmPermaCompanyId] = useState<string | null>(null);
  const [showTaskTrash, setShowTaskTrash] = useState(false);
  const [confirmPermaTaskId, setConfirmPermaTaskId] = useState<string | null>(null);

  // Undo refs for subclient deletion
  const undoTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Clear pending undo timer on unmount
  useEffect(() => () => { if (undoTimerRef.current) clearTimeout(undoTimerRef.current); }, []);

  const selected     = activeCompanies.find(c => c.id === selectedId);
  const companySubs  = subClients.filter(s => !s.deletedAt && s.companyId === selectedId);
  const companyTasks = tasks.filter(t => !t.deletedAt && t.companyId === selectedId && !t.archived);
  const trashedCompanyTasks = tasks
    .filter(t => t.deletedAt && t.companyId === selectedId && new Date(t.deletedAt).getTime() >= cutoff)
    .sort((a, b) => (b.deletedAt ?? '').localeCompare(a.deletedAt ?? ''));

  const taskCountFor = (id: string) => tasks.filter(t => !t.deletedAt && t.companyId === id && !t.archived).length;

  // Workload: tasks this week per subclient
  const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
  const weekEnd   = endOfWeek(new Date(), { weekStartsOn: 1 });
  const weekTasksFor = (subId: string) =>
    tasks.filter(t =>
      !t.deletedAt && t.subClientId === subId && !t.archived &&
      isWithinInterval(parseISO(t.date), { start: weekStart, end: weekEnd })
    ).length;

  // Status breakdown
  const statusBreakdown = {
    todo:  companyTasks.filter(t => t.status === 'todo').length,
    doing: companyTasks.filter(t => t.status === 'doing').length,
    done:  companyTasks.filter(t => t.status === 'done').length,
  };
  const totalTasks = companyTasks.length;

  // Monthly quota
  const currentMonthStr  = format(new Date(), 'yyyy-MM');
  const currentMonthDone = companyTasks.filter(t => t.status === 'done' && t.date.startsWith(currentMonthStr)).length;
  const subMonthDone = (subId: string) =>
    tasks.filter(t => !t.deletedAt && t.subClientId === subId && t.status === 'done' && t.date.startsWith(currentMonthStr) && !t.archived).length;

  // Monthly history
  const monthlyHistory: { month: string; done: number }[] = (() => {
    const map: Record<string, number> = {};
    companyTasks.forEach(t => {
      if (t.status === 'done') { const m = t.date.slice(0, 7); map[m] = (map[m] ?? 0) + 1; }
    });
    return Object.entries(map).sort(([a], [b]) => b.localeCompare(a)).map(([month, done]) => ({ month, done }));
  })();

  const clientSub = selectedSubForClient ? subClients.find(s => s.id === selectedSubForClient) : null;

  const handleAddCompany = () => {
    const name = newName.trim().toUpperCase();
    if (!name) return;
    addCompany({ name, color: newColor });
    setNewName(''); setShowNew(false);
  };

  const handleSaveCompanyName = () => {
    if (!selected || !newCompanyNameVal.trim()) return;
    updateCompany(selected.id, { name: newCompanyNameVal.trim().toUpperCase() });
    setEditingCompanyName(false);
  };

  const handleSaveQuota = () => {
    if (!selected) return;
    const n = parseInt(quotaVal, 10);
    updateCompany(selected.id, { monthlyQuota: isNaN(n) || n <= 0 ? undefined : n });
    setEditingQuota(false);
  };

  const handleSaveSubQuota = (subId: string) => {
    const n = parseInt(editingSubQuotaVal, 10);
    updateSubClient(subId, { monthlyQuota: isNaN(n) || n <= 0 ? undefined : n });
    setEditingSubQuotaId(null);
  };

  const handleAddSub = () => {
    const name = newSub.trim();
    if (!name || !selectedId) return;
    addSubClient({ name, companyId: selectedId });
    setNewSub(''); setShowNewSub(false);
  };

  const startEditSub = (sub: SubClient) => { setEditingSubId(sub.id); setEditingSubName(sub.name); };
  const saveEditSub  = () => {
    if (editingSubId && editingSubName.trim()) updateSubClient(editingSubId, { name: editingSubName.trim() });
    setEditingSubId(null);
  };

  const handleDeleteCompany = (companyId: string) => {
    deleteCompany(companyId); // soft-delete → vai para a lixeira
    if (selectedId === companyId) setSelectedId(activeCompanies.find(c => c.id !== companyId)?.id ?? '');
    setConfirmDeleteCompanyId(null);
    showToast('Empresa movida para a lixeira', () => {
      restoreCompany(companyId);
      hideToast();
    });
    setTimeout(hideToast, 5000);
  };

  const handleRestoreCompany = (companyId: string) => {
    restoreCompany(companyId);
    showToast('Empresa restaurada');
    setTimeout(hideToast, 3000);
  };

  const handlePermaDeleteCompany = (companyId: string) => {
    permanentlyDeleteCompany(companyId);
    setConfirmPermaCompanyId(null);
    showToast('Empresa deletada permanentemente');
    setTimeout(hideToast, 3000);
  };

  const handleDeleteSubClient = (sub: SubClient) => {
    // Soft-delete imediato com toast de undo (5s)
    deleteSubClient(sub.id);
    if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
    undoTimerRef.current = setTimeout(() => { hideToast(); }, 5000);

    showToast(`"${sub.name}" movido para a lixeira`, () => {
      if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
      restoreSubClient(sub.id);
      hideToast();
    });
  };

  const handleRestoreTask = (id: string) => {
    restoreTask(id);
    showToast('Tarefa restaurada');
    setTimeout(hideToast, 3000);
  };

  const handlePermaDeleteTask = (id: string) => {
    permanentlyDeleteTask(id);
    setConfirmPermaTaskId(null);
    showToast('Tarefa deletada permanentemente');
    setTimeout(hideToast, 3000);
  };

  const openClientModal = (subId: string, tab: 'notas' | 'dicas' = 'notas') => {
    setClientModalTab(tab);
    setSelectedSubForClient(subId);
  };

  return (
    <div style={{ padding: '32px 36px', height: '100%', overflowY: 'auto' }}>
      {/* Client modal */}
      {clientSub && selected && (
        <ClientModal
          sub={clientSub}
          companyColor={selected.color}
          initialTab={clientModalTab}
          onClose={() => setSelectedSubForClient(null)}
          onSaveNotes={notes => updateSubClientNotes(clientSub.id, notes)}
          onSaveTips={tips => updateSubClientTips(clientSub.id, tips)}
          onSavePlatforms={platforms => updateSubClient(clientSub.id, { platforms })}
        />
      )}

      {/* Page header */}
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} style={{ marginBottom: 28 }}>
        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase', color: 'var(--t3)', marginBottom: 6 }}>Gestão</div>
        <h1 style={{ fontSize: 26, fontWeight: 700, color: 'var(--t1)', letterSpacing: '-0.5px' }}>Empresas & Clientes</h1>
        <p style={{ fontSize: 13, color: 'var(--t3)', marginTop: 4 }}>
          {activeCompanies.length} empresa{activeCompanies.length !== 1 ? 's' : ''} · {subClients.filter(s => !s.deletedAt).length} subclient{subClients.filter(s => !s.deletedAt).length !== 1 ? 's' : ''}
          {trashedCompanies.length > 0 && (
            <> · <span style={{ color: '#ff453a' }}>{trashedCompanies.length} na lixeira</span></>
          )}
        </p>
      </motion.div>

      <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: 20 }}>
        {/* Left: Companies list */}
        <div>
          <div style={{ ...CARD, overflow: 'hidden' }}>
            <div style={{ padding: '16px 16px 10px', borderBottom: '1px solid var(--b1)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '1.5px', textTransform: 'uppercase', color: 'var(--t3)' }}>
                {showCompanyTrash ? 'Lixeira' : 'Empresas'}
              </span>
              <button
                onClick={() => setShowCompanyTrash(s => !s)}
                title={showCompanyTrash ? 'Voltar para empresas' : 'Ver lixeira'}
                style={{
                  display: 'flex', alignItems: 'center', gap: 4,
                  padding: '3px 8px', borderRadius: 6, fontSize: 10, fontWeight: 600,
                  background: showCompanyTrash ? 'rgba(255,69,58,0.12)' : 'transparent',
                  border: `1px solid ${showCompanyTrash ? 'rgba(255,69,58,0.3)' : 'var(--b2)'}`,
                  color: showCompanyTrash ? '#ff453a' : 'var(--t3)',
                  cursor: 'pointer', transition: 'all .15s',
                }}
              >
                <FiArchive size={9} />
                {showCompanyTrash ? 'Voltar' : `Lixeira${trashedCompanies.length > 0 ? ` (${trashedCompanies.length})` : ''}`}
              </button>
            </div>

            {showCompanyTrash ? (
              /* Trash list */
              <div style={{ padding: '8px 8px' }}>
                {trashedCompanies.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '24px 8px', color: 'var(--t4)', fontSize: 12 }}>
                    Lixeira vazia
                    <div style={{ fontSize: 10, marginTop: 4 }}>Itens são removidos após 30 dias</div>
                  </div>
                ) : (
                  trashedCompanies.map((company, i) => {
                    const days = company.deletedAt ? differenceInDays(new Date(), parseISO(company.deletedAt)) : 0;
                    const isConfirmPerma = confirmPermaCompanyId === company.id;
                    return (
                      <motion.div key={company.id} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.04 }}
                        style={{ marginBottom: 4, padding: '8px 10px', borderRadius: 9, background: 'var(--s1)', border: '1px solid var(--b1)' }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <div style={{ width: 8, height: 8, borderRadius: '50%', background: company.color, flexShrink: 0, opacity: 0.5 }} />
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: 12, color: 'var(--t2)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', textDecoration: 'line-through', opacity: 0.7 }}>
                              {company.name}
                            </div>
                            <div style={{ fontSize: 10, color: 'var(--t4)', marginTop: 2 }}>
                              há {days === 0 ? 'menos de 1 dia' : `${days} dia${days !== 1 ? 's' : ''}`}
                            </div>
                          </div>
                          {!isConfirmPerma && (
                            <div style={{ display: 'flex', gap: 2, flexShrink: 0 }}>
                              <button
                                onClick={() => handleRestoreCompany(company.id)}
                                title="Restaurar"
                                style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--t4)', padding: 4, borderRadius: 6, transition: 'all .15s', display: 'flex' }}
                                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = '#30d158'; }}
                                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'var(--t4)'; }}
                              ><FiRotateCcw size={11} /></button>
                              <button
                                onClick={() => setConfirmPermaCompanyId(company.id)}
                                title="Excluir permanentemente"
                                style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--t4)', padding: 4, borderRadius: 6, transition: 'all .15s', display: 'flex' }}
                                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = '#ff453a'; }}
                                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'var(--t4)'; }}
                              ><FiTrash2 size={11} /></button>
                            </div>
                          )}
                        </div>
                        <AnimatePresence>
                          {isConfirmPerma && (
                            <motion.div
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: 'auto' }}
                              exit={{ opacity: 0, height: 0 }}
                              style={{ overflow: 'hidden', marginTop: 6 }}
                            >
                              <div style={{ padding: '6px 8px', borderRadius: 7, background: 'rgba(255,69,58,0.06)', border: '1px solid rgba(255,69,58,0.2)' }}>
                                <div style={{ fontSize: 10, color: '#ff453a', marginBottom: 6 }}>
                                  <FiAlertTriangle size={9} style={{ marginRight: 3, verticalAlign: 'middle' }} />
                                  Excluir permanentemente? Esta ação não pode ser desfeita.
                                </div>
                                <div style={{ display: 'flex', gap: 4 }}>
                                  <button onClick={() => handlePermaDeleteCompany(company.id)}
                                    style={{ flex: 1, padding: '4px 0', borderRadius: 6, background: '#ff453a', border: 'none', color: '#fff', fontSize: 10, fontWeight: 600, cursor: 'pointer' }}>
                                    Excluir
                                  </button>
                                  <button onClick={() => setConfirmPermaCompanyId(null)}
                                    style={{ flex: 1, padding: '4px 0', borderRadius: 6, background: 'var(--s2)', border: '1px solid var(--b2)', color: 'var(--t2)', fontSize: 10, cursor: 'pointer' }}>
                                    Cancelar
                                  </button>
                                </div>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </motion.div>
                    );
                  })
                )}
              </div>
            ) : (
            <div style={{ padding: '8px 8px' }}>
              {activeCompanies.map((company, i) => {
                const active      = selectedId === company.id;
                const count       = taskCountFor(company.id);
                const isConfirm   = confirmDeleteCompanyId === company.id;
                const subsCount   = subClients.filter(s => !s.deletedAt && s.companyId === company.id).length;
                const tasksCount  = tasks.filter(t => !t.deletedAt && t.companyId === company.id).length;
                return (
                  <motion.div key={company.id} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.04 }}
                    style={{ marginBottom: isConfirm ? 6 : 2 }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center' }}>
                      <button
                        onClick={() => { setSelectedId(company.id); setConfirmDeleteCompanyId(null); }}
                        style={{
                          flex: 1, display: 'flex', alignItems: 'center', gap: 10,
                          padding: '10px 12px', borderRadius: 10,
                          background: active ? `${company.color}18` : 'transparent',
                          border: active ? `1px solid ${company.color}40` : '1px solid transparent',
                          cursor: 'pointer', textAlign: 'left', transition: 'all .15s',
                        }}
                        onMouseEnter={e => { if (!active) (e.currentTarget as HTMLElement).style.background = 'var(--s2)'; }}
                        onMouseLeave={e => { if (!active) (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
                      >
                        <div style={{ width: 10, height: 10, borderRadius: '50%', background: company.color, flexShrink: 0 }} />
                        <span style={{ flex: 1, fontSize: 13, fontWeight: active ? 600 : 400, color: active ? 'var(--t1)' : 'var(--t2)' }}>
                          {company.name}
                        </span>
                        <span style={{ fontSize: 10, color: 'var(--t4)' }}>{count}</span>
                      </button>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: 1, marginLeft: 2 }}>
                        <button onClick={() => moveCompanyUp(company.id)} disabled={i === 0}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--t4)', padding: '1px 3px', transition: 'color .15s' }}
                          onMouseEnter={e => ((e.currentTarget as HTMLElement).style.color = '#64C4FF')}
                          onMouseLeave={e => ((e.currentTarget as HTMLElement).style.color = 'var(--t4)')}
                          title="Mover para cima"
                        ><FiChevronUp size={10} /></button>
                        <button onClick={() => moveCompanyDown(company.id)} disabled={i === companies.length - 1}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--t4)', padding: '1px 3px', transition: 'color .15s' }}
                          onMouseEnter={e => ((e.currentTarget as HTMLElement).style.color = '#64C4FF')}
                          onMouseLeave={e => ((e.currentTarget as HTMLElement).style.color = 'var(--t4)')}
                          title="Mover para baixo"
                        ><FiChevronDown size={10} /></button>
                      </div>

                      <button
                        onClick={e => { e.stopPropagation(); setConfirmDeleteCompanyId(isConfirm ? null : company.id); }}
                        style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: isConfirm ? '#ff453a' : 'var(--t4)', padding: 4, borderRadius: 6, transition: 'color .15s' }}
                        onMouseEnter={e => ((e.currentTarget as HTMLElement).style.color = '#ff453a')}
                        onMouseLeave={e => ((e.currentTarget as HTMLElement).style.color = isConfirm ? '#ff453a' : 'var(--t4)')}
                      ><FiTrash2 size={11} /></button>
                    </div>

                    {/* Inline delete confirmation */}
                    <AnimatePresence>
                      {isConfirm && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          style={{ overflow: 'hidden', marginTop: 2 }}
                        >
                          <div style={{ padding: '8px 10px', borderRadius: 8, background: 'rgba(255,69,58,0.06)', border: '1px solid rgba(255,69,58,0.2)', marginLeft: 4 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 6 }}>
                              <FiAlertTriangle size={10} style={{ color: '#ff453a', flexShrink: 0 }} />
                              <span style={{ fontSize: 11, color: '#ff453a', fontWeight: 600 }}>Mover "{company.name}" para a lixeira?</span>
                            </div>
                            <p style={{ fontSize: 10, color: 'var(--t3)', marginBottom: 8, lineHeight: 1.4 }}>
                              <strong>{subsCount}</strong> subclient{subsCount !== 1 ? 's' : ''} e <strong>{tasksCount}</strong> tarefa{tasksCount !== 1 ? 's' : ''} ficarão ocultos. Você pode restaurar pela lixeira (30 dias).
                            </p>
                            <div style={{ display: 'flex', gap: 6 }}>
                              <button onClick={() => handleDeleteCompany(company.id)}
                                style={{ flex: 1, padding: '5px 0', borderRadius: 7, background: '#ff453a', border: 'none', color: '#fff', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>
                                Mover p/ lixeira
                              </button>
                              <button onClick={() => setConfirmDeleteCompanyId(null)}
                                style={{ flex: 1, padding: '5px 0', borderRadius: 7, background: 'var(--s2)', border: '1px solid var(--b2)', color: 'var(--t2)', fontSize: 11, cursor: 'pointer' }}>
                                Cancelar
                              </button>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                );
              })}

              {/* New company */}
              {showNew ? (
                <div style={{ padding: '10px 12px', background: 'var(--s1)', borderRadius: 10, marginTop: 4 }}>
                  <input autoFocus value={newName} onChange={e => setNewName(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') handleAddCompany(); if (e.key === 'Escape') setShowNew(false); }}
                    placeholder="Nome da empresa..."
                    style={{ width: '100%', background: 'var(--ib)', border: '1px solid var(--b2)', borderRadius: 8, padding: '7px 10px', color: 'var(--t1)', fontSize: 13, outline: 'none', marginBottom: 8, boxSizing: 'border-box' }}
                  />
                  <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: 10 }}>
                    {PRESET_COLORS.map(c => <ColorDot key={c} color={c} selected={newColor === c} onClick={() => setNewColor(c)} />)}
                  </div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button onClick={() => setShowNew(false)} style={{ flex: 1, padding: '7px 0', borderRadius: 8, background: 'var(--s2)', border: 'none', color: 'var(--t2)', fontSize: 12, cursor: 'pointer' }}>Cancelar</button>
                    <button onClick={handleAddCompany} style={{ flex: 1, padding: '7px 0', borderRadius: 8, background: newColor, border: 'none', color: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>Adicionar</button>
                  </div>
                </div>
              ) : (
                <button onClick={() => setShowNew(true)} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 8, padding: '9px 12px', borderRadius: 10, marginTop: 4, background: 'transparent', border: '1px dashed var(--b2)', color: 'var(--t3)', fontSize: 12, cursor: 'pointer', transition: 'all .15s' }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = '#356BFF'; (e.currentTarget as HTMLElement).style.color = '#64C4FF'; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--b2)'; (e.currentTarget as HTMLElement).style.color = 'var(--t3)'; }}
                ><FiPlus size={13} /> Nova Empresa</button>
              )}
            </div>
            )}
          </div>
        </div>

        {/* Right: Company detail */}
        <div>
          {selected ? (
            <motion.div key={selectedId} initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }}>
              {/* Company header */}
              <div style={{ ...CARD, padding: '18px 20px', marginBottom: 14 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ width: 40, height: 40, borderRadius: 12, background: `${selected.color}22`, border: `1px solid ${selected.color}44`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <div style={{ width: 14, height: 14, borderRadius: '50%', background: selected.color }} />
                  </div>
                  <div style={{ flex: 1 }}>
                    {editingCompanyName ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <input autoFocus value={newCompanyNameVal} onChange={e => setNewCompanyNameVal(e.target.value)}
                          onKeyDown={e => { if (e.key === 'Enter') handleSaveCompanyName(); if (e.key === 'Escape') setEditingCompanyName(false); }}
                          style={{ fontSize: 16, fontWeight: 700, background: 'var(--ib)', border: `1px solid ${selected.color}55`, borderRadius: 8, padding: '4px 10px', color: 'var(--t1)', outline: 'none', width: 160 }}
                        />
                        <button onClick={handleSaveCompanyName} style={{ background: selected.color, border: 'none', borderRadius: 6, padding: '5px 10px', color: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>OK</button>
                        <button onClick={() => setEditingCompanyName(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--t3)', padding: 4 }}><FiX size={13} /></button>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--t1)' }}>{selected.name}</div>
                        <button onClick={() => { setNewCompanyNameVal(selected.name); setEditingCompanyName(true); }}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--t4)', padding: 3, borderRadius: 4, transition: 'color .15s' }}
                          onMouseEnter={e => ((e.currentTarget as HTMLElement).style.color = '#64C4FF')}
                          onMouseLeave={e => ((e.currentTarget as HTMLElement).style.color = 'var(--t4)')}
                        ><FiEdit2 size={11} /></button>
                        {/* Status badge — click to cycle */}
                        {(() => {
                          const st = selected.status ?? 'ativo';
                          const statusColors: Record<string, { bg: string; text: string }> = {
                            ativo:   { bg: 'rgba(48,209,88,0.15)',  text: '#30d158' },
                            pausado: { bg: 'rgba(255,159,10,0.15)', text: '#ff9f0a' },
                            inativo: { bg: 'rgba(99,99,102,0.2)',   text: '#636366' },
                          };
                          const nextStatus: Record<string, 'ativo' | 'pausado' | 'inativo'> = {
                            ativo: 'pausado', pausado: 'inativo', inativo: 'ativo',
                          };
                          const { bg, text } = statusColors[st];
                          return (
                            <button
                              onClick={() => updateCompany(selected.id, { status: nextStatus[st] })}
                              title={`Status: ${st} — clique para alterar`}
                              style={{
                                padding: '2px 8px', borderRadius: 99,
                                background: bg, border: 'none', cursor: 'pointer',
                                fontSize: 10, fontWeight: 700, color: text,
                                letterSpacing: '0.5px', textTransform: 'uppercase',
                                transition: 'opacity .15s',
                              }}
                              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.opacity = '0.75'; }}
                              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.opacity = '1'; }}
                            >
                              {st}
                            </button>
                          );
                        })()}
                      </div>
                    )}
                    <div style={{ fontSize: 12, color: 'var(--t3)', marginTop: 2 }}>
                      {companySubs.length} subclient{companySubs.length !== 1 ? 's' : ''} · {totalTasks} tarefas
                    </div>
                  </div>
                  {/* Color picker */}
                  <div style={{ display: 'flex', gap: 5, alignItems: 'center', flexWrap: 'wrap', maxWidth: 200 }}>
                    <span style={{ fontSize: 10, color: 'var(--t4)', marginRight: 4, letterSpacing: '1px' }}>COR</span>
                    {PRESET_COLORS.map(c => <ColorDot key={c} color={c} selected={selected.color === c} onClick={() => updateCompany(selected.id, { color: c })} />)}
                  </div>
                </div>

                {/* Status breakdown */}
                {totalTasks > 0 && (
                  <div style={{ marginTop: 16 }}>
                    <div style={{ display: 'flex', gap: 8, marginBottom: 6 }}>
                      {(['todo', 'doing', 'done'] as const).map(s => (
                        <div key={s} style={{ flex: 1, padding: '8px 12px', borderRadius: 8, background: `${STATUS_COLOR[s]}10`, border: `1px solid ${STATUS_COLOR[s]}25`, textAlign: 'center' }}>
                          <div style={{ fontSize: 18, fontWeight: 700, color: STATUS_COLOR[s] }}>{statusBreakdown[s]}</div>
                          <div style={{ fontSize: 10, color: 'var(--t3)', marginTop: 2 }}>{STATUS_LABEL[s]}</div>
                        </div>
                      ))}
                    </div>
                    <div style={{ height: 3, background: 'var(--b1)', borderRadius: 2, overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${(statusBreakdown.done / totalTasks) * 100}%`, background: '#30d158', borderRadius: 2, transition: 'width .3s' }} />
                    </div>
                  </div>
                )}
              </div>

              {/* Monthly quota + history */}
              <div style={{ ...CARD, padding: '18px 20px', marginBottom: 14 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <FiTarget size={13} style={{ color: selected.color }} />
                    <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '1.5px', textTransform: 'uppercase', color: 'var(--t3)' }}>Cota Mensal</span>
                  </div>
                  {editingQuota ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <input autoFocus type="number" min="1" value={quotaVal} onChange={e => setQuotaVal(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') handleSaveQuota(); if (e.key === 'Escape') setEditingQuota(false); }}
                        placeholder="ex: 40"
                        style={{ width: 80, background: 'var(--ib)', border: `1px solid ${selected.color}55`, borderRadius: 7, padding: '5px 8px', color: 'var(--t1)', fontSize: 13, outline: 'none', textAlign: 'center' }}
                      />
                      <button onClick={handleSaveQuota} style={{ background: selected.color, border: 'none', borderRadius: 6, padding: '5px 10px', color: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>OK</button>
                      <button onClick={() => setEditingQuota(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--t3)', padding: 4 }}><FiX size={13} /></button>
                    </div>
                  ) : (
                    <button
                      onClick={() => { setQuotaVal(String(selected.monthlyQuota ?? '')); setEditingQuota(true); }}
                      style={{ display: 'flex', alignItems: 'center', gap: 5, background: 'var(--s2)', border: '1px solid var(--b2)', borderRadius: 7, padding: '5px 10px', color: 'var(--t2)', fontSize: 11, cursor: 'pointer', transition: 'all .15s' }}
                      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = selected.color; (e.currentTarget as HTMLElement).style.color = selected.color; }}
                      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--b2)'; (e.currentTarget as HTMLElement).style.color = 'var(--t2)'; }}
                    >
                      <FiEdit2 size={10} />
                      {selected.monthlyQuota ? `${selected.monthlyQuota} artes/mês` : 'Definir cota'}
                    </button>
                  )}
                </div>

                <div style={{ display: 'flex', alignItems: 'flex-end', gap: 16, marginBottom: 10 }}>
                  <div>
                    <div style={{ fontSize: 11, color: 'var(--t3)', marginBottom: 4 }}>
                      {format(new Date(), "MMMM 'de' yyyy", { locale: ptBR })}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                      <span style={{
                        fontSize: 36, fontWeight: 700, lineHeight: 1,
                        color: selected.monthlyQuota
                          ? currentMonthDone >= selected.monthlyQuota ? '#30d158'
                            : currentMonthDone >= selected.monthlyQuota * 0.8 ? '#ff9f0a' : 'var(--t1)'
                          : 'var(--t1)',
                      }}>{currentMonthDone}</span>
                      {selected.monthlyQuota && (
                        <>
                          <span style={{ fontSize: 20, color: 'var(--t4)', fontWeight: 300 }}>/</span>
                          <span style={{ fontSize: 20, color: 'var(--t3)', fontWeight: 400 }}>{selected.monthlyQuota}</span>
                        </>
                      )}
                      <span style={{ fontSize: 12, color: 'var(--t4)', marginLeft: 4 }}>artes feitas</span>
                    </div>
                  </div>
                </div>

                {selected.monthlyQuota && (
                  <div style={{ marginBottom: 16 }}>
                    <div style={{ height: 4, background: 'var(--b1)', borderRadius: 2, overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${Math.min((currentMonthDone / selected.monthlyQuota) * 100, 100)}%`, background: currentMonthDone >= selected.monthlyQuota ? '#30d158' : currentMonthDone >= selected.monthlyQuota * 0.8 ? '#ff9f0a' : selected.color, borderRadius: 2, transition: 'width .4s ease' }} />
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
                      <span style={{ fontSize: 10, color: 'var(--t4)' }}>{Math.round((currentMonthDone / selected.monthlyQuota) * 100)}% da cota</span>
                      {currentMonthDone < selected.monthlyQuota && <span style={{ fontSize: 10, color: 'var(--t4)' }}>faltam {selected.monthlyQuota - currentMonthDone}</span>}
                      {currentMonthDone >= selected.monthlyQuota && <span style={{ fontSize: 10, color: '#30d158', fontWeight: 600 }}>cota atingida!</span>}
                    </div>
                  </div>
                )}

                {monthlyHistory.length > 0 && (
                  <div>
                    <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '1.5px', textTransform: 'uppercase', color: 'var(--t4)', marginBottom: 8 }}>Histórico</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4, maxHeight: 200, overflowY: 'auto' }}>
                      {monthlyHistory.map(({ month, done }) => {
                        const quota = selected.monthlyQuota;
                        const isCurrentMonth = month === currentMonthStr;
                        const pct = quota ? Math.min((done / quota) * 100, 100) : null;
                        const monthLabel = format(parseISO(`${month}-01`), "MMM yyyy", { locale: ptBR });
                        return (
                          <div key={month} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 10px', borderRadius: 8, background: isCurrentMonth ? `${selected.color}10` : 'var(--s1)', border: `1px solid ${isCurrentMonth ? `${selected.color}25` : 'var(--b1)'}` }}>
                            <span style={{ fontSize: 11, color: isCurrentMonth ? 'var(--t1)' : 'var(--t2)', width: 60, flexShrink: 0, textTransform: 'capitalize' }}>{monthLabel}</span>
                            {pct !== null && (
                              <div style={{ flex: 1, height: 3, background: 'var(--b1)', borderRadius: 2, overflow: 'hidden' }}>
                                <div style={{ height: '100%', width: `${pct}%`, background: done >= (quota ?? 0) ? '#30d158' : selected.color, borderRadius: 2 }} />
                              </div>
                            )}
                            {pct === null && <div style={{ flex: 1 }} />}
                            <span style={{ fontSize: 12, fontWeight: 600, flexShrink: 0, color: quota ? (done >= quota ? '#30d158' : done >= quota * 0.8 ? '#ff9f0a' : 'var(--t2)') : 'var(--t2)' }}>
                              {done}{quota ? `/${quota}` : ''}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* SubClients */}
              <div style={{ ...CARD, marginBottom: 14 }}>
                <div style={{ padding: '14px 18px 10px', borderBottom: '1px solid var(--b1)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <FiUsers size={13} style={{ color: 'var(--t3)' }} />
                    <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '1.5px', textTransform: 'uppercase', color: 'var(--t3)' }}>Subclients</span>
                  </div>
                  <span style={{ fontSize: 10, color: 'var(--t4)' }}>clique para notas/dicas</span>
                </div>
                <div style={{ padding: '8px 8px' }}>
                  {companySubs.length === 0 && !showNewSub && (
                    <div style={{ textAlign: 'center', padding: '28px 0', color: 'var(--t4)', fontSize: 13 }}>Nenhum subclient ainda</div>
                  )}
                  {companySubs.map((sub, i) => {
                    const weekCount = weekTasksFor(sub.id);
                    const hasTips   = (sub.tips?.length ?? 0) > 0;
                    return (
                      <motion.div key={sub.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
                        style={{ borderRadius: 10, marginBottom: 4, overflow: 'hidden' }}
                      >
                        {/* Main row */}
                        {(() => {
                          const sDone  = subMonthDone(sub.id);
                          const sQuota = sub.monthlyQuota;
                          const sPct   = sQuota ? Math.min((sDone / sQuota) * 100, 100) : null;
                          const sColor = sQuota
                            ? sDone >= sQuota ? '#30d158'
                              : sDone >= sQuota * 0.8 ? '#ff9f0a'
                              : selected.color
                            : selected.color;
                          return (
                            <>
                              <div
                                style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', background: 'transparent', transition: 'background .15s', cursor: 'pointer' }}
                                onClick={() => openClientModal(sub.id, 'notas')}
                                onMouseEnter={e => ((e.currentTarget as HTMLElement).style.background = 'var(--s1)')}
                                onMouseLeave={e => ((e.currentTarget as HTMLElement).style.background = 'transparent')}
                              >
                                <div style={{ width: 7, height: 7, borderRadius: '50%', background: selected.color, flexShrink: 0 }} />
                                {editingSubId === sub.id ? (
                                  <input autoFocus value={editingSubName} onChange={e => setEditingSubName(e.target.value)}
                                    onKeyDown={e => { if (e.key === 'Enter') saveEditSub(); if (e.key === 'Escape') setEditingSubId(null); }}
                                    onBlur={saveEditSub} onClick={e => e.stopPropagation()}
                                    style={{ flex: 1, background: 'var(--ib)', border: '1px solid var(--b3)', borderRadius: 6, padding: '4px 8px', color: 'var(--t1)', fontSize: 13, outline: 'none' }}
                                  />
                                ) : (
                                  <span style={{ flex: 1, fontSize: 13, color: 'var(--t2)' }}>{sub.name}</span>
                                )}

                                {/* Indicators */}
                                <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexShrink: 0 }}>
                                  {/* Sub quota badge */}
                                  {editingSubQuotaId === sub.id ? (
                                    <input
                                      autoFocus
                                      type="number" min="1"
                                      value={editingSubQuotaVal}
                                      onChange={e => setEditingSubQuotaVal(e.target.value)}
                                      onKeyDown={e => { if (e.key === 'Enter') handleSaveSubQuota(sub.id); if (e.key === 'Escape') setEditingSubQuotaId(null); }}
                                      onBlur={() => handleSaveSubQuota(sub.id)}
                                      onClick={e => e.stopPropagation()}
                                      placeholder="cota"
                                      style={{ width: 52, background: 'var(--ib)', border: `1px solid ${selected.color}`, borderRadius: 6, padding: '2px 6px', color: 'var(--t1)', fontSize: 11, outline: 'none', textAlign: 'center' }}
                                    />
                                  ) : (
                                    <button
                                      title={sQuota ? `Cota: ${sDone}/${sQuota} artes — clique para editar` : 'Definir cota do subclient'}
                                      onClick={e => { e.stopPropagation(); setEditingSubQuotaVal(String(sQuota ?? '')); setEditingSubQuotaId(sub.id); }}
                                      style={{ display: 'flex', alignItems: 'center', gap: 3, background: sQuota ? `${sColor}18` : 'var(--s1)', border: `1px solid ${sQuota ? `${sColor}40` : 'var(--b1)'}`, borderRadius: 99, padding: '1px 7px', cursor: 'pointer', color: sQuota ? sColor : 'var(--t4)', fontSize: 10, fontWeight: 700, transition: 'all .15s' }}
                                    >
                                      {sQuota ? `${sDone}/${sQuota}` : <><FiEdit2 size={8} /><span style={{ marginLeft: 2 }}>cota</span></>}
                                    </button>
                                  )}
                                  {weekCount > 0 && (
                                    <span title="Tarefas esta semana" style={{ fontSize: 10, fontWeight: 700, color: selected.color, background: `${selected.color}18`, borderRadius: 99, padding: '1px 6px' }}>
                                      {weekCount}
                                    </span>
                                  )}
                                  {sub.notes && sub.notes.trim() && (
                                    <FiFileText size={11} style={{ color: '#64C4FF', opacity: 0.7 }} />
                                  )}
                                  {hasTips && (
                                    <button
                                      onClick={e => { e.stopPropagation(); openClientModal(sub.id, 'dicas'); }}
                                      title={`${sub.tips!.length} dica${sub.tips!.length !== 1 ? 's' : ''}`}
                                      style={{ display: 'flex', alignItems: 'center', gap: 3, background: 'rgba(255,159,10,0.12)', border: '1px solid rgba(255,159,10,0.25)', borderRadius: 99, padding: '1px 6px', cursor: 'pointer', color: '#ff9f0a' }}
                                    >
                                      <FiStar size={9} />
                                      <span style={{ fontSize: 9, fontWeight: 700 }}>{sub.tips!.length}</span>
                                    </button>
                                  )}
                                </div>

                                <div style={{ display: 'flex', gap: 4 }} onClick={e => e.stopPropagation()}>
                                  <button onClick={e => { e.stopPropagation(); startEditSub(sub); }}
                                    style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--t4)', padding: 4, borderRadius: 6, transition: 'color .15s' }}
                                    onMouseEnter={e => ((e.currentTarget as HTMLElement).style.color = '#64C4FF')}
                                    onMouseLeave={e => ((e.currentTarget as HTMLElement).style.color = 'var(--t4)')}
                                  ><FiEdit2 size={11} /></button>
                                  <button onClick={e => { e.stopPropagation(); handleDeleteSubClient(sub); }}
                                    style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--t4)', padding: 4, borderRadius: 6, transition: 'color .15s' }}
                                    onMouseEnter={e => ((e.currentTarget as HTMLElement).style.color = '#ff453a')}
                                    onMouseLeave={e => ((e.currentTarget as HTMLElement).style.color = 'var(--t4)')}
                                  ><FiTrash2 size={11} /></button>
                                </div>
                              </div>

                              {/* Sub quota progress bar */}
                              {sPct !== null && (
                                <div style={{ padding: '0 12px 8px 28px' }}>
                                  <div style={{ height: 3, background: 'var(--b1)', borderRadius: 2, overflow: 'hidden' }}>
                                    <div style={{ height: '100%', width: `${sPct}%`, background: sColor, borderRadius: 2, transition: 'width .4s ease' }} />
                                  </div>
                                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 3 }}>
                                    <span style={{ fontSize: 9, color: 'var(--t4)' }}>{Math.round(sPct)}% da cota</span>
                                    {sDone >= (sQuota ?? 0)
                                      ? <span style={{ fontSize: 9, color: '#30d158', fontWeight: 600 }}>cota atingida!</span>
                                      : <span style={{ fontSize: 9, color: 'var(--t4)' }}>faltam {(sQuota ?? 0) - sDone}</span>
                                    }
                                  </div>
                                </div>
                              )}
                            </>
                          );
                        })()}

                        {/* Tips preview chips */}
                        {hasTips && (
                          <div
                            style={{ display: 'flex', flexWrap: 'wrap', gap: 4, padding: '0 12px 8px 28px', cursor: 'pointer' }}
                            onClick={() => openClientModal(sub.id, 'dicas')}
                          >
                            {sub.tips!.slice(0, 3).map((tip, ti) => (
                              <span key={ti} style={{ fontSize: 10, padding: '2px 8px', borderRadius: 99, background: 'rgba(255,159,10,0.1)', border: '1px solid rgba(255,159,10,0.2)', color: '#ff9f0a', lineHeight: 1.4 }}>
                                {tip}
                              </span>
                            ))}
                            {sub.tips!.length > 3 && (
                              <span style={{ fontSize: 10, color: 'var(--t4)', padding: '2px 4px' }}>+{sub.tips!.length - 3}</span>
                            )}
                          </div>
                        )}
                      </motion.div>
                    );
                  })}

                  {showNewSub && (
                    <div style={{ display: 'flex', gap: 8, padding: '8px 12px', alignItems: 'center' }}>
                      <input autoFocus value={newSub} onChange={e => setNewSub(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') handleAddSub(); if (e.key === 'Escape') setShowNewSub(false); }}
                        placeholder="Nome do subclient..."
                        style={{ flex: 1, background: 'var(--ib)', border: '1px solid var(--b2)', borderRadius: 8, padding: '8px 10px', color: 'var(--t1)', fontSize: 13, outline: 'none' }}
                      />
                      <button onClick={handleAddSub} style={{ padding: '8px 14px', borderRadius: 8, background: selected.color, border: 'none', color: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>OK</button>
                      <button onClick={() => setShowNewSub(false)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--t3)', padding: 6 }}><FiX size={14} /></button>
                    </div>
                  )}
                  <button onClick={() => setShowNewSub(true)} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 8, padding: '9px 12px', borderRadius: 10, marginTop: 4, background: 'transparent', border: '1px dashed var(--b2)', color: 'var(--t4)', fontSize: 12, cursor: 'pointer', transition: 'all .15s' }}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = selected.color; (e.currentTarget as HTMLElement).style.color = selected.color; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--b2)'; (e.currentTarget as HTMLElement).style.color = 'var(--t4)'; }}
                  ><FiPlus size={13} /> Novo Subclient</button>
                </div>
              </div>

              {/* Task list per company */}
              <div style={CARD}>
                <div style={{ width: '100%', padding: '14px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <button
                    onClick={() => setShowTaskList(s => !s)}
                    style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'transparent', border: 'none', cursor: 'pointer', padding: 0 }}
                  >
                    <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '1.5px', textTransform: 'uppercase', color: 'var(--t3)' }}>
                      {showTaskTrash ? `Lixeira (${trashedCompanyTasks.length})` : `Tarefas (${totalTasks})`}
                    </span>
                    {showTaskList ? <FiChevronUp size={12} style={{ color: 'var(--t4)' }} /> : <FiChevronDown size={12} style={{ color: 'var(--t4)' }} />}
                  </button>
                  <button
                    onClick={() => setShowTaskTrash(s => !s)}
                    title={showTaskTrash ? 'Voltar para tarefas ativas' : `Lixeira (${trashedCompanyTasks.length})`}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 4,
                      padding: '3px 8px', borderRadius: 6, fontSize: 10, fontWeight: 600,
                      background: showTaskTrash ? 'rgba(255,69,58,0.12)' : 'transparent',
                      border: `1px solid ${showTaskTrash ? 'rgba(255,69,58,0.3)' : 'var(--b2)'}`,
                      color: showTaskTrash ? '#ff453a' : 'var(--t4)',
                      cursor: 'pointer', transition: 'all .15s',
                    }}
                  >
                    <FiArchive size={9} />
                    {showTaskTrash ? 'Voltar' : `Lixeira${trashedCompanyTasks.length > 0 ? ` (${trashedCompanyTasks.length})` : ''}`}
                  </button>
                </div>

                {showTaskList && !showTaskTrash && (
                  <div style={{ padding: '0 12px 12px', maxHeight: 320, overflowY: 'auto' }}>
                    {companyTasks.length === 0 ? (
                      <div style={{ textAlign: 'center', padding: '20px 0', color: 'var(--t4)', fontSize: 13 }}>Nenhuma tarefa</div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                        {companyTasks.sort((a, b) => a.date.localeCompare(b.date)).map(task => {
                          const title = getTaskTitle(task, companies, subClients);
                          const sub   = subClients.find(s => s.id === task.subClientId);
                          return (
                            <div key={task.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', borderRadius: 8, background: 'var(--s1)', border: '1px solid var(--b1)' }}>
                              <div style={{ width: 6, height: 6, borderRadius: '50%', background: STATUS_COLOR[task.status], flexShrink: 0 }} />
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ fontSize: 12, color: 'var(--t2)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', textDecoration: task.status === 'done' ? 'line-through' : 'none', opacity: task.status === 'done' ? 0.5 : 1 }}>
                                  {title}
                                </div>
                                {sub && <div style={{ fontSize: 10, color: 'var(--t4)', marginTop: 1 }}>{sub.name}</div>}
                              </div>
                              <span style={{ fontSize: 10, color: 'var(--t4)', flexShrink: 0 }}>
                                {format(parseISO(task.date), "d MMM", { locale: ptBR })}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}

                {showTaskList && showTaskTrash && (
                  <div style={{ padding: '0 12px 12px', maxHeight: 320, overflowY: 'auto' }}>
                    {trashedCompanyTasks.length === 0 ? (
                      <div style={{ textAlign: 'center', padding: '20px 0', color: 'var(--t4)', fontSize: 13 }}>
                        Lixeira vazia
                        <div style={{ fontSize: 10, marginTop: 4 }}>Tarefas são removidas após 30 dias</div>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                        {trashedCompanyTasks.map(task => {
                          const title = getTaskTitle(task, companies, subClients);
                          const sub   = subClients.find(s => s.id === task.subClientId);
                          const days  = task.deletedAt ? differenceInDays(new Date(), parseISO(task.deletedAt)) : 0;
                          const isConfirm = confirmPermaTaskId === task.id;
                          return (
                            <div key={task.id} style={{ padding: '8px 10px', borderRadius: 8, background: 'var(--s1)', border: '1px solid var(--b1)' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                <div style={{ width: 6, height: 6, borderRadius: '50%', background: STATUS_COLOR[task.status], flexShrink: 0, opacity: 0.5 }} />
                                <div style={{ flex: 1, minWidth: 0 }}>
                                  <div style={{ fontSize: 12, color: 'var(--t2)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', textDecoration: 'line-through', opacity: 0.7 }}>
                                    {title}
                                  </div>
                                  <div style={{ fontSize: 10, color: 'var(--t4)', marginTop: 1 }}>
                                    {sub ? `${sub.name} · ` : ''}há {days === 0 ? 'menos de 1 dia' : `${days} dia${days !== 1 ? 's' : ''}`}
                                  </div>
                                </div>
                                {!isConfirm && (
                                  <div style={{ display: 'flex', gap: 2, flexShrink: 0 }}>
                                    <button
                                      onClick={() => handleRestoreTask(task.id)}
                                      title="Restaurar tarefa"
                                      style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--t4)', padding: 4, borderRadius: 6, display: 'flex' }}
                                      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = '#30d158'; }}
                                      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'var(--t4)'; }}
                                    ><FiRotateCcw size={11} /></button>
                                    <button
                                      onClick={() => setConfirmPermaTaskId(task.id)}
                                      title="Excluir permanentemente"
                                      style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--t4)', padding: 4, borderRadius: 6, display: 'flex' }}
                                      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = '#ff453a'; }}
                                      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'var(--t4)'; }}
                                    ><FiTrash2 size={11} /></button>
                                  </div>
                                )}
                              </div>
                              <AnimatePresence>
                                {isConfirm && (
                                  <motion.div
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: 'auto' }}
                                    exit={{ opacity: 0, height: 0 }}
                                    style={{ overflow: 'hidden', marginTop: 6 }}
                                  >
                                    <div style={{ padding: '6px 8px', borderRadius: 7, background: 'rgba(255,69,58,0.06)', border: '1px solid rgba(255,69,58,0.2)' }}>
                                      <div style={{ fontSize: 10, color: '#ff453a', marginBottom: 6 }}>
                                        <FiAlertTriangle size={9} style={{ marginRight: 3, verticalAlign: 'middle' }} />
                                        Excluir permanentemente?
                                      </div>
                                      <div style={{ display: 'flex', gap: 4 }}>
                                        <button onClick={() => handlePermaDeleteTask(task.id)}
                                          style={{ flex: 1, padding: '4px 0', borderRadius: 6, background: '#ff453a', border: 'none', color: '#fff', fontSize: 10, fontWeight: 600, cursor: 'pointer' }}>
                                          Excluir
                                        </button>
                                        <button onClick={() => setConfirmPermaTaskId(null)}
                                          style={{ flex: 1, padding: '4px 0', borderRadius: 6, background: 'var(--s2)', border: '1px solid var(--b2)', color: 'var(--t2)', fontSize: 10, cursor: 'pointer' }}>
                                          Cancelar
                                        </button>
                                      </div>
                                    </div>
                                  </motion.div>
                                )}
                              </AnimatePresence>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </motion.div>
          ) : (
            <div style={{ ...CARD, padding: 40, textAlign: 'center', color: 'var(--t4)', fontSize: 14 }}>Selecione uma empresa</div>
          )}
        </div>
      </div>
    </div>
  );
}
