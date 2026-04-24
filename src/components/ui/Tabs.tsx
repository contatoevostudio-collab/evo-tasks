import { useId } from 'react';
import { motion } from 'framer-motion';
import { useTaskStore } from '../../store/tasks';

export interface TabItem<T extends string> {
  value: T;
  label: string;
  icon?: React.ReactNode;
  count?: number;
}

interface TabsProps<T extends string> {
  value: T;
  tabs: TabItem<T>[];
  onChange: (value: T) => void;
  fullWidth?: boolean;
}

/**
 * Tabs horizontais com underline deslizante (layoutId).
 *   <Tabs value={tab} onChange={setTab} tabs={[{value:'overview',label:'Visão'}...]} />
 */
export function Tabs<T extends string>({ value, tabs, onChange, fullWidth }: TabsProps<T>) {
  const { accentColor } = useTaskStore();
  const groupId = useId();

  return (
    <div
      role="tablist"
      style={{
        display: 'flex',
        gap: 2,
        borderBottom: '1px solid var(--b2)',
        width: fullWidth ? '100%' : 'auto',
      }}
    >
      {tabs.map((tab) => {
        const active = tab.value === value;
        return (
          <button
            key={tab.value}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(tab.value)}
            style={{
              position: 'relative',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '10px 14px',
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              color: active ? 'var(--t1)' : 'var(--t3)',
              fontSize: 12,
              fontWeight: 600,
              transition: 'color .12s',
              flex: fullWidth ? 1 : 'initial',
              justifyContent: 'center',
            }}
            onMouseEnter={(e) => { if (!active) e.currentTarget.style.color = 'var(--t2)'; }}
            onMouseLeave={(e) => { if (!active) e.currentTarget.style.color = 'var(--t3)'; }}
          >
            {tab.icon && <span style={{ display: 'flex' }}>{tab.icon}</span>}
            {tab.label}
            {tab.count !== undefined && (
              <span style={{
                fontSize: 10, fontWeight: 700, padding: '1px 6px', borderRadius: 99,
                background: active ? `${accentColor}20` : 'var(--s2)', color: active ? accentColor : 'var(--t4)',
              }}>
                {tab.count}
              </span>
            )}
            {active && (
              <motion.div
                layoutId={`tabs-indicator-${groupId}`}
                style={{
                  position: 'absolute',
                  bottom: -1,
                  left: 0,
                  right: 0,
                  height: 2,
                  background: accentColor,
                  borderRadius: 2,
                  boxShadow: `0 0 10px ${accentColor}88`,
                }}
                transition={{ type: 'spring', stiffness: 400, damping: 34 }}
              />
            )}
          </button>
        );
      })}
    </div>
  );
}
