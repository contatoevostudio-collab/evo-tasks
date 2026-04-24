import { useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiUploadCloud, FiX, FiCheck, FiChevronDown, FiChevronRight, FiCalendar, FiLayout, FiAlertCircle } from 'react-icons/fi';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { parseICS, groupEventsByCompany, type ICSEvent } from '../lib/icsParser';
import { useTaskStore } from '../store/tasks';
import type { CalendarEventCategory, Company, TaskType } from '../types';

const COLORS = ['#356BFF','#bf5af2','#30d158','#ff9f0a','#64C4FF','#ff453a'];

type ImportMode = 'evento' | 'tarefa';

interface GroupConfig {
  companyAction: 'nova' | 'existente' | 'ignorar';
  companyId?: string;
  newCompanyName: string;
  importMode: ImportMode;
  category: CalendarEventCategory;
  taskType: TaskType;
  expanded: boolean;
}

const CATEGORIES: { id: CalendarEventCategory; label: string; color: string }[] = [
  { id: 'agencia',  label: 'Agência',  color: '#356BFF' },
  { id: 'trabalho', label: 'Trabalho', color: '#bf5af2' },
  { id: 'pessoal',  label: 'Pessoal',  color: '#30d158' },
  { id: 'evento',   label: 'Evento',   color: '#ff9f0a' },
  { id: 'feriado',  label: 'Feriado',  color: '#ff453a' },
];

const TASK_TYPES: { id: TaskType; label: string }[] = [
  { id: 'reuniao_outro', label: 'Reunião' },
  { id: 'briefing',     label: 'Briefing' },
  { id: 'apresentacao', label: 'Apresentação' },
  { id: 'call',         label: 'Call' },
  { id: 'outro',        label: 'Outro' },
];

function fmtDate(d: string) {
  try { return format(parseISO(d), "d MMM yyyy", { locale: ptBR }); } catch { return d; }
}

// ─── Checkbox pill ────────────────────────────────────────────────────────────

function Checkbox({ checked, onChange }: { checked: boolean; onChange(): void }) {
  return (
    <div
      onClick={e => { e.stopPropagation(); onChange(); }}
      style={{
        width: 18, height: 18, borderRadius: 5, flexShrink: 0,
        border: checked ? '2px solid #356BFF' : '2px solid var(--b3)',
        background: checked ? '#356BFF' : 'transparent',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        cursor: 'pointer', transition: 'all .12s',
      }}
    >
      {checked && <FiCheck size={11} color="#fff" />}
    </div>
  );
}

// ─── Main modal ───────────────────────────────────────────────────────────────

interface Props { onClose(): void }

export function ICSImportModal({ onClose }: Props) {
  const { addCalendarEvent, addTask, companies, addCompany } = useTaskStore();

  const [step, setStep] = useState<'upload' | 'config' | 'done'>('upload');
  const [dragOver, setDragOver] = useState(false);
  const [allEvents, setAllEvents] = useState<ICSEvent[]>([]);
  const [groups, setGroups] = useState<Map<string, ICSEvent[]>>(new Map());
  const [groupConfigs, setGroupConfigs] = useState<Record<string, GroupConfig>>({});
  const [selectedUids, setSelectedUids] = useState<Set<string>>(new Set());
  const [importing, setImporting] = useState(false);
  const [importedCount, setImportedCount] = useState(0);
  const fileRef = useRef<HTMLInputElement>(null);

  const processFile = useCallback((text: string) => {
    const parsed = parseICS(text);
    if (!parsed.length) return;
    const grouped = groupEventsByCompany(parsed);
    setAllEvents(parsed);
    setGroups(grouped);
    setSelectedUids(new Set(parsed.map(e => e.uid)));

    const configs: Record<string, GroupConfig> = {};
    for (const [name] of grouped) {
      const matched = companies.find(c =>
        c.name.toLowerCase() === name.toLowerCase() ||
        name.toLowerCase().includes(c.name.toLowerCase())
      );
      configs[name] = {
        companyAction: matched ? 'existente' : name === 'Sem empresa' ? 'ignorar' : 'nova',
        companyId: matched?.id,
        newCompanyName: name === 'Sem empresa' ? '' : name,
        importMode: 'evento',
        category: 'trabalho',
        taskType: 'reuniao_outro',
        expanded: true,
      };
    }
    setGroupConfigs(configs);
    setStep('config');
  }, [companies]);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => processFile(ev.target?.result as string);
    reader.readAsText(file, 'utf-8');
  }, [processFile]);

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => processFile(ev.target?.result as string);
    reader.readAsText(file, 'utf-8');
  };

  const toggleUid = (uid: string) => {
    setSelectedUids(prev => {
      const next = new Set(prev);
      next.has(uid) ? next.delete(uid) : next.add(uid);
      return next;
    });
  };

  const toggleGroup = (uids: string[], allSelected: boolean) => {
    setSelectedUids(prev => {
      const next = new Set(prev);
      uids.forEach(uid => allSelected ? next.delete(uid) : next.add(uid));
      return next;
    });
  };

  const updateGroup = (name: string, updates: Partial<GroupConfig>) =>
    setGroupConfigs(prev => ({ ...prev, [name]: { ...prev[name], ...updates } }));

  const selectedCount = allEvents.filter(e => selectedUids.has(e.uid)).length;

  const doImport = async () => {
    setImporting(true);
    let count = 0;

    // Create new companies first
    for (const [, cfg] of Object.entries(groupConfigs)) {
      if (cfg.companyAction === 'nova' && cfg.newCompanyName.trim()) {
        const name = cfg.newCompanyName.trim();
        const exists = useTaskStore.getState().companies.find(
          c => c.name.toLowerCase() === name.toLowerCase()
        );
        if (!exists) {
          addCompany({ name, color: COLORS[Math.floor(Math.random() * COLORS.length)], status: 'ativo' });
        }
      }
    }

    for (const [groupName, evList] of groups) {
      const cfg = groupConfigs[groupName];
      if (!cfg || cfg.companyAction === 'ignorar') continue;

      let companyId = '';
      if (cfg.companyAction === 'existente') {
        companyId = cfg.companyId ?? '';
      } else if (cfg.companyAction === 'nova' && cfg.newCompanyName.trim()) {
        companyId = useTaskStore.getState().companies.find(
          c => c.name.toLowerCase() === cfg.newCompanyName.trim().toLowerCase()
        )?.id ?? '';
      }

      for (const ev of evList) {
        if (!selectedUids.has(ev.uid)) continue;
        const notes = [ev.description, ev.location].filter(Boolean).join('\n') || undefined;

        if (cfg.importMode === 'evento') {
          addCalendarEvent({ title: ev.summary, date: ev.date, endDate: ev.endDate, time: ev.time, category: cfg.category, notes });
          count++;
        } else {
          if (!companyId) continue;
          const sub = useTaskStore.getState().subClients.find(s => s.companyId === companyId);
          addTask({ companyId, subClientId: sub?.id ?? '', taskCategory: 'reuniao', taskType: cfg.taskType, sequence: 0, date: ev.date, time: ev.time, status: 'todo', allDay: ev.allDay, notes, createdAt: new Date().toISOString() });
          count++;
        }
      }
    }

    setImportedCount(count);
    setImporting(false);
    setStep('done');
  };

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(6px)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <motion.div
        initial={{ scale: 0.94, opacity: 0, y: 12 }} animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.94, opacity: 0, y: 12 }} transition={{ duration: 0.18 }}
        style={{ width: '100%', maxWidth: 600, maxHeight: '90vh', background: 'var(--modal-bg)', backdropFilter: 'blur(24px)', borderRadius: 20, border: '1px solid var(--b2)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 20px 14px', borderBottom: '1px solid var(--b1)', flexShrink: 0 }}>
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--t1)' }}>Importar Calendário .ics</div>
            <div style={{ fontSize: 12, color: 'var(--t3)', marginTop: 2 }}>
              {step === 'upload' && 'Arraste ou selecione um arquivo do Apple Calendar'}
              {step === 'config' && `${allEvents.length} evento${allEvents.length !== 1 ? 's' : ''} encontrado${allEvents.length !== 1 ? 's' : ''} — selecione e configure`}
              {step === 'done'   && 'Importação concluída'}
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--t3)', padding: 4, display: 'flex' }}>
            <FiX size={18} />
          </button>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: 20 }}>
          <AnimatePresence mode="wait">
            {step === 'upload' && (
              <motion.div key="upload" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <div
                  onDrop={onDrop}
                  onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                  onDragLeave={() => setDragOver(false)}
                  onClick={() => fileRef.current?.click()}
                  style={{ border: `2px dashed ${dragOver ? '#356BFF' : 'var(--b2)'}`, borderRadius: 16, padding: '48px 24px', textAlign: 'center', cursor: 'pointer', background: dragOver ? 'rgba(53,107,255,0.06)' : 'var(--s1)', transition: 'all .15s' }}
                >
                  <FiUploadCloud size={36} style={{ color: dragOver ? '#356BFF' : 'var(--t4)', marginBottom: 12 }} />
                  <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--t1)', marginBottom: 6 }}>Arraste o arquivo .ics aqui</div>
                  <div style={{ fontSize: 12, color: 'var(--t3)' }}>ou clique para selecionar</div>
                  <div style={{ fontSize: 11, color: 'var(--t4)', marginTop: 16 }}>Apple Calendar: Arquivo → Exportar → Exportar…</div>
                </div>
                <input ref={fileRef} type="file" accept=".ics,text/calendar" onChange={onFileChange} style={{ display: 'none' }} />
              </motion.div>
            )}

            {step === 'config' && (
              <motion.div key="config" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {[...groups.entries()].map(([groupName, evList]) => {
                  const cfg = groupConfigs[groupName];
                  if (!cfg) return null;
                  return (
                    <GroupCard
                      key={groupName}
                      groupName={groupName}
                      events={evList}
                      cfg={cfg}
                      companies={companies}
                      selectedUids={selectedUids}
                      onToggleUid={toggleUid}
                      onToggleGroup={toggleGroup}
                      onChange={u => updateGroup(groupName, u)}
                    />
                  );
                })}
              </motion.div>
            )}

            {step === 'done' && (
              <motion.div key="done" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} style={{ textAlign: 'center', padding: '32px 0' }}>
                <div style={{ fontSize: 48, marginBottom: 16 }}>✅</div>
                <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--t1)', marginBottom: 8 }}>
                  {importedCount} item{importedCount !== 1 ? 's' : ''} importado{importedCount !== 1 ? 's' : ''}!
                </div>
                <div style={{ fontSize: 13, color: 'var(--t3)' }}>Feche este modal para ver no calendário.</div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Footer */}
        {step === 'config' && (
          <div style={{ padding: '14px 20px', borderTop: '1px solid var(--b1)', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
            <span style={{ fontSize: 12, color: 'var(--t3)' }}>
              <b style={{ color: 'var(--t1)' }}>{selectedCount}</b> de {allEvents.length} selecionado{selectedCount !== 1 ? 's' : ''}
            </span>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={onClose} style={{ padding: '8px 18px', borderRadius: 10, background: 'var(--s1)', border: '1px solid var(--b2)', color: 'var(--t2)', fontSize: 13, cursor: 'pointer' }}>
                Cancelar
              </button>
              <button
                onClick={doImport}
                disabled={importing || selectedCount === 0}
                style={{ padding: '8px 20px', borderRadius: 10, background: selectedCount === 0 ? 'var(--s2)' : '#356BFF', border: 'none', color: selectedCount === 0 ? 'var(--t4)' : '#fff', fontSize: 13, fontWeight: 700, cursor: selectedCount === 0 ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: 7, transition: 'all .15s' }}
              >
                <FiCheck size={14} />
                {importing ? 'Importando…' : `Importar ${selectedCount > 0 ? selectedCount : ''}`}
              </button>
            </div>
          </div>
        )}
        {step === 'done' && (
          <div style={{ padding: '14px 20px', borderTop: '1px solid var(--b1)', flexShrink: 0, display: 'flex', justifyContent: 'flex-end' }}>
            <button onClick={onClose} style={{ padding: '8px 22px', borderRadius: 10, background: '#356BFF', border: 'none', color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>
              Fechar
            </button>
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}

// ─── Group Card ───────────────────────────────────────────────────────────────

function GroupCard({
  groupName, events, cfg, companies, selectedUids, onToggleUid, onToggleGroup, onChange,
}: {
  groupName: string;
  events: ICSEvent[];
  cfg: GroupConfig;
  companies: Company[];
  selectedUids: Set<string>;
  onToggleUid(uid: string): void;
  onToggleGroup(uids: string[], allSelected: boolean): void;
  onChange(u: Partial<GroupConfig>): void;
}) {
  const ignored = cfg.companyAction === 'ignorar';
  const groupUids = events.map(e => e.uid);
  const groupSelected = groupUids.filter(uid => selectedUids.has(uid));
  const allSelected = groupSelected.length === events.length;
  const someSelected = groupSelected.length > 0 && !allSelected;

  return (
    <div style={{ background: 'var(--s1)', borderRadius: 14, border: `1px solid ${ignored ? 'var(--b1)' : 'var(--b2)'}`, opacity: ignored ? 0.55 : 1, transition: 'opacity .15s' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px' }}>
        {/* Group-level checkbox */}
        <div
          onClick={() => onToggleGroup(groupUids, allSelected)}
          style={{
            width: 18, height: 18, borderRadius: 5, flexShrink: 0,
            border: allSelected ? '2px solid #356BFF' : someSelected ? '2px solid #356BFF' : '2px solid var(--b3)',
            background: allSelected ? '#356BFF' : someSelected ? 'rgba(53,107,255,0.2)' : 'transparent',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', transition: 'all .12s',
          }}
        >
          {allSelected && <FiCheck size={11} color="#fff" />}
          {someSelected && <div style={{ width: 8, height: 2, background: '#356BFF', borderRadius: 1 }} />}
        </div>

        <div style={{ flex: 1, minWidth: 0, cursor: 'pointer' }} onClick={() => onChange({ expanded: !cfg.expanded })}>
          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--t1)', marginBottom: 1 }}>
            {groupName === 'Sem empresa' ? '📅' : '🏢'} {groupName}
          </div>
          <div style={{ fontSize: 11, color: 'var(--t3)' }}>
            {groupSelected.length}/{events.length} selecionado{groupSelected.length !== 1 ? 's' : ''}
          </div>
        </div>
        <div style={{ cursor: 'pointer', color: 'var(--t4)', flexShrink: 0 }} onClick={() => onChange({ expanded: !cfg.expanded })}>
          {cfg.expanded ? <FiChevronDown size={14} /> : <FiChevronRight size={14} />}
        </div>
      </div>

      <AnimatePresence>
        {cfg.expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.15 }}
            style={{ overflow: 'hidden' }}
          >
            <div style={{ padding: '0 14px 14px', display: 'flex', flexDirection: 'column', gap: 12 }}>
              {/* Event list with checkboxes */}
              <div style={{ border: '1px solid var(--b1)', borderRadius: 10, overflow: 'hidden' }}>
                {events.map((ev, i) => {
                  const checked = selectedUids.has(ev.uid);
                  return (
                    <div
                      key={ev.uid}
                      onClick={() => onToggleUid(ev.uid)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px',
                        borderBottom: i < events.length - 1 ? '1px solid var(--b1)' : 'none',
                        cursor: 'pointer', transition: 'background .1s',
                        background: checked ? 'transparent' : 'rgba(0,0,0,0.03)',
                      }}
                      onMouseEnter={e => (e.currentTarget.style.background = 'var(--s2)')}
                      onMouseLeave={e => (e.currentTarget.style.background = checked ? 'transparent' : 'rgba(0,0,0,0.03)')}
                    >
                      <Checkbox checked={checked} onChange={() => onToggleUid(ev.uid)} />
                      <FiCalendar size={11} style={{ color: 'var(--t4)', flexShrink: 0 }} />
                      <span style={{ fontSize: 12, color: checked ? 'var(--t1)' : 'var(--t4)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', textDecoration: checked ? 'none' : 'line-through', transition: 'all .12s' }}>
                        {ev.summary}
                      </span>
                      <span style={{ fontSize: 11, color: 'var(--t4)', flexShrink: 0 }}>
                        {ev.time ? `${fmtDate(ev.date)} ${ev.time}` : fmtDate(ev.date)}
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* Company action */}
              {groupName !== 'Sem empresa' && groupSelected.length > 0 && (
                <div>
                  <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--t3)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Empresa</div>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    {(['nova', 'existente', 'ignorar'] as const).map(action => (
                      <button key={action} onClick={() => onChange({ companyAction: action })}
                        style={{ padding: '5px 12px', borderRadius: 8, background: cfg.companyAction === action ? '#356BFF' : 'var(--s2)', border: 'none', cursor: 'pointer', color: cfg.companyAction === action ? '#fff' : 'var(--t2)', fontSize: 12, fontWeight: 500, transition: 'all .12s' }}>
                        {action === 'nova' ? '+ Criar empresa' : action === 'existente' ? 'Vincular existente' : '🚫 Ignorar grupo'}
                      </button>
                    ))}
                  </div>

                  {cfg.companyAction === 'nova' && (
                    <input value={cfg.newCompanyName} onChange={e => onChange({ newCompanyName: e.target.value })}
                      placeholder="Nome da empresa…"
                      style={{ marginTop: 8, width: '100%', boxSizing: 'border-box', padding: '8px 12px', borderRadius: 9, background: 'var(--ib)', border: '1px solid var(--b2)', color: 'var(--t1)', fontSize: 13 }} />
                  )}
                  {cfg.companyAction === 'existente' && (
                    <select value={cfg.companyId ?? ''} onChange={e => onChange({ companyId: e.target.value })}
                      style={{ marginTop: 8, width: '100%', boxSizing: 'border-box', padding: '8px 12px', borderRadius: 9, background: 'var(--ib)', border: '1px solid var(--b2)', color: 'var(--t1)', fontSize: 13 }}>
                      <option value="">Selecione…</option>
                      {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  )}
                </div>
              )}

              {/* Import mode */}
              {cfg.companyAction !== 'ignorar' && groupSelected.length > 0 && (
                <>
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--t3)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Importar como</div>
                    <div style={{ display: 'flex', gap: 6 }}>
                      {([['evento', '📅 Evento', <FiCalendar key="c" size={12} />], ['tarefa', '✅ Tarefa', <FiLayout key="l" size={12} />]] as [ImportMode, string, React.ReactNode][]).map(([id, label, icon]) => (
                        <button key={id} onClick={() => onChange({ importMode: id })}
                          style={{ padding: '5px 12px', borderRadius: 8, display: 'flex', alignItems: 'center', gap: 6, background: cfg.importMode === id ? '#356BFF' : 'var(--s2)', border: 'none', cursor: 'pointer', color: cfg.importMode === id ? '#fff' : 'var(--t2)', fontSize: 12, fontWeight: 500, transition: 'all .12s' }}>
                          {icon}{label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {cfg.importMode === 'evento' && (
                    <div>
                      <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--t3)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Categoria</div>
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                        {CATEGORIES.map(cat => (
                          <button key={cat.id} onClick={() => onChange({ category: cat.id })}
                            style={{ padding: '4px 11px', borderRadius: 8, background: cfg.category === cat.id ? cat.color : 'var(--s2)', border: cfg.category === cat.id ? 'none' : '1px solid var(--b1)', cursor: 'pointer', color: cfg.category === cat.id ? '#fff' : 'var(--t2)', fontSize: 12, fontWeight: 500, transition: 'all .12s' }}>
                            {cat.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {cfg.importMode === 'tarefa' && (
                    <div>
                      <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--t3)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Tipo de tarefa</div>
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                        {TASK_TYPES.map(t => (
                          <button key={t.id} onClick={() => onChange({ taskType: t.id })}
                            style={{ padding: '4px 11px', borderRadius: 8, background: cfg.taskType === t.id ? '#356BFF' : 'var(--s2)', border: 'none', cursor: 'pointer', color: cfg.taskType === t.id ? '#fff' : 'var(--t2)', fontSize: 12, fontWeight: 500, transition: 'all .12s' }}>
                            {t.label}
                          </button>
                        ))}
                      </div>
                      {cfg.companyAction === 'existente' && !cfg.companyId && (
                        <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#ff9f0a' }}>
                          <FiAlertCircle size={13} /> Selecione uma empresa para importar como tarefa
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
