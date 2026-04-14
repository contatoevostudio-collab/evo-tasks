export type TaskStatus = 'todo' | 'doing' | 'done';
export type TaskType = 'feed' | 'story' | 'carrossel' | 'reels' | 'thumb' | 'outro';
export type ViewMode = 'kanban' | 'month' | 'week' | 'day';
export type PageType = 'home' | 'tarefas' | 'empresas' | 'arquivo';
export type Priority = 'alta' | 'media' | 'baixa';
export type Theme = 'dark-blue' | 'dark-pure' | 'dark-warm' | 'light-soft' | 'light-pure';

export interface SubTask {
  id: string;
  label: string;
  done: boolean;
}

export interface Company {
  id: string;
  name: string;
  color: string;
  monthlyQuota?: number; // artes contratadas por mês
}

export interface SubClient {
  id: string;
  name: string;
  companyId: string;
  notes?: string;
  tips?: string[];   // dicas rápidas sobre o cliente
}

export interface Task {
  id: string;
  companyId: string;
  subClientId: string;
  taskType: TaskType;
  customType?: string;
  sequence: number; // 0 = none
  date: string;
  deadline?: string;       // #6 — prazo de entrega ao cliente
  time?: string;           // #7 — horário específico HH:mm
  status: TaskStatus;
  priority?: Priority;
  notes?: string;
  allDay?: boolean;
  tags?: string[];         // #8
  subtasks?: SubTask[];    // #10
  estimate?: number;       // #11 — minutos
  colorOverride?: string;  // #12
  archived?: boolean;      // #13
  createdAt?: string;      // #17 — ISO string
  inbox?: boolean;         // sem data — caixa de entrada
}

// sequence=0 means no number in title
export function getTaskTitle(task: Task, companies: Company[], subClients: SubClient[]): string {
  const company = companies.find(c => c.id === task.companyId);
  const sub = subClients.find(s => s.id === task.subClientId);
  const type = task.taskType === 'outro'
    ? (task.customType ?? 'OUTRO').toUpperCase()
    : task.taskType.toUpperCase();
  const seqPart = task.sequence > 0 ? ` ${String(task.sequence).padStart(2, '0')}` : '';
  return `[${company?.name ?? '?'}] ${sub?.name ?? '?'}${seqPart} [${type}]`;
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
    appBg: '#080C18', sidebarBg: 'rgba(255,255,255,0.018)', modalBg: '#0b1220',
    t1: 'rgba(255,255,255,0.88)', t2: 'rgba(255,255,255,0.55)', t3: 'rgba(255,255,255,0.42)', t4: 'rgba(255,255,255,0.26)',
    s1: 'rgba(255,255,255,0.045)', s2: 'rgba(255,255,255,0.08)',
    b1: 'rgba(255,255,255,0.06)', b2: 'rgba(255,255,255,0.09)', b3: 'rgba(255,255,255,0.14)',
    ib: 'rgba(255,255,255,0.07)', isLight: false,
  },
  'dark-pure': {
    appBg: '#050505', sidebarBg: 'rgba(255,255,255,0.025)', modalBg: '#0a0a0a',
    t1: 'rgba(255,255,255,0.88)', t2: 'rgba(255,255,255,0.55)', t3: 'rgba(255,255,255,0.42)', t4: 'rgba(255,255,255,0.26)',
    s1: 'rgba(255,255,255,0.05)', s2: 'rgba(255,255,255,0.09)',
    b1: 'rgba(255,255,255,0.07)', b2: 'rgba(255,255,255,0.1)', b3: 'rgba(255,255,255,0.15)',
    ib: 'rgba(255,255,255,0.07)', isLight: false,
  },
  'dark-warm': {
    appBg: '#0d0907', sidebarBg: 'rgba(255,240,220,0.025)', modalBg: '#110c08',
    t1: 'rgba(255,240,220,0.88)', t2: 'rgba(255,240,220,0.55)', t3: 'rgba(255,240,220,0.42)', t4: 'rgba(255,240,220,0.26)',
    s1: 'rgba(255,240,220,0.04)', s2: 'rgba(255,240,220,0.08)',
    b1: 'rgba(255,240,220,0.06)', b2: 'rgba(255,240,220,0.09)', b3: 'rgba(255,240,220,0.14)',
    ib: 'rgba(255,240,220,0.07)', isLight: false,
  },
  'light-soft': {
    appBg: '#F2F2F7', sidebarBg: 'rgba(0,0,0,0.03)', modalBg: '#FFFFFF',
    t1: 'rgba(0,0,0,0.87)', t2: 'rgba(0,0,0,0.55)', t3: 'rgba(0,0,0,0.42)', t4: 'rgba(0,0,0,0.28)',
    s1: 'rgba(0,0,0,0.04)', s2: 'rgba(0,0,0,0.07)',
    b1: 'rgba(0,0,0,0.07)', b2: 'rgba(0,0,0,0.11)', b3: 'rgba(0,0,0,0.17)',
    ib: 'rgba(0,0,0,0.05)', isLight: true,
  },
  'light-pure': {
    appBg: '#FFFFFF', sidebarBg: 'rgba(0,0,0,0.02)', modalBg: '#F8F8FA',
    t1: 'rgba(0,0,0,0.87)', t2: 'rgba(0,0,0,0.55)', t3: 'rgba(0,0,0,0.42)', t4: 'rgba(0,0,0,0.28)',
    s1: 'rgba(0,0,0,0.035)', s2: 'rgba(0,0,0,0.065)',
    b1: 'rgba(0,0,0,0.065)', b2: 'rgba(0,0,0,0.1)', b3: 'rgba(0,0,0,0.16)',
    ib: 'rgba(0,0,0,0.045)', isLight: true,
  },
};
