import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiX, FiDownload, FiUpload, FiAlertTriangle, FiCheck, FiSave, FiUser } from 'react-icons/fi';
import { useTaskStore } from '../store/tasks';

interface Props {
  onClose: () => void;
}

interface BackupShape {
  companies: unknown[];
  subClients: unknown[];
  tasks: unknown[];
  leads: unknown[];
  todoItems?: unknown[];
  quickNotes?: unknown[];
}

interface SavedProfile {
  name: string;
  savedAt: string;
  data: BackupShape;
}

const labelStyle: React.CSSProperties = {
  fontSize: 10, fontWeight: 700, letterSpacing: '1.5px',
  textTransform: 'uppercase', color: 'var(--t4)',
  marginBottom: 8, display: 'block',
};

const MAX_PROFILES = 3;
const PROFILE_PREFIX = 'evo-profile-';

function getStoredProfiles(): SavedProfile[] {
  const profiles: SavedProfile[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key?.startsWith(PROFILE_PREFIX)) {
      try {
        const p = JSON.parse(localStorage.getItem(key)!) as SavedProfile;
        profiles.push(p);
      } catch { /* skip malformed */ }
    }
  }
  return profiles.sort((a, b) => new Date(b.savedAt).getTime() - new Date(a.savedAt).getTime());
}

function validateBackup(obj: unknown): obj is BackupShape {
  if (!obj || typeof obj !== 'object') return false;
  const o = obj as Record<string, unknown>;
  return Array.isArray(o.companies) && Array.isArray(o.subClients) && Array.isArray(o.tasks) && Array.isArray(o.leads);
}

export function BackupModal({ onClose }: Props) {
  const {
    companies, subClients, tasks, leads, todoItems, quickNotes,
    replaceAll, accentColor, showToast,
  } = useTaskStore();

  const [importStatus, setImportStatus] = useState<null | 'confirm' | 'success' | 'error'>(null);
  const [importError, setImportError] = useState('');
  const [pendingData, setPendingData] = useState<BackupShape | null>(null);
  const [profiles, setProfiles] = useState<SavedProfile[]>(() => getStoredProfiles());
  const [profileName, setProfileName] = useState('');
  const [profileSaved, setProfileSaved] = useState(false);
  const [loadConfirm, setLoadConfirm] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  // ── Export ──────────────────────────────────────────────────────────────────
  const handleExport = () => {
    const data = { companies, subClients, tasks, leads, todoItems: todoItems ?? [], quickNotes: quickNotes ?? [] };
    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const date = new Date().toISOString().slice(0, 10);
    const a = document.createElement('a');
    a.href = url;
    a.download = `evo-tasks-backup-${date}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Backup exportado com sucesso!');
  };

  // ── Import ──────────────────────────────────────────────────────────────────
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const parsed = JSON.parse(ev.target?.result as string) as unknown;
        if (!validateBackup(parsed)) {
          setImportStatus('error');
          setImportError('Arquivo inválido — estrutura não reconhecida.');
          return;
        }
        setPendingData(parsed);
        setImportStatus('confirm');
      } catch {
        setImportStatus('error');
        setImportError('Não foi possível ler o arquivo JSON.');
      }
    };
    reader.readAsText(file);
    // Reset so same file can be re-selected
    e.target.value = '';
  };

  const handleImportConfirm = () => {
    if (!pendingData) return;
    replaceAll({
      companies: pendingData.companies as Parameters<typeof replaceAll>[0]['companies'],
      subClients: pendingData.subClients as Parameters<typeof replaceAll>[0]['subClients'],
      tasks: pendingData.tasks as Parameters<typeof replaceAll>[0]['tasks'],
      leads: pendingData.leads as Parameters<typeof replaceAll>[0]['leads'],
      quickNotes: pendingData.quickNotes as Parameters<typeof replaceAll>[0]['quickNotes'],
    });
    setImportStatus('success');
    setPendingData(null);
    showToast('Dados importados com sucesso!');
    setTimeout(() => { setImportStatus(null); }, 2000);
  };

  // ── Profiles ────────────────────────────────────────────────────────────────
  const handleSaveProfile = () => {
    const name = profileName.trim();
    if (!name) return;
    const key = `${PROFILE_PREFIX}${name}`;
    const profile: SavedProfile = {
      name,
      savedAt: new Date().toISOString(),
      data: { companies, subClients, tasks, leads, todoItems: todoItems ?? [], quickNotes: quickNotes ?? [] },
    };
    localStorage.setItem(key, JSON.stringify(profile));
    setProfiles(getStoredProfiles());
    setProfileName('');
    setProfileSaved(true);
    showToast(`Perfil "${name}" salvo!`);
    setTimeout(() => setProfileSaved(false), 1500);
  };

  const handleLoadProfile = (profile: SavedProfile) => {
    replaceAll({
      companies: profile.data.companies as Parameters<typeof replaceAll>[0]['companies'],
      subClients: profile.data.subClients as Parameters<typeof replaceAll>[0]['subClients'],
      tasks: profile.data.tasks as Parameters<typeof replaceAll>[0]['tasks'],
      leads: profile.data.leads as Parameters<typeof replaceAll>[0]['leads'],
      quickNotes: profile.data.quickNotes as Parameters<typeof replaceAll>[0]['quickNotes'],
    });
    setLoadConfirm(null);
    showToast(`Perfil "${profile.name}" carregado!`);
  };

  const handleDeleteProfile = (name: string) => {
    localStorage.removeItem(`${PROFILE_PREFIX}${name}`);
    setProfiles(getStoredProfiles());
  };

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' });
  };

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-50 flex items-center justify-center"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      >
        <motion.div className="absolute inset-0 bg-black/60 glass-backdrop" onClick={onClose} />

        <motion.div
          className="relative z-10 w-full mx-4 rounded-[20px] overflow-hidden shadow-2xl glass-panel"
          style={{ background: 'var(--modal-bg)', maxWidth: 480, maxHeight: '90vh', overflowY: 'auto' }}
          initial={{ scale: 0.92, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.92, opacity: 0, y: 20 }}
          transition={{ type: 'spring', damping: 26, stiffness: 320 }}
        >
          <div style={{ height: 3, background: accentColor, opacity: 0.9 }} />

          <div style={{ padding: '20px 24px 28px', display: 'flex', flexDirection: 'column', gap: 24 }}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 16, fontWeight: 700, color: 'var(--t1)' }}>Dados & Backup</span>
              <button onClick={onClose}
                style={{ background: 'var(--s1)', border: 'none', cursor: 'pointer', color: 'var(--t3)', padding: 8, borderRadius: 8, display: 'flex', transition: 'all .15s' }}
                onMouseEnter={e => (e.currentTarget.style.background = 'var(--s2)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'var(--s1)')}>
                <FiX size={16} />
              </button>
            </div>

            {/* Export */}
            <div>
              <span style={labelStyle}>Exportar Dados</span>
              <div style={{ padding: 14, background: 'var(--s1)', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--t1)', marginBottom: 2 }}>Exportar Backup JSON</div>
                  <div style={{ fontSize: 11, color: 'var(--t4)' }}>
                    Exporta empresas, clientes, tarefas, leads e notas.
                  </div>
                </div>
                <button
                  onClick={handleExport}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 6,
                    padding: '8px 14px', borderRadius: 8, border: 'none', cursor: 'pointer',
                    background: `${accentColor}20`, color: accentColor,
                    fontSize: 12, fontWeight: 600, flexShrink: 0, transition: 'background .15s',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = `${accentColor}35`)}
                  onMouseLeave={e => (e.currentTarget.style.background = `${accentColor}20`)}
                >
                  <FiDownload size={13} /> Exportar
                </button>
              </div>
            </div>

            {/* Import */}
            <div>
              <span style={labelStyle}>Importar Dados</span>
              <div style={{ padding: 14, background: 'var(--s1)', borderRadius: 12, display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--t1)', marginBottom: 2 }}>Importar de arquivo</div>
                    <div style={{ fontSize: 11, color: 'var(--t4)' }}>Selecione um .json exportado anteriormente.</div>
                  </div>
                  <button
                    onClick={() => fileRef.current?.click()}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 6,
                      padding: '8px 14px', borderRadius: 8, border: 'none', cursor: 'pointer',
                      background: 'var(--s2)', color: 'var(--t2)',
                      fontSize: 12, fontWeight: 600, flexShrink: 0, transition: 'background .15s',
                    }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'var(--b2)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'var(--s2)')}
                  >
                    <FiUpload size={13} /> Selecionar
                  </button>
                  <input ref={fileRef} type="file" accept=".json" onChange={handleFileChange} style={{ display: 'none' }} />
                </div>

                {/* Confirm overwrite */}
                {importStatus === 'confirm' && (
                  <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}
                    style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: '10px 12px', background: 'rgba(255,159,10,0.08)', borderRadius: 10, border: '1px solid rgba(255,159,10,0.2)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 600, color: '#ff9f0a' }}>
                      <FiAlertTriangle size={13} /> Substituir todos os dados atuais?
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--t3)' }}>Esta ação não pode ser desfeita.</div>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button onClick={handleImportConfirm}
                        style={{ padding: '6px 14px', borderRadius: 8, background: '#ff9f0a', border: 'none', color: '#fff', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>
                        Importar mesmo assim
                      </button>
                      <button onClick={() => { setImportStatus(null); setPendingData(null); }}
                        style={{ padding: '6px 10px', borderRadius: 8, background: 'var(--s1)', border: 'none', color: 'var(--t3)', fontSize: 11, cursor: 'pointer' }}>
                        Cancelar
                      </button>
                    </div>
                  </motion.div>
                )}

                {importStatus === 'success' && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#30d158', fontWeight: 600 }}>
                    <FiCheck size={13} /> Dados importados com sucesso!
                  </div>
                )}

                {importStatus === 'error' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#ff453a', fontWeight: 600 }}>
                      <FiAlertTriangle size={13} /> Erro ao importar
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--t4)' }}>{importError}</div>
                    <button onClick={() => setImportStatus(null)} style={{ alignSelf: 'flex-start', fontSize: 11, color: accentColor, background: 'none', border: 'none', cursor: 'pointer', padding: 0, marginTop: 2 }}>
                      Tentar novamente
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Saved Profiles — Multi-account */}
            <div>
              <span style={labelStyle}>Perfis Salvos</span>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {/* Save current as profile */}
                <div style={{ padding: 14, background: 'var(--s1)', borderRadius: 12 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--t2)', marginBottom: 10 }}>
                    Salvar estado atual como perfil
                  </div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <input
                      value={profileName}
                      onChange={e => setProfileName(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') handleSaveProfile(); }}
                      placeholder="Nome do perfil (ex: Trabalho)"
                      disabled={profiles.length >= MAX_PROFILES}
                      style={{
                        flex: 1, background: 'var(--ib)', border: '1px solid var(--b2)',
                        borderRadius: 8, padding: '7px 11px', color: 'var(--t1)',
                        fontSize: 12, outline: 'none',
                        opacity: profiles.length >= MAX_PROFILES ? 0.5 : 1,
                      }}
                    />
                    <button
                      onClick={handleSaveProfile}
                      disabled={!profileName.trim() || profiles.length >= MAX_PROFILES}
                      style={{
                        padding: '7px 14px', borderRadius: 8, border: 'none', cursor: 'pointer',
                        background: profileSaved ? 'rgba(48,209,88,0.2)' : `${accentColor}20`,
                        color: profileSaved ? '#30d158' : accentColor,
                        fontSize: 12, fontWeight: 600, flexShrink: 0, transition: 'all .15s',
                        opacity: (!profileName.trim() || profiles.length >= MAX_PROFILES) ? 0.5 : 1,
                        display: 'flex', alignItems: 'center', gap: 5,
                      }}
                    >
                      {profileSaved ? <FiCheck size={13} /> : <FiSave size={13} />}
                      {profileSaved ? 'Salvo!' : 'Salvar'}
                    </button>
                  </div>
                  {profiles.length >= MAX_PROFILES && (
                    <div style={{ fontSize: 10, color: 'var(--t4)', marginTop: 6 }}>
                      Máximo de {MAX_PROFILES} perfis atingido. Remova um para criar novo.
                    </div>
                  )}
                </div>

                {/* Profile list */}
                {profiles.length === 0 ? (
                  <div style={{ fontSize: 12, color: 'var(--t4)', textAlign: 'center', padding: '12px 0' }}>
                    Nenhum perfil salvo ainda.
                  </div>
                ) : (
                  profiles.map(profile => (
                    <div key={profile.name}
                      style={{ padding: '10px 14px', background: 'var(--s1)', borderRadius: 12, display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{ width: 32, height: 32, borderRadius: 8, background: `${accentColor}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <FiUser size={14} style={{ color: accentColor }} />
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--t1)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {profile.name}
                        </div>
                        <div style={{ fontSize: 10, color: 'var(--t4)' }}>
                          Salvo em {formatDate(profile.savedAt)}
                        </div>
                      </div>

                      {loadConfirm === profile.name ? (
                        <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                          <button onClick={() => handleLoadProfile(profile)}
                            style={{ padding: '4px 10px', borderRadius: 6, background: accentColor, border: 'none', color: '#fff', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>
                            Carregar
                          </button>
                          <button onClick={() => setLoadConfirm(null)}
                            style={{ padding: '4px 8px', borderRadius: 6, background: 'var(--s2)', border: 'none', color: 'var(--t3)', fontSize: 11, cursor: 'pointer' }}>
                            Não
                          </button>
                        </div>
                      ) : (
                        <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                          <button
                            onClick={() => setLoadConfirm(profile.name)}
                            title="Carregar perfil"
                            style={{ padding: '4px 10px', borderRadius: 6, background: `${accentColor}15`, border: 'none', color: accentColor, fontSize: 11, fontWeight: 600, cursor: 'pointer', transition: 'background .15s' }}
                            onMouseEnter={e => (e.currentTarget.style.background = `${accentColor}28`)}
                            onMouseLeave={e => (e.currentTarget.style.background = `${accentColor}15`)}
                          >
                            Usar
                          </button>
                          <button
                            onClick={() => handleDeleteProfile(profile.name)}
                            title="Remover perfil"
                            style={{ padding: '4px 8px', borderRadius: 6, background: 'rgba(255,69,58,0.1)', border: 'none', color: '#ff453a', fontSize: 11, cursor: 'pointer', transition: 'background .15s' }}
                            onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,69,58,0.2)')}
                            onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255,69,58,0.1)')}
                          >
                            <FiX size={11} />
                          </button>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
