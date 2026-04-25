import { useState } from 'react';
import { FiPlus, FiTrash2, FiEdit2, FiCheck, FiX, FiChevronDown, FiChevronRight } from 'react-icons/fi';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useOnboardingStore } from '../store/onboarding';
import { useTaskStore } from '../store/tasks';
import type { OnboardingTemplate, OnboardingStep } from '../types';

type EditState = OnboardingTemplate | 'new' | null;

export function OnboardingPage() {
  const { templates, deleteTemplate } = useOnboardingStore();
  const { accentColor } = useTaskStore();
  const [editing, setEditing] = useState<EditState>(null);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const toggle = (id: string) => setExpanded(p => ({ ...p, [id]: !p[id] }));

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: 24, gap: 20, overflowY: 'auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: 'var(--t1)', margin: 0 }}>Onboarding</h1>
          <p style={{ fontSize: 12, color: 'var(--t4)', margin: '2px 0 0' }}>Playbooks de boas-vindas para novos clientes</p>
        </div>
        <div style={{ flex: 1 }} />
        <button
          onClick={() => setEditing('new')}
          style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', borderRadius: 10, background: accentColor, border: 'none', cursor: 'pointer', color: '#fff', fontSize: 12, fontWeight: 600 }}
        >
          <FiPlus size={13} /> Novo template
        </button>
      </div>

      {/* List */}
      {templates.length === 0 ? (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 12 }}>
          <span style={{ fontSize: 36 }}>🚀</span>
          <p style={{ fontSize: 13, color: 'var(--t4)', margin: 0 }}>Nenhum template de onboarding. Crie um!</p>
          <button onClick={() => setEditing('new')} style={{ padding: '8px 16px', borderRadius: 10, background: `${accentColor}18`, border: `1px solid ${accentColor}40`, color: accentColor, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
            Criar template
          </button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {templates.map(t => {
            const isOpen = expanded[t.id];
            return (
              <div key={t.id} style={{ background: 'var(--s1)', borderRadius: 14, border: '1px solid var(--b1)', overflow: 'hidden' }}>
                {/* Template header */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px', cursor: 'pointer' }} onClick={() => toggle(t.id)}>
                  <button style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--t4)', padding: 2, display: 'flex', flexShrink: 0 }}>
                    {isOpen ? <FiChevronDown size={14} /> : <FiChevronRight size={14} />}
                  </button>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--t1)' }}>{t.name}</div>
                    <div style={{ fontSize: 11, color: 'var(--t4)', marginTop: 1 }}>
                      {t.steps.length} {t.steps.length === 1 ? 'passo' : 'passos'} · criado em {format(new Date(t.createdAt), "d MMM yyyy", { locale: ptBR })}
                    </div>
                  </div>
                  <button
                    onClick={e => { e.stopPropagation(); setEditing(t); }}
                    title="Editar"
                    style={{ width: 30, height: 30, borderRadius: 8, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--t4)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--s2)'; (e.currentTarget as HTMLElement).style.color = 'var(--t2)'; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'none'; (e.currentTarget as HTMLElement).style.color = 'var(--t4)'; }}
                  >
                    <FiEdit2 size={13} />
                  </button>
                  <button
                    onClick={e => { e.stopPropagation(); if (confirm('Excluir template?')) deleteTemplate(t.id); }}
                    title="Excluir"
                    style={{ width: 30, height: 30, borderRadius: 8, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--t4)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                    onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,69,58,0.1)'; (e.currentTarget as HTMLElement).style.color = '#ff453a'; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'none'; (e.currentTarget as HTMLElement).style.color = 'var(--t4)'; }}
                  >
                    <FiTrash2 size={13} />
                  </button>
                </div>

                {/* Steps list */}
                {isOpen && (
                  <div style={{ borderTop: '1px solid var(--b1)', padding: '8px 16px 12px' }}>
                    {t.steps.length === 0 ? (
                      <p style={{ fontSize: 12, color: 'var(--t4)', margin: '8px 0', textAlign: 'center' }}>Nenhum passo. Clique em editar para adicionar.</p>
                    ) : (
                      <ol style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 6 }}>
                        {t.steps.map((step, i) => (
                          <li key={step.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '8px 10px', borderRadius: 8, background: 'var(--s2)' }}>
                            <span style={{ width: 22, height: 22, borderRadius: '50%', background: `${accentColor}18`, color: accentColor, fontSize: 11, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                              {i + 1}
                            </span>
                            <div>
                              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--t1)' }}>{step.label}</div>
                              {step.description && <div style={{ fontSize: 11, color: 'var(--t3)', marginTop: 2 }}>{step.description}</div>}
                            </div>
                          </li>
                        ))}
                      </ol>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {editing !== null && (
        <TemplateModal
          key={editing === 'new' ? 'new' : (editing as OnboardingTemplate).id}
          accentColor={accentColor}
          template={editing === 'new' ? null : editing as OnboardingTemplate}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  );
}

function TemplateModal({
  accentColor, template, onClose,
}: {
  accentColor: string;
  template: OnboardingTemplate | null;
  onClose: () => void;
}) {
  const { addTemplate, updateTemplate, addStep, removeStep, updateStep } = useOnboardingStore();
  const [name, setName] = useState(template?.name ?? '');
  const [steps, setSteps] = useState<OnboardingStep[]>(template?.steps ?? []);
  const [newLabel, setNewLabel] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [editingStep, setEditingStep] = useState<string | null>(null);
  const [editLabel, setEditLabel] = useState('');
  const [editDesc, setEditDesc] = useState('');

  const uid = () => Math.random().toString(36).slice(2, 10);

  const addNewStep = () => {
    if (!newLabel.trim()) return;
    const step: OnboardingStep = { id: uid(), label: newLabel.trim(), description: newDesc.trim() || undefined };
    setSteps(s => [...s, step]);
    setNewLabel('');
    setNewDesc('');
  };

  const removeStepLocal = (id: string) => setSteps(s => s.filter(x => x.id !== id));

  const startEdit = (step: OnboardingStep) => {
    setEditingStep(step.id);
    setEditLabel(step.label);
    setEditDesc(step.description ?? '');
  };

  const saveStepEdit = (id: string) => {
    setSteps(s => s.map(x => x.id === id ? { ...x, label: editLabel.trim(), description: editDesc.trim() || undefined } : x));
    setEditingStep(null);
  };

  const save = () => {
    if (!name.trim()) return;
    if (template) {
      updateTemplate(template.id, { name: name.trim(), steps });
    } else {
      addTemplate({ name: name.trim(), steps });
    }
    onClose();
  };

  // Suppress unused store functions (they're used for direct sync in edit mode)
  void addStep; void removeStep; void updateStep;

  return (
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.5)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{ background: 'var(--modal-bg)', borderRadius: 16, padding: 24, width: 520, maxHeight: '88vh', overflowY: 'auto', boxShadow: '0 24px 64px rgba(0,0,0,0.4)', display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <span style={{ fontSize: 16, fontWeight: 700, color: 'var(--t1)', flex: 1 }}>{template ? 'Editar template' : 'Novo template'}</span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--t4)', display: 'flex', padding: 4 }}><FiX size={16} /></button>
        </div>

        <input
          value={name} onChange={e => setName(e.target.value)} autoFocus
          placeholder="Nome do template (ex: Onboarding Social Media)"
          style={{ padding: '9px 12px', borderRadius: 8, background: 'var(--s1)', border: '1px solid var(--b2)', color: 'var(--t1)', fontSize: 13, outline: 'none' }}
        />

        {/* Steps */}
        <div>
          <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '1.5px', textTransform: 'uppercase', color: 'var(--t4)' }}>Passos</span>
          <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 6 }}>
            {steps.map((step, i) => (
              <div key={step.id} style={{ background: 'var(--s1)', borderRadius: 10, border: '1px solid var(--b1)', padding: '10px 12px' }}>
                {editingStep === step.id ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    <input value={editLabel} onChange={e => setEditLabel(e.target.value)} style={{ padding: '7px 10px', borderRadius: 7, background: 'var(--s2)', border: '1px solid var(--b2)', color: 'var(--t1)', fontSize: 12, outline: 'none' }} />
                    <input value={editDesc} onChange={e => setEditDesc(e.target.value)} placeholder="Descrição (opcional)" style={{ padding: '7px 10px', borderRadius: 7, background: 'var(--s2)', border: '1px solid var(--b2)', color: 'var(--t1)', fontSize: 12, outline: 'none' }} />
                    <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                      <button onClick={() => setEditingStep(null)} style={{ padding: '5px 10px', borderRadius: 7, background: 'var(--s2)', border: '1px solid var(--b2)', cursor: 'pointer', fontSize: 11, color: 'var(--t3)' }}>Cancelar</button>
                      <button onClick={() => saveStepEdit(step.id)} style={{ padding: '5px 10px', borderRadius: 7, background: accentColor, border: 'none', cursor: 'pointer', fontSize: 11, color: '#fff', fontWeight: 600 }}>OK</button>
                    </div>
                  </div>
                ) : (
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                    <span style={{ width: 20, height: 20, borderRadius: '50%', background: `${accentColor}18`, color: accentColor, fontSize: 10, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1 }}>
                      {i + 1}
                    </span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--t1)' }}>{step.label}</div>
                      {step.description && <div style={{ fontSize: 11, color: 'var(--t3)', marginTop: 1 }}>{step.description}</div>}
                    </div>
                    <button onClick={() => startEdit(step)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--t4)', padding: 3, display: 'flex' }}><FiEdit2 size={11} /></button>
                    <button onClick={() => removeStepLocal(step.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--t4)', padding: 3, display: 'flex' }}><FiTrash2 size={11} /></button>
                  </div>
                )}
              </div>
            ))}

            {/* Add step */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, padding: '10px 12px', borderRadius: 10, border: '1px dashed var(--b2)', background: 'transparent' }}>
              <input
                value={newLabel} onChange={e => setNewLabel(e.target.value)}
                placeholder="Novo passo…"
                onKeyDown={e => e.key === 'Enter' && addNewStep()}
                style={{ padding: '7px 10px', borderRadius: 7, background: 'var(--s1)', border: '1px solid var(--b2)', color: 'var(--t1)', fontSize: 12, outline: 'none' }}
              />
              <div style={{ display: 'flex', gap: 6 }}>
                <input
                  value={newDesc} onChange={e => setNewDesc(e.target.value)}
                  placeholder="Descrição (opcional)"
                  style={{ flex: 1, padding: '7px 10px', borderRadius: 7, background: 'var(--s1)', border: '1px solid var(--b2)', color: 'var(--t1)', fontSize: 12, outline: 'none' }}
                />
                <button
                  onClick={addNewStep}
                  style={{ padding: '7px 12px', borderRadius: 7, background: `${accentColor}18`, border: `1px solid ${accentColor}40`, color: accentColor, cursor: 'pointer', fontSize: 12, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}
                >
                  <FiPlus size={11} /> Add
                </button>
              </div>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
          <button onClick={onClose} style={{ flex: 1, padding: '10px', borderRadius: 10, background: 'var(--s1)', border: '1px solid var(--b2)', cursor: 'pointer', color: 'var(--t3)', fontSize: 13 }}>
            Cancelar
          </button>
          <button onClick={save} style={{ flex: 2, padding: '10px', borderRadius: 10, background: accentColor, border: 'none', cursor: 'pointer', color: '#fff', fontSize: 13, fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
            <FiCheck size={13} /> {template ? 'Salvar' : 'Criar template'}
          </button>
        </div>
      </div>
    </div>
  );
}
