import { useState, useMemo } from 'react';
import { FiPlus, FiTrash2, FiLink, FiX, FiCheck, FiChevronDown, FiChevronRight, FiSend } from 'react-icons/fi';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useBriefingsStore } from '../store/briefings';
import { useTaskStore } from '../store/tasks';
import type { Briefing, BriefingStatus } from '../types';

const STATUS_CONFIG: Record<BriefingStatus, { label: string; color: string }> = {
  rascunho:   { label: 'Rascunho',   color: '#636366' },
  enviado:    { label: 'Enviado',    color: '#356BFF' },
  respondido: { label: 'Respondido', color: '#30d158' },
};

export function BriefingsPage() {
  const { briefings, deleteBriefing, permanentDelete, restoreBriefing, setStatus } = useBriefingsStore();
  const { companies, accentColor } = useTaskStore();
  const [showNew, setShowNew] = useState(false);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [copied, setCopied] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<BriefingStatus | 'all'>('all');
  const [showTrash, setShowTrash] = useState(false);

  const active = useMemo(() => briefings.filter(b => !b.deletedAt), [briefings]);
  const trashed = useMemo(() => briefings.filter(b => !!b.deletedAt), [briefings]);

  const filtered = useMemo(() => {
    return active.filter(b => statusFilter === 'all' || b.status === statusFilter);
  }, [active, statusFilter]);

  const toggle = (id: string) => setExpanded(p => ({ ...p, [id]: !p[id] }));

  const copyLink = (b: Briefing) => {
    const url = `${window.location.origin}/briefing/${b.shareToken}`;
    navigator.clipboard.writeText(url);
    setCopied(b.id);
    setTimeout(() => setCopied(null), 1600);
  };

  const companyName = (id: string) => companies.find(c => c.id === id)?.name ?? id;

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: 24, gap: 20, overflowY: 'auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: 'var(--t1)', margin: 0 }}>Briefings</h1>
          <p style={{ fontSize: 12, color: 'var(--t4)', margin: '2px 0 0' }}>Formulários estruturados por cliente</p>
        </div>
        <div style={{ flex: 1 }} />
        <button
          onClick={() => setShowNew(true)}
          style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 10, background: accentColor, border: 'none', cursor: 'pointer', color: '#fff', fontSize: 12, fontWeight: 600 }}
        >
          <FiPlus size={13} /> Novo briefing
        </button>
      </div>

      {/* Status filter */}
      <div style={{ display: 'flex', gap: 6, flexShrink: 0, flexWrap: 'wrap' }}>
        {(['all', 'rascunho', 'enviado', 'respondido'] as const).map(f => {
          const cfg = f !== 'all' ? STATUS_CONFIG[f] : null;
          const isActive = statusFilter === f;
          return (
            <button
              key={f}
              onClick={() => setStatusFilter(f)}
              style={{
                padding: '6px 12px', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer',
                border: `1px solid ${isActive ? (cfg?.color ?? accentColor) : 'var(--b2)'}`,
                background: isActive ? `${cfg?.color ?? accentColor}18` : 'transparent',
                color: isActive ? (cfg?.color ?? accentColor) : 'var(--t3)',
              }}
            >
              {f === 'all' ? 'Todos' : STATUS_CONFIG[f].label}
              <span style={{ marginLeft: 5, fontSize: 10, opacity: 0.7 }}>
                {f === 'all' ? active.length : active.filter(b => b.status === f).length}
              </span>
            </button>
          );
        })}
      </div>

      {/* List */}
      {filtered.length === 0 ? (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 12 }}>
          <span style={{ fontSize: 36 }}>📋</span>
          <p style={{ fontSize: 13, color: 'var(--t4)', margin: 0 }}>
            {active.length === 0 ? 'Nenhum briefing. Crie o primeiro!' : 'Nenhum briefing neste status.'}
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {filtered.map(b => {
            const cfg = STATUS_CONFIG[b.status];
            const isOpen = expanded[b.id];
            return (
              <div key={b.id} style={{ background: 'var(--s1)', borderRadius: 14, border: '1px solid var(--b1)', overflow: 'hidden' }}>
                {/* Card header */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', cursor: 'pointer' }} onClick={() => toggle(b.id)}>
                  <button style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--t4)', padding: 2, display: 'flex', flexShrink: 0 }}>
                    {isOpen ? <FiChevronDown size={13} /> : <FiChevronRight size={13} />}
                  </button>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--t1)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{b.title}</div>
                    <div style={{ fontSize: 11, color: 'var(--t4)', marginTop: 1 }}>
                      {companyName(b.clientId)} · {b.questions.length} perguntas · {format(new Date(b.createdAt), "d MMM", { locale: ptBR })}
                    </div>
                  </div>
                  <span style={{ fontSize: 11, fontWeight: 600, padding: '3px 8px', borderRadius: 6, background: `${cfg.color}18`, color: cfg.color, flexShrink: 0 }}>
                    {cfg.label}
                  </span>

                  {/* Actions */}
                  <button
                    onClick={e => { e.stopPropagation(); copyLink(b); }}
                    title="Copiar link"
                    style={{ width: 30, height: 30, borderRadius: 8, background: copied === b.id ? `${accentColor}18` : 'none', border: 'none', cursor: 'pointer', color: copied === b.id ? accentColor : 'var(--t4)', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all .15s' }}
                  >
                    {copied === b.id ? <FiCheck size={12} /> : <FiLink size={12} />}
                  </button>
                  {b.status === 'rascunho' && (
                    <button
                      onClick={e => { e.stopPropagation(); setStatus(b.id, 'enviado'); }}
                      title="Marcar como enviado"
                      style={{ width: 30, height: 30, borderRadius: 8, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--t4)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(53,107,255,0.1)'; (e.currentTarget as HTMLElement).style.color = '#356BFF'; }}
                      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'none'; (e.currentTarget as HTMLElement).style.color = 'var(--t4)'; }}
                    >
                      <FiSend size={12} />
                    </button>
                  )}
                  <button
                    onClick={e => { e.stopPropagation(); deleteBriefing(b.id); }}
                    title="Mover para lixeira"
                    style={{ width: 30, height: 30, borderRadius: 8, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--t4)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,69,58,0.1)'; (e.currentTarget as HTMLElement).style.color = '#ff453a'; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'none'; (e.currentTarget as HTMLElement).style.color = 'var(--t4)'; }}
                  >
                    <FiTrash2 size={12} />
                  </button>
                </div>

                {/* Questions list */}
                {isOpen && (
                  <div style={{ borderTop: '1px solid var(--b1)', padding: '10px 16px 14px' }}>
                    {b.questions.length === 0 ? (
                      <p style={{ fontSize: 12, color: 'var(--t4)', margin: '6px 0', textAlign: 'center' }}>Nenhuma pergunta</p>
                    ) : (
                      <ol style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 6 }}>
                        {b.questions.map((q, i) => (
                          <li key={q.id} style={{ display: 'flex', gap: 10, padding: '8px 10px', borderRadius: 8, background: 'var(--s2)' }}>
                            <span style={{ fontSize: 11, color: accentColor, fontWeight: 700, flexShrink: 0, width: 16, textAlign: 'right' }}>{i + 1}.</span>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <span style={{ fontSize: 12, color: 'var(--t2)', fontWeight: q.required ? 600 : 400 }}>{q.label}</span>
                              {q.required && <span style={{ marginLeft: 4, color: '#ff453a', fontSize: 11 }}>*</span>}
                              <span style={{ marginLeft: 6, fontSize: 10, color: 'var(--t4)', padding: '1px 5px', borderRadius: 4, background: 'var(--s1)' }}>{q.type}</span>
                              {q.answer && (
                                <div style={{ marginTop: 4, fontSize: 12, color: 'var(--t1)', background: `${accentColor}10`, borderRadius: 6, padding: '5px 8px', borderLeft: `2px solid ${accentColor}` }}>
                                  {String(q.answer)}
                                </div>
                              )}
                            </div>
                          </li>
                        ))}
                      </ol>
                    )}
                    {b.respondedAt && (
                      <p style={{ fontSize: 11, color: '#30d158', margin: '8px 0 0' }}>
                        ✓ Respondido em {format(new Date(b.respondedAt), "d 'de' MMMM 'às' HH:mm", { locale: ptBR })}
                      </p>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Trash */}
      {trashed.length > 0 && (
        <div style={{ marginTop: 8 }}>
          <button onClick={() => setShowTrash(s => !s)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, color: 'var(--t4)', padding: '4px 0', display: 'flex', alignItems: 'center', gap: 6 }}>
            {showTrash ? '▼' : '▶'} Lixeira ({trashed.length})
          </button>
          {showTrash && (
            <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 4 }}>
              {trashed.map(b => (
                <div key={b.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 14px', borderRadius: 10, background: 'var(--s1)', border: '1px solid var(--b1)', opacity: 0.6 }}>
                  <span style={{ flex: 1, fontSize: 13, color: 'var(--t3)' }}>{b.title}</span>
                  <button onClick={() => restoreBriefing(b.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 11, color: accentColor, fontWeight: 600 }}>Restaurar</button>
                  <button onClick={() => { if (confirm('Excluir permanentemente?')) permanentDelete(b.id); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ff453a', display: 'flex', padding: 4 }}><FiTrash2 size={11} /></button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {showNew && <NewBriefingModal accentColor={accentColor} companies={companies.filter(c => !c.deletedAt)} onClose={() => setShowNew(false)} />}
    </div>
  );
}

function NewBriefingModal({
  accentColor, companies, onClose,
}: {
  accentColor: string;
  companies: { id: string; name: string }[];
  onClose: () => void;
}) {
  const { addBriefing } = useBriefingsStore();
  const [title, setTitle] = useState('');
  const [clientId, setClientId] = useState(companies[0]?.id ?? '');

  const save = () => {
    if (!title.trim() || !clientId) return;
    addBriefing({ clientId, title: title.trim(), status: 'rascunho', questions: [] });
    onClose();
  };

  return (
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.5)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{ background: 'var(--modal-bg)', borderRadius: 16, padding: 24, width: 400, boxShadow: '0 24px 64px rgba(0,0,0,0.4)', display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <span style={{ fontSize: 16, fontWeight: 700, color: 'var(--t1)', flex: 1 }}>Novo briefing</span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--t4)', display: 'flex', padding: 4 }}><FiX size={16} /></button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--t4)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Título</label>
          <input
            value={title} onChange={e => setTitle(e.target.value)} autoFocus
            placeholder="Ex: Briefing de identidade visual"
            onKeyDown={e => e.key === 'Enter' && save()}
            style={{ padding: '9px 12px', borderRadius: 8, background: 'var(--s1)', border: '1px solid var(--b2)', color: 'var(--t1)', fontSize: 13, outline: 'none' }}
          />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--t4)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Cliente</label>
          <select
            value={clientId} onChange={e => setClientId(e.target.value)}
            style={{ padding: '9px 12px', borderRadius: 8, background: 'var(--s1)', border: '1px solid var(--b2)', color: 'var(--t1)', fontSize: 13, outline: 'none', cursor: 'pointer' }}
          >
            {companies.length === 0 && <option value="">Nenhum cliente cadastrado</option>}
            {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>

        <p style={{ fontSize: 11, color: 'var(--t4)', margin: 0 }}>
          Um briefing padrão com 7 perguntas será criado. Você poderá editá-lo depois.
        </p>

        <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
          <button onClick={onClose} style={{ flex: 1, padding: '10px', borderRadius: 10, background: 'var(--s1)', border: '1px solid var(--b2)', cursor: 'pointer', color: 'var(--t3)', fontSize: 13 }}>
            Cancelar
          </button>
          <button onClick={save} disabled={!clientId} style={{ flex: 2, padding: '10px', borderRadius: 10, background: accentColor, border: 'none', cursor: 'pointer', color: '#fff', fontSize: 13, fontWeight: 600, opacity: clientId ? 1 : 0.5 }}>
            Criar briefing
          </button>
        </div>
      </div>
    </div>
  );
}
