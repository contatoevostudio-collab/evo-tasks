# Pendências — Evo Tasks

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
