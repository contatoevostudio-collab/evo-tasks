import { useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { FiX, FiCommand } from 'react-icons/fi';
import { useTaskStore } from '../../store/tasks';

export interface Shortcut {
  keys: string[]; // ex: ['⌘', 'K']  ou  ['N']
  description: string;
}

export interface ShortcutGroup {
  label: string;
  items: Shortcut[];
}

interface ShortcutsHelpProps {
  open: boolean;
  onClose: () => void;
  groups?: ShortcutGroup[];
}

export const DEFAULT_SHORTCUTS: ShortcutGroup[] = [
  {
    label: 'Navegação',
    items: [
      { keys: ['⌘', 'K'], description: 'Abrir paleta de comandos' },
      { keys: ['1'],      description: 'Ir para Home' },
      { keys: ['2'],      description: 'Ir para Tarefas' },
      { keys: ['3'],      description: 'Ir para Empresas' },
      { keys: ['4'],      description: 'Ir para Arquivo' },
      { keys: ['5'],      description: 'Ir para CRM' },
    ],
  },
  {
    label: 'Ações',
    items: [
      { keys: ['N'],          description: 'Nova tarefa' },
      { keys: ['/'],          description: 'Focar busca' },
      { keys: ['Esc'],        description: 'Fechar modal / cancelar' },
      { keys: ['Enter'],      description: 'Confirmar' },
      { keys: ['?'],          description: 'Abrir essa ajuda' },
    ],
  },
];

/**
 * Modal central listando todos os atalhos. Bom atalho pra ela: `?`.
 *   <ShortcutsHelp open={helpOpen} onClose={() => setHelpOpen(false)} />
 */
export function ShortcutsHelp({ open, onClose, groups = DEFAULT_SHORTCUTS }: ShortcutsHelpProps) {
  const { accentColor } = useTaskStore();

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          style={{
            position: 'fixed', inset: 0, zIndex: 50,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(6px)',
          }}
          onClick={(e) => e.target === e.currentTarget && onClose()}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            transition={{ duration: 0.16 }}
            style={{
              width: 480, maxWidth: '92vw', maxHeight: '80vh',
              background: 'var(--modal-bg, rgba(7,11,28,0.94))',
              border: '1px solid var(--b2)',
              borderRadius: 16,
              overflow: 'hidden', display: 'flex', flexDirection: 'column',
              boxShadow: '0 32px 80px rgba(0,0,0,0.45)',
              backdropFilter: 'blur(20px) saturate(1.6)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1px solid var(--b2)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{
                  width: 30, height: 30, borderRadius: 9,
                  background: `${accentColor}20`, color: accentColor,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <FiCommand size={15} />
                </div>
                <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--t1)' }}>Atalhos de teclado</span>
              </div>
              <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--t3)', padding: 4, display: 'flex' }}>
                <FiX size={15} />
              </button>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', padding: 20, display: 'flex', flexDirection: 'column', gap: 22 }}>
              {groups.map((g) => (
                <div key={g.label}>
                  <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '1.5px', textTransform: 'uppercase', color: 'var(--t4)', marginBottom: 10 }}>
                    {g.label}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {g.items.map((s, i) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                        <span style={{ fontSize: 12, color: 'var(--t2)' }}>{s.description}</span>
                        <div style={{ display: 'flex', gap: 3 }}>
                          {s.keys.map((k, j) => (
                            <kbd
                              key={j}
                              style={{
                                minWidth: 22, height: 22, padding: '0 6px',
                                background: 'var(--s2)', border: '1px solid var(--b2)',
                                borderRadius: 5, fontFamily: 'ui-monospace, monospace',
                                fontSize: 10, fontWeight: 700, color: 'var(--t2)',
                                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                                boxShadow: '0 1px 0 var(--b2)',
                              }}
                            >
                              {k}
                            </kbd>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
