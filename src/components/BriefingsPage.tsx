import { useState, useMemo } from 'react';
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
function BriefingEditorModal({ briefing, accentColor, onClose }: { briefing: Briefing; accentColor: string; onClose: () => void }) {
  const { updateBriefing, addQuestion, removeQuestion, updateQuestion } = useBriefingsStore();
  const [title, setTitle] = useState(briefing.title);
  const [newQ, setNewQ] = useState('');

  const handleTitleBlur = () => {
    if (title.trim() && title.trim() !== briefing.title) updateBriefing(briefing.id, { title: title.trim() });
  };

  const handleAddQ = () => {
    if (!newQ.trim()) return;
    addQuestion(briefing.id, { label: newQ.trim(), type: 'long' });
    setNewQ('');
  };

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.6)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{ background: 'var(--modal-bg)', borderRadius: 18, padding: 24, width: 540, maxHeight: '82vh', overflowY: 'auto', boxShadow: '0 24px 64px rgba(0,0,0,0.4)', display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <span style={{ fontSize: 16, fontWeight: 700, color: 'var(--t1)', flex: 1 }}>Editar briefing</span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--t4)', display: 'flex', padding: 4 }}><FiX size={16} /></button>
        </div>

        {/* Título */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
          <label style={{ fontSize: 10, fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase', color: 'var(--t4)' }}>Título</label>
          <input value={title} onChange={e => setTitle(e.target.value)} onBlur={handleTitleBlur}
            style={{ padding: '9px 12px', borderRadius: 8, background: 'var(--s1)', border: '1px solid var(--b2)', color: 'var(--t1)', fontSize: 13, outline: 'none' }}
          />
        </div>

        {/* Perguntas */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <label style={{ fontSize: 10, fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase', color: 'var(--t4)' }}>Perguntas ({briefing.questions.length})</label>
          {briefing.questions.map((q, i) => (
            <div key={q.id} style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              <span style={{ fontSize: 11, color: accentColor, fontWeight: 700, flexShrink: 0, width: 20, textAlign: 'right' }}>{i + 1}.</span>
              <input value={q.label} onChange={e => updateQuestion(briefing.id, q.id, { label: e.target.value })}
                style={{ flex: 1, padding: '7px 10px', borderRadius: 7, background: 'var(--s1)', border: '1px solid var(--b2)', color: 'var(--t1)', fontSize: 12, outline: 'none', minWidth: 0 }}
              />
              <select value={q.type} onChange={e => updateQuestion(briefing.id, q.id, { type: e.target.value as BriefingQuestion['type'] })}
                style={{ padding: '7px 8px', borderRadius: 7, background: 'var(--s1)', border: '1px solid var(--b2)', color: 'var(--t1)', fontSize: 11, flexShrink: 0 }}
              >
                <option value="text">Texto</option>
                <option value="long">Longo</option>
                <option value="number">Número</option>
                <option value="select">Seleção</option>
              </select>
              <button onClick={() => removeQuestion(briefing.id, q.id)}
                style={{ width: 28, height: 28, borderRadius: 6, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--t4)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = '#ff453a'; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = 'var(--t4)'; }}
              ><FiTrash2 size={12} /></button>
            </div>
          ))}
          {/* Nova pergunta */}
          <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
            <input value={newQ} onChange={e => setNewQ(e.target.value)} placeholder="Nova pergunta..."
              onKeyDown={e => e.key === 'Enter' && handleAddQ()}
              style={{ flex: 1, padding: '7px 10px', borderRadius: 7, background: 'var(--s1)', border: `1px dashed var(--b2)`, color: 'var(--t1)', fontSize: 12, outline: 'none' }}
            />
            <button onClick={handleAddQ}
              style={{ padding: '7px 14px', borderRadius: 7, background: accentColor, border: 'none', color: '#fff', cursor: 'pointer', fontSize: 12, fontWeight: 600 }}
            >+ Adicionar</button>
          </div>
        </div>

        <button onClick={onClose}
          style={{ padding: '10px', borderRadius: 10, background: 'var(--s1)', border: '1px solid var(--b2)', cursor: 'pointer', color: 'var(--t2)', fontSize: 13, fontWeight: 600 }}
        >Fechar</button>
      </div>
    </div>
  );
}

// ─── Vista pública do briefing para o cliente ──────────────────────────────
export function PublicBriefingView({ token, onBack }: { token: string; onBack: () => void }) {
  const { briefings, markResponded, updateQuestion } = useBriefingsStore();
  const briefing = briefings.find(b => b.shareToken === token && !b.deletedAt);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState(false);

  const dark: React.CSSProperties = { minHeight: '100vh', background: '#080810', color: '#fff', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 14, padding: 24 };

  if (!briefing) return (
    <div style={dark}>
      <div style={{ fontSize: 48 }}>🔍</div>
      <div style={{ fontSize: 20, fontWeight: 700 }}>Briefing não encontrado</div>
      <div style={{ fontSize: 13, color: '#888', textAlign: 'center', maxWidth: 340 }}>Este link pode ter expirado ou o formulário foi removido.</div>
      <button onClick={onBack} style={{ marginTop: 8, padding: '10px 22px', borderRadius: 10, background: '#356BFF', border: 'none', color: '#fff', cursor: 'pointer', fontWeight: 600 }}>← Voltar</button>
    </div>
  );

  if (submitted || briefing.status === 'respondido') return (
    <div style={dark}>
      <div style={{ fontSize: 60 }}>✅</div>
      <div style={{ fontSize: 22, fontWeight: 700 }}>Briefing enviado!</div>
      <div style={{ fontSize: 14, color: '#aaa', textAlign: 'center', maxWidth: 400 }}>Obrigado! Suas respostas foram recebidas. Em breve entraremos em contato.</div>
    </div>
  );

  const handleSubmit = () => {
    briefing.questions.forEach(q => {
      if (answers[q.id] !== undefined) updateQuestion(briefing.id, q.id, { answer: answers[q.id] });
    });
    markResponded(briefing.id);
    setSubmitted(true);
  };

  const required = briefing.questions.filter(q => q.required);
  const allRequired = required.every(q => (answers[q.id] ?? q.answer as string ?? '').trim());

  return (
    <div style={{ minHeight: '100vh', background: '#080810', color: '#fff' }}>
      <div style={{ maxWidth: 680, margin: '0 auto', padding: '36px 20px 80px' }}>
        <div style={{ marginBottom: 32 }}>
          <div style={{ fontSize: 10, color: '#555', textTransform: 'uppercase', letterSpacing: '2.5px', marginBottom: 10 }}>Briefing</div>
          <div style={{ fontSize: 28, fontWeight: 700, marginBottom: 6 }}>{briefing.title}</div>
          {required.length > 0 && <div style={{ fontSize: 12, color: '#666' }}>{required.length} campo{required.length > 1 ? 's' : ''} obrigatório{required.length > 1 ? 's' : ''}</div>}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
          {briefing.questions.map((q, i) => (
            <div key={q.id}>
              <label style={{ display: 'block', fontSize: 14, fontWeight: 600, color: '#ddd', marginBottom: 8 }}>
                {i + 1}. {q.label}{q.required && <span style={{ color: '#ff453a', marginLeft: 4 }}>*</span>}
              </label>
              {q.type === 'long' ? (
                <textarea value={answers[q.id] ?? (q.answer as string) ?? ''} onChange={e => setAnswers(p => ({ ...p, [q.id]: e.target.value }))}
                  placeholder="Sua resposta..." rows={4}
                  style={{ width: '100%', boxSizing: 'border-box', padding: '10px 14px', borderRadius: 10, background: '#111', border: '1px solid #2a2a3e', color: '#fff', fontSize: 13, resize: 'vertical', outline: 'none', fontFamily: 'inherit' }}
                />
              ) : (
                <input type={q.type === 'number' ? 'number' : 'text'}
                  value={answers[q.id] ?? (q.answer as string) ?? ''} onChange={e => setAnswers(p => ({ ...p, [q.id]: e.target.value }))}
                  placeholder="Sua resposta..."
                  style={{ width: '100%', boxSizing: 'border-box', padding: '10px 14px', borderRadius: 10, background: '#111', border: '1px solid #2a2a3e', color: '#fff', fontSize: 13, outline: 'none' }}
                />
              )}
            </div>
          ))}
        </div>

        <button onClick={handleSubmit} disabled={!allRequired}
          style={{ marginTop: 36, width: '100%', padding: '15px', borderRadius: 12, background: allRequired ? 'rgba(48,209,88,0.14)' : 'rgba(255,255,255,0.04)', border: `1px solid ${allRequired ? 'rgba(48,209,88,0.4)' : '#2a2a3e'}`, color: allRequired ? '#30d158' : '#555', fontSize: 15, fontWeight: 700, cursor: allRequired ? 'pointer' : 'not-allowed', transition: 'all .15s' }}
        >Enviar briefing ✓</button>
      </div>
    </div>
  );
}
