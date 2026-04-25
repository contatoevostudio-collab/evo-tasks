import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiX, FiTrash2, FiUpload, FiCheck } from 'react-icons/fi';
import { useWorkspacesStore, WORKSPACE_PALETTES, defaultSettingsFor } from '../store/workspaces';
import type { WorkspaceType } from '../types';

interface Props {
  workspaceId?: string; // se passado, edita; senão, cria novo
  onClose: () => void;
}

const TYPE_OPTIONS: { id: WorkspaceType; label: string; description: string }[] = [
  { id: 'freelance', label: 'Freelance Designer', description: 'Trabalho pra agências e/ou clientes diretos' },
  { id: 'agencia',   label: 'Agência',            description: 'Você É a agência — clientes, calendário editorial, faturas' },
  { id: 'pessoal',   label: 'Pessoal',            description: 'Side projects, vida fora do trabalho' },
  { id: 'blank',     label: 'Em branco',          description: 'Configura tudo manualmente' },
];

export function WorkspaceModal({ workspaceId, onClose }: Props) {
  const { workspaces, addWorkspace, updateWorkspace, deleteWorkspace, setActiveWorkspace } = useWorkspacesStore();
  const editing = workspaceId ? workspaces.find(w => w.id === workspaceId) : undefined;

  const [name,      setName]      = useState(editing?.name ?? '');
  const [type,      setType]      = useState<WorkspaceType>(editing?.type ?? 'freelance');
  const [paletteId, setPaletteId] = useState(editing?.paletteId ?? 'ocean');
  const [photoUrl,  setPhotoUrl]  = useState(editing?.photoUrl ?? '');
  const [confirmDelete, setConfirmDelete] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const canDelete = !!editing && workspaces.length > 1;
  const canSave = name.trim().length > 0;

  const handleSave = () => {
    if (!canSave) return;
    if (editing) {
      updateWorkspace(editing.id, {
        name: name.trim(),
        type,
        paletteId,
        photoUrl: photoUrl || undefined,
      });
    } else {
      const id = addWorkspace({
        name: name.trim(),
        type,
        paletteId,
        photoUrl: photoUrl || undefined,
        settings: defaultSettingsFor(type),
      });
      setActiveWorkspace(id);
    }
    onClose();
  };

  const handleDelete = () => {
    if (!editing || !canDelete) return;
    deleteWorkspace(editing.id);
    onClose();
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') setPhotoUrl(reader.result);
    };
    reader.readAsDataURL(file);
  };

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-50 flex items-center justify-center"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      >
        <motion.div className="absolute inset-0 bg-black/60 glass-backdrop" onClick={onClose} />

        <motion.div
          className="relative z-10 w-full max-w-md mx-4 rounded-[20px] overflow-hidden shadow-2xl glass-panel"
          style={{ background: 'var(--modal-bg)' }}
          initial={{ scale: 0.92, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.92, opacity: 0, y: 20 }}
          transition={{ type: 'spring', damping: 26, stiffness: 320 }}
        >
          <div style={{ padding: '20px 24px 22px', display: 'flex', flexDirection: 'column', gap: 18, maxHeight: '90vh', overflowY: 'auto' }}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase', color: 'var(--t3)', marginBottom: 4 }}>
                  Workspace
                </div>
                <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--t1)' }}>
                  {editing ? 'Editar workspace' : 'Novo workspace'}
                </div>
              </div>
              <button
                onClick={onClose}
                style={{ background: 'var(--s1)', border: 'none', cursor: 'pointer', color: 'var(--t3)', padding: 8, borderRadius: 8 }}
              ><FiX size={15} /></button>
            </div>

            {/* Foto + nome */}
            <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
              <button
                onClick={() => fileInputRef.current?.click()}
                title="Adicionar foto (opcional)"
                style={{
                  width: 56, height: 56, borderRadius: '50%', flexShrink: 0,
                  background: photoUrl ? 'transparent' : `linear-gradient(135deg, ${WORKSPACE_PALETTES.find(p => p.id === paletteId)!.primary}, ${WORKSPACE_PALETTES.find(p => p.id === paletteId)!.secondary})`,
                  border: photoUrl ? '1px solid var(--b2)' : 'none', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: '#fff', fontSize: 22, fontWeight: 700, position: 'relative', overflow: 'hidden',
                }}
              >
                {photoUrl
                  ? <img src={photoUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  : (name.trim().slice(0, 1).toUpperCase() || <FiUpload size={20} style={{ opacity: 0.85 }} />)
                }
              </button>
              <input ref={fileInputRef} type="file" accept="image/*" onChange={handlePhotoUpload} style={{ display: 'none' }} />
              <div style={{ flex: 1 }}>
                <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '1.5px', textTransform: 'uppercase', color: 'var(--t3)', marginBottom: 5, display: 'block' }}>Nome</span>
                <input
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="Ex: Pessoal, Minha Agência..."
                  autoFocus
                  style={{
                    width: '100%', boxSizing: 'border-box',
                    padding: '8px 12px', borderRadius: 8,
                    background: 'var(--ib)', border: '1px solid var(--b2)',
                    color: 'var(--t1)', fontSize: 13, outline: 'none',
                  }}
                />
                {photoUrl && (
                  <button
                    onClick={() => setPhotoUrl('')}
                    style={{ marginTop: 4, fontSize: 10, color: 'var(--t4)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                  >Remover foto</button>
                )}
              </div>
            </div>

            {/* Tipo */}
            <div>
              <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '1.5px', textTransform: 'uppercase', color: 'var(--t3)', marginBottom: 8, display: 'block' }}>Tipo</span>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {TYPE_OPTIONS.map(opt => {
                  const active = type === opt.id;
                  return (
                    <button
                      key={opt.id}
                      onClick={() => setType(opt.id)}
                      style={{
                        display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 2,
                        padding: '8px 12px', borderRadius: 9, textAlign: 'left',
                        background: active ? 'rgba(53,107,255,0.10)' : 'var(--s1)',
                        border: `1px solid ${active ? 'rgba(53,107,255,0.32)' : 'var(--b2)'}`,
                        cursor: 'pointer', transition: 'all .12s',
                      }}
                    >
                      <span style={{ fontSize: 12, fontWeight: 600, color: active ? '#356BFF' : 'var(--t1)' }}>{opt.label}</span>
                      <span style={{ fontSize: 10, color: 'var(--t4)' }}>{opt.description}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Paleta */}
            <div>
              <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '1.5px', textTransform: 'uppercase', color: 'var(--t3)', marginBottom: 8, display: 'block' }}>Cor</span>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {WORKSPACE_PALETTES.map(p => {
                  const active = paletteId === p.id;
                  return (
                    <button
                      key={p.id}
                      onClick={() => setPaletteId(p.id)}
                      title={p.name}
                      style={{
                        width: 32, height: 32, borderRadius: '50%',
                        background: `linear-gradient(135deg, ${p.primary}, ${p.secondary})`,
                        border: active ? `2px solid var(--t1)` : '2px solid transparent',
                        cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        transform: active ? 'scale(1.05)' : 'scale(1)',
                        transition: 'all .12s',
                        boxShadow: active ? `0 0 0 2px var(--modal-bg), 0 4px 14px ${p.primary}50` : `0 2px 8px ${p.primary}40`,
                      }}
                    >
                      {active && <FiCheck size={13} style={{ color: '#fff' }} />}
                    </button>
                  );
                })}
              </div>
              <span style={{ fontSize: 10, color: 'var(--t4)', marginTop: 6, display: 'block' }}>
                {WORKSPACE_PALETTES.find(p => p.id === paletteId)?.name}
              </span>
            </div>

            {/* Footer */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, paddingTop: 6, borderTop: '1px solid var(--b1)' }}>
              {editing && canDelete && (
                confirmDelete ? (
                  <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                    <span style={{ fontSize: 11, color: 'var(--t3)' }}>Deletar?</span>
                    <button onClick={handleDelete} style={{ padding: '5px 12px', borderRadius: 7, background: '#ff453a22', border: '1px solid #ff453a66', color: '#ff453a', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>Sim</button>
                    <button onClick={() => setConfirmDelete(false)} style={{ padding: '5px 12px', borderRadius: 7, background: 'var(--s1)', border: '1px solid var(--b2)', color: 'var(--t3)', fontSize: 11, cursor: 'pointer' }}>Não</button>
                  </div>
                ) : (
                  <button
                    onClick={() => setConfirmDelete(true)}
                    style={{ display: 'flex', alignItems: 'center', gap: 5, background: 'transparent', border: 'none', cursor: 'pointer', color: 'rgba(255,69,58,0.7)', fontSize: 12 }}
                  ><FiTrash2 size={11} /> Deletar</button>
                )
              )}
              <div style={{ flex: 1 }} />
              <button
                onClick={onClose}
                style={{ padding: '8px 16px', borderRadius: 9, fontSize: 12, fontWeight: 500, background: 'var(--s1)', border: '1px solid var(--b2)', color: 'var(--t3)', cursor: 'pointer' }}
              >Cancelar</button>
              <button
                onClick={handleSave}
                disabled={!canSave}
                style={{
                  padding: '8px 18px', borderRadius: 9, fontSize: 12, fontWeight: 600,
                  background: canSave ? '#356BFF' : 'var(--s2)',
                  border: 'none', color: canSave ? '#fff' : 'var(--t4)',
                  cursor: canSave ? 'pointer' : 'not-allowed', opacity: canSave ? 1 : 0.5,
                }}
              >{editing ? 'Salvar' : 'Criar'}</button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
