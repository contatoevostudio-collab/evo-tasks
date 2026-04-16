import { useState, useEffect, useRef } from 'react';
import { DndContext, type DragEndEvent, PointerSensor, useSensor, useSensors, closestCenter } from '@dnd-kit/core';
import { SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  FiHome, FiCheckSquare, FiBriefcase, FiSettings,
  FiPlus, FiChevronDown, FiChevronRight, FiChevronLeft,
  FiEye, FiEyeOff, FiArchive, FiDownload, FiSun, FiMoon,
  FiUser, FiLogOut, FiLogIn, FiKey, FiX, FiCheck, FiTrendingUp,
  FiChevronUp, FiMoreHorizontal, FiEdit3,
} from 'react-icons/fi';
import { useTaskStore } from '../store/tasks';
import { playAdd, playCheck, playDelete } from '../lib/sounds';
import { useAuthStore } from '../store/auth';
import type { PageType, Theme, Company } from '../types';
import EvoIcon from '../assets/images/Logos/Icons/Icone/4.svg';

interface Props {
  currentPage: PageType;
  onChangePage: (p: PageType) => void;
  onAddTask: () => void;
  onOpenSettings: () => void;
  onLogin: () => void;
}

const NAV = [
  { id: 'home'     as PageType, label: 'Home',     Icon: FiHome,        beta: false },
  { id: 'tarefas'  as PageType, label: 'Tarefas',  Icon: FiCheckSquare, beta: false },
  { id: 'empresas' as PageType, label: 'Empresas', Icon: FiBriefcase,   beta: false },
  { id: 'arquivo'  as PageType, label: 'Arquivo',  Icon: FiArchive,     beta: false },
  { id: 'crm'      as PageType, label: 'CRM',      Icon: FiTrendingUp,  beta: true  },
];

const THEMES: Theme[] = ['dark-blue', 'dark-pure', 'dark-warm', 'light-soft', 'light-pure'];
const THEME_LABELS: Record<Theme, string> = {
  'dark-blue': 'Azul Escuro',
  'dark-pure': 'Preto',
  'dark-warm': 'Quente Escuro',
  'light-soft': 'Claro Suave',
  'light-pure': 'Branco',
};

const dragRegion: React.CSSProperties = { WebkitAppRegion: 'drag' } as React.CSSProperties;
const noDragRegion: React.CSSProperties = { WebkitAppRegion: 'no-drag' } as React.CSSProperties;

function SidebarNoteRow({ id, text, checked, onToggle, onDelete }: {
  id: string; text: string; checked: boolean; onToggle: () => void; onDelete: () => void;
}) {
  const [hovered, setHovered] = useState(false);
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.4 : 1 }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div style={{
        display: 'flex', alignItems: 'flex-start', gap: 6,
        padding: '4px 6px', borderRadius: 6, marginBottom: 1,
        background: hovered ? 'var(--s1)' : 'transparent',
        transition: isDragging ? 'none' : 'background .15s',
        cursor: isDragging ? 'grabbing' : 'grab',
        userSelect: 'none',
      }}
        {...attributes} {...listeners}
      >
        <button
          onPointerDown={e => e.stopPropagation()}
          onClick={e => { e.stopPropagation(); onToggle(); }}
          style={{
            width: 13, height: 13, borderRadius: 3, flexShrink: 0,
            border: `1.5px solid ${checked ? '#356BFF' : 'var(--b3)'}`,
            background: checked ? '#356BFF' : 'transparent',
            cursor: 'pointer', padding: 0, marginTop: 1,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'all .15s',
          }}
        >
          {checked && (
            <svg width="7" height="7" viewBox="0 0 7 7" fill="none">
              <polyline points="1,3.5 2.8,5.5 6,1.5" stroke="#fff" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
        </button>
        <span style={{
          flex: 1, fontSize: 11, color: checked ? 'var(--t4)' : 'var(--t2)',
          textDecoration: checked ? 'line-through' : 'none',
          lineHeight: 1.4, wordBreak: 'break-word', transition: 'all .15s',
        }}>
          {text}
        </span>
        <button
          onPointerDown={e => e.stopPropagation()}
          onClick={e => { e.stopPropagation(); onDelete(); }}
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            color: 'var(--t4)', padding: 1, display: 'flex', flexShrink: 0,
            opacity: hovered ? 1 : 0, transition: 'opacity .15s',
            pointerEvents: hovered ? 'auto' : 'none',
          }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = '#ff453a'; }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'var(--t4)'; }}
        >
          <FiX size={10} />
        </button>
      </div>
    </div>
  );
}

type CompanyStatus = 'ativo' | 'pausado' | 'inativo';

function getCompanyStatus(c: Company): CompanyStatus {
  return c.status ?? 'ativo';
}

export function NavSidebar({ currentPage, onChangePage, onAddTask, onOpenSettings, onLogin }: Props) {
  const {
    companies, subClients, tasks,
    selectedCompanies, toggleCompany, selectAllCompanies, deselectAllCompanies,
    filterSubClient, setFilterSubClient,
    sidebarCollapsed, toggleSidebar,
    theme, setTheme,
    updateCompany,
    moveCompanyUp, moveCompanyDown,
    syncStatus,
    quickNotes, addQuickNote, toggleQuickNote, deleteQuickNote, reorderQuickNotes,
  } = useTaskStore();

  const { user, signOut, updatePassword } = useAuthStore();

  const isLightTheme = theme === 'light-soft' || theme === 'light-pure';
  const cycleTheme = () => {
    const idx = THEMES.indexOf(theme);
    setTheme(THEMES[(idx + 1) % THEMES.length]);
  };

  // Profile popover
  const profileBtnRef = useRef<HTMLButtonElement>(null);
  const [showProfile, setShowProfile] = useState(false);
  const [profileView, setProfileView] = useState<'menu' | 'password'>('menu');
  const [newPwd, setNewPwd] = useState('');
  const [pwdLoading, setPwdLoading] = useState(false);
  const [pwdMsg, setPwdMsg] = useState<{ text: string; ok: boolean } | null>(null);
  const [profilePos, setProfilePos] = useState<{ left: number; bottom: number } | null>(null);

  const openProfile = () => {
    if (showProfile) { setShowProfile(false); return; }
    const rect = profileBtnRef.current?.getBoundingClientRect();
    if (rect) setProfilePos({ left: sidebarCollapsed ? rect.right + 8 : 12, bottom: window.innerHeight - rect.top + 8 });
    setProfileView('menu');
    setNewPwd('');
    setPwdMsg(null);
    setShowProfile(true);
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwdLoading(true);
    setPwdMsg(null);
    await updatePassword(newPwd);
    const err = useAuthStore.getState().error;
    setPwdMsg(err ? { text: err, ok: false } : { text: 'Senha atualizada!', ok: true });
    setPwdLoading(false);
    if (!err) { setNewPwd(''); setTimeout(() => setShowProfile(false), 1500); }
  };

  // Fecha popover ao clicar fora
  useEffect(() => {
    if (!showProfile) return;
    const handler = (e: MouseEvent) => {
      const target = e.target as Node;
      if (!profileBtnRef.current?.contains(target)) setShowProfile(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showProfile]);

  const [notesOpen, setNotesOpen] = useState(false);
  const [notesInput, setNotesInput] = useState('');

  // Reset notes panel when sidebar collapses
  useEffect(() => {
    if (sidebarCollapsed) setNotesOpen(false);
  }, [sidebarCollapsed]);

  const handleAddNote = () => {
    const text = notesInput.trim();
    if (!text) return;
    addQuickNote(text);
    playAdd();
    setNotesInput('');
  };

  const notesSensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));
  const handleNotesDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    if (over && active.id !== over.id) reorderQuickNotes(active.id as string, over.id as string);
  };

  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [hoveredCompany, setHoveredCompany] = useState<string | null>(null);
  const [updateStatus, setUpdateStatus] = useState<'idle' | 'available' | 'downloaded' | 'error'>('idle');
  const [_updateError, setUpdateError] = useState<string | null>(null);

  // Status group collapse state — Ativos expanded by default
  const [groupExpanded, setGroupExpanded] = useState<Record<CompanyStatus, boolean>>({
    ativo: true,
    pausado: false,
    inativo: false,
  });

  // Status menu popup
  const [statusMenuCompanyId, setStatusMenuCompanyId] = useState<string | null>(null);
  const [statusMenuPos, setStatusMenuPos] = useState<{ x: number; y: number } | null>(null);
  const statusMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    window.electronAPI?.onUpdateAvailable(() => setUpdateStatus('available'));
    window.electronAPI?.onUpdateDownloaded(() => setUpdateStatus('downloaded'));
    window.electronAPI?.onUpdateError?.((msg: string) => { setUpdateStatus('error'); setUpdateError(msg); });
  }, []);

  // Close status menu on outside click
  useEffect(() => {
    if (!statusMenuCompanyId) return;
    const handler = (e: MouseEvent) => {
      if (!statusMenuRef.current?.contains(e.target as Node)) {
        setStatusMenuCompanyId(null);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [statusMenuCompanyId]);

  const toggleExpand = (id: string) =>
    setExpanded(p => ({ ...p, [id]: !p[id] }));

  const countFor = (companyId: string) =>
    tasks.filter(t => t.companyId === companyId && t.status !== 'done' && !t.archived).length;

  const allSelected = selectedCompanies.length === companies.length;

  const openStatusMenu = (e: React.MouseEvent, companyId: string) => {
    e.stopPropagation();
    if (statusMenuCompanyId === companyId) { setStatusMenuCompanyId(null); return; }
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    setStatusMenuPos({ x: rect.right + 6, y: rect.top });
    setStatusMenuCompanyId(companyId);
  };

  // Group companies by status
  const groupedCompanies: Record<CompanyStatus, Company[]> = {
    ativo: companies.filter(c => getCompanyStatus(c) === 'ativo'),
    pausado: companies.filter(c => getCompanyStatus(c) === 'pausado'),
    inativo: companies.filter(c => getCompanyStatus(c) === 'inativo'),
  };

  const STATUS_GROUP_LABELS: Record<CompanyStatus, string> = {
    ativo: 'Ativos',
    pausado: 'Pausados',
    inativo: 'Inativos',
  };

  const STATUS_GROUP_COLORS: Record<CompanyStatus, string> = {
    ativo: '#30d158',
    pausado: '#ff9f0a',
    inativo: 'var(--t4)',
  };

  const STATUS_PILL_COLORS: Record<CompanyStatus, string> = {
    ativo: '#30d158',
    pausado: '#ff9f0a',
    inativo: '#636366',
  };

  // Sync indicator dot
  const syncDotColor = syncStatus === 'syncing' ? '#30d158' : syncStatus === 'error' ? '#ff453a' : 'var(--b3)';
  const syncDotTitle = syncStatus === 'syncing' ? 'Sincronizando...' : syncStatus === 'error' ? 'Erro de sincronização' : 'Sincronizado';

  function renderCompanyRow(company: Company, groupList: Company[]) {
    const subs = subClients.filter(s => s.companyId === company.id);
    const open = expanded[company.id];
    const pending = countFor(company.id);
    const isActive = selectedCompanies.includes(company.id);

    const companyTasks = tasks.filter(t => t.companyId === company.id && !t.archived && !t.inbox);
    const doneTasks = companyTasks.filter(t => t.status === 'done').length;
    const totalTasks = companyTasks.length;
    const pct = totalTasks > 0 ? (doneTasks / totalTasks) * 100 : 0;
    const companyIdx = companies.findIndex(c => c.id === company.id);
    const groupIdx = groupList.findIndex(c => c.id === company.id);

    return (
      <div key={company.id}>
        <div
          style={{
            width: '100%', display: 'flex', alignItems: 'center', gap: 8,
            padding: '7px 10px', borderRadius: 8, marginBottom: 1,
            transition: 'background .15s',
            opacity: isActive ? 1 : 0.35,
            position: 'relative',
          }}
          onMouseEnter={() => setHoveredCompany(company.id)}
          onMouseLeave={() => setHoveredCompany(null)}
        >
          <button
            onClick={() => toggleCompany(company.id)}
            title={isActive ? 'Ocultar empresa' : 'Mostrar empresa'}
            style={{
              width: 10, height: 10, borderRadius: '50%',
              background: company.color, flexShrink: 0,
              border: 'none', cursor: 'pointer', padding: 0,
              transition: 'transform .15s, box-shadow .15s',
              boxShadow: isActive ? `0 0 6px ${company.color}88` : 'none',
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = 'scale(1.3)'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = 'none'; }}
          />

          <button
            onClick={() => toggleExpand(company.id)}
            style={{
              flex: 1, display: 'flex', alignItems: 'center', gap: 6,
              background: 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left', padding: 0,
            }}
          >
            <span style={{ flex: 1, fontSize: 12, fontWeight: 500, color: 'var(--t1)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {company.name}
            </span>
            {pending > 0 && (
              <span style={{
                fontSize: 10, fontWeight: 700, color: company.color,
                background: `${company.color}22`, borderRadius: 99,
                padding: '1px 6px', minWidth: 18, textAlign: 'center', flexShrink: 0,
              }}>
                {pending}
              </span>
            )}
            {subs.length > 0 && (
              open
                ? <FiChevronDown size={11} style={{ color: 'var(--t4)', flexShrink: 0 }} />
                : <FiChevronRight size={11} style={{ color: 'var(--t4)', flexShrink: 0 }} />
            )}
          </button>

          {hoveredCompany === company.id && (
            <>
              {/* Up/Down arrows (#9) */}
              <button
                onClick={e => { e.stopPropagation(); moveCompanyUp(company.id); }}
                disabled={companyIdx <= 0}
                title="Mover para cima"
                style={{
                  background: 'none', border: 'none', cursor: companyIdx <= 0 ? 'default' : 'pointer',
                  color: companyIdx <= 0 ? 'var(--b2)' : 'var(--t3)', padding: 2, display: 'flex',
                  transition: 'color .15s', flexShrink: 0,
                }}
                onMouseEnter={e => { if (companyIdx > 0) (e.currentTarget as HTMLElement).style.color = '#64C4FF'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = companyIdx <= 0 ? 'var(--b2)' : 'var(--t3)'; }}
              >
                <FiChevronUp size={10} />
              </button>
              <button
                onClick={e => { e.stopPropagation(); moveCompanyDown(company.id); }}
                disabled={groupIdx >= groupList.length - 1}
                title="Mover para baixo"
                style={{
                  background: 'none', border: 'none', cursor: groupIdx >= groupList.length - 1 ? 'default' : 'pointer',
                  color: groupIdx >= groupList.length - 1 ? 'var(--b2)' : 'var(--t3)', padding: 2, display: 'flex',
                  transition: 'color .15s', flexShrink: 0,
                }}
                onMouseEnter={e => { if (groupIdx < groupList.length - 1) (e.currentTarget as HTMLElement).style.color = '#64C4FF'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = groupIdx >= groupList.length - 1 ? 'var(--b2)' : 'var(--t3)'; }}
              >
                <FiChevronDown size={10} />
              </button>

              {/* Eye toggle */}
              <button
                onClick={() => toggleCompany(company.id)}
                style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  color: isActive ? 'var(--t3)' : '#64C4FF',
                  padding: 2, display: 'flex', transition: 'color .15s',
                }}
              >
                {isActive ? <FiEye size={11} /> : <FiEyeOff size={11} />}
              </button>

              {/* Status "..." menu button */}
              <button
                onClick={e => openStatusMenu(e, company.id)}
                title="Alterar status"
                style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  color: 'var(--t3)', padding: 2, display: 'flex', transition: 'color .15s', flexShrink: 0,
                }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = 'var(--t1)'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'var(--t3)'; }}
              >
                <FiMoreHorizontal size={11} />
              </button>
            </>
          )}
        </div>

        {totalTasks > 0 && (
          <div style={{ height: 2, borderRadius: 1, background: 'var(--b1)', marginTop: -2, marginLeft: 10, marginRight: 10, overflow: 'hidden', opacity: isActive ? 1 : 0.35 }}>
            <div style={{
              height: '100%', borderRadius: 1,
              width: `${pct}%`,
              background: pct === 100 ? '#30d158' : company.color,
              transition: 'width 0.4s ease',
            }} />
          </div>
        )}

        {open && subs.map(sub => {
          const isSubActive = filterSubClient === sub.id;
          return (
            <button
              key={sub.id}
              onClick={() => setFilterSubClient(sub.id)}
              style={{
                width: '100%', display: 'flex', alignItems: 'center', gap: 8,
                padding: '5px 10px 5px 28px',
                background: isSubActive ? `${company.color}12` : 'transparent',
                border: 'none', cursor: 'pointer', textAlign: 'left', borderRadius: 6, transition: 'background .15s',
              }}
              onMouseEnter={e => { if (!isSubActive) (e.currentTarget as HTMLElement).style.background = 'var(--s1)'; }}
              onMouseLeave={e => { if (!isSubActive) (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
            >
              <div style={{ width: 1, height: 12, background: isSubActive ? company.color : 'var(--b3)', flexShrink: 0 }} />
              <span style={{ fontSize: 11, color: isSubActive ? company.color : 'var(--t3)', fontWeight: isSubActive ? 600 : 400 }}>
                {sub.name}
              </span>
            </button>
          );
        })}
      </div>
    );
  }

  if (sidebarCollapsed) {
    return (
      <aside style={{
        width: 56, minWidth: 56, height: '100vh',
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        background: 'var(--sidebar-bg)',
        borderRight: '1px solid var(--b1)',
        flexShrink: 0, overflow: 'hidden', gap: 4,
      }}>
        {/* Drag region — espaço para os traffic lights do macOS */}
        <div style={{ width: '100%', height: 38, flexShrink: 0, ...dragRegion }} />

        <div style={{
          width: 32, height: 32, borderRadius: 8,
          background: 'linear-gradient(135deg, #356BFF, #64C4FF)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 4px 12px rgba(53,107,255,0.4)', marginBottom: 8,
          ...noDragRegion,
        }}>
          <img src={EvoIcon} alt="Evo" style={{ width: 18, height: 18, objectFit: 'contain', filter: 'invert(1)' }} />
        </div>

        {NAV.map(({ id, label, Icon, beta }) => (
          <div key={id} style={{ position: 'relative' }}>
            <button
              onClick={() => onChangePage(id)}
              title={`${label}${beta ? ' (beta)' : ''}`}
              style={{
                width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center',
                borderRadius: 10, background: currentPage === id ? 'rgba(53,107,255,0.2)' : 'transparent',
                border: 'none', cursor: 'pointer', transition: 'background .15s',
                color: currentPage === id ? '#64C4FF' : 'var(--t3)',
              }}
              onMouseEnter={e => { if (currentPage !== id) (e.currentTarget as HTMLElement).style.background = 'var(--s2)'; }}
              onMouseLeave={e => { if (currentPage !== id) (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
            >
              <Icon size={16} />
            </button>
            {beta && (
              <span style={{ position: 'absolute', top: 2, right: 2, width: 6, height: 6, borderRadius: '50%', background: '#ff9f0a', pointerEvents: 'none' }} />
            )}
          </div>
        ))}

        {/* Notas Rápidas icon */}
        <button
          onClick={() => { toggleSidebar(); setNotesOpen(true); }}
          title="Notas Rápidas"
          style={{
            width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center',
            borderRadius: 10, background: notesOpen ? 'rgba(53,107,255,0.2)' : 'transparent',
            border: 'none', cursor: 'pointer', transition: 'background .15s',
            color: notesOpen ? '#64C4FF' : 'var(--t3)',
          }}
          onMouseEnter={e => { if (!notesOpen) (e.currentTarget as HTMLElement).style.background = 'var(--s2)'; }}
          onMouseLeave={e => { if (!notesOpen) (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
        >
          <FiEdit3 size={16} />
        </button>

        <div style={{ flex: 1 }} />

        <button
          onClick={onAddTask}
          title="Nova Tarefa (N)"
          style={{
            width: 36, height: 36, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'linear-gradient(135deg, #356BFF, #4F8AFF)', border: 'none', cursor: 'pointer', color: '#fff',
            boxShadow: '0 4px 14px rgba(53,107,255,0.35)',
          }}
        >
          <FiPlus size={16} />
        </button>

        {updateStatus !== 'idle' && (
          <button
            onClick={() => { if (updateStatus === 'downloaded') window.electronAPI?.installUpdate(); else window.electronAPI?.checkForUpdates(); }}
            title={updateStatus === 'downloaded' ? 'Instalar atualização' : 'Atualização disponível'}
            style={{
              width: 36, height: 36, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: updateStatus === 'downloaded' ? 'rgba(48,209,88,0.15)' : 'rgba(53,107,255,0.12)',
              border: 'none', cursor: 'pointer',
              color: updateStatus === 'downloaded' ? '#30d158' : '#356BFF',
            }}
          >
            <FiDownload size={14} />
          </button>
        )}

        <button
          onClick={cycleTheme}
          title={`Tema: ${THEME_LABELS[theme]} → próximo`}
          style={{
            width: 36, height: 36, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--t4)',
            transition: 'all .15s',
          }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--s2)'; (e.currentTarget as HTMLElement).style.color = 'var(--t1)'; }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; (e.currentTarget as HTMLElement).style.color = 'var(--t4)'; }}
        >
          {isLightTheme ? <FiMoon size={14} /> : <FiSun size={14} />}
        </button>

        {/* Perfil */}
        <button
          ref={profileBtnRef}
          onClick={openProfile}
          title={user ? user.email ?? 'Perfil' : 'Entrar'}
          style={{
            width: 36, height: 36, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: showProfile ? 'var(--s2)' : 'transparent', border: 'none', cursor: 'pointer',
            color: user ? '#356BFF' : 'var(--t4)', transition: 'all .15s',
          }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--s2)'; }}
          onMouseLeave={e => { if (!showProfile) (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
        >
          <FiUser size={14} />
        </button>

        <button
          onClick={onOpenSettings}
          style={{
            width: 36, height: 36, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--t4)',
            marginBottom: 8, transition: 'all .15s',
          }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--s2)'; (e.currentTarget as HTMLElement).style.color = 'var(--t1)'; }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; (e.currentTarget as HTMLElement).style.color = 'var(--t4)'; }}
        >
          <FiSettings size={14} />
        </button>

        <button
          onClick={toggleSidebar}
          title="Expandir sidebar"
          style={{
            width: 36, height: 36, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--t4)',
            marginBottom: 12, transition: 'all .15s',
          }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = 'var(--t1)'; }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'var(--t4)'; }}
        >
          <FiChevronRight size={14} />
        </button>
      </aside>
    );
  }

  return (
    <>
    <aside
      style={{
        width: 224, minWidth: 224, height: '100vh',
        display: 'flex', flexDirection: 'column',
        background: 'var(--sidebar-bg)',
        borderRight: '1px solid var(--b1)',
        position: 'sticky', top: 0, flexShrink: 0, overflow: 'hidden',
      }}
    >
      {/* Drag region — espaço para os traffic lights do macOS */}
      <div style={{ width: '100%', height: 38, flexShrink: 0, ...dragRegion }} />

      {/* Logo */}
      <div style={{ padding: '4px 18px 16px', flexShrink: 0, ...noDragRegion }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 32, height: 32, borderRadius: 8,
            background: 'linear-gradient(135deg, #356BFF, #64C4FF)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 4px 12px rgba(53,107,255,0.4)', flexShrink: 0,
          }}>
            <img src={EvoIcon} alt="Evo" style={{ width: 18, height: 18, objectFit: 'contain', filter: 'invert(1)' }} />
          </div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--t1)', letterSpacing: '-0.3px', lineHeight: 1 }}>
              Evo<span style={{ fontWeight: 300, opacity: 0.5 }}> Tasks</span>
            </div>
            <div style={{ fontSize: 10, color: 'var(--t4)', marginTop: 2, letterSpacing: '1px', textTransform: 'uppercase' }}>
              Studio
            </div>
          </div>
          <button
            onClick={toggleSidebar}
            title="Recolher sidebar"
            style={{
              marginLeft: 'auto', background: 'transparent', border: 'none', cursor: 'pointer',
              color: 'var(--t4)', padding: 4, borderRadius: 6, transition: 'color .15s',
            }}
            onMouseEnter={e => ((e.currentTarget as HTMLElement).style.color = 'var(--t1)')}
            onMouseLeave={e => ((e.currentTarget as HTMLElement).style.color = 'var(--t4)')}
          >
            <FiChevronLeft size={13} />
          </button>
        </div>
      </div>

      {/* Nova tarefa */}
      <div style={{ padding: '0 12px 16px', flexShrink: 0 }}>
        <button
          onClick={onAddTask}
          title="Nova Tarefa (N)"
          style={{
            width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center',
            gap: 7, padding: '10px 0', borderRadius: 12,
            background: 'linear-gradient(135deg, #356BFF, #4F8AFF)',
            boxShadow: '0 4px 14px rgba(53,107,255,0.35)',
            color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer',
            border: 'none', transition: 'box-shadow .2s, transform .15s',
          }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.boxShadow = '0 6px 20px rgba(53,107,255,0.55)'; (e.currentTarget as HTMLElement).style.transform = 'translateY(-1px)'; }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.boxShadow = '0 4px 14px rgba(53,107,255,0.35)'; (e.currentTarget as HTMLElement).style.transform = 'none'; }}
        >
          <FiPlus size={15} /> Nova Tarefa
        </button>
      </div>

      <div style={{ margin: '0 12px 4px', height: 1, background: 'var(--b1)', flexShrink: 0 }} />

      {/* Navigation */}
      <nav style={{ padding: '8px 8px 0', flexShrink: 0 }}>
        {NAV.map(({ id, label, Icon, beta }) => {
          const active = currentPage === id;
          return (
            <button
              key={id}
              onClick={() => onChangePage(id)}
              style={{
                width: '100%', display: 'flex', alignItems: 'center', gap: 10,
                padding: '9px 12px', borderRadius: 10, marginBottom: 2,
                background: active ? 'rgba(53,107,255,0.18)' : 'transparent',
                border: 'none', cursor: 'pointer', textAlign: 'left',
                transition: 'background .15s',
                borderLeft: active ? '2px solid #356BFF' : '2px solid transparent',
              }}
              onMouseEnter={e => { if (!active) (e.currentTarget as HTMLElement).style.background = 'var(--s2)'; }}
              onMouseLeave={e => { if (!active) (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
            >
              <Icon size={15} style={{ color: active ? '#64C4FF' : 'var(--t3)', flexShrink: 0 }} />
              <span style={{ fontSize: 13, fontWeight: active ? 600 : 400, color: active ? '#356BFF' : 'var(--t2)', flex: 1 }}>
                {label}
              </span>
              {beta && (
                <span style={{ fontSize: 8, fontWeight: 700, letterSpacing: '0.5px', textTransform: 'uppercase', color: '#ff9f0a', background: 'rgba(255,159,10,0.12)', border: '1px solid rgba(255,159,10,0.3)', borderRadius: 4, padding: '1px 5px' }}>
                  beta
                </span>
              )}
            </button>
          );
        })}
      </nav>

      <div style={{ margin: '8px 12px', height: 1, background: 'var(--b1)', flexShrink: 0 }} />

      {/* Empresas tree — status groups */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '4px 8px' }}>

        {/* Notas Rápidas section */}
        <div style={{ marginBottom: 4 }}>
          <button
            onClick={() => setNotesOpen(o => !o)}
            style={{
              width: '100%', display: 'flex', alignItems: 'center', gap: 6,
              padding: '4px 10px', borderRadius: 6, marginBottom: 2,
              background: 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left',
              transition: 'background .15s',
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--s1)'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
          >
            <FiEdit3 size={9} style={{ color: '#64C4FF', flexShrink: 0 }} />
            <span style={{ flex: 1, fontSize: 9, fontWeight: 700, letterSpacing: '1.5px', textTransform: 'uppercase', color: '#64C4FF' }}>
              Notas Rápidas
            </span>
            {quickNotes.length > 0 && (
              <span style={{ fontSize: 9, color: 'var(--t4)', marginRight: 4 }}>{quickNotes.length}</span>
            )}
            {notesOpen
              ? <FiChevronDown size={10} style={{ color: 'var(--t4)', flexShrink: 0 }} />
              : <FiChevronRight size={10} style={{ color: 'var(--t4)', flexShrink: 0 }} />
            }
          </button>

          {notesOpen && (
            <div style={{ padding: '0 4px 6px' }}>
              {/* Add input */}
              <div style={{ display: 'flex', gap: 4, marginBottom: 4 }}>
                <input
                  value={notesInput}
                  onChange={e => setNotesInput(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') handleAddNote(); }}
                  placeholder="Nova nota..."
                  style={{
                    flex: 1, padding: '5px 8px', borderRadius: 6,
                    border: '1px solid var(--b2)',
                    background: 'var(--ib)', color: 'var(--t1)',
                    fontSize: 11, outline: 'none',
                  }}
                />
                <button
                  onClick={handleAddNote}
                  disabled={!notesInput.trim()}
                  style={{
                    width: 24, height: 24, borderRadius: 6, flexShrink: 0,
                    background: notesInput.trim() ? '#356BFF' : 'var(--s2)',
                    border: 'none', cursor: notesInput.trim() ? 'pointer' : 'default',
                    color: notesInput.trim() ? '#fff' : 'var(--t4)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    transition: 'all .15s',
                  }}
                >
                  <FiPlus size={12} />
                </button>
              </div>

              {quickNotes.length === 0 ? (
                <div style={{ fontSize: 11, color: 'var(--t4)', textAlign: 'center', padding: '6px 0' }}>
                  Nenhuma nota
                </div>
              ) : (
                <DndContext sensors={notesSensors} collisionDetection={closestCenter} onDragEnd={handleNotesDragEnd}>
                  <SortableContext items={quickNotes.map(n => n.id)} strategy={verticalListSortingStrategy}>
                    {quickNotes.map(note => (
                      <SidebarNoteRow
                        key={note.id}
                        id={note.id}
                        text={note.text}
                        checked={note.checked}
                        onToggle={() => { toggleQuickNote(note.id); playCheck(); }}
                        onDelete={() => { deleteQuickNote(note.id); playDelete(); }}
                      />
                    ))}
                  </SortableContext>
                </DndContext>
              )}
            </div>
          )}
        </div>

        <div style={{ margin: '0 4px 8px', height: 1, background: 'var(--b1)' }} />

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 10px', marginBottom: 6 }}>
          <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase', color: 'var(--t4)' }}>
            Clientes
          </div>
          <button
            onClick={allSelected ? deselectAllCompanies : selectAllCompanies}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              fontSize: 9, fontWeight: 600, letterSpacing: '1px', textTransform: 'uppercase',
              color: 'var(--t4)', transition: 'color .15s', padding: '2px 4px',
            }}
            onMouseEnter={e => ((e.currentTarget as HTMLElement).style.color = '#64C4FF')}
            onMouseLeave={e => ((e.currentTarget as HTMLElement).style.color = 'var(--t4)')}
          >
            {allSelected ? 'Nenhum' : 'Todos'}
          </button>
        </div>

        {(['ativo', 'pausado', 'inativo'] as CompanyStatus[]).map(status => {
          const groupList = groupedCompanies[status];
          if (groupList.length === 0) return null;
          const isGroupOpen = groupExpanded[status];

          return (
            <div key={status} style={{ marginBottom: 4 }}>
              {/* Group header */}
              <button
                onClick={() => setGroupExpanded(p => ({ ...p, [status]: !p[status] }))}
                style={{
                  width: '100%', display: 'flex', alignItems: 'center', gap: 6,
                  padding: '4px 10px', borderRadius: 6, marginBottom: 2,
                  background: 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left',
                  transition: 'background .15s',
                }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--s1)'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
              >
                <div style={{ width: 6, height: 6, borderRadius: '50%', background: STATUS_GROUP_COLORS[status], flexShrink: 0 }} />
                <span style={{ flex: 1, fontSize: 9, fontWeight: 700, letterSpacing: '1.5px', textTransform: 'uppercase', color: STATUS_GROUP_COLORS[status] }}>
                  {STATUS_GROUP_LABELS[status]}
                </span>
                <span style={{ fontSize: 9, color: 'var(--t4)', marginRight: 4 }}>{groupList.length}</span>
                {isGroupOpen
                  ? <FiChevronDown size={10} style={{ color: 'var(--t4)', flexShrink: 0 }} />
                  : <FiChevronRight size={10} style={{ color: 'var(--t4)', flexShrink: 0 }} />
                }
              </button>

              {/* Company rows */}
              {isGroupOpen && groupList.map(company => renderCompanyRow(company, groupList))}
            </div>
          );
        })}
      </div>

      {/* Bottom: settings */}
      <div style={{ padding: '8px 8px 16px', flexShrink: 0 }}>
        <div style={{ margin: '0 4px 8px', height: 1, background: 'var(--b1)' }} />

        {updateStatus !== 'idle' && (
          <>
            <button
              onClick={() => {
                if (updateStatus === 'downloaded') {
                  window.electronAPI?.installUpdate();
                } else if (updateStatus === 'error') {
                  window.electronAPI?.openReleasesPage?.();
                } else {
                  window.electronAPI?.checkForUpdates();
                }
              }}
              style={{
                width: '100%', display: 'flex', alignItems: 'center', gap: 9,
                padding: '8px 12px', borderRadius: 10, marginBottom: 4,
                background: updateStatus === 'error' ? 'rgba(255,69,58,0.12)' : updateStatus === 'downloaded' ? 'rgba(48,209,88,0.15)' : 'rgba(53,107,255,0.12)',
                border: 'none', cursor: 'pointer',
                color: updateStatus === 'error' ? '#ff453a' : updateStatus === 'downloaded' ? '#30d158' : '#356BFF',
                fontSize: 12, fontWeight: 600, transition: 'opacity .15s',
              }}
              onMouseEnter={e => ((e.currentTarget as HTMLElement).style.opacity = '0.8')}
              onMouseLeave={e => ((e.currentTarget as HTMLElement).style.opacity = '1')}
            >
              <FiDownload size={13} />
              {updateStatus === 'error' ? 'Baixar atualização' : updateStatus === 'downloaded' ? 'Instalar atualização' : 'Atualização disponível'}
            </button>
          </>
        )}

        <button
          onClick={cycleTheme}
          title={`Tema atual: ${THEME_LABELS[theme]}`}
          style={{
            width: '100%', display: 'flex', alignItems: 'center', gap: 9,
            padding: '8px 12px', borderRadius: 10, background: 'transparent',
            border: 'none', cursor: 'pointer', color: 'var(--t3)',
            fontSize: 12, transition: 'all .15s',
          }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--s2)'; (e.currentTarget as HTMLElement).style.color = 'var(--t1)'; }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; (e.currentTarget as HTMLElement).style.color = 'var(--t3)'; }}
        >
          {isLightTheme ? <FiMoon size={13} /> : <FiSun size={13} />}
          {THEME_LABELS[theme]}
        </button>

        {/* Perfil */}
        <button
          ref={profileBtnRef}
          onClick={openProfile}
          style={{
            width: '100%', display: 'flex', alignItems: 'center', gap: 9,
            padding: '8px 12px', borderRadius: 10,
            background: showProfile ? 'var(--s2)' : 'transparent',
            border: 'none', cursor: 'pointer',
            color: user ? '#356BFF' : 'var(--t3)',
            fontSize: 12, transition: 'all .15s',
          }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--s2)'; }}
          onMouseLeave={e => { if (!showProfile) (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
        >
          <FiUser size={13} />
          <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', textAlign: 'left' }}>
            {user ? (user.email ?? 'Perfil') : 'Entrar'}
          </span>
        </button>

        <button
          onClick={onOpenSettings}
          style={{
            width: '100%', display: 'flex', alignItems: 'center', gap: 9,
            padding: '8px 12px', borderRadius: 10, background: 'transparent',
            border: 'none', cursor: 'pointer', color: 'var(--t3)',
            fontSize: 12, transition: 'all .15s',
          }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--s2)'; (e.currentTarget as HTMLElement).style.color = 'var(--t1)'; }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; (e.currentTarget as HTMLElement).style.color = 'var(--t3)'; }}
        >
          <FiSettings size={13} /> Configurações
        </button>

        {/* Versão + sync indicator */}
        <div style={{ padding: '6px 12px 2px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
          <span style={{ fontSize: 10, color: 'var(--t4)', letterSpacing: '0.5px' }}>
            v{__APP_VERSION__}
          </span>
          {/* Sync dot */}
          <div
            title={syncDotTitle}
            className={syncStatus === 'syncing' ? 'sync-pulse' : ''}
            style={{
              width: 6, height: 6, borderRadius: '50%',
              background: syncDotColor,
              flexShrink: 0,
            }}
          />
        </div>
      </div>
    </aside>

    {/* Popover de perfil (position: fixed, fora da sidebar) */}
    {showProfile && profilePos && (
      <div
        onMouseDown={e => e.stopPropagation()}
        style={{
          position: 'fixed', left: profilePos.left, bottom: profilePos.bottom,
          width: 220, background: 'var(--modal-bg)', border: '1px solid var(--b2)',
          borderRadius: 14, boxShadow: '0 12px 40px rgba(0,0,0,0.3)',
          zIndex: 9999, overflow: 'hidden',
        }}
      >
        {profileView === 'menu' ? (
          <>
            {user ? (
              <>
                {/* Email */}
                <div style={{ padding: '12px 14px 8px', borderBottom: '1px solid var(--b1)' }}>
                  <div style={{ fontSize: 10, color: 'var(--t4)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 3 }}>Conta</div>
                  <div style={{ fontSize: 12, color: 'var(--t2)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {user.email}
                  </div>
                </div>
                {/* Trocar senha */}
                <button
                  onClick={() => setProfileView('password')}
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
                {/* Sair */}
                <button
                  onClick={() => { signOut(); setShowProfile(false); }}
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
                onClick={() => { setShowProfile(false); onLogin(); }}
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
          /* Trocar senha form */
          <form onSubmit={handleChangePassword} style={{ padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--t1)' }}>Nova senha</span>
              <button
                type="button"
                onClick={() => setProfileView('menu')}
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
            {pwdMsg && (
              <div style={{ fontSize: 11, color: pwdMsg.ok ? '#30d158' : '#ff453a', display: 'flex', alignItems: 'center', gap: 5 }}>
                {pwdMsg.ok ? <FiCheck size={11} /> : null} {pwdMsg.text}
              </div>
            )}
            <button
              type="submit"
              disabled={pwdLoading}
              style={{
                padding: '8px', borderRadius: 8, border: 'none',
                background: '#356BFF', color: '#fff', fontSize: 12, fontWeight: 600,
                cursor: pwdLoading ? 'not-allowed' : 'pointer', opacity: pwdLoading ? 0.6 : 1,
              }}
            >
              {pwdLoading ? 'Salvando...' : 'Salvar senha'}
            </button>
          </form>
        )}
      </div>
    )}

    {/* Status menu popup */}
    {statusMenuCompanyId && statusMenuPos && (
      <div
        ref={statusMenuRef}
        style={{
          position: 'fixed',
          left: statusMenuPos.x,
          top: statusMenuPos.y,
          background: 'var(--modal-bg)',
          border: '1px solid var(--b2)',
          borderRadius: 10,
          boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
          zIndex: 9999,
          overflow: 'hidden',
          minWidth: 130,
        }}
      >
        <div style={{ padding: '6px 10px 4px', fontSize: 9, fontWeight: 700, letterSpacing: '1.5px', textTransform: 'uppercase', color: 'var(--t4)' }}>
          Status
        </div>
        {(['ativo', 'pausado', 'inativo'] as CompanyStatus[]).map(s => {
          const company = companies.find(c => c.id === statusMenuCompanyId);
          const current = company ? getCompanyStatus(company) : 'ativo';
          return (
            <button
              key={s}
              onClick={() => {
                updateCompany(statusMenuCompanyId, { status: s });
                setStatusMenuCompanyId(null);
              }}
              style={{
                width: '100%', display: 'flex', alignItems: 'center', gap: 8,
                padding: '8px 12px', background: current === s ? 'var(--s2)' : 'transparent',
                border: 'none', cursor: 'pointer', fontSize: 12,
                color: current === s ? 'var(--t1)' : 'var(--t2)',
                transition: 'background .15s',
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--s2)'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = current === s ? 'var(--s2)' : 'transparent'; }}
            >
              <div style={{ width: 7, height: 7, borderRadius: '50%', background: STATUS_PILL_COLORS[s], flexShrink: 0 }} />
              {s.charAt(0).toUpperCase() + s.slice(1)}
              {current === s && <FiCheck size={10} style={{ marginLeft: 'auto', color: '#64C4FF' }} />}
            </button>
          );
        })}
      </div>
    )}
    </>
  );
}
