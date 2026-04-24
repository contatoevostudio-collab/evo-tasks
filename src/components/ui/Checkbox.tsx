import { FiCheck, FiMinus } from 'react-icons/fi';
import { useTaskStore } from '../../store/tasks';

interface CheckboxProps {
  checked: boolean;
  indeterminate?: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  label?: string;
  description?: string;
}

/**
 * Checkbox 18×18 com check branco. Estado indeterminado (−) opcional.
 */
export function Checkbox({ checked, indeterminate, onChange, disabled, label, description }: CheckboxProps) {
  const { accentColor } = useTaskStore();
  const active = checked || indeterminate;

  const box = (
    <button
      type="button"
      role="checkbox"
      aria-checked={indeterminate ? 'mixed' : checked}
      disabled={disabled}
      onClick={() => !disabled && onChange(!checked)}
      style={{
        width: 18,
        height: 18,
        borderRadius: 5,
        border: `2px solid ${active ? accentColor : 'var(--b3)'}`,
        background: active ? accentColor : 'transparent',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: disabled ? 'not-allowed' : 'pointer',
        transition: 'all .12s var(--ease-out, cubic-bezier(.4,0,.2,1))',
        opacity: disabled ? 0.4 : 1,
        padding: 0,
        flexShrink: 0,
      }}
    >
      {indeterminate ? <FiMinus size={11} style={{ color: '#fff', strokeWidth: 3 }} />
        : checked ? <FiCheck size={11} style={{ color: '#fff', strokeWidth: 3 }} />
        : null}
    </button>
  );

  if (!label && !description) return box;

  return (
    <label
      style={{
        display: 'flex',
        alignItems: description ? 'flex-start' : 'center',
        gap: 10,
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.5 : 1,
      }}
    >
      {box}
      <div style={{ flex: 1, minWidth: 0 }}>
        {label && <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--t1)' }}>{label}</div>}
        {description && (
          <div style={{ fontSize: 11, color: 'var(--t4)', marginTop: label ? 2 : 0 }}>{description}</div>
        )}
      </div>
    </label>
  );
}
