import { useTaskStore } from '../../store/tasks';

type Variant = 'first' | 'filtered' | 'error';

interface EmptyStateProps {
  variant?: Variant;
  icon?: React.ReactNode;
  title: React.ReactNode;
  description?: React.ReactNode;
  action?: {
    label: string;
    onClick: () => void;
  };
  secondaryAction?: {
    label: string;
    onClick: () => void;
  };
  compact?: boolean;
}

/**
 * 3 variantes:
 *   first    — nada criado ainda, mostra CTA primário de criar
 *   filtered — tem dados mas o filtro não retornou nada
 *   error    — falha ao carregar, ícone vermelho
 *
 *   <EmptyState variant="first" icon={<FiTarget />} title="Nenhuma meta"
 *               action={{ label: 'Criar meta', onClick: openModal }} />
 */
export function EmptyState({
  variant = 'first', icon, title, description, action, secondaryAction, compact,
}: EmptyStateProps) {
  const { accentColor } = useTaskStore();

  const iconColor =
    variant === 'error'    ? '#ff453a'
    : variant === 'filtered' ? 'var(--t4)'
    : 'var(--t3)';

  const pad = compact ? '20px 16px' : '36px 20px';
  const iconSize = compact ? 28 : 42;

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      padding: pad, textAlign: 'center', gap: compact ? 8 : 12,
    }}>
      {icon && (
        <div
          style={{
            fontSize: iconSize,
            color: iconColor,
            opacity: variant === 'error' ? 0.6 : 0.35,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            marginBottom: 4,
          }}
        >
          {icon}
        </div>
      )}
      <div style={{ fontSize: compact ? 13 : 15, fontWeight: 600, color: 'var(--t1)' }}>
        {title}
      </div>
      {description && (
        <div style={{ fontSize: 12, color: 'var(--t4)', maxWidth: 340, lineHeight: 1.5 }}>
          {description}
        </div>
      )}
      {(action || secondaryAction) && (
        <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
          {action && (
            <button
              onClick={action.onClick}
              style={{
                padding: '8px 18px', borderRadius: 10,
                background: accentColor, border: 'none',
                color: '#fff', fontSize: 12, fontWeight: 700,
                cursor: 'pointer',
                boxShadow: `0 0 20px -4px ${accentColor}88`,
              }}
            >
              {action.label}
            </button>
          )}
          {secondaryAction && (
            <button
              onClick={secondaryAction.onClick}
              style={{
                padding: '8px 18px', borderRadius: 10,
                background: 'var(--s2)', border: '1px solid var(--b2)',
                color: 'var(--t2)', fontSize: 12, fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              {secondaryAction.label}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
