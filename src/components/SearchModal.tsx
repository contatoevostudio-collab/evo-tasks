import { useState, useEffect, useRef, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  FiSearch, FiX, FiCheckSquare, FiBriefcase, FiUser, FiTrendingUp,
  FiZap, FiFileText, FiDollarSign, FiList, FiArrowRight, FiHome,
  FiCalendar, FiArchive, FiInbox, FiPieChart, FiBookOpen,
} from 'react-icons/fi';
import { useTaskStore } from '../store/tasks';
import { useIdeasStore, TAG_CONFIG, STATUS_CONFIG } from '../store/ideas';
import { useProposalsStore } from '../store/proposals';
import { useFinanceStore } from '../store/finance';
import { getTaskTitle } from '../types';
import type { Task, PageType, LeadStage, ProposalStatus } from '../types';
import { fmtBRL, fmtDate } from '../lib/format';

interface Props {
  onClose: () => void;
  onTaskClick: (task: Task) => void;
  onNavigate?: (page: PageType, ctx?: { companyId?: string }) => void;
}

const STATUS_COLOR: Record<string, string> = {
  todo: '#ff9f0a',
  doing: '#64C4FF',
  done: '#30d158',
  standby: '#636366',
};
const STATUS_LABEL: Record<string, string> = {
  todo: 'A Fazer',
  doing: 'Fazendo',
  done: 'Feito',
  standby: 'Standby',
};

const LEAD_STAGE_LABEL: Record<LeadStage, string> = {
  prospeccao: 'Prospecção',
  contato: 'Contato',
  proposta: 'Proposta',
  negociacao: 'Negociação',
  fechado: 'Fechado',
};
const LEAD_STAGE_COLOR: Record<LeadStage, string> = {
  prospeccao: '#636366',
  contato: '#ff9f0a',
  proposta: '#356BFF',
  negociacao: '#bf5af2',
  fechado: '#30d158',
};

const TEMP_COLOR: Record<'frio' | 'morno' | 'quente', string> = {
  frio: '#64C4FF', morno: '#ff9f0a', quente: '#ff453a',
};
const TEMP_LABEL: Record<'frio' | 'morno' | 'quente', string> = {
  frio: 'Frio', morno: 'Morno', quente: 'Quente',
};

const PROPOSAL_STATUS_COLOR: Record<ProposalStatus, string> = {
  rascunho: '#636366', enviada: '#356BFF', aceita: '#30d158', recusada: '#ff453a',
};
const PROPOSAL_STATUS_LABEL: Record<ProposalStatus, string> = {
  rascunho: 'Rascunho', enviada: 'Enviada', aceita: 'Aceita', recusada: 'Recusada',
};

const COMPANY_STATUS_COLOR: Record<string, string> = {
  ativo: '#30d158', pausado: '#ff9f0a', inativo: '#636366',
};

const PER_CATEGORY_LIMIT = 5;

type ResultRow =
  | { kind: 'command'; id: string; title: string; subtitle?: string; icon: React.ReactNode; iconColor: string; onSelect(): void }
  | { kind: 'task'; id: string; title: string; subtitle?: string; chipLabel: string; chipColor: string; iconColor: string; data: Task }
  | { kind: 'company'; id: string; title: string; subtitle?: string; chipLabel?: string; chipColor?: string; iconColor: string }
  | { kind: 'subclient'; id: string; title: string; subtitle?: string; iconColor: string; companyId: string }
  | { kind: 'lead'; id: string; title: string; subtitle?: string; chipLabel?: string; chipColor?: string; iconColor: string }
  | { kind: 'idea'; id: string; title: string; subtitle?: string; chipLabel?: string; chipColor?: string; iconColor: string }
  | { kind: 'proposal'; id: string; title: string; subtitle?: string; chipLabel: string; chipColor: string; iconColor: string }
  | { kind: 'transaction'; id: string; title: string; subtitle?: string; chipLabel?: string; chipColor?: string; iconColor: string }
  | { kind: 'todo'; id: string; title: string; subtitle?: string; chipLabel: string; chipColor: string; iconColor: string };

interface Group {
  key: string;
  label: string;
  rows: ResultRow[];
}

function iconForKind(kind: ResultRow['kind']): React.ReactNode {
  const size = 14;
  switch (kind) {
    case 'command':     return <FiArrowRight size={size} />;
    case 'task':        return <FiCheckSquare size={size} />;
    case 'company':     return <FiBriefcase size={size} />;
    case 'subclient':   return <FiUser size={size} />;
    case 'lead':        return <FiTrendingUp size={size} />;
    case 'idea':        return <FiZap size={size} />;
    case 'proposal':    return <FiFileText size={size} />;
    case 'transaction': return <FiDollarSign size={size} />;
    case 'todo':        return <FiList size={size} />;
  }
}

const PAGE_COMMANDS: { id: string; title: string; page: PageType; keywords: string; icon: React.ReactNode; color: string }[] = [
  { id: 'cmd-home',      title: 'Ir para Home',      page: 'home',      keywords: 'home início inicio dashboard', icon: <FiHome size={14} />,         color: '#64C4FF' },
  { id: 'cmd-tarefas',   title: 'Ir para Tarefas',   page: 'tarefas',   keywords: 'tarefas tasks calendar calendario', icon: <FiCheckSquare size={14} />, color: '#356BFF' },
  { id: 'cmd-empresas',  title: 'Ir para Empresas',  page: 'empresas',  keywords: 'empresas clientes companies',   icon: <FiBriefcase size={14} />,    color: '#bf5af2' },
  { id: 'cmd-crm',       title: 'Ir para CRM',       page: 'crm',       keywords: 'crm leads vendas pipeline',     icon: <FiTrendingUp size={14} />,   color: '#ff9f0a' },
  { id: 'cmd-todo',      title: 'Ir para To-Do',     page: 'todo',      keywords: 'todo lista checklist',          icon: <FiList size={14} />,         color: '#30d158' },
  { id: 'cmd-ideias',    title: 'Ir para Ideias',    page: 'ideias',    keywords: 'ideias ideas brainstorm',       icon: <FiZap size={14} />,          color: '#ffd60a' },
  { id: 'cmd-financas',  title: 'Ir para Finanças',  page: 'financas',  keywords: 'financas finanças finance dinheiro', icon: <FiPieChart size={14} />, color: '#30d158' },
  { id: 'cmd-propostas', title: 'Ir para Propostas', page: 'propostas', keywords: 'propostas proposals orcamento', icon: <FiFileText size={14} />,     color: '#356BFF' },
  { id: 'cmd-arquivo',   title: 'Ir para Arquivo',   page: 'arquivo',   keywords: 'arquivo arquivado archive',     icon: <FiArchive size={14} />,      color: '#636366' },
];

export function SearchModal({ onClose, onTaskClick, onNavigate }: Props) {
  const { tasks, companies, subClients, leads, todoItems, theme, setTheme } = useTaskStore();
  const { ideas } = useIdeasStore();
  const { proposals } = useProposalsStore();
  const { transactions } = useFinanceStore();

  const [query, setQuery] = useState('');
  const [highlighted, setHighlighted] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // ── Build grouped results ──────────────────────────────────────────────
  const groups: Group[] = useMemo(() => {
    const q = query.trim().toLowerCase();
    const out: Group[] = [];

    // Commands group
    const isLight = theme.startsWith('light');
    const cmds: { id: string; title: string; subtitle?: string; icon: React.ReactNode; color: string; keywords: string; onSelect(): void }[] = [
      ...PAGE_COMMANDS.map(p => ({
        id: p.id, title: p.title, icon: p.icon, color: p.color, keywords: p.keywords,
        onSelect: () => { onNavigate?.(p.page); onClose(); },
      })),
      {
        id: 'cmd-theme-toggle',
        title: isLight ? 'Mudar para tema escuro' : 'Mudar para tema claro',
        icon: <FiBookOpen size={14} />, color: '#64C4FF',
        keywords: 'tema theme dark light claro escuro modo',
        onSelect: () => { setTheme(isLight ? 'dark-blue' : 'light-soft'); onClose(); },
      },
    ];
    const commandRows: ResultRow[] = [];
    cmds.forEach(c => {
      if (q.length === 0 || c.title.toLowerCase().includes(q) || c.keywords.includes(q)) {
        commandRows.push({
          kind: 'command', id: c.id, title: c.title, subtitle: c.subtitle,
          icon: c.icon, iconColor: c.color, onSelect: c.onSelect,
        });
      }
    });
    if (commandRows.length > 0) {
      const limit = q.length === 0 ? 50 : PER_CATEGORY_LIMIT;
      out.push({ key: 'commands', label: 'Comandos', rows: commandRows.slice(0, limit) });
    }

    // Empty query → only commands
    if (q.length === 0) return out;

    // Tasks
    const taskRows: ResultRow[] = tasks
      .filter(t => !t.archived && !t.deletedAt)
      .map(t => {
        const title = getTaskTitle(t, companies, subClients);
        const haystack = (
          title + ' ' + (t.notes ?? '') + ' ' + (t.tags ?? []).join(' ')
        ).toLowerCase();
        return { t, title, match: haystack.includes(q) };
      })
      .filter(x => x.match)
      .slice(0, PER_CATEGORY_LIMIT)
      .map(({ t, title }) => {
        let subtitle = '';
        try {
          subtitle = t.date ? fmtDate(t.date, 'monthDay') : (t.inbox ? 'Caixa de entrada' : '');
        } catch { subtitle = t.date; }
        return {
          kind: 'task' as const,
          id: t.id, title,
          subtitle: subtitle || undefined,
          chipLabel: STATUS_LABEL[t.status] ?? t.status,
          chipColor: STATUS_COLOR[t.status] ?? '#636366',
          iconColor: t.colorOverride ?? companies.find(c => c.id === t.companyId)?.color ?? '#356BFF',
          data: t,
        };
      });
    if (taskRows.length > 0) out.push({ key: 'tasks', label: 'Tarefas', rows: taskRows });

    // Companies
    const companyRows: ResultRow[] = companies
      .filter(c => !c.archived && !c.deletedAt && c.name.toLowerCase().includes(q))
      .slice(0, PER_CATEGORY_LIMIT)
      .map(c => {
        const subCount = subClients.filter(s => s.companyId === c.id).length;
        const taskCount = tasks.filter(t => t.companyId === c.id && !t.archived).length;
        const status = c.status ?? 'ativo';
        return {
          kind: 'company' as const,
          id: c.id, title: c.name,
          subtitle: `${subCount} subclient${subCount === 1 ? '' : 's'} · ${taskCount} tarefa${taskCount === 1 ? '' : 's'}`,
          chipLabel: status,
          chipColor: COMPANY_STATUS_COLOR[status] ?? '#636366',
          iconColor: c.color || '#356BFF',
        };
      });
    if (companyRows.length > 0) out.push({ key: 'companies', label: 'Empresas', rows: companyRows });

    // Subclients
    const subclientRows: ResultRow[] = subClients
      .filter(s => !s.deletedAt && s.name.toLowerCase().includes(q))
      .slice(0, PER_CATEGORY_LIMIT)
      .map(s => {
        const company = companies.find(c => c.id === s.companyId);
        return {
          kind: 'subclient' as const,
          id: s.id, title: s.name,
          subtitle: company?.name ?? 'Sem empresa',
          iconColor: company?.color ?? '#636366',
          companyId: s.companyId,
        };
      });
    if (subclientRows.length > 0) out.push({ key: 'subclients', label: 'Subclients', rows: subclientRows });

    // Leads
    const leadRows: ResultRow[] = leads
      .filter(l => {
        if (l.deletedAt) return false;
        const linkedCompany = l.linkedCompanyId ? companies.find(c => c.id === l.linkedCompanyId) : undefined;
        const haystack = (
          l.name + ' ' + (l.contact ?? '') + ' ' + (l.email ?? '') +
          ' ' + (l.phone ?? '') + ' ' + (linkedCompany?.name ?? '')
        ).toLowerCase();
        return haystack.includes(q);
      })
      .slice(0, PER_CATEGORY_LIMIT)
      .map(l => ({
        kind: 'lead' as const,
        id: l.id, title: l.name,
        subtitle: LEAD_STAGE_LABEL[l.stage] + (l.contact ? ` · ${l.contact}` : ''),
        chipLabel: l.temperature ? TEMP_LABEL[l.temperature] : undefined,
        chipColor: l.temperature ? TEMP_COLOR[l.temperature] : undefined,
        iconColor: LEAD_STAGE_COLOR[l.stage],
      }));
    if (leadRows.length > 0) out.push({ key: 'leads', label: 'Leads', rows: leadRows });

    // Ideas
    const ideaRows: ResultRow[] = ideas
      .filter(i => !i.deletedAt)
      .filter(i => {
        const haystack = (i.title + ' ' + (i.description ?? '')).toLowerCase();
        return haystack.includes(q);
      })
      .slice(0, PER_CATEGORY_LIMIT)
      .map(i => {
        const tagInfo = TAG_CONFIG[i.tag];
        const statusInfo = i.status ? STATUS_CONFIG[i.status] : undefined;
        return {
          kind: 'idea' as const,
          id: i.id, title: i.title,
          subtitle: tagInfo?.label,
          chipLabel: statusInfo?.label,
          chipColor: statusInfo?.color,
          iconColor: tagInfo?.color ?? '#ffd60a',
        };
      });
    if (ideaRows.length > 0) out.push({ key: 'ideas', label: 'Ideias', rows: ideaRows });

    // Proposals
    const proposalRows: ResultRow[] = proposals
      .filter(p => p.clientName.toLowerCase().includes(q) || p.service.toLowerCase().includes(q))
      .slice(0, PER_CATEGORY_LIMIT)
      .map(p => ({
        kind: 'proposal' as const,
        id: p.id, title: p.clientName,
        subtitle: p.service.replace(/-/g, ' '),
        chipLabel: PROPOSAL_STATUS_LABEL[p.status],
        chipColor: PROPOSAL_STATUS_COLOR[p.status],
        iconColor: '#356BFF',
      }));
    if (proposalRows.length > 0) out.push({ key: 'proposals', label: 'Propostas', rows: proposalRows });

    // Transactions
    const transactionRows: ResultRow[] = transactions
      .filter(t => (t.description + ' ' + t.category).toLowerCase().includes(q))
      .slice(0, PER_CATEGORY_LIMIT)
      .map(t => {
        let dateLabel = '';
        try { dateLabel = fmtDate(t.date, 'shortNoYear'); } catch { dateLabel = t.date; }
        return {
          kind: 'transaction' as const,
          id: t.id, title: t.description,
          subtitle: `${fmtBRL(t.amount)} · ${dateLabel} · ${t.category}`,
          chipLabel: t.type === 'receita' ? 'Receita' : 'Despesa',
          chipColor: t.type === 'receita' ? '#30d158' : '#ff453a',
          iconColor: t.type === 'receita' ? '#30d158' : '#ff453a',
        };
      });
    if (transactionRows.length > 0) out.push({ key: 'transactions', label: 'Transações', rows: transactionRows });

    // To-Do items
    const todoRows: ResultRow[] = todoItems
      .filter(t => !t.archived && t.text.toLowerCase().includes(q))
      .slice(0, PER_CATEGORY_LIMIT)
      .map(t => {
        let dateLabel = '';
        try { dateLabel = fmtDate(t.date, 'shortNoYear'); } catch { dateLabel = t.date; }
        return {
          kind: 'todo' as const,
          id: t.id, title: t.text,
          subtitle: dateLabel,
          chipLabel: STATUS_LABEL[t.status] ?? t.status,
          chipColor: STATUS_COLOR[t.status] ?? '#636366',
          iconColor: '#30d158',
        };
      });
    if (todoRows.length > 0) out.push({ key: 'todos', label: 'To-Do', rows: todoRows });

    return out;
  }, [
    query, theme, tasks, companies, subClients, leads, ideas, proposals, transactions, todoItems,
    onNavigate, onClose, setTheme,
  ]);

  // Flatten rows for keyboard navigation
  const flatRows: ResultRow[] = useMemo(() => groups.flatMap(g => g.rows), [groups]);
  const totalRows = flatRows.length;

  // Reset highlight when query changes
  useEffect(() => { setHighlighted(0); }, [query]);

  // Focus input on mount
  useEffect(() => { inputRef.current?.focus(); }, []);

  // Scroll highlighted row into view
  useEffect(() => {
    const el = listRef.current?.querySelector<HTMLElement>(`[data-search-row="${highlighted}"]`);
    if (el && typeof el.scrollIntoView === 'function') {
      el.scrollIntoView({ block: 'nearest' });
    }
  }, [highlighted]);

  // Activate a row
  const activateRow = (row: ResultRow) => {
    switch (row.kind) {
      case 'command':
        row.onSelect();
        break;
      case 'task':
        onTaskClick(row.data);
        break;
      case 'company':
        onNavigate?.('empresas', { companyId: row.id });
        onClose();
        break;
      case 'subclient':
        onNavigate?.('empresas', { companyId: row.companyId });
        onClose();
        break;
      case 'lead':
        onNavigate?.('crm');
        onClose();
        break;
      case 'idea':
        onNavigate?.('ideias');
        onClose();
        break;
      case 'proposal':
        onNavigate?.('propostas');
        onClose();
        break;
      case 'transaction':
        onNavigate?.('financas');
        onClose();
        break;
      case 'todo':
        onNavigate?.('todo');
        onClose();
        break;
    }
  };

  // Keyboard navigation
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { onClose(); return; }
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setHighlighted(s => totalRows === 0 ? 0 : Math.min(s + 1, totalRows - 1));
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setHighlighted(s => Math.max(s - 1, 0));
      }
      if (e.key === 'Enter') {
        const row = flatRows[highlighted];
        if (row) {
          e.preventDefault();
          activateRow(row);
        }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [flatRows, highlighted, totalRows, onClose]);

  const showEmpty = query.trim().length > 0 && totalRows === 0;

  // Running index counter for global highlight
  let runningIndex = 0;

  return (
    <motion.div
      style={{
        position: 'fixed', inset: 0, zIndex: 100,
        display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
        paddingTop: '12vh',
      }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <motion.div
        style={{
          position: 'absolute', inset: 0,
          background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(6px)',
        }}
        onClick={onClose}
      />
      <motion.div
        style={{
          position: 'relative', zIndex: 1,
          width: '100%', maxWidth: 640, margin: '0 16px',
          background: 'var(--modal-bg)',
          border: '1px solid var(--b2)',
          borderRadius: 16,
          overflow: 'hidden',
          boxShadow: '0 32px 80px rgba(0,0,0,0.5)',
        }}
        initial={{ scale: 0.96, opacity: 0, y: -16 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.96, opacity: 0, y: -16 }}
        transition={{ type: 'spring', damping: 28, stiffness: 380 }}
      >
        {/* Input */}
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
          <FiSearch
            size={16}
            style={{ position: 'absolute', left: 16, color: 'var(--t3)', pointerEvents: 'none' }}
          />
          <input
            ref={inputRef}
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Buscar tarefas, empresas, leads, ideias, comandos…"
            style={{
              flex: 1, padding: '14px 80px 14px 44px',
              fontSize: 16, fontWeight: 500,
              background: 'transparent', border: 'none', outline: 'none',
              color: 'var(--t1)',
            }}
          />
          {query && (
            <button
              onClick={() => { setQuery(''); inputRef.current?.focus(); }}
              style={{
                position: 'absolute', right: 56,
                background: 'none', border: 'none', cursor: 'pointer',
                color: 'var(--t3)', padding: 4, display: 'flex',
              }}
              title="Limpar"
            >
              <FiX size={14} />
            </button>
          )}
          <span
            style={{
              position: 'absolute', right: 14,
              fontSize: 10, fontWeight: 700, letterSpacing: '0.5px',
              color: 'var(--t4)', background: 'var(--s1)',
              padding: '4px 8px', borderRadius: 6,
              border: '1px solid var(--b1)',
            }}
          >
            ESC
          </span>
        </div>

        {/* Results */}
        <div
          ref={listRef}
          style={{
            maxHeight: '60vh', overflowY: 'auto',
            borderTop: '1px solid var(--b2)',
          }}
        >
          {showEmpty && (
            <div style={{
              padding: '40px 16px', textAlign: 'center',
              color: 'var(--t3)', fontSize: 13,
            }}>
              <div style={{ fontSize: 32, marginBottom: 12 }}>🔍</div>
              <div>Nada encontrado para “{query}”</div>
            </div>
          )}

          {!showEmpty && groups.map(group => (
            <div key={group.key}>
              <div style={{
                fontSize: 9, fontWeight: 700, letterSpacing: '1.5px',
                textTransform: 'uppercase', color: 'var(--t4)',
                padding: '10px 16px 6px',
              }}>
                {group.label}
              </div>
              {group.rows.map(row => {
                const idx = runningIndex++;
                const isHighlighted = idx === highlighted;
                const icon = row.kind === 'command' ? row.icon : iconForKind(row.kind);
                const chipLabel = 'chipLabel' in row ? row.chipLabel : undefined;
                const chipColor = 'chipColor' in row ? row.chipColor : undefined;
                return (
                  <button
                    key={row.id}
                    data-search-row={idx}
                    onClick={() => activateRow(row)}
                    onMouseEnter={() => setHighlighted(idx)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 12,
                      width: '100%', padding: '10px 16px',
                      background: isHighlighted ? 'var(--s2)' : 'transparent',
                      border: 'none', cursor: 'pointer', textAlign: 'left',
                      transition: 'background .12s',
                    }}
                  >
                    <span style={{
                      color: row.iconColor, flexShrink: 0,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      width: 16, height: 16,
                    }}>
                      {icon}
                    </span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{
                        fontSize: 13, color: 'var(--t1)', fontWeight: 500,
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      }}>
                        {row.title}
                      </div>
                      {row.subtitle && (
                        <div style={{
                          fontSize: 11, color: 'var(--t4)', marginTop: 2,
                          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                        }}>
                          {row.subtitle}
                        </div>
                      )}
                    </div>
                    {chipLabel && chipColor && (
                      <span style={{
                        fontSize: 9, fontWeight: 700, letterSpacing: '0.5px',
                        textTransform: 'uppercase',
                        padding: '2px 7px', borderRadius: 99,
                        background: `${chipColor}22`, color: chipColor,
                        flexShrink: 0,
                      }}>
                        {chipLabel}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          ))}

          {!showEmpty && totalRows > 0 && (
            <div style={{
              padding: '10px 16px',
              borderTop: '1px solid var(--b1)',
              display: 'flex', alignItems: 'center', gap: 14,
              fontSize: 10, color: 'var(--t4)',
            }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <kbd style={kbdStyle}>↑</kbd>
                <kbd style={kbdStyle}>↓</kbd>
                navegar
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <kbd style={kbdStyle}>↵</kbd>
                abrir
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <kbd style={kbdStyle}>esc</kbd>
                fechar
              </span>
              <span style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 4 }}>
                <FiInbox size={10} />
                {totalRows} resultado{totalRows === 1 ? '' : 's'}
              </span>
            </div>
          )}

          {!showEmpty && query.trim().length === 0 && (
            <div style={{
              padding: '10px 16px',
              borderTop: '1px solid var(--b1)',
              display: 'flex', alignItems: 'center', gap: 8,
              fontSize: 10, color: 'var(--t4)',
            }}>
              <FiCalendar size={10} />
              Digite para buscar tarefas, empresas, leads, ideias, propostas, transações…
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}

const kbdStyle: React.CSSProperties = {
  fontFamily: 'inherit',
  fontSize: 9, fontWeight: 700,
  padding: '2px 5px', borderRadius: 4,
  background: 'var(--s1)', border: '1px solid var(--b1)',
  color: 'var(--t3)', minWidth: 16, textAlign: 'center',
};
