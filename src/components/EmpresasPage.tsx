import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FiPlus, FiEdit2, FiTrash2, FiCheck, FiX,
  FiUsers, FiFileText, FiChevronUp, FiChevronDown,
  FiTarget, FiAlertTriangle, FiStar, FiLink,
  FiPhone, FiMail, FiInstagram, FiDollarSign, FiExternalLink,
  FiMove, FiSearch, FiZap, FiArchive, FiGrid, FiList,
  FiCalendar, FiMessageCircle, FiSend, FiTrendingUp,
  FiChevronRight, FiSliders, FiMenu,
} from 'react-icons/fi';
import { useIsMobile } from '../hooks/useMediaQuery';
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, useSortable, arrayMove } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import type { DragEndEvent } from '@dnd-kit/core';
import { format, parseISO, startOfWeek, endOfWeek, isWithinInterval, differenceInDays, isBefore } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { SubClient, CompanyInteraction } from '../types';
import { getTaskTitle } from '../types';
import { useTaskStore } from '../store/tasks';
import { useIdeasStore } from '../store/ideas';
import { useProposalsStore } from '../store/proposals';
import { useVisibleWorkspaceIds, isInLens } from '../store/workspaces';
import { FiCheckSquare } from 'react-icons/fi';
void FiCheckSquare;

const PRESET_COLORS = [
  '#30d158','#ff9f0a','#ff453a','#bf5af2','#636366',
  '#356BFF','#64C4FF','#ff6b6b','#ffd60a','#5e5ce6',
];

const CARD: React.CSSProperties = {
  background: 'var(--s1)',
  borderRadius: 16,
  border: '1px solid var(--b2)',
};

const STATUS_COLOR: Record<string, string> = { todo: '#ff9f0a', doing: '#64C4FF', done: '#30d158' };
const STATUS_LABEL: Record<string, string> = { todo: 'A Fazer', doing: 'Em And.', done: 'Feito' };
const STATUS_RGB: Record<string, string>   = { todo: '255,159,10', doing: '100,196,255', done: '48,209,88' };

const SEGMENTS = ['Moda', 'Alimentação', 'Saúde', 'Tech', 'Beleza', 'Educação', 'Imóveis', 'Esportes', 'Serviços', 'Varejo', 'Outro'];
const INTERACTION_LABELS: Record<CompanyInteraction['type'], string> = { email: 'E-mail', call: 'Ligação', meeting: 'Reunião', message: 'Mensagem', outro: 'Outro' };
const PAYMENT_COLORS: Record<string, { text: string; bg: string }> = {
  pago:     { text: '#30d158', bg: 'rgba(48,209,88,0.15)' },
  pendente: { text: '#ff9f0a', bg: 'rgba(255,159,10,0.15)' },
  atrasado: { text: '#ff453a', bg: 'rgba(255,69,58,0.15)' },
};

function CompanyAvatar({ name, color, size = 36, override }: { name: string; color: string; size?: number; override?: string }) {
  const initials = (override ?? name).slice(0, 2).toUpperCase();
  return (
    <div style={{ width: size, height: size, borderRadius: size * 0.28, background: `${color}22`, border: `1.5px solid ${color}55`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
      <span style={{ fontSize: size * 0.36, fontWeight: 700, color, letterSpacing: '-0.5px' }}>{initials}</span>
    </div>
  );
}

function ContactShortcuts({ whatsapp, instagram, email, siteUrl, accentColor, size = 11 }: {
  whatsapp?: string; instagram?: string; email?: string; siteUrl?: string; accentColor?: string; size?: number;
}) {
  const links = [
    { icon: FiPhone,        href: whatsapp  ? `https://wa.me/${whatsapp.replace(/\D/g,'')}` : null, title: `WhatsApp: ${whatsapp}`,    color: '#25D366' },
    { icon: FiInstagram,    href: instagram ? `https://instagram.com/${instagram.replace('@','')}` : null, title: `Instagram: ${instagram}`, color: '#E1306C' },
    { icon: FiMail,         href: email     ? `mailto:${email}` : null,   title: `E-mail: ${email}`,   color: '#64C4FF' },
    { icon: FiExternalLink, href: siteUrl   ? siteUrl : null,             title: `Site: ${siteUrl}`,   color: accentColor ?? '#64C4FF' },
  ].filter(l => l.href);
  if (!links.length) return null;
  return (
    <div style={{ display: 'flex', gap: 3, alignItems: 'center' }} onClick={e => e.stopPropagation()}>
      {links.map(({ icon: Icon, href, title, color }) => (
        <button key={title} onClick={e => { e.stopPropagation(); window.open(href!, '_blank'); }}
          title={title}
          style={{ width: size + 13, height: size + 13, borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', background: `${color}18`, border: `1px solid ${color}35`, cursor: 'pointer', color, transition: 'all .15s', flexShrink: 0 }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = `${color}30`; (e.currentTarget as HTMLElement).style.borderColor = `${color}70`; }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = `${color}18`; (e.currentTarget as HTMLElement).style.borderColor = `${color}35`; }}
        >
          <Icon size={size} />
        </button>
      ))}
    </div>
  );
}

function ColorDot({ color, selected, onClick }: { color: string; selected: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} style={{
      width: 16, height: 16, borderRadius: '50%', background: color,
      border: selected ? '2px solid #fff' : '2px solid transparent',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      cursor: 'pointer', transition: 'transform .15s', flexShrink: 0, padding: 0,
    }}
      onMouseEnter={e => ((e.currentTarget as HTMLElement).style.transform = 'scale(1.2)')}
      onMouseLeave={e => ((e.currentTarget as HTMLElement).style.transform = 'none')}
    >
      {selected && <FiCheck size={8} color="#fff" />}
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
  onSaveSiteUrl: (siteUrl: string | undefined) => void;
}

function ClientModal({ sub, companyColor, initialTab = 'notas', onClose, onSaveNotes, onSaveTips, onSavePlatforms, onSaveSiteUrl }: ClientModalProps) {
  const [tab, setTab]       = useState<'notas' | 'dicas' | 'plataformas'>(initialTab);
  const [notes, setNotes]   = useState(sub.notes ?? '');
  const [tips, setTips]     = useState<string[]>(sub.tips ?? []);
  const [newTip, setNewTip] = useState('');
  const [whatsapp,  setWhatsapp]  = useState(sub.platforms?.whatsapp ?? '');
  const [instagram, setInstagram] = useState(sub.platforms?.instagram ?? '');
  const [email,     setEmail]     = useState(sub.platforms?.email ?? '');
  const [siteUrl,   setSiteUrl]   = useState(sub.siteUrl ?? '');

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
    onSaveSiteUrl(siteUrl.trim() || undefined);
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
                          background: `${companyColor}10`,
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
                  { icon: FiLink,    label: 'Site',      value: siteUrl,   setter: setSiteUrl,   placeholder: 'https://exemplo.com.br' },
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

// ─── Sortable wrapper for subclient rows ────────────────────────────────────

function SortableSubClientItem({ id, children }: {
  id: string;
  children: (dragHandleProps: React.HTMLAttributes<HTMLElement>) => React.ReactNode;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  return (
    <div ref={setNodeRef} style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.4 : 1 }}>
      {children({ ...listeners, ...attributes })}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

export function EmpresasPage({ defaultSelectedId, onNavigate }: { defaultSelectedId?: string | null; onNavigate?: (page: 'crm' | 'propostas' | 'ideias' | 'tarefas') => void }) {
  void onNavigate;
  const leads = useTaskStore(s => s.leads);
  const ideas = useIdeasStore(s => s.ideas);
  const proposals = useProposalsStore(s => s.proposals);
  const {
    companies, subClients, tasks,
    addCompany, updateCompany, deleteCompany,
    permanentlyDeleteCompany, restoreCompany,
    moveCompanyUp, moveCompanyDown,
    addSubClient, updateSubClient, deleteSubClient, reorderSubClients,
    restoreSubClient,
    permanentlyDeleteTask, restoreTask,
    updateSubClientNotes, updateSubClientTips,
    addTask, updateTask, deleteTask,
    archiveCompany, unarchiveCompany,
    addPaymentRecord, deletePaymentRecord,
    addInteraction, deleteInteraction,
    showToast, hideToast,
  } = useTaskStore();

  // Active (non-trashed) lists
  const visibleIds = useVisibleWorkspaceIds();
  const activeCompanies = companies.filter(c => !c.deletedAt && isInLens(c, visibleIds));

  // Trash window: items deleted within last 30 days
  const cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000;
  const trashedCompanies = companies
    .filter(c => c.deletedAt && new Date(c.deletedAt).getTime() >= cutoff)
    .sort((a, b) => (b.deletedAt ?? '').localeCompare(a.deletedAt ?? ''));
  void trashedCompanies;

  const [selectedId, setSelectedId]   = useState<string>(defaultSelectedId ?? activeCompanies[0]?.id ?? '');

  const isMobile = useIsMobile();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    if (defaultSelectedId) setSelectedId(defaultSelectedId);
  }, [defaultSelectedId]);
  const [newName, setNewName]         = useState('');
  const [newColor, setNewColor]       = useState(PRESET_COLORS[5]);
  const [newAvulso, setNewAvulso]     = useState(false);
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
  const [editingContractValue, setEditingContractValue] = useState(false);
  const [contractValueVal, setContractValueVal]         = useState('');
  const [editingSubContractId, setEditingSubContractId] = useState<string | null>(null);
  const [editingSubContractVal, setEditingSubContractVal] = useState('');
  const [editingCompanySiteUrl, setEditingCompanySiteUrl] = useState(false);
  const [companySiteUrlVal, setCompanySiteUrlVal]         = useState('');
  const [confirmDeleteCompanyId, setConfirmDeleteCompanyId] = useState<string | null>(null);
  const [hoveredTaskId, setHoveredTaskId] = useState<string | null>(null);
  const [subSearch, setSubSearch] = useState('');
  const [addingTaskForSub, setAddingTaskForSub] = useState<string | null>(null);
  const [quickTaskInput, setQuickTaskInput] = useState('');
  const [notesHoverId, setNotesHoverId] = useState<string | null>(null);
  const [editingCompanyPlatforms, setEditingCompanyPlatforms] = useState(false);
  const [cpWhatsapp, setCpWhatsapp] = useState('');
  const [cpInstagram, setCpInstagram] = useState('');
  const [cpEmail, setCpEmail] = useState('');

  // View / filter / sort (#8 #10 #24 #25)
  const [companyViewMode, setCompanyViewMode] = useState<'list' | 'grid'>('list');
  const [companyCompact, setCompanyCompact] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<'default' | 'az' | 'revenue' | 'tasks'>('default');
  const [showArchived, setShowArchived] = useState(false);

  // Global subclient search (#26)
  const [globalSubSearch, setGlobalSubSearch] = useState('');
  const [showGlobalSearch, setShowGlobalSearch] = useState(false);

  // Task list filters (#32 #40)
  const [taskFilterSub, setTaskFilterSub] = useState<string | null>(null);
  const [taskFilterCat, setTaskFilterCat] = useState<string | null>(null);

  // Financeiro section (#41 #44 #49 #12)
  const [showFinanceiro, setShowFinanceiro] = useState(false);
  const [addingPayment, setAddingPayment] = useState(false);
  const [paymentDate, setPaymentDate] = useState('');
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentDesc, setPaymentDesc] = useState('');
  const [editingInvoiceDue, setEditingInvoiceDue] = useState(false);
  const [invoiceDueVal, setInvoiceDueVal] = useState('');
  const [editingContractDates, setEditingContractDates] = useState(false);
  const [contractStartVal, setContractStartVal] = useState('');
  const [contractRenewalVal, setContractRenewalVal] = useState('');

  // Comunicação section (#51 #52 #55 #59)
  const [showComunicacao, setShowComunicacao] = useState(false);
  const [addingInteractionForm, setAddingInteractionForm] = useState(false);
  const [interactionDate, setInteractionDate] = useState('');
  const [interactionType, setInteractionType] = useState<CompanyInteraction['type']>('call');
  const [interactionNote, setInteractionNote] = useState('');
  const [editingNextContact, setEditingNextContact] = useState(false);
  const [nextContactVal, setNextContactVal] = useState('');
  const [editingMonthlyNote, setEditingMonthlyNote] = useState(false);
  const [monthlyNoteVal, setMonthlyNoteVal] = useState('');
  const [editingInactivityDays, setEditingInactivityDays] = useState(false);
  const [inactivityDaysVal, setInactivityDaysVal] = useState('');

  // Company detail fields (#11 #13 #14 #60 #54)
  const [editingCnpj, setEditingCnpj] = useState(false);
  const [cnpjVal, setCnpjVal] = useState('');
  const [editingSegment, setEditingSegment] = useState(false);
  const [segmentVal, setSegmentVal] = useState('');
  const [editingFollowers, setEditingFollowers] = useState(false);
  const [followersVal, setFollowersVal] = useState('');
  const NEXT_STATUS: Record<string, 'todo' | 'doing' | 'done'> = { todo: 'doing', doing: 'done', done: 'todo' };

  // DnD sensors
  const dndSensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  const handleSubDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIdx = companySubs.findIndex(s => s.id === active.id);
    const newIdx = companySubs.findIndex(s => s.id === over.id);
    reorderSubClients(selectedId, arrayMove(companySubs, oldIdx, newIdx).map(s => s.id));
  };

  const handleQuickAddTask = (sub: SubClient) => {
    const title = quickTaskInput.trim();
    if (!title) return;
    addTask({
      companyId: sub.companyId,
      subClientId: sub.id,
      taskType: 'outro',
      customType: title,
      sequence: 0,
      date: format(new Date(), 'yyyy-MM-dd'),
      status: 'todo',
      allDay: true,
      createdAt: new Date().toISOString(),
    });
    setQuickTaskInput('');
    setAddingTaskForSub(null);
  };

  const handleSaveCompanyPlatforms = () => {
    if (!selected) return;
    updateCompany(selected.id, {
      platforms: {
        whatsapp: cpWhatsapp.trim() || undefined,
        instagram: cpInstagram.trim() || undefined,
        email: cpEmail.trim() || undefined,
      },
    });
    setEditingCompanyPlatforms(false);
  };

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
  void trashedCompanyTasks;

  // Backlinks counts — leads / proposals / ideas tied to this company
  const leadsCount     = selectedId
    ? leads.filter(l => l.linkedCompanyId === selectedId || l.convertedToCompanyId === selectedId).length
    : 0;
  const proposalsCount = selectedId
    ? proposals.filter(p => p.linkedCompanyId === selectedId).length
    : 0;
  const ideasCount     = selectedId
    ? ideas.filter(i => i.linkedCompanyId === selectedId && !i.deletedAt).length
    : 0;
  void leadsCount; void proposalsCount; void ideasCount;

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

  // Inactivity — days since last task for company
  const companyInactivityDays = (() => {
    const dates = companyTasks.map(t => t.date).sort().reverse();
    if (dates.length === 0) return null;
    const last = parseISO(dates[0]);
    return differenceInDays(new Date(), last);
  })();

  // Inactivity per subclient
  const subInactivityDays = (subId: string): number | null => {
    const dates = tasks
      .filter(t => t.subClientId === subId && !t.archived)
      .map(t => t.date)
      .sort()
      .reverse();
    if (dates.length === 0) return null;
    return differenceInDays(new Date(), parseISO(dates[0]));
  };

  // Monthly history
  const monthlyHistory: { month: string; done: number }[] = (() => {
    const map: Record<string, number> = {};
    companyTasks.forEach(t => {
      if (t.status === 'done') { const m = t.date.slice(0, 7); map[m] = (map[m] ?? 0) + 1; }
    });
    return Object.entries(map).sort(([a], [b]) => b.localeCompare(a)).map(([month, done]) => ({ month, done }));
  })();

  const activeCount  = companies.filter(c => (c.status ?? 'ativo') === 'ativo').length;
  const openCount    = tasks.filter(t => t.status !== 'done' && !t.archived).length;

  const filteredCompanySubs = companySubs.filter(s =>
    !subSearch || s.name.toLowerCase().includes(subSearch.toLowerCase())
  );

  const clientSub = selectedSubForClient ? subClients.find(s => s.id === selectedSubForClient) : null;

  const today = format(new Date(), 'yyyy-MM-dd');
  const mrr = companies.filter(c => (c.status ?? 'ativo') === 'ativo' && !c.archived).reduce((s, c) => s + (c.contractValue ?? 0), 0);
  const overdueCount = companyTasks.filter(t => t.status !== 'done' && t.date < today).length;
  const inboxCountFor = (id: string) => tasks.filter(t => t.companyId === id && t.inbox && !t.archived).length;
  const nextTaskFor = (subId: string) => tasks.filter(t => t.subClientId === subId && t.status !== 'done' && !t.archived && !t.inbox).sort((a, b) => a.date.localeCompare(b.date))[0] ?? null;

  const sortedFilteredCompanies = companies
    .filter(c => {
      if (!showArchived && c.archived) return false;
      if (statusFilter && (c.status ?? 'ativo') !== statusFilter) return false;
      if (globalSubSearch) {
        const q = globalSubSearch.toLowerCase();
        return c.name.toLowerCase().includes(q) || subClients.filter(s => s.companyId === c.id).some(s => s.name.toLowerCase().includes(q));
      }
      return true;
    })
    .sort((a, b) => {
      if (sortBy === 'az') return a.name.localeCompare(b.name);
      if (sortBy === 'revenue') return (b.contractValue ?? 0) - (a.contractValue ?? 0);
      if (sortBy === 'tasks') return taskCountFor(b.id) - taskCountFor(a.id);
      return 0;
    });

  const filteredCompanyTasks = companyTasks.filter(t =>
    (!taskFilterSub || t.subClientId === taskFilterSub) &&
    (!taskFilterCat || (t.taskCategory ?? 'criacao') === taskFilterCat)
  );

  const handleAddCompany = () => {
    const name = newName.trim().toUpperCase();
    if (!name) return;
    addCompany({ name, color: newColor, avulso: newAvulso || undefined });
    setNewName(''); setNewAvulso(false); setShowNew(false);
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

  const handleSaveContractValue = () => {
    if (!selected) return;
    const n = parseFloat(contractValueVal.replace(',', '.'));
    updateCompany(selected.id, { contractValue: isNaN(n) || n <= 0 ? undefined : n });
    setEditingContractValue(false);
  };

  const handleSaveSubContract = (subId: string) => {
    const n = parseFloat(editingSubContractVal.replace(',', '.'));
    updateSubClient(subId, { contractValue: isNaN(n) || n <= 0 ? undefined : n });
    setEditingSubContractId(null);
  };

  const handleSaveCompanySiteUrl = () => {
    if (!selected) return;
    const url = companySiteUrlVal.trim();
    updateCompany(selected.id, { siteUrl: url || undefined });
    setEditingCompanySiteUrl(false);
  };

  const formatCurrency = (value: number) =>
    value.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 2 });

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
  void handleRestoreCompany;

  const handlePermaDeleteCompany = (companyId: string) => {
    permanentlyDeleteCompany(companyId);
    showToast('Empresa deletada permanentemente');
    setTimeout(hideToast, 3000);
  };
  void handlePermaDeleteCompany;

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
  void handleRestoreTask;

  const handlePermaDeleteTask = (id: string) => {
    permanentlyDeleteTask(id);
    showToast('Tarefa deletada permanentemente');
    setTimeout(hideToast, 3000);
  };
  void handlePermaDeleteTask;

  const openClientModal = (subId: string, tab: 'notas' | 'dicas' = 'notas') => {
    setClientModalTab(tab);
    setSelectedSubForClient(subId);
  };

  const handleArchiveCompany = (id: string) => {
    archiveCompany(id);
    if (selectedId === id) setSelectedId(companies.find(c => c.id !== id && !c.archived)?.id ?? '');
    showToast('Empresa arquivada'); setTimeout(hideToast, 3000);
  };

  const handleAddPayment = () => {
    if (!selected || !paymentAmount) return;
    const amount = parseFloat(paymentAmount.replace(',', '.'));
    if (isNaN(amount)) return;
    addPaymentRecord(selected.id, { date: paymentDate || today, amount, description: paymentDesc.trim() || undefined });
    setPaymentAmount(''); setPaymentDesc(''); setPaymentDate(''); setAddingPayment(false);
  };

  const handleAddInteraction = () => {
    if (!selected || !interactionNote.trim()) return;
    addInteraction(selected.id, { date: interactionDate || today, type: interactionType, note: interactionNote.trim() });
    setInteractionNote(''); setInteractionDate(''); setInteractionType('call'); setAddingInteractionForm(false);
  };

  const handleSaveCnpj = () => {
    if (!selected) return;
    updateCompany(selected.id, { cnpj: cnpjVal.trim() || undefined });
    setEditingCnpj(false);
  };

  const handleSaveSegment = () => {
    if (!selected) return;
    updateCompany(selected.id, { segment: segmentVal || undefined });
    setEditingSegment(false);
  };

  const handleSaveFollowers = () => {
    if (!selected) return;
    const n = parseInt(followersVal.replace(/\D/g, ''), 10);
    updateCompany(selected.id, { followers: { instagram: isNaN(n) ? undefined : n } });
    setEditingFollowers(false);
  };

  const handleSaveNextContact = () => {
    if (!selected) return;
    updateCompany(selected.id, { nextContactDate: nextContactVal || undefined });
    setEditingNextContact(false);
  };

  const handleSaveMonthlyNote = () => {
    if (!selected) return;
    updateCompany(selected.id, { monthlyNote: monthlyNoteVal || undefined, monthlyNoteMonth: format(new Date(), 'yyyy-MM') });
    setEditingMonthlyNote(false);
  };

  const handleSaveInactivityDays = () => {
    if (!selected) return;
    const n = parseInt(inactivityDaysVal, 10);
    updateCompany(selected.id, { inactivityAlertDays: isNaN(n) || n <= 0 ? undefined : n });
    setEditingInactivityDays(false);
  };

  const generateWhatsAppReport = () => {
    if (!selected) return;
    const month = format(new Date(), "MMMM 'de' yyyy", { locale: ptBR });
    const doneTasks = companyTasks.filter(t => t.status === 'done' && t.date.startsWith(currentMonthStr));
    const pending = companyTasks.filter(t => t.status !== 'done');
    let msg = `*Relatório ${selected.name} — ${month}*\n\n`;
    msg += `✅ Entregues este mês: ${doneTasks.length}\n`;
    msg += `🔄 Em andamento: ${pending.filter(t => t.status === 'doing').length}\n`;
    msg += `📋 A fazer: ${pending.filter(t => t.status === 'todo').length}\n`;
    if (selected.monthlyQuota) msg += `🎯 Cota: ${currentMonthDone}/${selected.monthlyQuota}\n`;
    window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank');
  };

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
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
          onSaveSiteUrl={siteUrl => updateSubClient(clientSub.id, { siteUrl })}
        />
      )}

      {/* Compact sticky header */}
      <div style={{ padding: '14px 20px', flexShrink: 0, borderBottom: '1px solid var(--b2)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {isMobile && (
            <button
              onClick={() => setSidebarOpen(o => !o)}
              aria-label="Abrir menu lateral"
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 32, height: 32, borderRadius: 8, background: 'var(--s2)', border: '1px solid var(--b2)', color: 'var(--t2)', cursor: 'pointer', flexShrink: 0 }}
            >
              <FiMenu size={14} />
            </button>
          )}
          <div>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase', color: 'var(--t4)', marginBottom: 2 }}>Gestão</div>
            <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--t1)', letterSpacing: '-0.4px' }}>Empresas & Clientes</div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
          {([
            { label: 'Ativas',    value: activeCount,         color: '#30d158', rgb: '48,209,88' },
            { label: 'Subclients', value: subClients.length,  color: '#64C4FF', rgb: '100,196,255' },
            { label: 'Em aberto', value: openCount,           color: '#ff9f0a', rgb: '255,159,10' },
            ...(overdueCount > 0 ? [{ label: 'Atrasadas', value: overdueCount, color: '#ff453a', rgb: '255,69,58' }] : []),
            ...(mrr > 0 ? [{ label: 'MRR', value: `R$ ${mrr.toLocaleString('pt-BR')}`, color: '#30d158', rgb: '48,209,88' }] : []),
          ] as { label: string; value: string | number; color: string; rgb: string }[]).map(k => (
            <div key={k.label} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 10px', borderRadius: 8, background: `rgba(${k.rgb},0.08)`, border: `1px solid rgba(${k.rgb},0.2)` }}>
              <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.8px', textTransform: 'uppercase', color: `rgba(${k.rgb},0.6)` }}>{k.label}</span>
              <span style={{ fontSize: 13, fontWeight: 700, color: k.color }}>{k.value}</span>
            </div>
          ))}
        </div>
      </div>

      {/* 3-pane body */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        {/* Mobile backdrop */}
        {isMobile && sidebarOpen && (
          <div
            onClick={() => setSidebarOpen(false)}
            aria-hidden="true"
            style={{ position: 'fixed', inset: 0, zIndex: 49, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(2px)' }}
          />
        )}
        {/* Left sidebar: Companies list */}
        <div style={{
          ...(isMobile ? {
            position: 'fixed', top: 0, bottom: 0, left: 0, zIndex: 50,
            width: 280,
            background: 'var(--app-bg, #1c1c1e)',
            transform: sidebarOpen ? 'translateX(0)' : 'translateX(-100%)',
            transition: 'transform .25s ease',
            boxShadow: sidebarOpen ? '6px 0 24px rgba(0,0,0,0.4)' : 'none',
          } : {
            width: 230,
            background: 'rgba(0,0,0,0.14)',
          }),
          flexShrink: 0,
          borderRight: '1px solid var(--b2)',
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
        }}>
            {isMobile && (
              <div style={{ padding: '12px 12px 0', display: 'flex', justifyContent: 'flex-end' }}>
                <button
                  onClick={() => setSidebarOpen(false)}
                  aria-label="Fechar menu lateral"
                  style={{ width: 28, height: 28, borderRadius: 7, background: 'var(--s2)', border: '1px solid var(--b2)', color: 'var(--t3)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                >
                  <FiX size={13} />
                </button>
              </div>
            )}
            {/* Sidebar header + controls */}
            <div style={{ padding: '14px 12px 8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '1.5px', textTransform: 'uppercase', color: 'var(--t3)' }}>Empresas</span>
                <div style={{ display: 'flex', gap: 4 }}>
                  {/* Global subclient search toggle */}
                  <button onClick={() => setShowGlobalSearch(v => !v)} title="Buscar subclient" aria-label="Buscar subclient"
                    style={{ width: 24, height: 24, borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', background: showGlobalSearch ? 'rgba(100,196,255,0.15)' : 'var(--s1)', border: showGlobalSearch ? '1px solid rgba(100,196,255,0.4)' : '1px solid var(--b1)', cursor: 'pointer', color: showGlobalSearch ? '#64C4FF' : 'var(--t4)', transition: 'all .15s' }}
                  ><FiSearch size={11} /></button>
                  {/* View toggle */}
                  <button onClick={() => setCompanyViewMode(v => v === 'list' ? 'grid' : 'list')} title="Alternar visualização" aria-label="Alternar visualização"
                    style={{ width: 24, height: 24, borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--s1)', border: '1px solid var(--b1)', cursor: 'pointer', color: 'var(--t4)', transition: 'all .15s' }}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = '#64C4FF'; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'var(--t4)'; }}
                  >{companyViewMode === 'list' ? <FiGrid size={11} /> : <FiList size={11} />}</button>
                  {/* Compact toggle */}
                  <button onClick={() => setCompanyCompact(v => !v)} title="Modo compacto" aria-label="Modo compacto"
                    style={{ width: 24, height: 24, borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', background: companyCompact ? 'rgba(100,196,255,0.15)' : 'var(--s1)', border: companyCompact ? '1px solid rgba(100,196,255,0.4)' : '1px solid var(--b1)', cursor: 'pointer', color: companyCompact ? '#64C4FF' : 'var(--t4)', transition: 'all .15s' }}
                  ><FiSliders size={11} /></button>
                </div>
              </div>

              {/* Global subclient search */}
              {showGlobalSearch && (
                <div style={{ position: 'relative', marginBottom: 6 }}>
                  <FiSearch size={10} style={{ position: 'absolute', left: 7, top: '50%', transform: 'translateY(-50%)', color: 'var(--t4)', pointerEvents: 'none' }} />
                  <input autoFocus value={globalSubSearch} onChange={e => setGlobalSubSearch(e.target.value)} placeholder="Buscar empresa ou subclient..."
                    style={{ width: '100%', boxSizing: 'border-box', paddingLeft: 22, paddingRight: 8, paddingTop: 5, paddingBottom: 5, borderRadius: 7, background: 'var(--ib)', border: '1px solid var(--b2)', color: 'var(--t1)', fontSize: 11, outline: 'none' }}
                  />
                </div>
              )}

              {/* Status filter pills */}
              <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                {[null, 'ativo', 'pausado', 'inativo'].map(f => {
                  const labels: Record<string, string> = { ativo: 'Ativo', pausado: 'Pausado', inativo: 'Inativo' };
                  const colors: Record<string, string> = { ativo: '#30d158', pausado: '#ff9f0a', inativo: '#636366' };
                  const active = statusFilter === f;
                  const color = f ? colors[f] : '#64C4FF';
                  return (
                    <button key={String(f)} onClick={() => setStatusFilter(f)}
                      style={{ padding: '2px 8px', borderRadius: 99, fontSize: 10, fontWeight: active ? 700 : 400, border: 'none', cursor: 'pointer', transition: 'all .15s', background: active ? `${color}22` : 'transparent', color: active ? color : 'var(--t4)' }}
                    >{f === null ? 'Todos' : labels[f]}</button>
                  );
                })}
                {/* Sort */}
                <select value={sortBy} onChange={e => setSortBy(e.target.value as typeof sortBy)}
                  style={{ marginLeft: 'auto', fontSize: 10, background: 'var(--s1)', border: '1px solid var(--b1)', borderRadius: 6, padding: '2px 4px', color: 'var(--t3)', cursor: 'pointer', outline: 'none' }}
                >
                  <option value="default">Padrão</option>
                  <option value="az">A-Z</option>
                  <option value="revenue">Receita</option>
                  <option value="tasks">Tarefas</option>
                </select>
              </div>
            </div>

            <div style={{ padding: '4px 8px' }}>
              {companyViewMode === 'grid' ? (
                /* Grid view */
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, padding: '4px 4px 8px' }}>
                  {sortedFilteredCompanies.filter(c => !c.archived && !c.deletedAt).map(company => {
                    const active = selectedId === company.id;
                    const inbox = inboxCountFor(company.id);
                    return (
                      <button key={company.id} onClick={() => { setSelectedId(company.id); setConfirmDeleteCompanyId(null); if (isMobile) setSidebarOpen(false); }}
                        style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5, padding: '10px 8px', borderRadius: 10, background: active ? `${company.color}18` : 'var(--s1)', border: active ? `1px solid ${company.color}44` : '1px solid var(--b1)', cursor: 'pointer', transition: 'all .15s', textAlign: 'center' }}
                        onMouseEnter={e => { if (!active) (e.currentTarget as HTMLElement).style.background = 'var(--s2)'; }}
                        onMouseLeave={e => { if (!active) (e.currentTarget as HTMLElement).style.background = 'var(--s1)'; }}
                      >
                        <CompanyAvatar name={company.name} color={company.color} size={32} />
                        <span style={{ fontSize: 10, fontWeight: 600, color: active ? company.color : 'var(--t2)', textTransform: 'uppercase', letterSpacing: '0.5px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', width: '100%' }}>{company.name}</span>
                        {inbox > 0 && <span style={{ fontSize: 9, fontWeight: 700, background: '#ff9f0a22', color: '#ff9f0a', borderRadius: 99, padding: '1px 5px' }}>{inbox} inbox</span>}
                      </button>
                    );
                  })}
                </div>
              ) : (
                /* List view */
                <>
              {sortedFilteredCompanies.filter(c => !c.archived && !c.deletedAt).map((company, i) => {
                const active      = selectedId === company.id;
                const count       = taskCountFor(company.id);
                const isConfirm   = confirmDeleteCompanyId === company.id;
                const subsCount   = subClients.filter(s => !s.deletedAt && s.companyId === company.id).length;
                const tasksCount  = tasks.filter(t => !t.deletedAt && t.companyId === company.id).length;
                const inbox       = inboxCountFor(company.id);
                return (
                  <motion.div key={company.id} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.04 }}
                    style={{ marginBottom: isConfirm ? 6 : 2 }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center' }}>
                      <button
                        onClick={() => { setSelectedId(company.id); setConfirmDeleteCompanyId(null); if (isMobile) setSidebarOpen(false); }}
                        style={{
                          flex: 1, display: 'flex', alignItems: 'center', gap: companyCompact ? 7 : 9,
                          padding: companyCompact ? '6px 10px' : '9px 10px', borderRadius: 10,
                          background: active ? `linear-gradient(90deg, ${company.color}18, ${company.color}08)` : 'transparent',
                          border: 'none',
                          borderLeft: active ? `3px solid ${company.color}` : '3px solid transparent',
                          cursor: 'pointer', textAlign: 'left', transition: 'all .15s',
                        }}
                        onMouseEnter={e => { if (!active) (e.currentTarget as HTMLElement).style.background = 'var(--s2)'; }}
                        onMouseLeave={e => { if (!active) (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
                      >
                        {companyCompact
                          ? <div style={{ width: 6, height: 6, borderRadius: '50%', background: company.color, flexShrink: 0, boxShadow: active ? `0 0 5px ${company.color}` : 'none' }} />
                          : <CompanyAvatar name={company.name} color={company.color} size={28} />
                        }
                        <span style={{ flex: 1, fontSize: companyCompact ? 12 : 13, fontWeight: active ? 600 : 400, color: active ? 'var(--t1)' : 'var(--t2)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {company.name}
                        </span>
                        <div style={{ display: 'flex', gap: 3, alignItems: 'center', flexShrink: 0 }}>
                          {inbox > 0 && <span style={{ fontSize: 9, fontWeight: 700, background: '#ff9f0a22', color: '#ff9f0a', borderRadius: 99, padding: '1px 5px' }}>{inbox}</span>}
                          {count > 0 && <span style={{ fontSize: 10, fontWeight: 600, color: active ? company.color : 'var(--t4)', background: active ? `${company.color}18` : 'transparent', padding: '1px 6px', borderRadius: 99 }}>{count}</span>}
                        </div>
                      </button>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: 1, marginLeft: 2 }}>
                        <button onClick={() => moveCompanyUp(company.id)} disabled={i === 0}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--t4)', padding: '1px 3px', transition: 'color .15s' }}
                          onMouseEnter={e => ((e.currentTarget as HTMLElement).style.color = '#64C4FF')}
                          onMouseLeave={e => ((e.currentTarget as HTMLElement).style.color = 'var(--t4)')}
                          title="Mover para cima"
                          aria-label="Mover para cima"
                        ><FiChevronUp size={10} /></button>
                        <button onClick={() => moveCompanyDown(company.id)} disabled={i === companies.length - 1}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--t4)', padding: '1px 3px', transition: 'color .15s' }}
                          onMouseEnter={e => ((e.currentTarget as HTMLElement).style.color = '#64C4FF')}
                          onMouseLeave={e => ((e.currentTarget as HTMLElement).style.color = 'var(--t4)')}
                          title="Mover para baixo"
                          aria-label="Mover para baixo"
                        ><FiChevronDown size={10} /></button>
                      </div>

                      <button
                        onClick={e => { e.stopPropagation(); setConfirmDeleteCompanyId(isConfirm ? null : company.id); }}
                        aria-label="Excluir empresa"
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

              {/* Archived section toggle */}
              {companies.some(c => c.archived) && (
                <button onClick={() => setShowArchived(v => !v)}
                  style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 6, padding: '6px 10px', borderRadius: 8, marginTop: 4, background: 'transparent', border: 'none', color: 'var(--t4)', fontSize: 10, cursor: 'pointer', transition: 'all .15s' }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = 'var(--t3)'; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'var(--t4)'; }}
                >
                  <FiArchive size={10} /> {showArchived ? 'Ocultar arquivadas' : `Arquivadas (${companies.filter(c => c.archived).length})`}
                  {showArchived ? <FiChevronUp size={10} style={{ marginLeft: 'auto' }} /> : <FiChevronDown size={10} style={{ marginLeft: 'auto' }} />}
                </button>
              )}
              {showArchived && companies.filter(c => c.archived).map(company => (
                <div key={company.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 10px', borderRadius: 8, background: 'var(--s1)', marginBottom: 2, opacity: 0.6 }}>
                  <div style={{ width: 6, height: 6, borderRadius: '50%', background: company.color, flexShrink: 0 }} />
                  <span style={{ flex: 1, fontSize: 12, color: 'var(--t3)' }}>{company.name}</span>
                  <button onClick={() => { unarchiveCompany(company.id); showToast('Empresa restaurada'); setTimeout(hideToast, 3000); }} title="Restaurar" aria-label="Restaurar empresa"
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--t4)', padding: 3, borderRadius: 4, fontSize: 10, transition: 'color .15s' }}
                    onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = '#30d158'}
                    onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = 'var(--t4)'}
                  >↩</button>
                </div>
              ))}
              </>)}

              {/* New company */}
              {showNew ? (
                <div style={{ padding: '10px 12px', background: 'var(--s1)', borderRadius: 10, marginTop: 4 }}>
                  <input autoFocus value={newName} onChange={e => setNewName(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') handleAddCompany(); if (e.key === 'Escape') { setShowNew(false); setNewAvulso(false); } }}
                    placeholder="Nome da empresa..."
                    style={{ width: '100%', background: 'var(--ib)', border: '1px solid var(--b2)', borderRadius: 8, padding: '7px 10px', color: 'var(--t1)', fontSize: 13, outline: 'none', marginBottom: 8, boxSizing: 'border-box' }}
                  />
                  <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: 8 }}>
                    {PRESET_COLORS.map(c => <ColorDot key={c} color={c} selected={newColor === c} onClick={() => setNewColor(c)} />)}
                  </div>
                  <button
                    onClick={() => setNewAvulso(o => !o)}
                    style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '5px 8px', borderRadius: 7, marginBottom: 10, background: newAvulso ? 'rgba(53,107,255,0.12)' : 'transparent', border: `1px solid ${newAvulso ? '#356BFF' : 'var(--b2)'}`, cursor: 'pointer', color: newAvulso ? '#356BFF' : 'var(--t3)', fontSize: 11, transition: 'all .15s' }}
                  >
                    <div style={{ width: 12, height: 12, borderRadius: 3, border: `1.5px solid ${newAvulso ? '#356BFF' : 'var(--b2)'}`, background: newAvulso ? '#356BFF' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all .15s', flexShrink: 0 }}>
                      {newAvulso && <FiCheck size={8} color="#fff" strokeWidth={3} />}
                    </div>
                    Cliente avulso (sem subclientes)
                  </button>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button onClick={() => { setShowNew(false); setNewAvulso(false); }} style={{ flex: 1, padding: '7px 0', borderRadius: 8, background: 'var(--s2)', border: 'none', color: 'var(--t2)', fontSize: 12, cursor: 'pointer' }}>Cancelar</button>
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
        </div>

        {/* Right: Company detail */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px 20px', display: 'flex', flexDirection: 'column', gap: 14 }}>
          {selected ? (
            <motion.div key={selectedId} initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {/* Company hero card */}
              <div style={{
                position: 'relative', overflow: 'hidden',
                background: `linear-gradient(135deg, ${selected.color}18 0%, transparent 50%), var(--s1)`,
                borderRadius: 16, padding: '20px 22px 20px 26px',
                border: `1px solid ${selected.color}35`,
                boxShadow: `0 0 32px -10px ${selected.color}44`,
              }}>
                {/* Left accent bar */}
                <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 4, borderRadius: '16px 0 0 16px', background: selected.color, boxShadow: `2px 0 12px ${selected.color}66` }} />
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <CompanyAvatar name={selected.name} color={selected.color} size={44} />
                  <div style={{ flex: 1 }}>
                    {editingCompanyName ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <input autoFocus value={newCompanyNameVal} onChange={e => setNewCompanyNameVal(e.target.value)}
                          onKeyDown={e => { if (e.key === 'Enter') handleSaveCompanyName(); if (e.key === 'Escape') setEditingCompanyName(false); }}
                          style={{ fontSize: 16, fontWeight: 700, background: 'var(--ib)', border: `1px solid ${selected.color}55`, borderRadius: 8, padding: '4px 10px', color: 'var(--t1)', outline: 'none', width: 160 }}
                        />
                        <button onClick={handleSaveCompanyName} style={{ background: selected.color, border: 'none', borderRadius: 6, padding: '5px 10px', color: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>OK</button>
                        <button onClick={() => setEditingCompanyName(false)} aria-label="Cancelar" style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--t3)', padding: 4 }}><FiX size={13} /></button>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                        <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--t1)' }}>{selected.name}</div>
                        <button onClick={() => { setNewCompanyNameVal(selected.name); setEditingCompanyName(true); }} aria-label="Editar nome"
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
                        {/* #27 Inactivity alert */}
                        {companyInactivityDays !== null && companyInactivityDays >= 30 && (
                          <span title={`Última tarefa há ${companyInactivityDays} dias`} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '2px 8px', borderRadius: 99, background: 'rgba(255,159,10,0.13)', border: '1px solid rgba(255,159,10,0.3)', fontSize: 10, fontWeight: 700, color: '#ff9f0a' }}>
                            <FiAlertTriangle size={9} />
                            Sem atividade há {companyInactivityDays}d
                          </span>
                        )}
                        {/* #28 Site link */}
                        {selected.siteUrl ? (
                          <button
                            onClick={() => window.open(selected.siteUrl, '_blank')}
                            title={`Abrir site: ${selected.siteUrl}`}
                            style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '2px 8px', borderRadius: 99, background: 'rgba(100,196,255,0.1)', border: '1px solid rgba(100,196,255,0.25)', fontSize: 10, fontWeight: 600, color: '#64C4FF', cursor: 'pointer', transition: 'opacity .15s' }}
                            onMouseEnter={e => (e.currentTarget as HTMLElement).style.opacity = '0.75'}
                            onMouseLeave={e => (e.currentTarget as HTMLElement).style.opacity = '1'}
                          >
                            <FiExternalLink size={9} /> Site
                          </button>
                        ) : (
                          <button
                            onClick={() => { setCompanySiteUrlVal(''); setEditingCompanySiteUrl(true); }}
                            title="Adicionar URL do site"
                            style={{ display: 'inline-flex', alignItems: 'center', gap: 3, padding: '2px 7px', borderRadius: 99, background: 'transparent', border: '1px dashed var(--b2)', fontSize: 10, fontWeight: 500, color: 'var(--t4)', cursor: 'pointer', transition: 'all .15s' }}
                            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = '#64C4FF'; (e.currentTarget as HTMLElement).style.color = '#64C4FF'; }}
                            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--b2)'; (e.currentTarget as HTMLElement).style.color = 'var(--t4)'; }}
                          >
                            <FiLink size={9} /> + site
                          </button>
                        )}
                      </div>
                    )}
                    {/* #28 Site URL inline editor */}
                    {editingCompanySiteUrl && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 6 }}>
                        <FiLink size={11} style={{ color: 'var(--t4)', flexShrink: 0 }} />
                        <input
                          autoFocus
                          value={companySiteUrlVal}
                          onChange={e => setCompanySiteUrlVal(e.target.value)}
                          onKeyDown={e => { if (e.key === 'Enter') handleSaveCompanySiteUrl(); if (e.key === 'Escape') setEditingCompanySiteUrl(false); }}
                          placeholder="https://exemplo.com.br"
                          style={{ flex: 1, background: 'var(--ib)', border: `1px solid ${selected.color}55`, borderRadius: 7, padding: '4px 8px', color: 'var(--t1)', fontSize: 12, outline: 'none' }}
                        />
                        <button onClick={handleSaveCompanySiteUrl} style={{ background: selected.color, border: 'none', borderRadius: 6, padding: '4px 10px', color: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>OK</button>
                        <button onClick={() => setEditingCompanySiteUrl(false)} aria-label="Cancelar" style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--t3)', padding: 4 }}><FiX size={12} /></button>
                      </div>
                    )}
                    {selected.siteUrl && !editingCompanySiteUrl && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 3 }}>
                        <FiLink size={10} style={{ color: 'var(--t4)' }} />
                        <span style={{ fontSize: 11, color: 'var(--t3)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 200 }}>{selected.siteUrl}</span>
                        <button onClick={() => { setCompanySiteUrlVal(selected.siteUrl ?? ''); setEditingCompanySiteUrl(true); }} aria-label="Editar site"
                          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--t4)', padding: 2, borderRadius: 4, transition: 'color .15s' }}
                          onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = '#64C4FF'}
                          onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = 'var(--t4)'}
                        ><FiEdit2 size={9} /></button>
                        <button onClick={() => updateCompany(selected.id, { siteUrl: undefined })} aria-label="Remover site"
                          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--t4)', padding: 2, borderRadius: 4, transition: 'color .15s' }}
                          onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = '#ff453a'}
                          onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = 'var(--t4)'}
                        ><FiX size={9} /></button>
                      </div>
                    )}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4, flexWrap: 'wrap' }}>
                      <span style={{ fontSize: 12, color: 'var(--t3)' }}>
                        {selected.avulso ? 'cliente avulso' : `${companySubs.length} subclient${companySubs.length !== 1 ? 's' : ''}`} · {totalTasks} tarefas
                      </span>
                      <button
                        onClick={() => updateCompany(selected.id, { avulso: selected.avulso ? undefined : true })}
                        title={selected.avulso ? 'Converter para empresa com subclientes' : 'Marcar como cliente avulso'}
                        style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.5px', textTransform: 'uppercase', padding: '1px 6px', borderRadius: 4, border: `1px solid ${selected.avulso ? '#356BFF' : 'var(--b2)'}`, background: selected.avulso ? 'rgba(53,107,255,0.12)' : 'transparent', color: selected.avulso ? '#356BFF' : 'var(--t4)', cursor: 'pointer', transition: 'all .15s' }}
                        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = '#356BFF'; (e.currentTarget as HTMLElement).style.color = '#356BFF'; }}
                        onMouseLeave={e => { if (!selected.avulso) { (e.currentTarget as HTMLElement).style.borderColor = 'var(--b2)'; (e.currentTarget as HTMLElement).style.color = 'var(--t4)'; } }}
                      >
                        {selected.avulso ? 'Avulso' : '+ Avulso'}
                      </button>
                      {/* #25 Contract value — company level */}
                      {editingContractValue ? (
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                          <FiDollarSign size={10} style={{ color: 'var(--t4)' }} />
                          <input
                            autoFocus
                            type="text"
                            inputMode="decimal"
                            value={contractValueVal}
                            onChange={e => setContractValueVal(e.target.value)}
                            onKeyDown={e => { if (e.key === 'Enter') handleSaveContractValue(); if (e.key === 'Escape') setEditingContractValue(false); }}
                            placeholder="0,00"
                            style={{ width: 80, background: 'var(--ib)', border: `1px solid ${selected.color}55`, borderRadius: 6, padding: '3px 7px', color: 'var(--t1)', fontSize: 12, outline: 'none', textAlign: 'right' }}
                          />
                          <button onClick={handleSaveContractValue} style={{ background: selected.color, border: 'none', borderRadius: 5, padding: '3px 8px', color: '#fff', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>OK</button>
                          <button onClick={() => setEditingContractValue(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--t3)', padding: 2 }}><FiX size={11} /></button>
                        </div>
                      ) : (
                        <button
                          onClick={() => { setContractValueVal(selected.contractValue ? String(selected.contractValue) : ''); setEditingContractValue(true); }}
                          title={selected.contractValue ? 'Editar valor do contrato' : 'Definir valor do contrato'}
                          style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '1px 7px', borderRadius: 99, fontSize: 10, fontWeight: 700, cursor: 'pointer', transition: 'all .15s', border: selected.contractValue ? `1px solid ${selected.color}35` : '1px dashed var(--b2)', background: selected.contractValue ? `${selected.color}12` : 'transparent', color: selected.contractValue ? selected.color : 'var(--t4)' }}
                          onMouseEnter={e => { if (!selected.contractValue) { (e.currentTarget as HTMLElement).style.borderColor = selected.color; (e.currentTarget as HTMLElement).style.color = selected.color; } }}
                          onMouseLeave={e => { if (!selected.contractValue) { (e.currentTarget as HTMLElement).style.borderColor = 'var(--b2)'; (e.currentTarget as HTMLElement).style.color = 'var(--t4)'; } }}
                        >
                          <FiDollarSign size={9} />
                          {selected.contractValue ? `R$ ${formatCurrency(selected.contractValue)}` : '+ contrato'}
                        </button>
                      )}
                    </div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8, flexShrink: 0 }}>
                    {/* Color picker */}
                    <div style={{ display: 'flex', gap: 4, alignItems: 'center', flexWrap: 'nowrap' }}>
                      <span style={{ fontSize: 9, color: 'var(--t4)', marginRight: 2, letterSpacing: '1px', flexShrink: 0 }}>COR</span>
                      {PRESET_COLORS.map(c => <ColorDot key={c} color={c} selected={selected.color === c} onClick={() => updateCompany(selected.id, { color: c })} />)}
                    </div>
                    {/* Contact shortcuts + edit btn + archive */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <ContactShortcuts
                        whatsapp={selected.platforms?.whatsapp}
                        instagram={selected.platforms?.instagram}
                        email={selected.platforms?.email}
                        siteUrl={selected.siteUrl}
                        accentColor={selected.color}
                        size={12}
                      />
                      <button
                        onClick={() => { setCpWhatsapp(selected.platforms?.whatsapp ?? ''); setCpInstagram(selected.platforms?.instagram ?? ''); setCpEmail(selected.platforms?.email ?? ''); setEditingCompanyPlatforms(true); }}
                        title="Editar contatos da empresa"
                        style={{ width: 24, height: 24, borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--s1)', border: '1px solid var(--b2)', cursor: 'pointer', color: 'var(--t4)', transition: 'all .15s' }}
                        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = selected.color; (e.currentTarget as HTMLElement).style.color = selected.color; }}
                        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--b2)'; (e.currentTarget as HTMLElement).style.color = 'var(--t4)'; }}
                      ><FiEdit2 size={10} /></button>
                      <button
                        onClick={() => handleArchiveCompany(selected.id)}
                        title="Arquivar empresa"
                        style={{ width: 24, height: 24, borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--s1)', border: '1px solid var(--b2)', cursor: 'pointer', color: 'var(--t4)', transition: 'all .15s' }}
                        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = '#ff9f0a'; (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,159,10,0.4)'; }}
                        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'var(--t4)'; (e.currentTarget as HTMLElement).style.borderColor = 'var(--b2)'; }}
                      ><FiArchive size={10} /></button>
                    </div>
                  </div>
                </div>

                {/* CNPJ / Segment / Followers row */}
                <div style={{ display: 'flex', gap: 12, marginTop: 10, flexWrap: 'wrap', alignItems: 'center' }}>
                  {/* CNPJ */}
                  {editingCnpj ? (
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                      <input autoFocus value={cnpjVal} onChange={e => setCnpjVal(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') handleSaveCnpj(); if (e.key === 'Escape') setEditingCnpj(false); }}
                        placeholder="00.000.000/0001-00"
                        style={{ width: 140, background: 'var(--ib)', border: `1px solid ${selected.color}55`, borderRadius: 6, padding: '3px 7px', color: 'var(--t1)', fontSize: 11, outline: 'none' }}
                      />
                      <button onClick={handleSaveCnpj} style={{ background: selected.color, border: 'none', borderRadius: 5, padding: '3px 8px', color: '#fff', fontSize: 11, cursor: 'pointer' }}>OK</button>
                      <button onClick={() => setEditingCnpj(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--t4)', padding: 2 }}><FiX size={11} /></button>
                    </div>
                  ) : (
                    <button onClick={() => { setCnpjVal(selected.cnpj ?? ''); setEditingCnpj(true); }}
                      style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '2px 7px', borderRadius: 6, fontSize: 10, cursor: 'pointer', background: 'transparent', border: selected.cnpj ? '1px solid var(--b2)' : '1px dashed var(--b1)', color: selected.cnpj ? 'var(--t3)' : 'var(--t4)', transition: 'all .15s' }}
                      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = selected.color; (e.currentTarget as HTMLElement).style.color = selected.color; }}
                      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = selected.cnpj ? 'var(--b2)' : 'var(--b1)'; (e.currentTarget as HTMLElement).style.color = selected.cnpj ? 'var(--t3)' : 'var(--t4)'; }}
                    >{selected.cnpj ?? '+ CNPJ'}</button>
                  )}
                  {/* Segment */}
                  {editingSegment ? (
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                      <select value={segmentVal} onChange={e => setSegmentVal(e.target.value)}
                        style={{ background: 'var(--ib)', border: `1px solid ${selected.color}55`, borderRadius: 6, padding: '3px 7px', color: 'var(--t1)', fontSize: 11, outline: 'none' }}
                      >
                        <option value="">Segmento...</option>
                        {SEGMENTS.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                      <button onClick={handleSaveSegment} style={{ background: selected.color, border: 'none', borderRadius: 5, padding: '3px 8px', color: '#fff', fontSize: 11, cursor: 'pointer' }}>OK</button>
                      <button onClick={() => setEditingSegment(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--t4)', padding: 2 }}><FiX size={11} /></button>
                    </div>
                  ) : (
                    <button onClick={() => { setSegmentVal(selected.segment ?? ''); setEditingSegment(true); }}
                      style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '2px 7px', borderRadius: 6, fontSize: 10, cursor: 'pointer', background: selected.segment ? `${selected.color}15` : 'transparent', border: selected.segment ? `1px solid ${selected.color}40` : '1px dashed var(--b1)', color: selected.segment ? selected.color : 'var(--t4)', transition: 'all .15s' }}
                      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = selected.color; (e.currentTarget as HTMLElement).style.color = selected.color; }}
                      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = selected.segment ? selected.color : 'var(--t4)'; }}
                    >{selected.segment ?? '+ Segmento'}</button>
                  )}
                  {/* Followers */}
                  {editingFollowers ? (
                    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                      <FiInstagram size={10} style={{ color: 'var(--t4)' }} />
                      <input autoFocus value={followersVal} onChange={e => setFollowersVal(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') handleSaveFollowers(); if (e.key === 'Escape') setEditingFollowers(false); }}
                        placeholder="5000"
                        style={{ width: 70, background: 'var(--ib)', border: `1px solid ${selected.color}55`, borderRadius: 6, padding: '3px 7px', color: 'var(--t1)', fontSize: 11, outline: 'none' }}
                      />
                      <button onClick={handleSaveFollowers} style={{ background: selected.color, border: 'none', borderRadius: 5, padding: '3px 8px', color: '#fff', fontSize: 11, cursor: 'pointer' }}>OK</button>
                      <button onClick={() => setEditingFollowers(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--t4)', padding: 2 }}><FiX size={11} /></button>
                    </div>
                  ) : (
                    <button onClick={() => { setFollowersVal(String(selected.followers?.instagram ?? '')); setEditingFollowers(true); }}
                      style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '2px 7px', borderRadius: 6, fontSize: 10, cursor: 'pointer', background: 'transparent', border: selected.followers?.instagram ? '1px solid rgba(225,48,108,0.3)' : '1px dashed var(--b1)', color: selected.followers?.instagram ? '#E1306C' : 'var(--t4)', transition: 'all .15s' }}
                      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = '#E1306C'; (e.currentTarget as HTMLElement).style.color = '#E1306C'; }}
                      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = selected.followers?.instagram ? 'rgba(225,48,108,0.3)' : 'var(--b1)'; (e.currentTarget as HTMLElement).style.color = selected.followers?.instagram ? '#E1306C' : 'var(--t4)'; }}
                    >
                      <FiInstagram size={9} />
                      {selected.followers?.instagram ? selected.followers.instagram.toLocaleString('pt-BR') + ' seg.' : '+ Seguidores'}
                    </button>
                  )}
                  {/* Feedback score */}
                  {selected.feedbackRatings && selected.feedbackRatings.length > 0 && (
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '2px 7px', borderRadius: 6, fontSize: 10, background: 'rgba(255,215,10,0.1)', border: '1px solid rgba(255,215,10,0.25)', color: '#ffd60a' }}>
                      <FiStar size={9} />
                      {(selected.feedbackRatings.reduce((a, b) => a + b, 0) / selected.feedbackRatings.length).toFixed(1)}
                    </span>
                  )}
                </div>

                {/* Company platforms inline edit */}
                <AnimatePresence>
                  {editingCompanyPlatforms && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} style={{ overflow: 'hidden' }}>
                      <div style={{ marginTop: 14, padding: '14px 16px', background: 'var(--s1)', borderRadius: 12, border: `1px solid ${selected.color}30` }}>
                        <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '1.5px', textTransform: 'uppercase', color: 'var(--t4)', marginBottom: 10 }}>Contatos da empresa</div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
                          {[
                            { icon: FiPhone, label: 'WhatsApp', value: cpWhatsapp, setter: setCpWhatsapp, placeholder: '(00) 00000-0000' },
                            { icon: FiInstagram, label: 'Instagram', value: cpInstagram, setter: setCpInstagram, placeholder: '@perfil' },
                            { icon: FiMail, label: 'E-mail', value: cpEmail, setter: setCpEmail, placeholder: 'email@exemplo.com' },
                          ].map(({ icon: Icon, label, value, setter, placeholder }) => (
                            <div key={label}>
                              <label style={{ fontSize: 9, fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase', color: 'var(--t4)', display: 'flex', alignItems: 'center', gap: 4, marginBottom: 4 }}>
                                <Icon size={9} /> {label}
                              </label>
                              <input value={value} onChange={e => setter(e.target.value)}
                                onKeyDown={e => { if (e.key === 'Enter') handleSaveCompanyPlatforms(); if (e.key === 'Escape') setEditingCompanyPlatforms(false); }}
                                placeholder={placeholder}
                                style={{ width: '100%', boxSizing: 'border-box', background: 'var(--ib)', border: '1px solid var(--b2)', borderRadius: 7, padding: '6px 8px', color: 'var(--t1)', fontSize: 12, outline: 'none' }}
                                onFocus={e => { e.currentTarget.style.borderColor = `${selected.color}60`; }}
                                onBlur={e => { e.currentTarget.style.borderColor = 'var(--b2)'; }}
                              />
                            </div>
                          ))}
                        </div>
                        <div style={{ display: 'flex', gap: 6, marginTop: 10, justifyContent: 'flex-end' }}>
                          <button onClick={() => setEditingCompanyPlatforms(false)} style={{ padding: '5px 14px', borderRadius: 7, background: 'var(--s2)', border: '1px solid var(--b2)', color: 'var(--t3)', fontSize: 11, cursor: 'pointer' }}>Cancelar</button>
                          <button onClick={handleSaveCompanyPlatforms} style={{ padding: '5px 14px', borderRadius: 7, background: selected.color, border: 'none', color: '#fff', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>Salvar</button>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

              </div>

              {/* ── Backlinks panel — leads / propostas / ideias / tarefas ──── */}
              {selected && (() => {
                const bentos: { label: string; count: number; color: string; Icon: React.ComponentType<{ size?: number; style?: React.CSSProperties }>; page: 'crm' | 'propostas' | 'ideias' | 'tarefas' }[] = [
                  { label: 'Leads',     count: leadsCount,             color: '#bf5af2',      Icon: FiTarget,      page: 'crm' },
                  { label: 'Propostas', count: proposalsCount,         color: '#356BFF',      Icon: FiFileText,    page: 'propostas' },
                  { label: 'Ideias',    count: ideasCount,             color: '#ffd60a',      Icon: FiZap,         page: 'ideias' },
                  { label: 'Tarefas',   count: companyTasks.length,    color: selected.color, Icon: FiCheckSquare, page: 'tarefas' },
                ];
                return (
                  <div style={{ display: 'flex', gap: 10, marginTop: 12 }}>
                    {bentos.map(({ label, count, color, Icon, page }) => (
                      <button
                        key={label}
                        onClick={() => onNavigate?.(page)}
                        style={{
                          flex: 1, background: 'var(--s1)', border: '1px solid var(--b2)',
                          borderRadius: 12, padding: '12px 14px',
                          display: 'flex', flexDirection: 'column', gap: 6,
                          cursor: onNavigate ? 'pointer' : 'default',
                          textAlign: 'left', transition: 'all .15s',
                        }}
                        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = `${color}55`; (e.currentTarget as HTMLElement).style.background = `${color}0c`; }}
                        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--b2)'; (e.currentTarget as HTMLElement).style.background = 'var(--s1)'; }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                          <Icon size={13} style={{ color }} />
                          <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '1.5px', textTransform: 'uppercase', color: 'var(--t4)' }}>{label}</span>
                        </div>
                        <div style={{ fontSize: 22, fontWeight: 700, color: count > 0 ? color : 'var(--t4)', lineHeight: 1 }}>{count}</div>
                      </button>
                    ))}
                  </div>
                );
              })()}

              {/* Bento 2-col layout: main col + right col */}
              <div className="bento-grid bento-sidebar" style={{ gap: 14, alignItems: 'start' }}>
                {/* MAIN COLUMN */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

                {/* Status breakdown card */}
                {totalTasks > 0 && (
                  <div style={{ ...CARD, padding: '14px 18px' }}>
                    <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '1.5px', textTransform: 'uppercase', color: 'var(--t3)', paddingBottom: 10, marginBottom: 12, borderBottom: '1px solid var(--b1)' }}>Status das tarefas</div>
                    <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                      {(['todo', 'doing', 'done'] as const).map(s => {
                        const rgb = STATUS_RGB[s];
                        const count = statusBreakdown[s];
                        return (
                          <div key={s} style={{
                            flex: 1, padding: '10px 12px', borderRadius: 10,
                            background: 'var(--s2)', border: `1px solid rgba(${rgb}, 0.2)`,
                            backgroundImage: `radial-gradient(circle at 110% 100%, rgba(${rgb}, 0.1), transparent 65%)`,
                            boxShadow: count > 0 ? `0 0 14px -6px rgba(${rgb}, 0.3)` : 'none',
                            textAlign: 'center',
                          }}>
                            <div style={{ fontSize: 22, fontWeight: 700, color: STATUS_COLOR[s], lineHeight: 1, textShadow: count > 0 ? `0 0 8px rgba(${rgb}, 0.4)` : 'none' }}>{count}</div>
                            <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase', color: 'var(--t4)', marginTop: 4 }}>{STATUS_LABEL[s]}</div>
                          </div>
                        );
                      })}
                    </div>
                    <div style={{ height: 3, background: 'var(--b1)', borderRadius: 2, overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${(statusBreakdown.done / totalTasks) * 100}%`, background: 'linear-gradient(90deg, #30d158, #30d15866)', borderRadius: 2, transition: 'width .3s', boxShadow: '0 0 8px rgba(48,209,88,0.5)' }} />
                    </div>
                  </div>
                )}

              {/* Monthly quota + history */}
              <div style={{ ...CARD, padding: '18px 20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: selected.useQuota ? 14 : 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <FiTarget size={13} style={{ color: selected.useQuota ? selected.color : 'var(--t4)' }} />
                    <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '1.5px', textTransform: 'uppercase', color: selected.useQuota ? 'var(--t3)' : 'var(--t4)' }}>Cota Mensal</span>
                  </div>
                  {!selected.useQuota && (
                    <button
                      onClick={() => updateCompany(selected.id, { useQuota: true })}
                      style={{ fontSize: 11, padding: '4px 10px', borderRadius: 7, border: '1px dashed var(--b2)', background: 'transparent', color: 'var(--t4)', cursor: 'pointer', transition: 'all .15s' }}
                      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = selected.color; (e.currentTarget as HTMLElement).style.color = selected.color; }}
                      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--b2)'; (e.currentTarget as HTMLElement).style.color = 'var(--t4)'; }}
                    >
                      + Ativar cotas
                    </button>
                  )}
                  {selected.useQuota && (
                    <button
                      onClick={() => updateCompany(selected.id, { useQuota: false, monthlyQuota: undefined })}
                      title="Desativar cotas"
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--t4)', padding: 4, borderRadius: 6, transition: 'color .15s' }}
                      onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = '#ff453a'}
                      onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = 'var(--t4)'}
                    ><FiX size={13} /></button>
                  )}
                </div>
                {selected.useQuota && (<>
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
                    <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '1.5px', textTransform: 'uppercase', color: 'var(--t4)', marginBottom: 10 }}>Histórico</div>
                    {(() => {
                      const chartData = [...monthlyHistory].reverse().slice(-8);
                      const quota = selected.monthlyQuota;
                      const maxVal = Math.max(...chartData.map(h => h.done), quota ?? 1, 1);
                      const BAR_H = 64;
                      return (
                        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6 }}>
                          {chartData.map(({ month, done }) => {
                            const isCurrent = month === currentMonthStr;
                            const pct = done / maxVal;
                            const barColor = quota
                              ? done >= quota ? '#30d158'
                                : done >= quota * 0.8 ? '#ff9f0a'
                                : selected.color
                              : selected.color;
                            const monthLabel = format(parseISO(`${month}-01`), "MMM", { locale: ptBR });
                            return (
                              <div key={month} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                                <span style={{ fontSize: 9, fontWeight: 600, color: barColor, opacity: done === 0 ? 0 : 1 }}>{done}{quota ? `/${quota}` : ''}</span>
                                <div style={{ width: '100%', height: BAR_H, display: 'flex', alignItems: 'flex-end', background: 'var(--b1)', borderRadius: 5, overflow: 'hidden', position: 'relative' }}>
                                  {quota && (
                                    <div style={{ position: 'absolute', bottom: `${(quota / maxVal) * 100}%`, left: 0, right: 0, height: 1, background: 'rgba(255,255,255,0.12)', borderStyle: 'dashed', zIndex: 1 }} />
                                  )}
                                  <motion.div
                                    initial={{ height: 0 }}
                                    animate={{ height: `${Math.max(pct * 100, done > 0 ? 4 : 0)}%` }}
                                    transition={{ duration: 0.4, ease: 'easeOut', delay: 0.05 }}
                                    style={{ width: '100%', background: `linear-gradient(180deg, ${barColor}, ${barColor}99)`, boxShadow: isCurrent ? `0 0 12px ${barColor}66` : 'none', borderRadius: '3px 3px 0 0' }}
                                  />
                                </div>
                                <span style={{ fontSize: 9, color: isCurrent ? 'var(--t2)' : 'var(--t4)', fontWeight: isCurrent ? 700 : 400, textTransform: 'capitalize' }}>{monthLabel}</span>
                              </div>
                            );
                          })}
                        </div>
                      );
                    })()}
                  </div>
                )}
                </>)}
              </div>

              {/* Task list per company — in main column */}
              <div style={CARD}>
                <button
                  onClick={() => setShowTaskList(s => !s)}
                  style={{ width: '100%', padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 8, background: 'transparent', border: 'none', cursor: 'pointer', borderBottom: showTaskList ? '1px solid var(--b1)' : 'none' }}
                >
                  <FiFileText size={13} style={{ color: selected.color }} />
                  <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '1.5px', textTransform: 'uppercase', color: 'var(--t3)', flex: 1, textAlign: 'left' }}>
                    Tarefas ({filteredCompanyTasks.length}{filteredCompanyTasks.length !== totalTasks ? `/${totalTasks}` : ''})
                  </span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    {overdueCount > 0 && <span style={{ fontSize: 9, fontWeight: 700, background: 'rgba(255,69,58,0.15)', color: '#ff453a', borderRadius: 99, padding: '1px 6px' }}>{overdueCount} atrasadas</span>}
                    {showTaskList ? <FiChevronUp size={12} style={{ color: 'var(--t4)' }} /> : <FiChevronDown size={12} style={{ color: 'var(--t4)' }} />}
                  </div>
                </button>

                {showTaskList && (
                  <div style={{ padding: '0 12px 12px' }}>
                    {/* Filters */}
                    <div style={{ display: 'flex', gap: 6, marginBottom: 10, flexWrap: 'wrap', paddingTop: 10 }}>
                      {/* Subclient filter */}
                      <select value={taskFilterSub ?? ''} onChange={e => setTaskFilterSub(e.target.value || null)}
                        style={{ fontSize: 10, background: taskFilterSub ? `${selected.color}18` : 'var(--s1)', border: taskFilterSub ? `1px solid ${selected.color}40` : '1px solid var(--b1)', borderRadius: 6, padding: '3px 6px', color: taskFilterSub ? selected.color : 'var(--t3)', cursor: 'pointer', outline: 'none' }}
                      >
                        <option value="">Todos subclients</option>
                        {companySubs.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                      </select>
                      {/* Category filter */}
                      {(['criacao', 'reuniao', 'pessoal', 'eventos'] as const).map(cat => {
                        const catColors = { criacao: '#356BFF', reuniao: '#ff9f0a', pessoal: '#30d158', eventos: '#bf5af2' };
                        const catLabels = { criacao: 'Criação', reuniao: 'Reunião', pessoal: 'Pessoal', eventos: 'Eventos' };
                        const active = taskFilterCat === cat;
                        return (
                          <button key={cat} onClick={() => setTaskFilterCat(active ? null : cat)}
                            style={{ padding: '2px 8px', borderRadius: 99, fontSize: 10, fontWeight: active ? 700 : 400, border: 'none', cursor: 'pointer', transition: 'all .15s', background: active ? `${catColors[cat]}22` : 'transparent', color: active ? catColors[cat] : 'var(--t4)' }}
                          >{catLabels[cat]}</button>
                        );
                      })}
                    </div>
                    <div style={{ maxHeight: 320, overflowY: 'auto' }}>
                    {filteredCompanyTasks.length === 0 ? (
                      <div style={{ textAlign: 'center', padding: '20px 0', color: 'var(--t4)', fontSize: 13 }}>Nenhuma tarefa</div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                        {filteredCompanyTasks.sort((a, b) => a.date.localeCompare(b.date)).map(task => {
                          const title   = getTaskTitle(task, companies, subClients);
                          const sub     = subClients.find(s => s.id === task.subClientId);
                          const hovered = hoveredTaskId === task.id;
                          const isOverdue = task.status !== 'done' && task.date < today;
                          return (
                            <div
                              key={task.id}
                              style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 8px', borderRadius: 8, background: hovered ? 'var(--s2)' : isOverdue ? 'rgba(255,69,58,0.05)' : 'var(--s1)', border: isOverdue ? '1px solid rgba(255,69,58,0.2)' : '1px solid var(--b1)', transition: 'background .12s' }}
                              onMouseEnter={() => setHoveredTaskId(task.id)}
                              onMouseLeave={() => setHoveredTaskId(null)}
                            >
                              {/* Status cycle button */}
                              <button
                                onClick={() => updateTask(task.id, { status: NEXT_STATUS[task.status] })}
                                title={`Status: ${STATUS_LABEL[task.status]} — clique para avançar`}
                                style={{ width: 18, height: 18, borderRadius: '50%', border: `1.5px solid ${STATUS_COLOR[task.status]}`, background: task.status === 'done' ? STATUS_COLOR[task.status] : 'transparent', flexShrink: 0, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all .15s', padding: 0 }}
                                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.opacity = '0.7'; }}
                                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.opacity = '1'; }}
                              >
                                {task.status === 'done' && <FiCheck size={9} color="#fff" strokeWidth={3} />}
                              </button>

                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ fontSize: 12, color: isOverdue ? '#ff453a' : 'var(--t2)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', textDecoration: task.status === 'done' ? 'line-through' : 'none', opacity: task.status === 'done' ? 0.5 : 1 }}>
                                  {title}
                                </div>
                                {sub && <div style={{ fontSize: 10, color: 'var(--t4)', marginTop: 1 }}>{sub.name}</div>}
                              </div>

                              {task.linkedProposalId && (
                                <span title="Vinculada a uma proposta" style={{ fontSize: 10, color: '#356BFF', background: 'rgba(53,107,255,0.12)', border: '1px solid rgba(53,107,255,0.30)', borderRadius: 5, padding: '1px 5px', flexShrink: 0 }}>📄</span>
                              )}

                              <span style={{ fontSize: 10, color: isOverdue ? '#ff453a' : 'var(--t4)', flexShrink: 0, fontWeight: isOverdue ? 700 : 400 }}>
                                {format(parseISO(task.date), "d MMM", { locale: ptBR })}
                              </span>

                              {/* Delete button — visible on hover */}
                              <button
                                onClick={() => { deleteTask(task.id); }}
                                title="Deletar tarefa"
                                style={{ opacity: hovered ? 1 : 0, background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--t4)', padding: 3, borderRadius: 5, display: 'flex', alignItems: 'center', transition: 'opacity .12s, color .12s', flexShrink: 0 }}
                                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = '#ff453a'; }}
                                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'var(--t4)'; }}
                              >
                                <FiTrash2 size={11} />
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    )}
                    </div>
                  </div>
                )}
              </div>

                </div>{/* END MAIN COLUMN */}

                {/* RIGHT COLUMN */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

              {/* SubClients — hidden for avulso companies */}
              {!selected.avulso && <div style={{ ...CARD }}>
                <div style={{ padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 8, borderBottom: '1px solid var(--b1)' }}>
                  <FiUsers size={13} style={{ color: selected.color, flexShrink: 0 }} />
                  <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '1.5px', textTransform: 'uppercase', color: 'var(--t3)', flex: 1 }}>Subclients</span>
                  <div style={{ position: 'relative', flexShrink: 0 }}>
                    <FiSearch size={11} style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)', color: 'var(--t4)', pointerEvents: 'none' }} />
                    <input
                      value={subSearch}
                      onChange={e => setSubSearch(e.target.value)}
                      placeholder="Buscar..."
                      style={{ paddingLeft: 24, paddingRight: 8, paddingTop: 5, paddingBottom: 5, borderRadius: 7, background: 'var(--ib)', border: '1px solid var(--b2)', color: 'var(--t1)', fontSize: 11, outline: 'none', width: 90 }}
                    />
                  </div>
                </div>
                <div style={{ padding: '4px 8px 8px' }}>
                  {companySubs.length === 0 && !showNewSub && (
                    <div style={{ textAlign: 'center', padding: '28px 0', color: 'var(--t4)', fontSize: 13 }}>Nenhum subclient ainda</div>
                  )}
                  <DndContext sensors={dndSensors} collisionDetection={closestCenter} onDragEnd={handleSubDragEnd}>
                    <SortableContext items={filteredCompanySubs.map(s => s.id)} strategy={verticalListSortingStrategy}>
                  {filteredCompanySubs.map((sub, i) => {
                    const weekCount = weekTasksFor(sub.id);
                    const hasTips   = (sub.tips?.length ?? 0) > 0;
                    const sDone  = subMonthDone(sub.id);
                    const sQuota = sub.monthlyQuota;
                    const sPct   = sQuota ? Math.min((sDone / sQuota) * 100, 100) : null;
                    const sColor = sQuota
                      ? sDone >= sQuota ? '#30d158' : sDone >= sQuota * 0.8 ? '#ff9f0a' : selected.color
                      : selected.color;
                    const inactDays = subInactivityDays(sub.id);
                    return (
                      <SortableSubClientItem key={sub.id} id={sub.id}>
                        {(dragHandleProps) => (
                          <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
                            style={{ borderRadius: 10, marginBottom: 6, overflow: 'hidden', background: 'var(--s1)', border: '1px solid var(--b1)', borderLeft: `3px solid ${selected.color}` }}
                          >
                            {/* Line 1: grip + name + quick-add button */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 10px 5px' }}>
                              <button {...dragHandleProps} onClick={e => e.stopPropagation()}
                                style={{ cursor: 'grab', background: 'none', border: 'none', color: 'var(--t4)', padding: '2px 1px', display: 'flex', alignItems: 'center', flexShrink: 0, touchAction: 'none' }}
                              ><FiMove size={11} /></button>

                              {editingSubId === sub.id ? (
                                <input autoFocus value={editingSubName} onChange={e => setEditingSubName(e.target.value)}
                                  onKeyDown={e => { if (e.key === 'Enter') saveEditSub(); if (e.key === 'Escape') setEditingSubId(null); }}
                                  onBlur={saveEditSub}
                                  style={{ flex: 1, background: 'var(--ib)', border: '1px solid var(--b3)', borderRadius: 6, padding: '3px 8px', color: 'var(--t1)', fontSize: 13, outline: 'none' }}
                                />
                              ) : (
                                <button
                                  onClick={() => openClientModal(sub.id, 'notas')}
                                  style={{ flex: 1, textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 500, color: 'var(--t1)', padding: 0 }}
                                >{sub.name}</button>
                              )}

                              {/* Quick add task button */}
                              <button
                                onClick={e => { e.stopPropagation(); setAddingTaskForSub(sub.id); setQuickTaskInput(''); }}
                                title="Adicionar tarefa rápida"
                                style={{ width: 22, height: 22, borderRadius: 6, background: `${selected.color}18`, border: `1px solid ${selected.color}40`, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: selected.color, flexShrink: 0, transition: 'all .15s' }}
                                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = `${selected.color}30`; }}
                                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = `${selected.color}18`; }}
                              ><FiZap size={10} /></button>
                            </div>

                            {/* Line 2: badges + actions */}
                            <div style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '2px 10px 8px 32px', flexWrap: 'wrap' }}>
                              {/* Cota badge */}
                              {editingSubQuotaId === sub.id ? (
                                <input autoFocus type="number" min="1" value={editingSubQuotaVal}
                                  onChange={e => setEditingSubQuotaVal(e.target.value)}
                                  onKeyDown={e => { if (e.key === 'Enter') handleSaveSubQuota(sub.id); if (e.key === 'Escape') setEditingSubQuotaId(null); }}
                                  onBlur={() => handleSaveSubQuota(sub.id)}
                                  placeholder="cota"
                                  style={{ width: 50, background: 'var(--ib)', border: `1px solid ${selected.color}`, borderRadius: 6, padding: '2px 6px', color: 'var(--t1)', fontSize: 10, outline: 'none', textAlign: 'center' }}
                                />
                              ) : (
                                <button title={sQuota ? `Cota: ${sDone}/${sQuota}` : 'Definir cota'}
                                  onClick={e => { e.stopPropagation(); setEditingSubQuotaVal(String(sQuota ?? '')); setEditingSubQuotaId(sub.id); }}
                                  style={{ display: 'flex', alignItems: 'center', gap: 3, background: sQuota ? `${sColor}18` : 'var(--s2)', border: `1px solid ${sQuota ? `${sColor}40` : 'var(--b1)'}`, borderRadius: 99, padding: '2px 7px', cursor: 'pointer', color: sQuota ? sColor : 'var(--t4)', fontSize: 10, fontWeight: sQuota ? 700 : 400, transition: 'all .15s' }}
                                >
                                  <FiTarget size={8} />
                                  {sQuota ? `${sDone}/${sQuota}` : 'cota'}
                                </button>
                              )}

                              {/* Contrato badge */}
                              {editingSubContractId === sub.id ? (
                                <input autoFocus type="text" inputMode="decimal" value={editingSubContractVal}
                                  onChange={e => setEditingSubContractVal(e.target.value)}
                                  onKeyDown={e => { if (e.key === 'Enter') handleSaveSubContract(sub.id); if (e.key === 'Escape') setEditingSubContractId(null); }}
                                  onBlur={() => handleSaveSubContract(sub.id)}
                                  placeholder="R$"
                                  style={{ width: 64, background: 'var(--ib)', border: `1px solid ${selected.color}`, borderRadius: 6, padding: '2px 6px', color: 'var(--t1)', fontSize: 10, outline: 'none', textAlign: 'right' }}
                                />
                              ) : (
                                <button title={sub.contractValue ? `R$ ${formatCurrency(sub.contractValue)}` : 'Definir contrato'}
                                  onClick={e => { e.stopPropagation(); setEditingSubContractVal(sub.contractValue ? String(sub.contractValue) : ''); setEditingSubContractId(sub.id); }}
                                  style={{ display: 'flex', alignItems: 'center', gap: 3, background: sub.contractValue ? 'rgba(48,209,88,0.1)' : 'var(--s2)', border: `1px solid ${sub.contractValue ? 'rgba(48,209,88,0.3)' : 'var(--b1)'}`, borderRadius: 99, padding: '2px 7px', cursor: 'pointer', color: sub.contractValue ? '#30d158' : 'var(--t4)', fontSize: 10, fontWeight: sub.contractValue ? 700 : 400, transition: 'all .15s' }}
                                >
                                  <FiDollarSign size={8} />
                                  {sub.contractValue ? formatCurrency(sub.contractValue) : 'contrato'}
                                </button>
                              )}

                              {/* Week count */}
                              {weekCount > 0 && (
                                <span title="Tarefas esta semana" style={{ fontSize: 10, fontWeight: 700, color: selected.color, background: `${selected.color}18`, borderRadius: 99, padding: '2px 7px' }}>
                                  {weekCount} semana
                                </span>
                              )}

                              {/* Inactivity */}
                              {inactDays !== null && inactDays >= 30 && (
                                <span title={`Sem atividade há ${inactDays} dias`} style={{ display: 'inline-flex', alignItems: 'center', gap: 3, color: '#ff9f0a', fontSize: 9, fontWeight: 700 }}>
                                  <FiAlertTriangle size={9} /> {inactDays}d
                                </span>
                              )}

                              {/* Notes icon with hover preview */}
                              {sub.notes && sub.notes.trim() && (
                                <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}
                                  onMouseEnter={() => setNotesHoverId(sub.id)}
                                  onMouseLeave={() => setNotesHoverId(null)}
                                >
                                  <FiFileText size={11} style={{ color: '#64C4FF', cursor: 'pointer' }} onClick={() => openClientModal(sub.id, 'notas')} />
                                  {notesHoverId === sub.id && (
                                    <div style={{ position: 'absolute', bottom: '100%', left: '50%', transform: 'translateX(-50%)', marginBottom: 6, background: 'var(--modal-bg)', border: '1px solid var(--b2)', borderRadius: 8, padding: '8px 10px', fontSize: 11, color: 'var(--t2)', width: 200, whiteSpace: 'pre-wrap', wordBreak: 'break-word', zIndex: 100, boxShadow: '0 4px 16px rgba(0,0,0,0.3)', lineHeight: 1.5, pointerEvents: 'none' }}>
                                      {sub.notes.slice(0, 120)}{sub.notes.length > 120 ? '…' : ''}
                                    </div>
                                  )}
                                </div>
                              )}

                              {/* Tips badge */}
                              {hasTips && (
                                <button onClick={e => { e.stopPropagation(); openClientModal(sub.id, 'dicas'); }}
                                  title={`${sub.tips!.length} dica${sub.tips!.length !== 1 ? 's' : ''}`}
                                  style={{ display: 'flex', alignItems: 'center', gap: 3, background: 'rgba(255,159,10,0.1)', border: '1px solid rgba(255,159,10,0.25)', borderRadius: 99, padding: '2px 7px', cursor: 'pointer', color: '#ff9f0a' }}
                                >
                                  <FiStar size={8} />
                                  <span style={{ fontSize: 9, fontWeight: 700 }}>{sub.tips!.length}</span>
                                </button>
                              )}

                              {/* Contact shortcuts */}
                              <ContactShortcuts whatsapp={sub.platforms?.whatsapp} instagram={sub.platforms?.instagram} email={sub.platforms?.email} siteUrl={sub.siteUrl} accentColor={selected.color} size={10} />

                              {/* Spacer + actions */}
                              <div style={{ flex: 1 }} />
                              <div style={{ display: 'flex', gap: 2 }} onClick={e => e.stopPropagation()}>
                                <button onClick={() => startEditSub(sub)}
                                  style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--t4)', padding: 4, borderRadius: 5, transition: 'color .15s' }}
                                  onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = '#64C4FF'}
                                  onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = 'var(--t4)'}
                                ><FiEdit2 size={10} /></button>
                                <button onClick={() => handleDeleteSubClient(sub)}
                                  style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--t4)', padding: 4, borderRadius: 5, transition: 'color .15s' }}
                                  onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = '#ff453a'}
                                  onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = 'var(--t4)'}
                                ><FiTrash2 size={10} /></button>
                              </div>
                            </div>

                            {/* Quota progress bar */}
                            {sPct !== null && (
                              <div style={{ padding: '0 10px 8px 32px' }}>
                                <div style={{ height: 3, background: 'var(--b1)', borderRadius: 2, overflow: 'hidden' }}>
                                  <div style={{ height: '100%', width: `${sPct}%`, borderRadius: 2, transition: 'width .4s', background: `linear-gradient(90deg, ${sColor}, ${sColor}66)`, boxShadow: `0 0 6px ${sColor}66` }} />
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 2 }}>
                                  <span style={{ fontSize: 9, color: 'var(--t4)' }}>{Math.round(sPct)}%</span>
                                  {sDone >= (sQuota ?? 0)
                                    ? <span style={{ fontSize: 9, color: '#30d158', fontWeight: 600 }}>cota atingida!</span>
                                    : <span style={{ fontSize: 9, color: 'var(--t4)' }}>faltam {(sQuota ?? 0) - sDone}</span>
                                  }
                                </div>
                              </div>
                            )}

                            {/* Tips chips */}
                            {hasTips && (
                              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, padding: '0 10px 8px 32px', cursor: 'pointer' }} onClick={() => openClientModal(sub.id, 'dicas')}>
                                {sub.tips!.slice(0, 3).map((tip, ti) => (
                                  <span key={ti} style={{ fontSize: 10, padding: '2px 8px', borderRadius: 99, background: 'rgba(255,159,10,0.1)', border: '1px solid rgba(255,159,10,0.2)', color: '#ff9f0a' }}>{tip}</span>
                                ))}
                                {sub.tips!.length > 3 && <span style={{ fontSize: 10, color: 'var(--t4)', padding: '2px 4px' }}>+{sub.tips!.length - 3}</span>}
                              </div>
                            )}

                            {/* Next task indicator */}
                            {(() => {
                              const nt = nextTaskFor(sub.id);
                              if (!nt) return null;
                              const isOv = nt.date < today;
                              return (
                                <div style={{ padding: '0 10px 6px 32px' }}>
                                  <span title={`Próxima tarefa: ${nt.date}`} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 9, fontWeight: 700, padding: '2px 7px', borderRadius: 5, background: isOv ? 'rgba(255,69,58,0.10)' : `${selected.color}10`, color: isOv ? '#ff453a' : selected.color, border: `1px solid ${isOv ? 'rgba(255,69,58,0.2)' : `${selected.color}25`}` }}>
                                    <FiChevronRight size={8} /> {isOv ? '⚠ ' : ''}Próxima: {format(parseISO(nt.date), "d 'de' MMM", { locale: ptBR })}
                                  </span>
                                </div>
                              );
                            })()}

                            {/* Quick add task inline */}
                            {addingTaskForSub === sub.id && (
                              <div style={{ display: 'flex', gap: 6, padding: '0 10px 8px 32px', alignItems: 'center' }}>
                                <input autoFocus value={quickTaskInput} onChange={e => setQuickTaskInput(e.target.value)}
                                  onKeyDown={e => { if (e.key === 'Enter') handleQuickAddTask(sub); if (e.key === 'Escape') setAddingTaskForSub(null); }}
                                  placeholder="Nome da tarefa..."
                                  style={{ flex: 1, background: 'var(--ib)', border: `1px solid ${selected.color}55`, borderRadius: 7, padding: '6px 10px', color: 'var(--t1)', fontSize: 12, outline: 'none' }}
                                />
                                <button onClick={() => handleQuickAddTask(sub)} style={{ padding: '6px 12px', borderRadius: 7, background: selected.color, border: 'none', color: '#fff', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>+ Criar</button>
                                <button onClick={() => setAddingTaskForSub(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--t4)', padding: 4 }}><FiX size={13} /></button>
                              </div>
                            )}
                          </motion.div>
                        )}
                      </SortableSubClientItem>
                    );
                  })}

                    </SortableContext>
                  </DndContext>

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
              </div>}

              {/* Financeiro section */}
              <div style={{ ...CARD }}>
                <button onClick={() => setShowFinanceiro(v => !v)} style={{ width: '100%', padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 8, background: 'transparent', border: 'none', cursor: 'pointer', borderBottom: showFinanceiro ? '1px solid var(--b1)' : 'none' }}>
                  <FiDollarSign size={13} style={{ color: selected.color, flexShrink: 0 }} />
                  <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '1.5px', textTransform: 'uppercase', color: 'var(--t3)', flex: 1, textAlign: 'left' }}>Financeiro</span>
                  {selected.paymentStatus && (
                    <span style={{ fontSize: 9, fontWeight: 700, padding: '2px 7px', borderRadius: 99, ...PAYMENT_COLORS[selected.paymentStatus], letterSpacing: '0.5px', textTransform: 'uppercase' }}>{selected.paymentStatus}</span>
                  )}
                  {showFinanceiro ? <FiChevronUp size={12} style={{ color: 'var(--t4)' }} /> : <FiChevronDown size={12} style={{ color: 'var(--t4)' }} />}
                </button>
                <AnimatePresence>
                  {showFinanceiro && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} style={{ overflow: 'hidden' }}>
                      <div style={{ padding: '0 18px 18px' }}>
                        {/* Payment status */}
                        <div style={{ display: 'flex', gap: 6, marginBottom: 14 }}>
                          {(['pago', 'pendente', 'atrasado'] as const).map(st => (
                            <button key={st} onClick={() => updateCompany(selected.id, { paymentStatus: selected.paymentStatus === st ? undefined : st })}
                              style={{ flex: 1, padding: '5px 0', borderRadius: 8, fontSize: 10, fontWeight: 700, textTransform: 'uppercase', cursor: 'pointer', border: 'none', transition: 'all .15s', ...( selected.paymentStatus === st ? PAYMENT_COLORS[st] : { background: 'var(--s1)', color: 'var(--t4)' }) }}
                            >{st}</button>
                          ))}
                        </div>

                        {/* Contract dates */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 14 }}>
                          <div>
                            <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase', color: 'var(--t4)', marginBottom: 4 }}>Início contrato</div>
                            <input type="date" value={editingContractDates ? contractStartVal : (selected.contractStart ?? '')}
                              onChange={e => { if (!editingContractDates) setEditingContractDates(true); setContractStartVal(e.target.value); }}
                              onBlur={() => { if (editingContractDates) { updateCompany(selected.id, { contractStart: contractStartVal || undefined }); setEditingContractDates(false); } }}
                              style={{ width: '100%', boxSizing: 'border-box', background: 'var(--ib)', border: '1px solid var(--b2)', borderRadius: 7, padding: '5px 8px', color: 'var(--t1)', fontSize: 11, outline: 'none' }}
                              onFocus={e => { setContractStartVal(selected.contractStart ?? ''); setEditingContractDates(true); e.currentTarget.style.borderColor = `${selected.color}60`; }}
                            />
                          </div>
                          <div>
                            <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase', color: 'var(--t4)', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 4 }}>
                              Renovação
                              {selected.contractRenewal && isBefore(parseISO(selected.contractRenewal), new Date()) && (
                                <FiAlertTriangle size={9} style={{ color: '#ff453a' }} title="Contrato vencido!" />
                              )}
                            </div>
                            <input type="date" value={editingContractDates ? contractRenewalVal : (selected.contractRenewal ?? '')}
                              onChange={e => { if (!editingContractDates) setEditingContractDates(true); setContractRenewalVal(e.target.value); }}
                              onBlur={() => { if (editingContractDates) { updateCompany(selected.id, { contractRenewal: contractRenewalVal || undefined }); setEditingContractDates(false); } }}
                              style={{ width: '100%', boxSizing: 'border-box', background: 'var(--ib)', border: `1px solid ${selected.contractRenewal && isBefore(parseISO(selected.contractRenewal), new Date()) ? 'rgba(255,69,58,0.4)' : 'var(--b2)'}`, borderRadius: 7, padding: '5px 8px', color: 'var(--t1)', fontSize: 11, outline: 'none' }}
                              onFocus={e => { setContractRenewalVal(selected.contractRenewal ?? ''); setEditingContractDates(true); e.currentTarget.style.borderColor = `${selected.color}60`; }}
                            />
                          </div>
                        </div>

                        {/* Invoice due day */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                          <span style={{ fontSize: 10, color: 'var(--t3)', flex: 1 }}>Vencimento fatura (dia)</span>
                          {editingInvoiceDue ? (
                            <div style={{ display: 'flex', gap: 5, alignItems: 'center' }}>
                              <input autoFocus type="number" min="1" max="31" value={invoiceDueVal} onChange={e => setInvoiceDueVal(e.target.value)}
                                onKeyDown={e => { if (e.key === 'Enter') { updateCompany(selected.id, { invoiceDueDay: parseInt(invoiceDueVal, 10) || undefined }); setEditingInvoiceDue(false); } if (e.key === 'Escape') setEditingInvoiceDue(false); }}
                                style={{ width: 50, background: 'var(--ib)', border: `1px solid ${selected.color}55`, borderRadius: 6, padding: '3px 7px', color: 'var(--t1)', fontSize: 11, outline: 'none', textAlign: 'center' }}
                              />
                              <button onClick={() => { updateCompany(selected.id, { invoiceDueDay: parseInt(invoiceDueVal, 10) || undefined }); setEditingInvoiceDue(false); }} style={{ background: selected.color, border: 'none', borderRadius: 5, padding: '3px 8px', color: '#fff', fontSize: 11, cursor: 'pointer' }}>OK</button>
                            </div>
                          ) : (
                            <button onClick={() => { setInvoiceDueVal(String(selected.invoiceDueDay ?? '')); setEditingInvoiceDue(true); }}
                              style={{ padding: '2px 10px', borderRadius: 7, fontSize: 11, fontWeight: 700, background: selected.invoiceDueDay ? `${selected.color}18` : 'var(--s1)', border: `1px solid ${selected.invoiceDueDay ? `${selected.color}40` : 'var(--b1)'}`, color: selected.invoiceDueDay ? selected.color : 'var(--t4)', cursor: 'pointer', transition: 'all .15s' }}
                            >{selected.invoiceDueDay ? `dia ${selected.invoiceDueDay}` : '+ dia'}</button>
                          )}
                        </div>

                        {/* Payment history */}
                        <div>
                          <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '1.5px', textTransform: 'uppercase', color: 'var(--t4)', marginBottom: 8, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            Histórico de pagamentos
                            <button onClick={() => setAddingPayment(v => !v)} style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '2px 7px', borderRadius: 6, background: addingPayment ? `${selected.color}20` : 'var(--s2)', border: '1px solid var(--b1)', color: addingPayment ? selected.color : 'var(--t4)', fontSize: 10, cursor: 'pointer', transition: 'all .15s' }}>
                              <FiPlus size={9} /> Registrar
                            </button>
                          </div>

                          {addingPayment && (
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 2fr', gap: 6, marginBottom: 8, padding: '10px', borderRadius: 10, background: 'var(--s1)', border: `1px solid ${selected.color}25` }}>
                              <input type="date" value={paymentDate} onChange={e => setPaymentDate(e.target.value)} placeholder="Data" style={{ background: 'var(--ib)', border: '1px solid var(--b2)', borderRadius: 6, padding: '5px 7px', color: 'var(--t1)', fontSize: 11, outline: 'none' }} />
                              <input type="text" inputMode="decimal" value={paymentAmount} onChange={e => setPaymentAmount(e.target.value)} placeholder="R$ valor" style={{ background: 'var(--ib)', border: '1px solid var(--b2)', borderRadius: 6, padding: '5px 7px', color: 'var(--t1)', fontSize: 11, outline: 'none' }} />
                              <div style={{ display: 'flex', gap: 5 }}>
                                <input type="text" value={paymentDesc} onChange={e => setPaymentDesc(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') handleAddPayment(); }} placeholder="Descrição..." style={{ flex: 1, background: 'var(--ib)', border: '1px solid var(--b2)', borderRadius: 6, padding: '5px 7px', color: 'var(--t1)', fontSize: 11, outline: 'none' }} />
                                <button onClick={handleAddPayment} style={{ padding: '5px 10px', borderRadius: 6, background: selected.color, border: 'none', color: '#fff', fontSize: 11, cursor: 'pointer', fontWeight: 600 }}>✓</button>
                              </div>
                            </div>
                          )}

                          <div style={{ maxHeight: 140, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 4 }}>
                            {(selected.paymentHistory ?? []).slice().reverse().map(rec => (
                              <div key={rec.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 8px', borderRadius: 7, background: 'var(--s1)', border: '1px solid var(--b1)' }}>
                                <span style={{ fontSize: 10, color: 'var(--t4)', flexShrink: 0 }}>{format(parseISO(rec.date), 'd MMM yy', { locale: ptBR })}</span>
                                <span style={{ fontSize: 11, fontWeight: 700, color: '#30d158', flexShrink: 0 }}>R$ {formatCurrency(rec.amount)}</span>
                                {rec.description && <span style={{ fontSize: 10, color: 'var(--t3)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{rec.description}</span>}
                                <button onClick={() => deletePaymentRecord(selected.id, rec.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--t4)', padding: 2, borderRadius: 4, flexShrink: 0, transition: 'color .15s' }}
                                  onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = '#ff453a'}
                                  onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = 'var(--t4)'}
                                ><FiTrash2 size={10} /></button>
                              </div>
                            ))}
                            {(selected.paymentHistory ?? []).length === 0 && <div style={{ textAlign: 'center', padding: '12px 0', color: 'var(--t4)', fontSize: 11 }}>Nenhum pagamento registrado</div>}
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Comunicação section */}
              <div style={{ ...CARD, marginBottom: 14 }}>
                <button onClick={() => setShowComunicacao(v => !v)} style={{ width: '100%', padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 8, background: 'transparent', border: 'none', cursor: 'pointer' }}>
                  <FiMessageCircle size={13} style={{ color: 'var(--t3)', flexShrink: 0 }} />
                  <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '1.5px', textTransform: 'uppercase', color: 'var(--t3)', flex: 1, textAlign: 'left' }}>Comunicação</span>
                  {selected.nextContactDate && (
                    <span style={{ fontSize: 9, color: isBefore(parseISO(selected.nextContactDate), new Date()) ? '#ff453a' : '#64C4FF', fontWeight: 600 }}>
                      {format(parseISO(selected.nextContactDate), "d MMM", { locale: ptBR })}
                    </span>
                  )}
                  {showComunicacao ? <FiChevronUp size={12} style={{ color: 'var(--t4)' }} /> : <FiChevronDown size={12} style={{ color: 'var(--t4)' }} />}
                </button>
                <AnimatePresence>
                  {showComunicacao && (
                    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} style={{ overflow: 'hidden' }}>
                      <div style={{ padding: '0 18px 18px', display: 'flex', flexDirection: 'column', gap: 14 }}>
                        {/* Action buttons row */}
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button onClick={generateWhatsAppReport}
                            style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '6px 12px', borderRadius: 8, background: 'rgba(37,211,102,0.12)', border: '1px solid rgba(37,211,102,0.3)', color: '#25D366', fontSize: 11, fontWeight: 600, cursor: 'pointer', transition: 'all .15s' }}
                            onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'rgba(37,211,102,0.2)'}
                            onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'rgba(37,211,102,0.12)'}
                          ><FiSend size={11} /> Relatório WhatsApp</button>
                          <button onClick={() => setAddingInteractionForm(v => !v)}
                            style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '6px 12px', borderRadius: 8, background: addingInteractionForm ? `${selected.color}18` : 'var(--s1)', border: `1px solid ${addingInteractionForm ? `${selected.color}40` : 'var(--b1)'}`, color: addingInteractionForm ? selected.color : 'var(--t4)', fontSize: 11, cursor: 'pointer', transition: 'all .15s' }}
                          ><FiPlus size={11} /> Interação</button>
                        </div>

                        {/* Next contact */}
                        <div>
                          <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase', color: 'var(--t4)', marginBottom: 6, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            Próximo contato
                            {selected.nextContactDate && <button onClick={() => updateCompany(selected.id, { nextContactDate: undefined })} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--t4)', padding: 2, transition: 'color .15s' }} onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = '#ff453a'} onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = 'var(--t4)'}><FiX size={10} /></button>}
                          </div>
                          {editingNextContact ? (
                            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                              <input autoFocus type="date" value={nextContactVal} onChange={e => setNextContactVal(e.target.value)}
                                style={{ flex: 1, background: 'var(--ib)', border: `1px solid ${selected.color}55`, borderRadius: 7, padding: '5px 8px', color: 'var(--t1)', fontSize: 11, outline: 'none' }}
                              />
                              <button onClick={handleSaveNextContact} style={{ background: selected.color, border: 'none', borderRadius: 6, padding: '5px 10px', color: '#fff', fontSize: 11, cursor: 'pointer' }}>OK</button>
                              <button onClick={() => setEditingNextContact(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--t4)', padding: 4 }}><FiX size={11} /></button>
                            </div>
                          ) : (
                            <button onClick={() => { setNextContactVal(selected.nextContactDate ?? ''); setEditingNextContact(true); }}
                              style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 10px', borderRadius: 7, background: 'var(--s1)', border: selected.nextContactDate ? `1px solid ${selected.color}40` : '1px dashed var(--b2)', color: selected.nextContactDate ? selected.color : 'var(--t4)', fontSize: 11, cursor: 'pointer', transition: 'all .15s' }}
                            >
                              <FiCalendar size={10} />
                              {selected.nextContactDate ? format(parseISO(selected.nextContactDate), "d 'de' MMMM", { locale: ptBR }) : 'Definir data de contato'}
                            </button>
                          )}
                        </div>

                        {/* Monthly note */}
                        <div>
                          <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase', color: 'var(--t4)', marginBottom: 6 }}>Nota do mês</div>
                          {editingMonthlyNote ? (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                              <textarea value={monthlyNoteVal} onChange={e => setMonthlyNoteVal(e.target.value)} rows={3} placeholder="Resumo do mês, pendências, observações..."
                                style={{ background: 'var(--ib)', border: `1px solid ${selected.color}55`, borderRadius: 7, padding: '8px 10px', color: 'var(--t1)', fontSize: 12, outline: 'none', resize: 'none', fontFamily: 'inherit', lineHeight: 1.5 }}
                              />
                              <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                                <button onClick={() => setEditingMonthlyNote(false)} style={{ padding: '4px 12px', borderRadius: 6, background: 'var(--s2)', border: '1px solid var(--b2)', color: 'var(--t3)', fontSize: 11, cursor: 'pointer' }}>Cancelar</button>
                                <button onClick={handleSaveMonthlyNote} style={{ padding: '4px 12px', borderRadius: 6, background: selected.color, border: 'none', color: '#fff', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>Salvar</button>
                              </div>
                            </div>
                          ) : (
                            <button onClick={() => { setMonthlyNoteVal(selected.monthlyNote ?? ''); setEditingMonthlyNote(true); }}
                              style={{ width: '100%', textAlign: 'left', padding: '8px 10px', borderRadius: 7, background: 'var(--s1)', border: selected.monthlyNote ? `1px solid ${selected.color}25` : '1px dashed var(--b2)', color: selected.monthlyNote ? 'var(--t2)' : 'var(--t4)', fontSize: 11, cursor: 'pointer', transition: 'all .15s', lineHeight: 1.5 }}
                              onMouseEnter={e => (e.currentTarget as HTMLElement).style.borderColor = `${selected.color}50`}
                              onMouseLeave={e => (e.currentTarget as HTMLElement).style.borderColor = selected.monthlyNote ? `${selected.color}25` : 'var(--b2)'}
                            >{selected.monthlyNote ? selected.monthlyNote.slice(0, 100) + (selected.monthlyNote.length > 100 ? '…' : '') : 'Adicionar nota do mês...'}</button>
                          )}
                        </div>

                        {/* Add interaction form */}
                        {addingInteractionForm && (
                          <div style={{ padding: '12px', borderRadius: 10, background: 'var(--s1)', border: `1px solid ${selected.color}25`, display: 'flex', flexDirection: 'column', gap: 8 }}>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
                              <input type="date" value={interactionDate} onChange={e => setInteractionDate(e.target.value)} style={{ background: 'var(--ib)', border: '1px solid var(--b2)', borderRadius: 7, padding: '5px 8px', color: 'var(--t1)', fontSize: 11, outline: 'none' }} />
                              <select value={interactionType} onChange={e => setInteractionType(e.target.value as CompanyInteraction['type'])} style={{ background: 'var(--ib)', border: '1px solid var(--b2)', borderRadius: 7, padding: '5px 8px', color: 'var(--t1)', fontSize: 11, outline: 'none' }}>
                                {Object.entries(INTERACTION_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                              </select>
                            </div>
                            <div style={{ display: 'flex', gap: 6 }}>
                              <input value={interactionNote} onChange={e => setInteractionNote(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') handleAddInteraction(); }} placeholder="Resumo da interação..." autoFocus
                                style={{ flex: 1, background: 'var(--ib)', border: '1px solid var(--b2)', borderRadius: 7, padding: '5px 8px', color: 'var(--t1)', fontSize: 11, outline: 'none' }}
                              />
                              <button onClick={handleAddInteraction} style={{ padding: '5px 12px', borderRadius: 7, background: selected.color, border: 'none', color: '#fff', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>✓</button>
                            </div>
                          </div>
                        )}

                        {/* Interaction log */}
                        {(selected.interactions ?? []).length > 0 && (
                          <div>
                            <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase', color: 'var(--t4)', marginBottom: 6 }}>Histórico de contatos</div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: 160, overflowY: 'auto' }}>
                              {[...(selected.interactions ?? [])].reverse().map(item => (
                                <div key={item.id} style={{ display: 'flex', gap: 8, padding: '7px 9px', borderRadius: 8, background: 'var(--s1)', border: '1px solid var(--b1)', alignItems: 'flex-start' }}>
                                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, flexShrink: 0 }}>
                                    <span style={{ fontSize: 9, fontWeight: 700, color: selected.color, background: `${selected.color}18`, padding: '1px 5px', borderRadius: 5 }}>{INTERACTION_LABELS[item.type]}</span>
                                    <span style={{ fontSize: 9, color: 'var(--t4)' }}>{format(parseISO(item.date), 'd MMM', { locale: ptBR })}</span>
                                  </div>
                                  <span style={{ flex: 1, fontSize: 11, color: 'var(--t2)', lineHeight: 1.4 }}>{item.note}</span>
                                  <button onClick={() => deleteInteraction(selected.id, item.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--t4)', padding: 2, borderRadius: 4, flexShrink: 0, transition: 'color .15s' }}
                                    onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = '#ff453a'}
                                    onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = 'var(--t4)'}
                                  ><FiTrash2 size={10} /></button>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Inactivity threshold */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <FiTrendingUp size={11} style={{ color: 'var(--t4)', flexShrink: 0 }} />
                          <span style={{ fontSize: 10, color: 'var(--t3)', flex: 1 }}>Alerta de inatividade (dias)</span>
                          {editingInactivityDays ? (
                            <div style={{ display: 'flex', gap: 5 }}>
                              <input autoFocus type="number" min="1" value={inactivityDaysVal} onChange={e => setInactivityDaysVal(e.target.value)}
                                onKeyDown={e => { if (e.key === 'Enter') handleSaveInactivityDays(); if (e.key === 'Escape') setEditingInactivityDays(false); }}
                                style={{ width: 50, background: 'var(--ib)', border: `1px solid ${selected.color}55`, borderRadius: 6, padding: '3px 7px', color: 'var(--t1)', fontSize: 11, outline: 'none', textAlign: 'center' }}
                              />
                              <button onClick={handleSaveInactivityDays} style={{ background: selected.color, border: 'none', borderRadius: 5, padding: '3px 8px', color: '#fff', fontSize: 11, cursor: 'pointer' }}>OK</button>
                            </div>
                          ) : (
                            <button onClick={() => { setInactivityDaysVal(String(selected.inactivityAlertDays ?? 30)); setEditingInactivityDays(true); }}
                              style={{ padding: '2px 8px', borderRadius: 6, fontSize: 10, fontWeight: 600, background: 'var(--s1)', border: '1px solid var(--b1)', color: 'var(--t3)', cursor: 'pointer', transition: 'all .15s' }}
                            >{selected.inactivityAlertDays ?? 30}d</button>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>


                </div>{/* END RIGHT COLUMN */}

              </div>{/* END bento-grid */}
            </motion.div>
          ) : (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 14, color: 'var(--t4)', padding: 40, minHeight: 280 }}>
              <div style={{ fontSize: 56, opacity: 0.4 }}>🏢</div>
              <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--t2)' }}>
                {companies.length === 0 ? 'Cadastre sua primeira empresa' : 'Selecione uma empresa'}
              </div>
              <div style={{ fontSize: 12, color: 'var(--t4)', textAlign: 'center', maxWidth: 320, lineHeight: 1.5 }}>
                {companies.length === 0
                  ? 'Empresas agrupam subclients, tarefas e propostas — comece criando uma.'
                  : 'Escolha uma empresa na barra lateral para ver detalhes.'}
              </div>
              {companies.length === 0 && (
                <button onClick={() => setShowNew(true)}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 16px', background: '#356BFF', border: 'none', borderRadius: 8, color: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer', boxShadow: '0 4px 14px rgba(53,107,255,0.35)' }}>
                  <FiPlus size={13} /> Nova Empresa
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
