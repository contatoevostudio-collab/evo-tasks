import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiX, FiChevronRight, FiChevronLeft } from 'react-icons/fi';
// TODO: substituir screenshots por imagens finais do app (capturadas em modo guest/sem dados reais)
import imgHome from '../assets/help/home.png';
import imgCalendar from '../assets/help/calendar.png';
import imgKanban from '../assets/help/kanban.png';
import imgEmpresas from '../assets/help/empresas.png';
import imgCrm from '../assets/help/crm.png';
import imgPomodoro from '../assets/help/pomodoro.png';
import imgNotes from '../assets/help/notes.png';

const SHORTCUTS = [
  { keys: ['N'],        description: 'Nova Tarefa' },
  { keys: ['⌘', 'K'],  description: 'Buscar' },
  { keys: ['⌘', '1–5'], description: 'Navegar páginas' },
  { keys: ['Esc'],      description: 'Fechar modal' },
];

const STEPS = [
  {
    emoji: '⌨️',
    title: 'Atalhos de Teclado',
    image: null,
    description: 'Use atalhos para navegar mais rápido no Evo Tasks.',
    tips: [] as string[],
    shortcuts: true,
  },
  {
    emoji: '🏠',
    title: 'Início',
    image: imgHome,
    description: 'Sua central de comando diária. Veja todas as tarefas de hoje, estatísticas rápidas e próximas entregas.',
    tips: [
      'Clique em qualquer tarefa para abrir e editar',
      'Arraste as tarefas para reordenar por prioridade',
      'O nome no "Bom dia" é clicável — personalize com o seu nome',
    ],
  },
  {
    emoji: '📅',
    title: 'Calendário',
    image: imgCalendar,
    description: 'Visualize suas tarefas por mês, semana ou dia. Navegue entre datas e crie tarefas diretamente no calendário.',
    tips: [
      'Clique em um dia no mês para ver ou criar tarefas naquela data',
      'Use as abas Mês / Semana / Dia no topo para mudar a visualização',
      'Tarefas com prazo aparecem destacadas em vermelho',
    ],
  },
  {
    emoji: '🗂️',
    title: 'Kanban',
    image: imgKanban,
    description: 'Visão em colunas das tarefas: A fazer, Em andamento e Concluídas. Ideal para acompanhar o fluxo de trabalho.',
    tips: [
      'Arraste cartões entre colunas para mudar o status',
      'Clique em um cartão para ver os detalhes completos',
      'Filtre por empresa usando a barra lateral esquerda',
    ],
  },
  {
    emoji: '🏢',
    title: 'Empresas',
    image: imgEmpresas,
    description: 'Gerencie seus clientes e sub-clientes. Cada empresa tem cor própria e agrupa todas as suas tarefas.',
    tips: [
      'Clique em uma empresa para ver todas as tarefas dela',
      'Adicione sub-clientes dentro de cada empresa',
      'Use o status (Ativo / Pausado / Encerrado) para organizar a carteira',
    ],
  },
  {
    emoji: '🎯',
    title: 'CRM',
    image: imgCrm,
    description: 'Acompanhe seus leads em um funil visual. Mova prospects pelo pipeline até convertê-los em clientes.',
    tips: [
      'Arraste leads entre colunas para avançar no funil',
      'Ao converter um lead, ele vira automaticamente uma nova empresa',
      'Registre contato, telefone, Instagram e orçamento em cada lead',
    ],
  },
  {
    emoji: '🍅',
    title: 'Pomodoro',
    image: imgPomodoro,
    description: 'Timer de foco baseado na técnica Pomodoro. Trabalhe em blocos concentrados com pausas programadas.',
    tips: [
      'Configure o tempo de foco e pausa nos campos de minutos',
      'O timer continua mesmo se você fechar o painel',
      'Ao terminar um ciclo, você recebe uma notificação sonora',
    ],
  },
  {
    emoji: '📝',
    title: 'Notas Rápidas',
    image: imgNotes,
    description: 'Bloco de anotações sempre visível na barra lateral. Capture ideias e lembretes sem sair da tela atual.',
    tips: [
      'Digite e pressione Enter para adicionar uma nota',
      'Marque notas concluídas clicando no círculo à esquerda',
      'Arraste notas para reordenar conforme sua prioridade',
    ],
  },
];

interface Props {
  onClose: () => void;
}

export function HelpModal({ onClose }: Props) {
  const [step, setStep] = useState(0);
  const current = STEPS[step];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 9998,
        background: 'rgba(0,0,0,0.45)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}
    >
      <motion.div
        className="glass-panel"
        initial={{ opacity: 0, scale: 0.96, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 8 }}
        transition={{ duration: 0.18, ease: 'easeOut' }}
        onClick={e => e.stopPropagation()}
        style={{
          width: 420, background: 'var(--modal-bg)',
          border: '1px solid var(--b2)', borderRadius: 18,
          boxShadow: '0 24px 60px rgba(0,0,0,0.4)',
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '16px 18px 0',
        }}>
          <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--t3)', letterSpacing: '0.5px', textTransform: 'uppercase' }}>
            Como usar · {step + 1}/{STEPS.length}
          </span>
          <button
            onClick={onClose}
            style={{
              width: 26, height: 26, borderRadius: 7, border: 'none',
              background: 'var(--s2)', cursor: 'pointer', color: 'var(--t3)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            <FiX size={13} />
          </button>
        </div>

        {/* Progress bar */}
        <div style={{ padding: '10px 18px 0' }}>
          <div style={{ height: 3, background: 'var(--b1)', borderRadius: 99, overflow: 'hidden' }}>
            <motion.div
              animate={{ width: `${((step + 1) / STEPS.length) * 100}%` }}
              transition={{ duration: 0.3, ease: 'easeInOut' }}
              style={{ height: '100%', background: '#356BFF', borderRadius: 99 }}
            />
          </div>
        </div>

        {/* Content */}
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.15 }}
            style={{ padding: '16px 20px 0' }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <span style={{ fontSize: 22, lineHeight: 1 }}>{current.emoji}</span>
              <span style={{ fontSize: 17, fontWeight: 700, color: 'var(--t1)' }}>{current.title}</span>
            </div>
            <div style={{ fontSize: 12.5, color: 'var(--t2)', lineHeight: 1.6, marginBottom: 12 }}>{current.description}</div>

            {/* Screenshot */}
            {'image' in current && current.image && (
              <div style={{
                borderRadius: 10, overflow: 'hidden',
                marginBottom: 14,
                background: 'var(--s1)',
                maxHeight: 180,
              }}>
                <img
                  src={current.image as string}
                  alt={current.title}
                  style={{ width: '100%', display: 'block', objectFit: 'cover', objectPosition: 'top' }}
                />
              </div>
            )}

            {/* Shortcuts table (#46) */}
            {'shortcuts' in current && current.shortcuts && (
              <div style={{ marginBottom: 14 }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <tbody>
                    {SHORTCUTS.map((s, i) => (
                      <tr key={i} style={{ borderBottom: '1px solid var(--b1)' }}>
                        <td style={{ padding: '9px 0', width: 1, whiteSpace: 'nowrap' }}>
                          <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                            {s.keys.map((k, ki) => (
                              <span key={ki} style={{
                                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                                minWidth: k.length === 1 ? 26 : undefined,
                                padding: k.length === 1 ? '3px 0' : '3px 8px',
                                borderRadius: 6,
                                background: 'var(--s2)',
                                border: '1px solid var(--b2)',
                                fontSize: 11, fontWeight: 700,
                                color: 'var(--t1)',
                                fontFamily: 'monospace',
                              }}>
                                {k}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td style={{ padding: '9px 0 9px 14px', fontSize: 12.5, color: 'var(--t2)' }}>
                          {s.description}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
              {current.tips.map((tip, i) => (
                <div key={i} style={{ display: 'flex', gap: 9, alignItems: 'flex-start' }}>
                  <div style={{
                    width: 18, height: 18, borderRadius: 5, background: 'rgba(53,107,255,0.12)',
                    color: '#356BFF', fontSize: 10, fontWeight: 700,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1,
                  }}>
                    {i + 1}
                  </div>
                  <span style={{ fontSize: 12, color: 'var(--t2)', lineHeight: 1.55 }}>{tip}</span>
                </div>
              ))}
            </div>
          </motion.div>
        </AnimatePresence>

        {/* Footer nav */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '18px 18px 18px',
        }}>
          {/* Dots */}
          <div style={{ display: 'flex', gap: 5 }}>
            {STEPS.map((_, i) => (
              <button
                key={i}
                onClick={() => setStep(i)}
                style={{
                  width: i === step ? 18 : 6, height: 6, borderRadius: 99, border: 'none',
                  background: i === step ? '#356BFF' : 'var(--b2)',
                  cursor: 'pointer', padding: 0, transition: 'all .2s',
                }}
              />
            ))}
          </div>

          <div style={{ display: 'flex', gap: 8 }}>
            {step > 0 && (
              <button
                onClick={() => setStep(s => s - 1)}
                style={{
                  height: 32, padding: '0 14px', borderRadius: 8,
                  background: 'var(--s2)',
                  cursor: 'pointer', color: 'var(--t2)', fontSize: 12, fontWeight: 500,
                  display: 'flex', alignItems: 'center', gap: 4,
                }}
              >
                <FiChevronLeft size={13} /> Anterior
              </button>
            )}
            {step < STEPS.length - 1 ? (
              <button
                onClick={() => setStep(s => s + 1)}
                style={{
                  height: 32, padding: '0 16px', borderRadius: 8,
                  background: '#356BFF', border: 'none',
                  cursor: 'pointer', color: '#fff', fontSize: 12, fontWeight: 600,
                  display: 'flex', alignItems: 'center', gap: 4,
                }}
              >
                Próximo <FiChevronRight size={13} />
              </button>
            ) : (
              <button
                onClick={onClose}
                style={{
                  height: 32, padding: '0 16px', borderRadius: 8,
                  background: '#356BFF', border: 'none',
                  cursor: 'pointer', color: '#fff', fontSize: 12, fontWeight: 600,
                }}
              >
                Entendido ✓
              </button>
            )}
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
