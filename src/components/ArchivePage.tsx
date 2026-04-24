import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiRotateCcw, FiTrash2, FiSearch } from 'react-icons/fi';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useTaskStore } from '../store/tasks';
import { getTaskTitle } from '../types';

const STATUS_COLOR: Record<string, string> = { todo: '#ff9f0a', doing: '#64C4FF', done: '#30d158' };
const STATUS_LABEL: Record<string, string> = { todo: 'A Fazer', doing: 'Fazendo', done: 'Feito' };

export function ArchivePage() {
  const { tasks, companies, subClients, toggleArchive, permanentlyDeleteTask, showToast, hideToast } = useTaskStore();
  const [search, setSearch] = useState('');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const deleteTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Clear pending delete timer on unmount to avoid calling store after component is gone
  useEffect(() => () => { if (deleteTimerRef.current) clearTimeout(deleteTimerRef.current); }, []);

  const archived = tasks
    .filter(t => t.archived && !t.deletedAt)
    .sort((a, b) => b.date.localeCompare(a.date));

  const filtered = search.trim()
    ? archived.filter(t => {
        const title = getTaskTitle(t, companies, subClients).toLowerCase();
        return title.includes(search.toLowerCase());
      })
    : archived;

  // Group by company
  const grouped = companies
    .map(c => ({
      company: c,
      tasks: filtered.filter(t => t.companyId === c.id),
    }))
    .filter(g => g.tasks.length > 0);

  const handleRestore = (id: string) => {
    toggleArchive(id);
    showToast('Tarefa restaurada');
    setTimeout(hideToast, 3000);
  };

  const handleDelete = (id: string) => {
    if (deleteTimerRef.current) clearTimeout(deleteTimerRef.current);
    deleteTimerRef.current = setTimeout(() => { permanentlyDeleteTask(id); hideToast(); }, 5000);
    showToast('Tarefa deletada permanentemente', () => {
      if (deleteTimerRef.current) clearTimeout(deleteTimerRef.current);
      hideToast();
    });
    setConfirmDeleteId(null);
  };

  return (
    <div style={{ padding: '32px 36px', height: '100%', overflowY: 'auto' }}>
      <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} style={{ marginBottom: 28 }}>
        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase', color: 'var(--t3)', marginBottom: 6 }}>Histórico</div>
        <h1 style={{ fontSize: 26, fontWeight: 700, color: 'var(--t1)', letterSpacing: '-0.5px' }}>Arquivo</h1>
        <p style={{ fontSize: 13, color: 'var(--t3)', marginTop: 4 }}>
          {archived.length} tarefa{archived.length !== 1 ? 's' : ''} arquivada{archived.length !== 1 ? 's' : ''}
        </p>
      </motion.div>

      {/* Search */}
      <div style={{ position: 'relative', marginBottom: 24, maxWidth: 360 }}>
        <FiSearch size={13} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--t3)', pointerEvents: 'none' }} />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Buscar no arquivo..."
          style={{ width: '100%', background: 'var(--s1)', border: '1px solid var(--b2)', borderRadius: 10, padding: '9px 12px 9px 34px', color: 'var(--t1)', fontSize: 13, outline: 'none', boxSizing: 'border-box' }}
          onFocus={e => { e.currentTarget.style.borderColor = '#356BFF'; }}
          onBlur={e => { e.currentTarget.style.borderColor = 'var(--b2)'; }}
        />
      </div>

      {archived.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--t4)', fontSize: 14 }}>
          Nenhuma tarefa arquivada ainda
        </div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--t4)', fontSize: 14 }}>
          Nenhum resultado para "{search}"
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {grouped.map(({ company, tasks: groupTasks }) => (
            <div key={company.id}>
              {/* Company header */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: company.color }} />
                <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '1.5px', textTransform: 'uppercase', color: 'var(--t3)' }}>
                  {company.name}
                </span>
                <span style={{ fontSize: 10, color: company.color, fontWeight: 700, background: `${company.color}15`, borderRadius: 99, padding: '1px 7px' }}>
                  {groupTasks.length}
                </span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <AnimatePresence>
                  {groupTasks.map((task, i) => {
                    const title = getTaskTitle(task, companies, subClients);
                    const sub = subClients.find(s => s.id === task.subClientId);
                    const isConfirming = confirmDeleteId === task.id;

                    return (
                      <motion.div
                        key={task.id}
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, x: -20, height: 0, marginBottom: 0 }}
                        transition={{ delay: i * 0.02 }}
                        style={{
                          background: 'var(--s1)',
                          border: '1px solid var(--b2)',
                          borderLeft: `3px solid ${company.color}55`,
                          borderRadius: 10,
                          padding: '11px 14px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 12,
                        }}
                      >
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--t2)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', textDecoration: 'line-through', opacity: 0.7 }}>
                            {title}
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
                            {sub && <span style={{ fontSize: 10, color: 'var(--t4)' }}>{sub.name}</span>}
                            <span style={{ fontSize: 10, padding: '1px 6px', borderRadius: 99, background: `${STATUS_COLOR[task.status]}15`, color: STATUS_COLOR[task.status], fontWeight: 600 }}>
                              {STATUS_LABEL[task.status]}
                            </span>
                            <span style={{ fontSize: 10, color: 'var(--t4)' }}>
                              {format(parseISO(task.date), "d MMM yyyy", { locale: ptBR })}
                            </span>
                          </div>
                        </div>

                        {isConfirming ? (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                            <span style={{ fontSize: 11, color: 'var(--t3)' }}>Deletar permanentemente?</span>
                            <button
                              onClick={() => handleDelete(task.id)}
                              style={{ padding: '4px 10px', borderRadius: 6, background: '#ff453a', border: 'none', color: '#fff', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}
                            >Sim</button>
                            <button
                              onClick={() => setConfirmDeleteId(null)}
                              style={{ padding: '4px 10px', borderRadius: 6, background: 'var(--s2)', border: '1px solid var(--b2)', color: 'var(--t2)', fontSize: 11, cursor: 'pointer' }}
                            >Não</button>
                          </div>
                        ) : (
                          <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
                            <button
                              onClick={() => handleRestore(task.id)}
                              title="Restaurar tarefa"
                              style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--t4)', padding: 6, borderRadius: 7, transition: 'all .15s', display: 'flex' }}
                              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--s2)'; (e.currentTarget as HTMLElement).style.color = '#30d158'; }}
                              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; (e.currentTarget as HTMLElement).style.color = 'var(--t4)'; }}
                            ><FiRotateCcw size={13} /></button>
                            <button
                              onClick={() => setConfirmDeleteId(task.id)}
                              title="Deletar permanentemente"
                              style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--t4)', padding: 6, borderRadius: 7, transition: 'all .15s', display: 'flex' }}
                              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--s2)'; (e.currentTarget as HTMLElement).style.color = '#ff453a'; }}
                              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; (e.currentTarget as HTMLElement).style.color = 'var(--t4)'; }}
                            ><FiTrash2 size={13} /></button>
                          </div>
                        )}
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
