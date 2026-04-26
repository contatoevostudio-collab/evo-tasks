import { useState, useEffect, useCallback } from 'react';
import { formatDistanceToNow, parseISO, isBefore, startOfToday } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  FiHome, FiCalendar, FiBriefcase, FiSettings,
  FiChevronRight, FiChevronLeft, FiArchive, FiDownload, FiSun, FiMoon,
  FiUser, FiTrendingUp, FiList, FiLock, FiPieChart, FiZap, FiFileText, FiInbox,
  FiCheckCircle, FiGrid, FiClipboard, FiMessageSquare, FiLayers, FiCopy, FiBarChart2, FiRepeat, FiClock,
  FiSearch,
} from 'react-icons/fi';
import { useTaskStore } from '../store/tasks';
import { useAuthStore } from '../store/auth';
import { useContentApprovalsStore } from '../store/contentApprovals';
import { useInvoicesStore } from '../store/invoices';
import type { PageType, Theme } from '../types';
import EvoIcon from '../assets/images/Logos/Icons/Icone/4.svg';
import { useVisibleWorkspaceIds, isInLens, useWorkspacesStore, getEnabledPages } from '../store/workspaces';
import { hexToRgb } from './dashboard';

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
  /** Abre a paleta de busca (Cmd+K) */
  onOpenSearch?: () => void;
}

const NAV_ITEMS: { id: PageType; label: string; Icon: React.ElementType; beta?: boolean }[] = [
  { id: 'home',         label: 'Home',          Icon: FiHome },
  { id: 'inbox',        label: 'Inbox',         Icon: FiInbox },
  { id: 'tarefas',      label: 'Calendário',    Icon: FiCalendar },
  { id: 'empresas',     label: 'Empresas',      Icon: FiBriefcase },
  { id: 'crm',          label: 'CRM',           Icon: FiTrendingUp, beta: true },
  { id: 'propostas',    label: 'Propostas',     Icon: FiFileText },
  { id: 'aprovacoes',   label: 'Aprovações',    Icon: FiCheckCircle },
  { id: 'editorial',    label: 'Editorial',     Icon: FiGrid },
  { id: 'briefings',    label: 'Briefings',     Icon: FiMessageSquare },
  { id: 'onboarding',   label: 'Onboarding',    Icon: FiLayers },
  { id: 'todo',         label: 'To Do',         Icon: FiList },
  { id: 'ideias',       label: 'Ideias',        Icon: FiZap },
  { id: 'snippets',     label: 'Snippets',      Icon: FiCopy },
  { id: 'habitos',      label: 'Hábitos',       Icon: FiRepeat },
  { id: 'timetracking', label: 'Time Tracking', Icon: FiClock },
  { id: 'financas',     label: 'Finanças',      Icon: FiPieChart },
  { id: 'faturas',      label: 'Faturas',       Icon: FiClipboard },
  { id: 'kpis',         label: 'KPIs',          Icon: FiBarChart2 },
];

const NAV_GROUPS: { label: string; items: PageType[] }[] = [
  { label: 'Principais',  items: ['home', 'inbox', 'tarefas'] },
  { label: 'Negócio',     items: ['empresas', 'crm', 'propostas'] },
  { label: 'Agência',     items: ['aprovacoes', 'editorial', 'briefings', 'onboarding'] },
  { label: 'Ferramentas', items: ['todo', 'ideias', 'snippets', 'habitos', 'timetracking'] },
  { label: 'Gestão',      items: ['financas', 'faturas', 'kpis'] },
];

const THEMES: Theme[] = ['dark-blue', 'light-soft'];
const THEME_LABELS: Record<Theme, string> = { 'dark-blue': 'Escuro', 'light-soft': 'Claro' };

const dragRegion: React.CSSProperties = { WebkitAppRegion: 'drag' } as React.CSSProperties;
const noDragRegion: React.CSSProperties = { WebkitAppRegion: 'no-drag' } as React.CSSProperties;

// ─── Compact nav item with badge ──────────────────────────────────────────
function NavItem({ item, active, accentColor, accentRgb, onClick, badge, badgeColor }: {
  item: typeof NAV_ITEMS[0];
  active: boolean;
  accentColor: string;
  accentRgb: string;
  onClick: () => void;
  badge?: number;
  badgeColor?: string;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        position: 'relative',
        width: '100%', display: 'flex', alignItems: 'center', gap: 9,
        padding: '6px 10px', borderRadius: 8,
        background: active ? `rgba(${accentRgb}, 0.16)` : 'transparent',
        border: `1px solid ${active ? `rgba(${accentRgb}, 0.30)` : 'transparent'}`,
        boxShadow: active ? `0 0 14px -4px rgba(${accentRgb}, 0.4)` : 'none',
        cursor: 'pointer', textAlign: 'left',
        transition: 'background .12s, border-color .12s',
      }}
      onMouseEnter={e => { if (!active) (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.05)'; }}
      onMouseLeave={e => { if (!active) (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
    >
      {active && (
        <span style={{
          position: 'absolute', left: -4, top: '50%', transform: 'translateY(-50%)',
          width: 3, height: 16, borderRadius: 2,
          background: accentColor,
          boxShadow: `0 0 8px rgba(${accentRgb}, 0.9)`,
        }} />
      )}
      <item.Icon
        size={14}
        style={{
          color: active ? accentColor : 'rgba(255,255,255,0.55)',
          flexShrink: 0,
          filter: active ? `drop-shadow(0 0 4px rgba(${accentRgb}, 0.6))` : 'none',
        }}
      />
      <span style={{
        fontSize: 12.5, fontWeight: active ? 700 : 500,
        color: active ? '#ffffff' : 'rgba(255,255,255,0.78)',
        flex: 1, lineHeight: 1.15,
      }}>
        {item.label}
      </span>
      {item.beta && (
        <span style={{
          fontSize: 8, fontWeight: 800, letterSpacing: '0.5px', textTransform: 'uppercase',
          color: '#ff9f0a', background: 'rgba(255,159,10,0.14)', border: '1px solid rgba(255,159,10,0.3)',
          borderRadius: 4, padding: '1px 5px', flexShrink: 0,
        }}>
          beta
        </span>
      )}
      {badge !== undefined && badge > 0 && (
        <span style={{
          fontSize: 9, fontWeight: 800,
          background: badgeColor ?? '#ff453a',
          color: '#ffffff',
          borderRadius: 99,
          padding: '1px 6px',
          minWidth: 16, textAlign: 'center',
          flexShrink: 0,
          boxShadow: `0 0 8px ${badgeColor ?? '#ff453a'}55`,
        }}>
          {badge > 99 ? '99+' : badge}
        </span>
      )}
    </button>
  );
}

export function NavSidebar({ currentPage, onChangePage, onAddTask: _onAddTask, onOpenSettings, onLogin: _onLogin, onLock, onNavigateToCompany: _onNavigateToCompany, onOpenAccount, onOpenWorkspaceManager: _onOpenWorkspaceManager, onOpenSearch }: Props) {
  const {
    tasks, leads,
    sidebarCollapsed, toggleSidebar,
    theme, setTheme,
    syncStatus,
    lastSyncAt,
    sidebarWidth,
    accentColor, userName,
  } = useTaskStore();
  const accentRgb = hexToRgb(accentColor);
  const visibleIds = useVisibleWorkspaceIds();

  const workspaces = useWorkspacesStore(s => s.workspaces);
  const activeWorkspaceId = useWorkspacesStore(s => s.activeWorkspaceId);
  const activeWorkspace = workspaces.find(w => w.id === activeWorkspaceId);
  const enabledPages = activeWorkspace ? getEnabledPages(activeWorkspace) : null;

  const { user } = useAuthStore();
  const { approvals } = useContentApprovalsStore();
  const { invoices } = useInvoicesStore();

  const isLightTheme = theme !== 'dark-blue';
  const cycleTheme = () => { const idx = THEMES.indexOf(theme); setTheme(THEMES[(idx + 1) % THEMES.length]); };

  const [updateStatus, setUpdateStatus] = useState<'idle' | 'available' | 'downloaded' | 'error'>('idle');

  useEffect(() => {
    window.electronAPI?.onUpdateAvailable(() => setUpdateStatus('available'));
    window.electronAPI?.onUpdateDownloaded(() => setUpdateStatus('downloaded'));
    window.electronAPI?.onUpdateError?.(() => setUpdateStatus('error'));
  }, []);

  // Suppress unused (kept for future)
  void _onNavigateToCompany; void _onOpenWorkspaceManager;

  // ─── Badges (pendências) ──────────────────────────────────────────────
  const todayDate = startOfToday();
  const inboxCount = tasks.filter(t => t.inbox && !t.deletedAt && !t.archived && isInLens(t, visibleIds)).length;
  const overdueCount = tasks.filter(t => {
    if (t.deletedAt || t.archived || t.inbox || t.status === 'done') return false;
    if (!isInLens(t, visibleIds)) return false;
    try { return isBefore(parseISO(t.date), todayDate); } catch { return false; }
  }).length;
  const approvalsPendingCount = approvals.filter(a =>
    !a.deletedAt && (a.status === 'enviado' || a.status === 'visualizado') && isInLens(a, visibleIds)
  ).length;
  const overdueInvoicesCount = invoices.filter(i => {
    if (i.deletedAt || i.status !== 'enviada' || !i.dueDate) return false;
    if (!isInLens(i, visibleIds)) return false;
    try { return isBefore(parseISO(i.dueDate), todayDate); } catch { return false; }
  }).length;
  const openLeadsCount = leads.filter(l => l.stage !== 'fechado' && isInLens(l, visibleIds)).length;

  const badgeFor = (id: PageType): { count: number; color: string } | null => {
    switch (id) {
      case 'inbox':      return inboxCount > 0      ? { count: inboxCount,            color: '#ff9f0a' } : null;
      case 'tarefas':    return overdueCount > 0    ? { count: overdueCount,          color: '#ff453a' } : null;
      case 'aprovacoes': return approvalsPendingCount > 0 ? { count: approvalsPendingCount, color: '#bf5af2' } : null;
      case 'faturas':    return overdueInvoicesCount > 0  ? { count: overdueInvoicesCount,  color: '#ff453a' } : null;
      case 'crm':        return openLeadsCount > 0  ? { count: openLeadsCount,        color: '#bf5af2' } : null;
      default:           return null;
    }
  };

  // ─── Sync label ───────────────────────────────────────────────────────
  const syncDotColor = syncStatus === 'syncing' ? '#356BFF' : syncStatus === 'error' ? '#ff453a' : '#30d158';
  const getSyncLabel = useCallback(() => {
    if (syncStatus === 'syncing') return 'Sincronizando…';
    if (syncStatus === 'error') return 'Erro ao sincronizar';
    if (!lastSyncAt) return 'Aguardando';
    const diffMs = Date.now() - new Date(lastSyncAt).getTime();
    if (diffMs < 60_000) return 'Sincronizado agora';
    return `Sync ${formatDistanceToNow(new Date(lastSyncAt), { locale: ptBR, addSuffix: false })} atrás`;
  }, [syncStatus, lastSyncAt]);

  const [syncLabel, setSyncLabel] = useState<string>(getSyncLabel);
  useEffect(() => {
    setSyncLabel(getSyncLabel());
    const timer = setInterval(() => setSyncLabel(getSyncLabel()), 30_000);
    return () => clearInterval(timer);
  }, [getSyncLabel]);

  void userName;

  const w = sidebarCollapsed ? 56 : sidebarWidth;
  const shadow = isLightTheme
    ? 'inset 0 0 0 1px rgba(0,0,0,0.08), 0 8px 32px rgba(0,0,0,0.10)'
    : 'inset 0 0 0 1px rgba(255,255,255,0.10), 0 8px 32px rgba(0,0,0,0.30)';

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
      <div style={{ width: '100%', height: 22, flexShrink: 0, ...dragRegion }} />

      {sidebarCollapsed ? (
        /* ─── Collapsed (icon-only) ─── */
        <>
          <div style={{
            width: 32, height: 32, borderRadius: 8,
            background: `linear-gradient(135deg, ${accentColor}, ${accentColor}aa)`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: `0 4px 12px rgba(${accentRgb}, 0.45), 0 0 16px rgba(${accentRgb}, 0.25)`,
            marginBottom: 8, ...noDragRegion,
          }}>
            <img src={EvoIcon} alt="EvoTasks" style={{ width: 18, height: 18, objectFit: 'contain', filter: 'invert(1)' }} />
          </div>

          <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, width: '100%', padding: '4px 0' }}>
            {NAV_ITEMS.filter(({ id }) => !enabledPages || enabledPages.includes(id)).map(({ id, label, Icon, beta }) => {
              const active = currentPage === id;
              const badge = badgeFor(id);
              return (
                <div key={id} style={{ position: 'relative' }}>
                  <button onClick={() => onChangePage(id)} title={label}
                    style={{
                      width: 36, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 9,
                      background: active ? `rgba(${accentRgb}, 0.18)` : 'transparent',
                      border: `1px solid ${active ? `rgba(${accentRgb}, 0.32)` : 'transparent'}`,
                      cursor: 'pointer',
                      color: active ? accentColor : 'rgba(255,255,255,0.55)',
                      boxShadow: active ? `0 0 12px -2px rgba(${accentRgb}, 0.45)` : 'none',
                      transition: 'all .15s',
                    }}
                    onMouseEnter={e => { if (!active) (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.05)'; }}
                    onMouseLeave={e => { if (!active) (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
                  >
                    <Icon size={15} style={{ filter: active ? `drop-shadow(0 0 4px rgba(${accentRgb}, 0.6))` : 'none' }} />
                  </button>
                  {beta && <span style={{ position: 'absolute', top: 2, right: 4, width: 6, height: 6, borderRadius: '50%', background: '#ff9f0a', boxShadow: '0 0 6px rgba(255,159,10,0.8)', pointerEvents: 'none' }} />}
                  {badge && (
                    <span style={{
                      position: 'absolute', top: -2, right: -2,
                      minWidth: 14, height: 14, padding: '0 3px', borderRadius: 99,
                      background: badge.color, color: '#fff',
                      fontSize: 8, fontWeight: 800,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      boxShadow: `0 0 6px ${badge.color}aa`, pointerEvents: 'none',
                    }}>
                      {badge.count > 9 ? '9+' : badge.count}
                    </span>
                  )}
                </div>
              );
            })}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, padding: '4px 0 8px' }}>
            {updateStatus !== 'idle' && (
              <button onClick={() => { if (updateStatus === 'downloaded') window.electronAPI?.installUpdate(); else window.electronAPI?.checkForUpdates(); }}
                title={updateStatus === 'downloaded' ? 'Instalar atualização' : 'Atualização disponível'}
                style={{ width: 36, height: 32, borderRadius: 9, display: 'flex', alignItems: 'center', justifyContent: 'center', background: updateStatus === 'downloaded' ? 'rgba(48,209,88,0.15)' : `rgba(${accentRgb}, 0.12)`, border: 'none', cursor: 'pointer', color: updateStatus === 'downloaded' ? '#30d158' : accentColor }}>
                <FiDownload size={14} />
              </button>
            )}
            <button onClick={() => onChangePage('arquivo')} title="Arquivo" style={iconBtn(currentPage === 'arquivo', accentColor, accentRgb)}><FiArchive size={14} /></button>
            <button onClick={cycleTheme} title={`Tema: ${THEME_LABELS[theme]}`} style={iconBtn(false, accentColor, accentRgb)}>{isLightTheme ? <FiMoon size={14} /> : <FiSun size={14} />}</button>
            <button onClick={onLock} title="Bloquear" style={iconBtn(false, accentColor, accentRgb)}><FiLock size={14} /></button>
            <button onClick={onOpenAccount} title={user ? (user.email ?? 'Perfil') : 'Entrar'} style={iconBtn(false, accentColor, accentRgb)}><FiUser size={14} /></button>
            <button onClick={onOpenSettings} title="Configurações" style={iconBtn(false, accentColor, accentRgb)}><FiSettings size={14} /></button>
            <button onClick={toggleSidebar} title="Expandir" style={iconBtn(false, accentColor, accentRgb)}><FiChevronRight size={14} /></button>
          </div>
        </>
      ) : (
        /* ─── Expanded ─── */
        <>
          {/* Logo + brand */}
          <div style={{ padding: '4px 16px 10px', flexShrink: 0, ...noDragRegion }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{
                width: 30, height: 30, borderRadius: 8,
                background: `linear-gradient(135deg, ${accentColor}, ${accentColor}aa)`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: `0 4px 12px rgba(${accentRgb}, 0.45), 0 0 16px rgba(${accentRgb}, 0.25)`,
                flexShrink: 0,
              }}>
                <img src={EvoIcon} alt="EvoTasks" style={{ width: 16, height: 16, objectFit: 'contain', filter: 'invert(1)' }} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14, fontWeight: 800, color: '#ffffff', letterSpacing: '-0.3px', lineHeight: 1 }}>
                  EvoTasks
                </div>
              </div>
              <button onClick={toggleSidebar} title="Recolher"
                style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.45)', padding: 4, borderRadius: 6, transition: 'color .15s' }}
                onMouseEnter={e => ((e.currentTarget as HTMLElement).style.color = '#ffffff')}
                onMouseLeave={e => ((e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.45)')}
              >
                <FiChevronLeft size={13} />
              </button>
            </div>
          </div>

          {/* Search bar (Cmd+K) */}
          {onOpenSearch && (
            <div style={{ padding: '0 12px 8px', flexShrink: 0 }}>
              <button
                onClick={onOpenSearch}
                style={{
                  width: '100%', display: 'flex', alignItems: 'center', gap: 8,
                  padding: '7px 10px', borderRadius: 9,
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.10)',
                  cursor: 'pointer', color: 'rgba(255,255,255,0.55)',
                  fontSize: 12, fontWeight: 500,
                  transition: 'all .12s',
                }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.09)'; (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.16)'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.05)'; (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,255,255,0.10)'; }}
              >
                <FiSearch size={12} />
                <span style={{ flex: 1, textAlign: 'left' }}>Buscar...</span>
                <kbd style={{
                  fontSize: 9, fontWeight: 700, letterSpacing: '0.5px',
                  color: 'rgba(255,255,255,0.55)',
                  background: 'rgba(255,255,255,0.08)',
                  border: '1px solid rgba(255,255,255,0.12)',
                  borderRadius: 4, padding: '1px 5px',
                  fontFamily: 'inherit',
                }}>⌘K</kbd>
              </button>
            </div>
          )}

          {/* Navigation — compact groups */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '0 8px 0' }}>
            {NAV_GROUPS.map((group) => {
              const visibleItems = enabledPages
                ? group.items.filter(id => enabledPages.includes(id))
                : group.items;
              if (visibleItems.length === 0) return null;
              return (
                <div key={group.label} style={{ marginBottom: 6 }}>
                  <div style={{
                    padding: '6px 12px 3px',
                    fontSize: 9, fontWeight: 800, letterSpacing: '1.6px',
                    textTransform: 'uppercase',
                    color: 'rgba(255,255,255,0.4)',
                  }}>
                    {group.label}
                  </div>
                  {visibleItems.map(pageId => {
                    const item = NAV_ITEMS.find(n => n.id === pageId);
                    if (!item) return null;
                    const badge = badgeFor(pageId);
                    return (
                      <NavItem
                        key={pageId}
                        item={item}
                        active={currentPage === pageId}
                        accentColor={accentColor}
                        accentRgb={accentRgb}
                        onClick={() => onChangePage(pageId)}
                        badge={badge?.count}
                        badgeColor={badge?.color}
                      />
                    );
                  })}
                </div>
              );
            })}
          </div>

          {/* Bottom: actions + sync + version */}
          <div style={{ flexShrink: 0, padding: '8px 10px 10px', borderTop: '1px solid rgba(255,255,255,0.07)' }}>
            {updateStatus !== 'idle' && (
              <button
                onClick={() => { if (updateStatus === 'downloaded') window.electronAPI?.installUpdate(); else if (updateStatus === 'error') window.electronAPI?.openReleasesPage?.(); else window.electronAPI?.checkForUpdates(); }}
                style={{
                  width: '100%', display: 'flex', alignItems: 'center', gap: 8,
                  padding: '7px 10px', borderRadius: 8, marginBottom: 6,
                  background: updateStatus === 'error' ? 'rgba(255,69,58,0.12)' : updateStatus === 'downloaded' ? 'rgba(48,209,88,0.15)' : `rgba(${accentRgb}, 0.14)`,
                  border: `1px solid ${updateStatus === 'error' ? 'rgba(255,69,58,0.3)' : updateStatus === 'downloaded' ? 'rgba(48,209,88,0.3)' : `rgba(${accentRgb}, 0.3)`}`,
                  cursor: 'pointer',
                  color: updateStatus === 'error' ? '#ff453a' : updateStatus === 'downloaded' ? '#30d158' : accentColor,
                  fontSize: 11, fontWeight: 700,
                }}
              >
                <FiDownload size={12} />
                {updateStatus === 'error' ? 'Baixar atualização' : updateStatus === 'downloaded' ? 'Instalar atualização' : 'Atualização disponível'}
              </button>
            )}

            {/* Action icons row */}
            <div style={{ display: 'flex', gap: 2, marginBottom: 6 }}>
              <button onClick={() => onChangePage('arquivo')} title="Arquivo" style={iconBtn(currentPage === 'arquivo', accentColor, accentRgb, 30, 28)}><FiArchive size={13} /></button>
              <button onClick={cycleTheme} title={`Tema: ${THEME_LABELS[theme]}`} style={iconBtn(false, accentColor, accentRgb, 30, 28)}>{isLightTheme ? <FiMoon size={13} /> : <FiSun size={13} />}</button>
              <button onClick={onLock} title="Bloquear" style={iconBtn(false, accentColor, accentRgb, 30, 28)}><FiLock size={13} /></button>
              <button onClick={onOpenAccount} title={user ? (user.email ?? 'Perfil') : 'Entrar'} style={iconBtn(false, accentColor, accentRgb, 30, 28)}><FiUser size={13} /></button>
              <button onClick={onOpenSettings} title="Configurações" style={iconBtn(false, accentColor, accentRgb, 30, 28)}><FiSettings size={13} /></button>
            </div>

            {/* Sync status + version */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '0 4px' }}>
              <div className={syncStatus === 'syncing' ? 'sync-pulse' : ''} style={{ width: 6, height: 6, borderRadius: '50%', background: syncDotColor, flexShrink: 0 }} />
              <span style={{ flex: 1, fontSize: 10, color: 'rgba(255,255,255,0.55)', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {syncLabel}
              </span>
              <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.35)', fontWeight: 600, flexShrink: 0 }}>
                v{__APP_VERSION__}
              </span>
            </div>
          </div>
        </>
      )}
    </aside>
  );
}

function iconBtn(active: boolean, accentColor: string, accentRgb: string, w = 36, h = 32): React.CSSProperties {
  return {
    width: w, height: h, borderRadius: 8,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    background: active ? `rgba(${accentRgb}, 0.16)` : 'transparent',
    border: 'none', cursor: 'pointer',
    color: active ? accentColor : 'rgba(255,255,255,0.5)',
    transition: 'all .12s',
    flexShrink: 0,
  };
}
