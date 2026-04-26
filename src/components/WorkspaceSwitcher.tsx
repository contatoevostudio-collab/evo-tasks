import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiChevronDown, FiPlus, FiEdit2, FiCheck, FiEye, FiUser, FiLayers, FiTarget } from 'react-icons/fi';
import { useWorkspacesStore, getPalette } from '../store/workspaces';
import type { Workspace, LensMode } from '../types';

interface Props {
  onOpenManager: (editingId?: string) => void;
  /** Layout compacto pra top bar (horizontal, sem padding externo) */
  compact?: boolean;
}

const TYPE_LABEL: Record<Workspace['type'], string> = {
  freelance: 'Freelance',
  agencia:   'Agência',
  pessoal:   'Pessoal',
  blank:     'Custom',
};

const LENS_LABELS: Record<LensMode, string> = {
  active: 'Só ativo',
  all:    'Todos',
  multi:  'Combinar',
  other:  'Outro',
};

const LENS_ICONS: Record<LensMode, React.ReactNode> = {
  active: <FiTarget size={11} />,
  all:    <FiLayers size={11} />,
  multi:  <FiEye size={11} />,
  other:  <FiEye size={11} />,
};

// ─── Avatar ────────────────────────────────────────────────────────────────
function WorkspaceAvatar({ ws, size = 22 }: { ws: Workspace; size?: number }) {
  const palette = getPalette(ws.paletteId);
  const initials = ws.name.trim().slice(0, 1).toUpperCase();
  if (ws.photoUrl) {
    return (
      <img
        src={ws.photoUrl}
        alt={ws.name}
        style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }}
      />
    );
  }
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%', flexShrink: 0,
      background: `linear-gradient(135deg, ${palette.primary}, ${palette.secondary})`,
      color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: size * 0.42, fontWeight: 700,
      boxShadow: `0 2px 6px ${palette.primary}55`,
    }}>{initials}</div>
  );
}

// ─── Switcher ──────────────────────────────────────────────────────────────
export function WorkspaceSwitcher({ onOpenManager, compact = false }: Props) {
  const workspaces      = useWorkspacesStore(s => s.workspaces);
  const activeId        = useWorkspacesStore(s => s.activeWorkspaceId);
  const lens            = useWorkspacesStore(s => s.lens);
  const setActive       = useWorkspacesStore(s => s.setActiveWorkspace);
  const setLens         = useWorkspacesStore(s => s.setLens);

  const [openWs,   setOpenWs]   = useState(false);
  const [openLens, setOpenLens] = useState(false);
  const wsRef   = useRef<HTMLDivElement>(null);
  const lensRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (wsRef.current && !wsRef.current.contains(e.target as Node))     setOpenWs(false);
      if (lensRef.current && !lensRef.current.contains(e.target as Node)) setOpenLens(false);
    };
    if (openWs || openLens) {
      document.addEventListener('mousedown', handler);
      return () => document.removeEventListener('mousedown', handler);
    }
  }, [openWs, openLens]);

  const active = workspaces.find(w => w.id === activeId);
  if (!active) return null;
  const activePalette = getPalette(active.paletteId);

  const lensCount =
    lens.mode === 'all'   ? workspaces.length :
    lens.mode === 'multi' ? (lens.selectedWorkspaceIds?.length ?? 0) :
    lens.mode === 'other' ? (lens.selectedWorkspaceIds?.length ?? 0) :
                            1;

  const lensLabel = lens.mode === 'multi'
    ? `${LENS_LABELS.multi} (${lensCount})`
    : lens.mode === 'other'
      ? (() => {
          const id = lens.selectedWorkspaceIds?.[0];
          const ws = workspaces.find(w => w.id === id);
          return ws ? `Outro: ${ws.name}` : LENS_LABELS.other;
        })()
      : LENS_LABELS[lens.mode];

  const lensActive = lens.mode !== 'active';

  return (
    <div style={compact
      ? { display: 'flex', alignItems: 'center', gap: 6 }
      : { display: 'flex', flexDirection: 'column', gap: 6, padding: '0 14px 12px' }
    }>
      {/* Workspace ativo */}
      <div ref={wsRef} style={{ position: 'relative', ...(compact ? {} : {}) }}>
        <button
          onClick={() => { setOpenWs(o => !o); setOpenLens(false); }}
          style={compact ? {
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '5px 10px', borderRadius: 9,
            background: `${activePalette.primary}18`,
            border: `1px solid ${activePalette.primary}38`,
            cursor: 'pointer', color: '#ffffff', height: 32,
            transition: 'background .12s, border-color .12s',
          } : {
            width: '100%', display: 'flex', alignItems: 'center', gap: 9,
            padding: '7px 10px', borderRadius: 10,
            background: `${activePalette.primary}14`,
            border: `1px solid ${activePalette.primary}30`,
            cursor: 'pointer', color: 'var(--t1)',
            transition: 'background .12s, border-color .12s',
          }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = `${activePalette.primary}28`; }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = compact ? `${activePalette.primary}18` : `${activePalette.primary}14`; }}
        >
          <WorkspaceAvatar ws={active} size={compact ? 18 : 22} />
          <div style={{ textAlign: 'left', overflow: 'hidden', ...(compact ? { maxWidth: 140 } : { flex: 1 }) }}>
            <div style={{ fontSize: compact ? 12 : 12, fontWeight: 700, color: '#ffffff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', lineHeight: 1.15 }}>
              {active.name}
            </div>
            {!compact && (
              <div style={{ fontSize: 9, color: 'var(--t4)', textTransform: 'uppercase', letterSpacing: '1px', marginTop: 1 }}>
                {TYPE_LABEL[active.type]}
              </div>
            )}
          </div>
          <FiChevronDown size={11} style={{ color: 'rgba(255,255,255,0.6)', flexShrink: 0, transform: openWs ? 'rotate(180deg)' : 'none', transition: 'transform .15s' }} />
        </button>

        <AnimatePresence>
          {openWs && (
            <motion.div
              initial={{ opacity: 0, y: -4, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -4, scale: 0.98 }}
              transition={{ duration: 0.12 }}
              style={{
                position: 'absolute', top: 'calc(100% + 6px)',
                ...(compact ? { left: 0, width: 280 } : { left: 0, right: 0 }),
                zIndex: 200,
                background: '#0b1028',
                border: '1px solid rgba(255,255,255,0.18)', borderRadius: 12,
                boxShadow: '0 20px 50px rgba(0,0,0,0.85), 0 0 0 1px rgba(0,0,0,0.4)',
                padding: 6, display: 'flex', flexDirection: 'column', gap: 2,
              }}
            >
              {workspaces.map(ws => {
                const isActive = ws.id === activeId;
                const p = getPalette(ws.paletteId);
                return (
                  <button
                    key={ws.id}
                    onClick={() => { setActive(ws.id); setOpenWs(false); }}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 9, padding: '7px 9px', borderRadius: 8,
                      background: isActive ? `${p.primary}18` : 'transparent', border: 'none', cursor: 'pointer',
                      textAlign: 'left', transition: 'background .1s',
                    }}
                    onMouseEnter={e => { if (!isActive) (e.currentTarget as HTMLElement).style.background = 'var(--s2)'; }}
                    onMouseLeave={e => { if (!isActive) (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
                  >
                    <WorkspaceAvatar ws={ws} size={20} />
                    <span style={{ flex: 1, fontSize: 12, color: 'var(--t1)', fontWeight: isActive ? 600 : 500 }}>{ws.name}</span>
                    {isActive && <FiCheck size={12} style={{ color: p.primary }} />}
                    <button
                      onClick={e => { e.stopPropagation(); setOpenWs(false); onOpenManager(ws.id); }}
                      title="Editar"
                      style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--t4)', padding: 4, display: 'flex', borderRadius: 5 }}
                      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = 'var(--t1)'; (e.currentTarget as HTMLElement).style.background = 'var(--s1)'; }}
                      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'var(--t4)'; (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
                    ><FiEdit2 size={11} /></button>
                  </button>
                );
              })}
              <div style={{ height: 1, background: 'var(--b1)', margin: '4px 4px' }} />
              <button
                onClick={() => { setOpenWs(false); onOpenManager(); }}
                style={{
                  display: 'flex', alignItems: 'center', gap: 9, padding: '7px 9px', borderRadius: 8,
                  background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--t2)', textAlign: 'left',
                  transition: 'background .1s, color .1s',
                }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--s2)'; (e.currentTarget as HTMLElement).style.color = 'var(--t1)'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; (e.currentTarget as HTMLElement).style.color = 'var(--t2)'; }}
              >
                <div style={{ width: 20, height: 20, borderRadius: '50%', border: '1px dashed var(--b3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <FiPlus size={11} />
                </div>
                <span style={{ fontSize: 12, fontWeight: 500 }}>Novo workspace</span>
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Lente */}
      <div ref={lensRef} style={{ position: 'relative' }}>
        <button
          onClick={() => { setOpenLens(o => !o); setOpenWs(false); }}
          style={compact ? {
            display: 'flex', alignItems: 'center', gap: 5,
            padding: '5px 10px', borderRadius: 9, height: 32,
            background: lensActive ? 'rgba(255,159,10,0.16)' : 'rgba(255,255,255,0.05)',
            border: `1px solid ${lensActive ? 'rgba(255,159,10,0.4)' : 'rgba(255,255,255,0.10)'}`,
            cursor: 'pointer', color: lensActive ? '#ff9f0a' : 'rgba(255,255,255,0.7)',
            transition: 'all .12s', fontSize: 11, fontWeight: 700,
          } : {
            width: '100%', display: 'flex', alignItems: 'center', gap: 6,
            padding: '5px 10px', borderRadius: 8,
            background: lensActive ? 'rgba(255,159,10,0.10)' : 'var(--s1)',
            border: `1px solid ${lensActive ? 'rgba(255,159,10,0.32)' : 'var(--b2)'}`,
            cursor: 'pointer', color: lensActive ? '#ff9f0a' : 'var(--t3)',
            transition: 'all .12s', fontSize: 11, fontWeight: 600,
          }}
        >
          {LENS_ICONS[lens.mode]}
          {!compact && (
            <span style={{ flex: 1, textAlign: 'left', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {lensLabel}
            </span>
          )}
          {compact && (
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 100 }}>
              {lensLabel}
            </span>
          )}
          <FiChevronDown size={11} style={{ flexShrink: 0, transform: openLens ? 'rotate(180deg)' : 'none', transition: 'transform .15s' }} />
        </button>

        <AnimatePresence>
          {openLens && (
            <motion.div
              initial={{ opacity: 0, y: -4, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -4, scale: 0.98 }}
              transition={{ duration: 0.12 }}
              style={{
                position: 'absolute', top: 'calc(100% + 6px)',
                ...(compact ? { left: 0, width: 240 } : { left: 0, right: 0 }),
                zIndex: 200,
                background: '#0b1028',
                border: '1px solid rgba(255,255,255,0.18)', borderRadius: 12,
                boxShadow: '0 20px 50px rgba(0,0,0,0.85), 0 0 0 1px rgba(0,0,0,0.4)',
                padding: 6, display: 'flex', flexDirection: 'column', gap: 2,
              }}
            >
              <button
                onClick={() => { setLens({ mode: 'active' }); setOpenLens(false); }}
                style={lensOpt(lens.mode === 'active')}
              ><FiTarget size={11} /> Só workspace ativo</button>
              <button
                onClick={() => { setLens({ mode: 'all' }); setOpenLens(false); }}
                style={lensOpt(lens.mode === 'all')}
              ><FiLayers size={11} /> Todos os workspaces</button>

              <div style={{ height: 1, background: 'var(--b1)', margin: '4px 4px' }} />
              <div style={{ fontSize: 9, color: 'var(--t4)', textTransform: 'uppercase', letterSpacing: '1px', padding: '4px 9px 2px' }}>
                Combinar específicos
              </div>
              {workspaces.filter(w => w.id !== activeId).map(ws => {
                const sel = lens.mode === 'multi' && (lens.selectedWorkspaceIds ?? []).includes(ws.id);
                return (
                  <button
                    key={ws.id}
                    onClick={() => {
                      const current = lens.mode === 'multi' ? (lens.selectedWorkspaceIds ?? []) : [activeId!];
                      const next = sel ? current.filter(x => x !== ws.id) : [...current, ws.id];
                      setLens({ mode: 'multi', selectedWorkspaceIds: next });
                    }}
                    style={lensOpt(sel)}
                  >
                    <WorkspaceAvatar ws={ws} size={16} />
                    <span style={{ flex: 1, textAlign: 'left' }}>{ws.name}</span>
                    {sel && <FiCheck size={11} />}
                  </button>
                );
              })}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

function lensOpt(active: boolean): React.CSSProperties {
  return {
    display: 'flex', alignItems: 'center', gap: 8, padding: '6px 9px', borderRadius: 7,
    background: active ? 'rgba(255,159,10,0.10)' : 'transparent',
    border: 'none', cursor: 'pointer',
    color: active ? '#ff9f0a' : 'var(--t2)', fontSize: 11, fontWeight: active ? 600 : 500,
    textAlign: 'left',
    transition: 'all .1s',
  };
}

// Re-exposes avatar pra outros componentes (ex: header de página) usarem o mesmo visual
export { WorkspaceAvatar };

// Suppress unused FiUser import — kept for future use in WorkspaceModal
void FiUser;
