import { useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { NavSidebar } from './components/NavSidebar';
import { BottomBar } from './components/BottomBar';
import { HomePage } from './components/HomePage';
import { EmpresasPage } from './components/EmpresasPage';
import { ArchivePage } from './components/ArchivePage';
import { CRMPage } from './components/CRMPage';
import { MonthView } from './components/views/MonthView';
import { WeekView } from './components/views/WeekView';
import { DayView } from './components/views/DayView';
import { KanbanView } from './components/views/KanbanView';
import { TaskModal } from './components/TaskModal';
import { SettingsModal } from './components/SettingsModal';
import { SearchModal } from './components/SearchModal';
import { PinModal } from './components/PinModal';
import { AuthModal } from './components/AuthModal';
import { PomodoroPanel } from './components/PomodoroPanel';
import { useTaskStore } from './store/tasks';
import { useAuthStore } from './store/auth';
import { loadFromSupabase } from './lib/supabaseSync';
import { THEME_VARS } from './types';
import type { Task, TaskStatus, PageType } from './types';
import './index.css';

export default function App() {
  const { viewMode, theme, toast, setUserId, animationsEnabled, setAnimationsEnabled } = useTaskStore();
  const { user, loading: authLoading, initialize, guestMode, setGuestMode } = useAuthStore();
  const themeVars = THEME_VARS[theme];

  useEffect(() => { initialize(); }, []);

  useEffect(() => {
    if (user) {
      setUserId(user.id);
      loadFromSupabase(user.id).catch(console.error);
    } else {
      setUserId(null);
    }
  }, [user]);

  const [page, setPage] = useState<PageType>('home');
  const [modalTask,    setModalTask]    = useState<Task | null | undefined>(undefined);
  const [modalDate,    setModalDate]    = useState<string | undefined>(undefined);
  const [showSettings,   setShowSettings]   = useState(false);
  const [showSearch,     setShowSearch]     = useState(false);
  const [showAuthModal,  setShowAuthModal]  = useState(false);
  const [pinLocked,      setPinLocked]      = useState(() => !!localStorage.getItem('evo-tasks-pin'));
  const [showPomodoro,   setShowPomodoro]   = useState(false);
  const [pomodoroDisplay, setPomodoroDisplay] = useState<string | null>(null);

  const openNewTask = (date?: string) => { setModalDate(date); setModalTask(null); };
  const openTask    = (task: Task)    => { setModalTask(task); setModalDate(undefined); };
  const closeModal  = ()              => { setModalTask(undefined); setModalDate(undefined); };

  const isModalOpen = modalTask !== undefined;

  // #14 — "N" abre nova tarefa; #61 — ⌘K abre busca
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName;
      const inInput = tag === 'INPUT' || tag === 'TEXTAREA' || (e.target as HTMLElement).isContentEditable;

      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setShowSearch(s => !s);
        return;
      }
      if (!inInput && !isModalOpen && !showSettings && !showSearch && e.key === 'n') {
        openNewTask();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isModalOpen, showSettings, showSearch]);

  const cssVars = {
    '--t1': themeVars.t1, '--t2': themeVars.t2, '--t3': themeVars.t3, '--t4': themeVars.t4,
    '--s1': themeVars.s1, '--s2': themeVars.s2,
    '--b1': themeVars.b1, '--b2': themeVars.b2, '--b3': themeVars.b3,
    '--ib': themeVars.ib,
    '--modal-bg': themeVars.modalBg,
    '--sidebar-bg': themeVars.sidebarBg,
  } as React.CSSProperties;

  const pageTransition = animationsEnabled
    ? { duration: 0.18, ease: 'easeOut' as const }
    : { duration: 0 };

  return (
    <div
      className={animationsEnabled ? '' : 'no-animations'}
      style={{ display: 'flex', height: '100vh', background: themeVars.appBg, overflow: 'hidden', ...cssVars }}
    >
      {/* Left nav sidebar */}
      <NavSidebar
        currentPage={page}
        onChangePage={setPage}
        onAddTask={() => openNewTask()}
        onOpenSettings={() => setShowSettings(true)}
        onLogin={() => setShowAuthModal(true)}
      />

      {/* Main content */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 }}>

        {/* Top bar */}
        <div style={{
          height: 36, flexShrink: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'flex-end',
          padding: '0 12px', gap: 6,
          borderBottom: '1px solid var(--b1)',
          background: 'var(--sidebar-bg)',
        }}>
          {/* Animations toggle */}
          <button
            onClick={() => setAnimationsEnabled(!animationsEnabled)}
            title={animationsEnabled ? 'Desativar animações' : 'Ativar animações'}
            style={{
              height: 24, padding: '0 8px', borderRadius: 6,
              background: animationsEnabled ? 'rgba(53,107,255,0.12)' : 'var(--s2)',
              border: '1px solid var(--b2)', cursor: 'pointer',
              color: animationsEnabled ? '#64C4FF' : 'var(--t3)',
              fontSize: 10, fontWeight: 600, letterSpacing: '0.5px',
              transition: 'all .15s',
              display: 'flex', alignItems: 'center', gap: 4,
            }}
          >
            ✦ {animationsEnabled ? 'Anim' : 'Anim off'}
          </button>

          {/* Pomodoro button */}
          <button
            onClick={() => setShowPomodoro(s => !s)}
            title="Pomodoro Timer"
            style={{
              height: 24, padding: '0 8px', borderRadius: 6,
              background: showPomodoro ? 'rgba(53,107,255,0.15)' : 'var(--s2)',
              border: `1px solid ${showPomodoro ? 'rgba(53,107,255,0.4)' : 'var(--b2)'}`,
              cursor: 'pointer',
              color: showPomodoro ? '#64C4FF' : 'var(--t2)',
              fontSize: 11, fontWeight: 600,
              transition: 'all .15s',
              display: 'flex', alignItems: 'center', gap: 4,
            }}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
            {pomodoroDisplay ?? 'Timer'}
          </button>
        </div>

        <AnimatePresence mode="wait">
          <motion.main
            key={page}
            style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={pageTransition}
          >
            {page === 'home' && (
              <HomePage onTaskClick={openTask} onNavigate={(p) => setPage(p)} />
            )}

            {page === 'empresas' && <EmpresasPage />}

            {page === 'arquivo' && <ArchivePage />}

            {page === 'crm' && <CRMPage />}

            {page === 'tarefas' && (
              <>
                <AnimatePresence mode="wait">
                  <motion.div
                    key={viewMode}
                    style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -10 }}
                    transition={animationsEnabled ? { duration: 0.16, ease: 'easeOut' } : { duration: 0 }}
                  >
                    {viewMode === 'month'  && <MonthView onTaskClick={openTask} onDayClick={d => openNewTask(d)} />}
                    {viewMode === 'week'   && <WeekView  onTaskClick={openTask} onDayClick={d => openNewTask(d)} />}
                    {viewMode === 'day'    && <DayView   onTaskClick={openTask} onDayClick={d => openNewTask(d)} />}
                    {viewMode === 'kanban' && (
                      <KanbanView
                        onTaskClick={openTask}
                        onAddTask={(_s: TaskStatus) => openNewTask()}
                      />
                    )}
                  </motion.div>
                </AnimatePresence>
              </>
            )}
          </motion.main>
        </AnimatePresence>

        {/* Bottom bar — only on tarefas */}
        {page === 'tarefas' && <BottomBar />}
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
          <SettingsModal key="settings-modal" onClose={() => setShowSettings(false)} />
        )}
      </AnimatePresence>

      {/* Search modal */}
      <AnimatePresence>
        {showSearch && (
          <SearchModal
            key="search-modal"
            onClose={() => setShowSearch(false)}
            onTaskClick={(task) => { setShowSearch(false); openTask(task); }}
          />
        )}
      </AnimatePresence>

      {/* Pomodoro panel */}
      <AnimatePresence>
        {showPomodoro && (
          <PomodoroPanel
            key="pomodoro-panel"
            onClose={() => setShowPomodoro(false)}
            onTick={(display) => setPomodoroDisplay(display)}
          />
        )}
      </AnimatePresence>

      {/* Auth gate */}
      {!authLoading && import.meta.env.VITE_SUPABASE_URL && !guestMode && (!user || showAuthModal) && (
        <AuthModal onClose={user ? () => setShowAuthModal(false) : undefined} />
      )}

      {/* Guest mode banner */}
      {guestMode && !user && (
        <div style={{
          position: 'fixed', bottom: 16, right: 16, zIndex: 900,
          background: 'var(--modal-bg)', border: '1px solid var(--b2)',
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

      {/* PIN lock */}
      {pinLocked && <PinModal onUnlock={() => setPinLocked(false)} />}

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
              border: themeVars.isLight ? 'none' : '1px solid rgba(255,255,255,0.15)',
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
    </div>
  );
}
