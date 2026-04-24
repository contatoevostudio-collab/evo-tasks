import { FiCheck } from 'react-icons/fi';
import { useTaskStore } from '../../store/tasks';

export interface StepItem {
  id: string;
  label: string;
  description?: string;
}

interface StepperProps {
  steps: StepItem[];
  current: number; // 0-based index do passo em andamento
  onStepClick?: (index: number) => void;
  orientation?: 'horizontal' | 'vertical';
}

/**
 * Stepper com círculos numerados conectados por linha. Passos anteriores ficam
 * marcados como concluídos (check), o atual fica highlighted, futuros pálidos.
 *   <Stepper current={1} steps={[{id:'info',label:'Info'},{id:'pay',label:'Pagamento'}]} />
 */
export function Stepper({ steps, current, onStepClick, orientation = 'horizontal' }: StepperProps) {
  const { accentColor } = useTaskStore();

  const horizontal = orientation === 'horizontal';

  return (
    <div
      role="list"
      style={{
        display: 'flex',
        flexDirection: horizontal ? 'row' : 'column',
        alignItems: horizontal ? 'flex-start' : 'stretch',
        gap: 0,
        width: '100%',
      }}
    >
      {steps.map((step, i) => {
        const done = i < current;
        const active = i === current;
        const color = done || active ? accentColor : 'var(--t4)';
        const isLast = i === steps.length - 1;

        return (
          <div
            key={step.id}
            role="listitem"
            style={{
              display: 'flex',
              flexDirection: horizontal ? 'column' : 'row',
              alignItems: horizontal ? 'center' : 'flex-start',
              flex: horizontal ? 1 : 'initial',
              position: 'relative',
              gap: horizontal ? 8 : 12,
              paddingBottom: horizontal ? 0 : isLast ? 0 : 14,
            }}
          >
            {/* Connector line */}
            {!isLast && (
              <div
                style={{
                  position: 'absolute',
                  ...(horizontal
                    ? { top: 13, left: 'calc(50% + 16px)', right: 'calc(-50% + 16px)', height: 2 }
                    : { top: 28, left: 13, bottom: -14, width: 2 }),
                  background: done ? accentColor : 'var(--b2)',
                  boxShadow: done ? `0 0 8px ${accentColor}66` : 'none',
                  transition: 'background .2s',
                  zIndex: 0,
                }}
              />
            )}

            {/* Circle */}
            <button
              type="button"
              onClick={() => onStepClick?.(i)}
              disabled={!onStepClick || i > current}
              style={{
                width: 28, height: 28, borderRadius: '50%',
                background: done || active ? accentColor : 'var(--s2)',
                border: `2px solid ${done || active ? accentColor : 'var(--b2)'}`,
                color: done || active ? '#fff' : 'var(--t4)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 11, fontWeight: 700,
                cursor: onStepClick && i <= current ? 'pointer' : 'default',
                flexShrink: 0,
                boxShadow: active ? `0 0 14px ${accentColor}88` : 'none',
                transition: 'all .18s',
                position: 'relative',
                zIndex: 1,
              }}
            >
              {done ? <FiCheck size={13} strokeWidth={3} /> : i + 1}
            </button>

            {/* Label */}
            <div style={{ textAlign: horizontal ? 'center' : 'left', flex: horizontal ? 'none' : 1, minWidth: 0 }}>
              <div style={{ fontSize: 12, fontWeight: active ? 700 : 600, color, whiteSpace: 'nowrap' }}>
                {step.label}
              </div>
              {step.description && (
                <div style={{ fontSize: 10, color: 'var(--t4)', marginTop: 2 }}>{step.description}</div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
