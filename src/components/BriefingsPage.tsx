import { useState, useMemo, useEffect } from 'react';
import { FiPlus, FiTrash2, FiLink, FiX, FiCheck, FiChevronDown, FiChevronRight, FiSend, FiEdit2 } from 'react-icons/fi';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useBriefingsStore } from '../store/briefings';
import { useTaskStore } from '../store/tasks';
import type { Briefing, BriefingStatus, BriefingQuestion } from '../types';

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
  const [editingBriefing, setEditingBriefing] = useState<Briefing | null>(null);

  // N = new briefing
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'n' && e.key !== 'N') return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const tag = (e.target as HTMLElement).tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      setShowNew(true);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const active = useMemo(() => briefings.filter(b => !b.deletedAt), [briefings]);
  const trashed = useMemo(() => briefings.filter(b => !!b.deletedAt), [briefings]);

  const filtered = useMemo(() => {
    return active.filter(b => statusFilter === 'all' || b.status === statusFilter);
  }, [active, statusFilter]);

  const toggle = (id: string) => setExpanded(p => ({ ...p, [id]: !p[id] }));

  const copyLink = (b: Briefing) => {
    const url = `${window.location.origin}${window.location.pathname}#briefing=${b.shareToken}`;
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
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 14 }}>
          <div style={{ width: 60, height: 60, borderRadius: 18, background: 'var(--s1)', border: '1px solid var(--b1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26 }}>📋</div>
          <div style={{ textAlign: 'center' }}>
            <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--t2)', margin: '0 0 4px' }}>
              {active.length === 0 ? 'Nenhum briefing ainda' : 'Nenhum briefing neste status'}
            </p>
            <p style={{ fontSize: 12, color: 'var(--t4)', margin: 0 }}>
              {active.length === 0 ? 'Crie um briefing e envie o link para seu cliente preencher' : 'Mude o filtro de status acima para ver outros briefings'}
            </p>
          </div>
          {active.length === 0 && (
            <button
              onClick={() => setShowNew(true)}
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 18px', borderRadius: 10, background: accentColor, border: 'none', cursor: 'pointer', color: '#fff', fontSize: 13, fontWeight: 600 }}
            >
              <FiPlus size={14} /> Criar primeiro briefing
            </button>
          )}
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
                    onClick={e => { e.stopPropagation(); setEditingBriefing(b); }}
                    title="Editar briefing"
                    style={{ width: 30, height: 30, borderRadius: 8, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--t4)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = accentColor; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'var(--t4)'; }}
                  >
                    <FiEdit2 size={12} />
                  </button>
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

                {/* Expanded content */}
                {isOpen && (
                  <div style={{ borderTop: '1px solid var(--b1)' }}>

                    {/* Toolbar */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 14px', background: 'rgba(0,0,0,0.12)' }}>
                      <span style={{ fontSize: 11, color: 'var(--t4)', flex: 1 }}>
                        {b.questions.length} pergunta{b.questions.length !== 1 ? 's' : ''}
                        {b.questions.filter(q => q.required).length > 0 && (
                          <> · <span style={{ color: '#ff453a' }}>{b.questions.filter(q => q.required).length}</span> obrigatória{b.questions.filter(q => q.required).length > 1 ? 's' : ''}</>
                        )}
                      </span>
                      {b.status !== 'respondido' && (
                        <button
                          onClick={e => { e.stopPropagation(); copyLink(b); }}
                          style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 10px', borderRadius: 7, background: 'transparent', border: '1px solid var(--b2)', color: copied === b.id ? '#30d158' : 'var(--t4)', fontSize: 11, cursor: 'pointer', transition: 'all .15s' }}
                        >
                          {copied === b.id ? <FiCheck size={10} /> : <FiLink size={10} />}
                          {copied === b.id ? 'Copiado!' : 'Copiar link'}
                        </button>
                      )}
                      <button
                        onClick={e => { e.stopPropagation(); setEditingBriefing(b); }}
                        style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 12px', borderRadius: 7, background: `${accentColor}15`, border: `1px solid ${accentColor}35`, color: accentColor, fontSize: 11, fontWeight: 600, cursor: 'pointer' }}
                      >
                        <FiEdit2 size={11} /> Editar perguntas
                      </button>
                    </div>

                    {/* Responses section (status = respondido) */}
                    {b.status === 'respondido' && (
                      <div style={{ padding: '14px 16px 16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 12 }}>
                          <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#30d158', boxShadow: '0 0 6px #30d15860', flexShrink: 0 }} />
                          <span style={{ fontSize: 10, fontWeight: 700, color: '#30d158', textTransform: 'uppercase', letterSpacing: '1.2px' }}>Respostas do cliente</span>
                          {b.respondedAt && (
                            <span style={{ fontSize: 10, color: 'var(--t4)' }}>
                              · {format(new Date(b.respondedAt), "d 'de' MMM 'às' HH:mm", { locale: ptBR })}
                            </span>
                          )}
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                          {b.questions.map((q, i) => (
                            <div key={q.id} style={{ background: q.answer ? `${accentColor}08` : 'var(--s2)', border: `1px solid ${q.answer ? `${accentColor}22` : 'var(--b1)'}`, borderRadius: 10, padding: '10px 14px' }}>
                              <div style={{ fontSize: 11, color: 'var(--t3)', marginBottom: q.answer ? 6 : 0, display: 'flex', alignItems: 'center', gap: 4 }}>
                                <span style={{ color: accentColor, fontWeight: 700 }}>{i + 1}.</span>
                                <span style={{ flex: 1 }}>{q.label}</span>
                                {q.required && <span style={{ color: '#ff453a', fontSize: 10 }}>✱</span>}
                              </div>
                              {q.answer ? (
                                <div style={{ fontSize: 13, color: 'var(--t1)', lineHeight: 1.55 }}>
                                  {Array.isArray(q.answer)
                                    ? (q.answer as string[]).map((a, ai) => (
                                        <span key={ai} style={{ display: 'inline-flex', alignItems: 'center', marginRight: 6, marginBottom: 3, padding: '2px 8px', borderRadius: 5, background: `${accentColor}15`, border: `1px solid ${accentColor}25`, color: accentColor, fontSize: 12 }}>{a}</span>
                                      ))
                                    : String(q.answer)
                                  }
                                </div>
                              ) : (
                                <div style={{ fontSize: 11, color: 'var(--t4)', fontStyle: 'italic', marginTop: 4 }}>Não respondida</div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Question list preview (not responded) */}
                    {b.status !== 'respondido' && (
                      <div style={{ padding: '8px 16px 14px' }}>
                        {b.questions.length === 0 ? (
                          <div style={{ padding: '20px 0', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                            <span style={{ fontSize: 24, opacity: 0.5 }}>📋</span>
                            <p style={{ fontSize: 12, color: 'var(--t4)', margin: 0, textAlign: 'center' }}>
                              Nenhuma pergunta. Clique em <strong style={{ color: accentColor }}>Editar perguntas</strong> acima para adicionar.
                            </p>
                          </div>
                        ) : (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                            {b.questions.map((q, i) => (
                              <div key={q.id} style={{ display: 'flex', gap: 8, padding: '5px 6px', borderRadius: 6, alignItems: 'center' }}>
                                <span style={{ fontSize: 10, color: accentColor, fontWeight: 700, flexShrink: 0, width: 18, textAlign: 'right', opacity: 0.7 }}>{i + 1}</span>
                                <span style={{ flex: 1, fontSize: 12, color: 'var(--t2)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{q.label}</span>
                                {q.required && <span style={{ color: '#ff453a', fontSize: 10, flexShrink: 0 }}>✱</span>}
                                <span style={{ fontSize: 9, color: 'var(--t4)', padding: '2px 6px', borderRadius: 4, background: 'var(--s2)', border: '1px solid var(--b1)', flexShrink: 0 }}>
                                  {q.type === 'long' ? 'longo' : q.type === 'select' ? 'escolha' : q.type === 'multi' ? 'múltipla' : q.type}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                        {b.status === 'enviado' && (
                          <p style={{ fontSize: 11, color: 'var(--t4)', margin: '10px 0 0', display: 'flex', alignItems: 'center', gap: 5 }}>
                            <span style={{ fontSize: 13 }}>💬</span>
                            As respostas do cliente aparecerão aqui após o preenchimento.
                          </p>
                        )}
                      </div>
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
      {editingBriefing && <BriefingEditorModal briefing={editingBriefing} accentColor={accentColor} onClose={() => setEditingBriefing(null)} />}
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

// ─── Editor de briefing ────────────────────────────────────────────────────
function BriefingEditorModal({ briefing: initialBriefing, accentColor, onClose }: { briefing: Briefing; accentColor: string; onClose: () => void }) {
  const { updateBriefing, addQuestion, removeQuestion, updateQuestion } = useBriefingsStore();
  const liveBriefing = useBriefingsStore(s => s.briefings.find(b => b.id === initialBriefing.id));
  const briefing = liveBriefing ?? initialBriefing;
  const [title, setTitle] = useState(briefing.title);
  const [newQ, setNewQ] = useState('');
  const [newOpts, setNewOpts] = useState<Record<string, string>>({});

  const handleTitleBlur = () => {
    if (title.trim() && title.trim() !== briefing.title) updateBriefing(briefing.id, { title: title.trim() });
  };

  const handleClose = () => {
    if (title.trim() && title.trim() !== briefing.title) updateBriefing(briefing.id, { title: title.trim() });
    onClose();
  };

  const handleAddQ = () => {
    if (!newQ.trim()) return;
    addQuestion(briefing.id, { label: newQ.trim(), type: 'long' });
    setNewQ('');
  };

  const addOption = (qId: string) => {
    const val = (newOpts[qId] ?? '').trim();
    if (!val) return;
    const q = briefing.questions.find(q => q.id === qId);
    if (!q) return;
    updateQuestion(briefing.id, qId, { options: [...(q.options ?? []), val] });
    setNewOpts(p => ({ ...p, [qId]: '' }));
  };

  const removeOption = (qId: string, idx: number) => {
    const q = briefing.questions.find(q => q.id === qId);
    if (!q) return;
    updateQuestion(briefing.id, qId, { options: q.options?.filter((_, i) => i !== idx) ?? [] });
  };

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.6)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{ background: 'var(--modal-bg)', borderRadius: 18, padding: 24, width: 580, maxHeight: '86vh', overflowY: 'auto', boxShadow: '0 24px 64px rgba(0,0,0,0.4)', display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', color: 'var(--t4)', marginBottom: 2 }}>Editar briefing</div>
            <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--t1)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{briefing.title}</div>
          </div>
          <button onClick={handleClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--t4)', display: 'flex', padding: 4 }}><FiX size={16} /></button>
        </div>

        {/* Título */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
          <label style={{ fontSize: 10, fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase', color: 'var(--t4)' }}>Título</label>
          <input value={title} onChange={e => setTitle(e.target.value)} onBlur={handleTitleBlur}
            style={{ padding: '9px 12px', borderRadius: 8, background: 'var(--s1)', border: '1px solid var(--b2)', color: 'var(--t1)', fontSize: 13, outline: 'none' }}
          />
        </div>

        {/* Perguntas */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <label style={{ fontSize: 10, fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase', color: 'var(--t4)' }}>Perguntas ({briefing.questions.length})</label>
          {briefing.questions.map((q, i) => (
            <div key={q.id} style={{ background: 'var(--s1)', border: '1px solid var(--b1)', borderRadius: 10, padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                <span style={{ fontSize: 11, color: accentColor, fontWeight: 700, flexShrink: 0, width: 20, textAlign: 'right' }}>{i + 1}.</span>
                <input value={q.label} onChange={e => updateQuestion(briefing.id, q.id, { label: e.target.value })}
                  style={{ flex: 1, padding: '6px 10px', borderRadius: 7, background: 'var(--s2)', border: '1px solid var(--b2)', color: 'var(--t1)', fontSize: 12, outline: 'none', minWidth: 0 }}
                />
                <select value={q.type} onChange={e => {
                  const newType = e.target.value as BriefingQuestion['type'];
                  const hasOptions = (q.options ?? []).length > 0;
                  const willLoseOptions = hasOptions && newType !== 'select' && newType !== 'multi';
                  if (willLoseOptions && !confirm('Mudar o tipo vai apagar as opções cadastradas. Continuar?')) return;
                  updateQuestion(briefing.id, q.id, { type: newType, options: newType === 'select' || newType === 'multi' ? (q.options ?? []) : [] });
                }}
                  style={{ padding: '6px 8px', borderRadius: 7, background: 'var(--s2)', border: '1px solid var(--b2)', color: 'var(--t1)', fontSize: 11, flexShrink: 0 }}
                >
                  <option value="text">Texto</option>
                  <option value="long">Longo</option>
                  <option value="number">Número</option>
                  <option value="select">Escolha única</option>
                  <option value="multi">Múltipla escolha</option>
                </select>
                <button
                  onClick={() => updateQuestion(briefing.id, q.id, { required: !q.required })}
                  title={q.required ? 'Obrigatória — clique para tornar opcional' : 'Opcional — clique para tornar obrigatória'}
                  style={{ width: 26, height: 26, borderRadius: 6, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 13, fontWeight: 700, transition: 'all .15s', background: q.required ? 'rgba(255,69,58,0.12)' : 'none', border: q.required ? '1px solid rgba(255,69,58,0.3)' : '1px solid transparent', color: q.required ? '#ff453a' : 'var(--t4)' }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = '#ff453a'; (e.currentTarget as HTMLElement).style.borderColor = 'rgba(255,69,58,0.3)'; }}
                  onMouseLeave={e => { if (!q.required) { (e.currentTarget as HTMLElement).style.color = 'var(--t4)'; (e.currentTarget as HTMLElement).style.borderColor = 'transparent'; } }}
                >✱</button>
                <button onClick={() => removeQuestion(briefing.id, q.id)}
                  style={{ width: 26, height: 26, borderRadius: 6, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--t4)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = '#ff453a'; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'var(--t4)'; }}
                ><FiTrash2 size={12} /></button>
              </div>

              {/* Options editor for select/multi */}
              {(q.type === 'select' || q.type === 'multi') && (
                <div style={{ marginLeft: 26, display: 'flex', flexDirection: 'column', gap: 5 }}>
                  {(q.options ?? []).map((opt, oi) => (
                    <div key={oi} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <div style={{ width: q.type === 'multi' ? 10 : 10, height: 10, borderRadius: q.type === 'multi' ? 2 : '50%', border: '1.5px solid var(--t4)', flexShrink: 0 }} />
                      <span style={{ flex: 1, fontSize: 11, color: 'var(--t2)' }}>{opt}</span>
                      <button onClick={() => removeOption(q.id, oi)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--t4)', padding: 2, display: 'flex' }}
                        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = '#ff453a'; }}
                        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'var(--t4)'; }}
                      ><FiX size={10} /></button>
                    </div>
                  ))}
                  <div style={{ display: 'flex', gap: 5 }}>
                    <input value={newOpts[q.id] ?? ''} onChange={e => setNewOpts(p => ({ ...p, [q.id]: e.target.value }))}
                      onKeyDown={e => e.key === 'Enter' && addOption(q.id)}
                      placeholder="Nova opção..."
                      style={{ flex: 1, padding: '5px 8px', borderRadius: 6, background: 'var(--s2)', border: '1px dashed var(--b2)', color: 'var(--t1)', fontSize: 11, outline: 'none' }}
                    />
                    <button onClick={() => addOption(q.id)}
                      style={{ padding: '5px 10px', borderRadius: 6, background: `${accentColor}18`, border: `1px solid ${accentColor}40`, color: accentColor, fontSize: 11, fontWeight: 600, cursor: 'pointer' }}
                    >+ Opção</button>
                  </div>
                </div>
              )}
            </div>
          ))}
          {/* Nova pergunta */}
          <div style={{ display: 'flex', gap: 6, marginTop: 2 }}>
            <input value={newQ} onChange={e => setNewQ(e.target.value)} placeholder="Nova pergunta..."
              onKeyDown={e => e.key === 'Enter' && handleAddQ()}
              style={{ flex: 1, padding: '7px 10px', borderRadius: 7, background: 'var(--s1)', border: `1px dashed var(--b2)`, color: 'var(--t1)', fontSize: 12, outline: 'none' }}
            />
            <button onClick={handleAddQ}
              style={{ padding: '7px 14px', borderRadius: 7, background: accentColor, border: 'none', color: '#fff', cursor: 'pointer', fontSize: 12, fontWeight: 600 }}
            >+ Adicionar</button>
          </div>
        </div>

        <button onClick={handleClose}
          style={{ padding: '10px', borderRadius: 10, background: 'var(--s1)', border: '1px solid var(--b2)', cursor: 'pointer', color: 'var(--t2)', fontSize: 13, fontWeight: 600 }}
        >Fechar</button>
      </div>
    </div>
  );
}

// ─── Vista pública do briefing para o cliente ──────────────────────────────
export function PublicBriefingView({ token, onBack: _onBack }: { token: string; onBack: () => void }) {
  const { briefings, markResponded, updateQuestion } = useBriefingsStore();
  const { accentColor } = useTaskStore();
  const briefing = briefings.find(b => b.shareToken === token && !b.deletedAt);
  const [answers, setAnswers] = useState<Record<string, string | string[]>>({});
  const [submitted, setSubmitted] = useState(false);
  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState<'fwd' | 'bck'>('fwd');
  const [animKey, setAnimKey] = useState(0);

  const questions = briefing?.questions ?? [];
  const total = questions.length;
  const current = questions[step];

  const isAnswered = (qId: string) => {
    const a = answers[qId];
    if (Array.isArray(a)) return a.length > 0;
    return (a ?? '').toString().trim() !== '';
  };

  const canGoNext = !current?.required || isAnswered(current?.id ?? '');

  const go = (dir: 'fwd' | 'bck') => {
    setDirection(dir);
    setAnimKey(k => k + 1);
    setStep(s => dir === 'fwd' ? s + 1 : s - 1);
  };

  const handleSubmit = () => {
    questions.forEach(q => {
      const ans = answers[q.id];
      if (ans !== undefined) updateQuestion(briefing!.id, q.id, { answer: ans });
    });
    markResponded(briefing!.id);
    setSubmitted(true);
  };

  const toggleMulti = (qId: string, opt: string) => {
    setAnswers(p => {
      const cur = (p[qId] as string[] | undefined) ?? [];
      return { ...p, [qId]: cur.includes(opt) ? cur.filter(o => o !== opt) : [...cur, opt] };
    });
  };

  // Fix scroll: use position fixed to bypass parent overflow:hidden on #root
  const wrapStyle: React.CSSProperties = {
    position: 'fixed', inset: 0, overflowY: 'auto', zIndex: 100,
    background: '#080C18',
    fontFamily: "'DM Sans', system-ui, sans-serif",
  };

  const accent = accentColor || '#356BFF';
  const accentLight = '#64C4FF';

  if (!briefing) return (
    <div style={{ ...wrapStyle, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, padding: 24, color: '#fff' }}>
      <div style={{ width: 64, height: 64, borderRadius: 20, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28 }}>🔍</div>
      <div style={{ fontSize: 20, fontWeight: 700 }}>Briefing não encontrado</div>
      <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)', textAlign: 'center', maxWidth: 340 }}>Este link pode ter expirado ou o formulário foi removido.</div>
    </div>
  );

  if (submitted || briefing.status === 'respondido') return (
    <div style={{ ...wrapStyle, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 20, padding: 24, color: '#fff' }}>
      <style>{`@keyframes popIn{0%{opacity:0;transform:scale(.4)}70%{transform:scale(1.08)}100%{opacity:1;transform:scale(1)}}`}</style>
      <div style={{ width: 72, height: 72, borderRadius: 24, background: `rgba(${accent === '#356BFF' ? '53,107,255' : '53,107,255'},.15)`, border: `1px solid ${accent}40`, display: 'flex', alignItems: 'center', justifyContent: 'center', animation: 'popIn .5s cubic-bezier(.34,1.56,.64,1) both' }}>
        <FiCheck size={30} color={accentLight} />
      </div>
      <div style={{ fontSize: 26, fontWeight: 700, color: '#fff', fontStyle: 'italic' }}>Briefing enviado!</div>
      <div style={{ width: 48, height: 1, background: `${accent}40` }} />
      <div style={{ fontSize: 14, color: 'rgba(255,255,255,.45)', textAlign: 'center', maxWidth: 400, lineHeight: 1.7 }}>
        Obrigado! Suas respostas foram recebidas com sucesso.<br />Em breve entraremos em contato.
      </div>
      <div style={{ marginTop: 16, fontSize: 10, color: 'rgba(255,255,255,.15)', letterSpacing: '1px', textTransform: 'uppercase' }}>Powered by EvoStudio</div>
    </div>
  );

  const answeredCount = questions.filter(q => isAnswered(q.id)).length;
  const progressPct = total > 0 ? (answeredCount / total) * 100 : 0;
  const isLastStep = step === total - 1;
  const allRequired = questions.filter(q => q.required).every(q => isAnswered(q.id));

  const inputBase: React.CSSProperties = {
    width: '100%', boxSizing: 'border-box',
    padding: '12px 14px', borderRadius: 10,
    background: 'rgba(255,255,255,.04)', border: '1px solid rgba(255,255,255,.09)',
    color: '#fff', fontSize: 14, outline: 'none',
    fontFamily: 'inherit', transition: 'border-color .15s, box-shadow .15s',
  };

  return (
    <div style={wrapStyle}>
      <style>{`
        @keyframes slideInRight { from { opacity:0; transform:translateX(28px); } to { opacity:1; transform:translateX(0); } }
        @keyframes slideInLeft  { from { opacity:0; transform:translateX(-28px); } to { opacity:1; transform:translateX(0); } }
        @keyframes riseIn { from { opacity:0; transform:translateY(14px); } to { opacity:1; transform:translateY(0); } }
        .briefing-step { animation: ${direction === 'fwd' ? 'slideInRight' : 'slideInLeft'} .32s ease both; }
        .briefing-header { animation: riseIn .5s cubic-bezier(.4,0,.2,1) both; }
        .briefing-card { animation: riseIn .55s .1s cubic-bezier(.4,0,.2,1) both; }
        .bfopt:hover { background: rgba(53,107,255,.08) !important; border-color: rgba(53,107,255,.25) !important; }
        .bfinput:focus { border-color: rgba(53,107,255,.5) !important; box-shadow: 0 0 0 3px rgba(53,107,255,.1) !important; }
      `}</style>

      {/* Thin progress bar at very top */}
      <div style={{ position: 'fixed', top: 0, left: 0, right: 0, height: 2, background: 'rgba(255,255,255,.05)', zIndex: 101 }}>
        <div style={{ height: '100%', width: `${progressPct}%`, background: `linear-gradient(90deg, ${accent}, ${accentLight})`, transition: 'width .45s cubic-bezier(.4,0,.2,1)' }} />
      </div>

      <div style={{ maxWidth: 640, margin: '0 auto', padding: '52px 20px 80px' }}>

        {/* Header */}
        <div className="briefing-header" style={{ textAlign: 'center', marginBottom: 36 }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
            <div style={{ width: 28, height: 28, borderRadius: 7, background: `linear-gradient(135deg, ${accent}, ${accentLight})`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ fontSize: 14 }}>✦</span>
            </div>
            <span style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,.35)', textTransform: 'uppercase', letterSpacing: '3px' }}>Briefing</span>
          </div>
          <h1 style={{ fontSize: 28, fontWeight: 700, color: 'rgba(255,255,255,.88)', margin: '0 0 8px', lineHeight: 1.25, fontStyle: 'italic' }}>
            {briefing.title}
          </h1>
          <p style={{ fontSize: 13, color: 'rgba(255,255,255,.35)', margin: 0 }}>
            Preencha com calma — formulário exclusivo.
          </p>
        </div>

        {/* Card */}
        {total === 0 ? (
          <div className="briefing-card" style={{ background: 'rgba(255,255,255,.03)', border: '1px solid rgba(255,255,255,.07)', borderRadius: 20, padding: '40px 32px', textAlign: 'center', backdropFilter: 'blur(16px)' }}>
            <p style={{ color: 'rgba(255,255,255,.4)', fontSize: 13 }}>Nenhuma pergunta cadastrada neste briefing.</p>
          </div>
        ) : (
          <div className="briefing-card" style={{ background: 'rgba(255,255,255,.03)', border: '1px solid rgba(255,255,255,.07)', borderRadius: 20, overflow: 'hidden', backdropFilter: 'blur(16px)' }}>

            {/* Step tabs */}
            <div style={{ display: 'flex', overflowX: 'auto', borderBottom: '1px solid rgba(255,255,255,.07)', scrollbarWidth: 'none' }}>
              {questions.map((q, i) => {
                const answered = isAnswered(q.id);
                const isActive = i === step;
                return (
                  <button key={q.id}
                    onClick={() => { if (i <= step || answered) { setDirection(i > step ? 'fwd' : 'bck'); setAnimKey(k => k + 1); setStep(i); } }}
                    style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '12px 16px', background: 'none', border: 'none', borderBottom: `2px solid ${isActive ? accent : 'transparent'}`, color: isActive ? accentLight : answered ? 'rgba(255,255,255,.55)' : 'rgba(255,255,255,.25)', fontSize: 11, fontWeight: 600, cursor: i <= step || answered ? 'pointer' : 'default', whiteSpace: 'nowrap', flexShrink: 0, transition: 'all .15s' }}
                  >
                    {answered && !isActive
                      ? <FiCheck size={11} />
                      : <span style={{ fontSize: 10, opacity: 0.7 }}>{String(i + 1).padStart(2, '0')}</span>
                    }
                    <span style={{ maxWidth: 100, overflow: 'hidden', textOverflow: 'ellipsis' }}>{q.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Step content */}
            <div style={{ padding: '28px 28px 20px' }}>
              <div className="briefing-step" key={animKey} style={{ minHeight: 180 }}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 20 }}>
                  <span style={{ fontSize: 12, color: 'rgba(255,255,255,.25)', fontWeight: 700, letterSpacing: '1px' }}>
                    {String(step + 1).padStart(2, '0')} / {String(total).padStart(2, '0')}
                  </span>
                  {current.required && <span style={{ fontSize: 10, color: '#ff453a', fontWeight: 700 }}>✱ obrigatória</span>}
                </div>
                <label style={{ display: 'block', fontSize: 18, fontWeight: 600, color: 'rgba(255,255,255,.88)', marginBottom: 22, lineHeight: 1.4, letterSpacing: '-.2px' }}>
                  {current.label}
                </label>

                {(current.type === 'text' || current.type === 'number') && (
                  <input type={current.type === 'number' ? 'number' : 'text'}
                    className="bfinput"
                    value={(answers[current.id] as string) ?? ''}
                    onChange={e => setAnswers(p => ({ ...p, [current.id]: e.target.value }))}
                    onKeyDown={e => e.key === 'Enter' && canGoNext && !isLastStep && go('fwd')}
                    placeholder="Sua resposta..."
                    style={inputBase}
                    autoFocus
                  />
                )}

                {current.type === 'long' && (
                  <textarea
                    className="bfinput"
                    value={(answers[current.id] as string) ?? ''}
                    onChange={e => setAnswers(p => ({ ...p, [current.id]: e.target.value }))}
                    placeholder="Escreva sua resposta aqui..."
                    rows={5}
                    style={{ ...inputBase, resize: 'vertical' }}
                    autoFocus
                  />
                )}

                {current.type === 'select' && (current.options ?? []).length > 0 && (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 8 }}>
                    {(current.options ?? []).map(opt => {
                      const selected = (answers[current.id] as string) === opt;
                      return (
                        <label key={opt} className="bfopt"
                          style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 10, background: selected ? `${accent}20` : 'rgba(255,255,255,.03)', border: `1px solid ${selected ? `${accent}45` : 'rgba(255,255,255,.07)'}`, cursor: 'pointer', transition: 'all .15s' }}
                          onClick={() => setAnswers(p => ({ ...p, [current.id]: opt }))}
                        >
                          <div style={{ width: 16, height: 16, borderRadius: '50%', border: `2px solid ${selected ? accent : 'rgba(255,255,255,.25)'}`, background: selected ? accent : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'all .15s' }}>
                            {selected && <div style={{ width: 5, height: 5, borderRadius: '50%', background: '#fff' }} />}
                          </div>
                          <span style={{ fontSize: 13, color: selected ? accentLight : 'rgba(255,255,255,.65)' }}>{opt}</span>
                        </label>
                      );
                    })}
                  </div>
                )}

                {current.type === 'select' && (current.options ?? []).length === 0 && (
                  <input className="bfinput" type="text"
                    value={(answers[current.id] as string) ?? ''}
                    onChange={e => setAnswers(p => ({ ...p, [current.id]: e.target.value }))}
                    placeholder="Sua resposta..." style={inputBase} autoFocus
                  />
                )}

                {current.type === 'multi' && (current.options ?? []).length > 0 && (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 8 }}>
                    {(current.options ?? []).map(opt => {
                      const cur = (answers[current.id] as string[]) ?? [];
                      const checked = cur.includes(opt);
                      return (
                        <label key={opt} className="bfopt"
                          style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 10, background: checked ? `${accent}20` : 'rgba(255,255,255,.03)', border: `1px solid ${checked ? `${accent}45` : 'rgba(255,255,255,.07)'}`, cursor: 'pointer', transition: 'all .15s' }}
                          onClick={() => toggleMulti(current.id, opt)}
                        >
                          <div style={{ width: 16, height: 16, borderRadius: 4, border: `2px solid ${checked ? accent : 'rgba(255,255,255,.25)'}`, background: checked ? accent : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'all .15s' }}>
                            {checked && <FiCheck size={10} color="#fff" />}
                          </div>
                          <span style={{ fontSize: 13, color: checked ? accentLight : 'rgba(255,255,255,.65)' }}>{opt}</span>
                        </label>
                      );
                    })}
                  </div>
                )}

                {current.type === 'multi' && (current.options ?? []).length === 0 && (
                  <input className="bfinput" type="text"
                    value={(answers[current.id] as string) ?? ''}
                    onChange={e => setAnswers(p => ({ ...p, [current.id]: e.target.value }))}
                    placeholder="Sua resposta..." style={inputBase} autoFocus
                  />
                )}

                {/* Required error hint */}
                {current.required && !isAnswered(current.id) && (
                  <p style={{ fontSize: 11, color: 'rgba(255,80,80,.7)', marginTop: 8 }}>Campo obrigatório.</p>
                )}
              </div>
            </div>

            {/* Navigation bar */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 28px', borderTop: '1px solid rgba(255,255,255,.07)' }}>
              {step > 0 ? (
                <button onClick={() => go('bck')}
                  style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,.35)', fontSize: 13, fontWeight: 600, padding: 0, transition: 'color .15s' }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,.65)'; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,.35)'; }}
                >
                  ← Anterior
                </button>
              ) : <div />}

              {isLastStep ? (
                <button onClick={handleSubmit} disabled={!allRequired}
                  style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 22px', borderRadius: 10, background: allRequired ? accent : `${accent}55`, border: 'none', color: '#fff', fontSize: 13, fontWeight: 700, cursor: allRequired ? 'pointer' : 'not-allowed', transition: 'all .2s' }}
                  onMouseEnter={e => { if (allRequired) { (e.currentTarget as HTMLElement).style.boxShadow = `0 8px 24px ${accent}40`; } }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.boxShadow = 'none'; }}
                >
                  <FiCheck size={13} /> Enviar briefing
                </button>
              ) : (
                <button onClick={() => canGoNext && go('fwd')} disabled={!canGoNext}
                  style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 22px', borderRadius: 10, background: canGoNext ? accent : `${accent}55`, border: 'none', color: '#fff', fontSize: 13, fontWeight: 700, cursor: canGoNext ? 'pointer' : 'not-allowed', transition: 'all .2s' }}
                  onMouseEnter={e => { if (canGoNext) { (e.currentTarget as HTMLElement).style.boxShadow = `0 8px 24px ${accent}40`; } }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.boxShadow = 'none'; }}
                >
                  Próxima →
                </button>
              )}
            </div>
          </div>
        )}

        <div style={{ textAlign: 'center', marginTop: 32, fontSize: 10, color: 'rgba(255,255,255,.15)', letterSpacing: '0.5px' }}>
          © EvoStudio · contatoevostudio@gmail.com
        </div>
      </div>
    </div>
  );
}
