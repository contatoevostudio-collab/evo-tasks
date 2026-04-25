import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  FiPlus, FiSearch, FiX, FiTrash2, FiCopy, FiCheck, FiSend, FiUpload, FiImage,
  FiMessageCircle, FiArrowLeft, FiExternalLink, FiArchive,
} from 'react-icons/fi';
import { useTaskStore } from '../store/tasks';
import { useContentApprovalsStore, APPROVAL_STATUS_CONFIG, CONTENT_TYPE_LABELS } from '../store/contentApprovals';
import { useVisibleWorkspaceIds, isInLens, useWorkspacesStore } from '../store/workspaces';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/auth';
import type { ContentApproval, ContentType, ApprovalStatus, ContentAsset } from '../types';

const TYPE_OPTIONS: ContentType[] = ['card', 'carrossel', 'reels', 'story', 'video', 'apresentacao', 'moodboard', 'site', 'identidade', 'outro'];

export function AprovacoesPage() {
  const { companies } = useTaskStore();
  const visibleIds = useVisibleWorkspaceIds();
  const activeWorkspaceId = useWorkspacesStore(s => s.activeWorkspaceId);
  const { approvals, addApproval, deleteApproval } = useContentApprovalsStore();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<ApprovalStatus | 'todos'>('todos');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showNew, setShowNew] = useState(false);
  const [showArchived, setShowArchived] = useState(false);

  const filtered = useMemo(() => {
    return approvals
      .filter(a => isInLens(a, visibleIds))
      .filter(a => showArchived ? !!a.deletedAt : !a.deletedAt)
      .filter(a => statusFilter === 'todos' || a.status === statusFilter)
      .filter(a => {
        const q = search.trim().toLowerCase();
        if (!q) return true;
        return a.title.toLowerCase().includes(q);
      })
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }, [approvals, visibleIds, showArchived, statusFilter, search]);

  const stats = useMemo(() => {
    const inLens = approvals.filter(a => isInLens(a, visibleIds) && !a.deletedAt);
    return {
      total: inLens.length,
      enviados: inLens.filter(a => a.status === 'enviado' || a.status === 'visualizado').length,
      pendentes: inLens.filter(a => a.status === 'alteracao').length,
      aprovados: inLens.filter(a => a.status === 'aprovado' || a.status === 'postado').length,
    };
  }, [approvals, visibleIds]);

  const editing = editingId ? approvals.find(a => a.id === editingId) : null;

  const handleNew = () => {
    if (companies.filter(c => !c.deletedAt).length === 0) {
      alert('Crie uma empresa primeiro');
      return;
    }
    setShowNew(true);
  };

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* Header */}
      <div style={{ padding: '14px 20px', flexShrink: 0, borderBottom: '1px solid var(--b2)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
        <div>
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase', color: 'var(--t4)', marginBottom: 2 }}>Agência</div>
          <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--t1)', letterSpacing: '-0.4px' }}>Aprovações</div>
        </div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
          {[
            { label: 'Total', value: stats.total, color: '#64C4FF', rgb: '100,196,255' },
            { label: 'Enviados', value: stats.enviados, color: '#356BFF', rgb: '53,107,255' },
            { label: 'Alteração', value: stats.pendentes, color: '#ff9f0a', rgb: '255,159,10' },
            { label: 'Aprovados', value: stats.aprovados, color: '#30d158', rgb: '48,209,88' },
          ].map(k => (
            <div key={k.label} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 10px', borderRadius: 8, background: `rgba(${k.rgb},0.08)`, border: `1px solid rgba(${k.rgb},0.2)` }}>
              <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.8px', textTransform: 'uppercase', color: `rgba(${k.rgb},0.6)` }}>{k.label}</span>
              <span style={{ fontSize: 13, fontWeight: 700, color: k.color }}>{k.value}</span>
            </div>
          ))}

          <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'var(--s1)', border: '1px solid var(--b2)', borderRadius: 9, padding: '6px 10px' }}>
            <FiSearch size={12} style={{ color: 'var(--t4)' }} />
            <input
              placeholder="Buscar..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ background: 'none', border: 'none', outline: 'none', color: 'var(--t1)', fontSize: 12, width: 130 }}
            />
            {search && (
              <button onClick={() => setSearch('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--t4)', display: 'flex', padding: 0 }}>
                <FiX size={11} />
              </button>
            )}
          </div>

          <button
            onClick={handleNew}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 9, background: '#356BFF', border: 'none', color: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}
          >
            <FiPlus size={12} /> Nova aprovação
          </button>
        </div>
      </div>

      {/* Status filter chips */}
      <div style={{ padding: '10px 20px', flexShrink: 0, borderBottom: '1px solid var(--b1)', display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
        {(['todos', 'rascunho', 'enviado', 'visualizado', 'alteracao', 'aprovado', 'postado'] as const).map(opt => {
          const active = statusFilter === opt;
          const cfg = opt !== 'todos' ? APPROVAL_STATUS_CONFIG[opt] : { label: 'Todos', color: 'var(--t2)', rgb: '255,255,255' };
          return (
            <button key={opt}
              onClick={() => setStatusFilter(opt)}
              style={{
                padding: '4px 10px', borderRadius: 999, fontSize: 11, fontWeight: 500,
                background: active ? `rgba(${cfg.rgb || '255,255,255'},0.14)` : 'transparent',
                border: `1px solid ${active ? cfg.color : 'var(--b2)'}`,
                color: active ? cfg.color : 'var(--t3)', cursor: 'pointer', transition: 'all .12s',
              }}
            >{cfg.label}</button>
          );
        })}
        <div style={{ flex: 1 }} />
        <button
          onClick={() => setShowArchived(s => !s)}
          style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '4px 10px', borderRadius: 8, background: 'transparent', border: '1px solid var(--b2)', color: 'var(--t3)', fontSize: 11, cursor: 'pointer' }}
        >
          <FiArchive size={11} /> {showArchived ? 'Voltar ativos' : 'Lixeira'}
        </button>
      </div>

      {/* List */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px 20px' }}>
        {filtered.length === 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 14, color: 'var(--t4)', padding: 40, minHeight: 280 }}>
            <div style={{ fontSize: 56, opacity: 0.4 }}>📋</div>
            <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--t2)' }}>Nenhuma aprovação</div>
            <div style={{ fontSize: 12, color: 'var(--t4)', textAlign: 'center', maxWidth: 360, lineHeight: 1.5 }}>
              Crie um item, faça upload de assets e gere link público pra cliente revisar.
            </div>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 }}>
            <AnimatePresence>
              {filtered.map(a => (
                <ApprovalCard key={a.id}
                  approval={a}
                  companyName={companies.find(c => c.id === a.clientId)?.name ?? '?'}
                  onClick={() => setEditingId(a.id)}
                  onDelete={() => deleteApproval(a.id)}
                />
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* New modal */}
      <AnimatePresence>
        {showNew && (
          <NewApprovalModal
            onClose={() => setShowNew(false)}
            onCreated={(id) => { setShowNew(false); setEditingId(id); }}
            workspaceId={activeWorkspaceId ?? undefined}
            companies={companies.filter(c => !c.deletedAt)}
            addApproval={addApproval}
          />
        )}
      </AnimatePresence>

      {/* Editor modal */}
      <AnimatePresence>
        {editing && (
          <ApprovalEditor key={editing.id} approval={editing} onClose={() => setEditingId(null)} />
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Card ──────────────────────────────────────────────────────────────────
function ApprovalCard({ approval, companyName, onClick, onDelete }: {
  approval: ContentApproval; companyName: string; onClick: () => void; onDelete: () => void;
}) {
  const cfg = APPROVAL_STATUS_CONFIG[approval.status];
  const cover = approval.assets[0]?.url;
  const commentsCount = approval.assets.reduce((sum, a) => sum + (a.comments?.length ?? 0), 0);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
      onClick={onClick}
      style={{
        background: 'var(--s1)', border: '1px solid var(--b2)', borderRadius: 14, overflow: 'hidden',
        cursor: 'pointer', transition: 'transform .12s, border-color .12s',
        display: 'flex', flexDirection: 'column',
      }}
      whileHover={{ y: -2 }}
    >
      <div style={{ height: 120, background: cover ? `url(${cover}) center/cover` : 'var(--ib)', borderBottom: '1px solid var(--b1)', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {!cover && <FiImage size={28} style={{ color: 'var(--t4)' }} />}
        <span style={{ position: 'absolute', top: 8, right: 8, padding: '3px 8px', borderRadius: 999, fontSize: 9, fontWeight: 700, letterSpacing: '0.5px', textTransform: 'uppercase', background: `${cfg.color}22`, color: cfg.color, border: `1px solid ${cfg.color}40`, backdropFilter: 'blur(8px)' }}>
          {cfg.label}
        </span>
      </div>
      <div style={{ padding: '10px 12px 12px', display: 'flex', flexDirection: 'column', gap: 6, flex: 1 }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--t1)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{approval.title}</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 10, color: 'var(--t4)' }}>
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{companyName}</span>
          <span>·</span>
          <span>{CONTENT_TYPE_LABELS[approval.type]}</span>
          {commentsCount > 0 && (
            <>
              <span>·</span>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                <FiMessageCircle size={9} /> {commentsCount}
              </span>
            </>
          )}
        </div>
        <div style={{ flex: 1 }} />
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 9, color: 'var(--t4)' }}>{format(parseISO(approval.createdAt), "d MMM", { locale: ptBR })}</span>
          <button
            onClick={(e) => { e.stopPropagation(); if (confirm('Mover pra lixeira?')) onDelete(); }}
            style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--t4)', padding: 4, borderRadius: 6, display: 'flex' }}
          ><FiTrash2 size={11} /></button>
        </div>
      </div>
    </motion.div>
  );
}

// ─── New modal ─────────────────────────────────────────────────────────────
function NewApprovalModal({ onClose, onCreated, workspaceId, companies, addApproval }: {
  onClose: () => void;
  onCreated: (id: string) => void;
  workspaceId?: string;
  companies: { id: string; name: string }[];
  addApproval: (p: Omit<ContentApproval, 'id' | 'createdAt' | 'shareToken'>) => string;
}) {
  const [title, setTitle] = useState('');
  const [clientId, setClientId] = useState(companies[0]?.id ?? '');
  const [type, setType] = useState<ContentType>('carrossel');

  const submit = () => {
    if (!title.trim() || !clientId) return;
    const id = addApproval({
      workspaceId,
      clientId,
      title: title.trim(),
      type,
      assets: [],
      status: 'rascunho',
    });
    onCreated(id);
  };

  return (
    <motion.div className="fixed inset-0 z-50 flex items-center justify-center"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <motion.div className="absolute inset-0 bg-black/60 glass-backdrop" onClick={onClose} />
      <motion.div
        className="relative z-10 w-full max-w-md mx-4 rounded-[20px] glass-panel"
        style={{ background: 'var(--modal-bg)' }}
        initial={{ scale: 0.92, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.92, opacity: 0, y: 20 }}
      >
        <div style={{ padding: 22, display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--t1)' }}>Nova aprovação</div>

          <div>
            <label style={{ fontSize: 10, fontWeight: 700, letterSpacing: '1.5px', textTransform: 'uppercase', color: 'var(--t3)', marginBottom: 6, display: 'block' }}>Título</label>
            <input autoFocus value={title} onChange={e => setTitle(e.target.value)}
              placeholder="Ex: Carrossel Black Friday"
              style={{ width: '100%', boxSizing: 'border-box', padding: '8px 12px', borderRadius: 8, background: 'var(--ib)', border: '1px solid var(--b2)', color: 'var(--t1)', fontSize: 13, outline: 'none' }}
            />
          </div>

          <div>
            <label style={{ fontSize: 10, fontWeight: 700, letterSpacing: '1.5px', textTransform: 'uppercase', color: 'var(--t3)', marginBottom: 6, display: 'block' }}>Cliente</label>
            <select value={clientId} onChange={e => setClientId(e.target.value)}
              style={{ width: '100%', padding: '8px 10px', borderRadius: 8, background: 'var(--ib)', border: '1px solid var(--b2)', color: 'var(--t1)', fontSize: 13 }}
            >
              {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>

          <div>
            <label style={{ fontSize: 10, fontWeight: 700, letterSpacing: '1.5px', textTransform: 'uppercase', color: 'var(--t3)', marginBottom: 6, display: 'block' }}>Tipo de conteúdo</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
              {TYPE_OPTIONS.map(t => (
                <button key={t} onClick={() => setType(t)}
                  style={{
                    padding: '5px 11px', borderRadius: 999, fontSize: 11, fontWeight: 500,
                    background: type === t ? 'rgba(53,107,255,0.16)' : 'var(--s1)',
                    border: `1px solid ${type === t ? 'rgba(53,107,255,0.4)' : 'var(--b2)'}`,
                    color: type === t ? '#356BFF' : 'var(--t3)', cursor: 'pointer',
                  }}
                >{CONTENT_TYPE_LABELS[t]}</button>
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button onClick={onClose} style={{ padding: '8px 16px', borderRadius: 9, background: 'var(--s1)', border: '1px solid var(--b2)', color: 'var(--t3)', fontSize: 12, cursor: 'pointer' }}>Cancelar</button>
            <button onClick={submit} disabled={!title.trim() || !clientId}
              style={{ padding: '8px 18px', borderRadius: 9, background: title.trim() ? '#356BFF' : 'var(--s2)', border: 'none', color: title.trim() ? '#fff' : 'var(--t4)', fontSize: 12, fontWeight: 600, cursor: title.trim() ? 'pointer' : 'not-allowed' }}
            >Criar</button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ─── Editor ────────────────────────────────────────────────────────────────
function ApprovalEditor({ approval, onClose }: { approval: ContentApproval; onClose: () => void }) {
  const { user } = useAuthStore();
  const { updateApproval, addAsset, removeAsset, addComment, resolveComment, markSent, deleteApproval } = useContentApprovalsStore();
  const { companies } = useTaskStore();
  const company = companies.find(c => c.id === approval.clientId);
  const [activeAssetIdx, setActiveAssetIdx] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [copied, setCopied] = useState(false);

  const cfg = APPROVAL_STATUS_CONFIG[approval.status];
  const shareUrl = `${window.location.origin}${window.location.pathname}#aprovar=${approval.shareToken}`;

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0 || !user) return;
    setUploading(true);
    try {
      for (const file of Array.from(files)) {
        if (file.size > 5 * 1024 * 1024) {
          alert(`${file.name}: muito grande (max 5MB)`);
          continue;
        }
        const ext = (file.name.split('.').pop() ?? 'jpg').toLowerCase();
        const path = `${user.id}/${approval.id}/${Math.random().toString(36).slice(2, 10)}.${ext}`;
        const { error } = await supabase.storage.from('content-assets').upload(path, file, { cacheControl: '3600' });
        if (error) { console.error('upload err:', error); alert('Falha no upload'); continue; }
        const { data: { publicUrl } } = supabase.storage.from('content-assets').getPublicUrl(path);
        addAsset(approval.id, { url: publicUrl });
      }
    } finally {
      setUploading(false);
    }
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(shareUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const handleSend = () => {
    markSent(approval.id);
    handleCopyLink();
  };

  return (
    <motion.div className="fixed inset-0 z-50 flex items-center justify-center"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <motion.div className="absolute inset-0 bg-black/70 glass-backdrop" onClick={onClose} />
      <motion.div
        className="relative z-10 w-full max-w-4xl mx-4 rounded-[20px] glass-panel"
        style={{ background: 'var(--modal-bg)', maxHeight: '92vh', display: 'flex', flexDirection: 'column' }}
        initial={{ scale: 0.92, opacity: 0, y: 20 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ scale: 0.92, opacity: 0, y: 20 }}
      >
        {/* Header */}
        <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--b2)', display: 'flex', alignItems: 'center', gap: 12 }}>
          <button onClick={onClose} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--t3)', display: 'flex' }}>
            <FiArrowLeft size={16} />
          </button>
          <div style={{ flex: 1, minWidth: 0 }}>
            <input value={approval.title} onChange={e => updateApproval(approval.id, { title: e.target.value })}
              style={{ width: '100%', background: 'transparent', border: 'none', color: 'var(--t1)', fontSize: 16, fontWeight: 700, outline: 'none' }}
            />
            <div style={{ fontSize: 11, color: 'var(--t4)', display: 'flex', gap: 6, alignItems: 'center' }}>
              <span>{company?.name ?? '?'}</span>
              <span>·</span>
              <span>{CONTENT_TYPE_LABELS[approval.type]}</span>
              <span>·</span>
              <span style={{ padding: '1px 7px', borderRadius: 999, background: `${cfg.color}22`, color: cfg.color, fontWeight: 600 }}>{cfg.label}</span>
            </div>
          </div>
          <button onClick={handleCopyLink} title="Copiar link público"
            style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '7px 12px', borderRadius: 9, background: 'transparent', border: '1px solid var(--b2)', color: 'var(--t2)', fontSize: 11, cursor: 'pointer' }}>
            {copied ? <FiCheck size={11} style={{ color: '#30d158' }} /> : <FiCopy size={11} />}
            {copied ? 'Copiado!' : 'Copiar link'}
          </button>
          {approval.status === 'rascunho' && (
            <button onClick={handleSend}
              style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '7px 14px', borderRadius: 9, background: '#356BFF', border: 'none', color: '#fff', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>
              <FiSend size={11} /> Enviar pro cliente
            </button>
          )}
          <button onClick={() => { if (confirm('Mover pra lixeira?')) { deleteApproval(approval.id); onClose(); } }}
            style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--t4)', padding: 6, borderRadius: 7, display: 'flex' }}>
            <FiTrash2 size={13} />
          </button>
        </div>

        {/* Body */}
        <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
          {/* Asset preview */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', borderRight: '1px solid var(--b1)' }}>
            <div style={{ flex: 1, overflow: 'auto', padding: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 0 }}>
              {approval.assets[activeAssetIdx]
                ? <AssetView asset={approval.assets[activeAssetIdx]}
                    onAddComment={(area) => {
                      const text = prompt('Comentário:');
                      if (text && text.trim()) {
                        addComment(approval.id, approval.assets[activeAssetIdx].id, { area, text: text.trim(), fromClient: false });
                      }
                    }}
                    onResolve={(commentId) => resolveComment(approval.id, approval.assets[activeAssetIdx].id, commentId)}
                  />
                : (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14, color: 'var(--t4)' }}>
                    <FiImage size={56} style={{ opacity: 0.3 }} />
                    <div style={{ fontSize: 13, color: 'var(--t3)' }}>Nenhum asset ainda</div>
                  </div>
                )
              }
            </div>

            {/* Asset thumbs */}
            <div style={{ flexShrink: 0, padding: '10px 16px', borderTop: '1px solid var(--b1)', display: 'flex', gap: 8, overflowX: 'auto', alignItems: 'center' }}>
              {approval.assets.map((a, idx) => (
                <button key={a.id} onClick={() => setActiveAssetIdx(idx)}
                  style={{
                    flexShrink: 0, width: 56, height: 56, borderRadius: 8,
                    background: `url(${a.url}) center/cover`,
                    border: idx === activeAssetIdx ? '2px solid #356BFF' : '2px solid transparent',
                    cursor: 'pointer', position: 'relative',
                  }}
                >
                  {(a.comments?.length ?? 0) > 0 && (
                    <span style={{ position: 'absolute', top: -3, right: -3, width: 14, height: 14, borderRadius: '50%', background: '#ff9f0a', color: '#fff', fontSize: 8, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {a.comments?.length}
                    </span>
                  )}
                </button>
              ))}
              <label style={{ flexShrink: 0, width: 56, height: 56, borderRadius: 8, border: '2px dashed var(--b2)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: uploading ? 'wait' : 'pointer', color: 'var(--t3)' }}>
                {uploading
                  ? <div style={{ width: 14, height: 14, border: '2px solid var(--b2)', borderTopColor: 'var(--t2)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                  : <FiUpload size={16} />}
                <input type="file" accept="image/*,video/*" multiple onChange={handleUpload} style={{ display: 'none' }} disabled={uploading} />
              </label>
              {approval.assets[activeAssetIdx] && (
                <button onClick={() => { if (confirm('Remover asset?')) { removeAsset(approval.id, approval.assets[activeAssetIdx].id); setActiveAssetIdx(0); } }}
                  style={{ marginLeft: 'auto', flexShrink: 0, padding: 8, borderRadius: 7, background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--t4)' }}>
                  <FiTrash2 size={13} />
                </button>
              )}
            </div>
          </div>

          {/* Comments + info side */}
          <div style={{ width: 280, flexShrink: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <div style={{ flexShrink: 0, padding: '12px 16px', borderBottom: '1px solid var(--b1)' }}>
              <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '1.5px', textTransform: 'uppercase', color: 'var(--t3)', marginBottom: 6 }}>Link público</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <input readOnly value={shareUrl}
                  style={{ flex: 1, padding: '6px 8px', borderRadius: 7, background: 'var(--ib)', border: '1px solid var(--b2)', color: 'var(--t2)', fontSize: 10, fontFamily: 'monospace', outline: 'none' }}
                />
                <a href={shareUrl} target="_blank" rel="noreferrer"
                  style={{ padding: 6, borderRadius: 7, background: 'transparent', border: '1px solid var(--b2)', color: 'var(--t3)', display: 'flex' }}>
                  <FiExternalLink size={11} />
                </a>
              </div>
              {approval.feedback && (
                <div style={{ marginTop: 10, padding: '8px 10px', background: 'rgba(255,159,10,0.08)', border: '1px solid rgba(255,159,10,0.25)', borderRadius: 8 }}>
                  <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase', color: '#ff9f0a', marginBottom: 4 }}>Feedback do cliente</div>
                  <div style={{ fontSize: 11, color: 'var(--t1)' }}>{approval.feedback}</div>
                </div>
              )}
            </div>

            <div style={{ flex: 1, overflowY: 'auto', padding: '12px 16px' }}>
              <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '1.5px', textTransform: 'uppercase', color: 'var(--t3)', marginBottom: 8 }}>Comentários do asset atual</div>
              {(approval.assets[activeAssetIdx]?.comments?.length ?? 0) === 0
                ? <div style={{ fontSize: 11, color: 'var(--t4)', fontStyle: 'italic' }}>Nenhum comentário. Clica na imagem pra adicionar.</div>
                : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {approval.assets[activeAssetIdx]?.comments?.map(c => (
                      <div key={c.id} style={{
                        padding: '8px 10px', borderRadius: 8,
                        background: c.fromClient ? 'rgba(255,159,10,0.08)' : 'var(--s1)',
                        border: `1px solid ${c.fromClient ? 'rgba(255,159,10,0.25)' : 'var(--b2)'}`,
                        opacity: c.resolved ? 0.55 : 1,
                      }}>
                        <div style={{ fontSize: 10, color: c.fromClient ? '#ff9f0a' : 'var(--t3)', fontWeight: 600, marginBottom: 3 }}>
                          {c.fromClient ? 'Cliente' : 'Você'} · {format(parseISO(c.createdAt), "d MMM HH:mm", { locale: ptBR })}
                        </div>
                        <div style={{ fontSize: 12, color: 'var(--t1)', textDecoration: c.resolved ? 'line-through' : 'none' }}>{c.text}</div>
                        <button onClick={() => resolveComment(approval.id, approval.assets[activeAssetIdx].id, c.id)}
                          style={{ marginTop: 4, fontSize: 10, color: c.resolved ? 'var(--t4)' : '#30d158', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                          {c.resolved ? '✓ Resolvido — desfazer' : 'Marcar resolvido'}
                        </button>
                      </div>
                    ))}
                  </div>
                )}
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ─── Asset view (with click-to-comment) ────────────────────────────────────
function AssetView({ asset, onAddComment, onResolve }: {
  asset: ContentAsset;
  onAddComment: (area: { x: number; y: number }) => void;
  onResolve: (commentId: string) => void;
}) {
  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    onAddComment({ x, y });
  };

  const isVideo = /\.(mp4|webm|mov)(\?|$)/i.test(asset.url);

  return (
    <div style={{ position: 'relative', maxWidth: '100%', maxHeight: '100%' }}>
      {isVideo
        ? <video src={asset.url} controls style={{ maxWidth: '100%', maxHeight: '70vh', borderRadius: 8 }} />
        : (
          <div onClick={handleClick} style={{ cursor: 'crosshair', position: 'relative' }}>
            <img src={asset.url} alt="" style={{ maxWidth: '100%', maxHeight: '70vh', borderRadius: 8, display: 'block' }} />
            {asset.comments?.filter(c => c.area).map((c, i) => (
              <button key={c.id}
                onClick={(e) => { e.stopPropagation(); onResolve(c.id); }}
                title={c.text}
                style={{
                  position: 'absolute', left: `${c.area!.x}%`, top: `${c.area!.y}%`,
                  transform: 'translate(-50%, -50%)',
                  width: 22, height: 22, borderRadius: '50%',
                  background: c.resolved ? '#30d158' : c.fromClient ? '#ff9f0a' : '#356BFF',
                  color: '#fff', fontSize: 10, fontWeight: 700,
                  border: '2px solid #fff', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.4)',
                }}
              >{i + 1}</button>
            ))}
          </div>
        )
      }
    </div>
  );
}
