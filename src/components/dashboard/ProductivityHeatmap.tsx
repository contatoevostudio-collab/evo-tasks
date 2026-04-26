import { useState } from 'react';
import { motion } from 'framer-motion';
import { format, addDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth, eachDayOfInterval, subDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export type HeatmapView = 'anual' | 'mensal' | 'semanal' | 'diario';

/**
 * Heatmap de produtividade com 4 visualizações.
 * - Anual: 12 meses lado a lado (Jan a Dez do ano corrente)
 * - Mensal: 4 últimos meses lado a lado com pill de total
 * - Semanal: barras verticais dos 7 dias da semana atual
 * - Por dia: barras horizontais dos últimos 7 dias
 *
 * @param counts — Map de "yyyy-MM-dd" → count (ex: tarefas concluídas, eventos, etc.)
 */
export function ProductivityHeatmap({ counts }: { counts: Map<string, number> }) {
  const [view, setView] = useState<HeatmapView>('anual');
  const today = new Date();
  const max = Math.max(...Array.from(counts.values()), 1);

  const cellColor = (c: number) => {
    if (c === 0) return 'rgba(255,255,255,0.05)';
    const intensity = c / max;
    if (intensity < 0.25) return 'rgba(48,209,88,0.28)';
    if (intensity < 0.5) return 'rgba(48,209,88,0.5)';
    if (intensity < 0.75) return 'rgba(48,209,88,0.75)';
    return '#30d158';
  };
  const get = (d: Date) => counts.get(format(d, 'yyyy-MM-dd')) ?? 0;

  const renderAnual = () => {
    const year = today.getFullYear();
    const CELL = 11, GAP = 2, MONTH_GAP = 10;
    const months = Array.from({ length: 12 }).map((_, mi) => {
      const monthStart = new Date(year, mi, 1);
      const monthEnd = endOfMonth(monthStart);
      const gridStart = startOfWeek(monthStart, { weekStartsOn: 1 });
      const gridEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
      const allDays = eachDayOfInterval({ start: gridStart, end: gridEnd });
      const weeks: (Date | null)[][] = [];
      for (let i = 0; i < allDays.length; i += 7) {
        const week = allDays.slice(i, i + 7).map(d => d.getMonth() === mi ? d : null);
        weeks.push(week);
      }
      return { label: format(monthStart, 'MMM', { locale: ptBR }).toUpperCase(), weeks };
    });
    return (
      <div style={{ overflowX: 'auto', paddingBottom: 4 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: MONTH_GAP }}>
          {months.map((m, mi) => (
            <div key={mi} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.6px', color: 'rgba(255,255,255,0.5)' }}>
                {m.label}
              </div>
              <div style={{ display: 'flex', gap: GAP }}>
                {m.weeks.map((week, wi) => (
                  <div key={wi} style={{ display: 'flex', flexDirection: 'column', gap: GAP }}>
                    {week.map((d, di) => {
                      if (!d) return <div key={di} style={{ width: CELL, height: CELL }} />;
                      const c = get(d);
                      return (
                        <div key={di}
                          title={`${format(d, 'dd/MM/yyyy')}: ${c} concluída${c !== 1 ? 's' : ''}`}
                          style={{ width: CELL, height: CELL, borderRadius: 2, background: cellColor(c) }}
                        />
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderMensal = () => {
    const CELL = 28, GAP = 4;
    const monthStart = startOfMonth(today);
    const monthEnd = endOfMonth(today);
    const gridStart = startOfWeek(monthStart, { weekStartsOn: 1 });
    const gridEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
    const allDays = eachDayOfInterval({ start: gridStart, end: gridEnd });
    const total = allDays
      .filter(d => d.getMonth() === today.getMonth() && d.getFullYear() === today.getFullYear())
      .reduce((s, d) => s + get(d), 0);

    return (
      <div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
          <span style={{ fontSize: 12, fontWeight: 800, color: '#ffffff', letterSpacing: '-0.1px', textTransform: 'capitalize' }}>
            {format(today, 'MMMM yyyy', { locale: ptBR })}
          </span>
          <span style={{
            fontSize: 10, fontWeight: 700,
            color: total > 0 ? '#30d158' : 'rgba(255,255,255,0.45)',
            background: total > 0 ? 'rgba(48,209,88,0.14)' : 'rgba(255,255,255,0.05)',
            border: total > 0 ? '1px solid rgba(48,209,88,0.3)' : '1px solid rgba(255,255,255,0.1)',
            borderRadius: 99, padding: '2px 9px',
          }}>
            {total} concluída{total !== 1 ? 's' : ''}
          </span>
        </div>
        <div style={{ display: 'inline-grid', gridTemplateColumns: `repeat(7, ${CELL}px)`, gap: GAP, marginBottom: 6 }}>
          {['SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB', 'DOM'].map((l, i) => (
            <div key={i} style={{ width: CELL, fontSize: 9, fontWeight: 700, color: 'rgba(255,255,255,0.4)', textAlign: 'center', letterSpacing: '0.6px' }}>{l}</div>
          ))}
        </div>
        <div style={{ display: 'inline-grid', gridTemplateColumns: `repeat(7, ${CELL}px)`, gap: GAP }}>
          {allDays.map((d, i) => {
            const inMonth = d.getMonth() === today.getMonth() && d.getFullYear() === today.getFullYear();
            const c = inMonth ? get(d) : 0;
            const isToday = format(d, 'yyyy-MM-dd') === format(today, 'yyyy-MM-dd');
            return (
              <div key={i}
                title={inMonth ? `${format(d, 'dd/MM/yyyy')}: ${c} concluída${c !== 1 ? 's' : ''}` : ''}
                style={{
                  width: CELL, height: CELL, borderRadius: 5,
                  background: inMonth ? cellColor(c) : 'transparent',
                  border: isToday ? '1.5px solid #ffffff' : (inMonth ? 'none' : '1px dashed rgba(255,255,255,0.05)'),
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 10, fontWeight: 700,
                  color: !inMonth ? 'transparent' : c > 0 ? '#ffffff' : 'rgba(255,255,255,0.45)',
                }}
              >
                {inMonth ? d.getDate() : ''}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const renderSemanal = () => {
    const ws = startOfWeek(today, { weekStartsOn: 1 });
    const days = Array.from({ length: 7 }).map((_, i) => addDays(ws, i));
    const weekMax = Math.max(...days.map(d => get(d)), 1);
    return (
      <div style={{ display: 'flex', gap: 8, height: 130, alignItems: 'flex-end' }}>
        {days.map((d, i) => {
          const c = get(d);
          const isToday = format(d, 'yyyy-MM-dd') === format(today, 'yyyy-MM-dd');
          const h = c === 0 ? 8 : Math.max(14, (c / weekMax) * 100);
          return (
            <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, height: '100%', justifyContent: 'flex-end' }}>
              <span style={{ fontSize: 11, fontWeight: 800, color: c > 0 ? '#30d158' : 'rgba(255,255,255,0.4)' }}>
                {c}
              </span>
              <motion.div
                initial={{ height: 4 }}
                animate={{ height: `${h}%` }}
                transition={{ duration: 0.45, delay: i * 0.04, ease: 'easeOut' }}
                style={{
                  width: '100%',
                  background: c > 0 ? 'linear-gradient(180deg, #30d158 0%, rgba(48,209,88,0.4) 100%)' : 'rgba(255,255,255,0.06)',
                  borderTopLeftRadius: 6, borderTopRightRadius: 6,
                  boxShadow: c > 0 ? '0 0 12px rgba(48,209,88,0.4)' : 'none',
                  border: isToday ? '1px solid rgba(255,255,255,0.4)' : 'none',
                }}
              />
              <span style={{ fontSize: 9, fontWeight: isToday ? 800 : 600, color: isToday ? '#ffffff' : 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                {format(d, 'EEE', { locale: ptBR }).slice(0, 3)}
              </span>
            </div>
          );
        })}
      </div>
    );
  };

  const renderDiario = () => {
    const days = Array.from({ length: 7 }).map((_, i) => subDays(today, i));
    const maxD = Math.max(...days.map(d => get(d)), 1);
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {days.map((d, i) => {
          const c = get(d);
          const isToday = i === 0;
          const pct = (c / maxD) * 100;
          return (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 56, fontSize: 10, fontWeight: 700, color: isToday ? '#ffffff' : 'rgba(255,255,255,0.55)', flexShrink: 0 }}>
                {isToday ? 'Hoje' : format(d, "d MMM", { locale: ptBR })}
              </div>
              <div style={{ flex: 1, height: 18, borderRadius: 5, background: 'rgba(255,255,255,0.05)', overflow: 'hidden', position: 'relative' }}>
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.max(c > 0 ? 4 : 0, pct)}%` }}
                  transition={{ duration: 0.4, delay: i * 0.04 }}
                  style={{
                    height: '100%',
                    background: c > 0 ? 'linear-gradient(90deg, #30d158, rgba(48,209,88,0.5))' : 'transparent',
                    boxShadow: c > 0 ? '0 0 10px rgba(48,209,88,0.4)' : 'none',
                  }}
                />
              </div>
              <div style={{ width: 22, fontSize: 11, fontWeight: 800, color: c > 0 ? '#30d158' : 'rgba(255,255,255,0.4)', textAlign: 'right', flexShrink: 0 }}>
                {c}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const VIEWS: { id: HeatmapView; label: string }[] = [
    { id: 'anual',   label: 'Anual' },
    { id: 'mensal',  label: 'Mensal' },
    { id: 'semanal', label: 'Semanal' },
    { id: 'diario',  label: 'Por dia' },
  ];

  return (
    <div style={{ padding: '12px 16px 16px' }}>
      <div style={{ display: 'flex', gap: 4, padding: 3, borderRadius: 9, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', marginBottom: 14 }}>
        {VIEWS.map(v => (
          <button key={v.id}
            onClick={() => setView(v.id)}
            style={{
              flex: 1, padding: '6px 10px', borderRadius: 7,
              background: view === v.id ? 'rgba(48,209,88,0.18)' : 'transparent',
              border: view === v.id ? '1px solid rgba(48,209,88,0.35)' : '1px solid transparent',
              color: view === v.id ? '#30d158' : 'rgba(255,255,255,0.6)',
              fontSize: 10.5, fontWeight: 800, letterSpacing: '0.4px', textTransform: 'uppercase',
              cursor: 'pointer', transition: 'all .12s',
            }}
          >
            {v.label}
          </button>
        ))}
      </div>

      {view === 'anual'   && renderAnual()}
      {view === 'mensal'  && renderMensal()}
      {view === 'semanal' && renderSemanal()}
      {view === 'diario'  && renderDiario()}

      {view === 'anual' && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 10, fontSize: 9, fontWeight: 700, color: 'rgba(255,255,255,0.5)' }}>
          <span>{Array.from(counts.values()).reduce((s, n) => s + n, 0)} concluídas no ano</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <span>Menos</span>
            {['rgba(255,255,255,0.05)', 'rgba(48,209,88,0.28)', 'rgba(48,209,88,0.5)', 'rgba(48,209,88,0.75)', '#30d158'].map((bg, i) => (
              <div key={i} style={{ width: 9, height: 9, borderRadius: 2, background: bg }} />
            ))}
            <span>Mais</span>
          </div>
        </div>
      )}
    </div>
  );
}
