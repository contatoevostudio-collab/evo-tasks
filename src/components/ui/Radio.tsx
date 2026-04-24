import { useTaskStore } from '../../store/tasks';

interface RadioOption<T extends string> {
  value: T;
  label: string;
  description?: string;
}

interface RadioGroupProps<T extends string> {
  value: T;
  options: RadioOption<T>[];
  onChange: (value: T) => void;
  disabled?: boolean;
  direction?: 'vertical' | 'horizontal';
}

/**
 * Grupo de radio. Use para escolha única em listas curtas (até ~6 opções).
 * Acima disso, prefira Select.
 */
export function RadioGroup<T extends string>({
  value, options, onChange, disabled, direction = 'vertical',
}: RadioGroupProps<T>) {
  const { accentColor } = useTaskStore();

  return (
    <div
      role="radiogroup"
      style={{
        display: 'flex',
        flexDirection: direction === 'vertical' ? 'column' : 'row',
        gap: direction === 'vertical' ? 8 : 16,
      }}
    >
      {options.map((opt) => {
        const selected = value === opt.value;
        return (
          <label
            key={opt.value}
            style={{
              display: 'flex',
              alignItems: opt.description ? 'flex-start' : 'center',
              gap: 10,
              cursor: disabled ? 'not-allowed' : 'pointer',
              opacity: disabled ? 0.5 : 1,
            }}
          >
            <button
              type="button"
              role="radio"
              aria-checked={selected}
              disabled={disabled}
              onClick={() => !disabled && onChange(opt.value)}
              style={{
                width: 18,
                height: 18,
                borderRadius: '50%',
                border: `2px solid ${selected ? accentColor : 'var(--b3)'}`,
                background: 'transparent',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: disabled ? 'not-allowed' : 'pointer',
                transition: 'all .12s var(--ease-out, cubic-bezier(.4,0,.2,1))',
                padding: 0,
                flexShrink: 0,
              }}
            >
              {selected && (
                <span
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    background: accentColor,
                  }}
                />
              )}
            </button>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--t1)' }}>{opt.label}</div>
              {opt.description && (
                <div style={{ fontSize: 11, color: 'var(--t4)', marginTop: 2 }}>{opt.description}</div>
              )}
            </div>
          </label>
        );
      })}
    </div>
  );
}
