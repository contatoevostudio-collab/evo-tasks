export type TaskStatus = 'todo' | 'doing' | 'done';
export type CalendarEventCategory = 'agencia' | 'evento' | 'feriado' | 'pessoal' | 'trabalho';

export interface CalendarEvent {
  id: string;
  title: string;
  date: string; // yyyy-MM-dd
  endDate?: string;
  time?: string; // HH:mm
  category: CalendarEventCategory;
  color?: string;
  notes?: string;
  createdAt: string;
}
export type TaskCategory = 'criacao' | 'reuniao' | 'pessoal' | 'eventos';

export type TaskType =
  // criacao
  | 'feed' | 'story' | 'carrossel' | 'reels' | 'thumb' | 'site' | 'identidade' | 'video' | 'outro'
  // reuniao
  | 'briefing' | 'apresentacao' | 'feedback' | 'alinhamento' | 'call' | 'reuniao_outro'
  // pessoal
  | 'saude' | 'lazer' | 'estudo' | 'financeiro' | 'pessoal_outro'
  // eventos
  | 'lancamento' | 'workshop' | 'feira' | 'aniversario' | 'evento_outro';
export type ViewMode = 'kanban' | 'month' | 'week' | 'day';
export type PageType = 'home' | 'tarefas' | 'empresas' | 'arquivo' | 'crm' | 'todo' | 'financas' | 'ideias' | 'jogos' | 'propostas';

export type ProposalService = 'social-media' | 'estrategia' | 'site' | 'identidade-visual' | 'logo';
export type ProposalStatus = 'rascunho' | 'enviada' | 'aceita' | 'recusada';

export interface BentoSlot {
  id: string;
  imageUrl?: string;
}

export interface PortfolioSection {
  title: string;
  subtitle: string;
  slots: BentoSlot[];
}

export interface PricingOption {
  id: string;
  name: string;
  subtitle: string;
  items: string[];
  fullPrice: number;
  discountedPrice: number;
  isMostSold: boolean;
  isHighlighted: boolean;
}

export type ProposalTheme = 'classic' | 'evo-dark';

export interface Proposal {
  id: string;
  clientName: string;
  service: ProposalService;
  validity: string;
  status: ProposalStatus;
  theme?: ProposalTheme;
  shareToken: string;
  createdAt: string;
  updatedAt: string;
  slide2Image?: string;
  portfolio1: PortfolioSection;
  portfolio2: PortfolioSection;
  pricingHeadline: string;
  pricingOptions: PricingOption[];
  alteracaoEsboco: number;
  alteracaoCor: number;
  notes?: string;
  linkedLeadId?: string;     // proposta originada de qual lead
  linkedCompanyId?: string;  // se aceita, qual empresa
}
export type PetClass = 'mago' | 'arqueiro' | 'barbaro' | 'guerreiro' | 'shaman';

export interface ActivePet {
  class: PetClass;
  name: string;
  level: number;
  exp: number;
  battlesWon: number;
  battlesLost: number;
}

export type IdeaTag = 'negocio' | 'pessoal' | 'design' | 'marketing' | 'dev' | 'outro';
export type IdeaStatus = 'rascunho' | 'desenvolvendo' | 'executada' | 'arquivada';

export interface IdeaSubtask {
  id: string;
  label: string;
  done: boolean;
}

export interface Idea {
  id: string;
  title: string;
  description?: string;
  tag: IdeaTag;            // primary tag (kept for back-compat)
  extraTags?: IdeaTag[];   // additional tags
  link?: string;
  pinned: boolean;
  status?: IdeaStatus;     // default 'rascunho'
  linkedCompanyId?: string;
  linkedProposalId?: string; // ideia incorporada em qual proposta
  linkedIdeaIds?: string[];
  subtasks?: IdeaSubtask[];
  reviewDate?: string;     // yyyy-MM-dd
  convertedToTodoId?: string;
  pinOrder?: number;       // for drag-reorder pinned
  updatedAt?: string;      // ISO
  deletedAt?: string;      // ISO — soft delete (trash)
  createdAt: string;
}

export type TransactionType = 'receita' | 'despesa';
export type TransactionStatus = 'pago' | 'pendente' | 'cancelado';
export type GoalIcon = 'reserva' | 'viagem' | 'casa' | 'carro' | 'investir' | 'premio' | 'meta' | 'saude';
export type RecurringIcon = 'aluguel' | 'internet' | 'celular' | 'luz' | 'agua' | 'streaming' | 'academia' | 'software' | 'outra';

export interface Transaction {
  id: string;
  type: TransactionType;
  description: string;
  category: string;
  amount: number;
  date: string; // yyyy-MM-dd
  status: TransactionStatus;
  createdAt: string;
}

export interface FinancialGoal {
  id: string;
  name: string;
  icon: GoalIcon;
  color: string;
  target: number;
  current: number;
  createdAt: string;
}

export type CardBrand = 'visa' | 'mastercard' | 'amex' | 'elo' | 'hipercard' | 'paypal' | 'nubank' | 'outro';

export interface Card {
  id: string;
  brand: CardBrand;
  last4: string;
  holder: string;
  expiry: string; // MM/YY
  color: string; // hex for gradient
  fullNumber?: string; // optional — stored client-side only
  createdAt: string;
}

export interface RecurringBill {
  id: string;
  name: string;
  icon: RecurringIcon;
  amount: number;
  dueDay: number;
  isEssential: boolean;
  isRecurring?: boolean; // default true — false = conta única, "quita" após pagar
  paidMonths: string[]; // 'yyyy-MM'
  createdAt: string;
}
export type Priority = 'alta' | 'media' | 'baixa';
export type Theme = 'dark-blue' | 'light-soft';
export type LeadStage = 'prospeccao' | 'contato' | 'proposta' | 'negociacao' | 'fechado';

export interface SubTask {
  id: string;
  label: string;
  done: boolean;
}

export interface QuickNote {
  id: string;
  text: string;
  checked: boolean;
  createdAt: string;
}

export type TodoItemStatus = 'standby' | 'todo' | 'doing' | 'done';
export type TodoContext = 'trabalho' | 'pessoal' | 'urgente';

export interface TodoItem {
  id: string;
  text: string;
  checked: boolean;
  status: TodoItemStatus;
  date: string; // yyyy-MM-dd
  createdAt: string;
  archived?: boolean;
  subtasks?: SubTask[]; // #41
  context?: TodoContext; // #42
  priority?: Priority;   // #43
}

export interface PomodoroSession {
  id: string;
  startedAt: string; // ISO
  duration: number;  // seconds
  isBreak: boolean;
  linkedTaskId?: string; // #29
}

export interface ArtVersion {
  id: string;
  label: string;   // ex: v1, v2, v3
  notes?: string;
  createdAt: string;
}

export interface LeadInteraction {
  id: string;
  date: string; // yyyy-MM-dd
  note: string;
  type: 'call' | 'email' | 'meeting' | 'message' | 'outro';
}

export interface Lead {
  id: string;
  name: string;
  contact?: string;   // nome do contato
  phone?: string;
  email?: string;
  instagram?: string;
  budget?: string;    // estimativa de orçamento
  notes?: string;
  stage: LeadStage;
  temperature?: 'frio' | 'morno' | 'quente'; // #35
  nextFollowUp?: string;   // yyyy-MM-dd #36
  interactions?: LeadInteraction[]; // #37
  linkedCompanyId?: string; // #38 — empresa já cadastrada
  linkedProposalIds?: string[]; // propostas enviadas a este lead
  createdAt: string;
  convertedToCompanyId?: string;
  deletedAt?: string;       // ISO — soft-delete (lixeira de 30 dias)
}

export type PaymentStatus = 'pago' | 'pendente' | 'atrasado';

export interface PaymentRecord {
  id: string;
  date: string;       // yyyy-MM-dd
  amount: number;
  description?: string;
}

export interface CompanyInteraction {
  id: string;
  date: string;       // yyyy-MM-dd
  type: 'email' | 'call' | 'meeting' | 'message' | 'outro';
  note: string;
}

export interface Company {
  id: string;
  name: string;
  color: string;
  monthlyQuota?: number;
  useQuota?: boolean;
  status?: 'ativo' | 'pausado' | 'inativo';
  avulso?: boolean;
  contractValue?: number;
  siteUrl?: string;
  platforms?: { whatsapp?: string; instagram?: string; email?: string };
  // New fields
  avatar?: string;            // initials override or base64
  cnpj?: string;
  segment?: string;
  followers?: { instagram?: number; facebook?: number; tiktok?: number; youtube?: number };
  contractStart?: string;     // yyyy-MM-dd
  contractRenewal?: string;   // yyyy-MM-dd
  invoiceDueDay?: number;     // dia do mês (1–31)
  archived?: boolean;
  paymentStatus?: PaymentStatus;
  paymentHistory?: PaymentRecord[];
  monthlyNote?: string;
  monthlyNoteMonth?: string;  // yyyy-MM — para detectar troca de mês
  nextContactDate?: string;   // yyyy-MM-dd
  linkedLeadId?: string;
  linkedProposalId?: string;
  onboardingChecklist?: Record<string, boolean>;
  feedbackRatings?: number[]; // histórico de notas 1–5
  inactivityAlertDays?: number; // padrão 30
  interactions?: CompanyInteraction[];
  compactMode?: boolean;      // exibir lista de empresas compacta
  deletedAt?: string;         // ISO — soft-delete (lixeira de 30 dias)
}

export interface SubClient {
  id: string;
  name: string;
  companyId: string;
  monthlyQuota?: number;
  platforms?: { whatsapp?: string; instagram?: string; email?: string };
  notes?: string;
  tips?: string[];   // dicas rápidas sobre o cliente
  contractValue?: number;
  siteUrl?: string;
  avatar?: string;          // initials override
  feedbackScore?: number;   // média 1–5
  deletedAt?: string;       // ISO — soft-delete (lixeira de 30 dias)
}

export type RecurrenceType = 'weekly' | 'monthly';

export interface Task {
  id: string;
  companyId: string;
  subClientId: string;
  taskCategory?: TaskCategory; // defaults to 'criacao' for backward compat
  taskType: TaskType;
  customType?: string;
  sequence: number; // 0 = none
  date: string;
  deadline?: string;       // #6 — prazo de entrega ao cliente
  time?: string;           // #7 — horário específico HH:mm
  status: TaskStatus;
  priority?: Priority;
  notes?: string;
  copy?: string;           // legenda/copy do post
  hookIdea?: string;       // ideia de hook (reels)
  references?: string[];   // URLs de moodboard/referência
  versions?: ArtVersion[]; // versionamento da arte
  allDay?: boolean;
  tags?: string[];         // #8
  subtasks?: SubTask[];    // #10
  estimate?: number;       // #11 — minutos
  colorOverride?: string;  // #12
  archived?: boolean;      // #13
  linkedProposalId?: string; // tarefa faz parte da entrega de qual proposta
  createdAt?: string;      // #17 — ISO string
  inbox?: boolean;         // sem data — caixa de entrada
  recurrence?: RecurrenceType; // #3 — repetição
  recurrenceParentId?: string; // links gerados ao pai
  deletedAt?: string;      // ISO — soft-delete (lixeira de 30 dias)
}

const TASK_TYPE_LABELS: Partial<Record<TaskType, string>> = {
  feed: 'FEED', story: 'STORY', carrossel: 'CARROSSEL', reels: 'REELS',
  thumb: 'THUMB', site: 'SITE', identidade: 'IDENTIDADE', video: 'VÍDEO', outro: 'OUTRO',
  briefing: 'BRIEFING', apresentacao: 'APRESENTAÇÃO', feedback: 'FEEDBACK',
  alinhamento: 'ALINHAMENTO', call: 'CALL', reuniao_outro: 'REUNIÃO',
  saude: 'SAÚDE', lazer: 'LAZER', estudo: 'ESTUDO', financeiro: 'FINANCEIRO', pessoal_outro: 'PESSOAL',
  lancamento: 'LANÇAMENTO', workshop: 'WORKSHOP', feira: 'FEIRA', aniversario: 'ANIVERSÁRIO', evento_outro: 'EVENTO',
};

// sequence=0 means no number in title
export function getTaskTitle(task: Task, companies: Company[], subClients: SubClient[]): string {
  const company = companies.find(c => c.id === task.companyId);
  const sub = subClients.find(s => s.id === task.subClientId);
  const typeLabel = task.taskType === 'outro'
    ? (task.customType ?? 'OUTRO').toUpperCase()
    : (TASK_TYPE_LABELS[task.taskType] ?? task.taskType.toUpperCase());
  const seqPart = task.sequence > 0 ? ` ${String(task.sequence).padStart(2, '0')}` : '';
  const clientPart = sub?.name ?? '';
  const clientStr = clientPart ? ` ${clientPart}` : '';
  return `[${company?.name ?? '?'}]${clientStr}${seqPart} [${typeLabel}]`;
}

export type ThemeTokens = {
  appBg: string; sidebarBg: string; modalBg: string;
  // CSS custom property values — set on root element
  t1: string;   // primary text
  t2: string;   // secondary text
  t3: string;   // dim text (labels, hints)
  t4: string;   // very dim (decorative)
  s1: string;   // surface / card bg
  s2: string;   // surface hover
  b1: string;   // border subtle
  b2: string;   // border medium
  b3: string;   // border strong
  ib: string;   // input background
  isLight: boolean;
};

export const THEME_VARS: Record<Theme, ThemeTokens> = {
  'dark-blue': {
    appBg: 'linear-gradient(145deg, #060912 0%, #0b1028 35%, #0d1640 60%, #060912 100%)',
    sidebarBg: 'rgba(8, 12, 30, 0.52)',
    modalBg: 'rgba(7, 11, 28, 0.84)',
    t1: 'rgba(255,255,255,0.90)', t2: 'rgba(255,255,255,0.58)', t3: 'rgba(255,255,255,0.40)', t4: 'rgba(255,255,255,0.25)',
    s1: 'rgba(255,255,255,0.07)', s2: 'rgba(255,255,255,0.12)',
    b1: 'rgba(255,255,255,0.09)', b2: 'rgba(255,255,255,0.14)', b3: 'rgba(255,255,255,0.22)',
    ib: 'rgba(255,255,255,0.08)', isLight: false,
  },
  'light-soft': {
    appBg: '#f2f0eb',
    sidebarBg: 'rgba(255,255,255,0.52)',
    modalBg: 'rgba(255,255,255,0.82)',
    t1: 'rgba(0,0,0,0.87)', t2: 'rgba(0,0,0,0.56)', t3: 'rgba(0,0,0,0.40)', t4: 'rgba(0,0,0,0.28)',
    s1: 'rgba(255,255,255,0.48)', s2: 'rgba(255,255,255,0.68)',
    b1: 'rgba(0,0,0,0.07)', b2: 'rgba(0,0,0,0.12)', b3: 'rgba(0,0,0,0.18)',
    ib: 'rgba(255,255,255,0.60)', isLight: true,
  },
};
