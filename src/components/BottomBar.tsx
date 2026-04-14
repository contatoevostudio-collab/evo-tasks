import { format, addMonths, subMonths, addWeeks, subWeeks, addDays, subDays, startOfWeek, startOfMonth, endOfMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { FiChevronLeft, FiChevronRight, FiTarget, FiX } from 'react-icons/fi';
import { MdViewKanban, MdCalendarMonth, MdViewWeek, MdCalendarViewDay } from 'react-icons/md';
import { useTaskStore } from '../store/tasks';
import type { ViewMode, Priority, TaskType } from '../types';

const VIEWS: { id: ViewMode; label: string; Icon: React.ElementType }[] = [
  { id: 'kanban', label: 'Kanban', Icon: MdViewKanban },
  { id: 'day',    label: 'Dia',    Icon: MdCalendarViewDay },
  { id: 'week',   label: 'Semana', Icon: MdViewWeek },
  { id: 'month',  label: 'Mês',    Icon: MdCalendarMonth },
];

const PRIORITY_FILTERS: { value: Priority; label: string; color: string }[] = [
  { value: 'alta',  label: 'ALT', color: '#ff453a' },
  { value: 'media', label: 'MED', color: '#ff9f0a' },
  { value: 'baixa', label: 'BAI', color: '#64C4FF' },
];

const TYPE_FILTERS: { value: TaskType; label: string }[] = [
  { value: 'feed',      label: 'Feed' },
  { value: 'story',     label: 'Story' },
  { value: 'carrossel', label: 'Carro' },
  { value: 'reels',     label: 'Reels' },
  { value: 'thumb',     label: 'Thumb' },
];

export function BottomBar() {
  const {
    viewMode, setViewMode, currentDate, setCurrentDate,
    tasks, selectedCompanies,
    hideDone, toggleHideDone,
    filterPriority, setFilterPriority,
    filterSubClient,
    filterTaskType, setFilterTaskType,
    clearAllFilters,
  } = useTaskStore();

  const goToday   = () => setCurrentDate(new Date());
  const focusMode = () => { setViewMode('day'); setCurrentDate(new Date()); };

  const goPrev = () => {
    if (viewMode === 'month' || viewMode === 'kanban') setCurrentDate(subMonths(currentDate, 1));
    else if (viewMode === 'week') setCurrentDate(subWeeks(currentDate, 1));
    else setCurrentDate(subDays(currentDate, 1));
  };

  const goNext = () => {
    if (viewMode === 'month' || viewMode === 'kanban') setCurrentDate(addMonths(currentDate, 1));
    else if (viewMode === 'week') setCurrentDate(addWeeks(currentDate, 1));
    else setCurrentDate(addDays(currentDate, 1));
  };

  const getTitle = () => {
    if (viewMode === 'month' || viewMode === 'kanban') return format(currentDate, 'MMMM yyyy', { locale: ptBR });
    if (viewMode === 'week') return format(currentDate, "d 'de' MMMM", { locale: ptBR });
    return format(currentDate, "EEEE, d 'de' MMMM", { locale: ptBR });
  };

  const periodCount = (() => {
    let base = tasks.filter(t => selectedCompanies.includes(t.companyId) && !t.archived);
    if (viewMode === 'day') {
      const ds = format(currentDate, 'yyyy-MM-dd');
      base = base.filter(t => t.date === ds);
    } else if (viewMode === 'week') {
      const ws = format(startOfWeek(currentDate, { weekStartsOn: 1 }), 'yyyy-MM-dd');
      const we = format(addDays(startOfWeek(currentDate, { weekStartsOn: 1 }), 6), 'yyyy-MM-dd');
      base = base.filter(t => t.date >= ws && t.date <= we);
    } else if (viewMode === 'month') {
      const ms = format(startOfMonth(currentDate), 'yyyy-MM-dd');
      const me = format(endOfMonth(currentDate), 'yyyy-MM-dd');
      base = base.filter(t => t.date >= ms && t.date <= me);
    }
    return { total: base.length, done: base.filter(t => t.status === 'done').length };
  })();

  const anyFilterActive = hideDone || !!filterPriority || !!filterSubClient || !!filterTaskType;

  const navBtn = (onClick: () => void, children: React.ReactNode) => (
    <button
      onClick={onClick}
      style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '6px 8px', borderRadius: 8, background: 'transparent',
        border: 'none', cursor: 'pointer', color: 'var(--t2)',
        transition: 'all .15s',
      }}
      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--s2)'; (e.currentTarget as HTMLElement).style.color = 'var(--t1)'; }}
      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; (e.currentTarget as HTMLElement).style.color = 'var(--t2)'; }}
    >
      {children}
    </button>
  );

  return (
    <div style={{
      height: 54,
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '0 20px',
      background: 'var(--modal-bg)',
      borderTop: '1px solid var(--b1)',
      backdropFilter: 'blur(12px)',
      flexShrink: 0, gap: 12,
    }}>
      {/* Left: date nav + count */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 4, minWidth: 0 }}>
        {navBtn(goPrev, <FiChevronLeft size={16} />)}
        {navBtn(goToday, <span style={{ fontSize: 12, fontWeight: 500, padding: '0 2px' }}>Hoje</span>)}
        {navBtn(goNext, <FiChevronRight size={16} />)}
        <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--t2)', marginLeft: 4, textTransform: 'capitalize', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {getTitle()}
        </span>
        {viewMode !== 'kanban' && (
          <span style={{ fontSize: 10, fontWeight: 600, padding: '2px 7px', borderRadius: 99, background: 'var(--s1)', color: 'var(--t3)', marginLeft: 6, flexShrink: 0 }}>
            {periodCount.done}/{periodCount.total}
          </span>
        )}
      </div>

      {/* Center: filters */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0, flexWrap: 'nowrap' }}>
        <button
          onClick={focusMode}
          title="Focar em hoje"
          style={{
            display: 'flex', alignItems: 'center', gap: 5,
            padding: '4px 10px', borderRadius: 8, fontSize: 11,
            background: 'transparent', border: '1px solid var(--b2)',
            color: 'var(--t3)', cursor: 'pointer', transition: 'all .15s',
          }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = '#356BFF'; (e.currentTarget as HTMLElement).style.borderColor = '#356BFF55'; }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'var(--t3)'; (e.currentTarget as HTMLElement).style.borderColor = 'var(--b2)'; }}
        >
          <FiTarget size={11} /> Hoje
        </button>

        <button
          onClick={toggleHideDone}
          style={{
            padding: '4px 10px', borderRadius: 8, fontSize: 11, fontWeight: hideDone ? 600 : 400,
            background: hideDone ? 'rgba(48,209,88,0.12)' : 'transparent',
            border: `1px solid ${hideDone ? '#30d15855' : 'var(--b2)'}`,
            color: hideDone ? '#30d158' : 'var(--t3)',
            cursor: 'pointer', transition: 'all .15s',
          }}
        >
          ✓ Feito
        </button>

        {PRIORITY_FILTERS.map(({ value, label, color }) => {
          const active = filterPriority === value;
          return (
            <button
              key={value}
              onClick={() => setFilterPriority(value)}
              style={{
                padding: '4px 9px', borderRadius: 8, fontSize: 10, fontWeight: active ? 700 : 400,
                background: active ? `${color}18` : 'transparent',
                border: `1px solid ${active ? `${color}55` : 'var(--b2)'}`,
                color: active ? color : 'var(--t3)',
                cursor: 'pointer', transition: 'all .15s',
              }}
            >
              {label}
            </button>
          );
        })}

        {TYPE_FILTERS.map(({ value, label }) => {
          const active = filterTaskType === value;
          return (
            <button
              key={value}
              onClick={() => setFilterTaskType(value)}
              style={{
                padding: '4px 9px', borderRadius: 8, fontSize: 10, fontWeight: active ? 700 : 400,
                background: active ? 'rgba(100,196,255,0.12)' : 'transparent',
                border: `1px solid ${active ? 'rgba(100,196,255,0.4)' : 'var(--b1)'}`,
                color: active ? '#64C4FF' : 'var(--t4)',
                cursor: 'pointer', transition: 'all .15s',
              }}
            >
              {label}
            </button>
          );
        })}

        {anyFilterActive && (
          <button
            onClick={clearAllFilters}
            title="Limpar filtros"
            style={{
              display: 'flex', alignItems: 'center', gap: 4,
              padding: '4px 8px', borderRadius: 8, fontSize: 10,
              background: 'rgba(53,107,255,0.12)',
              border: '1px solid rgba(53,107,255,0.3)',
              color: '#64C4FF', cursor: 'pointer', transition: 'all .15s',
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(53,107,255,0.2)'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(53,107,255,0.12)'; }}
          >
            <FiX size={10} /> Limpar
          </button>
        )}
      </div>

      {/* Right: view switcher */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 2,
        background: 'var(--s1)',
        border: '1px solid var(--b2)',
        borderRadius: 12, padding: 3, flexShrink: 0,
      }}>
        {VIEWS.map(({ id, label, Icon }) => {
          const active = viewMode === id;
          return (
            <button
              key={id}
              onClick={() => setViewMode(id)}
              style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '6px 14px', borderRadius: 9,
                background: active ? '#356BFF' : 'transparent',
                border: 'none', cursor: 'pointer',
                color: active ? '#fff' : 'var(--t2)',
                fontSize: 12, fontWeight: active ? 600 : 400,
                transition: 'all .15s',
                boxShadow: active ? '0 2px 10px rgba(53,107,255,0.4)' : 'none',
              }}
              onMouseEnter={e => { if (!active) (e.currentTarget as HTMLElement).style.background = 'var(--s2)'; }}
              onMouseLeave={e => { if (!active) (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
            >
              <Icon size={13} /> {label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
