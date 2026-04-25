import { format, addMonths, subMonths, addWeeks, subWeeks, addDays, subDays, startOfWeek, startOfMonth, endOfMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { FiChevronLeft, FiChevronRight, FiUploadCloud } from 'react-icons/fi';
import { MdViewKanban, MdCalendarMonth, MdViewWeek, MdCalendarViewDay } from 'react-icons/md';
import { motion } from 'framer-motion';
import { useId } from 'react';
import { useTaskStore } from '../store/tasks';
import type { ViewMode } from '../types';

const VIEWS: { id: ViewMode; label: string; Icon: React.ElementType }[] = [
  { id: 'kanban', label: 'Kanban', Icon: MdViewKanban },
  { id: 'day',    label: 'Dia',    Icon: MdCalendarViewDay },
  { id: 'week',   label: 'Semana', Icon: MdViewWeek },
  { id: 'month',  label: 'Mês',    Icon: MdCalendarMonth },
];

const barHexToRgb = (hex: string): string => {
  const v = hex.replace('#', '');
  const c = v.length === 3 ? v.split('').map(x => x + x).join('') : v;
  return `${parseInt(c.slice(0, 2), 16)},${parseInt(c.slice(2, 4), 16)},${parseInt(c.slice(4, 6), 16)}`;
};

interface BottomBarProps { onImportICS(): void }

export function BottomBar({ onImportICS }: BottomBarProps) {
  const {
    viewMode, setViewMode, currentDate, setCurrentDate,
    tasks, selectedCompanies, accentColor,
  } = useTaskStore();
  const accentRgb = barHexToRgb(accentColor);
  const indicatorId = useId();

  const goToday = () => setCurrentDate(new Date());

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
    let base = tasks.filter(t => !t.deletedAt && selectedCompanies.includes(t.companyId) && !t.archived);
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

  const navBtn = (onClick: () => void, children: React.ReactNode, title?: string) => (
    <button
      onClick={onClick}
      title={title}
      style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        width: 32, height: 32, borderRadius: 8, background: 'transparent',
        border: 'none', cursor: 'pointer', color: 'var(--t3)',
        transition: 'all .15s',
      }}
      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--s2)'; (e.currentTarget as HTMLElement).style.color = 'var(--t1)'; }}
      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; (e.currentTarget as HTMLElement).style.color = 'var(--t3)'; }}
    >
      {children}
    </button>
  );

  const donePct = periodCount.total > 0 ? (periodCount.done / periodCount.total) * 100 : 0;

  return (
    <div style={{
      height: 54,
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '0 16px',
      flexShrink: 0, gap: 12, minWidth: 0,
    }}>
      {/* Left: date nav + title + count pill */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 4, minWidth: 0 }}>
        {navBtn(goPrev, <FiChevronLeft size={15} />, 'Anterior')}
        <button
          onClick={goToday}
          style={{
            padding: '6px 12px', borderRadius: 8, background: 'var(--s2)', border: '1px solid var(--b2)',
            color: 'var(--t2)', fontSize: 11, fontWeight: 600, cursor: 'pointer',
            transition: 'all .15s',
          }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = accentColor; (e.currentTarget as HTMLElement).style.color = accentColor; }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--b2)'; (e.currentTarget as HTMLElement).style.color = 'var(--t2)'; }}
        >
          Hoje
        </button>
        {navBtn(goNext, <FiChevronRight size={15} />, 'Próximo')}
        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--t1)', marginLeft: 8, textTransform: 'capitalize', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {getTitle()}
        </span>
        {viewMode !== 'kanban' && periodCount.total > 0 && (
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 6, marginLeft: 8, flexShrink: 0,
            padding: '3px 10px', borderRadius: 99,
            background: donePct === 100 ? 'rgba(48,209,88,0.14)' : `rgba(${accentRgb}, 0.14)`,
            border: `1px solid ${donePct === 100 ? 'rgba(48,209,88,0.28)' : `rgba(${accentRgb}, 0.28)`}`,
          }}>
            <div style={{ width: 24, height: 3, borderRadius: 2, background: 'rgba(255,255,255,0.1)', overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${donePct}%`, background: donePct === 100 ? '#30d158' : accentColor, boxShadow: donePct === 100 ? '0 0 6px rgba(48,209,88,0.6)' : `0 0 6px rgba(${accentRgb}, 0.6)` }} />
            </div>
            <span style={{ fontSize: 10, fontWeight: 700, color: donePct === 100 ? '#30d158' : accentColor }}>
              {periodCount.done}/{periodCount.total}
            </span>
          </div>
        )}
      </div>

      {/* Center: Import ICS (only on calendar views) */}
      {viewMode !== 'kanban' && (
        <button
          onClick={onImportICS}
          title="Importar .ics do Apple Calendar"
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '6px 12px', borderRadius: 9,
            background: 'var(--s2)', border: '1px solid var(--b2)',
            cursor: 'pointer', color: 'var(--t3)',
            fontSize: 11, fontWeight: 600, transition: 'all .15s',
          }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = accentColor; (e.currentTarget as HTMLElement).style.borderColor = accentColor; }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'var(--t3)'; (e.currentTarget as HTMLElement).style.borderColor = 'var(--b2)'; }}
        >
          <FiUploadCloud size={12} /> Importar .ics
        </button>
      )}

      {/* Right: view switcher (Segmented-style com indicador deslizante) */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 0, position: 'relative',
        background: 'var(--s2)', border: '1px solid var(--b2)',
        borderRadius: 99, padding: 3, flexShrink: 0,
      }}>
        {VIEWS.map(({ id, label, Icon }) => {
          const active = viewMode === id;
          return (
            <button
              key={id}
              onClick={() => setViewMode(id)}
              style={{
                position: 'relative', zIndex: 1,
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '6px 14px', borderRadius: 99,
                background: 'transparent', border: 'none', cursor: 'pointer',
                color: active ? '#fff' : 'var(--t3)',
                fontSize: 11, fontWeight: 600,
                transition: 'color .18s',
                whiteSpace: 'nowrap',
              }}
              onMouseEnter={e => { if (!active) (e.currentTarget as HTMLElement).style.color = 'var(--t1)'; }}
              onMouseLeave={e => { if (!active) (e.currentTarget as HTMLElement).style.color = 'var(--t3)'; }}
            >
              {active && (
                <motion.div
                  layoutId={`view-indicator-${indicatorId}`}
                  style={{
                    position: 'absolute', inset: 0, zIndex: -1,
                    background: accentColor, borderRadius: 99,
                    boxShadow: `0 0 14px -2px rgba(${accentRgb}, 0.7), 0 0 28px -8px rgba(${accentRgb}, 0.5)`,
                  }}
                  transition={{ type: 'spring', stiffness: 380, damping: 32 }}
                />
              )}
              <Icon size={13} /> {label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
