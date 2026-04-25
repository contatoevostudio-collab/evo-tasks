import { useState, useRef, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiRotateCcw, FiTrash2, FiSearch, FiX } from 'react-icons/fi';
import { format, parseISO, isAfter, startOfMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useTaskStore } from '../store/tasks';
import { getTaskTitle } from '../types';

const STATUS_COLOR: Record<string, string> = { todo: '#ff9f0a', doing: '#64C4FF', done: '#30d158' };
const STATUS_LABEL: Record<string, string> = { todo: 'A Fazer', doing: 'Fazendo', done: 'Feito' };
const STATUS_RGB: Record<string, string>   = { todo: '255,159,10', doing: '100,196,255', done: '48,209,88' };

export function ArchivePage() {
  const { tasks, companies, subClients, toggleArchive, permanentlyDeleteTask, showToast, hideToast } = useTaskStore();
  const [search, setSearch] = useState('');
  const [companyFilter, setCompanyFilter] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const deleteTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Clear pending delete timer on unmount to avoid calling store after component is gone
  useEffect(() => () => { if (deleteTimerRef.current) clearTimeout(deleteTimerRef.current); }, []);

  const archived = useMemo(
    () => tasks.filter(t => t.archived && !t.deletedAt).sort((a, b) => b.date.localeCompare(a.date)),
    [tasks],
  );

  // Header stats
  const archivedThisMonth = useMemo(() => {
    const start = startOfMonth(new Date());
    return archived.filter(t => {
      try { return isAfter(parseISO(t.date), start) || t.date === format(start, 'yyyy-MM-dd'); }
      catch { return false; }
    }).length;
  }, [archived]);

  // Sidebar: count per company (top results, with totals)
  const companyCounts = useMemo(() => {
    const map = new Map<string, number>();
    archived.forEach(t => {
      if (!t.companyId) return;
      map.set(t.companyId, (map.get(t.companyId) ?? 0) + 1);
    });
    return Array.from(map.entries())
      .map(([id, count]) => ({ company: companies.find(c => c.id === id), count }))
      .filter(x => x.company)
      .sort((a, b) => b.count - a.count);
  }, [archived, companies]);

  const filtered = useMemo(() => {
    let list = archived;
    if (companyFilter) list = list.filter(t => t.companyId === companyFilter);
    const q = search.trim().toLowerCase();
    if (q) {
      list = list.filter(t => getTaskTitle(t, companies, subClients).toLowerCase().includes(q));
    }
    return list;
  }, [archived, companyFilter, search, companies, subClients]);

  const grouped = useMemo(() => companies
    .map(c => ({ company: c, tasks: filtered.filter(t => t.companyId === c.id) }))
    .filter(g => g.tasks.length > 0), [companies, filtered]);

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
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* Compact sticky header */}
      <div style={{ padding: '14px 20px', flexShrink: 0, borderBottom: '1px solid var(--b2)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
        <div>
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase', color: 'var(--t4)', marginBottom: 2 }}>Arquivo</div>
          <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--t1)', letterSpacing: '-0.4px' }}>Tarefas Arquivadas</div>
        </div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
          {([
            { label: 'Total',     value: archived.length,     color: '#64C4FF', rgb: '100,196,255' },
            { label: 'Este mês',  value: archivedThisMonth,   color: '#30d158', rgb: '48,209,88' },
            ...(companyCounts[0] ? [{ label: 'Top empresa', value: companyCounts[0].count, color: companyCounts[0].company!.color, rgb: '53,107,255' }] : []),
          ] as { label: string; value: number; color: string; rgb: string }[]).map(k => (
            <div key={k.label} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 10px', borderRadius: 8, background: `rgba(${k.rgb},0.08)`, border: `1px solid rgba(${k.rgb},0.2)` }}>
              <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.8px', textTransform: 'uppercase', color: `rgba(${k.rgb},0.6)` }}>{k.label}</span>
              <span style={{ fontSize: 13, fontWeight: 700, color: k.color }}>{k.value}</span>
            </div>
          ))}

          {/* Search */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'var(--s1)', border: '1px solid var(--b2)', borderRadius: 9, padding: '6px 10px' }}>
            <FiSearch size={12} style={{ color: 'var(--t4)' }} />
            <input
              placeholder="Buscar..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ background: 'none', border: 'none', outline: 'none', color: 'var(--t1)', fontSize: 12, width: 130 }}
            />
            {search && (
              <button onClick={() => setSearch('')} aria-label="Limpar busca" style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--t4)', display: 'flex', padding: 0 }}>
                <FiX size={11} />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Body: optional sidebar + main */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        {/* Sidebar (only if there are archived items) */}
        {archived.length > 0 && (
          <aside style={{
            width: 220, flexShrink: 0,
            borderRight: '1px solid var(--b2)',
            background: 'rgba(0,0,0,0.14)',
            overflowY: 'auto', padding: '14px 12px',
            display: 'flex', flexDirection: 'column', gap: 12,
          }}>
            {/* Empresas filter */}
            <div style={{ background: 'var(--s1)', borderRadius: 12, border: '1px solid var(--b2)', padding: '12px 12px' }}>
              <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '1.5px', textTransform: 'uppercase', color: 'var(--t3)', marginBottom: 10 }}>Empresas</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <button onClick={() => setCompanyFilter(null)}
                  style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '5px 8px', borderRadius: 7, background: !companyFilter ? 'var(--s2)' : 'transparent', border: 'none', cursor: 'pointer', color: !companyFilter ? 'var(--t1)' : 'var(--t4)', fontSize: 11, fontWeight: !companyFilter ? 600 : 400, textAlign: 'left', transition: 'all .12s' }}>
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--t4)' }} />
                  Todas
                  <span style={{ marginLeft: 'auto', fontSize: 10, color: 'var(--t4)' }}>{archived.length}</span>
                </button>
                {companyCounts.map(({ company, count }) => {
                  const active = companyFilter === company!.id;
                  return (
                    <button key={company!.id} onClick={() => setCompanyFilter(active ? null : company!.id)}
                      style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '5px 8px', borderRadius: 7, background: active ? `${company!.color}18` : 'transparent', border: active ? `1px solid ${company!.color}40` : '1px solid transparent', cursor: 'pointer', color: active ? company!.color : 'var(--t3)', fontSize: 11, fontWeight: active ? 600 : 400, textAlign: 'left', transition: 'all .12s' }}>
                      <span style={{ width: 6, height: 6, borderRadius: '50%', background: company!.color }} />
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>{company!.name}</span>
                      <span style={{ fontSize: 10, color: active ? company!.color : 'var(--t4)', fontWeight: 700 }}>{count}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Status distribution */}
            <div style={{ background: 'var(--s1)', borderRadius: 12, border: '1px solid var(--b2)', padding: '12px 12px' }}>
              <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '1.5px', textTransform: 'uppercase', color: 'var(--t3)', marginBottom: 10 }}>Status</div>
              {(['todo', 'doing', 'done'] as const).map(st => {
                const count = archived.filter(t => t.status === st).length;
                const pct = archived.length > 0 ? (count / archived.length) * 100 : 0;
                return (
                  <div key={st} style={{ marginBottom: 8 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 3 }}>
                      <span style={{ fontSize: 10, color: 'var(--t2)', display: 'flex', alignItems: 'center', gap: 5 }}>
                        <span style={{ width: 6, height: 6, borderRadius: '50%', background: STATUS_COLOR[st] }} />
                        {STATUS_LABEL[st]}
                      </span>
                      <span style={{ fontSize: 10, fontWeight: 700, color: count > 0 ? STATUS_COLOR[st] : 'var(--t4)' }}>{count}</span>
                    </div>
                    <div style={{ height: 3, background: 'var(--b1)', borderRadius: 2, overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${pct}%`, background: STATUS_COLOR[st], borderRadius: 2, transition: 'width .3s' }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </aside>
        )}

        {/* Main content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px 20px' }}>
          {archived.length === 0 ? (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 14, color: 'var(--t4)', padding: 40, minHeight: 280 }}>
              <div style={{ fontSize: 56, opacity: 0.4 }}>📦</div>
              <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--t2)' }}>Nenhum item arquivado</div>
              <div style={{ fontSize: 12, color: 'var(--t4)', textAlign: 'center', maxWidth: 320, lineHeight: 1.5 }}>
                Itens arquivados aparecem aqui pra recuperar a qualquer momento
              </div>
            </div>
          ) : filtered.length === 0 ? (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 14, color: 'var(--t4)', padding: 40, minHeight: 280 }}>
              <div style={{ fontSize: 56, opacity: 0.4 }}>🔍</div>
              <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--t2)' }}>Nenhum resultado</div>
              <div style={{ fontSize: 12, color: 'var(--t4)', textAlign: 'center', maxWidth: 320, lineHeight: 1.5 }}>
                {search ? `Nada encontrado para "${search}"` : 'Tente outro filtro de empresa'}
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {grouped.map(({ company, tasks: groupTasks }) => (
                <div key={company.id} style={{ background: 'var(--s1)', borderRadius: 14, border: '1px solid var(--b2)', overflow: 'hidden' }}>
                  {/* Section header */}
                  <div style={{ padding: '11px 14px', borderBottom: '1px solid var(--b1)', display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: company.color }} />
                    <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '1.5px', textTransform: 'uppercase', color: 'var(--t3)', flex: 1 }}>
                      {company.name}
                    </span>
                    <span style={{ fontSize: 10, fontWeight: 700, color: company.color, background: `${company.color}18`, borderRadius: 99, padding: '1px 8px' }}>
                      {groupTasks.length}
                    </span>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <AnimatePresence>
                      {groupTasks.map((task, i) => {
                        const title = getTaskTitle(task, companies, subClients);
                        const sub = subClients.find(s => s.id === task.subClientId);
                        const isConfirming = confirmDeleteId === task.id;
                        const stRgb = STATUS_RGB[task.status];

                        return (
                          <motion.div
                            key={task.id}
                            initial={{ opacity: 0, y: 4 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, x: -16, height: 0 }}
                            transition={{ delay: i * 0.02 }}
                            style={{
                              padding: '10px 14px',
                              display: 'flex',
                              alignItems: 'center',
                              gap: 12,
                              borderBottom: i < groupTasks.length - 1 ? '1px solid var(--b1)' : 'none',
                            }}
                          >
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--t2)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', textDecoration: 'line-through', opacity: 0.7 }}>
                                {title}
                              </div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4, flexWrap: 'wrap' }}>
                                {sub && <span style={{ fontSize: 10, color: 'var(--t4)' }}>{sub.name}</span>}
                                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 10, padding: '1px 7px', borderRadius: 99, background: `rgba(${stRgb},0.12)`, color: STATUS_COLOR[task.status], fontWeight: 600, border: `1px solid rgba(${stRgb},0.25)` }}>
                                  {STATUS_LABEL[task.status]}
                                </span>
                                <span style={{ fontSize: 10, color: 'var(--t4)' }}>
                                  {format(parseISO(task.date), "d MMM yyyy", { locale: ptBR })}
                                </span>
                              </div>
                            </div>

                            {isConfirming ? (
                              <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                                <span style={{ fontSize: 11, color: 'var(--t3)' }}>Deletar?</span>
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
                                  style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '5px 10px', borderRadius: 7, background: 'rgba(48,209,88,0.1)', border: '1px solid rgba(48,209,88,0.25)', color: '#30d158', fontSize: 11, fontWeight: 600, cursor: 'pointer', transition: 'all .15s' }}
                                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(48,209,88,0.18)'; }}
                                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(48,209,88,0.1)'; }}
                                ><FiRotateCcw size={11} /> Restaurar</button>
                                <button
                                  onClick={() => setConfirmDeleteId(task.id)}
                                  title="Deletar permanentemente"
                                  style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--t4)', padding: 6, borderRadius: 7, transition: 'all .15s', display: 'flex' }}
                                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--s2)'; (e.currentTarget as HTMLElement).style.color = '#ff453a'; }}
                                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; (e.currentTarget as HTMLElement).style.color = 'var(--t4)'; }}
                                ><FiTrash2 size={12} /></button>
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
      </div>
    </div>
  );
}
