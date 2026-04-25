# Pendências — Evo Tasks

---

## 🎯 Status atual (2026-04-25)

**Em produção** (https://task.evostudiolab.com.br): Ondas 1, 2, 3A e 3B.

**Aguardando push + deploy:** Onda 3C — Inbox unificada + Task templates + Recurrence inteligente. Branch ahead de origin em 5 commits, bundle 339kB / 92.7kB gzip.

### Próximo passo concreto
1. Push origin/main + deploy prod fechando 3C
2. Onda 3D opcional (histórico de versões) ou ir direto pra Onda 4 (Workspaces)

## ✅ Histórico do que já está integrado

### Onda 1 (manhã 2026-04-24)
- Code-split por rota: bundle 1.3MB → 316kB (gzip 87kB)
- HomePage redesign (1812 → 646 linhas) — dashboard saudação + 4 stat chips + bento 2 colunas
- FinancePage header compacto + chips Receita/Despesa/Saldo com %
- Mobile responsivo (sidebar drawer < 860px) + ARIA básico (~40 botões)

### Onda 2 (tarde 2026-04-24)
- Cmd+K busca global (9 categorias, atalhos de página, navegação por setas)
- Notificações — sino + painel agrupado por severidade (9 tipos)
- ArchivePage / PropostasPage / GamesPage no novo design system
- Empty states ilustrados em todas as páginas principais

### Onda 3A — Cross-linking + Polish trio (resolvido localmente)
- `linkedProposalId` em Task e Idea, `linkedLeadId` + `linkedCompanyId` em Proposal, `linkedProposalIds` em Lead
- TaskModal/IdeaModal com dropdown "Vincular a proposta"
- PropostaEditor com "Lead origem" + "Empresa vinculada"
- Backlinks panel em EmpresasPage: 4 mini-cards Leads/Propostas/Ideias/Tarefas clicáveis
- Badges de vínculo nos cards
- `useSyncStore` (5 estados: idle/syncing/synced/error/offline) + pill no header
- `supabaseSync.ts` instrumentado com beginSync/endSyncOk/endSyncErr
- Page transitions com AnimatePresence (fade+y±8, 180ms)
- `PageSkeleton.tsx` com shimmer durante load inicial

### Onda 3B — Soft-delete + Lixeira
- `deletedAt?: string` em Task, Lead, Company, SubClient
- `deleteX` virou soft-delete + novas `permanentlyDeleteX` + `restoreX` + `purgeOldTrash`
- Filtros `!deletedAt` em todas as listas ativas (Kanban/Month/Week/Day/Home/BottomBar/NavSidebar/Empresas/Search/Archive/TaskModal/Settings)
- Trash views: toggle "Lixeira (N)" em CRMPage e EmpresasPage
- Toasts com "Desfazer" no soft-delete
- `purgeOldTrash()` chamado no mount (App.tsx) — limpa items > 30 dias
- supabase/schema.sql atualizado com coluna `deleted_at`

### Onda 3C — Inbox + Templates + Recurrence inteligente
- **Inbox unificada:** nova página `/inbox` agregando Tasks com `inbox:true`, Todos `status:'standby'`, Ideas `status:'rascunho'`. Ações por seção: agendar (date picker inline) · promover · descartar.
- **Task templates:** novo tipo `TaskTemplate` + `taskTemplates[]` no store. UI no TaskModal: chips de templates no topo (criação) + botão "Template" no rodapé pra salvar config atual. Templates omitem date/status/sequence.
- **Recurrence inteligente:** novo `RecurrenceRule { freq, interval, byWeekday[], byMonthDay, byMonthWeekday, count }`. Lib `src/lib/recurrence.ts` com `generateOccurrences` + `describeRule`. UI rica em TaskModal: 4 freq buttons + chips de dia da semana + Nth weekday do mês + interval + count limit + resumo descritivo.
- Casos cobertos: "toda terça e quinta", "primeira segunda do mês", "última sexta", "a cada 2 semanas", "dia 15", "todo dia".

## ❌ Onda 3D (opcional)
- Histórico de versões — snapshot on edit pra Idea e Proposal (undo profundo)

## 🏗️ Onda 4 — Workspaces (fundação massiva)

Decidido em detalhe na sessão de 2026-04-24: **workspaces COM TIPOS + CROSS-WORKSPACE LENS**.

### Decisões arquiteturais

#### Remover Gaming completamente
- Apagar `GamesPage.tsx`, `useGameStore`, `usePetsStore`, tipo `ActivePet`, badges/streaks/pets
- Remover referências de nav, settings, etc. User não quer mais essa frente.

#### Re-design do Freelance workspace
Não é só "trabalho pra agência" — inclui freela puro também.

`Empresa` ganha campo `tipo: 'agencia' | 'cliente-direto'`:
- `agencia` — agência te contrata pra atender as marcas dela (tem subclients)
- `cliente-direto` — marca te contrata direto (sem subclient layer)
- Página Empresas no Freelance ganha segmentação `[Todas | Agências | Clientes diretos]`
- Dot de cor por tipo no card

CRM no Freelance: SIM, freelancers também têm pipeline (lida com leads de agência E leads de cliente direto).

#### Hábitos no workspace AGÊNCIA (não pessoal)
User mudou de ideia: inclui mas no contexto agência, como rotinas operacionais (postar feed seg/qua/sex, revisar pipeline toda sexta, enviar fatura dia 5). NÃO é hábito pessoal.

### 4 tipos de workspace

| Tipo | Uso | Páginas |
|---|---|---|
| **Freelance Designer** | Trabalha pra agências OU clientes diretos | Empresas (com tipo agencia/cliente-direto), CRM, Tarefas, Time Tracking, Propostas, Recibos, Finanças PF, Todo, Ideias, Pomodoro |
| **Agência** | Você É a agência | Clientes (sem subclient), CRM Pipeline, Calendário Editorial, **Aprovações com upload+feedback**, Briefing, Onboarding, Faturas, KPIs, Snippets, **Hábitos operacionais**, Tarefas, Finanças PJ |
| **Pessoal** | Side projects, vida fora do trabalho | Todo, Ideias, Diário, Pomodoro, Finanças pessoais |
| **Em branco** | Custom | Liga/desliga features manualmente |

### ⭐ Cross-workspace integration — "Lentes"

Decisão chave. Não é só workspace ativo — tem uma "lente" (lens) global que controla quais workspaces aparecem nas listas.

Nav do app ganha 2 controles lado a lado no topo:
```
[👤 Freelance ▾]   [🔍 Visualizando: 1 workspace ▾]   [🔔]
   Workspace ATIVO    Lente atual
```

- **Workspace ATIVO** = onde novos itens são criados, controla quais features aparecem na nav
- **Lente** = quais workspaces aparecem nas listas/stats das páginas

**4 modos da lente:**
1. **Só ativo** (padrão) — comportamento atual, foco
2. **Todos** — mostra dados consolidados de todos os workspaces
3. **Combinar** (multi-select) — escolhe especificamente quais juntar
4. **Outro workspace** — visualiza outro sem mudar o ativo

**Comportamento por página com lente "Todos" ou "Combinar":**
- **Finanças**: 3 colunas de saldo lado a lado (Freela / Agência / Pessoal) + saldo consolidado no topo. Cada transação com badge da cor do workspace.
- **Ideias**: grid mostra ideias de todos os selecionados, cada uma com badge de workspace.
- **Tarefas/Calendário**: tarefas de todos, cor da bolinha = cor do workspace.
- **CRM/Empresas/Propostas**: lente funciona mas geralmente menos útil isolar.
- **Pomodoro/Notificações**: SEMPRE cross-workspace (você é uma pessoa), não respondem à lente.

**Regra crítica**: criar item SEMPRE cria no workspace ATIVO (mesmo com lente "Todos").

```ts
interface ViewLens {
  mode: 'active' | 'all' | 'multi' | 'other';
  selectedWorkspaceIds?: string[];
}
const visibleWorkspaceIds = useViewLens().getVisibleIds();
items.filter(i => visibleWorkspaceIds.includes(i.workspaceId))
```

Lente ATIVA aparece visualmente clara (badge colorido no header) pra usuário nunca esquecer que tá vendo cross-workspace.

### Implementação geral
- Novo tipo `Workspace { id, name, type, color, settings, createdAt }`
- Novo store `useWorkspaceStore` com `activeWorkspaceId` + `workspaces[]` + `lens: ViewLens`
- `workspaceId: string` em TODAS as entidades transacionais (Task, Company, Subclient, Lead, Idea, Proposal, Transaction, RecurringBill, Goal, Card, Invoice, ContentApproval)
- Filtros usam a lente, não só `activeWorkspaceId`
- `WorkspaceSettings.enabledPages: PageType[]` controla nav
- Migração: dados atuais → workspace `Freelance Design` (tipo: freelance). User cria `Minha Agência` zerada.

### Perguntas pendentes pro user antes de Onda 4
1. **Tema/cor por workspace?** Provavelmente sim — cor é o badge visual do workspace.
2. **Logo/avatar do workspace no switcher?** Sim, recomendado.
3. **Stats do dashboard (HomePage)** sempre seguem a lente? Ou tem stats fixas globais?
4. **Pomodoro** sempre global (confirmado pela decisão da lente). Notificações também.

## 🚀 Onda 5 — Features de agência

### Aprovações — sistema completo

**Modelo:**
```ts
type ContentType = 'card' | 'carrossel' | 'reels' | 'story' | 'video' | 'apresentacao' | 'moodboard' | 'site' | 'identidade' | 'outro';

interface ContentAsset {
  id: string;
  url: string;          // imagem/vídeo/PDF (Supabase Storage)
  type: ContentType;
  position: number;     // pra carrossel/apresentação multi-slide
  comments?: ContentComment[]; // pin em coordenada x,y do asset
}

interface ContentComment {
  id: string;
  area?: { x: number; y: number }; // pin no asset
  text: string;
  fromClient: boolean;
  resolved: boolean;
  createdAt: string;
}

interface ContentApproval {
  id: string;
  workspaceId: string;
  taskId?: string;       // linka com calendário editorial
  clientId: string;
  title: string;
  type: ContentType;
  assets: ContentAsset[];
  status: 'rascunho' | 'enviado' | 'visualizado' | 'alteracao' | 'aprovado' | 'postado';
  shareToken: string;    // URL pública /aprovar/:token
  feedback?: string;
  createdAt: string;
  sentAt?: string;
  viewedAt?: string;
  decidedAt?: string;
}
```

**Flow:**
1. Designer cria item, faz upload dos assets (Supabase Storage)
2. Marca como "Enviado" → gera link público `/aprovar/:token`
3. Cliente abre link (sem login, ou com PIN simples)
4. Cliente vê galeria, pode:
   - Clicar em coordenada do asset pra adicionar comentário ancorado
   - Escrever feedback livre
   - Botão "Pedir alteração" → status "Alteração", envia notificação
   - Botão "Aprovar" → status "Aprovado"
5. Designer recebe notificação, vê comentários ancorados
6. Faz ajustes, atualiza assets, reenvia
7. Aprovado → calendário editorial muda automaticamente pra "Pronto pra postar"

**Vínculo com Calendário Editorial:**
- Cada célula do calendário mostra status da aprovação (badge: rascunho/enviado/aprovado)
- Click na célula abre aprovação ou cria nova
- View "Aprovações" lista o que tá `awaiting` há mais de N dias com idade

### Outras features (uma por vez)
1. **Calendário Editorial** — view alternativa de tasks com `taskCategory='criacao'`, layout marcas×dias com drag-drop, mini "feed grid" do Insta
2. **Faturas** — emissão formal com numeração e PDF
3. **Briefing estruturado** — formulário fixo por cliente, link compartilhável
4. **Onboarding playbook** — checklist de boas-vindas
5. **Snippets** — biblioteca de mensagens prontas
6. **KPIs comerciais** — MRR, CAC, churn, ticket médio, LTV
7. **Hábitos operacionais** — rotinas/cadências da agência

## 🌐 Onda 6 — Cross-workspace
- **Time Tracking** dedicado (linka com Pomodoro+Tarefa)
- Modelos de tarefa
- Inbox unificada (já em 3C, mas filtrada por workspace)

## ❌ NÃO incluir
- ❌ **Hábitos pessoais** — usuário rejeitou explicitamente (só hábitos operacionais no workspace Agência)
- ❌ Leitura/Filmes/Receitas/Saúde/Compras — fora do escopo "trabalho criativo + finanças"
- ❌ Onda 4-original (Google Calendar OAuth, webhooks externos, IA) — precisa autorização separada

## 🎯 Roadmap consolidado

1. **AGORA:** push + deploy 3C
2. Onda 3D opcional (histórico de versões)
3. **Onda 4: Workspaces** — fundação massiva, mexe em tudo
4. Onda 5: features de agência (Editorial, Aprovações, Faturas, Briefing, Onboarding, Snippets, KPIs)
5. Onda 6: Time Tracking + cross-workspace polish
6. (opcional, com aprovação) Onda 4-original: Google Calendar OAuth + webhooks + IA

---

## Propostas (v1.5)
- Tema "Evo Dark" implementado (12 slides dark-blue glass). Próximos modelos: tema mais colorido/gradiente, tema minimalista B&W
- Compartilhamento real via Supabase: salvar proposta em tabela pública e expor rota `/proposta/:token` (link atual só funciona no mesmo browser)
- Upload de imagem via arquivo para portfolio: implementado com compressão automática — testar limite do localStorage com 14 imagens (~1.4MB)
- Exportar proposta como PDF (html2pdf ou Puppeteer no backend)
- Processo (Slide 4): tornar editável por serviço (os steps variam entre Logo/Site/Social Media)
- Depoimentos (Slide 7): permitir editar foto, nome e texto dos depoentes
- Outros Serviços (Slide 10): permitir editar lista de serviços exibidos
- Adicionar campo de "Notas internas" por proposta (não aparece na proposta pública)

- Trocar screenshots do "Como usar?" por imagens finais
- Adicionar sons personalizados (.mp3) no lugar dos sons gerados
- Clicar em evento do calendário (chip colorido) deve abrir CalendarEventModal para editar/excluir
- #55 syncLabel na NavSidebar aparece apenas com `lastSyncAt` preenchido; em guest mode nunca popula — considerar fallback via localStorage timestamp
- #57 Perfis salvos ficam apenas em localStorage; seria útil exportar/importar perfis junto com o backup JSON em versão futura
- #1 DnD WeekView: usa HTML5 drag nativo (funcional). Migrar para @dnd-kit/core (useDraggable/useDroppable) para melhor UX mobile e animações de overlay — KanbanView já usa @dnd-kit como referência
- #3 Recurrência: ao editar tarefa existente com recorrência, não propaga mudanças às tarefas filhas (recurrenceParentId). Futuramente: "Editar apenas esta / todas da série"
- #5 Tag filter: filterTags não persiste na URL/localização; considerar sincronizar junto com clearAllFilters no NavSidebar
- #2 Botão duplicar: DayView e KanbanView não têm botão inline de duplicar nas linhas de tarefa (apenas via TaskModal). Considerar adicionar.
