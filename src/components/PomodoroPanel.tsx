import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { FiX, FiPlay, FiPause, FiSquare } from 'react-icons/fi';

interface PomodoroState {
  isRunning: boolean;
  isBreak: boolean;
  remaining: number; // seconds
  workDuration: number; // seconds
  breakDuration: number; // seconds
}

interface Props {
  onClose: () => void;
  onTick: (display: string | null) => void;
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export function PomodoroPanel({ onClose, onTick }: Props) {
  const [state, setState] = useState<PomodoroState>({
    isRunning: false,
    isBreak: false,
    remaining: 25 * 60,
    workDuration: 25 * 60,
    breakDuration: 5 * 60,
  });

  const [workMinutes, setWorkMinutes] = useState(25);
  const [breakMinutes, setBreakMinutes] = useState(5);

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Sync with main process on mount
  useEffect(() => {
    const syncState = async () => {
      if (window.electronAPI?.pomodoroGetState) {
        const s = await window.electronAPI.pomodoroGetState();
        if (s) {
          setState(s);
          setWorkMinutes(Math.round(s.workDuration / 60));
          setBreakMinutes(Math.round(s.breakDuration / 60));
        }
      }
    };
    syncState();

    // Listen for ticks from main process
    window.electronAPI?.onPomodoroTick?.((s: PomodoroState) => {
      setState(s);
    });
  }, []);

  // Local tick when running (fallback when no electron IPC ticks arrive)
  useEffect(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);

    if (state.isRunning) {
      intervalRef.current = setInterval(() => {
        setState(prev => {
          if (!prev.isRunning) return prev;
          if (prev.remaining <= 1) {
            // switch phase
            const newIsBreak = !prev.isBreak;
            const newRemaining = newIsBreak ? prev.breakDuration : prev.workDuration;
            return { ...prev, remaining: newRemaining, isBreak: newIsBreak };
          }
          return { ...prev, remaining: prev.remaining - 1 };
        });
      }, 1000);
    }

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [state.isRunning]);

  // Update top bar display
  useEffect(() => {
    if (state.isRunning || state.remaining < (state.isBreak ? state.breakDuration : state.workDuration)) {
      onTick(formatTime(state.remaining));
    } else {
      onTick(null);
    }
  }, [state.remaining, state.isRunning]);

  const handleStart = async () => {
    const config = { work: workMinutes, shortBreak: breakMinutes };
    if (window.electronAPI?.pomodoroStart) {
      await window.electronAPI.pomodoroStart(config);
    }
    setState(prev => ({
      ...prev,
      isRunning: true,
      workDuration: workMinutes * 60,
      breakDuration: breakMinutes * 60,
      remaining: prev.isRunning ? prev.remaining : workMinutes * 60,
      isBreak: false,
    }));
  };

  const handlePause = async () => {
    if (window.electronAPI?.pomodoroPause) {
      await window.electronAPI.pomodoroPause();
    }
    setState(prev => ({ ...prev, isRunning: !prev.isRunning }));
  };

  const handleStop = async () => {
    if (window.electronAPI?.pomodoroStop) {
      await window.electronAPI.pomodoroStop();
    }
    setState(prev => ({
      ...prev,
      isRunning: false,
      isBreak: false,
      remaining: workMinutes * 60,
    }));
    onTick(null);
  };

  const progress = state.isBreak
    ? 1 - state.remaining / state.breakDuration
    : 1 - state.remaining / state.workDuration;

  const accentColor = state.isBreak ? '#30d158' : '#ff453a';
  const phaseLabel = state.isBreak ? 'Pausa' : 'Foco';

  const circumference = 2 * Math.PI * 54;

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
        border: '1px solid var(--b2)',
        borderRadius: 16,
        boxShadow: '0 16px 48px rgba(0,0,0,0.35)',
        overflow: 'hidden',
      }}
    >
      {/* Accent top border */}
      <div style={{ height: 3, background: accentColor }} />

      <div style={{ padding: '18px 20px 20px' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 16 }}>🍅</span>
            <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--t1)' }}>Pomodoro</span>
          </div>
          <button
            onClick={onClose}
            style={{ background: 'var(--s2)', border: 'none', cursor: 'pointer', color: 'var(--t2)', padding: 7, borderRadius: 8, display: 'flex', alignItems: 'center', transition: 'all .15s' }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--b2)'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'var(--s2)'; }}
          >
            <FiX size={14} />
          </button>
        </div>

        {/* Timer circle */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 20 }}>
          <div style={{ position: 'relative', width: 124, height: 124 }}>
            <svg width="124" height="124" style={{ transform: 'rotate(-90deg)' }}>
              {/* Track */}
              <circle cx="62" cy="62" r="54" fill="none" stroke="var(--b2)" strokeWidth="6" />
              {/* Progress */}
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
              <span style={{ fontSize: 10, fontWeight: 600, color: accentColor, letterSpacing: '1px', textTransform: 'uppercase', marginTop: 3 }}>
                {phaseLabel}
              </span>
            </div>
          </div>
        </div>

        {/* Controls */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
          {!state.isRunning ? (
            <button
              onClick={handleStart}
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
              onClick={handlePause}
              style={{
                flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                padding: '9px 0', borderRadius: 10,
                background: 'rgba(255,159,10,0.15)', border: '1px solid rgba(255,159,10,0.3)',
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
            onClick={handleStop}
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

        {/* Config */}
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
                  if (!isNaN(v) && v > 0) {
                    setWorkMinutes(v);
                    if (!state.isRunning) setState(prev => ({ ...prev, remaining: v * 60, workDuration: v * 60 }));
                  }
                }}
                style={{
                  width: '100%', boxSizing: 'border-box',
                  background: 'var(--ib)', border: '1px solid var(--b2)',
                  borderRadius: 8, padding: '7px 10px',
                  color: 'var(--t1)', fontSize: 13, outline: 'none', textAlign: 'center',
                }}
                onFocus={e => { e.currentTarget.style.borderColor = accentColor; }}
                onBlur={e => { e.currentTarget.style.borderColor = 'var(--b2)'; }}
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
                  if (!isNaN(v) && v > 0) {
                    setBreakMinutes(v);
                    setState(prev => ({ ...prev, breakDuration: v * 60 }));
                  }
                }}
                style={{
                  width: '100%', boxSizing: 'border-box',
                  background: 'var(--ib)', border: '1px solid var(--b2)',
                  borderRadius: 8, padding: '7px 10px',
                  color: 'var(--t1)', fontSize: 13, outline: 'none', textAlign: 'center',
                }}
                onFocus={e => { e.currentTarget.style.borderColor = accentColor; }}
                onBlur={e => { e.currentTarget.style.borderColor = 'var(--b2)'; }}
              />
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}
