import { useState, useEffect, useMemo } from 'react';
import { FiClock, FiPlay, FiSquare, FiTrash2, FiPlus, FiChevronDown } from 'react-icons/fi';
import { format, isToday, isYesterday, startOfWeek, eachDayOfInterval, endOfWeek, parseISO, startOfMonth, isSameDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useTimeTrackingStore } from '../store/timeTracking';
import { useTaskStore } from '../store/tasks';
import { useWorkspacesStore, useVisibleWorkspaceIds, isInLens } from '../store/workspaces';

// ── helpers ─────────────────────────────────────────────────────────────────
function fmtDuration(secs: number): string {
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = secs % 60;
  if (h > 0) return `${h}h ${m > 0 ? m + 'm' : ''}`.trim();
  if (m > 0) return `${m}m ${s > 0 ? s + 's' : ''}`.trim();
  return `${s}s`;
}

function fmtDurationShort(secs: number): string {
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  if (h > 0) return `${h}h${m > 0 ? ` ${m}m` : ''}`;
  return `${m}m`;
}

function fmtClock(secs: number): string {
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = secs % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function dayLabel(dateStr: string): string {
  try {
    const d = parseISO(dateStr);
    if (isToday(d)) return 'Hoje';
    if (isYesterday(d)) return 'Ontem';
    return format(d, "EEE, d 'de' MMM", { locale: ptBR });
  } catch { return dateStr; }
}

interface DisplayEntry {
  id: string;
  taskId?: string;
  companyId?: string;
  description?: string;
  startedAt: string;
  endedAt?: string;
  duration: number;
  source: 'manual' | 'pomodoro';
  isManual: boolean;
}

// ── AddEntryModal ────────────────────────────────────────────────────────────
function AddEntryModal({ onClose, accentColor }: { onClose: () => void; accentColor: string }) {
  const { addEntry } = useTimeTrackingStore();
  const { tasks, companies } = useTaskStore();
  const workspaceId = useWorkspacesStore(s => s.activeWorkspaceId ?? undefined);
  const [taskId, setTaskId] = useState('');
  const [companyId, setCompanyId] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('10:00');

  const activeTasks = useMemo(() => tasks.filter(t => !t.deletedAt && !t.archived), [tasks]);
  const activeCompanies = useMemo(() => companies.filter(c => !c.deletedAt), [companies]);

  const duration = useMemo(() => {
    try {
      const start = new Date(`${date}T${startTime}`);
      const end = new Date(`${date}T${endTime}`);
      const diff = Math.round((end.getTime() - start.getTime()) / 1000);
      return diff > 0 ? diff : 0;
    } catch { return 0; }
  }, [date, startTime, endTime]);

  const handleAdd = () => {
    if (duration <= 0) return;
    addEntry({
      workspaceId,
      taskId: taskId || undefined,
      companyId: companyId || undefined,
      description: description.trim() || undefined,
      startedAt: new Date(`${date}T${startTime}`).toISOString(),
      endedAt: new Date(`${date}T${endTime}`).toISOString(),
      duration,
      source: 'manual',
    });
    onClose();
  };

  const inp: React.CSSProperties = { padding: '8px 11px', borderRadius: 8, background: 'var(--s1)', border: '1px solid var(--b2)', color: 'var(--t1)', fontSize: 13, outline: 'none', width: '100%', boxSizing: 'border-box' as const };

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.6)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{ background: 'var(--modal-bg)', borderRadius: 18, padding: 24, width: 440, boxShadow: '0 24px 64px rgba(0,0,0,0.4)', display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--t1)', flex: 1 }}>Registrar tempo</span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--t4)', fontSize: 18, lineHeight: 1 }}>×</button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
          <label style={{ fontSize: 10, fontWeight: 700, color: 'var(--t4)', textTransform: 'uppercase', letterSpacing: '1px' }}>Tarefa (opcional)</label>
          <select value={taskId} onChange={e => setTaskId(e.target.value)} style={inp}>
            <option value="">Sem tarefa vinculada</option>
            {activeTasks.map(t => <option key={t.id} value={t.id}>{t.taskType ?? t.customType ?? t.id}</option>)}
          </select>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
          <label style={{ fontSize: 10, fontWeight: 700, color: 'var(--t4)', textTransform: 'uppercase', letterSpacing: '1px' }}>Cliente (opcional)</label>
          <select value={companyId} onChange={e => setCompanyId(e.target.value)} style={inp}>
            <option value="">Sem cliente</option>
            {activeCompanies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
          <label style={{ fontSize: 10, fontWeight: 700, color: 'var(--t4)', textTransform: 'uppercase', letterSpacing: '1px' }}>Descrição</label>
          <input value={description} onChange={e => setDescription(e.target.value)} placeholder="O que você fez?" style={inp} />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            <label style={{ fontSize: 10, fontWeight: 700, color: 'var(--t4)', textTransform: 'uppercase', letterSpacing: '1px' }}>Data</label>
            <input type="date" value={date} onChange={e => setDate(e.target.value)} style={inp} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            <label style={{ fontSize: 10, fontWeight: 700, color: 'var(--t4)', textTransform: 'uppercase', letterSpacing: '1px' }}>Início</label>
            <input type="time" value={startTime} onChange={e => setStartTime(e.target.value)} style={inp} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            <label style={{ fontSize: 10, fontWeight: 700, color: 'var(--t4)', textTransform: 'uppercase', letterSpacing: '1px' }}>Fim</label>
            <input type="time" value={endTime} onChange={e => setEndTime(e.target.value)} style={inp} />
          </div>
        </div>

        {duration > 0 && (
          <div style={{ fontSize: 12, color: 'var(--t3)', textAlign: 'center' }}>
            Duração: <strong style={{ color: accentColor }}>{fmtDuration(duration)}</strong>
          </div>
        )}

        <button onClick={handleAdd} disabled={duration <= 0}
          style={{ padding: '11px', borderRadius: 10, background: duration > 0 ? accentColor : 'var(--s1)', border: 'none', color: duration > 0 ? '#fff' : 'var(--t4)', cursor: duration > 0 ? 'pointer' : 'not-allowed', fontSize: 13, fontWeight: 700 }}
        >Adicionar entrada</button>
      </div>
    </div>
  );
}

// ── Main page ────────────────────────────────────────────────────────────────
export function TimeTrackingPage() {
  const { entries, activeTimer, startTimer, stopTimer, deleteEntry } = useTimeTrackingStore();
  const { tasks, companies, pomodoroSessions, accentColor } = useTaskStore();
  const activeWorkspaceId = useWorkspacesStore(s => s.activeWorkspaceId);
  const visibleIds = useVisibleWorkspaceIds();

  const [periodFilter, setPeriodFilter] = useState<'today' | 'week' | 'month' | 'all'>('week');
  const [elapsed, setElapsed] = useState(() => {
    const timer = useTimeTrackingStore.getState().activeTimer;
    return timer ? Math.round((Date.now() - new Date(timer.startedAt).getTime()) / 1000) : 0;
  });
  const [timerTaskId, setTimerTaskId] = useState('');
  const [timerDesc, setTimerDesc] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showTaskDrop, setShowTaskDrop] = useState(false);

  // Live elapsed counter
  useEffect(() => {
    if (!activeTimer) { setElapsed(0); return; }
    const tick = () => {
      setElapsed(Math.round((Date.now() - new Date(activeTimer.startedAt).getTime()) / 1000));
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [activeTimer]);

  const activeTasks = useMemo(() => tasks.filter(t => !t.deletedAt && !t.archived), [tasks]);

  const getTaskLabel = (taskId?: string) => {
    if (!taskId) return null;
    const t = tasks.find(x => x.id === taskId);
    if (!t) return 'Tarefa removida';
    return t.taskType ?? t.customType ?? 'Tarefa';
  };

  const getCompanyColor = (companyId?: string) => companies.find(c => c.id === companyId)?.color ?? 'var(--t4)';

  // Merge entries + pomodoro sessions into DisplayEntry[]
  const allEntries: DisplayEntry[] = useMemo(() => {
    const manual: DisplayEntry[] = entries
      .filter(e => !e.deletedAt && isInLens(e, visibleIds))
      .map(e => ({
        id: e.id,
        taskId: e.taskId,
        companyId: e.companyId,
        description: e.description,
        startedAt: e.startedAt,
        endedAt: e.endedAt,
        duration: e.duration ?? 0,
        source: 'manual' as const,
        isManual: true,
      }));

    const pomo: DisplayEntry[] = pomodoroSessions
      .filter(s => !s.isBreak)
      .map(s => ({
        id: s.id,
        taskId: s.linkedTaskId,
        description: 'Sessão Pomodoro',
        startedAt: s.startedAt,
        endedAt: new Date(new Date(s.startedAt).getTime() + s.duration * 1000).toISOString(),
        duration: s.duration,
        source: 'pomodoro' as const,
        isManual: false,
      }));

    return [...manual, ...pomo].sort((a, b) => b.startedAt.localeCompare(a.startedAt));
  }, [entries, pomodoroSessions, visibleIds]);

  const filteredEntries = useMemo(() => {
    const now = new Date();
    return allEntries.filter(e => {
      try {
        const d = parseISO(e.startedAt);
        if (periodFilter === 'today') return isToday(d);
        if (periodFilter === 'week') return d >= startOfWeek(now, { weekStartsOn: 1 });
        if (periodFilter === 'month') return d >= startOfMonth(now);
        return true;
      } catch { return true; }
    });
  }, [allEntries, periodFilter]);

  // Stats
  const now = new Date();
  const todayStr = format(now, 'yyyy-MM-dd');
  const weekStart = startOfWeek(now, { weekStartsOn: 1 });
  const monthStart = startOfMonth(now);

  const todaySecs = useMemo(() =>
    allEntries.filter(e => e.startedAt.startsWith(todayStr)).reduce((a, e) => a + e.duration, 0),
    [allEntries, todayStr]
  );

  const weekSecs = useMemo(() =>
    allEntries.filter(e => {
      try { return parseISO(e.startedAt) >= weekStart; } catch { return false; }
    }).reduce((a, e) => a + e.duration, 0),
    [allEntries, weekStart]
  );

  const monthSecs = useMemo(() =>
    allEntries.filter(e => {
      try { return parseISO(e.startedAt) >= monthStart; } catch { return false; }
    }).reduce((a, e) => a + e.duration, 0),
    [allEntries, monthStart]
  );

  // Week chart data (Mon–Sun)
  const weekDays = eachDayOfInterval({ start: weekStart, end: endOfWeek(now, { weekStartsOn: 1 }) });
  const weekBarData = weekDays.map(day => {
    const secs = allEntries
      .filter(e => { try { return isSameDay(parseISO(e.startedAt), day); } catch { return false; } })
      .reduce((a, e) => a + e.duration, 0);
    return { day, secs };
  });
  const maxBarSecs = Math.max(...weekBarData.map(d => d.secs), 1);

  // Group entries by date
  const grouped = useMemo(() => {
    const map: Record<string, DisplayEntry[]> = {};
    filteredEntries.forEach(e => {
      const key = e.startedAt.slice(0, 10);
      if (!map[key]) map[key] = [];
      map[key].push(e);
    });
    return Object.entries(map).sort(([a], [b]) => b.localeCompare(a));
  }, [filteredEntries]);

  const handleStart = () => {
    startTimer({
      workspaceId: activeWorkspaceId ?? undefined,
      taskId: timerTaskId || undefined,
      description: timerDesc.trim() || undefined,
    });
    setTimerTaskId('');
    setTimerDesc('');
  };

  // Space bar = toggle timer (when not focused on input)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code !== 'Space') return;
      const tag = (e.target as HTMLElement).tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      e.preventDefault();
      const { activeTimer: t, startTimer: start, stopTimer: stop } = useTimeTrackingStore.getState();
      if (t) stop();
      else start({ workspaceId: activeWorkspaceId ?? undefined });
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeWorkspaceId]);

  const timerTask = activeTimer?.taskId ? getTaskLabel(activeTimer.taskId) : null;
  const timerLinkedTask = activeTimer?.taskId ? tasks.find(t => t.id === activeTimer.taskId) ?? null : null;
  const timerCompany = timerLinkedTask?.companyId ? companies.find(c => c.id === timerLinkedTask.companyId) ?? null : null;

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: 24, gap: 20, overflowY: 'auto' }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
        <FiClock size={18} style={{ color: accentColor }} />
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: 'var(--t1)', margin: 0 }}>Time Tracking</h1>
          <p style={{ fontSize: 12, color: 'var(--t4)', margin: '2px 0 0' }}>Controle de horas e sessões</p>
        </div>
        <div style={{ flex: 1 }} />
        <button
          onClick={() => setShowAddModal(true)}
          style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 10, background: accentColor, border: 'none', color: '#fff', cursor: 'pointer', fontSize: 12, fontWeight: 600 }}
        >
          <FiPlus size={13} /> Registrar
        </button>
      </div>

      {/* Stats chips */}
      <div style={{ display: 'flex', gap: 10, flexShrink: 0 }}>
        {[
          { label: 'Hoje', secs: todaySecs },
          { label: 'Esta semana', secs: weekSecs },
          { label: 'Este mês', secs: monthSecs },
        ].map(({ label, secs }) => (
          <div key={label} style={{ flex: 1, padding: '12px 16px', borderRadius: 12, background: 'var(--s1)', border: '1px solid var(--b1)' }}>
            <div style={{ fontSize: 10, color: 'var(--t4)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 4 }}>{label}</div>
            <div style={{ fontSize: 22, fontWeight: 700, color: secs > 0 ? accentColor : 'var(--t4)' }}>
              {secs > 0 ? fmtDurationShort(secs) : '—'}
            </div>
          </div>
        ))}
      </div>

      {/* Active Timer / Start Timer */}
      <div style={{ borderRadius: 14, background: activeTimer ? `${accentColor}10` : 'var(--s1)', border: `1px solid ${activeTimer ? `${accentColor}30` : 'var(--b1)'}`, padding: '16px 20px', flexShrink: 0 }}>
        {activeTimer ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#30d158', animation: 'pulse 1.4s ease-in-out infinite', flexShrink: 0 }} />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 28, fontWeight: 700, color: accentColor, letterSpacing: '0.5px', fontVariantNumeric: 'tabular-nums' }}>
                {fmtClock(elapsed)}
              </div>
              <div style={{ fontSize: 12, color: 'var(--t3)', marginTop: 2 }}>
                {timerTask ? `${timerTask}${timerCompany ? ` · ${timerCompany.name}` : ''}` : 'Sessão livre'}
                {activeTimer.description && <span style={{ color: 'var(--t4)' }}> — {activeTimer.description}</span>}
              </div>
            </div>
            <button onClick={stopTimer}
              style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '10px 18px', borderRadius: 10, background: '#ff453a20', border: '1px solid #ff453a40', color: '#ff453a', cursor: 'pointer', fontSize: 13, fontWeight: 700 }}
            >
              <FiSquare size={13} /> Parar
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <FiPlay size={14} style={{ color: 'var(--t4)', flexShrink: 0 }} />
            <div style={{ position: 'relative', flexShrink: 0 }}>
              <button
                onClick={() => setShowTaskDrop(p => !p)}
                style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 12px', borderRadius: 8, background: 'var(--s2)', border: '1px solid var(--b2)', color: 'var(--t2)', cursor: 'pointer', fontSize: 12, whiteSpace: 'nowrap' }}
              >
                {timerTaskId ? (getTaskLabel(timerTaskId) ?? 'Tarefa') : 'Vincular tarefa'}
                <FiChevronDown size={11} />
              </button>
              {showTaskDrop && (
                <div style={{ position: 'absolute', top: '100%', left: 0, zIndex: 200, background: 'var(--modal-bg)', border: '1px solid var(--b2)', borderRadius: 10, padding: 6, marginTop: 4, minWidth: 200, maxHeight: 200, overflowY: 'auto', boxShadow: '0 8px 24px rgba(0,0,0,0.3)' }}>
                  <div onClick={() => { setTimerTaskId(''); setShowTaskDrop(false); }}
                    style={{ padding: '6px 10px', borderRadius: 6, cursor: 'pointer', fontSize: 12, color: 'var(--t3)' }}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--s2)'; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
                  >Sem tarefa</div>
                  {activeTasks.map(t => (
                    <div key={t.id} onClick={() => { setTimerTaskId(t.id); setShowTaskDrop(false); }}
                      style={{ padding: '6px 10px', borderRadius: 6, cursor: 'pointer', fontSize: 12, color: 'var(--t1)', display: 'flex', alignItems: 'center', gap: 6 }}
                      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--s2)'; }}
                      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
                    >
                      {t.companyId && <div style={{ width: 6, height: 6, borderRadius: '50%', background: getCompanyColor(t.companyId), flexShrink: 0 }} />}
                      {t.taskType ?? t.customType ?? 'Tarefa'}
                    </div>
                  ))}
                </div>
              )}
            </div>
            <input
              value={timerDesc}
              onChange={e => setTimerDesc(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleStart()}
              placeholder="O que você está fazendo?"
              style={{ flex: 1, padding: '8px 12px', borderRadius: 8, background: 'var(--s2)', border: '1px solid var(--b2)', color: 'var(--t1)', fontSize: 13, outline: 'none' }}
            />
            <button onClick={handleStart}
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 16px', borderRadius: 9, background: accentColor, border: 'none', color: '#fff', cursor: 'pointer', fontSize: 13, fontWeight: 700, flexShrink: 0 }}
            >
              <FiPlay size={12} /> Iniciar
            </button>
          </div>
        )}
      </div>

      {/* Week chart */}
      <div style={{ borderRadius: 14, background: 'var(--s1)', border: '1px solid var(--b1)', padding: '16px 20px', flexShrink: 0 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--t4)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 12 }}>Esta semana</div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end', height: 64 }}>
          {weekBarData.map(({ day, secs }) => {
            const barH = secs > 0 ? Math.max(4, Math.round((secs / maxBarSecs) * 56)) : 0;
            const isCurrentDay = isToday(day);
            return (
              <div key={day.toISOString()} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                {secs > 0 && (
                  <span style={{ fontSize: 8, color: isCurrentDay ? accentColor : 'var(--t4)', fontWeight: 600 }}>
                    {fmtDurationShort(secs)}
                  </span>
                )}
                <div style={{ flex: 1, width: '100%', display: 'flex', alignItems: 'flex-end' }}>
                  <div style={{
                    width: '100%', height: barH || 2,
                    borderRadius: 4,
                    background: isCurrentDay ? accentColor : secs > 0 ? `${accentColor}50` : 'var(--b1)',
                    transition: 'height .3s ease',
                  }} />
                </div>
                <span style={{ fontSize: 9, color: isCurrentDay ? accentColor : 'var(--t4)', fontWeight: isCurrentDay ? 700 : 400 }}>
                  {format(day, 'EEE', { locale: ptBR })}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Period filter */}
      <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexShrink: 0 }}>
        <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--t4)', textTransform: 'uppercase', letterSpacing: '1px' }}>Mostrar:</span>
        {([
          { key: 'today', label: 'Hoje' },
          { key: 'week',  label: 'Esta semana' },
          { key: 'month', label: 'Este mês' },
          { key: 'all',   label: 'Tudo' },
        ] as const).map(({ key, label }) => (
          <button key={key} onClick={() => setPeriodFilter(key)}
            style={{ padding: '5px 10px', borderRadius: 8, border: `1px solid ${periodFilter === key ? accentColor : 'var(--b2)'}`, background: periodFilter === key ? `${accentColor}14` : 'transparent', color: periodFilter === key ? accentColor : 'var(--t3)', fontSize: 11, fontWeight: 600, cursor: 'pointer', transition: 'all .12s' }}
          >{label}</button>
        ))}
      </div>

      {/* Entries grouped by day */}
      {grouped.length === 0 ? (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10, color: 'var(--t4)' }}>
          <FiClock size={32} style={{ opacity: 0.3 }} />
          <div style={{ fontSize: 14, fontWeight: 600 }}>Nenhuma entrada registrada</div>
          <div style={{ fontSize: 12, color: 'var(--t4)' }}>Inicie o timer ou registre manualmente</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {grouped.map(([dateKey, dayEntries]) => {
            const dayTotal = dayEntries.reduce((a, e) => a + e.duration, 0);
            return (
              <div key={dateKey}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--t2)' }}>{dayLabel(dateKey)}</span>
                  <div style={{ flex: 1, height: 1, background: 'var(--b1)' }} />
                  <span style={{ fontSize: 11, color: 'var(--t4)', fontWeight: 600 }}>{fmtDuration(dayTotal)}</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {dayEntries.map(entry => {
                    const company = entry.companyId ? companies.find(c => c.id === entry.companyId) : null;
                    const taskLabel = getTaskLabel(entry.taskId);
                    const taskCompany = entry.taskId
                      ? companies.find(c => tasks.find(t => t.id === entry.taskId)?.companyId === c.id)
                      : null;
                    const displayCompany = company ?? taskCompany;
                    const color = displayCompany?.color ?? 'var(--t4)';

                    return (
                      <div key={entry.id}
                        style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderRadius: 10, background: 'var(--s1)', border: '1px solid var(--b1)' }}
                      >
                        <div style={{
                          width: 28, height: 28, borderRadius: 8,
                          background: entry.source === 'pomodoro' ? 'rgba(255,69,58,0.12)' : `${accentColor}12`,
                          display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                        }}>
                          <FiClock size={13} style={{ color: entry.source === 'pomodoro' ? '#ff453a' : accentColor }} />
                        </div>

                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--t1)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {entry.description || taskLabel || 'Sessão de trabalho'}
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
                            {displayCompany && (
                              <>
                                <div style={{ width: 6, height: 6, borderRadius: '50%', background: color, flexShrink: 0 }} />
                                <span style={{ fontSize: 11, color: 'var(--t4)' }}>{displayCompany.name}</span>
                              </>
                            )}
                            {entry.startedAt && (
                              <span style={{ fontSize: 11, color: 'var(--t4)' }}>
                                {format(parseISO(entry.startedAt), 'HH:mm')}
                                {entry.endedAt ? ` → ${format(parseISO(entry.endedAt), 'HH:mm')}` : ''}
                              </span>
                            )}
                            <span style={{ fontSize: 10, padding: '1px 5px', borderRadius: 4, background: entry.source === 'pomodoro' ? 'rgba(255,69,58,0.12)' : `${accentColor}12`, color: entry.source === 'pomodoro' ? '#ff453a' : accentColor, fontWeight: 600 }}>
                              {entry.source === 'pomodoro' ? 'Pomodoro' : 'Manual'}
                            </span>
                          </div>
                        </div>

                        <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--t2)', flexShrink: 0, minWidth: 48, textAlign: 'right' }}>
                          {fmtDurationShort(entry.duration)}
                        </div>

                        {entry.isManual && (
                          <button onClick={() => deleteEntry(entry.id)}
                            style={{ width: 28, height: 28, borderRadius: 7, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--t4)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
                            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = '#ff453a'; }}
                            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'var(--t4)'; }}
                          >
                            <FiTrash2 size={13} />
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showAddModal && <AddEntryModal onClose={() => setShowAddModal(false)} accentColor={accentColor} />}
    </div>
  );
}
