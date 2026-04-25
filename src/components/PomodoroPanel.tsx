import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { FiMinus, FiPlay, FiPause, FiSquare, FiVolume2, FiVolumeX } from 'react-icons/fi';
import { useTaskStore } from '../store/tasks';
import { getTaskTitle } from '../types';
import { isToday, parseISO } from 'date-fns';

export interface PomodoroState {
  isRunning: boolean;
  isBreak: boolean;
  remaining: number; // seconds
  workDuration: number; // seconds
  breakDuration: number; // seconds
}

export const INITIAL_POMODORO: PomodoroState = {
  isRunning: false,
  isBreak: false,
  remaining: 25 * 60,
  workDuration: 25 * 60,
  breakDuration: 5 * 60,
};

interface Props {
  state: PomodoroState;
  onStart: (workMin: number, breakMin: number) => void;
  onPause: () => void;
  onStop: () => void;
  onClose: () => void;
}

type AmbientSound = 'silence' | 'rain' | 'cafe';

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

// ---- Ambient Audio Engine ----

let ambientCtx: AudioContext | null = null;
function getAmbientCtx(): AudioContext {
  if (!ambientCtx) ambientCtx = new AudioContext();
  if (ambientCtx.state === 'suspended') ambientCtx.resume();
  return ambientCtx;
}

function createBrownNoise(ctx: AudioContext): AudioBufferSourceNode {
  const bufferSize = ctx.sampleRate * 4;
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  let lastOut = 0;
  for (let i = 0; i < bufferSize; i++) {
    const white = Math.random() * 2 - 1;
    data[i] = (lastOut + 0.02 * white) / 1.02;
    lastOut = data[i];
    data[i] *= 3.5;
  }
  const src = ctx.createBufferSource();
  src.buffer = buffer;
  src.loop = true;
  return src;
}

function createCafeNoise(ctx: AudioContext): AudioBufferSourceNode {
  const bufferSize = ctx.sampleRate * 4;
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    data[i] = Math.random() * 2 - 1;
  }
  const src = ctx.createBufferSource();
  src.buffer = buffer;
  src.loop = true;
  return src;
}

interface AmbientNodes {
  source: AudioBufferSourceNode;
  gainNode: GainNode;
  filterNode?: BiquadFilterNode;
  stop: () => void;
}

const BASE_GAIN: Record<Exclude<AmbientSound, 'silence'>, number> = { rain: 0.18, cafe: 0.08 };

function startAmbient(type: AmbientSound, volume = 1): AmbientNodes | null {
  if (type === 'silence') return null;
  const ctx = getAmbientCtx();
  const gainNode = ctx.createGain();
  const targetGain = BASE_GAIN[type] * volume;

  if (type === 'rain') {
    const source = createBrownNoise(ctx);
    gainNode.gain.setValueAtTime(0, ctx.currentTime);
    gainNode.gain.linearRampToValueAtTime(targetGain, ctx.currentTime + 1.5);
    gainNode.connect(ctx.destination);
    source.connect(gainNode);
    source.start();
    return {
      source, gainNode,
      stop: () => {
        gainNode.gain.cancelScheduledValues(ctx.currentTime);
        gainNode.gain.linearRampToValueAtTime(0, ctx.currentTime + 1);
        setTimeout(() => { try { source.stop(); } catch (_) {} }, 1100);
      },
    };
  }

  if (type === 'cafe') {
    const source = createCafeNoise(ctx);
    const filterNode = ctx.createBiquadFilter();
    filterNode.type = 'bandpass';
    filterNode.frequency.value = 1200;
    filterNode.Q.value = 0.6;
    gainNode.gain.setValueAtTime(0, ctx.currentTime);
    gainNode.gain.linearRampToValueAtTime(targetGain, ctx.currentTime + 1.5);
    source.connect(filterNode);
    filterNode.connect(gainNode);
    gainNode.connect(ctx.destination);
    source.start();
    return {
      source, gainNode, filterNode,
      stop: () => {
        gainNode.gain.cancelScheduledValues(ctx.currentTime);
        gainNode.gain.linearRampToValueAtTime(0, ctx.currentTime + 1);
        setTimeout(() => { try { source.stop(); } catch (_) {} }, 1100);
      },
    };
  }

  return null;
}

// ---- Notifications ----

function requestNotificationPermission() {
  if (typeof Notification === 'undefined') return;
  if (Notification.permission === 'default') {
    Notification.requestPermission().catch(() => {});
  }
}

function showDesktopNotification(title: string, body: string) {
  if (typeof Notification === 'undefined') return;
  if (Notification.permission !== 'granted') return;
  try {
    new Notification(title, { body, silent: true });
  } catch (_) {}
}

// ---- Component ----

export function PomodoroPanel({ state, onStart, onPause, onStop, onClose }: Props) {
  const {
    tasks, companies, subClients,
    pomodoroSessions, addPomodoroSession,
    pomodoroGoal, setPomodoroGoal,
  } = useTaskStore();

  const [workMinutes, setWorkMinutes] = useState(Math.round(state.workDuration / 60));
  const [breakMinutes, setBreakMinutes] = useState(Math.round(state.breakDuration / 60));
  const [linkedTaskId, setLinkedTaskId] = useState<string>('');
  const [ambientSound, setAmbientSound] = useState<AmbientSound>('silence');
  const [ambientVolume, setAmbientVolume] = useState(0.7);
  const [showTaskDropdown, setShowTaskDropdown] = useState(false);

  // Refs for ambient audio
  const ambientNodesRef = useRef<AmbientNodes | null>(null);
  const prevIsBreakRef = useRef<boolean | null>(null);
  const sessionStartRef = useRef<string | null>(null);

  // Request notification permission on mount
  useEffect(() => {
    requestNotificationPermission();
  }, []);

  // Track session start time when timer starts running
  useEffect(() => {
    if (state.isRunning && !sessionStartRef.current) {
      sessionStartRef.current = new Date().toISOString();
    }
    if (!state.isRunning && state.remaining === state.workDuration) {
      // Timer was stopped/reset
      sessionStartRef.current = null;
    }
  }, [state.isRunning, state.remaining, state.workDuration]);

  // Detect phase flip → session just completed
  useEffect(() => {
    if (prevIsBreakRef.current === null) {
      prevIsBreakRef.current = state.isBreak;
      return;
    }
    if (prevIsBreakRef.current !== state.isBreak) {
      // Phase flipped — a session ended
      const wasBreak = prevIsBreakRef.current;
      const duration = wasBreak ? state.breakDuration : state.workDuration;
      const startedAt = sessionStartRef.current ?? new Date(Date.now() - duration * 1000).toISOString();

      addPomodoroSession({
        startedAt,
        duration,
        isBreak: wasBreak,
        linkedTaskId: (!wasBreak && linkedTaskId) ? linkedTaskId : undefined,
      });

      sessionStartRef.current = new Date().toISOString();

      // Desktop notification
      if (!wasBreak) {
        showDesktopNotification('Pomodoro', 'Foco concluído! Hora do descanso.');
      } else {
        showDesktopNotification('Pomodoro', 'Descanso concluído! Vamos trabalhar.');
      }

      prevIsBreakRef.current = state.isBreak;
    }
  }, [state.isBreak]);

  // Manage ambient sound play/stop based on running state and isBreak
  useEffect(() => {
    const shouldPlay = state.isRunning && !state.isBreak && ambientSound !== 'silence';

    if (shouldPlay && !ambientNodesRef.current) {
      ambientNodesRef.current = startAmbient(ambientSound, ambientVolume);
    } else if (!shouldPlay && ambientNodesRef.current) {
      ambientNodesRef.current.stop();
      ambientNodesRef.current = null;
    }
  }, [state.isRunning, state.isBreak, ambientSound]);

  // Adjust live volume without restarting
  const handleVolumeChange = (vol: number) => {
    setAmbientVolume(vol);
    if (ambientNodesRef.current && ambientSound !== 'silence') {
      const ctx = getAmbientCtx();
      const target = BASE_GAIN[ambientSound as Exclude<AmbientSound, 'silence'>] * vol;
      ambientNodesRef.current.gainNode.gain.cancelScheduledValues(ctx.currentTime);
      ambientNodesRef.current.gainNode.gain.setTargetAtTime(target, ctx.currentTime, 0.05);
    }
  };

  // Change ambient sound while running
  const handleAmbientChange = (next: AmbientSound) => {
    if (ambientNodesRef.current) {
      ambientNodesRef.current.stop();
      ambientNodesRef.current = null;
    }
    setAmbientSound(next);
    if (state.isRunning && !state.isBreak && next !== 'silence') {
      setTimeout(() => {
        ambientNodesRef.current = startAmbient(next, ambientVolume);
      }, 80);
    }
  };

  const stopAmbientNow = () => {
    if (ambientNodesRef.current) {
      ambientNodesRef.current.stop();
      ambientNodesRef.current = null;
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (ambientNodesRef.current) {
        ambientNodesRef.current.stop();
        ambientNodesRef.current = null;
      }
    };
  }, []);

  // Today's focus sessions (non-break)
  const todaySessions = pomodoroSessions.filter(s => {
    try { return !s.isBreak && isToday(parseISO(s.startedAt)); } catch { return false; }
  });
  const todayCount = todaySessions.length;
  const todayTotalSeconds = todaySessions.reduce((acc, s) => acc + s.duration, 0);
  const todayTotalMin = Math.round(todayTotalSeconds / 60);

  // Active tasks for dropdown (non-archived, non-done)
  const activeTasks = tasks.filter(t => !t.archived && t.status !== 'done');

  const progress = state.isBreak
    ? 1 - state.remaining / state.breakDuration
    : 1 - state.remaining / state.workDuration;

  const accentColor = state.isBreak ? '#30d158' : '#64C4FF';
  const phaseLabel = state.isBreak ? 'Pausa' : 'Foco';
  const circumference = 2 * Math.PI * 54;

  const linkedTask = activeTasks.find(t => t.id === linkedTaskId);
  const linkedTaskTitle = linkedTask ? getTaskTitle(linkedTask, companies, subClients) : null;

  const goalProgress = Math.min(todayCount / Math.max(pomodoroGoal, 1), 1);
  const goalBarColor = todayCount >= pomodoroGoal ? '#30d158' : accentColor;

  const soundLabels: Record<AmbientSound, string> = {
    silence: 'Silêncio',
    rain: 'Chuva',
    cafe: 'Café',
  };
  const soundOptions: AmbientSound[] = ['silence', 'rain', 'cafe'];

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.92, y: -8 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.92, y: -8 }}
      transition={{ type: 'spring', damping: 26, stiffness: 320 }}
      style={{
        position: 'fixed',
        top: 44,
        right: 12,
        zIndex: 8000,
        width: 300,
        background: 'var(--modal-bg)',
        borderRadius: 16,
        boxShadow: '0 16px 48px rgba(0,0,0,0.35)',
        overflow: 'hidden',
      }}
    >
      {/* Accent top border */}
      <div style={{ height: 3, background: accentColor, transition: 'background .3s' }} />

      <div style={{ padding: '18px 20px 20px' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--t1)' }}>Pomodoro</span>
          <button
            onClick={onClose}
            title="Minimizar (timer continua rodando)"
            style={{ background: 'var(--s2)', border: 'none', cursor: 'pointer', color: 'var(--t2)', padding: 7, borderRadius: 8, display: 'flex', alignItems: 'center', transition: 'all .15s' }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--b2)'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'var(--s2)'; }}
          >
            <FiMinus size={14} />
          </button>
        </div>

        {/* Timer circle */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 20 }}>
          <div style={{ position: 'relative', width: 124, height: 124 }}>
            <svg width="124" height="124" style={{ transform: 'rotate(-90deg)' }}>
              <circle cx="62" cy="62" r="54" fill="none" stroke="var(--b2)" strokeWidth="6" />
              <circle
                cx="62" cy="62" r="54"
                fill="none"
                stroke={accentColor}
                strokeWidth="6"
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={circumference * (1 - progress)}
                style={{ transition: 'stroke-dashoffset 0.8s ease, stroke .3s' }}
              />
            </svg>
            <div style={{
              position: 'absolute', inset: 0,
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            }}>
              <span style={{ fontSize: 26, fontWeight: 700, color: 'var(--t1)', letterSpacing: '-1px', lineHeight: 1 }}>
                {formatTime(state.remaining)}
              </span>
              <span style={{ fontSize: 10, fontWeight: 600, color: accentColor, letterSpacing: '1px', textTransform: 'uppercase', marginTop: 3, transition: 'color .3s' }}>
                {phaseLabel}
              </span>
            </div>
          </div>
        </div>

        {/* Controls */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
          {!state.isRunning ? (
            <button
              onClick={() => onStart(workMinutes, breakMinutes)}
              style={{
                flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                padding: '9px 0', borderRadius: 10,
                background: accentColor, border: 'none', cursor: 'pointer',
                color: '#fff', fontSize: 13, fontWeight: 600,
                transition: 'opacity .15s',
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.opacity = '0.85'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.opacity = '1'; }}
            >
              <FiPlay size={13} /> Iniciar
            </button>
          ) : (
            <button
              onClick={() => { stopAmbientNow(); onPause(); }}
              style={{
                flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                padding: '9px 0', borderRadius: 10,
                background: 'rgba(255,159,10,0.15)',
                border: 'none',
                cursor: 'pointer', color: '#ff9f0a', fontSize: 13, fontWeight: 600,
                transition: 'opacity .15s',
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.opacity = '0.8'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.opacity = '1'; }}
            >
              <FiPause size={13} /> Pausar
            </button>
          )}
          <button
            onClick={() => { stopAmbientNow(); onStop(); }}
            style={{
              width: 40, display: 'flex', alignItems: 'center', justifyContent: 'center',
              borderRadius: 10, background: 'var(--s2)', border: '1px solid var(--b2)',
              cursor: 'pointer', color: 'var(--t3)', transition: 'all .15s',
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = '#ff453a'; (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,69,58,0.3)'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'var(--t3)'; (e.currentTarget as HTMLElement).style.borderColor = 'var(--b2)'; }}
            title="Parar"
          >
            <FiSquare size={13} />
          </button>
        </div>

        {/* Task selector */}
        <div style={{ marginBottom: 12, position: 'relative' }}>
          <label style={{ fontSize: 9, fontWeight: 700, letterSpacing: '1.5px', textTransform: 'uppercase', color: 'var(--t4)', display: 'block', marginBottom: 5 }}>
            Tarefa vinculada
          </label>
          <button
            onClick={() => setShowTaskDropdown(v => !v)}
            style={{
              width: '100%', textAlign: 'left', boxSizing: 'border-box',
              background: 'var(--ib)', border: '1px solid var(--b1)',
              borderRadius: 8, padding: '7px 10px',
              color: linkedTaskTitle ? 'var(--t1)' : 'var(--t4)',
              fontSize: 12, cursor: 'pointer',
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              transition: 'border-color .15s',
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--b2)'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--b1)'; }}
          >
            {linkedTaskTitle ?? 'Nenhuma tarefa selecionada'}
          </button>
          {showTaskDropdown && (
            <div style={{
              position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 100,
              background: 'var(--modal-bg)',
              border: '1px solid var(--b2)',
              borderRadius: 8, marginTop: 4,
              maxHeight: 160, overflowY: 'auto',
              boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
            }}>
              <button
                onClick={() => { setLinkedTaskId(''); setShowTaskDropdown(false); }}
                style={{
                  width: '100%', textAlign: 'left', padding: '8px 10px',
                  background: 'none', border: 'none', cursor: 'pointer',
                  color: 'var(--t3)', fontSize: 12,
                  borderBottom: '1px solid var(--b1)',
                }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--s2)'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'none'; }}
              >
                Nenhuma
              </button>
              {activeTasks.length === 0 && (
                <div style={{ padding: '8px 10px', color: 'var(--t4)', fontSize: 12 }}>Sem tarefas ativas</div>
              )}
              {activeTasks.map(task => {
                const title = getTaskTitle(task, companies, subClients);
                return (
                  <button
                    key={task.id}
                    onClick={() => { setLinkedTaskId(task.id); setShowTaskDropdown(false); }}
                    style={{
                      width: '100%', textAlign: 'left', padding: '8px 10px',
                      background: task.id === linkedTaskId ? 'var(--s2)' : 'none',
                      border: 'none', cursor: 'pointer',
                      color: 'var(--t1)', fontSize: 12,
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--s2)'; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = task.id === linkedTaskId ? 'var(--s2)' : 'none'; }}
                  >
                    {title}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Ambient sound selector */}
        <div style={{ marginBottom: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 5 }}>
            <label style={{ fontSize: 9, fontWeight: 700, letterSpacing: '1.5px', textTransform: 'uppercase', color: 'var(--t4)' }}>
              Som ambiente
            </label>
            {ambientSound !== 'silence' && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                <FiVolumeX size={10} style={{ color: 'var(--t4)', flexShrink: 0 }} />
                <input
                  type="range" min={0} max={1} step={0.05}
                  value={ambientVolume}
                  onChange={e => handleVolumeChange(parseFloat(e.target.value))}
                  style={{ width: 68, accentColor, cursor: 'pointer' }}
                />
                <FiVolume2 size={10} style={{ color: 'var(--t4)', flexShrink: 0 }} />
              </div>
            )}
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            {soundOptions.map(opt => {
              const active = ambientSound === opt;
              return (
                <button
                  key={opt}
                  onClick={() => handleAmbientChange(opt)}
                  style={{
                    flex: 1, padding: '6px 0', borderRadius: 8, fontSize: 11, fontWeight: 600,
                    cursor: 'pointer', border: 'none',
                    background: active ? (opt === 'silence' ? 'var(--s2)' : accentColor + '22') : 'var(--ib)',
                    color: active ? (opt === 'silence' ? 'var(--t2)' : accentColor) : 'var(--t3)',
                    outline: active ? `1.5px solid ${opt === 'silence' ? 'var(--b2)' : accentColor}` : '1.5px solid transparent',
                    transition: 'all .15s',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4,
                  }}
                >
                  {active && opt !== 'silence' ? <FiVolume2 size={10} /> : opt !== 'silence' ? <FiVolumeX size={10} /> : null}
                  {soundLabels[opt]}
                </button>
              );
            })}
          </div>
        </div>

        {/* Divider */}
        <div style={{ height: 1, background: 'var(--b1)', marginBottom: 12 }} />

        {/* Today's session history */}
        <div style={{ marginBottom: 12 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 4 }}>
            <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '1.5px', textTransform: 'uppercase', color: 'var(--t4)' }}>
              Hoje
            </span>
            <span style={{ fontSize: 11, color: 'var(--t3)' }}>
              {todayCount} {todayCount === 1 ? 'sessão' : 'sessões'} · {todayTotalMin}min focados
            </span>
          </div>
        </div>

        {/* Daily goal */}
        <div style={{ marginBottom: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
            <span style={{ fontSize: 11, color: 'var(--t3)' }}>
              <span style={{ color: todayCount >= pomodoroGoal ? '#30d158' : 'var(--t1)', fontWeight: 600 }}>{todayCount}</span>
              <span style={{ color: 'var(--t3)' }}> / {pomodoroGoal} sessões hoje</span>
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <button
                onClick={() => setPomodoroGoal(Math.max(1, pomodoroGoal - 1))}
                style={{
                  width: 22, height: 22, borderRadius: 6, border: '1px solid var(--b2)',
                  background: 'var(--s2)', color: 'var(--t2)', cursor: 'pointer', fontSize: 14, lineHeight: 1,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}
              >–</button>
              <button
                onClick={() => setPomodoroGoal(pomodoroGoal + 1)}
                style={{
                  width: 22, height: 22, borderRadius: 6, border: '1px solid var(--b2)',
                  background: 'var(--s2)', color: 'var(--t2)', cursor: 'pointer', fontSize: 14, lineHeight: 1,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}
              >+</button>
            </div>
          </div>
          {/* Progress bar */}
          <div style={{ height: 5, borderRadius: 3, background: 'var(--b1)', overflow: 'hidden' }}>
            <div style={{
              height: '100%',
              width: `${goalProgress * 100}%`,
              background: goalBarColor,
              borderRadius: 3,
              transition: 'width .4s ease, background .3s',
            }} />
          </div>
        </div>

        {/* Config (only when not running) */}
        {!state.isRunning && (
          <div style={{ display: 'flex', gap: 10 }}>
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: 9, fontWeight: 700, letterSpacing: '1.5px', textTransform: 'uppercase', color: 'var(--t4)', display: 'block', marginBottom: 5 }}>
                Foco (min)
              </label>
              <input
                type="number" min={1} max={90}
                value={workMinutes}
                onChange={e => {
                  const v = parseInt(e.target.value, 10);
                  if (!isNaN(v) && v > 0) setWorkMinutes(v);
                }}
                style={{
                  width: '100%', boxSizing: 'border-box',
                  background: 'var(--ib)',
                  border: '1px solid var(--b1)',
                  borderRadius: 8, padding: '7px 10px',
                  color: 'var(--t1)', fontSize: 13, outline: 'none', textAlign: 'center',
                }}
              />
            </div>
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: 9, fontWeight: 700, letterSpacing: '1.5px', textTransform: 'uppercase', color: 'var(--t4)', display: 'block', marginBottom: 5 }}>
                Pausa (min)
              </label>
              <input
                type="number" min={1} max={30}
                value={breakMinutes}
                onChange={e => {
                  const v = parseInt(e.target.value, 10);
                  if (!isNaN(v) && v > 0) setBreakMinutes(v);
                }}
                style={{
                  width: '100%', boxSizing: 'border-box',
                  background: 'var(--ib)',
                  border: '1px solid var(--b1)',
                  borderRadius: 8, padding: '7px 10px',
                  color: 'var(--t1)', fontSize: 13, outline: 'none', textAlign: 'center',
                }}
              />
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}
