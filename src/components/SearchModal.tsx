import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiSearch, FiX } from 'react-icons/fi';
import { useTaskStore } from '../store/tasks';
import { getTaskTitle } from '../types';
import type { Task } from '../types';

interface Props {
  onClose: () => void;
  onTaskClick: (task: Task) => void;
}

const STATUS_COLOR: Record<string, string> = {
  todo: '#ff9f0a',
  doing: '#64C4FF',
  done: '#30d158',
};
const STATUS_LABEL: Record<string, string> = {
  todo: 'A Fazer',
  doing: 'Fazendo',
  done: 'Feito',
};

export function SearchModal({ onClose, onTaskClick }: Props) {
  const { tasks, companies, subClients } = useTaskStore();
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const results = query.trim().length === 0
    ? []
    : tasks
        .filter(t => !t.archived)
        .filter(t => {
          const title = getTaskTitle(t, companies, subClients).toLowerCase();
          const q = query.toLowerCase();
          return title.includes(q) || (t.notes ?? '').toLowerCase().includes(q) || (t.tags ?? []).some(tag => tag.toLowerCase().includes(q));
        })
        .slice(0, 10);

  useEffect(() => { setSelected(0); }, [query]);

  useEffect(() => {
    const el = inputRef.current;
    if (el) el.focus();
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { onClose(); return; }
      if (e.key === 'ArrowDown') { e.preventDefault(); setSelected(s => Math.min(s + 1, results.length - 1)); }
      if (e.key === 'ArrowUp')   { e.preventDefault(); setSelected(s => Math.max(s - 1, 0)); }
      if (e.key === 'Enter' && results[selected]) {
        onTaskClick(results[selected]);
        onClose();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [results, selected, onClose, onTaskClick]);

  return (
    <AnimatePresence>
      <motion.div
        style={{ position: 'fixed', inset: 0, zIndex: 100, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', paddingTop: 80 }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        <motion.div
          style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(8px)' }}
          onClick={onClose}
        />
        <motion.div
          style={{
            position: 'relative', zIndex: 1,
            width: '100%', maxWidth: 560, margin: '0 16px',
            background: 'var(--modal-bg)',
            border: '1px solid rgba(53,107,255,0.3)',
            borderRadius: 16,
            overflow: 'hidden',
            boxShadow: '0 40px 100px rgba(0,0,0,0.4)',
          }}
          initial={{ scale: 0.95, opacity: 0, y: -16 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.95, opacity: 0, y: -16 }}
          transition={{ type: 'spring', damping: 28, stiffness: 380 }}
        >
          {/* Input */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px', borderBottom: query && results.length > 0 ? '1px solid var(--b1)' : 'none' }}>
            <FiSearch size={18} style={{ color: '#356BFF', flexShrink: 0 }} />
            <input
              ref={inputRef}
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Buscar tarefas, notas, tags..."
              style={{
                flex: 1, background: 'transparent', border: 'none', outline: 'none',
                color: 'var(--t1)', fontSize: 15, fontWeight: 400,
              }}
            />
            {query && (
              <button onClick={() => setQuery('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--t3)', padding: 0, display: 'flex' }}>
                <FiX size={15} />
              </button>
            )}
            <span style={{ fontSize: 10, color: 'var(--t4)', background: 'var(--s1)', padding: '3px 7px', borderRadius: 5, flexShrink: 0 }}>ESC</span>
          </div>

          {/* Results */}
          {results.length > 0 && (
            <div style={{ maxHeight: 360, overflowY: 'auto', padding: '6px 8px 8px' }}>
              {results.map((task, i) => {
                const company = companies.find(c => c.id === task.companyId);
                const title = getTaskTitle(task, companies, subClients);
                const isSelected = i === selected;
                return (
                  <button
                    key={task.id}
                    onClick={() => { onTaskClick(task); onClose(); }}
                    onMouseEnter={() => setSelected(i)}
                    style={{
                      width: '100%', textAlign: 'left',
                      display: 'flex', alignItems: 'center', gap: 10,
                      padding: '9px 12px', borderRadius: 10, marginBottom: 2,
                      background: isSelected ? 'rgba(53,107,255,0.12)' : 'transparent',
                      border: `1px solid ${isSelected ? 'rgba(53,107,255,0.3)' : 'transparent'}`,
                      cursor: 'pointer', transition: 'all .1s',
                    }}
                  >
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: task.colorOverride ?? company?.color ?? '#636366', flexShrink: 0 }} />
                    <span style={{ flex: 1, fontSize: 13, color: 'var(--t1)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {title}
                    </span>
                    <span style={{ fontSize: 10, padding: '2px 7px', borderRadius: 5, background: `${STATUS_COLOR[task.status]}18`, color: STATUS_COLOR[task.status], flexShrink: 0 }}>
                      {STATUS_LABEL[task.status]}
                    </span>
                    <span style={{ fontSize: 10, color: 'var(--t4)', flexShrink: 0 }}>{task.date}</span>
                  </button>
                );
              })}
            </div>
          )}

          {query.trim().length > 0 && results.length === 0 && (
            <div style={{ padding: '24px 16px', textAlign: 'center', color: 'var(--t4)', fontSize: 13 }}>
              Nenhuma tarefa encontrada
            </div>
          )}

          {!query.trim() && (
            <div style={{ padding: '16px', textAlign: 'center', color: 'var(--t4)', fontSize: 12 }}>
              Digite para buscar tarefas por título, notas ou tags
            </div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
