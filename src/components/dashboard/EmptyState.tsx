import { FiPlus } from 'react-icons/fi';

/**
 * Standard dashboard empty state.
 * - icon in 48×48 rounded square
 * - white text 13px / 600
 * - optional CTA in blue tint
 */
export function EmptyState({ icon, text, cta, onCta, iconColor = 'rgba(255,255,255,0.45)' }: {
  icon: React.ReactNode;
  text: string;
  cta?: string;
  onCta?: () => void;
  iconColor?: string;
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, padding: '28px 16px' }}>
      <div style={{
        width: 48, height: 48, borderRadius: 12,
        background: 'rgba(255,255,255,0.05)',
        border: '1px solid rgba(255,255,255,0.10)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: iconColor,
      }}>
        {icon}
      </div>
      <div style={{ fontSize: 13, color: '#ffffff', fontWeight: 600, textAlign: 'center', letterSpacing: '-0.1px' }}>
        {text}
      </div>
      {cta && onCta && (
        <button
          onClick={onCta}
          style={{
            marginTop: 4, padding: '7px 14px', borderRadius: 8,
            background: 'rgba(53,107,255,0.18)',
            border: '1px solid rgba(53,107,255,0.4)',
            color: '#ffffff', fontSize: 11, fontWeight: 700,
            letterSpacing: '0.4px', cursor: 'pointer',
            display: 'inline-flex', alignItems: 'center', gap: 5,
            transition: 'all .15s',
          }}
          onMouseEnter={e => {
            (e.currentTarget as HTMLElement).style.background = 'rgba(53,107,255,0.32)';
            (e.currentTarget as HTMLElement).style.borderColor = 'rgba(53,107,255,0.6)';
          }}
          onMouseLeave={e => {
            (e.currentTarget as HTMLElement).style.background = 'rgba(53,107,255,0.18)';
            (e.currentTarget as HTMLElement).style.borderColor = 'rgba(53,107,255,0.4)';
          }}
        >
          <FiPlus size={11} /> {cta}
        </button>
      )}
    </div>
  );
}
