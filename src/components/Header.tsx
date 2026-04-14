import { format, addMonths, subMonths, addWeeks, subWeeks, addDays, subDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { FiChevronLeft, FiChevronRight } from 'react-icons/fi';
import { MdViewKanban, MdCalendarMonth, MdViewWeek, MdCalendarViewDay } from 'react-icons/md';
import { useTaskStore } from '../store/tasks';
import type { ViewMode } from '../types';
import EvoIcon from '../assets/images/Logos/Icons/Icone/4.svg';

const VIEWS: { id: ViewMode; label: string; Icon: React.ElementType }[] = [
  { id: 'kanban', label: 'Kanban', Icon: MdViewKanban },
  { id: 'day',    label: 'Dia',    Icon: MdCalendarViewDay },
  { id: 'week',   label: 'Semana', Icon: MdViewWeek },
  { id: 'month',  label: 'Mês',    Icon: MdCalendarMonth },
];

export function Header() {
  const { viewMode, setViewMode, currentDate, setCurrentDate } = useTaskStore();

  const goToday = () => setCurrentDate(new Date());

  const goPrev = () => {
    if (viewMode === 'month' || viewMode === 'kanban') setCurrentDate(subMonths(currentDate, 1));
    else if (viewMode === 'week') setCurrentDate(subWeeks(currentDate, 1));
    else if (viewMode === 'day')  setCurrentDate(subDays(currentDate, 1));
  };

  const goNext = () => {
    if (viewMode === 'month' || viewMode === 'kanban') setCurrentDate(addMonths(currentDate, 1));
    else if (viewMode === 'week') setCurrentDate(addWeeks(currentDate, 1));
    else if (viewMode === 'day')  setCurrentDate(addDays(currentDate, 1));
  };

  const getTitle = () => {
    if (viewMode === 'month' || viewMode === 'kanban')
      return format(currentDate, 'MMMM yyyy', { locale: ptBR });
    if (viewMode === 'week')
      return format(currentDate, "'Semana de' d 'de' MMMM", { locale: ptBR });
    if (viewMode === 'day')
      return format(currentDate, "EEEE, d 'de' MMMM", { locale: ptBR });
    return '';
  };

  return (
    <header
      className="flex items-center justify-between px-5 flex-shrink-0"
      style={{
        height: '54px',
        background: 'rgba(8,12,24,0.95)',
        borderBottom: '1px solid rgba(255,255,255,0.07)',
        backdropFilter: 'blur(12px)',
        position: 'sticky',
        top: 0,
        zIndex: 40,
      }}
    >
      {/* Logo */}
      <div className="flex items-center gap-3 flex-shrink-0">
        <div
          className="flex items-center justify-center rounded-lg"
          style={{ width: 30, height: 30, background: '#356BFF', padding: 5 }}
        >
          <img src={EvoIcon} alt="Evo" style={{ width: '100%', height: '100%', objectFit: 'contain', filter: 'invert(1)' }} />
        </div>
        <div>
          <span className="text-sm font-bold tracking-tight text-white">Evo</span>
          <span className="text-sm font-light text-white opacity-50 ml-1">Tasks</span>
        </div>

        {/* Divider */}
        <div className="w-px h-5 mx-1" style={{ background: 'rgba(255,255,255,0.1)' }} />

        {/* Nav controls */}
        <div className="flex items-center gap-1">
          <button
            onClick={goToday}
            className="text-xs font-medium px-3 py-1.5 rounded-lg transition-all"
            style={{
              background: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(255,255,255,0.1)',
              color: 'rgba(255,255,255,0.7)',
            }}
            onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.1)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.06)')}
          >
            Hoje
          </button>
          <button
            onClick={goPrev}
            className="p-1.5 rounded-lg transition-all"
            style={{ color: 'rgba(255,255,255,0.5)' }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; e.currentTarget.style.color = '#fff'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'rgba(255,255,255,0.5)'; }}
          >
            <FiChevronLeft size={16} />
          </button>
          <button
            onClick={goNext}
            className="p-1.5 rounded-lg transition-all"
            style={{ color: 'rgba(255,255,255,0.5)' }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; e.currentTarget.style.color = '#fff'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'rgba(255,255,255,0.5)'; }}
          >
            <FiChevronRight size={16} />
          </button>
        </div>

        <h1 className="text-sm font-medium capitalize" style={{ color: 'rgba(255,255,255,0.75)', minWidth: 180 }}>
          {getTitle()}
        </h1>
      </div>

      {/* View switcher */}
      <div
        className="flex items-center rounded-xl p-1"
        style={{
          background: 'rgba(255,255,255,0.04)',
          border: '1px solid rgba(255,255,255,0.08)',
        }}
      >
        {VIEWS.map(({ id, label, Icon }) => {
          const active = viewMode === id;
          return (
            <button
              key={id}
              onClick={() => setViewMode(id)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
              style={{
                background: active ? '#356BFF' : 'transparent',
                color: active ? '#fff' : 'rgba(255,255,255,0.45)',
                boxShadow: active ? '0 2px 8px rgba(53,107,255,0.4)' : 'none',
              }}
            >
              <Icon size={13} />
              {label}
            </button>
          );
        })}
      </div>
    </header>
  );
}
