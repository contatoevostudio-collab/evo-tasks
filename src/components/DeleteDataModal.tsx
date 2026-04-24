import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { FiX, FiAlertTriangle, FiCheck } from 'react-icons/fi';
import { useTaskStore } from '../store/tasks';
import { useFinanceStore } from '../store/finance';
import { useIdeasStore } from '../store/ideas';
import { useCardsStore } from '../store/cards';
import { useAuthStore } from '../store/auth';
import { supabase } from '../lib/supabase';

type CategoryId =
  | 'tarefas' | 'empresas' | 'leads' | 'todo' | 'calendario'
  | 'ideias' | 'financas' | 'cartoes' | 'notas' | 'pomodoro'
  | 'preferencias';

interface Category {
  id: CategoryId;
  label: string;
  description: string;
  /** tables to delete from Supabase (user_id scoped) */
  tables?: string[];
  /** whether this also affects Supabase or just local */
  syncs: boolean;
}

const CATEGORIES: Category[] = [
  { id: 'tarefas',      label: 'Tarefas',                 description: 'Todas as tarefas + ordenação do kanban', tables: ['tasks'], syncs: true },
  { id: 'empresas',     label: 'Empresas e clientes',     description: 'Remove todas as empresas e subclientes (restaura padrões)', tables: ['companies', 'sub_clients'], syncs: true },
  { id: 'leads',        label: 'CRM (Leads)',             description: 'Todos os leads do funil de vendas', tables: ['leads'], syncs: true },
  { id: 'todo',         label: 'To-Do',                   description: 'Lista de afazeres rápidos', tables: ['todo_items'], syncs: true },
  { id: 'calendario',   label: 'Eventos do calendário',   description: 'Eventos e compromissos (não inclui tarefas)', tables: ['calendar_events'], syncs: true },
  { id: 'ideias',       label: 'Ideias',                  description: 'Banco de ideias e pins', tables: ['ideas'], syncs: true },
  { id: 'financas',     label: 'Finanças',                description: 'Transações, metas e contas recorrentes', tables: ['transactions', 'financial_goals', 'recurring_bills'], syncs: true },
  { id: 'cartoes',      label: 'Meus cartões',            description: 'Cartões de crédito (somente local)', syncs: false },
  { id: 'notas',        label: 'Notas rápidas',           description: 'Sticky notes da sidebar', tables: ['quick_notes'], syncs: true },
  { id: 'pomodoro',     label: 'Sessões pomodoro',        description: 'Histórico de pomodoros (somente local)', syncs: false },
  { id: 'preferencias', label: 'Preferências',            description: 'Tema, accent color, nome, layout — NÃO recomendado', syncs: false },
];

interface Props {
  onClose: () => void;
}

export function DeleteDataModal({ onClose }: Props) {
  const { user } = useAuthStore();
  const [selected, setSelected] = useState<Set<CategoryId>>(new Set());
  const [deleting, setDeleting] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [done, setDone] = useState(false);

  const allSelected = selected.size === CATEGORIES.length;
  const anySelected = selected.size > 0;

  const toggle = (id: CategoryId) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };
  const toggleAll = () => setSelected(allSelected ? new Set() : new Set(CATEGORIES.map((c) => c.id)));

  const handleDelete = async () => {
    if (!anySelected) return;
    setDeleting(true);

    const userId = user?.id;

    // 1) Apagar do Supabase (se logado)
    if (userId) {
      for (const catId of selected) {
        const cat = CATEGORIES.find((c) => c.id === catId);
        if (!cat?.tables) continue;
        for (const table of cat.tables) {
          try {
            await supabase.from(table).delete().eq('user_id', userId);
          } catch (e) {
            console.error(`Falha ao apagar ${table}:`, e);
          }
        }
      }
    }

    // 2) Apagar local
    const tasksStore = useTaskStore.getState();
    const financeStore = useFinanceStore.getState();
    const ideasStore = useIdeasStore.getState();
    const cardsStore = useCardsStore.getState();

    // Snapshot atual pra preservar categorias não selecionadas
    const current = {
      tasks: tasksStore.tasks,
      companies: tasksStore.companies,
      subClients: tasksStore.subClients,
      leads: tasksStore.leads,
      quickNotes: tasksStore.quickNotes,
      todoItems: tasksStore.todoItems,
      calendarEvents: tasksStore.calendarEvents,
    };

    if (selected.has('tarefas')) {
      tasksStore.replaceAll({ ...current, tasks: [] });
      (tasksStore as any).setKanbanOrder?.('todo', []);
      (tasksStore as any).setKanbanOrder?.('doing', []);
      (tasksStore as any).setKanbanOrder?.('done', []);
    }
    if (selected.has('empresas')) {
      // Usa clearAllData parcial: só reseta companies/subClients
      tasksStore.replaceAll({
        ...current,
        companies: [],
        subClients: [],
      });
    }
    if (selected.has('leads')) {
      tasksStore.replaceAll({ ...current, leads: [] });
    }
    if (selected.has('todo')) {
      tasksStore.replaceAll({ ...current, todoItems: [] });
    }
    if (selected.has('calendario')) {
      tasksStore.replaceAll({ ...current, calendarEvents: [] });
    }
    if (selected.has('notas')) {
      tasksStore.replaceAll({ ...current, quickNotes: [] });
    }
    if (selected.has('ideias')) {
      ideasStore.replaceAll([]);
    }
    if (selected.has('financas')) {
      financeStore.replaceAll({ transactions: [], goals: [], recurringBills: [] });
    }
    if (selected.has('cartoes')) {
      cardsStore.replaceAll([]);
    }
    if (selected.has('pomodoro')) {
      (tasksStore as any).clearPomodoroSessions?.();
    }
    if (selected.has('preferencias')) {
      (tasksStore as any).setAccentColor?.('#356BFF');
      (tasksStore as any).setUserName?.('');
      (tasksStore as any).setUserPhoto?.('');
    }

    setDeleting(false);
    setDone(true);
    setTimeout(() => onClose(), 1200);
  };

  if (done) {
    return (
      <AnimatePresence>
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          style={{ position: 'fixed', inset: 0, zIndex: 60, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)' }}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
            style={{
              background: 'var(--modal-bg, rgba(7,11,28,0.94))',
              border: '1px solid rgba(48,209,88,0.3)', borderRadius: 16, padding: 28,
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10,
              maxWidth: 320, textAlign: 'center',
            }}
          >
            <div style={{ width: 48, height: 48, borderRadius: 12, background: 'rgba(48,209,88,0.14)', border: '1px solid rgba(48,209,88,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 24px -4px rgba(48,209,88,0.55)' }}>
              <FiCheck size={24} style={{ color: '#30d158' }} />
            </div>
            <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--t1)' }}>Dados apagados</div>
            <div style={{ fontSize: 12, color: 'var(--t3)' }}>As categorias selecionadas foram removidas{user ? ' local e remotamente' : ' localmente'}.</div>
          </motion.div>
        </motion.div>
      </AnimatePresence>
    );
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        style={{ position: 'fixed', inset: 0, zIndex: 60, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)' }}
        onClick={(e) => e.target === e.currentTarget && !deleting && onClose()}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
          transition={{ duration: 0.18 }}
          className="glass-panel"
          style={{
            width: 520, maxWidth: '92vw', maxHeight: '88vh',
            background: 'var(--modal-bg, rgba(7,11,28,0.94))',
            border: '1px solid var(--b2)', borderRadius: 16,
            overflow: 'hidden', display: 'flex', flexDirection: 'column',
            boxShadow: '0 32px 80px rgba(0,0,0,0.5)',
          }}
        >
          {/* Header */}
          <div style={{ padding: '18px 22px', borderBottom: '1px solid var(--b2)', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{
                width: 38, height: 38, borderRadius: 10,
                background: 'rgba(255,69,58,0.14)', border: '1px solid rgba(255,69,58,0.3)',
                color: '#ff453a',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 0 16px -4px rgba(255,69,58,0.45)',
              }}>
                <FiAlertTriangle size={18} />
              </div>
              <div>
                <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--t1)' }}>Apagar dados</div>
                <div style={{ fontSize: 11, color: 'var(--t3)', marginTop: 2 }}>
                  {user ? 'Remove localmente e no servidor (Supabase)' : 'Remove apenas localmente (sem conta conectada)'}
                </div>
              </div>
            </div>
            <button onClick={onClose} disabled={deleting}
              style={{ background: 'none', border: 'none', cursor: deleting ? 'not-allowed' : 'pointer', color: 'var(--t3)', padding: 4, display: 'flex', opacity: deleting ? 0.4 : 1 }}>
              <FiX size={16} />
            </button>
          </div>

          {/* Select all */}
          <div style={{ padding: '12px 22px', borderBottom: '1px solid var(--b2)' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', userSelect: 'none' }}>
              <div
                onClick={toggleAll}
                style={{
                  width: 18, height: 18, borderRadius: 5,
                  border: `2px solid ${allSelected ? '#ff453a' : 'var(--b3)'}`,
                  background: allSelected ? '#ff453a' : 'transparent',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  transition: 'all .12s', flexShrink: 0,
                }}
              >
                {allSelected && <FiCheck size={11} style={{ color: '#fff', strokeWidth: 3 }} />}
              </div>
              <span style={{ fontSize: 12, fontWeight: 700, color: allSelected ? '#ff453a' : 'var(--t2)' }}>
                {allSelected ? 'Desmarcar tudo' : 'Selecionar tudo'}
              </span>
              <span style={{ fontSize: 11, color: 'var(--t4)', marginLeft: 'auto' }}>
                {selected.size} / {CATEGORIES.length}
              </span>
            </label>
          </div>

          {/* Categories list */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '12px 10px' }}>
            {CATEGORIES.map((cat) => {
              const isSelected = selected.has(cat.id);
              return (
                <label
                  key={cat.id}
                  style={{
                    display: 'flex', alignItems: 'flex-start', gap: 12,
                    padding: '10px 12px', borderRadius: 10,
                    cursor: 'pointer',
                    background: isSelected ? 'rgba(255,69,58,0.08)' : 'transparent',
                    border: `1px solid ${isSelected ? 'rgba(255,69,58,0.25)' : 'transparent'}`,
                    transition: 'all .12s',
                  }}
                  onMouseEnter={(e) => { if (!isSelected) (e.currentTarget as HTMLElement).style.background = 'var(--s2)'; }}
                  onMouseLeave={(e) => { if (!isSelected) (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
                >
                  <div
                    onClick={(e) => { e.preventDefault(); toggle(cat.id); }}
                    style={{
                      width: 18, height: 18, borderRadius: 5,
                      border: `2px solid ${isSelected ? '#ff453a' : 'var(--b3)'}`,
                      background: isSelected ? '#ff453a' : 'transparent',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      marginTop: 1, flexShrink: 0,
                      transition: 'all .12s',
                    }}
                  >
                    {isSelected && <FiCheck size={11} style={{ color: '#fff', strokeWidth: 3 }} />}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--t1)' }}>{cat.label}</span>
                      {!cat.syncs && (
                        <span style={{
                          fontSize: 9, fontWeight: 700, letterSpacing: '0.5px', textTransform: 'uppercase',
                          padding: '1px 6px', borderRadius: 4,
                          color: 'var(--t4)', background: 'var(--s2)', border: '1px solid var(--b2)',
                        }}>
                          local
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--t3)', marginTop: 2, lineHeight: 1.4 }}>
                      {cat.description}
                    </div>
                  </div>
                </label>
              );
            })}
          </div>

          {/* Footer */}
          <div style={{ padding: '14px 22px', borderTop: '1px solid var(--b2)', display: 'flex', flexDirection: 'column', gap: 10 }}>
            {anySelected && !confirmed && (
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', padding: '8px 10px', borderRadius: 8, background: 'rgba(255,69,58,0.06)', border: '1px solid rgba(255,69,58,0.2)' }}>
                <div
                  onClick={() => setConfirmed((c) => !c)}
                  style={{
                    width: 16, height: 16, borderRadius: 4,
                    border: `2px solid ${confirmed ? '#ff453a' : 'var(--b3)'}`,
                    background: confirmed ? '#ff453a' : 'transparent',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    transition: 'all .12s', flexShrink: 0,
                  }}
                >
                  {confirmed && <FiCheck size={10} style={{ color: '#fff', strokeWidth: 3 }} />}
                </div>
                <span style={{ fontSize: 11, color: '#ff453a', fontWeight: 600 }}>
                  Entendo que essa ação não pode ser desfeita
                </span>
              </label>
            )}

            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button
                onClick={onClose}
                disabled={deleting}
                style={{
                  padding: '9px 18px', borderRadius: 10,
                  background: 'var(--s2)', border: '1px solid var(--b2)',
                  color: 'var(--t2)', fontSize: 12, fontWeight: 600,
                  cursor: deleting ? 'not-allowed' : 'pointer',
                  opacity: deleting ? 0.4 : 1,
                }}
              >
                Cancelar
              </button>
              <button
                onClick={handleDelete}
                disabled={!anySelected || !confirmed || deleting}
                style={{
                  padding: '9px 18px', borderRadius: 10,
                  background: '#ff453a', border: 'none',
                  color: '#fff', fontSize: 12, fontWeight: 700,
                  cursor: (!anySelected || !confirmed || deleting) ? 'not-allowed' : 'pointer',
                  opacity: (!anySelected || !confirmed || deleting) ? 0.35 : 1,
                  boxShadow: (anySelected && confirmed && !deleting) ? '0 0 20px -4px rgba(255,69,58,0.6)' : 'none',
                  display: 'inline-flex', alignItems: 'center', gap: 6,
                }}
              >
                {deleting ? 'Apagando...' : (
                  <>
                    <FiAlertTriangle size={12} />
                    Apagar {selected.size > 0 ? `(${selected.size})` : ''}
                  </>
                )}
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
