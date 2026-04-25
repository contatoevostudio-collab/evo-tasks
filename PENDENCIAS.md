# Pendências — Evo Tasks

---

## 🎯 Status atual (2026-04-25)

**Em produção** (https://task.evostudiolab.com.br): Ondas 1, 2, 3A, 3B, 3C, 4, 5 + Polish pós-MVP Onda 4.

### Próximo passo concreto
1. Onda 6: Time Tracking dedicado (linka com Pomodoro+Tarefa)
2. Onda 3D opcional (histórico de versões — snapshot on edit pra Idea e Proposal)

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

### Onda 4 — Workspaces (fundação)
- **Fase 1 — Gaming removido:** apaga GamesPage, useGameStore, usePetsStore, ActivePet, 'jogos' PageType, todas as refs nav/sync.
- **Fase 2 — Tipos + store:** `Workspace`, `WorkspaceType` (freelance/agencia/pessoal/blank), `WorkspacePalette` (8 paletas pré-definidas), `WorkspaceSettings`, `LensMode`, `ViewLens`. `useWorkspacesStore` com `workspaces[]`, `activeWorkspaceId`, `lens`, `getVisibleIds()`, `ensureDefaultWorkspace()`.
- **Fase 3 — `workspaceId?` opcional** em Task/Company/SubClient/Lead/Idea/Proposal/Transaction/FinancialGoal/Card/RecurringBill/TodoItem/CalendarEvent. Company ganha `empresaTipo: 'agencia' | 'cliente-direto'`.
- **Fase 4 — Migração:** `bootstrapWorkspaces()` cria default "Freelance Design" + atribui `workspaceId` a todas entidades legacy. Roda no mount.
- **Fase 5 — Switcher:** componente `WorkspaceSwitcher` na NavSidebar com workspace ativo (avatar com foto opcional ou inicial em gradiente da paleta) + lente (Só ativo / Todos / Combinar). `WorkspaceModal` pra criar/editar (nome, tipo, paleta, foto). Badge laranja quando lente !== 'active'.
- **Fase 6 — Filtros:** `useVisibleWorkspaceIds()` reativo + helper `isInLens()`. Aplicado em todas as views principais. Items sem workspaceId aparecem em qualquer lente (legacy fallback).

### Polish pós-MVP Onda 4 (2026-04-25)
- NavSidebar `countFor` filtra counts de tarefas por `isInLens`
- SearchModal filtra tasks/companies/leads/ideas pela lente dentro do `useMemo`
- `addTask`/`addCompany`/`addLead` auto-injetam `activeWorkspaceId` quando não fornecido
- NotificationsPanel + `useNotificationsCount` filtram todas as entidades pela lente

### Onda 5 — Features de agência (2026-04-25)
- **AprovacoesPage** — sistema de aprovação de conteúdo: `ContentApproval`, `ContentAsset`, `ContentComment`, share link `/aprovar/:token`, fluxo rascunho→enviado→visualizado→alteracao/aprovado/postado, `useContentApprovalsStore`
- **EditorialPage** — calendário mensal de tasks com `taskCategory='criacao'`, dot de status de aprovação em cada chip, navegação por mês, filtro por empresa
- **FaturasPage** — lista de faturas com cards de resumo (total/pago/pendente/vencido), modal com line items e cálculo automático de subtotal/total, `useInvoicesStore`
- **BriefingsPage** — formulários por cliente com status (rascunho/enviado/respondido), share link, 7 questões padrão, `useBriefingsStore`
- **OnboardingPage** — templates de checklist de boas-vindas com steps numerados e expansíveis, `useOnboardingStore`
- **SnippetsPage** — biblioteca de mensagens prontas com copy, filtro por categoria, contador de usos, `useSnippetsStore`
- **KPIsPage** — dashboard de 6 métricas (clientes ativos, receita do mês, faturas pendentes, tarefas concluídas, aprovações pendentes, taxa de entrega editorial) + breakdown por empresa
- **HabitosPage** — tracker de hábitos operacionais com grid dos últimos 7 dias, toggle de conclusão, suporte a frequência diária/semanal/mensal, `useHabitsStore`
- NavSidebar: novo grupo "Agência" (aprovacoes, editorial, briefings, onboarding) + "Ferramentas" (snippets, habitos) + "Gestão" (faturas, kpis)

## ❌ Onda 3D (opcional)
- Histórico de versões — snapshot on edit pra Idea e Proposal (undo profundo)

## 🌐 Onda 6 — Cross-workspace
- **Time Tracking** dedicado (linka com Pomodoro+Tarefa)
- Modelos de tarefa
- Inbox unificada (já em 3C, mas filtrada por workspace)

## ❌ NÃO incluir
- ❌ **Hábitos pessoais** — usuário rejeitou explicitamente (só hábitos operacionais no workspace Agência)
- ❌ Leitura/Filmes/Receitas/Saúde/Compras — fora do escopo "trabalho criativo + finanças"
- ❌ Onda 4-original (Google Calendar OAuth, webhooks externos, IA) — precisa autorização separada

## 🎯 Roadmap consolidado

1. ~~push + deploy Onda 4~~ ✅
2. ~~Polish pós-MVP de Onda 4~~ ✅
3. ~~Onda 5: features de agência~~ ✅
4. ~~URL routing (Option A — pushState)~~ ✅ 2026-04-25
5. ~~PIX QR Code real (EMV QRCPS BR Code)~~ ✅ 2026-04-25
6. **AGORA:** Onda 6 — Time Tracking dedicado (linka com Pomodoro+Tarefa)
7. Onda 3D opcional (histórico de versões)
8. URL routing Option B (React Router) — ver memory `project_routing_option_b.md`
9. (opcional, com aprovação) Onda 4-original: Google Calendar OAuth + webhooks + IA

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
