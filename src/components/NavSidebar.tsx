import { useState, useEffect, useRef, Fragment, useCallback } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  FiHome, FiCalendar, FiBriefcase, FiSettings,
  FiChevronDown, FiChevronRight, FiChevronLeft,
  FiEye, FiEyeOff, FiArchive, FiDownload, FiSun, FiMoon,
  FiUser, FiTrendingUp, FiList, FiLock, FiDollarSign, FiZap, FiFileText, FiInbox,
  FiCheckCircle, FiGrid, FiClipboard, FiMessageSquare, FiLayers, FiCopy, FiBarChart2, FiRepeat,
} from 'react-icons/fi';
import { useTaskStore } from '../store/tasks';
import { useAuthStore } from '../store/auth';
import type { PageType, Theme, Company } from '../types';
import EvoIcon from '../assets/images/Logos/Icons/Icone/4.svg';
import { WorkspaceSwitcher } from './WorkspaceSwitcher';
import { useVisibleWorkspaceIds, isInLens, useWorkspacesStore, getEnabledPages } from '../store/workspaces';

interface Props {
  currentPage: PageType;
  onChangePage: (p: PageType) => void;
  onAddTask: () => void;
  onOpenSettings: () => void;
  onLogin: () => void;
  onLock: () => void;
  onNavigateToCompany: (companyId: string) => void;
  onOpenAccount: () => void;
  onOpenWorkspaceManager: (editingId?: string) => void;
}

const NAV_ITEMS: { id: PageType; label: string; Icon: React.ElementType; beta?: boolean }[] = [
  { id: 'home',       label: 'Home',          Icon: FiHome },
  { id: 'inbox',      label: 'Inbox',         Icon: FiInbox },
  { id: 'tarefas',    label: 'Calendário',    Icon: FiCalendar },
  { id: 'empresas',   label: 'Empresas',      Icon: FiBriefcase },
  { id: 'crm',        label: 'CRM',           Icon: FiTrendingUp, beta: true },
  { id: 'propostas',  label: 'Propostas',     Icon: FiFileText },
  { id: 'aprovacoes', label: 'Aprovações',    Icon: FiCheckCircle },
  { id: 'editorial',  label: 'Editorial',     Icon: FiGrid },
  { id: 'briefings',  label: 'Briefings',     Icon: FiMessageSquare },
  { id: 'onboarding', label: 'Onboarding',    Icon: FiLayers },
  { id: 'todo',       label: 'To Do',         Icon: FiList },
  { id: 'ideias',     label: 'Ideias',        Icon: FiZap },
  { id: 'snippets',   label: 'Snippets',      Icon: FiCopy },
  { id: 'habitos',    label: 'Hábitos',       Icon: FiRepeat },
  { id: 'financas',   label: 'Finanças',      Icon: FiDollarSign },
  { id: 'faturas',    label: 'Faturas',       Icon: FiClipboard },
  { id: 'kpis',       label: 'KPIs',          Icon: FiBarChart2 },
];

const NAV_GROUPS: { label: string; items: PageType[] }[] = [
  { label: 'Principais', items: ['home', 'inbox', 'tarefas'] },
  { label: 'Negócio',    items: ['empresas', 'crm', 'propostas'] },
  { label: 'Agência',    items: ['aprovacoes', 'editorial', 'briefings', 'onboarding'] },
  { label: 'Ferramentas',items: ['todo', 'ideias', 'snippets', 'habitos'] },
  { label: 'Gestão',     items: ['financas', 'faturas', 'kpis'] },
];

const THEMES: Theme[] = ['dark-blue', 'light-soft'];
const THEME_LABELS: Record<Theme, string> = { 'dark-blue': 'Escuro', 'light-soft': 'Claro' };

const dragRegion: React.CSSProperties = { WebkitAppRegion: 'drag' } as React.CSSProperties;
const noDragRegion: React.CSSProperties = { WebkitAppRegion: 'no-drag' } as React.CSSProperties;

type CompanyStatus = 'ativo' | 'pausado' | 'inativo';
const STATUS_GROUP_LABELS: Record<CompanyStatus, string> = { ativo: 'Ativos', pausado: 'Pausados', inativo: 'Inativos' };
const STATUS_GROUP_COLORS: Record<CompanyStatus, string> = { ativo: '#30d158', pausado: '#ff9f0a', inativo: 'var(--t4)' };

function getCompanyStatus(c: Company): CompanyStatus { return c.status ?? 'ativo'; }

function navHexToRgb(hex: string): string {
  const v = hex.replace('#', '');
  const c = v.length === 3 ? v.split('').map((x) => x + x).join('') : v;
  return `${parseInt(c.slice(0, 2), 16)},${parseInt(c.slice(2, 4), 16)},${parseInt(c.slice(4, 6), 16)}`;
}

function NavItem({ item, active, accentColor, onClick, onChevronClick, showChevron, expanded }: {
  item: typeof NAV_ITEMS[0];
  active: boolean;
  accentColor: string;
  onClick: () => void;
  onChevronClick?: (e: React.MouseEvent) => void;
  showChevron?: boolean;
  expanded?: boolean;
}) {
  const rgb = navHexToRgb(accentColor);
  return (
    <div
      style={{
        position: 'relative',
        width: '100%', display: 'flex', alignItems: 'center', gap: 0,
        borderRadius: 10, marginBottom: 2,
        background: active ? `rgba(${rgb}, 0.16)` : 'transparent',
        border: `1px solid ${active ? `rgba(${rgb}, 0.28)` : 'transparent'}`,
        boxShadow: active ? `0 0 16px -4px rgba(${rgb}, 0.35)` : 'none',
        transition: 'background .15s, border-color .15s, box-shadow .15s',
      }}
      onMouseEnter={e => { if (!active) (e.currentTarget as HTMLElement).style.background = 'var(--s2)'; }}
      onMouseLeave={e => { if (!active) (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
    >
      {active && (
        <span style={{
          position: 'absolute', left: 0, top: '50%', transform: 'translateY(-50%)',
          width: 3, height: 18, borderRadius: 2,
          background: accentColor,
          boxShadow: `0 0 10px rgba(${rgb}, 0.9), 0 0 22px rgba(${rgb}, 0.4)`,
        }} />
      )}
      <div style={{ padding: '9px 0 9px 12px', display: 'flex', alignItems: 'center', flexShrink: 0 }}>
        <item.Icon size={15} style={{
          color: active ? accentColor : 'var(--t3)',
          flexShrink: 0,
          filter: active ? `drop-shadow(0 0 4px rgba(${rgb}, 0.6))` : 'none',
        }} />
      </div>
      <button
        onClick={onClick}
        style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 8, padding: '9px 8px', background: 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left' }}
      >
        <span style={{ fontSize: 13, fontWeight: active ? 700 : 500, color: active ? 'var(--t1)' : 'var(--t2)', flex: 1 }}>
          {item.label}
        </span>
        {item.beta && (
          <span style={{ fontSize: 8, fontWeight: 700, letterSpacing: '0.5px', textTransform: 'uppercase', color: '#ff9f0a', background: 'rgba(255,159,10,0.14)', border: '1px solid rgba(255,159,10,0.28)', borderRadius: 4, padding: '1px 5px' }}>
            beta
          </span>
        )}
      </button>
      {showChevron && (
        <button
          onClick={onChevronClick}
          style={{ padding: '9px 12px 9px 4px', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--t4)', display: 'flex', alignItems: 'center', transition: 'color .15s' }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = 'var(--t1)'; }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'var(--t4)'; }}
        >
          {expanded ? <FiChevronDown size={11} /> : <FiChevronRight size={11} />}
        </button>
      )}
    </div>
  );
}

export function NavSidebar({ currentPage, onChangePage, onAddTask: _onAddTask, onOpenSettings, onLogin: _onLogin, onLock, onNavigateToCompany, onOpenAccount, onOpenWorkspaceManager }: Props) {
  const {
    companies, subClients, tasks,
    selectedCompanies, toggleCompany, selectAllCompanies, deselectAllCompanies,
    filterSubClient, setFilterSubClient,
    sidebarCollapsed, toggleSidebar,
    theme, setTheme,
    syncStatus,
    lastSyncAt,
    sidebarWidth, setSidebarWidth,
    accentColor,
  } = useTaskStore();
  const accentRgb = navHexToRgb(accentColor);

  const { workspaces, activeWorkspaceId } = useWorkspacesStore(
    s => ({ workspaces: s.workspaces, activeWorkspaceId: s.activeWorkspaceId })
  );
  const activeWorkspace = workspaces.find(w => w.id === activeWorkspaceId);
  const enabledPages = activeWorkspace ? getEnabledPages(activeWorkspace) : null;

  const { user } = useAuthStore();

  const isLightTheme = theme !== 'dark-blue';
  const cycleTheme = () => { const idx = THEMES.indexOf(theme); setTheme(THEMES[(idx + 1) % THEMES.length]); };


  // Empresas clients toggle
  const [empresasOpen, setEmpresasOpen] = useState(false);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [groupExpanded, setGroupExpanded] = useState<Record<CompanyStatus, boolean>>({ ativo: false, pausado: false, inativo: false });

  useEffect(() => {
    if (!empresasOpen) setGroupExpanded({ ativo: false, pausado: false, inativo: false });
  }, [empresasOpen]);
  const [updateStatus, setUpdateStatus] = useState<'idle' | 'available' | 'downloaded' | 'error'>('idle');
  const [statusMenuCompanyId, setStatusMenuCompanyId] = useState<string | null>(null);
  const [, setStatusMenuPos] = useState<{ x: number; y: number } | null>(null);
  const statusMenuRef = useRef<HTMLDivElement | null>(null);
  void statusMenuRef; void setStatusMenuPos;

  useEffect(() => {
    window.electronAPI?.onUpdateAvailable(() => setUpdateStatus('available'));
    window.electronAPI?.onUpdateDownloaded(() => setUpdateStatus('downloaded'));
    window.electronAPI?.onUpdateError?.(() => setUpdateStatus('error'));
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
    tasks.filter(t => !t.deletedAt && t.companyId === companyId && t.status !== 'done' && !t.archived && isInLens(t, visibleIds)).length;

  // Group companies by status (excluindo deletadas / na lixeira) + filtrando pela lente
  const visibleIds = useVisibleWorkspaceIds();
  const activeCompanies = companies.filter(c => !c.deletedAt && isInLens(c, visibleIds));

  const allSelected = selectedCompanies.length === activeCompanies.length;

  const openStatusMenu = (e: React.MouseEvent, companyId: string) => {
    e.stopPropagation();
    if (statusMenuCompanyId === companyId) { setStatusMenuCompanyId(null); return; }
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    setStatusMenuPos({ x: rect.right + 6, y: rect.top });
    setStatusMenuCompanyId(companyId);
  };
  void openStatusMenu;

  const groupedCompanies: Record<CompanyStatus, Company[]> = {
    ativo: activeCompanies.filter(c => getCompanyStatus(c) === 'ativo'),
    pausado: activeCompanies.filter(c => getCompanyStatus(c) === 'pausado'),
    inativo: activeCompanies.filter(c => getCompanyStatus(c) === 'inativo'),
  };

  const syncDotColor = syncStatus === 'syncing' ? '#30d158' : syncStatus === 'error' ? '#ff453a' : 'var(--b3)';
  const syncDotTitle = syncStatus === 'syncing' ? 'Sincronizando...' : syncStatus === 'error' ? 'Erro' : 'Sincronizado';

  // Last sync label (#55) — re-computed on a 30s interval
  const getSyncLabel = useCallback(() => {
    if (syncStatus === 'syncing') return 'Sync...';
    if (!lastSyncAt) return null;
    const diffMs = Date.now() - new Date(lastSyncAt).getTime();
    if (diffMs < 60_000) return 'Sync agora';
    return `Sync ${formatDistanceToNow(new Date(lastSyncAt), { locale: ptBR, addSuffix: false })} atrás`;
  }, [syncStatus, lastSyncAt]);

  const [syncLabel, setSyncLabel] = useState<string | null>(getSyncLabel);
  useEffect(() => {
    setSyncLabel(getSyncLabel());
    const timer = setInterval(() => setSyncLabel(getSyncLabel()), 30_000);
    return () => clearInterval(timer);
  }, [getSyncLabel]);

  function renderCompanyRow(company: Company, groupList: Company[]) {
    const subs = subClients.filter(s => !s.deletedAt && s.companyId === company.id);
    const open = expanded[company.id];
    const pending = countFor(company.id);
    const isActive = selectedCompanies.includes(company.id);

    const companyTasks = tasks.filter(t => !t.deletedAt && t.companyId === company.id && !t.archived && !t.inbox);
    const doneTasks = companyTasks.filter(t => t.status === 'done').length;
    const totalTasks = companyTasks.length;
    const pct = totalTasks > 0 ? (doneTasks / totalTasks) * 100 : 0;
    const companyIdx = companies.findIndex(c => c.id === company.id);
    const groupIdx = groupList.findIndex(c => c.id === company.id);
    void pct; void companyIdx; void groupIdx;

    return (
      <div key={company.id}>
        <div
          style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 6, padding: '6px 10px', borderRadius: 8, marginBottom: 1, transition: 'background .15s', opacity: isActive ? 1 : 0.45 }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--s1)'; }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
        >
          {/* Eye toggle — always visible, left side */}
          <button
            onClick={e => { e.stopPropagation(); toggleCompany(company.id); }}
            title={isActive ? 'Ocultar' : 'Mostrar'}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: isActive ? 'var(--t3)' : accentColor, padding: 2, display: 'flex', flexShrink: 0, transition: 'color .15s' }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = isActive ? 'var(--t1)' : accentColor; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = isActive ? 'var(--t3)' : accentColor; }}
          >
            {isActive ? <FiEye size={11} /> : <FiEyeOff size={11} />}
          </button>
          {/* Color dot */}
          <div
            style={{ width: 10, height: 10, borderRadius: '50%', background: company.color, flexShrink: 0, boxShadow: isActive ? `0 0 6px ${company.color}88` : 'none', transition: 'box-shadow .15s' }}
          />
          {/* Name — click navigates to Empresas */}
          <button
            onClick={() => onNavigateToCompany(company.id)}
            style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 6, background: 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left', padding: 0, minWidth: 0 }}
          >
            <span style={{ flex: 1, fontSize: 12, fontWeight: 500, color: 'var(--t1)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {company.name}
            </span>
            {pending > 0 && (
              <span style={{ fontSize: 10, fontWeight: 700, color: company.color, background: `${company.color}22`, borderRadius: 99, padding: '1px 6px', minWidth: 18, textAlign: 'center', flexShrink: 0 }}>
                {pending}
              </span>
            )}
          </button>
          {/* Chevron — expands subclients in sidebar */}
          {subs.length > 0 && (
            <button
              onClick={e => { e.stopPropagation(); toggleExpand(company.id); }}
              style={{ background: 'transparent', border: 'none', cursor: 'pointer', padding: '2px 4px', color: 'var(--t4)', display: 'flex', flexShrink: 0, borderRadius: 4, transition: 'color .15s' }}
              onMouseEnter={e => ((e.currentTarget as HTMLElement).style.color = 'var(--t2)')}
              onMouseLeave={e => ((e.currentTarget as HTMLElement).style.color = 'var(--t4)')}
            >
              {open ? <FiChevronDown size={11} /> : <FiChevronRight size={11} />}
            </button>
          )}
        </div>

        {open && subs.map(sub => {
          const isSubActive = filterSubClient === sub.id;
          return (
            <button key={sub.id} onClick={() => setFilterSubClient(sub.id)}
              style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 8, padding: '5px 10px 5px 28px', background: isSubActive ? `${company.color}12` : 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left', borderRadius: 6, transition: 'background .15s' }}
              onMouseEnter={e => { if (!isSubActive) (e.currentTarget as HTMLElement).style.background = 'var(--s1)'; }}
              onMouseLeave={e => { if (!isSubActive) (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
            >
              <div style={{ width: 1, height: 12, background: isSubActive ? company.color : 'var(--b3)', flexShrink: 0 }} />
              <span style={{ fontSize: 11, color: isSubActive ? company.color : 'var(--t3)', fontWeight: isSubActive ? 600 : 400 }}>{sub.name}</span>
            </button>
          );
        })}
      </div>
    );
  }

  // ── Drag-to-resize (only when expanded) ──────────────────────────────────
  const isDraggingRef = useRef(false);
  const handleResizeMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    isDraggingRef.current = true;
    const startX = e.clientX;
    const startWidth = sidebarWidth;
    const onMove = (ev: MouseEvent) => {
      if (!isDraggingRef.current) return;
      setSidebarWidth(startWidth + (ev.clientX - startX));
    };
    const onUp = () => {
      isDraggingRef.current = false;
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  };

  const w = sidebarCollapsed ? 56 : sidebarWidth;
  const shadow = isLightTheme
    ? 'inset 0 0 0 1px rgba(0,0,0,0.08), 0 8px 32px rgba(0,0,0,0.10)'
    : 'inset 0 0 0 1px rgba(255,255,255,0.10), 0 8px 32px rgba(0,0,0,0.30)';

  // Single <aside> — never remounts, so the GPU compositor layer is preserved.
  // Width animates via CSS transition; content switches inside the same element.
  return (
    <aside
      className="glass-panel"
      style={{
        width: w, minWidth: w,
        display: 'flex', flexDirection: 'column',
        alignItems: sidebarCollapsed ? 'center' : 'stretch',
        background: 'var(--sidebar-bg)', borderRadius: 16,
        flexShrink: 0, overflow: 'hidden', zIndex: 1, position: 'relative',
        boxShadow: shadow,
        transition: 'width 0.18s ease, min-width 0.18s ease',
      }}
    >
      <div style={{ width: '100%', height: 38, flexShrink: 0, ...dragRegion }} />

      {sidebarCollapsed ? (
        /* ── Collapsed content ── */
        <>
          <div style={{ width: 32, height: 32, borderRadius: 8, background: `linear-gradient(135deg, ${accentColor}, ${accentColor}aa)`, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: `0 4px 12px rgba(${accentRgb}, 0.45), 0 0 16px rgba(${accentRgb}, 0.25)`, marginBottom: 8, ...noDragRegion }}>
            <img src={EvoIcon} alt="Evo" style={{ width: 18, height: 18, objectFit: 'contain', filter: 'invert(1)' }} />
          </div>

          {NAV_ITEMS.filter(({ id }) => !enabledPages || enabledPages.includes(id)).map(({ id, label, Icon, beta }) => {
            const active = currentPage === id;
            return (
              <div key={id} style={{ position: 'relative' }}>
                <button onClick={() => onChangePage(id)} title={label}
                  style={{
                    width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 10,
                    background: active ? `rgba(${accentRgb}, 0.18)` : 'transparent',
                    border: `1px solid ${active ? `rgba(${accentRgb}, 0.32)` : 'transparent'}`,
                    cursor: 'pointer',
                    color: active ? accentColor : 'var(--t3)',
                    boxShadow: active ? `0 0 12px -2px rgba(${accentRgb}, 0.45)` : 'none',
                    transition: 'all .15s',
                  }}
                  onMouseEnter={e => { if (!active) (e.currentTarget as HTMLElement).style.background = 'var(--s2)'; }}
                  onMouseLeave={e => { if (!active) (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
                ><Icon size={16} style={{ filter: active ? `drop-shadow(0 0 4px rgba(${accentRgb}, 0.6))` : 'none' }} /></button>
                {beta && <span style={{ position: 'absolute', top: 2, right: 2, width: 6, height: 6, borderRadius: '50%', background: '#ff9f0a', boxShadow: '0 0 6px rgba(255,159,10,0.8)', pointerEvents: 'none' }} />}
              </div>
            );
          })}

          <div style={{ flex: 1 }} />

          {updateStatus !== 'idle' && (
            <button onClick={() => { if (updateStatus === 'downloaded') window.electronAPI?.installUpdate(); else window.electronAPI?.checkForUpdates(); }}
              title={updateStatus === 'downloaded' ? 'Instalar atualização' : 'Atualização disponível'}
              style={{ width: 36, height: 36, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', background: updateStatus === 'downloaded' ? 'rgba(48,209,88,0.15)' : `rgba(${accentRgb}, 0.12)`, border: 'none', cursor: 'pointer', color: updateStatus === 'downloaded' ? '#30d158' : accentColor }}>
              <FiDownload size={14} />
            </button>
          )}

          <button onClick={() => onChangePage('arquivo')} title="Arquivo" style={{ width: 36, height: 36, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', background: currentPage === 'arquivo' ? `rgba(${accentRgb}, 0.2)` : 'transparent', border: 'none', cursor: 'pointer', color: currentPage === 'arquivo' ? accentColor : 'var(--t4)', transition: 'all .15s' }} onMouseEnter={e => { if (currentPage !== 'arquivo') { (e.currentTarget as HTMLElement).style.background = 'var(--s2)'; (e.currentTarget as HTMLElement).style.color = 'var(--t2)'; } }} onMouseLeave={e => { if (currentPage !== 'arquivo') { (e.currentTarget as HTMLElement).style.background = 'transparent'; (e.currentTarget as HTMLElement).style.color = 'var(--t4)'; } }}><FiArchive size={14} /></button>
          <button onClick={cycleTheme} title={`Tema: ${THEME_LABELS[theme]}`} style={{ width: 36, height: 36, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--t4)', transition: 'all .15s' }} onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = `rgba(${accentRgb}, 0.1)`; (e.currentTarget as HTMLElement).style.color = accentColor; }} onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; (e.currentTarget as HTMLElement).style.color = 'var(--t4)'; }}>{isLightTheme ? <FiMoon size={14} /> : <FiSun size={14} />}</button>
          <button onClick={onLock} title="Bloquear" style={{ width: 36, height: 36, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--t4)', transition: 'all .15s' }} onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = accentColor; (e.currentTarget as HTMLElement).style.background = `rgba(${accentRgb}, 0.1)`; }} onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'var(--t4)'; (e.currentTarget as HTMLElement).style.background = 'transparent'; }}><FiLock size={14} /></button>
          <button onClick={onOpenAccount} title={user ? (user.email ?? 'Perfil') : 'Entrar'} style={{ width: 36, height: 36, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'transparent', border: 'none', cursor: 'pointer', color: user ? accentColor : 'var(--t4)', transition: 'all .15s' }} onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--s2)'; }} onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}><FiUser size={14} /></button>
          <button onClick={onOpenSettings} title="Configurações" style={{ width: 36, height: 36, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--t4)', marginBottom: 8, transition: 'all .15s' }} onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = `rgba(${accentRgb}, 0.1)`; (e.currentTarget as HTMLElement).style.color = accentColor; }} onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; (e.currentTarget as HTMLElement).style.color = 'var(--t4)'; }}><FiSettings size={14} /></button>
          <button onClick={toggleSidebar} title="Expandir" style={{ width: 36, height: 36, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--t4)', marginBottom: 12, transition: 'all .15s' }} onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = 'var(--t1)'; }} onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'var(--t4)'; }}><FiChevronRight size={14} /></button>
        </>
      ) : (
        /* ── Expanded content ── */
        <>
          {/* Logo */}
          <div style={{ padding: '4px 18px 16px', flexShrink: 0, ...noDragRegion }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 32, height: 32, borderRadius: 8, background: `linear-gradient(135deg, ${accentColor}, ${accentColor}aa)`, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: `0 4px 12px rgba(${accentRgb}, 0.45), 0 0 16px rgba(${accentRgb}, 0.25)`, flexShrink: 0 }}>
                <img src={EvoIcon} alt="Evo" style={{ width: 18, height: 18, objectFit: 'contain', filter: 'invert(1)' }} />
              </div>
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--t1)', letterSpacing: '-0.3px', lineHeight: 1 }}>Evo<span style={{ fontWeight: 300, opacity: 0.5 }}> Tasks</span></div>
                <div style={{ fontSize: 10, color: 'var(--t4)', marginTop: 2, letterSpacing: '1px', textTransform: 'uppercase' }}>Studio</div>
              </div>
              <button onClick={toggleSidebar} title="Recolher" style={{ marginLeft: 'auto', background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--t4)', padding: 4, borderRadius: 6, transition: 'color .15s' }} onMouseEnter={e => ((e.currentTarget as HTMLElement).style.color = 'var(--t1)')} onMouseLeave={e => ((e.currentTarget as HTMLElement).style.color = 'var(--t4)')}><FiChevronLeft size={13} /></button>
            </div>
          </div>

          {/* Workspace switcher (Onda 4) */}
          <WorkspaceSwitcher onOpenManager={onOpenWorkspaceManager} />

          {/* Navigation — grouped sections */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '4px 8px 0' }}>
            {NAV_GROUPS.map((group, gi) => {
              const visibleItems = enabledPages
                ? group.items.filter(id => enabledPages.includes(id))
                : group.items;
              if (visibleItems.length === 0) return null;
              return (
              <div key={group.label} style={{ marginBottom: 4 }}>
                {/* Section label */}
                <div style={{ padding: '8px 12px 3px', fontSize: 8, fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase', color: 'var(--t4)', opacity: 0.55 }}>
                  {group.label}
                </div>
                {visibleItems.map(pageId => {
                  const item = NAV_ITEMS.find(n => n.id === pageId);
                  if (!item) return null;
                  return (
                    <Fragment key={pageId}>
                      <NavItem
                        item={item}
                        active={currentPage === pageId}
                        accentColor={accentColor}
                        onClick={() => onChangePage(pageId)}
                        showChevron={pageId === 'empresas'}
                        onChevronClick={e => { e.stopPropagation(); setEmpresasOpen(o => !o); }}
                        expanded={pageId === 'empresas' ? empresasOpen : undefined}
                      />
                      {pageId === 'empresas' && empresasOpen && (
                        <div style={{ marginBottom: 4 }}>
                          <div style={{ display: 'flex', alignItems: 'center', padding: '4px 10px 4px', marginBottom: 2 }}>
                            <span style={{ flex: 1, fontSize: 9, fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase', color: 'var(--t4)' }}>Clientes</span>
                            <button onClick={e => { e.stopPropagation(); allSelected ? deselectAllCompanies() : selectAllCompanies(); }} style={{ background: 'transparent', border: 'none', cursor: 'pointer', fontSize: 9, fontWeight: 600, letterSpacing: '1px', textTransform: 'uppercase', color: 'var(--t4)', transition: 'all .15s', padding: '3px 7px', borderRadius: 6 }} onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = accentColor; (e.currentTarget as HTMLElement).style.background = `rgba(${accentRgb}, 0.1)`; }} onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'var(--t4)'; (e.currentTarget as HTMLElement).style.background = 'transparent'; }}>{allSelected ? 'Nenhum' : 'Todos'}</button>
                          </div>
                          {(['ativo', 'pausado', 'inativo'] as CompanyStatus[]).map(status => {
                            const groupList = groupedCompanies[status];
                            if (groupList.length === 0) return null;
                            const isGroupOpen = groupExpanded[status];
                            return (
                              <div key={status} style={{ marginBottom: 4 }}>
                                <button onClick={() => setGroupExpanded(p => ({ ...p, [status]: !p[status] }))} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 6, padding: '4px 10px', borderRadius: 6, marginBottom: 2, background: 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left', transition: 'background .15s' }} onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--s1)'; }} onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}>
                                  <div style={{ width: 6, height: 6, borderRadius: '50%', background: STATUS_GROUP_COLORS[status], flexShrink: 0 }} />
                                  <span style={{ flex: 1, fontSize: 9, fontWeight: 700, letterSpacing: '1.5px', textTransform: 'uppercase', color: STATUS_GROUP_COLORS[status] }}>{STATUS_GROUP_LABELS[status]}</span>
                                  <span style={{ fontSize: 9, color: 'var(--t4)', marginRight: 4 }}>{groupList.length}</span>
                                  {isGroupOpen ? <FiChevronDown size={10} style={{ color: 'var(--t4)', flexShrink: 0 }} /> : <FiChevronRight size={10} style={{ color: 'var(--t4)', flexShrink: 0 }} />}
                                </button>
                                {isGroupOpen && groupList.map(company => renderCompanyRow(company, groupList))}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </Fragment>
                  );
                })}
                {/* Divider between groups (except last) */}
                {gi < NAV_GROUPS.length - 1 && (
                  <div style={{ height: 1, background: 'var(--b1)', margin: '6px 4px 2px' }} />
                )}
              </div>
              );
            })}
          </div>

          {/* Bottom bar */}
          <div style={{ padding: '8px 8px 16px', flexShrink: 0 }}>
            {updateStatus !== 'idle' && (
              <button onClick={() => { if (updateStatus === 'downloaded') window.electronAPI?.installUpdate(); else if (updateStatus === 'error') window.electronAPI?.openReleasesPage?.(); else window.electronAPI?.checkForUpdates(); }} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 9, padding: '8px 12px', borderRadius: 10, marginBottom: 4, background: updateStatus === 'error' ? 'rgba(255,69,58,0.12)' : updateStatus === 'downloaded' ? 'rgba(48,209,88,0.15)' : `rgba(${accentRgb}, 0.12)`, border: 'none', cursor: 'pointer', color: updateStatus === 'error' ? '#ff453a' : updateStatus === 'downloaded' ? '#30d158' : accentColor, fontSize: 12, fontWeight: 600, transition: 'opacity .15s' }} onMouseEnter={e => ((e.currentTarget as HTMLElement).style.opacity = '0.8')} onMouseLeave={e => ((e.currentTarget as HTMLElement).style.opacity = '1')}>
                <FiDownload size={13} />
                {updateStatus === 'error' ? 'Baixar atualização' : updateStatus === 'downloaded' ? 'Instalar atualização' : 'Atualização disponível'}
              </button>
            )}
            <div style={{ padding: '4px 8px 2px', display: 'flex', alignItems: 'center', gap: 2 }}>
              <button onClick={() => onChangePage('arquivo')} title="Arquivo" style={{ width: 30, height: 30, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', background: currentPage === 'arquivo' ? `rgba(${accentRgb}, 0.15)` : 'transparent', border: 'none', cursor: 'pointer', color: currentPage === 'arquivo' ? accentColor : 'var(--t4)', transition: 'all .15s', flexShrink: 0 }} onMouseEnter={e => { if (currentPage !== 'arquivo') { (e.currentTarget as HTMLElement).style.color = 'var(--t2)'; (e.currentTarget as HTMLElement).style.background = 'var(--s2)'; } }} onMouseLeave={e => { if (currentPage !== 'arquivo') { (e.currentTarget as HTMLElement).style.color = 'var(--t4)'; (e.currentTarget as HTMLElement).style.background = 'transparent'; } }}><FiArchive size={13} /></button>
              <button onClick={cycleTheme} title={`Tema: ${THEME_LABELS[theme]}`} style={{ width: 30, height: 30, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--t4)', transition: 'all .15s', flexShrink: 0 }} onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = accentColor; (e.currentTarget as HTMLElement).style.background = `rgba(${accentRgb}, 0.1)`; }} onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'var(--t4)'; (e.currentTarget as HTMLElement).style.background = 'transparent'; }}>{isLightTheme ? <FiMoon size={13} /> : <FiSun size={13} />}</button>
              <button onClick={onLock} title="Bloquear" style={{ width: 30, height: 30, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--t4)', transition: 'all .15s', flexShrink: 0 }} onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = accentColor; (e.currentTarget as HTMLElement).style.background = `rgba(${accentRgb}, 0.1)`; }} onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'var(--t4)'; (e.currentTarget as HTMLElement).style.background = 'transparent'; }}><FiLock size={13} /></button>
              <button onClick={onOpenAccount} title={user ? (user.email ?? 'Perfil') : 'Entrar'} style={{ width: 30, height: 30, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'transparent', border: 'none', cursor: 'pointer', color: user ? accentColor : 'var(--t4)', transition: 'all .15s', flexShrink: 0 }} onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = 'var(--t1)'; (e.currentTarget as HTMLElement).style.background = 'var(--s2)'; }} onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = user ? accentColor : 'var(--t4)'; (e.currentTarget as HTMLElement).style.background = 'transparent'; }}><FiUser size={13} /></button>
              <button onClick={onOpenSettings} title="Configurações" style={{ width: 30, height: 30, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--t4)', transition: 'all .15s', flexShrink: 0 }} onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = accentColor; (e.currentTarget as HTMLElement).style.background = `rgba(${accentRgb}, 0.1)`; }} onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'var(--t4)'; (e.currentTarget as HTMLElement).style.background = 'transparent'; }}><FiSettings size={13} /></button>
            </div>
            <div style={{ padding: '2px 16px 6px', display: 'flex', alignItems: 'center', gap: 4 }}>
              <span style={{ fontSize: 10, color: 'var(--t4)', letterSpacing: '0.3px' }}>Versão {__APP_VERSION__}</span>
              <div title={syncDotTitle} className={syncStatus === 'syncing' ? 'sync-pulse' : ''} style={{ width: 6, height: 6, borderRadius: '50%', background: syncDotColor, flexShrink: 0 }} />
              {syncLabel && <span style={{ fontSize: 9, color: 'var(--t4)', marginLeft: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>{syncLabel}</span>}
            </div>
          </div>

          {/* Drag handle */}
          <div onMouseDown={handleResizeMouseDown} title="Arrastar para redimensionar" style={{ position: 'absolute', top: 0, right: 0, bottom: 0, width: 4, cursor: 'col-resize', zIndex: 10, background: 'transparent', transition: 'background .15s' }} onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = `rgba(${accentRgb}, 0.3)`; }} onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }} />
        </>
      )}
    </aside>
  );
}
