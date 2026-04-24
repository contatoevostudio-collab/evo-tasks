import { useState } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { FiX } from 'react-icons/fi';

interface Props {
  id: string;
  text: string;
  checked: boolean;
  onToggle: () => void;
  onDelete: () => void;
}

export function SidebarNoteRow({ id, text, checked, onToggle, onDelete }: Props) {
  const [hovered, setHovered] = useState(false);
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.4 : 1 }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div style={{
        display: 'flex', alignItems: 'flex-start', gap: 6,
        padding: '4px 6px', borderRadius: 6, marginBottom: 1,
        background: hovered ? 'var(--s1)' : 'transparent',
        transition: isDragging ? 'none' : 'background .15s',
        cursor: isDragging ? 'grabbing' : 'grab',
        userSelect: 'none',
      }}
        {...attributes} {...listeners}
      >
        <button
          onPointerDown={e => e.stopPropagation()}
          onClick={e => { e.stopPropagation(); onToggle(); }}
          style={{
            width: 13, height: 13, borderRadius: 3, flexShrink: 0,
            border: `1.5px solid ${checked ? '#356BFF' : 'var(--b3)'}`,
            background: checked ? '#356BFF' : 'transparent',
            cursor: 'pointer', padding: 0, marginTop: 1,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'all .15s',
          }}
        >
          {checked && (
            <svg width="7" height="7" viewBox="0 0 7 7" fill="none">
              <polyline points="1,3.5 2.8,5.5 6,1.5" stroke="#fff" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
        </button>
        <span style={{
          flex: 1, fontSize: 11, color: checked ? 'var(--t4)' : 'var(--t2)',
          textDecoration: checked ? 'line-through' : 'none',
          lineHeight: 1.4, wordBreak: 'break-word', transition: 'all .15s',
        }}>
          {text}
        </span>
        <button
          onPointerDown={e => e.stopPropagation()}
          onClick={e => { e.stopPropagation(); onDelete(); }}
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            color: 'var(--t4)', padding: 1, display: 'flex', flexShrink: 0,
            opacity: hovered ? 1 : 0, transition: 'opacity .15s',
            pointerEvents: hovered ? 'auto' : 'none',
          }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = '#ff453a'; }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'var(--t4)'; }}
        >
          <FiX size={10} />
        </button>
      </div>
    </div>
  );
}
