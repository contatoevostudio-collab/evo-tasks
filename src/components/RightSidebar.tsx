import { useState, useRef, type KeyboardEvent } from 'react';
import { FiChevronLeft, FiChevronRight, FiPlus, FiX } from 'react-icons/fi';
import { DndContext, type DragEndEvent, PointerSensor, useSensor, useSensors, closestCenter } from '@dnd-kit/core';
import { SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useTaskStore } from '../store/tasks';
import { playAdd, playCheck, playDelete } from '../lib/sounds';

export function RightSidebar() {
  const { quickNotes, addQuickNote, toggleQuickNote, deleteQuickNote, reorderQuickNotes } = useTaskStore();
  const [open, setOpen] = useState(false);
  const [inputVal, setInputVal] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const handleAdd = () => {
    const text = inputVal.trim();
    if (!text) return;
    addQuickNote(text);
    playAdd();
    setInputVal('');
    inputRef.current?.focus();
  };

  const handleKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') handleAdd();
  };

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));
  const handleDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    if (over && active.id !== over.id) reorderQuickNotes(active.id as string, over.id as string);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'row', height: '100vh', flexShrink: 0 }}>

      {/* Expanded panel */}
      {open && (
        <div style={{
          width: 256, height: '100vh',
          display: 'flex', flexDirection: 'column',
          background: 'var(--sidebar-bg)',
          borderLeft: '1px solid var(--b1)',
          overflow: 'hidden',
        }}>
          {/* Header */}
          <div style={{
            height: 36, flexShrink: 0,
            display: 'flex', alignItems: 'center',
            padding: '0 12px',
            borderBottom: '1px solid var(--b1)',
          }}>
            <span style={{
              fontSize: 9, fontWeight: 700, letterSpacing: '2px',
              textTransform: 'uppercase', color: 'var(--t4)',
            }}>
              Notas Rápidas
            </span>
            {quickNotes.length > 0 && (
              <span style={{
                marginLeft: 8, fontSize: 9, fontWeight: 600,
                color: 'var(--t4)', background: 'var(--s1)',
                borderRadius: 99, padding: '1px 5px',
              }}>
                {quickNotes.length}
              </span>
            )}
          </div>

          {/* Add input */}
          <div style={{ padding: '10px 10px 6px', flexShrink: 0 }}>
            <div style={{ display: 'flex', gap: 6 }}>
              <input
                ref={inputRef}
                value={inputVal}
                onChange={e => setInputVal(e.target.value)}
                onKeyDown={handleKey}
                placeholder="Nova nota..."
                style={{
                  flex: 1, padding: '7px 10px', borderRadius: 8,
                  border: '1px solid var(--b2)',
                  background: 'var(--ib)', color: 'var(--t1)',
                  fontSize: 12, outline: 'none',
                }}
              />
              <button
                onClick={handleAdd}
                disabled={!inputVal.trim()}
                style={{
                  width: 30, height: 30, borderRadius: 8, flexShrink: 0,
                  background: inputVal.trim() ? '#356BFF' : 'var(--s2)',
                  border: 'none', cursor: inputVal.trim() ? 'pointer' : 'default',
                  color: inputVal.trim() ? '#fff' : 'var(--t4)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  transition: 'all .15s',
                }}
              >
                <FiPlus size={14} />
              </button>
            </div>
          </div>

          {/* Notes list */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '2px 10px 10px' }}>
            {quickNotes.length === 0 ? (
              <div style={{ padding: '24px 0', textAlign: 'center', color: 'var(--t4)', fontSize: 12 }}>
                Nenhuma nota ainda
              </div>
            ) : (
              <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                <SortableContext items={quickNotes.map(n => n.id)} strategy={verticalListSortingStrategy}>
                  {quickNotes.map(note => (
                    <NoteRow
                      key={note.id}
                      id={note.id}
                      text={note.text}
                      checked={note.checked}
                      onToggle={() => { toggleQuickNote(note.id); playCheck(); }}
                      onDelete={() => { deleteQuickNote(note.id); playDelete(); }}
                    />
                  ))}
                </SortableContext>
              </DndContext>
            )}
          </div>
        </div>
      )}

      {/* Always-visible toggle tab */}
      <div
        onClick={() => setOpen(o => !o)}
        title={open ? 'Fechar Notas Rápidas' : 'Abrir Notas Rápidas'}
        style={{
          width: 20, height: '100vh', flexShrink: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'var(--sidebar-bg)',
          borderLeft: '1px solid var(--b1)',
          cursor: 'pointer',
          transition: 'background .15s',
        }}
        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--s1)'; }}
        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'var(--sidebar-bg)'; }}
      >
        {open
          ? <FiChevronRight size={11} style={{ color: 'var(--t4)' }} />
          : <FiChevronLeft size={11} style={{ color: 'var(--t4)' }} />
        }
      </div>
    </div>
  );
}

function NoteRow({ id, text, checked, onToggle, onDelete }: {
  id: string; text: string; checked: boolean; onToggle: () => void; onDelete: () => void;
}) {
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
        display: 'flex', alignItems: 'flex-start', gap: 8,
        padding: '6px 8px', borderRadius: 8, marginBottom: 2,
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
            width: 15, height: 15, borderRadius: 4, flexShrink: 0,
            border: `1.5px solid ${checked ? '#356BFF' : 'var(--b3)'}`,
            background: checked ? '#356BFF' : 'transparent',
            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
            marginTop: 1, padding: 0, transition: 'all .15s',
          }}
        >
          {checked && (
            <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
              <polyline points="1,4 3,6.5 7,1.5" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
        </button>
        <span style={{
          flex: 1, fontSize: 12, color: checked ? 'var(--t4)' : 'var(--t1)',
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
            color: 'var(--t4)', padding: 2, display: 'flex', flexShrink: 0,
            opacity: hovered ? 1 : 0, transition: 'opacity .15s',
            pointerEvents: hovered ? 'auto' : 'none',
          }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = '#ff453a'; }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'var(--t4)'; }}
        >
          <FiX size={11} />
        </button>
      </div>
    </div>
  );
}
