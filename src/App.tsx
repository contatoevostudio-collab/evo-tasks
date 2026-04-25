import { useState, useEffect, useRef, useCallback, lazy, Suspense } from 'react';
import { FiSun, FiMoon, FiHelpCircle, FiSearch, FiChevronDown, FiLock, FiPlus, FiMaximize, FiMinimize, FiCloud, FiCheckCircle, FiRefreshCw, FiAlertCircle, FiWifiOff } from 'react-icons/fi';
import { format } from 'date-fns';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import { AnimatePresence, motion } from 'framer-motion';
import { useSyncStore, type SyncState } from './store/sync';
import { PageSkeleton } from './components/PageSkeleton';
import { NavSidebar } from './components/NavSidebar';
import { BottomBar } from './components/BottomBar';
import { HomePage } from './components/HomePage';
import { CalendarEventModal } from './components/CalendarEventModal';
import { TaskModal } from './components/TaskModal';
import { LockScreen } from './components/LockScreen';
import { PomodoroPanel, INITIAL_POMODORO, type PomodoroState } from './components/PomodoroPanel';
import { MobileBottomNav } from './components/MobileBottomNav';
import { NotificationsBell, NotificationsPanel, useNotificationsCount } from './components/NotificationsPanel';
import { useTaskStore } from './store/tasks';
import { useAuthStore } from './store/auth';
import { loadFromSupabase, resetLoadFromSupabaseCache } from './lib/supabaseSync';
import { bootstrapWorkspaces } from './lib/workspaceMigration';
import { playChime } from './lib/sounds';
import { THEME_VARS } from './types';
import type { Task, TaskStatus, PageType, CalendarEventCategory } from './types';
import { ToastContainer, ErrorBoundary } from './components/ui';
import './index.css';

// Heavy pages — loaded on demand
const EmpresasPage    = lazy(() => import('./components/EmpresasPage').then(m => ({ default: m.EmpresasPage })));
const ArchivePage     = lazy(() => import('./components/ArchivePage').then(m => ({ default: m.ArchivePage })));
const CRMPage         = lazy(() => import('./components/CRMPage').then(m => ({ default: m.CRMPage })));
const TodoPage        = lazy(() => import('./components/TodoPage').then(m => ({ default: m.TodoPage })));
const FinancePage     = lazy(() => import('./components/FinancePage').then(m => ({ default: m.FinancePage })));
const IdeiasPage      = lazy(() => import('./components/IdeiasPage').then(m => ({ default: m.IdeiasPage })));
const PropostasPage   = lazy(() => import('./components/PropostasPage').then(m => ({ default: m.PropostasPage })));
const InboxPage       = lazy(() => import('./components/InboxPage').then(m => ({ default: m.InboxPage })));
// Onda 5 — Agência
const AprovacoesPage      = lazy(() => import('./components/AprovacoesPage').then(m => ({ default: m.AprovacoesPage })));
const PublicApprovalView  = lazy(() => import('./components/AprovacoesPage').then(m => ({ default: m.PublicApprovalView })));
const PublicBriefingView  = lazy(() => import('./components/BriefingsPage').then(m => ({ default: m.PublicBriefingView })));
const EditorialPage   = lazy(() => import('./components/EditorialPage').then(m => ({ default: m.EditorialPage })));
const FaturasPage     = lazy(() => import('./components/FaturasPage').then(m => ({ default: m.FaturasPage })));
const BriefingsPage   = lazy(() => import('./components/BriefingsPage').then(m => ({ default: m.BriefingsPage })));
const OnboardingPage  = lazy(() => import('./components/OnboardingPage').then(m => ({ default: m.OnboardingPage })));
const SnippetsPage    = lazy(() => import('./components/SnippetsPage').then(m => ({ default: m.SnippetsPage })));
const KPIsPage        = lazy(() => import('./components/KPIsPage').then(m => ({ default: m.KPIsPage })));
const HabitosPage     = lazy(() => import('./components/HabitosPage').then(m => ({ default: m.HabitosPage })));

// Heavy view components (used inside the "tarefas" page)
const MonthView  = lazy(() => import('./components/views/MonthView').then(m => ({ default: m.MonthView })));
const WeekView   = lazy(() => import('./components/views/WeekView').then(m => ({ default: m.WeekView })));
const DayView    = lazy(() => import('./components/views/DayView').then(m => ({ default: m.DayView })));
const KanbanView = lazy(() => import('./components/views/KanbanView').then(m => ({ default: m.KanbanView })));

// On-demand modals
const SettingsModal   = lazy(() => import('./components/SettingsModal').then(m => ({ default: m.SettingsModal })));
const SearchModal     = lazy(() => import('./components/SearchModal').then(m => ({ default: m.SearchModal })));
const HelpModal       = lazy(() => import('./components/HelpModal').then(m => ({ default: m.HelpModal })));
const AccountModal    = lazy(() => import('./components/AccountModal').then(m => ({ default: m.AccountModal })));
const BackupModal     = lazy(() => import('./components/BackupModal').then(m => ({ default: m.BackupModal })));
const ICSImportModal  = lazy(() => import('./components/ICSImportModal').then(m => ({ default: m.ICSImportModal })));
const AuthModal       = lazy(() => import('./components/AuthModal').then(m => ({ default: m.AuthModal })));
const WorkspaceModal  = lazy(() => import('./components/WorkspaceModal').then(m => ({ default: m.WorkspaceModal })));

const PageFallback = () => (
  <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--t4)', fontSize: 12 }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <div style={{ width: 14, height: 14, border: '2px solid var(--b2)', borderTopColor: 'var(--t2)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      carregando…
    </div>
  </div>
);

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export default function App() {
  const { viewMode, theme, setTheme, toast, setUserId, animationsEnabled, userName, userPhoto, accentColor, calendarCategoryFilter, purgeOldTrash } = useTaskStore();
  const isLight = theme.startsWith('light');
  const toggleTheme = () => {
    document.documentElement.classList.add('theme-transitioning');
    setTheme(isLight ? 'dark-blue' : 'light-soft');
    setTimeout(() => document.documentElement.classList.remove('theme-transitioning'), 350);
  };
  const { user, loading: authLoading, initialize, guestMode, setGuestMode } = useAuthStore();
  const themeVars = THEME_VARS[theme as keyof typeof THEME_VARS] ?? THEME_VARS['dark-blue'];

  useEffect(() => { initialize(); }, []);

  // Lixeira: remove permanentemente itens com mais de 30 dias na startup
  useEffect(() => { purgeOldTrash(); }, []);

  // Workspaces (Onda 4): garante default + migra dados legacy no mount
  useEffect(() => { bootstrapWorkspaces(); }, []);

  // Only reload from Supabase when the user ID actually changes (sign in / sign out),
  // NOT on every auth event (e.g. token refresh creates a new user object reference
  // which would trigger replaceAll and could cause data loss mid-session).
  const prevUserIdRef = useRef<string | null>(null);
  useEffect(() => {
    if (user) {
      setUserId(user.id);
      if (user.id !== prevUserIdRef.current) {
        prevUserIdRef.current = user.id;
        // Load profile tied to this account, clear any leftover from another account
        const meta = user.user_metadata ?? {};
        useTaskStore.getState().setUserName(meta.displayName ?? '');
        // photoUrl agora é uma URL curta do Supabase Storage (não base64).
        // Aceita só se começar com http(s):// pra ignorar dados antigos
        // gigantes (incidente 2026-04-25 — base64 estourava JWT > 8KB → 520).
        const photo = typeof meta.photoUrl === 'string' && /^https?:\/\//.test(meta.photoUrl)
          ? meta.photoUrl : '';
        useTaskStore.getState().setUserPhoto(photo);
        loadFromSupabase(user.id).catch(console.error);
      }
    } else {
      prevUserIdRef.current = null;
      setUserId(null);
      useTaskStore.getState().setUserName('');
      useTaskStore.getState().setUserPhoto('');
      resetLoadFromSupabaseCache();
    }
  }, [user]);

  const [page, setPage] = useState<PageType>('home');
  const [modalTask,    setModalTask]    = useState<Task | null | undefined>(undefined);
  const [modalDate,    setModalDate]    = useState<string | undefined>(undefined);
  const [showSettings,   setShowSettings]   = useState(false);
  const [showSearch,     setShowSearch]     = useState(false);
  const [showAuthModal,  setShowAuthModal]  = useState(false);
  const [pinLocked,      setPinLocked]      = useState(() => !!localStorage.getItem('evo-tasks-pin'));
  const [manualLocked,   setManualLocked]   = useState(false);
  const [empresasTarget, setEmpresasTarget] = useState<string | null>(null);
  const [showPomodoro,   setShowPomodoro]   = useState(false);
  const [showHelp,        setShowHelp]        = useState(false);
  const [showAccount,     setShowAccount]     = useState(false);
  const [showEventModal,  setShowEventModal]  = useState(false);
  const [showBackup,      setShowBackup]      = useState(false);
  const [showICSImport,   setShowICSImport]   = useState(false);
  const [isFullscreen,    setIsFullscreen]    = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [workspaceManager, setWorkspaceManager] = useState<{ open: boolean; editingId?: string }>({ open: false });
  const notificationsCount = useNotificationsCount();

  // Sync indicator state (visual only — wired in src/lib/supabaseSync.ts)
  const syncState       = useSyncStore(s => s.state);
  const lastSync        = useSyncStore(s => s.lastSync);
  const syncErrorMsg    = useSyncStore(s => s.errorMessage);
  const hasInitialSync  = useSyncStore(s => s.hasInitialSync);

  const syncCfg: Record<SyncState, { color: string; label: string; icon: React.ReactNode; pulse?: boolean }> = {
    idle:    { color: 'var(--t4)', label: 'Aguardando',           icon: <FiCloud size={13} /> },
    syncing: { color: '#356BFF',   label: 'Sincronizando…',       icon: <FiRefreshCw size={13} className="spin" />, pulse: true },
    synced:  { color: '#30d158',   label: 'Tudo salvo',           icon: <FiCheckCircle size={13} /> },
    error:   { color: '#ff453a',   label: 'Erro ao sincronizar',  icon: <FiAlertCircle size={13} /> },
    offline: { color: '#ff9f0a',   label: 'Offline',              icon: <FiWifiOff size={13} /> },
  };
  const syncC = syncCfg[syncState];
  const syncTooltip = `${syncC.label}${lastSync ? ` · ${format(lastSync, 'HH:mm')}` : ''}${syncErrorMsg ? ` — ${syncErrorMsg}` : ''}`;

  // Show full-page skeleton only during the very first pull from Supabase.
  const showInitialSkeleton = !hasInitialSync && syncState === 'syncing' && !!user;

  // ── Offline indicator (#56) ────────────────────────────────────────────────
  const [isOnline, setIsOnline] = useState(() => navigator.onLine);
  const [showReconnected, setShowReconnected] = useState(false);
  const wasOfflineRef = useRef(false);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      if (wasOfflineRef.current) {
        setShowReconnected(true);
        setTimeout(() => setShowReconnected(false), 3000);
      }
      wasOfflineRef.current = false;
    };
    const handleOffline = () => {
      setIsOnline(false);
      wasOfflineRef.current = true;
    };
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Fullscreen toggle (#52)
  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  }, []);

  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', handler);
    return () => document.removeEventListener('fullscreenchange', handler);
  }, []);

  // ─── Keyboard shortcuts ───
  useKeyboardShortcuts({
    onNewTask: () => openNewTask(),
    onSearch: () => setShowSearch(true),
    onNavigate: (p) => setPage(p),
    onEscape: () => {
      setShowSearch(false);
      setShowHelp(false);
      setShowPomodoro(false);
      setShowSettings(false);
    },
    disabled: pinLocked,
  });

  // ─── Pomodoro timer (lives at App level so it survives panel close) ───
  const [pomo, setPomo] = useState<PomodoroState>(INITIAL_POMODORO);
  const pomoInterval = useRef<ReturnType<typeof setInterval> | null>(null);
  const prevPhaseRef = useRef(pomo.isBreak);

  // Sync with Electron main process once on mount
  useEffect(() => {
    const sync = async () => {
      if (window.electronAPI?.pomodoroGetState) {
        const s = await window.electronAPI.pomodoroGetState();
        if (s) setPomo(s);
      }
    };
    sync();

    // Listen for ticks from Electron main process (authoritative when running in Electron)
    const cleanup = window.electronAPI?.onPomodoroTick?.((s: PomodoroState) => {
      setPomo(s);
    });
    return () => { cleanup?.(); };
  }, []);

  // Local interval fallback (web / dev mode without Electron)
  useEffect(() => {
    if (pomoInterval.current) clearInterval(pomoInterval.current);

    if (pomo.isRunning) {
      pomoInterval.current = setInterval(() => {
        setPomo(prev => {
          if (!prev.isRunning) return prev;
          if (prev.remaining <= 1) {
            const newIsBreak = !prev.isBreak;
            const newRemaining = newIsBreak ? prev.breakDuration : prev.workDuration;
            return { ...prev, remaining: newRemaining, isBreak: newIsBreak };
          }
          return { ...prev, remaining: prev.remaining - 1 };
        });
      }, 1000);
    }

    return () => { if (pomoInterval.current) clearInterval(pomoInterval.current); };
  }, [pomo.isRunning]);

  // Play chime when phase switches
  useEffect(() => {
    if (pomo.isBreak !== prevPhaseRef.current && (pomo.isRunning || pomo.remaining < (pomo.isBreak ? pomo.breakDuration : pomo.workDuration))) {
      playChime();
    }
    prevPhaseRef.current = pomo.isBreak;
  }, [pomo.isBreak]);

  const pomodoroDisplay = pomo.isRunning || pomo.remaining < (pomo.isBreak ? pomo.breakDuration : pomo.workDuration)
    ? formatTime(pomo.remaining)
    : null;

  const handlePomoStart = useCallback(async (workMin: number, breakMin: number) => {
    if (window.electronAPI?.pomodoroStart) {
      await window.electronAPI.pomodoroStart({ work: workMin, shortBreak: breakMin });
    }
    setPomo(prev => ({
      ...prev,
      isRunning: true,
      workDuration: workMin * 60,
      breakDuration: breakMin * 60,
      remaining: prev.isRunning ? prev.remaining : workMin * 60,
      isBreak: false,
    }));
  }, []);

  const handlePomoPause = useCallback(async () => {
    if (window.electronAPI?.pomodoroPause) await window.electronAPI.pomodoroPause();
    setPomo(prev => ({ ...prev, isRunning: !prev.isRunning }));
  }, []);

  const handlePomoStop = useCallback(async () => {
    if (window.electronAPI?.pomodoroStop) await window.electronAPI.pomodoroStop();
    setPomo(prev => ({
      ...prev,
      isRunning: false,
      isBreak: false,
      remaining: prev.workDuration,
    }));
  }, []);

  const openNewTask = (date?: string) => { setModalDate(date); setModalTask(null); };
  const openTask    = (task: Task)    => { setModalTask(task); setModalDate(undefined); };
  const closeModal  = ()              => { setModalTask(undefined); setModalDate(undefined); };

  const isModalOpen = modalTask !== undefined;


  // ── Links públicos compartilháveis ──────────────────────────────────────────
  const [publicHash, setPublicHash] = useState(() => window.location.hash);
  useEffect(() => {
    const handler = () => setPublicHash(window.location.hash);
    window.addEventListener('hashchange', handler);
    return () => window.removeEventListener('hashchange', handler);
  }, []);
  const aprovarToken  = publicHash.startsWith('#aprovar=')  ? publicHash.slice('#aprovar='.length)  : null;
  const briefingToken = publicHash.startsWith('#briefing=') ? publicHash.slice('#briefing='.length) : null;
  const clearHash = () => { history.replaceState(null, '', window.location.pathname); setPublicHash(''); };

  if (aprovarToken) return (
    <Suspense fallback={<PageFallback />}>
      <PublicApprovalView token={aprovarToken} onBack={clearHash} />
    </Suspense>
  );
  if (briefingToken) return (
    <Suspense fallback={<PageFallback />}>
      <PublicBriefingView token={briefingToken} onBack={clearHash} />
    </Suspense>
  );

  const cssVars = {
    '--t1': themeVars.t1, '--t2': themeVars.t2, '--t3': themeVars.t3, '--t4': themeVars.t4,
    '--s1': themeVars.s1, '--s2': themeVars.s2,
    '--b1': themeVars.b1, '--b2': themeVars.b2, '--b3': themeVars.b3,
    '--ib': themeVars.ib,
    '--modal-bg': themeVars.modalBg,
    '--sidebar-bg': themeVars.sidebarBg,
    '--accent': accentColor,
  } as React.CSSProperties;

  const pageTransition = animationsEnabled
    ? { duration: 0.18, ease: 'easeOut' as const }
    : { duration: 0 };

  return (
    <div
      className={`app-root ${animationsEnabled ? '' : 'no-animations'}`}
      style={{ display: 'flex', height: '100vh', background: themeVars.isLight ? themeVars.appBg : '#000', overflow: 'hidden', padding: 8, gap: 8, position: 'relative', ...cssVars }}
    >
      {/* Ambient background orbs */}
      <div style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none', overflow: 'hidden' }}>
        <div style={{
          position: 'absolute', width: '55%', height: '55%', top: '-5%', left: '-5%',
          background: `radial-gradient(ellipse, ${accentColor}28 0%, transparent 65%)`,
          filter: 'blur(50px)',
        }} />
        <div style={{
          position: 'absolute', width: '50%', height: '50%', bottom: '-5%', right: '-5%',
          background: `radial-gradient(ellipse, rgba(100,196,255,0.18) 0%, transparent 65%)`,
          filter: 'blur(50px)',
        }} />
        <div style={{
          position: 'absolute', width: '35%', height: '45%', top: '35%', right: '22%',
          background: `radial-gradient(ellipse, rgba(191,90,242,0.10) 0%, transparent 65%)`,
          filter: 'blur(60px)',
        }} />
      </div>

      {/* Left nav sidebar — desktop only (hidden via CSS on mobile) */}
      <div className="nav-sidebar-desktop" style={{ display: 'flex', flexShrink: 0 }}>
        <NavSidebar
          currentPage={page}
          onChangePage={setPage}
          onAddTask={() => openNewTask()}
          onOpenSettings={() => setShowSettings(true)}
          onLogin={() => setShowAuthModal(true)}
          onLock={() => setManualLocked(true)}
          onNavigateToCompany={(id) => { setEmpresasTarget(id); setPage('empresas'); }}
          onOpenAccount={() => setShowAccount(true)}
          onOpenWorkspaceManager={(editingId) => setWorkspaceManager({ open: true, editingId })}
        />
      </div>

      {/* Mobile bottom nav — only visible on narrow screens (controlled by CSS) */}
      <MobileBottomNav
        currentPage={page}
        onChangePage={setPage}
      />

      {/* Right column: top bar + content + bottom bar */}
      <div className="app-main-column" style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8, minWidth: 0, zIndex: 1 }}>

        {/* Top bar — separate box */}
        <div className="glass-panel app-top-bar" style={{
          flexShrink: 0, height: 52, borderRadius: 16,
          display: 'flex', alignItems: 'center',
          padding: '0 12px 0 16px', gap: 4,
          background: 'var(--sidebar-bg)',
          boxShadow: isLight ? 'inset 0 0 0 1px rgba(0,0,0,0.07), 0 4px 16px rgba(0,0,0,0.10)' : 'inset 0 0 0 1px rgba(255,255,255,0.09), 0 4px 16px rgba(0,0,0,0.28)',
        }}>
          {/* Nova Tarefa */}
          <button
            onClick={() => openNewTask()}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '7px 16px', borderRadius: 10,
              background: accentColor, border: 'none', cursor: 'pointer',
              color: '#fff', fontSize: 12, fontWeight: 600,
              boxShadow: `0 2px 10px ${accentColor}50`,
              transition: 'opacity .15s, transform .15s', flexShrink: 0,
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.opacity = '0.85'; (e.currentTarget as HTMLElement).style.transform = 'scale(1.02)'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.opacity = '1'; (e.currentTarget as HTMLElement).style.transform = 'none'; }}
          >
            <FiPlus size={13} strokeWidth={2.5} />
            Nova Tarefa
          </button>

          <div style={{ flex: 1 }} />

          {/* Offline indicator (#56) */}
          <AnimatePresence>
            {!isOnline && (
              <motion.div
                key="offline-pill"
                initial={{ opacity: 0, scale: 0.85, x: 6 }}
                animate={{ opacity: 1, scale: 1, x: 0 }}
                exit={{ opacity: 0, scale: 0.85, x: 6 }}
                transition={{ type: 'spring', damping: 22, stiffness: 300 }}
                style={{
                  display: 'flex', alignItems: 'center', gap: 5,
                  padding: '4px 10px', borderRadius: 999,
                  background: 'rgba(255,69,58,0.12)', border: '1px solid rgba(255,69,58,0.25)',
                  fontSize: 11, fontWeight: 600, color: '#ff453a', flexShrink: 0,
                }}
              >
                <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#ff453a' }} />
                Sem conexão
              </motion.div>
            )}
            {isOnline && showReconnected && (
              <motion.div
                key="reconnected-pill"
                initial={{ opacity: 0, scale: 0.85, x: 6 }}
                animate={{ opacity: 1, scale: 1, x: 0 }}
                exit={{ opacity: 0, scale: 0.85, x: 6 }}
                transition={{ type: 'spring', damping: 22, stiffness: 300 }}
                style={{
                  display: 'flex', alignItems: 'center', gap: 5,
                  padding: '4px 10px', borderRadius: 999,
                  background: 'rgba(48,209,88,0.12)', border: '1px solid rgba(48,209,88,0.25)',
                  fontSize: 11, fontWeight: 600, color: '#30d158', flexShrink: 0,
                }}
              >
                <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#30d158' }} />
                Reconectado
              </motion.div>
            )}
          </AnimatePresence>

          {/* Search */}
          <button
            onClick={() => setShowSearch(true)}
            title="Buscar (⌘K)"
            style={{ width: 32, height: 32, borderRadius: 8, background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--t3)', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all .15s' }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--s2)'; (e.currentTarget as HTMLElement).style.color = 'var(--t1)'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; (e.currentTarget as HTMLElement).style.color = 'var(--t3)'; }}
          >
            <FiSearch size={14} />
          </button>

          {/* Notifications */}
          <NotificationsBell
            count={notificationsCount}
            onClick={() => setShowNotifications(s => !s)}
          />

          {/* Sync indicator */}
          <div
            title={syncTooltip}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              padding: '6px 10px', borderRadius: 8,
              background: `${syncC.color}10`, border: `1px solid ${syncC.color}30`,
              color: syncC.color, fontSize: 11, fontWeight: 600,
              flexShrink: 0, marginLeft: 4, marginRight: 4,
            }}
          >
            {syncC.icon}
            <span>{syncC.label}</span>
          </div>

          {/* Fullscreen (#52) */}
          <button
            onClick={toggleFullscreen}
            title={isFullscreen ? 'Sair da tela cheia' : 'Tela cheia'}
            style={{ width: 32, height: 32, borderRadius: 8, background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--t3)', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all .15s' }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--s2)'; (e.currentTarget as HTMLElement).style.color = 'var(--t1)'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; (e.currentTarget as HTMLElement).style.color = 'var(--t3)'; }}
          >
            {isFullscreen ? <FiMinimize size={14} /> : <FiMaximize size={14} />}
          </button>

          {/* Pomodoro */}
          <button
            onClick={() => setShowPomodoro(s => !s)}
            title="Pomodoro"
            style={{
              height: 32, padding: '0 10px', borderRadius: 8, border: 'none',
              background: pomodoroDisplay
                ? (pomo.isBreak ? 'rgba(48,209,88,0.12)' : 'rgba(100,196,255,0.12)')
                : showPomodoro ? 'rgba(53,107,255,0.12)' : 'transparent',
              cursor: 'pointer',
              color: pomodoroDisplay
                ? (pomo.isBreak ? '#30d158' : '#64C4FF')
                : showPomodoro ? '#64C4FF' : 'var(--t3)',
              fontSize: 11, fontWeight: 600, transition: 'all .15s',
              display: 'flex', alignItems: 'center', gap: 5,
            }}
            onMouseEnter={e => { if (!pomodoroDisplay && !showPomodoro) { (e.currentTarget as HTMLElement).style.background = 'var(--s2)'; (e.currentTarget as HTMLElement).style.color = 'var(--t1)'; } }}
            onMouseLeave={e => { if (!pomodoroDisplay && !showPomodoro) { (e.currentTarget as HTMLElement).style.background = 'transparent'; (e.currentTarget as HTMLElement).style.color = 'var(--t3)'; } }}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
            </svg>
            {pomodoroDisplay ?? 'Pomodoro'}
          </button>

          {/* Theme */}
          <button
            onClick={toggleTheme}
            title={isLight ? 'Tema escuro' : 'Tema claro'}
            style={{ width: 32, height: 32, borderRadius: 8, background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--t3)', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all .15s' }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--s2)'; (e.currentTarget as HTMLElement).style.color = 'var(--t1)'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; (e.currentTarget as HTMLElement).style.color = 'var(--t3)'; }}
          >
            {isLight ? <FiMoon size={14} /> : <FiSun size={14} />}
          </button>

          {/* Help */}
          <button
            onClick={() => setShowHelp(true)}
            title="Como usar?"
            style={{ width: 32, height: 32, borderRadius: 8, background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--t3)', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all .15s' }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--s2)'; (e.currentTarget as HTMLElement).style.color = 'var(--t1)'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; (e.currentTarget as HTMLElement).style.color = 'var(--t3)'; }}
          >
            <FiHelpCircle size={14} />
          </button>

          {/* Divider */}
          <div style={{ width: 1, height: 18, background: 'var(--b2)', margin: '0 8px' }} />

          {/* Lock */}
          <button
            onClick={() => setManualLocked(true)}
            title="Bloquear tela"
            style={{ width: 32, height: 32, borderRadius: 8, background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--t3)', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all .15s' }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--s2)'; (e.currentTarget as HTMLElement).style.color = 'var(--t1)'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; (e.currentTarget as HTMLElement).style.color = 'var(--t3)'; }}
          >
            <FiLock size={14} />
          </button>

          {/* Profile */}
          <button
            onClick={() => setShowAccount(true)}
            style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '5px 10px', borderRadius: 10, cursor: 'pointer', transition: 'background .15s', background: 'transparent', border: 'none' }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--s2)'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
          >
            <div style={{
              width: 28, height: 28, borderRadius: '50%',
              background: userPhoto ? 'transparent' : `linear-gradient(135deg, ${accentColor}, #64C4FF)`,
              color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 11, fontWeight: 700, flexShrink: 0, overflow: 'hidden',
              boxShadow: `0 2px 8px ${accentColor}50`,
            }}>
              {userPhoto
                ? <img src={userPhoto} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                : (userName || 'U').charAt(0).toUpperCase()
              }
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.2 }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--t1)' }}>{userName || 'Usuário'}</span>
            </div>
            <FiChevronDown size={11} style={{ color: 'var(--t3)', flexShrink: 0 }} />
          </button>
        </div>

        {/* Main content — separate box */}
        <div className="glass-panel" style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', borderRadius: 16, background: 'var(--sidebar-bg)', boxShadow: isLight ? 'inset 0 0 0 1px rgba(0,0,0,0.07), 0 8px 32px rgba(0,0,0,0.12)' : 'inset 0 0 0 1px rgba(255,255,255,0.09), 0 8px 32px rgba(0,0,0,0.28)' }}>
        <AnimatePresence mode="wait">
          {showInitialSkeleton ? (
            <motion.main
              key="initial-skeleton"
              style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={pageTransition}
            >
              <PageSkeleton />
            </motion.main>
          ) : (
          <motion.main
            key={page}
            style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={pageTransition}
          >
            <Suspense fallback={<PageFallback />}>
              {page === 'home' && (
                <ErrorBoundary><HomePage onTaskClick={openTask} onNavigate={(p) => setPage(p)} /></ErrorBoundary>
              )}

              {page === 'empresas' && <ErrorBoundary><EmpresasPage defaultSelectedId={empresasTarget} onNavigate={(p) => setPage(p)} /></ErrorBoundary>}

              {page === 'arquivo' && <ErrorBoundary><ArchivePage /></ErrorBoundary>}

              {page === 'crm' && <ErrorBoundary><CRMPage /></ErrorBoundary>}

              {page === 'todo' && <ErrorBoundary><TodoPage /></ErrorBoundary>}

              {page === 'financas' && <ErrorBoundary><FinancePage /></ErrorBoundary>}

              {page === 'ideias' && <ErrorBoundary><IdeiasPage /></ErrorBoundary>}

              {page === 'propostas' && <ErrorBoundary><PropostasPage /></ErrorBoundary>}

              {page === 'inbox'      && <ErrorBoundary><InboxPage onTaskClick={openTask} onNavigate={(p) => setPage(p)} /></ErrorBoundary>}

              {/* Onda 5 — Agência */}
              {page === 'aprovacoes' && <ErrorBoundary><AprovacoesPage /></ErrorBoundary>}
              {page === 'editorial'  && <ErrorBoundary><EditorialPage /></ErrorBoundary>}
              {page === 'faturas'    && <ErrorBoundary><FaturasPage /></ErrorBoundary>}
              {page === 'briefings'  && <ErrorBoundary><BriefingsPage /></ErrorBoundary>}
              {page === 'onboarding' && <ErrorBoundary><OnboardingPage /></ErrorBoundary>}
              {page === 'snippets'   && <ErrorBoundary><SnippetsPage /></ErrorBoundary>}
              {page === 'kpis'       && <ErrorBoundary><KPIsPage /></ErrorBoundary>}
              {page === 'habitos'    && <ErrorBoundary><HabitosPage /></ErrorBoundary>}

              {page === 'tarefas' && (
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '20px 20px 0', overflow: 'hidden', minHeight: 0 }}>
                  <div style={{
                    flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, overflow: 'hidden',
                    background: viewMode === 'kanban' ? 'transparent' : 'var(--s1)',
                    borderRadius: viewMode === 'kanban' ? 0 : 16,
                  }}>
                    <AnimatePresence mode="wait">
                      <motion.div
                        key={viewMode}
                        style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column', minHeight: 0 }}
                        initial={{ opacity: 0, x: 10 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -10 }}
                        transition={animationsEnabled ? { duration: 0.16, ease: 'easeOut' } : { duration: 0 }}
                      >
                        <Suspense fallback={<PageFallback />}>
                          {viewMode === 'month'  && <MonthView onTaskClick={openTask} onDayClick={d => openNewTask(d)} />}
                          {viewMode === 'week'   && <WeekView  onTaskClick={openTask} onDayClick={d => openNewTask(d)} />}
                          {viewMode === 'day'    && <DayView   onTaskClick={openTask} onDayClick={d => openNewTask(d)} />}
                          {viewMode === 'kanban' && (
                            <KanbanView
                              onTaskClick={openTask}
                              onAddTask={(_s: TaskStatus) => openNewTask()}
                            />
                          )}
                        </Suspense>
                      </motion.div>
                    </AnimatePresence>
                  </div>
                </div>
              )}
            </Suspense>
          </motion.main>
          )}
        </AnimatePresence>
        </div>

        {/* Bottom bar — separate box, only on tarefas */}
        {page === 'tarefas' && (
          <div className="glass-panel" style={{ flexShrink: 0, borderRadius: 16, background: 'var(--sidebar-bg)', boxShadow: isLight ? 'inset 0 0 0 1px rgba(0,0,0,0.07), 0 4px 16px rgba(0,0,0,0.10)' : 'inset 0 0 0 1px rgba(255,255,255,0.09), 0 4px 16px rgba(0,0,0,0.28)' }}>
            <BottomBar onImportICS={() => setShowICSImport(true)} />
          </div>
        )}
      </div>

      {/* Task modal */}
      <AnimatePresence>
        {isModalOpen && (
          <TaskModal
            key="task-modal"
            task={modalTask}
            defaultDate={modalDate}
            onClose={closeModal}
            onOpenTask={openTask}
          />
        )}
      </AnimatePresence>

      {/* Settings modal */}
      <AnimatePresence>
        {showSettings && (
          <Suspense fallback={null}>
            <SettingsModal key="settings-modal" onClose={() => setShowSettings(false)} />
          </Suspense>
        )}
      </AnimatePresence>

      {/* Search modal */}
      <AnimatePresence>
        {showSearch && (
          <Suspense fallback={null}>
            <SearchModal
              key="search-modal"
              onClose={() => setShowSearch(false)}
              onTaskClick={(task) => { setShowSearch(false); openTask(task); }}
              onNavigate={(p, ctx) => {
                if (p === 'empresas' && ctx?.companyId) setEmpresasTarget(ctx.companyId);
                setPage(p);
                setShowSearch(false);
              }}
            />
          </Suspense>
        )}
      </AnimatePresence>

      {/* Pomodoro panel */}
      <AnimatePresence>
        {showPomodoro && (
          <PomodoroPanel
            key="pomodoro-panel"
            state={pomo}
            onStart={handlePomoStart}
            onPause={handlePomoPause}
            onStop={handlePomoStop}
            onClose={() => setShowPomodoro(false)}
          />
        )}
      </AnimatePresence>

      {/* Help modal */}
      <AnimatePresence>
        {showHelp && (
          <Suspense fallback={null}>
            <HelpModal onClose={() => setShowHelp(false)} />
          </Suspense>
        )}
      </AnimatePresence>

      {/* Account modal */}
      <AnimatePresence>
        {showAccount && (
          <Suspense fallback={null}>
            <AccountModal key="account-modal" onClose={() => setShowAccount(false)} onOpenBackup={() => { setShowAccount(false); setShowBackup(true); }} />
          </Suspense>
        )}
      </AnimatePresence>

      {/* Backup / data modal (#53–#57) */}
      <AnimatePresence>
        {showBackup && (
          <Suspense fallback={null}>
            <BackupModal key="backup-modal" onClose={() => setShowBackup(false)} />
          </Suspense>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showICSImport && (
          <Suspense fallback={null}>
            <ICSImportModal key="ics-modal" onClose={() => setShowICSImport(false)} />
          </Suspense>
        )}
      </AnimatePresence>

      {/* Calendar event modal */}
      <AnimatePresence>
        {showEventModal && (
          <CalendarEventModal
            key="event-modal"
            defaultCategory={calendarCategoryFilter !== 'todos' && calendarCategoryFilter !== 'agencia' && calendarCategoryFilter !== 'feriado'
              ? calendarCategoryFilter as CalendarEventCategory
              : 'evento'}
            onClose={() => setShowEventModal(false)}
          />
        )}
      </AnimatePresence>

      {/* Workspace manager modal */}
      <AnimatePresence>
        {workspaceManager.open && (
          <Suspense fallback={null}>
            <WorkspaceModal
              key={`ws-modal-${workspaceManager.editingId ?? 'new'}`}
              workspaceId={workspaceManager.editingId}
              onClose={() => setWorkspaceManager({ open: false })}
            />
          </Suspense>
        )}
      </AnimatePresence>

      {/* Auth gate */}
      {!authLoading && import.meta.env.VITE_SUPABASE_URL && !guestMode && (!user || showAuthModal) && (
        <Suspense fallback={null}>
          <AuthModal onClose={user ? () => setShowAuthModal(false) : undefined} />
        </Suspense>
      )}

      {/* Guest mode banner */}
      {guestMode && !user && (
        <div style={{
          position: 'fixed', bottom: 16, right: 16, zIndex: 900,
          background: 'var(--modal-bg)',
          borderRadius: 12, padding: '10px 14px',
          display: 'flex', alignItems: 'center', gap: 10,
          boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
          fontSize: 12, color: 'var(--t3)',
        }}>
          <span>Modo Convidado — dados apenas locais</span>
          <button
            onClick={() => setGuestMode(false)}
            style={{
              fontSize: 11, fontWeight: 600, color: '#356BFF',
              background: 'none', border: 'none', cursor: 'pointer', padding: 0,
            }}
          >
            Entrar
          </button>
        </div>
      )}

      {/* Lock screen — both startup PIN lock and manual lock */}
      <AnimatePresence>
        {(pinLocked || manualLocked) && (
          <LockScreen
            userName={userName}
            userPhoto={userPhoto}
            hasPin={!!localStorage.getItem('evo-tasks-pin')}
            onUnlock={() => { setPinLocked(false); setManualLocked(false); }}
          />
        )}
      </AnimatePresence>

      {/* Global undo toast */}
      <AnimatePresence>
        {toast && (
          <motion.div
            key="toast"
            initial={{ opacity: 0, y: 20, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.96 }}
            transition={{ type: 'spring', damping: 28, stiffness: 360 }}
            style={{
              position: 'fixed', bottom: 28, left: '50%', transform: 'translateX(-50%)',
              zIndex: 999,
              background: themeVars.isLight ? 'rgba(30,30,30,0.92)' : 'rgba(255,255,255,0.10)',
              backdropFilter: 'blur(12px)',
              border: 'none',
              borderRadius: 12, padding: '12px 18px',
              display: 'flex', alignItems: 'center', gap: 16,
              boxShadow: '0 8px 32px rgba(0,0,0,0.25)',
              whiteSpace: 'nowrap',
            }}
          >
            <span style={{ fontSize: 13, color: '#fff', fontWeight: 500 }}>{toast.text}</span>
            {toast.undoFn && (
              <button
                onClick={toast.undoFn}
                style={{ fontSize: 12, fontWeight: 700, color: '#64C4FF', background: 'none', border: 'none', cursor: 'pointer', padding: '2px 4px', borderRadius: 4 }}
              >
                Desfazer
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Notifications hub */}
      <AnimatePresence>
        {showNotifications && (
          <NotificationsPanel
            key="notifications-panel"
            open={showNotifications}
            onClose={() => setShowNotifications(false)}
            onNavigate={(p) => setPage(p)}
          />
        )}
      </AnimatePresence>

      <ToastContainer />
    </div>
  );
}
