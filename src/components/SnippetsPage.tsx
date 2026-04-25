import { useState, useMemo } from 'react';
import { FiPlus, FiCopy, FiCheck, FiTrash2, FiEdit2, FiSearch, FiX } from 'react-icons/fi';
import { useSnippetsStore } from '../store/snippets';
import { useTaskStore } from '../store/tasks';
import type { Snippet } from '../types';

type EditState = Snippet | 'new' | null;

export function SnippetsPage() {
  const { snippets, addSnippet, updateSnippet, deleteSnippet, incrementUse } = useSnippetsStore();
  const { accentColor } = useTaskStore();
  const [search, setSearch] = useState('');
  const [catFilter, setCatFilter] = useState('');
  const [editing, setEditing] = useState<EditState>(null);
  const [copied, setCopied] = useState<string | null>(null);

  const categories = useMemo(() => {
    const s = new Set(snippets.map(x => x.category).filter((c): c is string => !!c));
    return Array.from(s).sort();
  }, [snippets]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return snippets.filter(s =>
      (!catFilter || s.category === catFilter) &&
      (!q || s.title.toLowerCase().includes(q) || s.text.toLowerCase().includes(q))
    );
  }, [snippets, search, catFilter]);

  const copy = (s: Snippet) => {
    navigator.clipboard.writeText(s.text);
    incrementUse(s.id);
    setCopied(s.id);
    setTimeout(() => setCopied(null), 1600);
  };

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: 24, gap: 16, overflow: 'hidden' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: 'var(--t1)', margin: 0 }}>Snippets</h1>
          <p style={{ fontSize: 12, color: 'var(--t4)', margin: '2px 0 0' }}>Biblioteca de mensagens prontas</p>
        </div>
        <div style={{ flex: 1 }} />
        <button
          onClick={() => setEditing('new')}
          style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 10, background: accentColor, border: 'none', cursor: 'pointer', color: '#fff', fontSize: 12, fontWeight: 600 }}
        >
          <FiPlus size={13} /> Novo
        </button>
      </div>

      {/* Toolbar */}
      <div style={{ display: 'flex', gap: 8, flexShrink: 0, flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 200, display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', borderRadius: 10, background: 'var(--s1)', border: '1px solid var(--b1)' }}>
          <FiSearch size={13} style={{ color: 'var(--t4)', flexShrink: 0 }} />
          <input
            value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Buscar snippet…"
            style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', fontSize: 13, color: 'var(--t1)' }}
          />
          {search && <button onClick={() => setSearch('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--t4)', display: 'flex', padding: 0 }}><FiX size={12} /></button>}
        </div>

        {categories.length > 0 && (
          <div style={{ display: 'flex', gap: 4, alignItems: 'center', flexWrap: 'wrap' }}>
            <button
              onClick={() => setCatFilter('')}
              style={{ padding: '6px 10px', borderRadius: 8, border: `1px solid ${!catFilter ? accentColor : 'var(--b2)'}`, background: !catFilter ? `${accentColor}18` : 'transparent', color: !catFilter ? accentColor : 'var(--t3)', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}
            >
              Todos
            </button>
            {categories.map(c => (
              <button
                key={c}
                onClick={() => setCatFilter(catFilter === c ? '' : c)}
                style={{ padding: '6px 10px', borderRadius: 8, border: `1px solid ${catFilter === c ? accentColor : 'var(--b2)'}`, background: catFilter === c ? `${accentColor}18` : 'transparent', color: catFilter === c ? accentColor : 'var(--t3)', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}
              >
                {c}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Content */}
      {filtered.length === 0 ? (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 10 }}>
          <span style={{ fontSize: 32 }}>✂️</span>
          <p style={{ fontSize: 13, color: 'var(--t4)', margin: 0 }}>
            {snippets.length === 0 ? 'Nenhum snippet ainda. Crie o primeiro!' : 'Nenhum resultado para esta busca.'}
          </p>
        </div>
      ) : (
        <div style={{ flex: 1, overflowY: 'auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12, alignContent: 'start' }}>
          {filtered.map(s => (
            <div
              key={s.id}
              style={{ background: 'var(--s1)', borderRadius: 12, padding: 14, border: '1px solid var(--b1)', display: 'flex', flexDirection: 'column', gap: 8 }}
            >
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 6 }}>
                <span style={{ flex: 1, fontSize: 13, fontWeight: 600, color: 'var(--t1)', lineHeight: 1.3 }}>{s.title}</span>
                {s.category && (
                  <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.5px', textTransform: 'uppercase', padding: '2px 6px', borderRadius: 4, background: `${accentColor}15`, color: accentColor, flexShrink: 0, whiteSpace: 'nowrap' }}>
                    {s.category}
                  </span>
                )}
              </div>

              <p style={{ fontSize: 12, color: 'var(--t3)', lineHeight: 1.5, margin: 0, whiteSpace: 'pre-wrap', maxHeight: 72, overflow: 'hidden', flex: 1 }}>
                {s.text}
              </p>

              <div style={{ display: 'flex', alignItems: 'center', gap: 2, paddingTop: 4, borderTop: '1px solid var(--b1)' }}>
                <span style={{ fontSize: 10, color: 'var(--t4)', flex: 1 }}>{s.useCount ?? 0}× usado</span>
                <button
                  onClick={() => setEditing(s)} title="Editar"
                  style={{ width: 26, height: 26, borderRadius: 6, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--t4)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--s2)'; (e.currentTarget as HTMLElement).style.color = 'var(--t2)'; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'none'; (e.currentTarget as HTMLElement).style.color = 'var(--t4)'; }}
                >
                  <FiEdit2 size={11} />
                </button>
                <button
                  onClick={() => { if (confirm('Excluir snippet?')) deleteSnippet(s.id); }} title="Excluir"
                  style={{ width: 26, height: 26, borderRadius: 6, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--t4)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,69,58,0.1)'; (e.currentTarget as HTMLElement).style.color = '#ff453a'; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'none'; (e.currentTarget as HTMLElement).style.color = 'var(--t4)'; }}
                >
                  <FiTrash2 size={11} />
                </button>
                <button
                  onClick={() => copy(s)} title="Copiar texto"
                  style={{ width: 26, height: 26, borderRadius: 6, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', background: copied === s.id ? `${accentColor}18` : 'none', color: copied === s.id ? accentColor : 'var(--t4)', transition: 'all .15s' }}
                >
                  {copied === s.id ? <FiCheck size={11} /> : <FiCopy size={11} />}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {editing !== null && (
        <SnippetModal
          key={editing === 'new' ? 'new' : (editing as Snippet).id}
          accentColor={accentColor}
          snippet={editing === 'new' ? null : editing as Snippet}
          onSave={data => {
            if (editing === 'new') addSnippet(data);
            else updateSnippet((editing as Snippet).id, data);
            setEditing(null);
          }}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  );
}

function SnippetModal({
  accentColor, snippet, onSave, onClose,
}: {
  accentColor: string;
  snippet: Snippet | null;
  onSave: (data: Omit<Snippet, 'id' | 'createdAt' | 'useCount'>) => void;
  onClose: () => void;
}) {
  const [title, setTitle] = useState(snippet?.title ?? '');
  const [text, setText] = useState(snippet?.text ?? '');
  const [category, setCategory] = useState(snippet?.category ?? '');

  const save = () => {
    if (!title.trim() || !text.trim()) return;
    onSave({ title: title.trim(), text: text.trim(), category: category.trim() || undefined });
  };

  return (
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.5)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{ background: 'var(--modal-bg)', borderRadius: 16, padding: 24, width: 460, boxShadow: '0 24px 64px rgba(0,0,0,0.4)', display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <span style={{ fontSize: 16, fontWeight: 700, color: 'var(--t1)', flex: 1 }}>{snippet ? 'Editar snippet' : 'Novo snippet'}</span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--t4)', display: 'flex', padding: 4 }}><FiX size={16} /></button>
        </div>

        <input
          value={title} onChange={e => setTitle(e.target.value)} autoFocus
          placeholder="Título do snippet"
          style={{ padding: '9px 12px', borderRadius: 8, background: 'var(--s1)', border: '1px solid var(--b2)', color: 'var(--t1)', fontSize: 13, outline: 'none' }}
        />

        <input
          value={category} onChange={e => setCategory(e.target.value)}
          placeholder="Categoria (opcional — ex: Follow-up, Proposta, Onboarding)"
          style={{ padding: '9px 12px', borderRadius: 8, background: 'var(--s1)', border: '1px solid var(--b2)', color: 'var(--t1)', fontSize: 13, outline: 'none' }}
        />

        <textarea
          value={text} onChange={e => setText(e.target.value)}
          placeholder={'Texto do snippet.\nUse {variavel} para valores dinâmicos — ex: Olá {nome_cliente}!'}
          rows={7}
          style={{ padding: '9px 12px', borderRadius: 8, background: 'var(--s1)', border: '1px solid var(--b2)', color: 'var(--t1)', fontSize: 13, outline: 'none', resize: 'vertical', fontFamily: 'inherit', lineHeight: 1.5 }}
        />

        <p style={{ fontSize: 11, color: 'var(--t4)', margin: 0 }}>
          Dica: use {'{nome_cliente}'}, {'{data}'}, {'{servico}'} para substituições automáticas
        </p>

        <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
          <button onClick={onClose} style={{ flex: 1, padding: '10px', borderRadius: 10, background: 'var(--s1)', border: '1px solid var(--b2)', cursor: 'pointer', color: 'var(--t3)', fontSize: 13 }}>
            Cancelar
          </button>
          <button onClick={save} style={{ flex: 2, padding: '10px', borderRadius: 10, background: accentColor, border: 'none', cursor: 'pointer', color: '#fff', fontSize: 13, fontWeight: 600 }}>
            {snippet ? 'Salvar' : 'Criar'}
          </button>
        </div>
      </div>
    </div>
  );
}
