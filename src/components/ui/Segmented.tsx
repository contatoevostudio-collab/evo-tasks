import { useId } from 'react';
import { motion } from 'framer-motion';
import { useTaskStore } from '../../store/tasks';

interface SegmentOption<T extends string> {
  value: T;
  label: string;
  icon?: React.ReactNode;
}

interface SegmentedProps<T extends string> {
  value: T;
  options: SegmentOption<T>[];
  onChange: (value: T) => void;
  size?: 'sm' | 'md';
  fullWidth?: boolean;
}

/**
 * Chips conectados em um "track". O ativo desliza com layoutId (Framer Motion).
 * Uso: <Segmented value={view} options={[{value:'day',label:'Dia'}...]} onChange={setView} />
 */
export function Segmented<T extends string>({
  value, options, onChange, size = 'md', fullWidth,
}: SegmentedProps<T>) {
  const { accentColor } = useTaskStore();
  const groupId = useId();
  const pad = size === 'sm' ? '5px 12px' : '7px 16px';
  const fontSize = size === 'sm' ? 11 : 12;

  return (
    <div
      style={{
        display: 'inline-flex',
        padding: 3,
        background: 'var(--s2)',
        border: '1px solid var(--b2)',
        borderRadius: 99,
        position: 'relative',
        width: fullWidth ? '100%' : 'auto',
      }}
    >
      {options.map((opt) => {
        const active = value === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            style={{
              position: 'relative',
              padding: pad,
              background: 'transparent',
              border: 'none',
              borderRadius: 99,
              cursor: 'pointer',
              color: active ? '#fff' : 'var(--t3)',
              fontSize,
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: 5,
              flex: fullWidth ? 1 : 'initial',
              justifyContent: 'center',
              transition: 'color .18s',
              zIndex: 1,
              whiteSpace: 'nowrap',
            }}
          >
            {active && (
              <motion.div
                layoutId={`segmented-indicator-${groupId}`}
                style={{
                  position: 'absolute',
                  inset: 0,
                  background: accentColor,
                  borderRadius: 99,
                  zIndex: -1,
                  boxShadow: `0 0 14px -2px ${accentColor}99`,
                }}
                transition={{ type: 'spring', stiffness: 380, damping: 32 }}
              />
            )}
            {opt.icon}
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
