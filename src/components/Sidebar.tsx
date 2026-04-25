import { useState } from 'react';
import {
  format, startOfMonth, endOfMonth, startOfWeek, endOfWeek,
  addDays, isSameMonth, isSameDay, isToday,
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { FiChevronLeft, FiChevronRight, FiPlus, FiSettings } from 'react-icons/fi';
import { useTaskStore } from '../store/tasks';

interface Props {
  onAddTask: () => void;
  onOpenSettings: () => void;
}

export function Sidebar({ onAddTask, onOpenSettings }: Props) {
  const { currentDate, setCurrentDate, companies, selectedCompanies, toggleCompany } = useTaskStore();
  const [miniDate, setMiniDate] = useState(new Date(currentDate));

  const monthStart = startOfMonth(miniDate);
  const monthEnd   = endOfMonth(miniDate);
  const calStart   = startOfWeek(monthStart, { weekStartsOn: 1 });
  const calEnd     = endOfWeek(monthEnd,   { weekStartsOn: 1 });

  const days: Date[] = [];
  let d = calStart;
  while (d <= calEnd) { days.push(d); d = addDays(d, 1); }

  const prevMonth = () => setMiniDate(p => new Date(p.getFullYear(), p.getMonth() - 1));
  const nextMonth = () => setMiniDate(p => new Date(p.getFullYear(), p.getMonth() + 1));

  return (
    <aside
      className="flex flex-col flex-shrink-0"
      style={{
        width: 220,
        height: '100%',
        background: 'rgba(255,255,255,0.015)',
        position: 'sticky',
        top: 0,
        overflow: 'hidden',
      }}
    >
      {/* Nova tarefa */}
      <div className="px-3 pt-4 pb-2 flex-shrink-0">
        <button
          onClick={onAddTask}
          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold text-white transition-all"
          style={{
            background: 'linear-gradient(135deg, #356BFF, #64C4FF)',
            boxShadow: '0 4px 16px rgba(53,107,255,0.35)',
          }}
          onMouseEnter={e => (e.currentTarget.style.boxShadow = '0 6px 20px rgba(53,107,255,0.5)')}
          onMouseLeave={e => (e.currentTarget.style.boxShadow = '0 4px 16px rgba(53,107,255,0.35)')}
        >
          <FiPlus size={15} /> Nova Tarefa
        </button>
      </div>

      {/* Mini calendar */}
      <div className="px-3 py-2 flex-shrink-0">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold capitalize" style={{ color: 'rgba(255,255,255,0.6)' }}>
            {format(miniDate, 'MMM yyyy', { locale: ptBR })}
          </span>
          <div className="flex gap-0.5">
            <button onClick={prevMonth} className="p-1 rounded transition-all" style={{ color: 'rgba(255,255,255,0.35)' }}
              onMouseEnter={e => (e.currentTarget.style.color = '#fff')}
              onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.35)')}>
              <FiChevronLeft size={12} />
            </button>
            <button onClick={nextMonth} className="p-1 rounded transition-all" style={{ color: 'rgba(255,255,255,0.35)' }}
              onMouseEnter={e => (e.currentTarget.style.color = '#fff')}
              onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.35)')}>
              <FiChevronRight size={12} />
            </button>
          </div>
        </div>

        {/* Day headers */}
        <div className="grid grid-cols-7 mb-1">
          {['S','T','Q','Q','S','S','D'].map((h, i) => (
            <div key={i} className="text-center text-[9px] font-semibold py-0.5" style={{ color: 'rgba(255,255,255,0.25)', letterSpacing: '0.5px' }}>
              {h}
            </div>
          ))}
        </div>

        {/* Days */}
        <div className="grid grid-cols-7 gap-y-0.5">
          {days.map((day, i) => {
            const selected = isSameDay(day, currentDate);
            const todayDay = isToday(day);
            const inMonth  = isSameMonth(day, miniDate);
            return (
              <button
                key={i}
                onClick={() => { setCurrentDate(day); setMiniDate(day); }}
                className="flex items-center justify-center mx-auto rounded-full text-[11px] transition-all"
                style={{
                  width: 24, height: 24,
                  background: selected ? '#356BFF' : todayDay ? 'rgba(53,107,255,0.2)' : 'transparent',
                  color: selected ? '#fff' : todayDay ? '#64C4FF' : inMonth ? 'rgba(255,255,255,0.7)' : 'rgba(255,255,255,0.2)',
                  fontWeight: selected || todayDay ? 600 : 400,
                  boxShadow: selected ? '0 2px 8px rgba(53,107,255,0.5)' : 'none',
                }}
              >
                {format(day, 'd')}
              </button>
            );
          })}
        </div>
      </div>

      {/* Divider */}
      <div className="mx-3 my-1" style={{ height: 1, background: 'rgba(255,255,255,0.06)' }} />

      {/* Empresas */}
      <div className="flex-1 overflow-y-auto px-3 py-2">
        <p className="text-[9px] font-bold uppercase tracking-widest mb-2" style={{ color: 'rgba(255,255,255,0.25)', letterSpacing: '2px' }}>
          Empresas
        </p>
        <div className="space-y-0.5">
          {companies.map((company) => {
            const active = selectedCompanies.includes(company.id);
            return (
              <button
                key={company.id}
                onClick={() => toggleCompany(company.id)}
                className="w-full flex items-center gap-2.5 px-2 py-1.5 rounded-lg text-left transition-all"
                style={{ background: 'transparent' }}
                onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.05)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
              >
                <div
                  className="w-3 h-3 rounded-sm flex-shrink-0 transition-all"
                  style={{
                    background: active ? company.color : 'transparent',
                  }}
                />
                <span className="text-xs truncate" style={{ color: active ? 'rgba(255,255,255,0.85)' : 'rgba(255,255,255,0.4)' }}>
                  {company.name}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Settings */}
      <div className="px-3 pb-4 flex-shrink-0">
        <div className="mb-2" style={{ height: 1, background: 'rgba(255,255,255,0.06)' }} />
        <button
          onClick={onOpenSettings}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs transition-all"
          style={{ color: 'rgba(255,255,255,0.35)', background: 'transparent' }}
          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; e.currentTarget.style.color = 'rgba(255,255,255,0.7)'; }}
          onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'rgba(255,255,255,0.35)'; }}
        >
          <FiSettings size={13} /> Configurações
        </button>
      </div>
    </aside>
  );
}
