import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FiPlus, FiEdit2, FiEye, FiLink, FiTrash2, FiX,
  FiChevronLeft, FiChevronRight, FiCheck, FiUpload,
  FiClipboard, FiSearch, FiEdit3, FiImage, FiCheckCircle,
  FiStar, FiMessageSquare, FiDownload,
} from 'react-icons/fi';
import { useProposalsStore, getDefaultPricingOptions } from '../store/proposals';
import { useVisibleWorkspaceIds, isInLens } from '../store/workspaces';
import { useTaskStore } from '../store/tasks';
import type { Proposal, ProposalService, ProposalStatus, PricingOption, PortfolioSection, BentoSlot, ProposalTheme } from '../types';

import BG1 from '../assets/images/BG1.png';
import LogoDark from '../assets/images/Logos/Logotipo Horizontal/1.svg';
import LogoWhite from '../assets/images/Logos/Logotipo Horizontal/5.svg';
import SeloLogo from '../assets/images/Selo/1.svg';

// ─── Constants ───────────────────────────────────────────────────────────────

const SERVICE_LABELS: Record<ProposalService, string> = {
  'social-media': 'Social Media',
  'estrategia': 'Estratégia',
  'site': 'Site',
  'identidade-visual': 'Identidade Visual',
  'logo': 'Logo',
};

const SERVICE_COLORS: Record<ProposalService, string> = {
  'social-media': '#ff6b35',
  'estrategia': '#9b59b6',
  'site': '#3498db',
  'identidade-visual': '#356BFF',
  'logo': '#27ae60',
};

const STATUS_LABELS: Record<ProposalStatus, string> = {
  rascunho: 'Rascunho',
  enviada: 'Enviada',
  aceita: 'Aceita',
  recusada: 'Recusada',
};

const STATUS_COLORS: Record<ProposalStatus, string> = {
  rascunho: '#636366',
  enviada: '#ff9f0a',
  aceita: '#30d158',
  recusada: '#ff453a',
};

const BENTO_POSITIONS: { gridColumn: string; gridRow: string }[] = [
  { gridColumn: '1', gridRow: '1 / 3' },
  { gridColumn: '2', gridRow: '1' },
  { gridColumn: '3 / 5', gridRow: '1 / 3' },
  { gridColumn: '2', gridRow: '2' },
  { gridColumn: '1 / 3', gridRow: '3' },
  { gridColumn: '3', gridRow: '3' },
  { gridColumn: '4', gridRow: '3' },
];

const VALIDITY_OPTIONS = ['7 Dias', '10 Dias', '15 Dias', '30 Dias'];

const labelStyle: React.CSSProperties = {
  fontSize: 10, fontWeight: 700, letterSpacing: '1.5px', textTransform: 'uppercase',
  color: 'var(--t3)', display: 'block', marginBottom: 6,
};
const inputStyle: React.CSSProperties = {
  width: '100%', boxSizing: 'border-box', background: 'var(--ib)',
  border: '1px solid var(--b2)', borderRadius: 8, padding: '8px 12px',
  color: 'var(--t1)', fontSize: 13, outline: 'none',
};

// ─── Utils ───────────────────────────────────────────────────────────────────

function formatBRL(v: number) {
  return 'R$' + v.toLocaleString('pt-BR', { minimumFractionDigits: 0 });
}

function compressImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = e => {
      const img = new Image();
      img.onload = () => {
        const MAX_W = 900, MAX_H = 700;
        let { width, height } = img;
        if (width > MAX_W) { height = Math.round(height * MAX_W / width); width = MAX_W; }
        if (height > MAX_H) { width = Math.round(width * MAX_H / height); height = MAX_H; }
        const c = document.createElement('canvas');
        c.width = width; c.height = height;
        c.getContext('2d')!.drawImage(img, 0, 0, width, height);
        resolve(c.toDataURL('image/jpeg', 0.80));
      };
      img.onerror = reject;
      img.src = e.target!.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function proposalMonth(createdAt: string) {
  try {
    const d = new Date(createdAt);
    const months = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
    return `${months[d.getMonth()]} de ${d.getFullYear()}`;
  } catch { return ''; }
}

// ─── Bento Slot Cell ─────────────────────────────────────────────────────────

const SLOT_LABELS = ['Grande', 'Pequeno', 'Largo', 'Pequeno', 'Largo', 'Médio', 'Médio'];
const SLOT_DIMS   = ['330×230px', '200×110px', '490×230px', '200×110px', '530×90px', '245×90px', '245×90px'];

function BentoSlotCell({ slot, index, onUpdate, isViewer }: {
  slot: BentoSlot; index: number; onUpdate?: (url?: string) => void; isViewer?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [drag, setDrag] = useState(false);
  const [hovered, setHovered] = useState(false);

  const handleFile = useCallback(async (file: File) => {
    if (!file.type.startsWith('image/')) return;
    try { onUpdate?.(await compressImage(file)); } catch { /**/ }
  }, [onUpdate]);

  return (
    <div
      style={{
        ...BENTO_POSITIONS[index],
        position: 'relative', borderRadius: 8, overflow: 'hidden',
        background: slot.imageUrl ? 'transparent' : (isViewer ? 'rgba(0,0,0,0.06)' : 'var(--s1)'),
        border: drag ? '2px dashed #356BFF' : (isViewer ? 'none' : `2px dashed var(--b${slot.imageUrl ? '1' : '2'})`),
        cursor: isViewer ? 'default' : 'pointer',
        transition: 'border-color .15s',
      }}
      onDragOver={e => { if (!isViewer) { e.preventDefault(); setDrag(true); } }}
      onDragLeave={() => setDrag(false)}
      onDrop={!isViewer ? e => { e.preventDefault(); setDrag(false); const f = e.dataTransfer.files[0]; if (f) handleFile(f); } : undefined}
      onClick={() => !isViewer && inputRef.current?.click()}
      onMouseEnter={() => !isViewer && setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {slot.imageUrl ? (
        <>
          <img src={slot.imageUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
          {!isViewer && hovered && (
            <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.55)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
              <FiUpload size={16} color="#fff" />
              <span style={{ fontSize: 10, color: '#fff', fontWeight: 600 }}>Trocar</span>
              <button onClick={e => { e.stopPropagation(); onUpdate?.(undefined); }} style={{ fontSize: 9, color: '#ff453a', background: 'rgba(255,69,58,0.2)', border: 'none', borderRadius: 4, padding: '2px 8px', cursor: 'pointer', fontWeight: 600 }}>
                Remover
              </button>
            </div>
          )}
        </>
      ) : !isViewer ? (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 4, color: 'var(--t4)', padding: 8, minHeight: 50 }}>
          <FiUpload size={13} />
          <span style={{ fontSize: 9, fontWeight: 700, textAlign: 'center', lineHeight: 1.3 }}>{SLOT_LABELS[index]}</span>
          <span style={{ fontSize: 8, opacity: 0.65, textAlign: 'center', lineHeight: 1.2 }}>{SLOT_DIMS[index]}</span>
        </div>
      ) : (
        <div style={{ width: '100%', height: '100%', background: '#e8e8e6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <span style={{ fontSize: 11, color: '#aaa' }}>{SLOT_LABELS[index]}</span>
        </div>
      )}
      {!isViewer && (
        <input ref={inputRef} type="file" accept="image/*" style={{ display: 'none' }}
          onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = ''; }} />
      )}
    </div>
  );
}

// ─── Bento Grid Editor ────────────────────────────────────────────────────────

function BentoGridEditor({ section, onChange, isViewer }: {
  section: PortfolioSection; onChange?: (s: PortfolioSection) => void; isViewer?: boolean;
}) {
  if (isViewer) {
    return (
      <div style={{ height: '100%' }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: '2fr 1.2fr 1.5fr 1.5fr',
          gridTemplateRows: 'repeat(3, 1fr)',
          gap: 5,
          height: '100%',
        }}>
          {section.slots.map((slot, i) => (
            <BentoSlotCell key={slot.id} slot={slot} index={i} isViewer={true} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <div>
          <label style={labelStyle}>Título</label>
          <input value={section.title} onChange={e => onChange?.({ ...section, title: e.target.value })} style={inputStyle} placeholder="ex: Identidade Visual" />
        </div>
        <div>
          <label style={labelStyle}>Subtítulo (cliente)</label>
          <input value={section.subtitle} onChange={e => onChange?.({ ...section, subtitle: e.target.value })} style={inputStyle} placeholder="ex: Evo Studio" />
        </div>
      </div>
      <div style={{
        display: 'grid',
        gridTemplateColumns: '2fr 1.2fr 1.5fr 1.5fr',
        gridTemplateRows: '110px 110px 90px',
        gap: 8,
      }}>
        {section.slots.map((slot, i) => (
          <BentoSlotCell key={slot.id} slot={slot} index={i}
            onUpdate={url => onChange?.({ ...section, slots: section.slots.map((s, j) => j === i ? { ...s, imageUrl: url } : s) })}
            isViewer={false} />
        ))}
      </div>
    </div>
  );
}

// ─── Pricing Option Editor ────────────────────────────────────────────────────

function PricingOptionEditor({ option, onChange, onRemove, canRemove }: {
  option: PricingOption; onChange: (o: PricingOption) => void; onRemove: () => void; canRemove: boolean;
}) {
  const [newItem, setNewItem] = useState('');
  const addItem = () => { if (!newItem.trim()) return; onChange({ ...option, items: [...option.items, newItem.trim()] }); setNewItem(''); };

  return (
    <div style={{ background: 'var(--s1)', border: '1px solid var(--b2)', borderRadius: 12, padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => onChange({ ...option, isMostSold: !option.isMostSold })}
            style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.5px', padding: '3px 8px', borderRadius: 6, border: 'none', cursor: 'pointer', background: option.isMostSold ? '#356BFF' : 'var(--s2)', color: option.isMostSold ? '#fff' : 'var(--t3)' }}>
            MAIS VENDIDO
          </button>
          <button onClick={() => onChange({ ...option, isHighlighted: !option.isHighlighted })}
            style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.5px', padding: '3px 8px', borderRadius: 6, border: 'none', cursor: 'pointer', background: option.isHighlighted ? 'rgba(255,255,255,0.15)' : 'var(--s2)', color: option.isHighlighted ? 'var(--t1)' : 'var(--t3)', outline: option.isHighlighted ? '1px solid var(--b3)' : 'none' }}>
            CARD ESCURO
          </button>
        </div>
        {canRemove && <button onClick={onRemove} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ff453a', padding: 4 }}><FiTrash2 size={13} /></button>}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <div><label style={labelStyle}>Nome do Plano</label><input value={option.name} onChange={e => onChange({ ...option, name: e.target.value })} style={inputStyle} placeholder="ex: Identidade Visual" /></div>
        <div><label style={labelStyle}>Subtítulo</label><input value={option.subtitle} onChange={e => onChange({ ...option, subtitle: e.target.value })} style={inputStyle} placeholder="ex: Completa" /></div>
        <div><label style={labelStyle}>Preço Original (R$)</label><input type="number" value={option.fullPrice || ''} onChange={e => onChange({ ...option, fullPrice: Number(e.target.value) })} style={inputStyle} placeholder="1997" /></div>
        <div><label style={labelStyle}>Preço com Desconto (R$)</label><input type="number" value={option.discountedPrice || ''} onChange={e => onChange({ ...option, discountedPrice: Number(e.target.value) })} style={inputStyle} placeholder="1397" /></div>
      </div>

      <div>
        <label style={labelStyle}>O que está incluso</label>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
          {option.items.map((item, i) => (
            <div key={i} style={{ display: 'flex', gap: 6 }}>
              <input value={item} onChange={e => onChange({ ...option, items: option.items.map((it, j) => j === i ? e.target.value : it) })}
                style={{ ...inputStyle, fontSize: 12 }} />
              <button onClick={() => onChange({ ...option, items: option.items.filter((_, j) => j !== i) })}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ff453a', padding: '0 4px', flexShrink: 0 }}><FiX size={12} /></button>
            </div>
          ))}
          <div style={{ display: 'flex', gap: 6 }}>
            <input value={newItem} onChange={e => setNewItem(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addItem()}
              style={{ ...inputStyle, fontSize: 12 }} placeholder="+ Adicionar item (Enter)" />
            <button onClick={addItem} style={{ padding: '6px 12px', background: '#356BFF', border: 'none', borderRadius: 8, color: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer', flexShrink: 0 }}>+</button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Pricing Section Editor ───────────────────────────────────────────────────

function PricingEditor({ options, headline, service, onChange }: {
  options: PricingOption[]; headline: string; service: ProposalService;
  onChange: (opts: PricingOption[], hl: string) => void;
}) {
  const uid = () => Math.random().toString(36).slice(2, 10);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end' }}>
        <div style={{ flex: 1 }}>
          <label style={labelStyle}>Título da Seção de Preços</label>
          <input value={headline} onChange={e => onChange(options, e.target.value)} style={inputStyle} />
        </div>
        <button onClick={() => onChange(getDefaultPricingOptions(service), headline)}
          style={{ padding: '8px 14px', background: 'var(--s2)', border: '1px solid var(--b2)', borderRadius: 8, color: 'var(--t1)', fontSize: 12, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap', marginBottom: 0 }}>
          Usar Template
        </button>
      </div>

      {options.map((opt, i) => (
        <PricingOptionEditor key={opt.id} option={opt}
          onChange={updated => onChange(options.map((o, j) => j === i ? updated : o), headline)}
          onRemove={() => onChange(options.filter((_, j) => j !== i), headline)}
          canRemove={options.length > 1} />
      ))}

      {options.length < 3 && (
        <button onClick={() => onChange([...options, { id: uid(), name: 'Novo Plano', subtitle: '', items: [], fullPrice: 0, discountedPrice: 0, isMostSold: false, isHighlighted: true }], headline)}
          style={{ padding: '10px', borderRadius: 10, border: '2px dashed var(--b2)', background: 'transparent', color: 'var(--t3)', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = '#356BFF'; (e.currentTarget as HTMLElement).style.color = '#356BFF'; }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--b2)'; (e.currentTarget as HTMLElement).style.color = 'var(--t3)'; }}>
          + Adicionar Plano ({options.length}/3)
        </button>
      )}
    </div>
  );
}

// ─── Slide 2 Image Uploader ───────────────────────────────────────────────────

function Slide2ImageUploader({ imageUrl, onUpdate }: { imageUrl?: string; onUpdate: (url?: string) => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [drag, setDrag] = useState(false);

  const handleFile = useCallback(async (file: File) => {
    if (!file.type.startsWith('image/')) return;
    try { onUpdate(await compressImage(file)); } catch { /**/ }
  }, [onUpdate]);

  return (
    <div
      style={{
        width: '100%', height: 260, borderRadius: 12, overflow: 'hidden', position: 'relative',
        background: imageUrl ? 'transparent' : 'var(--s1)',
        border: drag ? '2px dashed #356BFF' : `2px dashed var(--b${imageUrl ? '1' : '2'})`,
        cursor: 'pointer', transition: 'border-color .15s',
      }}
      onDragOver={e => { e.preventDefault(); setDrag(true); }}
      onDragLeave={() => setDrag(false)}
      onDrop={e => { e.preventDefault(); setDrag(false); const f = e.dataTransfer.files[0]; if (f) handleFile(f); }}
      onClick={() => inputRef.current?.click()}
    >
      {imageUrl ? (
        <>
          <img src={imageUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
          <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8, transition: 'background .2s' }}
            onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'rgba(0,0,0,0.5)'}
            onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'rgba(0,0,0,0)'}>
            <FiUpload size={18} color="#fff" style={{ pointerEvents: 'none' }} />
            <button onClick={e => { e.stopPropagation(); onUpdate(undefined); }}
              style={{ fontSize: 10, color: '#ff453a', background: 'rgba(255,69,58,0.2)', border: 'none', borderRadius: 4, padding: '3px 10px', cursor: 'pointer', fontWeight: 600, pointerEvents: 'auto' }}>
              Remover
            </button>
          </div>
        </>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 8, color: 'var(--t4)' }}>
          <FiUpload size={22} />
          <span style={{ fontSize: 12, fontWeight: 600 }}>Clique ou arraste uma imagem</span>
          <span style={{ fontSize: 10 }}>JPG, PNG, WebP — será comprimida automaticamente</span>
        </div>
      )}
      <input ref={inputRef} type="file" accept="image/*" style={{ display: 'none' }}
        onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = ''; }} />
    </div>
  );
}

// ─── Proposal Editor ─────────────────────────────────────────────────────────

const EDITOR_SECTIONS = [
  { id: 'cover',       label: '1 · Capa',             desc: 'Cliente, serviço e validade' },
  { id: 'slide2img',   label: '2 · Sobre Nós',         desc: 'Foto do lado direito' },
  { id: 'portfolio1',  label: '5 · Portfolio 1',       desc: 'Bento grid de imagens' },
  { id: 'portfolio2',  label: '6 · Portfolio 2',       desc: 'Bento grid de imagens' },
  { id: 'pricing',     label: '8 · Investimento',      desc: 'Planos e preços' },
  { id: 'alteracoes',  label: '9 · Informações',       desc: 'Taxas de alteração' },
] as const;
type EditorSection = typeof EDITOR_SECTIONS[number]['id'];

function PropostaEditor({ proposal, onClose, onView }: { proposal: Proposal; onClose: () => void; onView: () => void }) {
  const { updateProposal } = useProposalsStore();
  const [section, setSection] = useState<EditorSection>('cover');
  const [local, setLocal] = useState<Proposal>(proposal);
  const [saved, setSaved] = useState(true);
  const localRef = useRef(local);
  useEffect(() => { localRef.current = local; }, [local]);
  useEffect(() => () => { updateProposal(localRef.current.id, localRef.current); }, []);

  const upd = (patch: Partial<Proposal>) => { setLocal(p => ({ ...p, ...patch })); setSaved(false); };
  const save = () => { updateProposal(proposal.id, local); setSaved(true); };

  const accentColor = useTaskStore.getState().accentColor;
  const leads = useTaskStore(s => s.leads);
  const companies = useTaskStore(s => s.companies);

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      style={{ position: 'fixed', inset: 0, zIndex: 500, display: 'flex', flexDirection: 'column', background: 'var(--modal-bg)', backdropFilter: 'blur(12px)' }}>

      {/* Top bar */}
      <div style={{ height: 54, flexShrink: 0, display: 'flex', alignItems: 'center', gap: 12, padding: '0 16px', borderBottom: '1px solid var(--b1)' }}>
        <button onClick={() => { save(); onClose(); }} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 10px', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--t2)', fontSize: 13, borderRadius: 8 }}
          onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'var(--s2)'}
          onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'none'}>
          <FiChevronLeft size={14} /> Propostas
        </button>
        <div style={{ width: 1, height: 18, background: 'var(--b2)' }} />
        <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--t1)' }}>{local.clientName}</span>
        <span style={{ fontSize: 12, color: 'var(--t3)' }}>— {SERVICE_LABELS[local.service]}</span>
        <div style={{ flex: 1 }} />
        <span style={{ fontSize: 11, color: saved ? '#30d158' : '#ff9f0a', fontWeight: 600 }}>
          {saved ? '● Salvo' : '● Não salvo'}
        </span>
        <select value={local.status} onChange={e => upd({ status: e.target.value as ProposalStatus })}
          style={{ ...inputStyle, width: 'auto', fontSize: 12, padding: '5px 10px', color: STATUS_COLORS[local.status] }}>
          {(Object.keys(STATUS_LABELS) as ProposalStatus[]).map(s => (
            <option key={s} value={s}>{STATUS_LABELS[s]}</option>
          ))}
        </select>
        <button onClick={save} style={{ padding: '7px 16px', background: saved ? 'var(--s2)' : accentColor, border: 'none', borderRadius: 8, color: saved ? 'var(--t2)' : '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
          Salvar
        </button>
        <button onClick={() => { save(); onView(); }}
          style={{ padding: '7px 16px', background: 'var(--s2)', border: '1px solid var(--b2)', borderRadius: 8, color: 'var(--t1)', fontSize: 12, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
          <FiEye size={13} /> Visualizar
        </button>
      </div>

      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        {/* Section sidebar */}
        <div style={{ width: 220, flexShrink: 0, borderRight: '1px solid var(--b1)', padding: '16px 10px', display: 'flex', flexDirection: 'column', gap: 4, overflowY: 'auto' }}>
          <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '1.5px', color: 'var(--t4)', textTransform: 'uppercase', padding: '4px 8px 10px' }}>Seções Editáveis</div>
          {EDITOR_SECTIONS.map(s => (
            <button key={s.id} onClick={() => setSection(s.id)}
              style={{ textAlign: 'left', padding: '10px 12px', borderRadius: 8, border: 'none', cursor: 'pointer', background: section === s.id ? `${accentColor}18` : 'transparent', color: section === s.id ? accentColor : 'var(--t2)', transition: 'all .15s' }}
              onMouseEnter={e => { if (section !== s.id) (e.currentTarget as HTMLElement).style.background = 'var(--s2)'; }}
              onMouseLeave={e => { if (section !== s.id) (e.currentTarget as HTMLElement).style.background = 'transparent'; }}>
              <div style={{ fontSize: 12, fontWeight: 600 }}>{s.label}</div>
              <div style={{ fontSize: 10, color: 'var(--t4)', marginTop: 2 }}>{s.desc}</div>
            </button>
          ))}
          <div style={{ marginTop: 12, padding: '12px', background: 'var(--s1)', borderRadius: 10, border: '1px solid var(--b1)' }}>
            <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '1px', color: 'var(--t4)', textTransform: 'uppercase', marginBottom: 6 }}>Slides Fixos</div>
            {['3 · Por que Evo', '4 · Processo', '7 · Depoimentos', '10 · Outros Serviços', '11 · Países', '12 · Fechamento'].map(l => (
              <div key={l} style={{ fontSize: 11, color: 'var(--t4)', padding: '3px 0' }}>{l}</div>
            ))}
          </div>
        </div>

        {/* Form area */}
        <div style={{ flex: 1, overflowY: 'auto', padding: 28 }}>
          {section === 'cover' && (
            <div style={{ maxWidth: 560, display: 'flex', flexDirection: 'column', gap: 16 }}>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: 'var(--t1)' }}>Capa da Proposta</h3>

              {/* Theme picker */}
              <div>
                <label style={labelStyle}>Tema Visual</label>
                <div style={{ display: 'flex', gap: 10 }}>
                  {([['classic', 'Clássico', '#f8f7f5', '#1a1a2e'], ['evo-dark', 'Evo Dark', '#060912', '#356BFF']] as [ProposalTheme, string, string, string][]).map(([id, label, bg, accent]) => {
                    const selected = (local.theme ?? 'classic') === id;
                    return (
                      <button key={id} onClick={() => upd({ theme: id })} style={{ flex: 1, padding: '10px 14px', borderRadius: 10, border: `2px solid ${selected ? accentColor : 'var(--b2)'}`, background: selected ? `${accentColor}14` : 'var(--ib)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10, transition: 'all .15s' }}>
                        <div style={{ width: 36, height: 24, borderRadius: 5, background: bg, border: '1px solid rgba(255,255,255,0.15)', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 3, overflow: 'hidden', padding: '3px 5px' }}>
                          <div style={{ flex: 1, height: '65%', background: accent, borderRadius: 2, opacity: 0.9 }} />
                          <div style={{ flex: 1.3, display: 'flex', flexDirection: 'column', gap: 2 }}>
                            <div style={{ height: 2, background: id === 'classic' ? '#3d3f52' : 'rgba(255,255,255,0.6)', borderRadius: 1 }} />
                            <div style={{ height: 2, background: id === 'classic' ? '#3d3f52' : 'rgba(255,255,255,0.4)', borderRadius: 1, width: '70%' }} />
                            <div style={{ height: 2, background: id === 'classic' ? '#3d3f52' : 'rgba(255,255,255,0.3)', borderRadius: 1, width: '50%' }} />
                          </div>
                        </div>
                        <div style={{ textAlign: 'left' }}>
                          <div style={{ fontSize: 12, fontWeight: 600, color: selected ? accentColor : 'var(--t1)' }}>{label}</div>
                          <div style={{ fontSize: 10, color: 'var(--t4)', marginTop: 1 }}>{id === 'classic' ? 'Fundo claro, elegante' : 'Fundo dark, identidade Evo'}</div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div><label style={labelStyle}>Nome do Cliente</label>
                <input value={local.clientName} onChange={e => upd({ clientName: e.target.value })} style={inputStyle} placeholder="ex: REF ADV" /></div>
              <div>
                <label style={labelStyle}>Serviço</label>
                <select value={local.service} onChange={e => upd({ service: e.target.value as ProposalService })} style={inputStyle}>
                  {(Object.keys(SERVICE_LABELS) as ProposalService[]).map(s => (
                    <option key={s} value={s}>{SERVICE_LABELS[s]}</option>
                  ))}
                </select>
              </div>
              <div>
                <label style={labelStyle}>Validade da Proposta</label>
                <div style={{ display: 'flex', gap: 8 }}>
                  {VALIDITY_OPTIONS.map(v => (
                    <button key={v} onClick={() => upd({ validity: v })}
                      style={{ padding: '7px 14px', borderRadius: 8, border: `1px solid ${local.validity === v ? accentColor : 'var(--b2)'}`, background: local.validity === v ? `${accentColor}18` : 'var(--ib)', color: local.validity === v ? accentColor : 'var(--t2)', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                      {v}
                    </button>
                  ))}
                </div>
                <input value={local.validity} onChange={e => upd({ validity: e.target.value })} style={{ ...inputStyle, marginTop: 8 }} placeholder="ou escreva personalizado, ex: 20 Dias" />
              </div>

              {/* Lead origem */}
              {leads.length > 0 && (
                <div>
                  <label style={labelStyle}>Lead origem</label>
                  <select
                    value={local.linkedLeadId ?? ''}
                    onChange={e => upd({ linkedLeadId: e.target.value || undefined })}
                    style={{ ...inputStyle, cursor: 'pointer' }}
                  >
                    <option value="">— Nenhum —</option>
                    {leads.map(l => (
                      <option key={l.id} value={l.id}>{l.name}{l.contact ? ` (${l.contact})` : ''}</option>
                    ))}
                  </select>
                  <div style={{ fontSize: 11, color: 'var(--t4)', marginTop: 4 }}>De qual lead esta proposta foi gerada</div>
                </div>
              )}

              {/* Empresa vinculada — útil quando proposta é aceita */}
              {companies.length > 0 && (
                <div>
                  <label style={labelStyle}>Empresa vinculada</label>
                  <select
                    value={local.linkedCompanyId ?? ''}
                    onChange={e => upd({ linkedCompanyId: e.target.value || undefined })}
                    style={{ ...inputStyle, cursor: 'pointer' }}
                  >
                    <option value="">— Nenhuma —</option>
                    {companies.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                  <div style={{ fontSize: 11, color: 'var(--t4)', marginTop: 4 }}>Quando a proposta vira contrato, vincule à empresa</div>
                </div>
              )}

              <div style={{ padding: 12, background: 'var(--s1)', borderRadius: 10, border: '1px solid var(--b1)' }}>
                <div style={{ fontSize: 11, color: 'var(--t3)', marginBottom: 6, fontWeight: 600 }}>Pré-visualização da Capa</div>
                <div style={{ fontSize: 11, color: 'var(--t4)', lineHeight: 1.6 }}>
                  Cliente: <span style={{ color: 'var(--t2)' }}>{local.clientName || '—'}</span> &nbsp;|&nbsp;
                  Serviço: <span style={{ color: 'var(--t2)' }}>{SERVICE_LABELS[local.service]}</span> &nbsp;|&nbsp;
                  Validade: <span style={{ color: 'var(--t2)' }}>{local.validity || '—'}</span>
                </div>
              </div>
            </div>
          )}

          {section === 'slide2img' && (
            <div style={{ maxWidth: 480, display: 'flex', flexDirection: 'column', gap: 16 }}>
              <h3 style={{ margin: '0 0 4px', fontSize: 16, fontWeight: 700, color: 'var(--t1)' }}>Sobre Nós — Slide 2</h3>
              <p style={{ margin: 0, fontSize: 12, color: 'var(--t3)' }}>Imagem exibida no lado direito do slide "Sobre Nós". Clique ou arraste para enviar.</p>
              <Slide2ImageUploader
                imageUrl={local.slide2Image}
                onUpdate={url => upd({ slide2Image: url })} />
            </div>
          )}

          {(section === 'portfolio1' || section === 'portfolio2') && (
            <div style={{ maxWidth: 780, display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <h3 style={{ margin: '0 0 4px', fontSize: 16, fontWeight: 700, color: 'var(--t1)' }}>
                  {section === 'portfolio1' ? 'Portfolio — Slide 5' : 'Portfolio — Slide 6'}
                </h3>
                <p style={{ margin: 0, fontSize: 12, color: 'var(--t3)' }}>Clique em cada slot para enviar uma imagem, ou arraste e solte. Imagens são comprimidas automaticamente.</p>
              </div>
              <BentoGridEditor
                section={section === 'portfolio1' ? local.portfolio1 : local.portfolio2}
                onChange={s => upd(section === 'portfolio1' ? { portfolio1: s } : { portfolio2: s })} />
            </div>
          )}

          {section === 'pricing' && (
            <div style={{ maxWidth: 680 }}>
              <h3 style={{ margin: '0 0 4px', fontSize: 16, fontWeight: 700, color: 'var(--t1)' }}>Investimento — Slide 8</h3>
              <p style={{ margin: '0 0 20px', fontSize: 12, color: 'var(--t3)' }}>Configure 1 a 3 planos. Use "Usar Template" para carregar os valores padrão do serviço selecionado.</p>
              <PricingEditor
                options={local.pricingOptions}
                headline={local.pricingHeadline}
                service={local.service}
                onChange={(opts, hl) => upd({ pricingOptions: opts, pricingHeadline: hl })} />
            </div>
          )}

          {section === 'alteracoes' && (
            <div style={{ maxWidth: 480, display: 'flex', flexDirection: 'column', gap: 16 }}>
              <h3 style={{ margin: '0 0 4px', fontSize: 16, fontWeight: 700, color: 'var(--t1)' }}>Informações Importantes — Slide 9</h3>
              <p style={{ margin: 0, fontSize: 12, color: 'var(--t3)' }}>Taxas cobradas por alterações além do incluso.</p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <div>
                  <label style={labelStyle}>Taxa — Alteração de Esboço (R$)</label>
                  <input type="number" value={local.alteracaoEsboco} onChange={e => upd({ alteracaoEsboco: Number(e.target.value) })} style={inputStyle} />
                  <div style={{ fontSize: 11, color: 'var(--t4)', marginTop: 4 }}>Alterações básicas no esboço</div>
                </div>
                <div>
                  <label style={labelStyle}>Taxa — Alteração de Cor (R$)</label>
                  <input type="number" value={local.alteracaoCor} onChange={e => upd({ alteracaoCor: Number(e.target.value) })} style={inputStyle} />
                  <div style={{ fontSize: 11, color: 'var(--t4)', marginTop: 4 }}>Alterações de cores</div>
                </div>
              </div>
              <div style={{ padding: 14, background: 'var(--s1)', borderRadius: 10, border: '1px solid var(--b1)', fontSize: 12, color: 'var(--t2)', lineHeight: 1.6 }}>
                <strong>Pré-visualização:</strong><br />
                R${local.alteracaoEsboco},00 em alterações básicas no esboço<br />
                R${local.alteracaoCor},00 em alterações de cor.
              </div>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}

// ─── Slide Components (Viewer) ────────────────────────────────────────────────

// Slide design tokens
const SBG = '#f8f7f5';
const SDARK = '#1a1a2e';
const SBLUE = '#356BFF';
const STEXT = '#3d3f52';
const SMUTED = '#7f8194';
const SBORDER = '#eaebee';
const SCARDSH = '0 2px 16px rgba(0,0,0,0.07)';
const SPH = '48px'; // horizontal padding
const SFONT = 'AktivGrotesk, system-ui, sans-serif';

// ─── Dark Theme Tokens ────────────────────────────────────────────────────────

const D_BG  = 'linear-gradient(145deg, #060912 0%, #0b1028 35%, #0d1640 60%, #060912 100%)';
const D_CARD  = 'rgba(255,255,255,0.06)';
const D_T1    = 'rgba(255,255,255,0.92)';
const D_T2    = 'rgba(255,255,255,0.58)';
const D_T3    = 'rgba(255,255,255,0.32)';
const D_BORDER  = 'rgba(255,255,255,0.09)';
const D_BORDER2 = 'rgba(255,255,255,0.16)';
const D_BSOFT   = 'rgba(53,107,255,0.18)';
const D_BGLOW   = 'rgba(53,107,255,0.32)';

function SlideHeader({ step, label, next }: { step: number; label: string; next: number }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: `20px ${SPH} 0`, flexShrink: 0, fontFamily: SFONT }}>
      <img src={LogoDark} alt="Evo Studio" style={{ height: 26, objectFit: 'contain' }} />
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        {[0, 1].map(i => (
          <span key={i} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ width: 16, height: 16, borderRadius: '50%', background: SBLUE, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <FiCheck size={8} color="#fff" />
            </span>
            <span style={{ width: 20, height: 1, background: SBORDER }} />
          </span>
        ))}
        <span style={{ background: SDARK, borderRadius: 20, padding: '4px 12px', fontSize: 9, color: '#fff', fontWeight: 700, letterSpacing: '0.3px' }}>
          {step} · {label}
        </span>
        <span style={{ width: 20, height: 1, background: SBORDER }} />
        <span style={{ width: 16, height: 16, borderRadius: '50%', border: `1.5px solid ${SBORDER}`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 8, color: SMUTED, fontWeight: 700 }}>{next}</span>
      </div>
    </div>
  );
}

function SlideFooter({ dark = false }: { dark?: boolean }) {
  const textColor = dark ? 'rgba(255,255,255,0.35)' : SMUTED;
  const valColor  = dark ? 'rgba(255,255,255,0.6)'  : STEXT;
  return (
    <div style={{ padding: `0 ${SPH} 16px`, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0, fontFamily: SFONT }}>
      <img src={SeloLogo} alt="" style={{ height: 30, width: 30, objectFit: 'contain', opacity: dark ? 0.6 : 0.8 }} />
      <div style={{ display: 'flex', gap: 32 }}>
        {[['E-MAIL', 'contatoevostudio@gmail.com'], ['CONTATO', '+55 (11) 98016-8342']].map(([label, val]) => (
          <div key={label}>
            <div style={{ fontSize: 7, fontWeight: 700, letterSpacing: '1px', color: textColor, textTransform: 'uppercase', marginBottom: 2 }}>{label}</div>
            <div style={{ fontSize: 9, color: valColor, fontWeight: 500 }}>{val}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function Slide1Cover({ p }: { p: Proposal }) {
  return (
    <div style={{ width: '100%', height: '100%', position: 'relative', overflow: 'hidden', display: 'flex', flexDirection: 'column', fontFamily: 'AktivGrotesk, system-ui, sans-serif' }}>
      <img src={BG1} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center' }} />
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(5,8,25,0.38)' }} />
      {/* Top */}
      <div style={{ position: 'relative', zIndex: 1, padding: '26px 36px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <img src={LogoWhite} alt="Evo Studio" style={{ height: 32, objectFit: 'contain' }} />
        <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.85)', fontWeight: 400 }}>
          <span style={{ fontWeight: 700 }}>Validade:</span> {p.validity}
        </div>
      </div>
      {/* Center */}
      <div style={{ position: 'relative', zIndex: 1, flex: 1, display: 'flex', alignItems: 'center', padding: '0 36px' }}>
        <div>
          <div style={{ fontSize: 64, fontWeight: 400, color: 'rgba(255,255,255,0.92)', lineHeight: 1.05, marginBottom: 2 }}>Proposta</div>
          <div style={{ fontSize: 64, fontWeight: 700, color: 'rgba(255,255,255,0.98)', lineHeight: 1.05 }}>Comercial</div>
          <div style={{ width: 180, height: 1, background: 'rgba(255,255,255,0.35)', margin: '18px 0 10px' }} />
          <div style={{ fontSize: 16, color: 'rgba(255,255,255,0.65)', fontWeight: 400 }}>{proposalMonth(p.createdAt)}</div>
        </div>
      </div>
      {/* Bottom */}
      <div style={{ position: 'relative', zIndex: 1, padding: '0 36px 24px', display: 'flex', justifyContent: 'space-between' }}>
        <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.75)' }}><span style={{ fontWeight: 700 }}>Cliente:</span> {p.clientName}</div>
        <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.75)' }}><span style={{ fontWeight: 700 }}>Serviço:</span> {SERVICE_LABELS[p.service]}</div>
      </div>
    </div>
  );
}

function Slide2SobreNos({ p }: { p: Proposal }) {
  return (
    <div style={{ width: '100%', height: '100%', background: SBG, display: 'flex', flexDirection: 'column', fontFamily: SFONT }}>
      <SlideHeader step={2} label="Sobre Nós" next={3} />
      <div style={{ flex: 1, display: 'flex', padding: `16px ${SPH} 0`, gap: 48, alignItems: 'center' }}>
        {/* Left */}
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 44, fontWeight: 700, color: SBLUE, lineHeight: 1.1, marginBottom: 20 }}>Sobre nós:</div>
          <p style={{ margin: '0 0 14px', fontSize: 13, color: STEXT, lineHeight: 1.75 }}>
            Muito prazer, somos a <strong style={{ color: SDARK }}>EVO Studio.</strong>
          </p>
          <p style={{ margin: '0 0 14px', fontSize: 13, color: STEXT, lineHeight: 1.75 }}>
            Estamos aqui para transformar ideias em resultados reais. Nosso time de especialistas trabalha lado a lado com você, entendendo suas necessidades e trazendo soluções personalizadas que elevam sua marca.
          </p>
          <p style={{ margin: 0, fontSize: 13, color: STEXT, lineHeight: 1.75 }}>
            Seja qual for o desafio, <strong style={{ color: SDARK }}>estamos prontos para entregar mais do que o esperado.</strong> Vamos juntos criar algo marcante para o seu projeto.
          </p>
        </div>
        {/* Right: image */}
        <div style={{ flex: 0.85, display: 'flex', alignItems: 'center' }}>
          {p.slide2Image ? (
            <img src={p.slide2Image} alt="" style={{ width: '100%', height: 310, objectFit: 'cover', borderRadius: 20, boxShadow: '0 20px 60px rgba(0,0,0,0.16)' }} />
          ) : (
            <div style={{ width: '100%', height: 310, background: 'linear-gradient(145deg, #e8f0ff, #cfdeff)', borderRadius: 20, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 14, boxShadow: '0 20px 60px rgba(53,107,255,0.12)' }}>
              <img src={LogoDark} alt="Evo Studio" style={{ height: 40, objectFit: 'contain', opacity: 0.5 }} />
              <span style={{ fontSize: 10, color: SMUTED, fontWeight: 500 }}>Adicione uma foto no editor</span>
            </div>
          )}
        </div>
      </div>
      <SlideFooter />
    </div>
  );
}

function Slide3Clientes() {
  const cards = [
    { Icon: FiCheckCircle, title: 'Velocidade sem perder qualidade', desc: 'Trabalhamos com eficiência, mas sempre mantendo o mais alto nível de qualidade.' },
    { Icon: FiStar, title: 'Soluções sob medida para o seu negócio', desc: 'Sem fórmulas prontas — nosso foco é entregar soluções pensadas especialmente para você.' },
    { Icon: FiMessageSquare, title: 'Profissionais que vivem o que fazem', desc: 'Não trabalhamos apenas com design e marketing, nós vivemos isso todos os dias!' },
  ];
  return (
    <div style={{ width: '100%', height: '100%', background: SBG, display: 'flex', flexDirection: 'column', fontFamily: SFONT }}>
      <SlideHeader step={3} label="Por que a Evo" next={4} />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: `0 ${SPH}` }}>
        <div style={{ fontSize: 44, fontWeight: 700, color: SDARK, textAlign: 'center', lineHeight: 1.15, marginBottom: 28 }}>
          Porque os clientes<br />escolhem a Evo
        </div>
        <div style={{ display: 'flex', gap: 20, width: '100%' }}>
          {cards.map((c, i) => (
            <div key={i} style={{ flex: 1, background: '#fff', borderRadius: 16, padding: '22px 20px', border: `1px solid ${SBORDER}`, boxShadow: SCARDSH }}>
              <div style={{ display: 'flex', alignItems: 'center', marginBottom: 14 }}>
                <div style={{ width: 42, height: 42, borderRadius: 12, background: '#EEF2FF', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <c.Icon size={18} color={SBLUE} />
                </div>
                <div style={{ width: 1, height: 40, background: '#d8e4ff', margin: '0 14px', flexShrink: 0 }} />
                <div style={{ fontSize: 12, fontWeight: 700, color: SBLUE, lineHeight: 1.35 }}>{c.title}</div>
              </div>
              <div style={{ fontSize: 12, color: SMUTED, lineHeight: 1.65, paddingLeft: 2 }}>{c.desc}</div>
            </div>
          ))}
        </div>
      </div>
      <SlideFooter />
    </div>
  );
}

function Slide4Processo() {
  const steps = [
    { Icon: FiClipboard, title: 'Briefing',      items: ['Coleta de informações', 'Clareza de dúvidas', 'Envio de briefing'] },
    { Icon: FiSearch,    title: 'Pesquisa',      items: ['Pesquisa de referências', 'Criação de moodboard', 'Estruturação'] },
    { Icon: FiEdit3,     title: 'Criação',       items: ['Criação do esboço', 'Refinamento'] },
    { Icon: FiImage,     title: 'Apresentação',  items: ['Ideia aplicada', 'Sugestões de uso', 'Aprovações / Alterações'] },
    { Icon: FiCheckCircle, title: 'Entrega',     items: ['Finalização', 'Entrega final'] },
  ];
  return (
    <div style={{ width: '100%', height: '100%', background: SBG, display: 'flex', flexDirection: 'column', fontFamily: SFONT }}>
      <SlideHeader step={4} label="Nosso Processo" next={5} />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: `0 ${SPH}` }}>
        <div style={{ fontSize: 44, fontWeight: 700, color: SDARK, marginBottom: 40, textAlign: 'center' }}>Nosso processo</div>
        <div style={{ display: 'flex', alignItems: 'flex-start', width: '100%' }}>
          {steps.map((s, i) => (
            <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative' }}>
              {i < steps.length - 1 && (
                <div style={{ position: 'absolute', top: 22, left: '50%', width: '100%', height: 1, background: SBORDER, zIndex: 0 }} />
              )}
              <div style={{ width: 44, height: 44, borderRadius: '50%', border: `2px solid ${SBLUE}`, background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', zIndex: 1, marginBottom: 14, boxShadow: `0 0 0 4px ${SBG}` }}>
                <s.Icon size={16} color={SBLUE} />
              </div>
              <div style={{ fontSize: 13, fontWeight: 700, color: SDARK, marginBottom: 8, textAlign: 'center' }}>{s.title}</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 3, alignItems: 'center' }}>
                {s.items.map((it, j) => (
                  <div key={j} style={{ fontSize: 10, color: SMUTED, lineHeight: 1.55, textAlign: 'center' }}>· {it}</div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
      <SlideFooter />
    </div>
  );
}

function Slide5Or6Portfolio({ section, stepNum }: { section: PortfolioSection; stepNum: number }) {
  return (
    <div style={{ width: '100%', height: '100%', background: SBG, display: 'flex', flexDirection: 'column', fontFamily: SFONT }}>
      <SlideHeader step={stepNum} label="Portfolio" next={stepNum + 1} />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: `10px ${SPH} 0`, overflow: 'hidden' }}>
        <div style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 22, fontWeight: 700, color: SDARK }}>{section.title}</div>
          <div style={{ fontSize: 12, color: SMUTED, marginTop: 2 }}>{section.subtitle}</div>
        </div>
        <div style={{ flex: 1, minHeight: 0 }}>
          <BentoGridEditor section={section} isViewer={true} />
        </div>
      </div>
      <SlideFooter />
    </div>
  );
}

function Slide7Depoimentos() {
  const orbitPos = [
    { top: '2%',  left: '50%', transform: 'translateX(-50%)' },
    { top: '20%', left: '5%' },
    { top: '20%', right: '5%' },
    { bottom: '22%', left: '12%' },
    { bottom: '22%', right: '12%' },
  ];
  const quotes = [
    '"Superou todas as minhas expectativas!"',
    '"Trabalho incrível, recomendo demais!"',
    '"O logo ficou a cara da minha marca."',
  ];
  return (
    <div style={{ width: '100%', height: '100%', background: SBG, display: 'flex', flexDirection: 'column', fontFamily: SFONT }}>
      <SlideHeader step={7} label="Feedback" next={8} />
      <div style={{ flex: 1, display: 'flex', padding: `10px ${SPH} 0`, gap: 40, alignItems: 'stretch' }}>
        {/* Left: orbital */}
        <div style={{ flex: 1, position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ position: 'absolute', width: 300, height: 300, borderRadius: '50%', border: '1px dashed rgba(53,107,255,0.3)' }} />
          <div style={{ position: 'absolute', width: 200, height: 200, borderRadius: '50%', border: '1px dashed rgba(53,107,255,0.18)' }} />
          <div style={{ position: 'relative', zIndex: 2, textAlign: 'center', padding: '0 20px' }}>
            <div style={{ fontSize: 36, fontWeight: 700, color: SDARK, lineHeight: 1.2 }}>
              +de <span style={{ color: SBLUE }}>47</span><br />clientes
            </div>
            <div style={{ fontSize: 12, color: SMUTED, marginTop: 4, fontWeight: 500 }}>recomendam a Evo</div>
          </div>
          {orbitPos.map((pos, i) => (
            <div key={i} style={{ position: 'absolute', ...pos, width: 48, height: 48, borderRadius: '50%', background: 'linear-gradient(135deg, #d4e2ff, #b8caff)', border: '3px solid #fff', boxShadow: '0 6px 20px rgba(53,107,255,0.22)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 3 }}>
              <FiStar size={16} color={SBLUE} />
            </div>
          ))}
        </div>
        {/* Right: quotes */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 12 }}>
          <div style={{ fontSize: 40, fontWeight: 700, color: SDARK, lineHeight: 1.15, marginBottom: 6 }}>O que dizem<br />nossos clientes:</div>
          {quotes.map((q, i) => (
            <div key={i} style={{ background: '#fff', borderRadius: 12, padding: '12px 16px', boxShadow: SCARDSH, border: `1px solid ${SBORDER}`, display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#EEF2FF', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <FiMessageSquare size={13} color={SBLUE} />
              </div>
              <span style={{ fontSize: 12, color: STEXT, lineHeight: 1.6, fontStyle: 'italic' }}>{q}</span>
            </div>
          ))}
          <div style={{ background: SDARK, borderRadius: 14, padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 14, marginTop: 4 }}>
            <div style={{ width: 40, height: 40, borderRadius: '50%', background: SBLUE, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <img src={SeloLogo} alt="" style={{ height: 26, width: 26, objectFit: 'contain', filter: 'brightness(10)' }} />
            </div>
            <div>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.85)', lineHeight: 1.65, fontStyle: 'italic' }}>
                "A EVO captou exatamente o que a gente precisava! Criativos, ágeis e sempre prontos para resolver qualquer detalhe."
              </div>
              <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.4)', marginTop: 5, fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase' }}>Cliente verificado</div>
            </div>
          </div>
        </div>
      </div>
      <SlideFooter />
    </div>
  );
}

function Slide8Investimento({ p }: { p: Proposal }) {
  const count = p.pricingOptions.length;
  return (
    <div style={{ width: '100%', height: '100%', background: SBG, display: 'flex', flexDirection: 'column', fontFamily: SFONT }}>
      <SlideHeader step={8} label="Investimento" next={9} />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: `16px ${SPH} 16px` }}>
        <div style={{ fontSize: 28, fontWeight: 700, color: SDARK, textAlign: 'center', marginBottom: 28, lineHeight: 1.2 }}>
          Um <span style={{ color: SBLUE }}>investimento</span> para oportunidades maiores
        </div>
        {/* Cards row — mais vendido gets margin-top offset to "float" */}
        <div style={{ display: 'flex', gap: 16, justifyContent: 'center', alignItems: 'flex-end', paddingTop: 20 }}>
          {p.pricingOptions.map((opt) => {
            const hero = opt.isMostSold;
            return (
              <div key={opt.id} style={{
                flex: count === 1 ? '0 0 380px' : 1,
                maxWidth: 320,
                display: 'flex', flexDirection: 'column',
                borderRadius: 18,
                overflow: 'visible',
                position: 'relative',
                /* Hero card floats higher */
                marginBottom: hero ? 0 : 20,
                /* Hero card has glow ring */
                filter: hero ? 'drop-shadow(0 20px 48px rgba(53,107,255,0.38))' : 'none',
              }}>
                {/* MAIS VENDIDO badge — only on hero, floats above card */}
                {hero && (
                  <div style={{
                    position: 'absolute', top: -18, left: '50%', transform: 'translateX(-50%)',
                    background: 'linear-gradient(90deg, #2a56e8, #356BFF, #6490ff)',
                    borderRadius: 20, padding: '5px 18px',
                    fontSize: 9, fontWeight: 700, color: '#fff',
                    whiteSpace: 'nowrap', letterSpacing: '1px', textTransform: 'uppercase',
                    boxShadow: '0 4px 16px rgba(53,107,255,0.5)',
                  }}>★ MAIS VENDIDO</div>
                )}
                {/* Card itself */}
                <div style={{
                  flex: 1, display: 'flex', flexDirection: 'column',
                  background: hero ? SDARK : '#fff',
                  borderRadius: 18,
                  border: hero ? `2px solid ${SBLUE}` : `1px solid ${SBORDER}`,
                  overflow: 'hidden',
                }}>
                  {/* Body */}
                  <div style={{ flex: 1, padding: '22px 20px 16px' }}>
                    <div style={{ marginBottom: 16 }}>
                      <div style={{ fontSize: 15, fontWeight: 700, color: hero ? '#fff' : SDARK }}>{opt.name}</div>
                      <div style={{ fontSize: 11, color: SBLUE, fontWeight: 600, marginTop: 3 }}>{opt.subtitle}</div>
                    </div>
                    <div style={{ fontSize: 8, fontWeight: 700, color: hero ? 'rgba(255,255,255,0.38)' : SMUTED, marginBottom: 10, textTransform: 'uppercase', letterSpacing: '1px' }}>O que está incluso</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                      {opt.items.slice(0, 7).map((item, j) => (
                        <div key={j} style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                          <div style={{
                            width: 16, height: 16, borderRadius: '50%', flexShrink: 0,
                            border: `1.5px solid ${hero ? 'rgba(53,107,255,0.7)' : SBLUE}`,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            background: hero ? 'rgba(53,107,255,0.15)' : 'transparent',
                          }}>
                            <FiCheck size={8} color={SBLUE} />
                          </div>
                          <span style={{ fontSize: 10, color: hero ? 'rgba(255,255,255,0.82)' : STEXT, lineHeight: 1.4 }}>{item}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  {/* Price section */}
                  <div style={{ background: SBLUE, padding: '14px 20px' }}>
                    <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.58)', textDecoration: 'line-through', marginBottom: 3 }}>De {formatBRL(opt.fullPrice)}</div>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 5 }}>
                      <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.75)', fontWeight: 400 }}>por</span>
                      <span style={{ fontSize: hero ? 28 : 24, fontWeight: 700, color: '#fff', lineHeight: 1 }}>{formatBRL(opt.discountedPrice)}</span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
      <SlideFooter />
    </div>
  );
}

function Slide9InfoImportantes({ p }: { p: Proposal }) {
  const bullets = [
    { link: 'prazo acordado via WhatsApp', text: 'Garantimos a entrega conforme o {link}, respeitando a particularidade de cada projeto.' },
    { link: 'após briefing preenchido', text: 'O projeto será iniciado {link} e o pagamento de 50% do valor, ou 100% antecipado.' },
    { link: 'Google Drive', text: 'Os arquivos finalizados serão enviados via {link}, separados por pastas de forma organizada.' },
  ];
  return (
    <div style={{ width: '100%', height: '100%', background: SBG, display: 'flex', flexDirection: 'column', fontFamily: SFONT }}>
      <SlideHeader step={9} label="Informações" next={10} />
      <div style={{ flex: 1, display: 'flex', padding: `10px ${SPH} 0`, gap: 48 }}>
        {/* Left */}
        <div style={{ flex: 1.05, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <div style={{ fontSize: 42, fontWeight: 700, color: SDARK, lineHeight: 1.1, marginBottom: 24 }}>
            Informações<br /><span style={{ color: SBLUE }}>importantes:</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {bullets.map(({ link, text }, idx) => (
              <div key={idx} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                <div style={{ width: 22, height: 22, borderRadius: '50%', background: SBLUE, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1 }}>
                  <span style={{ fontSize: 9, color: '#fff', fontWeight: 700 }}>{idx + 1}</span>
                </div>
                <div style={{ fontSize: 12, color: STEXT, lineHeight: 1.7 }}>
                  {text.split('{link}')[0]}
                  <span style={{ color: SBLUE, fontWeight: 700 }}>{link}</span>
                  {text.split('{link}')[1] ?? ''}
                </div>
              </div>
            ))}
          </div>
        </div>
        {/* Right */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 16 }}>
          <div style={{ background: '#fff', borderRadius: 16, padding: '18px 20px', border: `1px solid ${SBORDER}`, boxShadow: SCARDSH }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: SDARK, marginBottom: 10 }}>Alterações além do incluso</div>
            <div style={{ fontSize: 12, color: STEXT, lineHeight: 1.7, marginBottom: 12 }}>
              Após o primeiro rascunho, você possui <span style={{ color: SBLUE, fontWeight: 700 }}>2 alterações gratuitas</span>. Além disso:
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {[[p.alteracaoEsboco, 'alteração básica no esboço'], [p.alteracaoCor, 'alteração de cor']].map(([val, label]) => (
                <div key={String(label)} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: 14, fontWeight: 700, color: SBLUE }}>R${val},00</span>
                  <span style={{ fontSize: 11, color: SMUTED }}>— {label}</span>
                </div>
              ))}
            </div>
          </div>
          <div style={{ background: '#fff', borderRadius: 16, padding: '18px 20px', border: `1px solid ${SBORDER}`, boxShadow: SCARDSH }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: SDARK, marginBottom: 10 }}>Desistência do serviço</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {[
                ['Se o esboço não foi apresentado,', 'todo pagamento feito será devolvido.'],
                ['Se o esboço já foi apresentado,', 'não será devolvida a primeira metade.'],
              ].map(([cond, consq], i) => (
                <div key={i} style={{ display: 'flex', gap: 10 }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: SBLUE, flexShrink: 0 }}>{i + 1})</span>
                  <span style={{ fontSize: 11, color: STEXT, lineHeight: 1.6 }}><strong style={{ color: SDARK }}>{cond}</strong> {consq}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
      <SlideFooter />
    </div>
  );
}

function Slide10OutrosServicos() {
  const services = ['Design', 'Social Media', 'Web Design', 'Logotipo Atlética', 'Ilustração', 'Motion Design', 'Ui/Ux', 'Animação', 'Edição de Vídeos', 'E-commerce', 'Landing Page', 'Tráfego Pago'];
  return (
    <div style={{ width: '100%', height: '100%', background: SBG, display: 'flex', flexDirection: 'column', fontFamily: SFONT }}>
      <SlideHeader step={10} label="Outros Serviços" next={11} />
      <div style={{ flex: 1, display: 'flex', padding: `10px ${SPH} 0`, gap: 48, alignItems: 'center' }}>
        <div style={{ flex: '0 0 220px' }}>
          <div style={{ fontSize: 46, fontWeight: 700, color: SBLUE, marginBottom: 14, lineHeight: 1.05 }}>Outros<br />serviços</div>
          <p style={{ margin: '0 0 14px', fontSize: 12, color: STEXT, lineHeight: 1.7 }}>
            Aqui na <strong style={{ color: SDARK }}>Evo Studio</strong>, oferecemos uma variedade de serviços para resolver de vez todos os seus problemas em um só lugar!
          </p>
          <div style={{ fontSize: 12, fontWeight: 700, color: SDARK }}>Confira o que podemos fazer por você:</div>
        </div>
        <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
          {services.map(s => (
            <div key={s} style={{ border: `1.5px solid ${SBLUE}`, borderRadius: 24, padding: '7px 14px', display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(53,107,255,0.03)' }}>
              <FiChevronRight size={11} color={SBLUE} style={{ flexShrink: 0 }} />
              <span style={{ fontSize: 11, color: SBLUE, fontWeight: 600 }}>{s}</span>
            </div>
          ))}
        </div>
      </div>
      <SlideFooter />
    </div>
  );
}

function Slide11Paises() {
  const countries = [
    { flag: '🇧🇷', name: 'Brasil' },
    { flag: '🇺🇸', name: 'Estados Unidos' },
    { flag: '🇵🇹', name: 'Portugal' },
    { flag: '🇪🇸', name: 'Espanha' },
    { flag: '🇫🇷', name: 'França' },
  ];
  return (
    <div style={{ width: '100%', height: '100%', background: SBG, display: 'flex', flexDirection: 'column', fontFamily: SFONT }}>
      <SlideHeader step={11} label="Alcance Global" next={12} />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', padding: `0 ${SPH}`, gap: 32 }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 46, fontWeight: 700, color: SDARK, lineHeight: 1.1 }}>
            Países que já confiam na <span style={{ color: SBLUE }}>Evo</span>
          </div>
          <div style={{ fontSize: 13, color: SMUTED, marginTop: 10 }}>
            Atendemos clientes em 5 países com excelência e dedicação
          </div>
        </div>
        <div style={{ display: 'flex', gap: 16, justifyContent: 'center' }}>
          {countries.map(c => (
            <div key={c.name} style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14,
              background: '#fff', borderRadius: 20, padding: '28px 24px',
              border: `1px solid ${SBORDER}`, boxShadow: SCARDSH,
              minWidth: 130,
            }}>
              <span style={{ fontSize: 44, lineHeight: 1 }}>{c.flag}</span>
              <span style={{ fontSize: 11, fontWeight: 700, color: STEXT, textAlign: 'center', lineHeight: 1.3 }}>{c.name}</span>
            </div>
          ))}
        </div>
      </div>
      <SlideFooter />
    </div>
  );
}

function Slide12Closing() {
  return (
    <div style={{ width: '100%', height: '100%', position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', fontFamily: SFONT, overflow: 'hidden' }}>
      <img src={BG1} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center' }} />
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(5,8,25,0.55)' }} />
      {/* Logo */}
      <img src={LogoWhite} alt="Evo Studio" style={{ height: 36, objectFit: 'contain', marginBottom: 40, position: 'relative', zIndex: 1 }} />
      {/* Quote card */}
      <div style={{ width: 600, borderRadius: 20, overflow: 'hidden', boxShadow: '0 24px 80px rgba(0,0,0,0.4)', position: 'relative', zIndex: 1 }}>
        <div style={{ height: 6, background: `linear-gradient(90deg, ${SBLUE}, #7aa0ff)` }} />
        <div style={{ background: '#fff', padding: '28px 36px' }}>
          <div style={{ fontSize: 14, color: STEXT, lineHeight: 1.8, marginBottom: 16, fontStyle: 'italic' }}>
            "Empresas que investem consistentemente em marketing digital e inovação têm <span style={{ color: SBLUE, fontWeight: 700, fontStyle: 'normal' }}>3× mais chances de aumentar sua receita</span> em até 24 meses."
          </div>
          <div style={{ fontSize: 11, color: SMUTED, fontWeight: 600, letterSpacing: '0.3px' }}>McKinsey & Company</div>
        </div>
      </div>
      {/* CTA */}
      <div style={{ marginTop: 32, fontSize: 13, color: 'rgba(255,255,255,0.55)', position: 'relative', zIndex: 1 }}>
        Vamos começar? <span style={{ color: SBLUE, fontWeight: 700 }}>contatoevostudio@gmail.com</span>
      </div>
    </div>
  );
}

// ─── Dark Theme Slides ────────────────────────────────────────────────────────

function D_SlideHeader({ step, label }: { step: number; label: string; next?: number }) {
  const TOTAL = 12;
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: `20px ${SPH} 0`, flexShrink: 0, fontFamily: SFONT }}>
      <img src={LogoWhite} alt="Evo Studio" style={{ height: 26, objectFit: 'contain' }} />
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ display: 'flex', gap: 3 }}>
          {Array.from({ length: TOTAL }, (_, i) => (
            <div key={i} style={{ width: 16, height: 3, borderRadius: 2, background: i < step ? SBLUE : D_BORDER, boxShadow: i < step ? '0 0 5px rgba(53,107,255,0.55)' : 'none' }} />
          ))}
        </div>
        <span style={{ background: D_CARD, border: `1px solid ${D_BORDER2}`, borderRadius: 20, padding: '4px 12px', fontSize: 9, color: D_T1, fontWeight: 700, letterSpacing: '0.3px' }}>
          {step} · {label}
        </span>
      </div>
    </div>
  );
}

function D_Slide1Cover({ p }: { p: Proposal }) {
  return (
    <div style={{ width: '100%', height: '100%', position: 'relative', overflow: 'hidden', display: 'flex', flexDirection: 'column', fontFamily: SFONT, background: D_BG }}>
      <div style={{ position: 'absolute', inset: 0, backgroundImage: 'radial-gradient(rgba(255,255,255,0.025) 1px, transparent 1px)', backgroundSize: '28px 28px', pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', right: -80, top: '50%', transform: 'translateY(-50%)', width: 520, height: 520, borderRadius: '50%', background: 'radial-gradient(circle, rgba(53,107,255,0.22) 0%, transparent 65%)', pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 3, background: `linear-gradient(180deg, transparent 0%, ${SBLUE} 25%, ${SBLUE} 75%, transparent 100%)` }} />
      <div style={{ position: 'relative', zIndex: 1, padding: '26px 36px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <img src={LogoWhite} alt="Evo Studio" style={{ height: 32, objectFit: 'contain' }} />
        <div style={{ fontSize: 12, color: D_T2, background: D_CARD, border: `1px solid ${D_BORDER2}`, borderRadius: 20, padding: '5px 16px' }}>
          Validade: <span style={{ fontWeight: 700, color: D_T1 }}>{p.validity}</span>
        </div>
      </div>
      <div style={{ position: 'relative', zIndex: 1, flex: 1, display: 'flex', alignItems: 'center', padding: '0 36px' }}>
        <div>
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '3px', textTransform: 'uppercase', color: SBLUE, marginBottom: 18 }}>EVO Studio · Proposta Comercial</div>
          <div style={{ fontSize: 64, fontWeight: 400, color: D_T1, lineHeight: 1.0, marginBottom: 2 }}>Proposta</div>
          <div style={{ fontSize: 64, fontWeight: 700, color: SBLUE, lineHeight: 1.0 }}>Comercial</div>
          <div style={{ width: 56, height: 3, background: SBLUE, margin: '22px 0 18px', borderRadius: 2 }} />
          <div style={{ fontSize: 15, fontWeight: 300, color: D_T3, marginBottom: 6 }}>Para</div>
          <div style={{ fontSize: 34, fontWeight: 700, color: D_T1, lineHeight: 1.1, textShadow: '0 0 30px rgba(255,255,255,0.12)' }}>{p.clientName}</div>
          <div style={{ fontSize: 13, color: D_T3, marginTop: 10, fontWeight: 400 }}>{proposalMonth(p.createdAt)} · {SERVICE_LABELS[p.service]}</div>
        </div>
      </div>
      <div style={{ position: 'relative', zIndex: 1, padding: '0 36px 24px' }} />
    </div>
  );
}

function D_Slide2SobreNos({ p }: { p: Proposal }) {
  const miniStats = [
    { value: '47+', label: 'Clientes' },
    { value: '5', label: 'Países' },
    { value: '100%', label: 'Dedicação' },
  ];
  return (
    <div style={{ width: '100%', height: '100%', background: D_BG, display: 'flex', flexDirection: 'column', fontFamily: SFONT }}>
      <D_SlideHeader step={2} label="Sobre Nós" next={3} />
      <div style={{ flex: 1, display: 'flex', padding: `14px ${SPH} 0`, gap: 44, alignItems: 'center' }}>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          <div style={{ fontSize: 40, fontWeight: 700, color: SBLUE, lineHeight: 1.1, marginBottom: 16 }}>Sobre nós:</div>
          <p style={{ margin: '0 0 10px', fontSize: 12.5, color: D_T2, lineHeight: 1.72 }}>
            Muito prazer, somos a <strong style={{ color: D_T1 }}>EVO Studio.</strong>
          </p>
          <p style={{ margin: '0 0 10px', fontSize: 12.5, color: D_T2, lineHeight: 1.72 }}>
            Estamos aqui para transformar ideias em resultados reais. Nosso time de especialistas trabalha lado a lado com você, entendendo suas necessidades e trazendo soluções personalizadas que elevam sua marca.
          </p>
          <p style={{ margin: '0 0 18px', fontSize: 12.5, color: D_T2, lineHeight: 1.72 }}>
            Seja qual for o desafio, <strong style={{ color: D_T1 }}>estamos prontos para entregar mais do que o esperado.</strong>
          </p>
          {/* Stat row — Finance-style stat cards */}
          <div style={{ display: 'flex', gap: 10 }}>
            {miniStats.map(s => (
              <div key={s.label} style={{ flex: 1, background: D_CARD, border: `1px solid ${D_BORDER2}`, borderRadius: 12, padding: '12px 14px', textAlign: 'center', boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.06)' }}>
                <div style={{ fontSize: 22, fontWeight: 700, color: SBLUE, lineHeight: 1, textShadow: '0 0 16px rgba(53,107,255,0.55)' }}>{s.value}</div>
                <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '1.5px', textTransform: 'uppercase', color: D_T3, marginTop: 4 }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>
        <div style={{ flex: 0.82, display: 'flex', alignItems: 'center' }}>
          {p.slide2Image ? (
            <img src={p.slide2Image} alt="" style={{ width: '100%', height: 296, objectFit: 'cover', borderRadius: 20, boxShadow: `0 20px 60px rgba(0,0,0,0.55), 0 0 0 1px ${D_BORDER2}` }} />
          ) : (
            <div style={{ width: '100%', height: 296, background: D_CARD, borderRadius: 20, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 14, border: `1px solid ${D_BORDER2}`, boxShadow: `0 0 40px ${D_BGLOW}` }}>
              <img src={LogoWhite} alt="" style={{ height: 40, objectFit: 'contain', opacity: 0.22 }} />
              <span style={{ fontSize: 10, color: D_T3, fontWeight: 500 }}>Adicione uma foto no editor</span>
            </div>
          )}
        </div>
      </div>
      <SlideFooter dark />
    </div>
  );
}

function D_Slide3Clientes() {
  const features = [
    { Icon: FiCheckCircle, title: 'Velocidade sem perder qualidade', desc: 'Trabalhamos com eficiência, mas sempre mantendo o mais alto nível de qualidade.' },
    { Icon: FiStar,         title: 'Soluções sob medida para o seu negócio', desc: 'Sem fórmulas prontas — nosso foco é entregar soluções pensadas especialmente para você.' },
    { Icon: FiMessageSquare, title: 'Profissionais que vivem o que fazem', desc: 'Não trabalhamos apenas com design e marketing, nós vivemos isso todos os dias!' },
  ];
  const R = 68, SW = 9, SZ = 160, CX = 80, CY = 80;
  const C = 2 * Math.PI * R;
  return (
    <div style={{ width: '100%', height: '100%', background: D_BG, display: 'flex', flexDirection: 'column', fontFamily: SFONT }}>
      <D_SlideHeader step={3} label="Por que a Evo" next={4} />
      <div style={{ flex: 1, display: 'flex', padding: `14px ${SPH} 0`, gap: 48, alignItems: 'center' }}>
        {/* Left: SVG Ring stat (StreakCard pattern) */}
        <div style={{ flex: '0 0 200px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
          <div style={{ position: 'relative', width: SZ, height: SZ }}>
            <svg width={SZ} height={SZ} style={{ transform: 'rotate(-90deg)' }}>
              <circle cx={CX} cy={CY} r={R} stroke="rgba(255,255,255,0.07)" strokeWidth={SW} fill="none" />
              <circle cx={CX} cy={CY} r={R} stroke={SBLUE} strokeWidth={SW} fill="none"
                strokeLinecap="round" strokeDasharray={C} strokeDashoffset={C * 0.12}
                style={{ filter: 'drop-shadow(0 0 8px rgba(53,107,255,0.85))' }} />
            </svg>
            <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{ fontSize: 30, fontWeight: 700, color: D_T1, lineHeight: 1, letterSpacing: '-1px', textShadow: '0 0 20px rgba(53,107,255,0.6)' }}>47+</div>
              <div style={{ fontSize: 8, fontWeight: 700, letterSpacing: '1.5px', textTransform: 'uppercase', color: D_T3, marginTop: 3 }}>Clientes</div>
            </div>
          </div>
          {/* Mini stat badges — milestone badge pattern */}
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', justifyContent: 'center' }}>
            {[['5', 'Países'], ['3+', 'Anos'], ['★ 5.0', 'Nota']].map(([v, l]) => (
              <div key={l} style={{ background: 'rgba(53,107,255,0.18)', border: '1px solid rgba(53,107,255,0.32)', borderRadius: 20, padding: '4px 12px', boxShadow: '0 0 8px rgba(53,107,255,0.3)', textAlign: 'center' }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: SBLUE }}>{v}</span>
                <span style={{ fontSize: 9, color: D_T3, marginLeft: 4 }}>{l}</span>
              </div>
            ))}
          </div>
        </div>
        {/* Right: title + feature rows */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase', color: D_T3, marginBottom: 8 }}>POR QUE NOS ESCOLHER</div>
          <div style={{ fontSize: 36, fontWeight: 700, color: D_T1, lineHeight: 1.15, marginBottom: 22 }}>
            Porque os clientes<br />escolhem a Evo
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {features.map((f, i) => (
              <div key={i} style={{ display: 'flex', gap: 14, alignItems: 'flex-start', padding: '14px 16px', background: D_CARD, border: `1px solid ${D_BORDER}`, borderRadius: 14, boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.06)' }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: D_BSOFT, border: '1px solid rgba(53,107,255,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: '0 0 12px rgba(53,107,255,0.3)' }}>
                  <f.Icon size={16} color={SBLUE} />
                </div>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: D_T1, marginBottom: 3 }}>{f.title}</div>
                  <div style={{ fontSize: 11, color: D_T2, lineHeight: 1.6 }}>{f.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
      <SlideFooter dark />
    </div>
  );
}

function D_Slide4Processo() {
  const steps = [
    { Icon: FiClipboard,   title: 'Briefing',      items: ['Coleta de informações', 'Clareza de dúvidas', 'Envio de briefing'] },
    { Icon: FiSearch,      title: 'Pesquisa',      items: ['Referências', 'Moodboard', 'Estruturação'] },
    { Icon: FiEdit3,       title: 'Criação',       items: ['Criação do esboço', 'Refinamento'] },
    { Icon: FiImage,       title: 'Apresentação',  items: ['Ideia aplicada', 'Aprovações / Alterações'] },
    { Icon: FiCheckCircle, title: 'Entrega',       items: ['Finalização', 'Entrega final'] },
  ];
  return (
    <div style={{ width: '100%', height: '100%', background: D_BG, display: 'flex', flexDirection: 'column', fontFamily: SFONT }}>
      <D_SlideHeader step={4} label="Nosso Processo" next={5} />
      <div style={{ flex: 1, display: 'flex', padding: `14px ${SPH} 14px`, gap: 44 }}>
        {/* Left: title block */}
        <div style={{ flex: '0 0 270px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase', color: D_T3, marginBottom: 10 }}>METODOLOGIA</div>
          <div style={{ fontSize: 50, fontWeight: 700, color: D_T1, lineHeight: 1.0, marginBottom: 12, textShadow: '0 0 30px rgba(255,255,255,0.08)' }}>Nosso<br /><span style={{ color: SBLUE, textShadow: '0 0 24px rgba(53,107,255,0.5)' }}>processo</span></div>
          <div style={{ fontSize: 12, color: D_T2, lineHeight: 1.65, marginBottom: 24 }}>5 etapas estruturadas para o resultado perfeito.</div>
          {/* Step legend — numbered list with decreasing opacity */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {steps.map((s, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: 20, fontWeight: 700, color: SBLUE, lineHeight: 1.1, width: 28, flexShrink: 0, opacity: 1 - i * 0.15, textShadow: `0 0 10px rgba(53,107,255,${0.55 - i * 0.08})` }}>{String(i + 1).padStart(2, '0')}</span>
                <span style={{ fontSize: 10, color: D_T3, fontWeight: 500, opacity: 1 - i * 0.12 }}>{s.title}</span>
              </div>
            ))}
          </div>
        </div>
        {/* Right: vertical connected step list */}
        <div style={{ flex: 1, maxWidth: 500, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 0 }}>
          {steps.map((s, i) => (
            <div key={i} style={{ display: 'flex', gap: 14, alignItems: 'stretch', paddingBottom: i < 4 ? 8 : 0 }}>
              {/* Circle + connecting line */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
                <div style={{ width: 32, height: 32, borderRadius: '50%', background: D_BSOFT, border: `2px solid ${SBLUE}`, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: `0 0 14px rgba(53,107,255,0.45)`, flexShrink: 0, zIndex: 1 }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: SBLUE }}>{i + 1}</span>
                </div>
                {i < 4 && <div style={{ width: 1, flex: 1, minHeight: 8, background: 'linear-gradient(180deg, rgba(53,107,255,0.5) 0%, rgba(53,107,255,0.08) 100%)', marginTop: 2 }} />}
              </div>
              {/* Card */}
              <div style={{ flex: 1, background: D_CARD, border: `1px solid ${D_BORDER}`, borderRadius: 10, padding: '9px 14px', boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.05)', marginBottom: i < 4 ? 0 : 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <s.Icon size={13} color={SBLUE} />
                  <div style={{ fontSize: 12, fontWeight: 700, color: D_T1 }}>{s.title}</div>
                </div>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {s.items.map((item, j) => (
                    <span key={j} style={{ fontSize: 10, color: D_T3, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 4, padding: '1px 8px' }}>· {item}</span>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
      <SlideFooter dark />
    </div>
  );
}

function D_Slide5Or6Portfolio({ section, stepNum }: { section: PortfolioSection; stepNum: number }) {
  return (
    <div style={{ width: '100%', height: '100%', background: D_BG, display: 'flex', flexDirection: 'column', fontFamily: SFONT }}>
      <D_SlideHeader step={stepNum} label="Portfolio" next={stepNum + 1} />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: `18px ${SPH} 0`, overflow: 'hidden' }}>
        <div style={{ marginBottom: 20, display: 'flex', alignItems: 'flex-start', gap: 14 }}>
          <div style={{ width: 3, height: 56, background: `linear-gradient(180deg, ${SBLUE}, rgba(53,107,255,0.15))`, borderRadius: 2, flexShrink: 0, boxShadow: '0 0 14px rgba(53,107,255,0.5)' }} />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase', color: D_T3, marginBottom: 4 }}>PORTFÓLIO</div>
            <div style={{ fontSize: 22, fontWeight: 700, color: D_T1 }}>{section.title}</div>
            <div style={{ fontSize: 11, color: D_T3, marginTop: 3 }}>{section.subtitle}</div>
          </div>
          <div style={{ background: D_BSOFT, border: '1px solid rgba(53,107,255,0.3)', borderRadius: 12, padding: '8px 16px', textAlign: 'right', flexShrink: 0 }}>
            <div style={{ fontSize: 9, color: D_T3, fontWeight: 600, letterSpacing: '1px', textTransform: 'uppercase' }}>Projeto</div>
            <div style={{ fontSize: 22, fontWeight: 700, color: SBLUE, lineHeight: 1, textShadow: '0 0 12px rgba(53,107,255,0.5)' }}>{stepNum === 5 ? '01' : '02'}</div>
          </div>
        </div>
        <div style={{ flex: 1, minHeight: 0 }}>
          <BentoGridEditor section={section} isViewer={true} />
        </div>
      </div>
      <SlideFooter dark />
    </div>
  );
}

function D_Slide7Depoimentos() {
  const quotes = [
    '"Superou todas as minhas expectativas!"',
    '"Trabalho incrível, recomendo demais!"',
    '"O logo ficou a cara da minha marca."',
  ];
  return (
    <div style={{ width: '100%', height: '100%', background: D_BG, display: 'flex', flexDirection: 'column', fontFamily: SFONT }}>
      <D_SlideHeader step={7} label="Feedback" next={8} />
      <div style={{ flex: 1, display: 'flex', padding: `14px ${SPH} 0`, gap: 40, alignItems: 'stretch' }}>
        {/* Left: Star rating display */}
        <div style={{ flex: '0 0 220px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16 }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 60, lineHeight: 1, color: SBLUE, textShadow: '0 0 30px rgba(53,107,255,0.7)', marginBottom: 4 }}>★</div>
            <div style={{ fontSize: 52, fontWeight: 700, color: D_T1, lineHeight: 1, letterSpacing: '-2px', textShadow: '0 0 30px rgba(255,255,255,0.15)' }}>5.0</div>
            <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase', color: D_T3, marginTop: 6 }}>Avaliação média</div>
          </div>
          <div style={{ display: 'flex', gap: 4 }}>
            {Array.from({ length: 5 }, (_, i) => (
              <span key={i} style={{ fontSize: 16, color: SBLUE, textShadow: '0 0 10px rgba(53,107,255,0.7)' }}>★</span>
            ))}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {[['47+', 'Clientes'], ['3+', 'Anos'], ['100%', 'Satisfação']].map(([v, l]) => (
              <div key={l} style={{ background: 'rgba(53,107,255,0.18)', border: '1px solid rgba(53,107,255,0.32)', borderRadius: 20, padding: '8px 14px', boxShadow: '0 0 8px rgba(53,107,255,0.3)', display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 14, fontWeight: 700, color: SBLUE }}>{v}</span>
                <span style={{ fontSize: 10, color: D_T3 }}>{l}</span>
              </div>
            ))}
          </div>
        </div>
        {/* Right: title + testimonial cards */}
        <div style={{ flex: 1, maxWidth: 580, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 10 }}>
          <div style={{ fontSize: 36, fontWeight: 700, color: D_T1, lineHeight: 1.15, marginBottom: 4 }}>O que dizem<br />nossos clientes:</div>
          {quotes.map((q, i) => (
            <div key={i} style={{ background: D_CARD, borderRadius: 12, padding: '11px 16px', border: `1px solid ${D_BORDER}`, boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 30, height: 30, borderRadius: '50%', background: D_BSOFT, border: '1px solid rgba(53,107,255,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <FiMessageSquare size={12} color={SBLUE} />
              </div>
              <span style={{ fontSize: 12, color: D_T2, lineHeight: 1.6, fontStyle: 'italic' }}>{q}</span>
            </div>
          ))}
          <div style={{ background: 'linear-gradient(135deg, rgba(53,107,255,0.22) 0%, rgba(53,107,255,0.08) 100%)', borderRadius: 14, padding: '13px 18px', display: 'flex', alignItems: 'center', gap: 14, border: '1px solid rgba(53,107,255,0.3)', boxShadow: '0 0 30px rgba(53,107,255,0.12)' }}>
            <div style={{ width: 38, height: 38, borderRadius: '50%', background: SBLUE, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: '0 0 20px rgba(53,107,255,0.6)' }}>
              <img src={SeloLogo} alt="" style={{ height: 24, width: 24, objectFit: 'contain', filter: 'brightness(10)' }} />
            </div>
            <div>
              <div style={{ fontSize: 11, color: D_T2, lineHeight: 1.65, fontStyle: 'italic' }}>"A EVO captou exatamente o que a gente precisava! Criativos, ágeis e sempre prontos para resolver qualquer detalhe."</div>
              <div style={{ fontSize: 9, color: D_T3, marginTop: 4, fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase' }}>Cliente verificado</div>
            </div>
          </div>
        </div>
      </div>
      <SlideFooter dark />
    </div>
  );
}

function D_Slide8Investimento({ p }: { p: Proposal }) {
  const count = p.pricingOptions.length;
  return (
    <div style={{ width: '100%', height: '100%', background: D_BG, display: 'flex', flexDirection: 'column', fontFamily: SFONT }}>
      <D_SlideHeader step={8} label="Investimento" next={9} />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: `16px ${SPH} 16px` }}>
        <div style={{ fontSize: 26, fontWeight: 700, color: D_T1, textAlign: 'center', marginBottom: 28, lineHeight: 1.2 }}>
          Um <span style={{ color: SBLUE, textShadow: '0 0 20px rgba(53,107,255,0.5)' }}>investimento</span> para oportunidades maiores
        </div>
        <div style={{ display: 'flex', gap: 16, justifyContent: 'center', alignItems: 'flex-start', paddingTop: 20 }}>
          {p.pricingOptions.map((opt) => {
            const hero = opt.isMostSold;
            const savings = opt.fullPrice - opt.discountedPrice;
            const savePct = opt.fullPrice > 0 ? Math.round((savings / opt.fullPrice) * 100) : 0;
            return (
              <div key={opt.id} style={{ flex: count === 1 ? '0 0 380px' : 1, maxWidth: 320, display: 'flex', flexDirection: 'column', borderRadius: 18, overflow: 'visible', position: 'relative', filter: hero ? 'drop-shadow(0 20px 48px rgba(53,107,255,0.45))' : 'none' }}>
                {hero && (
                  <div style={{ position: 'absolute', top: -18, left: '50%', transform: 'translateX(-50%)', background: 'linear-gradient(90deg, #2a56e8, #356BFF, #6490ff)', borderRadius: 20, padding: '5px 18px', fontSize: 9, fontWeight: 700, color: '#fff', whiteSpace: 'nowrap', letterSpacing: '1px', textTransform: 'uppercase', boxShadow: '0 4px 16px rgba(53,107,255,0.5)' }}>★ MAIS VENDIDO</div>
                )}
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: hero ? 'linear-gradient(145deg, #12214e, #1a2e6e)' : D_CARD, borderRadius: 18, border: hero ? `2px solid ${SBLUE}` : `1px solid ${D_BORDER2}`, overflow: 'hidden' }}>
                  <div style={{ flex: 1, padding: '20px 20px 14px' }}>
                    <div style={{ marginBottom: 14 }}>
                      <div style={{ fontSize: 15, fontWeight: 700, color: D_T1 }}>{opt.name}</div>
                      <div style={{ fontSize: 11, color: SBLUE, fontWeight: 600, marginTop: 3 }}>{opt.subtitle}</div>
                    </div>
                    <div style={{ fontSize: 8, fontWeight: 700, color: D_T3, marginBottom: 9, textTransform: 'uppercase', letterSpacing: '1px' }}>O que está incluso</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {opt.items.slice(0, 6).map((item, j) => (
                        <div key={j} style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                          <div style={{ width: 14, height: 14, borderRadius: '50%', flexShrink: 0, border: '1.5px solid rgba(53,107,255,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', background: D_BSOFT }}>
                            <FiCheck size={7} color={SBLUE} />
                          </div>
                          <span style={{ fontSize: 10, color: D_T2, lineHeight: 1.4 }}>{item}</span>
                        </div>
                      ))}
                    </div>
                    {/* Savings bar — Finance pattern */}
                    {savePct > 0 && (
                      <div style={{ marginTop: 12 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                          <span style={{ fontSize: 9, color: D_T3, fontWeight: 600, letterSpacing: '1px', textTransform: 'uppercase' }}>Economia</span>
                          <span style={{ fontSize: 9, color: '#30d158', fontWeight: 700 }}>-{savePct}%</span>
                        </div>
                        <div style={{ height: 3, background: 'rgba(255,255,255,0.08)', borderRadius: 2, overflow: 'hidden' }}>
                          <div style={{ height: '100%', width: `${savePct}%`, background: 'linear-gradient(90deg, #30d158, #30d15888)', borderRadius: 2, boxShadow: '0 0 8px rgba(48,209,88,0.6)' }} />
                        </div>
                      </div>
                    )}
                  </div>
                  <div style={{ background: SBLUE, padding: '13px 20px' }}>
                    <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.50)', textDecoration: 'line-through', marginBottom: 2 }}>De {formatBRL(opt.fullPrice)}</div>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 5 }}>
                      <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.65)', fontWeight: 400 }}>por</span>
                      <span style={{ fontSize: hero ? 26 : 22, fontWeight: 700, color: '#fff', lineHeight: 1, textShadow: '0 0 16px rgba(255,255,255,0.4)' }}>{formatBRL(opt.discountedPrice)}</span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
      <SlideFooter dark />
    </div>
  );
}

function D_Slide9InfoImportantes({ p }: { p: Proposal }) {
  const bullets = [
    { link: 'prazo acordado via WhatsApp', text: 'Garantimos a entrega conforme o {link}, respeitando a particularidade de cada projeto.' },
    { link: 'após briefing preenchido', text: 'O projeto será iniciado {link} e o pagamento de 50% do valor, ou 100% antecipado.' },
    { link: 'Google Drive', text: 'Os arquivos finalizados serão enviados via {link}, separados por pastas de forma organizada.' },
  ];
  return (
    <div style={{ width: '100%', height: '100%', background: D_BG, display: 'flex', flexDirection: 'column', fontFamily: SFONT }}>
      <D_SlideHeader step={9} label="Informações" next={10} />
      <div style={{ flex: 1, display: 'flex', padding: `14px ${SPH} 14px`, gap: 36 }}>
        {/* Left: numbered info cards — Finance transaction list pattern */}
        <div style={{ flex: 1.05, display: 'flex', flexDirection: 'column', justifyContent: 'flex-start', paddingTop: 16, gap: 0 }}>
          <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase', color: D_T3, marginBottom: 8 }}>CONDIÇÕES</div>
          <div style={{ fontSize: 38, fontWeight: 700, color: D_T1, lineHeight: 1.1, marginBottom: 20 }}>
            Informações<br /><span style={{ color: SBLUE }}>importantes:</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {bullets.map(({ link, text }, idx) => (
              <div key={idx} style={{ display: 'flex', gap: 14, alignItems: 'flex-start', padding: '13px 16px', background: D_CARD, border: `1px solid ${D_BORDER}`, borderRadius: 12, boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.06)' }}>
                <div style={{ width: 24, height: 24, borderRadius: '50%', background: SBLUE, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: '0 0 12px rgba(53,107,255,0.5)' }}>
                  <span style={{ fontSize: 9, color: '#fff', fontWeight: 700 }}>{idx + 1}</span>
                </div>
                <div style={{ fontSize: 12, color: D_T2, lineHeight: 1.7, paddingTop: 2 }}>
                  {text.split('{link}')[0]}
                  <span style={{ color: SBLUE, fontWeight: 700 }}>{link}</span>
                  {text.split('{link}')[1] ?? ''}
                </div>
              </div>
            ))}
          </div>
        </div>
        {/* Right: policy glass cards */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'flex-start', paddingTop: 16, gap: 12 }}>
          <div style={{ background: D_CARD, borderRadius: 16, padding: '18px 20px', border: `1px solid ${D_BORDER}`, boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.06)' }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: D_T1, marginBottom: 10 }}>Alterações além do incluso</div>
            <div style={{ fontSize: 12, color: D_T2, lineHeight: 1.7, marginBottom: 12 }}>
              Após o primeiro rascunho, você possui <span style={{ color: SBLUE, fontWeight: 700 }}>2 alterações gratuitas</span>. Além disso:
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {[[p.alteracaoEsboco, 'alteração básica no esboço'], [p.alteracaoCor, 'alteração de cor']].map(([val, label]) => (
                <div key={String(label)} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: 14, fontWeight: 700, color: SBLUE, textShadow: '0 0 10px rgba(53,107,255,0.5)' }}>R${val},00</span>
                  <span style={{ fontSize: 11, color: D_T3 }}>— {label}</span>
                </div>
              ))}
            </div>
          </div>
          <div style={{ background: D_CARD, borderRadius: 16, padding: '18px 20px', border: `1px solid ${D_BORDER}`, boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.06)' }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: D_T1, marginBottom: 10 }}>Desistência do serviço</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {[
                ['Se o esboço não foi apresentado,', 'todo pagamento feito será devolvido.'],
                ['Se o esboço já foi apresentado,', 'não será devolvida a primeira metade.'],
              ].map(([cond, consq], i) => (
                <div key={i} style={{ display: 'flex', gap: 10 }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: SBLUE, flexShrink: 0 }}>{i + 1})</span>
                  <span style={{ fontSize: 11, color: D_T2, lineHeight: 1.6 }}><strong style={{ color: D_T1 }}>{cond}</strong> {consq}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
      <SlideFooter dark />
    </div>
  );
}

function D_Slide10OutrosServicos() {
  const services = ['Design', 'Social Media', 'Web Design', 'Logotipo Atlética', 'Ilustração', 'Motion Design', 'Ui/Ux', 'Animação', 'Edição de Vídeos', 'E-commerce', 'Landing Page', 'Tráfego Pago'];
  return (
    <div style={{ width: '100%', height: '100%', background: D_BG, display: 'flex', flexDirection: 'column', fontFamily: SFONT }}>
      <D_SlideHeader step={10} label="Outros Serviços" next={11} />
      <div style={{ flex: 1, display: 'flex', padding: `14px ${SPH} 14px`, gap: 48, alignItems: 'center' }}>
        {/* Left: title + text + stat chip */}
        <div style={{ flex: '0 0 260px', display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 0 }}>
          <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase', color: D_T3, marginBottom: 8 }}>SERVIÇOS</div>
          <div style={{ fontSize: 48, fontWeight: 700, color: D_T1, marginBottom: 6, lineHeight: 1.0 }}>
            Outros<br /><span style={{ color: SBLUE, textShadow: '0 0 24px rgba(53,107,255,0.5)' }}>serviços</span>
          </div>
          <p style={{ margin: '0 0 24px', fontSize: 12, color: D_T2, lineHeight: 1.75 }}>
            Aqui na <strong style={{ color: D_T1 }}>Evo Studio</strong>, oferecemos uma variedade de serviços para resolver de vez todos os seus problemas em um só lugar!
          </p>
          <div style={{ background: 'linear-gradient(135deg, rgba(53,107,255,0.25) 0%, rgba(53,107,255,0.08) 100%)', border: '1px solid rgba(53,107,255,0.35)', borderRadius: 16, padding: '16px 20px', boxShadow: '0 0 24px rgba(53,107,255,0.18)' }}>
            <div style={{ fontSize: 40, fontWeight: 700, color: SBLUE, lineHeight: 1, textShadow: '0 0 20px rgba(53,107,255,0.6)' }}>12</div>
            <div style={{ fontSize: 10, fontWeight: 700, color: D_T3, letterSpacing: '1.5px', textTransform: 'uppercase', marginTop: 4 }}>Serviços disponíveis</div>
          </div>
        </div>
        {/* Right: 2-column tag grid */}
        <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          {services.map((s, i) => (
            <div key={s} style={{ background: D_CARD, border: `1px solid rgba(53,107,255,${0.15 + (i % 2) * 0.08})`, borderRadius: 14, padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 10, boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.05)' }}>
              <div style={{ width: 7, height: 7, borderRadius: '50%', background: SBLUE, flexShrink: 0, boxShadow: '0 0 8px rgba(53,107,255,0.9)' }} />
              <span style={{ fontSize: 12, color: D_T1, fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{s}</span>
            </div>
          ))}
        </div>
      </div>
      <SlideFooter dark />
    </div>
  );
}

function D_Slide11Paises() {
  const countries = [
    { flag: '🇧🇷', name: 'Brasil',          sub: 'Sede principal' },
    { flag: '🇺🇸', name: 'Estados Unidos',   sub: 'América do Norte' },
    { flag: '🇵🇹', name: 'Portugal',         sub: 'Europa' },
    { flag: '🇪🇸', name: 'Espanha',          sub: 'Europa' },
    { flag: '🇫🇷', name: 'França',           sub: 'Europa' },
  ];
  return (
    <div style={{ width: '100%', height: '100%', background: D_BG, display: 'flex', flexDirection: 'column', fontFamily: SFONT }}>
      <D_SlideHeader step={11} label="Alcance Global" next={12} />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', padding: `0 ${SPH}`, gap: 28 }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase', color: D_T3, marginBottom: 8 }}>PRESENÇA GLOBAL</div>
          <div style={{ fontSize: 42, fontWeight: 700, color: D_T1, lineHeight: 1.1 }}>
            Países que já confiam na <span style={{ color: SBLUE, textShadow: '0 0 20px rgba(53,107,255,0.5)' }}>Evo</span>
          </div>
          <div style={{ fontSize: 12, color: D_T3, marginTop: 10 }}>
            Atendemos clientes em 5 países com excelência e dedicação
          </div>
        </div>
        <div style={{ display: 'flex', gap: 14, justifyContent: 'center' }}>
          {countries.map((c, i) => (
            <div key={c.name} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, background: D_CARD, borderRadius: 20, padding: '24px 20px', border: `1px solid ${D_BORDER2}`, boxShadow: `inset 0 1px 0 rgba(255,255,255,0.06), 0 0 ${i === 0 ? 30 : 14}px rgba(53,107,255,${i === 0 ? 0.18 : 0.06})`, minWidth: 120, transition: 'all .2s' }}>
              <span style={{ fontSize: 40, lineHeight: 1 }}>{c.flag}</span>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: D_T1, lineHeight: 1.3 }}>{c.name}</div>
                <div style={{ fontSize: 9, color: D_T3, marginTop: 3, letterSpacing: '0.5px' }}>{c.sub}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
      <SlideFooter dark />
    </div>
  );
}

// ─── Proposal Viewer ─────────────────────────────────────────────────────────

const SLIDE_W = 1120;
const SLIDE_H = 630;

function ProposalViewer({ proposal, onClose, onEdit }: { proposal: Proposal; onClose: () => void; onEdit: () => void }) {
  const [slide, setSlide] = useState(0);
  const [scale, setScale] = useState(1);
  const [exporting, setExporting] = useState(false);
  const areaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const updateScale = () => {
      if (!areaRef.current) return;
      const { width, height } = areaRef.current.getBoundingClientRect();
      setScale(Math.min((width - 32) / SLIDE_W, (height - 32) / SLIDE_H));
    };
    updateScale();
    window.addEventListener('resize', updateScale);
    return () => window.removeEventListener('resize', updateScale);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') setSlide(s => Math.min(s + 1, 11));
      if (e.key === 'ArrowLeft') setSlide(s => Math.max(s - 1, 0));
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const isDark = proposal.theme === 'evo-dark';
  const allSlides = isDark ? [
    <D_Slide1Cover key="1" p={proposal} />,
    <D_Slide2SobreNos key="2" p={proposal} />,
    <D_Slide3Clientes key="3" />,
    <D_Slide4Processo key="4" />,
    <D_Slide5Or6Portfolio key="5" section={proposal.portfolio1} stepNum={5} />,
    <D_Slide5Or6Portfolio key="6" section={proposal.portfolio2} stepNum={6} />,
    <D_Slide7Depoimentos key="7" />,
    <D_Slide8Investimento key="8" p={proposal} />,
    <D_Slide9InfoImportantes key="9" p={proposal} />,
    <D_Slide10OutrosServicos key="10" />,
    <D_Slide11Paises key="11" />,
    <Slide12Closing key="12" />,
  ] : [
    <Slide1Cover key="1" p={proposal} />,
    <Slide2SobreNos key="2" p={proposal} />,
    <Slide3Clientes key="3" />,
    <Slide4Processo key="4" />,
    <Slide5Or6Portfolio key="5" section={proposal.portfolio1} stepNum={5} />,
    <Slide5Or6Portfolio key="6" section={proposal.portfolio2} stepNum={6} />,
    <Slide7Depoimentos key="7" />,
    <Slide8Investimento key="8" p={proposal} />,
    <Slide9InfoImportantes key="9" p={proposal} />,
    <Slide10OutrosServicos key="10" />,
    <Slide11Paises key="11" />,
    <Slide12Closing key="12" />,
  ];

  const handleExportPDF = () => {
    setExporting(true);
    const styleEl = document.createElement('style');
    styleEl.id = 'proposal-print-css';
    styleEl.textContent = `
      @media print {
        @page { size: ${SLIDE_W}px ${SLIDE_H}px; margin: 0; }
        body > *:not(#proposal-print-mount) { display: none !important; }
        #proposal-print-mount { left: 0 !important; top: 0 !important; z-index: 99999 !important; }
        .ppp { width: ${SLIDE_W}px; height: ${SLIDE_H}px; overflow: hidden; page-break-after: always; break-after: page; display: block; }
      }
    `;
    document.head.appendChild(styleEl);
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        window.print();
        setTimeout(() => {
          styleEl.remove();
          setExporting(false);
        }, 1200);
      });
    });
  };

  return (
    <>
      {/* Print mount — rendered off-screen so browser lays it out; @media print brings it on-screen */}
      <div id="proposal-print-mount" style={{ position: 'fixed', left: '-200vw', top: 0, width: SLIDE_W, pointerEvents: 'none', zIndex: -1 }}>
        {allSlides.map((s, i) => (
          <div key={i} className="ppp" style={{ width: SLIDE_W, height: SLIDE_H, overflow: 'hidden' }}>{s}</div>
        ))}
      </div>

    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      style={{ position: 'fixed', inset: 0, zIndex: 600, background: '#111', display: 'flex', flexDirection: 'column' }}>

      {/* Controls */}
      <div style={{ height: 50, flexShrink: 0, display: 'flex', alignItems: 'center', padding: '0 16px', gap: 10 }}>
        <button onClick={onClose} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: 8, color: '#fff', fontSize: 12, fontWeight: 600, padding: '6px 12px', cursor: 'pointer' }}>
          <FiX size={13} /> Sair
        </button>
        <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)' }}>{proposal.clientName} — {SERVICE_LABELS[proposal.service]}</span>
        <div style={{ flex: 1 }} />
        <button onClick={() => setSlide(s => Math.max(s - 1, 0))} disabled={slide === 0}
          style={{ width: 32, height: 32, borderRadius: 8, background: slide === 0 ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.12)', border: 'none', cursor: slide === 0 ? 'default' : 'pointer', color: slide === 0 ? 'rgba(255,255,255,0.3)' : '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <FiChevronLeft size={16} />
        </button>
        <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)', fontWeight: 600, minWidth: 50, textAlign: 'center' }}>{slide + 1} / 12</span>
        <button onClick={() => setSlide(s => Math.min(s + 1, 11))} disabled={slide === 11}
          style={{ width: 32, height: 32, borderRadius: 8, background: slide === 11 ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.12)', border: 'none', cursor: slide === 11 ? 'default' : 'pointer', color: slide === 11 ? 'rgba(255,255,255,0.3)' : '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <FiChevronRight size={16} />
        </button>
        <div style={{ width: 1, height: 20, background: 'rgba(255,255,255,0.15)', margin: '0 4px' }} />
        <button onClick={handleExportPDF} disabled={exporting}
          style={{ display: 'flex', alignItems: 'center', gap: 6, background: exporting ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.15)', borderRadius: 8, color: exporting ? 'rgba(255,255,255,0.4)' : '#fff', fontSize: 12, fontWeight: 600, padding: '6px 12px', cursor: exporting ? 'default' : 'pointer' }}>
          <FiDownload size={12} /> {exporting ? 'Preparando...' : 'PDF'}
        </button>
        <button onClick={() => { onClose(); onEdit(); }} style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#356BFF', border: 'none', borderRadius: 8, color: '#fff', fontSize: 12, fontWeight: 600, padding: '6px 14px', cursor: 'pointer' }}>
          <FiEdit2 size={12} /> Editar
        </button>
      </div>

      {/* Slide area */}
      <div ref={areaRef} style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: SLIDE_W, height: SLIDE_H, transform: `scale(${scale})`, transformOrigin: 'center center', borderRadius: 8, overflow: 'hidden', boxShadow: '0 0 80px rgba(0,0,0,0.6)' }}>
          <AnimatePresence mode="wait">
            <motion.div key={slide} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.18 }} style={{ width: '100%', height: '100%' }}>
              {allSlides[slide]}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {/* Dots */}
      <div style={{ height: 36, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
        {allSlides.map((_, i) => (
          <button key={i} onClick={() => setSlide(i)}
            style={{ width: i === slide ? 20 : 6, height: 6, borderRadius: 3, border: 'none', cursor: 'pointer', background: i === slide ? '#356BFF' : 'rgba(255,255,255,0.25)', padding: 0, transition: 'all .2s' }} />
        ))}
      </div>
    </motion.div>
    </>
  );
}

// ─── New Proposal Modal ───────────────────────────────────────────────────────

function NewProposalModal({ onClose, onCreate }: { onClose: () => void; onCreate: (p: Proposal) => void }) {
  const { addProposal } = useProposalsStore();
  const [clientName, setClientName] = useState('');
  const [service, setService] = useState<ProposalService>('identidade-visual');
  const [validity, setValidity] = useState('10 Dias');
  const [customValidity, setCustomValidity] = useState('');
  const [theme, setTheme] = useState<ProposalTheme>('classic');

  const create = () => {
    if (!clientName.trim()) return;
    const finalValidity = validity === 'custom' ? customValidity.trim() || '10 Dias' : validity;
    const p = addProposal({ clientName: clientName.trim(), service, validity: finalValidity, status: 'rascunho', theme });
    onCreate(p);
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      style={{ position: 'fixed', inset: 0, zIndex: 700, background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <motion.div initial={{ scale: 0.94, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.94, opacity: 0 }}
        style={{ width: 460, background: 'var(--modal-bg)', borderRadius: 18, overflow: 'hidden', boxShadow: '0 24px 80px rgba(0,0,0,0.5)', border: '1px solid var(--b1)' }}>
        <div style={{ height: 3, background: '#356BFF' }} />
        <div style={{ padding: '24px 24px 20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 22 }}>
            <div>
              <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--t1)' }}>Nova Proposta</div>
              <div style={{ fontSize: 12, color: 'var(--t3)', marginTop: 2 }}>Configure os dados básicos da proposta</div>
            </div>
            <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--t3)', padding: 4 }}><FiX size={16} /></button>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <label style={labelStyle}>Nome do Cliente *</label>
              <input autoFocus value={clientName} onChange={e => setClientName(e.target.value)} onKeyDown={e => e.key === 'Enter' && create()} style={inputStyle} placeholder="ex: REF ADV, Maria Silva..." />
            </div>
            <div>
              <label style={labelStyle}>Serviço</label>
              <select value={service} onChange={e => setService(e.target.value as ProposalService)} style={inputStyle}>
                {(Object.keys(SERVICE_LABELS) as ProposalService[]).map(s => (
                  <option key={s} value={s}>{SERVICE_LABELS[s]}</option>
                ))}
              </select>
            </div>
            <div>
              <label style={labelStyle}>Validade da Proposta</label>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
                {VALIDITY_OPTIONS.map(v => (
                  <button key={v} onClick={() => setValidity(v)}
                    style={{ padding: '6px 14px', borderRadius: 8, border: `1px solid ${validity === v ? '#356BFF' : 'var(--b2)'}`, background: validity === v ? 'rgba(53,107,255,0.12)' : 'var(--ib)', color: validity === v ? '#356BFF' : 'var(--t2)', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                    {v}
                  </button>
                ))}
                <button onClick={() => setValidity('custom')}
                  style={{ padding: '6px 14px', borderRadius: 8, border: `1px solid ${validity === 'custom' ? '#356BFF' : 'var(--b2)'}`, background: validity === 'custom' ? 'rgba(53,107,255,0.12)' : 'var(--ib)', color: validity === 'custom' ? '#356BFF' : 'var(--t2)', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                  Outro
                </button>
              </div>
              {validity === 'custom' && (
                <input value={customValidity} onChange={e => setCustomValidity(e.target.value)} style={inputStyle} placeholder="ex: 20 Dias, 3 semanas..." />
              )}
            </div>

            {/* Theme picker */}
            <div>
              <label style={labelStyle}>Tema Visual</label>
              <div style={{ display: 'flex', gap: 8 }}>
                {([['classic', 'Clássico', '#f8f7f5', '#1a1a2e'], ['evo-dark', 'Evo Dark', '#060912', '#356BFF']] as [ProposalTheme, string, string, string][]).map(([id, label, bg, accent]) => (
                  <button key={id} onClick={() => setTheme(id)} style={{ flex: 1, padding: '9px 12px', borderRadius: 10, border: `2px solid ${theme === id ? '#356BFF' : 'var(--b2)'}`, background: theme === id ? 'rgba(53,107,255,0.12)' : 'var(--ib)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 9, transition: 'all .15s' }}>
                    <div style={{ width: 32, height: 20, borderRadius: 4, background: bg, border: '1px solid rgba(255,255,255,0.12)', flexShrink: 0, display: 'flex', alignItems: 'center', gap: 2, padding: '2px 4px', overflow: 'hidden' }}>
                      <div style={{ width: 6, height: '70%', background: accent, borderRadius: 1 }} />
                      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                        <div style={{ height: 2, background: id === 'classic' ? '#1a1a2e' : 'rgba(255,255,255,0.6)', borderRadius: 1 }} />
                        <div style={{ height: 2, background: id === 'classic' ? '#1a1a2e' : 'rgba(255,255,255,0.3)', borderRadius: 1, width: '70%' }} />
                      </div>
                    </div>
                    <span style={{ fontSize: 12, fontWeight: 600, color: theme === id ? '#356BFF' : 'var(--t2)' }}>{label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Preview mini */}
            <div style={{ padding: '12px 14px', background: 'var(--s1)', borderRadius: 10, border: '1px solid var(--b1)', display: 'flex', gap: 20 }}>
              <div style={{ fontSize: 10 }}>
                <div style={{ color: 'var(--t4)', fontWeight: 700, letterSpacing: '0.5px', textTransform: 'uppercase', marginBottom: 3 }}>Proposta Comercial</div>
                <div style={{ color: 'var(--t2)', fontSize: 11 }}>{proposalMonth(new Date().toISOString())}</div>
              </div>
              <div style={{ height: 'auto', width: 1, background: 'var(--b2)' }} />
              <div style={{ fontSize: 10, display: 'flex', flexDirection: 'column', gap: 2 }}>
                <div><span style={{ color: 'var(--t4)' }}>Cliente: </span><span style={{ color: 'var(--t1)', fontWeight: 600 }}>{clientName || '—'}</span></div>
                <div><span style={{ color: 'var(--t4)' }}>Serviço: </span><span style={{ color: 'var(--t1)' }}>{SERVICE_LABELS[service]}</span></div>
                <div><span style={{ color: 'var(--t4)' }}>Validade: </span><span style={{ color: 'var(--t1)' }}>{validity === 'custom' ? (customValidity || '—') : validity}</span></div>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 8, marginTop: 22 }}>
            <button onClick={onClose} style={{ flex: 1, padding: '10px', background: 'var(--s2)', border: '1px solid var(--b2)', borderRadius: 10, color: 'var(--t2)', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Cancelar</button>
            <button onClick={create} disabled={!clientName.trim()}
              style={{ flex: 2, padding: '10px', background: clientName.trim() ? '#356BFF' : 'var(--s2)', border: 'none', borderRadius: 10, color: clientName.trim() ? '#fff' : 'var(--t4)', fontSize: 13, fontWeight: 700, cursor: clientName.trim() ? 'pointer' : 'default', boxShadow: clientName.trim() ? '0 4px 16px rgba(53,107,255,0.4)' : 'none' }}>
              Criar Proposta →
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ─── Proposal Card ────────────────────────────────────────────────────────────

function ProposalCard({ proposal, onEdit, onView, onDelete, onCopyLink, onStatusChange }: {
  proposal: Proposal;
  onEdit: () => void;
  onView: () => void;
  onDelete: () => void;
  onCopyLink: () => void;
  onStatusChange: (s: ProposalStatus) => void;
}) {
  const [showStatusMenu, setShowStatusMenu] = useState(false);
  const sColor = STATUS_COLORS[proposal.status];
  const svColor = SERVICE_COLORS[proposal.service];
  const leads = useTaskStore(s => s.leads);
  const companies = useTaskStore(s => s.companies);
  const linkedLead = proposal.linkedLeadId ? leads.find(l => l.id === proposal.linkedLeadId) : undefined;
  const linkedCompany = proposal.linkedCompanyId ? companies.find(c => c.id === proposal.linkedCompanyId) : undefined;

  return (
    <div style={{ background: 'var(--s1)', border: '1px solid var(--b2)', borderRadius: 14, padding: '14px 16px 14px 18px', display: 'flex', flexDirection: 'column', gap: 12, position: 'relative', overflow: 'hidden', transition: 'border-color .15s' }}
      onMouseEnter={e => (e.currentTarget as HTMLElement).style.borderColor = `${svColor}55`}
      onMouseLeave={e => (e.currentTarget as HTMLElement).style.borderColor = 'var(--b2)'}>
      {/* Service accent bar */}
      <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 3, background: svColor }} />
      {/* Header row */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--t1)', marginBottom: 4 }}>{proposal.clientName}</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 10, fontWeight: 700, background: `${svColor}18`, color: svColor, border: `1px solid ${svColor}30`, borderRadius: 20, padding: '2px 8px' }}>
              {SERVICE_LABELS[proposal.service]}
            </span>
            {proposal.theme === 'evo-dark' && (
              <span style={{ fontSize: 10, fontWeight: 700, background: 'rgba(53,107,255,0.12)', color: '#356BFF', border: '1px solid rgba(53,107,255,0.25)', borderRadius: 20, padding: '2px 8px' }}>
                Evo Dark
              </span>
            )}
            <span style={{ fontSize: 10, color: 'var(--t4)' }}>·</span>
            <span style={{ fontSize: 10, color: 'var(--t3)' }}>Validade: {proposal.validity}</span>
          </div>
        </div>
        <div style={{ position: 'relative' }}>
          <button onClick={() => setShowStatusMenu(s => !s)}
            style={{ fontSize: 10, fontWeight: 700, background: `${sColor}18`, color: sColor, border: `1px solid ${sColor}30`, borderRadius: 20, padding: '3px 10px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
            {STATUS_LABELS[proposal.status]}
          </button>
          {showStatusMenu && (
            <div style={{ position: 'absolute', top: '100%', right: 0, marginTop: 4, background: 'var(--modal-bg)', border: '1px solid var(--b2)', borderRadius: 10, padding: 4, zIndex: 10, boxShadow: '0 8px 24px rgba(0,0,0,0.3)', backdropFilter: 'blur(8px)' }}>
              {(Object.keys(STATUS_LABELS) as ProposalStatus[]).map(s => (
                <button key={s} onClick={() => { onStatusChange(s); setShowStatusMenu(false); }}
                  style={{ display: 'block', width: '100%', textAlign: 'left', padding: '6px 12px', background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, color: STATUS_COLORS[s], fontWeight: 600, borderRadius: 6, whiteSpace: 'nowrap' }}
                  onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'var(--s2)'}
                  onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'none'}>
                  {STATUS_LABELS[s]}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Date */}
      <div style={{ fontSize: 11, color: 'var(--t4)' }}>
        Criada em {new Date(proposal.createdAt).toLocaleDateString('pt-BR')}
        {proposal.pricingOptions.length > 0 && (
          <span style={{ marginLeft: 8 }}>· {proposal.pricingOptions.length} {proposal.pricingOptions.length === 1 ? 'plano' : 'planos'}</span>
        )}
      </div>

      {/* Linked lead / company chips */}
      {(linkedLead || linkedCompany) && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
          {linkedLead && (
            <span title="Lead de origem" style={{ fontSize: 10, fontWeight: 600, color: '#bf5af2', background: 'rgba(191,90,242,0.12)', border: '1px solid rgba(191,90,242,0.3)', borderRadius: 5, padding: '1px 7px' }}>
              Lead: {linkedLead.name}
            </span>
          )}
          {linkedCompany && (
            <span title="Empresa vinculada" style={{ fontSize: 10, fontWeight: 600, color: linkedCompany.color, background: `${linkedCompany.color}18`, border: `1px solid ${linkedCompany.color}40`, borderRadius: 5, padding: '1px 7px' }}>
              {linkedCompany.name}
            </span>
          )}
        </div>
      )}

      {/* Actions */}
      <div style={{ display: 'flex', gap: 6 }}>
        <button onClick={onEdit} style={{ flex: 1, padding: '7px', borderRadius: 8, border: '1px solid var(--b2)', background: 'var(--ib)', color: 'var(--t2)', fontSize: 12, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}
          onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'var(--s2)'}
          onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'var(--ib)'}>
          <FiEdit2 size={12} /> Editar
        </button>
        <button onClick={onView} style={{ flex: 1, padding: '7px', borderRadius: 8, border: '1px solid var(--b2)', background: 'var(--ib)', color: 'var(--t2)', fontSize: 12, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}
          onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'var(--s2)'}
          onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'var(--ib)'}>
          <FiEye size={12} /> Visualizar
        </button>
        <button onClick={onCopyLink} title="Copiar link" style={{ width: 34, padding: '7px', borderRadius: 8, border: '1px solid var(--b2)', background: 'var(--ib)', color: 'var(--t3)', fontSize: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--s2)'; (e.currentTarget as HTMLElement).style.color = '#356BFF'; }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'var(--ib)'; (e.currentTarget as HTMLElement).style.color = 'var(--t3)'; }}>
          <FiLink size={12} />
        </button>
        <button onClick={onDelete} title="Excluir" style={{ width: 34, padding: '7px', borderRadius: 8, border: '1px solid var(--b2)', background: 'var(--ib)', color: 'var(--t3)', fontSize: 12, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,69,58,0.1)'; (e.currentTarget as HTMLElement).style.color = '#ff453a'; }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'var(--ib)'; (e.currentTarget as HTMLElement).style.color = 'var(--t3)'; }}>
          <FiTrash2 size={12} />
        </button>
      </div>
    </div>
  );
}

// ─── Main Page ───────────────────────────────────────────────────────────────

export function PropostasPage() {
  const { proposals: allProposals, updateProposal, deleteProposal } = useProposalsStore();
  const accentColor = useTaskStore(s => s.accentColor);
  const visibleIds = useVisibleWorkspaceIds();
  const proposals = useMemo(() => allProposals.filter(p => isInLens(p, visibleIds)), [allProposals, visibleIds]);
  const [showNew, setShowNew] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [viewingId, setViewingId] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<ProposalStatus | 'todas'>('todas');
  const [copied, setCopied] = useState<string | null>(null);

  const editingProposal = proposals.find(p => p.id === editingId) ?? null;
  const viewingProposal = proposals.find(p => p.id === viewingId) ?? null;

  const filtered = filterStatus === 'todas' ? proposals : proposals.filter(p => p.status === filterStatus);

  const copyLink = (proposal: Proposal) => {
    const url = `${window.location.origin}${window.location.pathname}#proposta=${proposal.shareToken}`;
    navigator.clipboard.writeText(url).catch(() => {});
    setCopied(proposal.id);
    setTimeout(() => setCopied(null), 2000);
  };

  // ── Stats ────────────────────────────────────────────────────────────────
  const stats = {
    total:     proposals.length,
    rascunhos: proposals.filter(p => p.status === 'rascunho').length,
    enviadas:  proposals.filter(p => p.status === 'enviada').length,
    aceitas:   proposals.filter(p => p.status === 'aceita').length,
    recusadas: proposals.filter(p => p.status === 'recusada').length,
  };

  // Total faturado: sum of recommended (or first) pricing option of accepted proposals
  const totalFaturado = proposals
    .filter(p => p.status === 'aceita')
    .reduce((sum, p) => {
      const opts = p.pricingOptions ?? [];
      if (opts.length === 0) return sum;
      const pick = opts.find(o => o.isMostSold) ?? opts.find(o => o.isHighlighted) ?? opts[0];
      return sum + (pick.discountedPrice || pick.fullPrice || 0);
    }, 0);

  const filterCounts: Record<ProposalStatus | 'todas', number> = {
    todas: stats.total,
    rascunho: stats.rascunhos,
    enviada: stats.enviadas,
    aceita: stats.aceitas,
    recusada: stats.recusadas,
  };

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* ── Compact sticky header ── */}
      <div style={{ padding: '14px 20px', flexShrink: 0, borderBottom: '1px solid var(--b2)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
        <div>
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase', color: 'var(--t4)', marginBottom: 2 }}>Propostas</div>
          <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--t1)', letterSpacing: '-0.4px' }}>Pipeline Comercial</div>
        </div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
          {([
            { label: 'Rascunhos', value: stats.rascunhos, color: '#636366', rgb: '99,99,102' },
            { label: 'Enviadas',  value: stats.enviadas,  color: '#ff9f0a', rgb: '255,159,10' },
            { label: 'Aceitas',   value: stats.aceitas,   color: '#30d158', rgb: '48,209,88' },
            ...(stats.recusadas > 0 ? [{ label: 'Recusadas', value: stats.recusadas, color: '#ff453a', rgb: '255,69,58' }] : []),
            ...(totalFaturado > 0 ? [{ label: 'Faturado', value: `R$ ${totalFaturado.toLocaleString('pt-BR')}`, color: '#30d158', rgb: '48,209,88' }] : []),
          ] as { label: string; value: string | number; color: string; rgb: string }[]).map(k => (
            <div key={k.label} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 10px', borderRadius: 8, background: `rgba(${k.rgb},0.08)`, border: `1px solid rgba(${k.rgb},0.2)` }}>
              <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.8px', textTransform: 'uppercase', color: `rgba(${k.rgb},0.6)` }}>{k.label}</span>
              <span style={{ fontSize: 13, fontWeight: 700, color: k.color }}>{k.value}</span>
            </div>
          ))}
          <button onClick={() => setShowNew(true)}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 8, background: accentColor, border: 'none', color: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer', boxShadow: `0 4px 14px ${accentColor}55` }}
            onMouseEnter={e => (e.currentTarget as HTMLElement).style.opacity = '0.85'}
            onMouseLeave={e => (e.currentTarget as HTMLElement).style.opacity = '1'}>
            <FiPlus size={13} /> Nova Proposta
          </button>
        </div>
      </div>

      {/* ── Body: sidebar + main ── */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        {/* Status sidebar */}
        <aside style={{
          width: 220, flexShrink: 0,
          borderRight: '1px solid var(--b2)',
          background: 'rgba(0,0,0,0.14)',
          overflowY: 'auto', padding: '14px 12px',
          display: 'flex', flexDirection: 'column', gap: 12,
        }}>
          {/* Status filter */}
          <div style={{ background: 'var(--s1)', borderRadius: 12, border: '1px solid var(--b2)', padding: '12px 12px' }}>
            <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '1.5px', textTransform: 'uppercase', color: 'var(--t3)', marginBottom: 10 }}>Status</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {(['todas', 'rascunho', 'enviada', 'aceita', 'recusada'] as (ProposalStatus | 'todas')[]).map(s => {
                const active = filterStatus === s;
                const c = s === 'todas' ? '#64C4FF' : STATUS_COLORS[s as ProposalStatus];
                const label = s === 'todas' ? 'Todas' : STATUS_LABELS[s as ProposalStatus];
                return (
                  <button key={s} onClick={() => setFilterStatus(s)}
                    style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '5px 8px', borderRadius: 7, background: active ? `${c}18` : 'transparent', border: active ? `1px solid ${c}40` : '1px solid transparent', cursor: 'pointer', color: active ? c : 'var(--t3)', fontSize: 11, fontWeight: active ? 600 : 400, textAlign: 'left', transition: 'all .12s' }}>
                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: c }} />
                    {label}
                    <span style={{ marginLeft: 'auto', fontSize: 10, color: active ? c : 'var(--t4)', fontWeight: 700 }}>{filterCounts[s]}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Distribution */}
          {stats.total > 0 && (
            <div style={{ background: 'var(--s1)', borderRadius: 12, border: '1px solid var(--b2)', padding: '12px 12px' }}>
              <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '1.5px', textTransform: 'uppercase', color: 'var(--t3)', marginBottom: 10 }}>Distribuição</div>
              {(['rascunho', 'enviada', 'aceita', 'recusada'] as ProposalStatus[]).map(s => {
                const count = filterCounts[s];
                const pct = stats.total > 0 ? (count / stats.total) * 100 : 0;
                const c = STATUS_COLORS[s];
                return (
                  <div key={s} style={{ marginBottom: 8 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 3 }}>
                      <span style={{ fontSize: 10, color: 'var(--t2)', display: 'flex', alignItems: 'center', gap: 5 }}>
                        <span style={{ width: 6, height: 6, borderRadius: '50%', background: c }} />
                        {STATUS_LABELS[s]}
                      </span>
                      <span style={{ fontSize: 10, fontWeight: 700, color: count > 0 ? c : 'var(--t4)' }}>{count}</span>
                    </div>
                    <div style={{ height: 3, background: 'var(--b1)', borderRadius: 2, overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${pct}%`, background: c, borderRadius: 2, transition: 'width .3s' }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </aside>

        {/* Content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px 20px' }}>
          {filtered.length === 0 ? (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 14, color: 'var(--t4)', padding: 40, minHeight: 320 }}>
              <div style={{ fontSize: 56, opacity: 0.4 }}>📄</div>
              <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--t2)' }}>
                {filterStatus === 'todas' ? 'Nenhuma proposta ainda' : `Nenhuma proposta ${STATUS_LABELS[filterStatus].toLowerCase()}`}
              </div>
              <div style={{ fontSize: 12, color: 'var(--t4)', textAlign: 'center', maxWidth: 320, lineHeight: 1.5 }}>
                {filterStatus === 'todas'
                  ? 'Crie propostas profissionais com bento grid, planos de preço e link compartilhável.'
                  : 'Tente outro filtro ou crie uma nova proposta.'}
              </div>
              {filterStatus === 'todas' && (
                <button onClick={() => setShowNew(true)}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 16px', background: accentColor, border: 'none', borderRadius: 8, color: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer', boxShadow: `0 4px 14px ${accentColor}55` }}>
                  <FiPlus size={13} /> Criar primeira proposta
                </button>
              )}
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 }}>
              {filtered.map(p => (
                <ProposalCard
                  key={p.id}
                  proposal={p}
                  onEdit={() => setEditingId(p.id)}
                  onView={() => setViewingId(p.id)}
                  onDelete={() => { if (confirm(`Excluir proposta de "${p.clientName}"?`)) deleteProposal(p.id); }}
                  onCopyLink={() => copyLink(p)}
                  onStatusChange={s => updateProposal(p.id, { status: s })}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Copied toast */}
      <AnimatePresence>
        {copied && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }}
            style={{ position: 'fixed', bottom: 28, left: '50%', transform: 'translateX(-50%)', zIndex: 800, background: 'rgba(30,30,30,0.95)', backdropFilter: 'blur(8px)', borderRadius: 12, padding: '10px 18px', display: 'flex', alignItems: 'center', gap: 8, boxShadow: '0 8px 32px rgba(0,0,0,0.3)' }}>
            <FiCheck size={13} style={{ color: '#30d158' }} />
            <span style={{ fontSize: 13, color: '#fff', fontWeight: 500 }}>Link copiado!</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modals */}
      <AnimatePresence>
        {showNew && (
          <NewProposalModal key="new" onClose={() => setShowNew(false)} onCreate={p => { setShowNew(false); setEditingId(p.id); }} />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {editingProposal && (
          <PropostaEditor key="editor" proposal={editingProposal} onClose={() => setEditingId(null)} onView={() => { setViewingId(editingId); setEditingId(null); }} />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {viewingProposal && (
          <ProposalViewer key="viewer" proposal={viewingProposal} onClose={() => setViewingId(null)} onEdit={() => { setEditingId(viewingId); setViewingId(null); }} />
        )}
      </AnimatePresence>
    </div>
  );
}
