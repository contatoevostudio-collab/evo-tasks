# Evo Tasks — Design System

Sistema visual base extraído da aba **Finanças**. Aplicar o mesmo conceito em todas as outras telas (Home, CRM, Empresas, Arquivo, Ideias, etc.) para manter coesão.

---

## Tokens fundacionais

> Definidos em `:root` no `src/index.css`. Use-os via `var(--token)`.

### 1. Z-index scale
```css
--z-base:      0;
--z-dropdown:  10;
--z-sticky:    20;
--z-overlay:   40;
--z-modal:     50;
--z-toast:    100;
--z-tooltip:  200;
--z-confetti: 9999;
```
**Regra:** nunca escreva z-index hard-coded; puxe do token. Dropdown sempre abaixo de modal, modal abaixo de toast.

### 2. Elevation ladder (sombras sem glow)
```css
--shadow-xs: 0 1px 2px rgba(0,0,0,.10);
--shadow-sm: 0 2px 6px rgba(0,0,0,.14);
--shadow-md: 0 6px 18px rgba(0,0,0,.22);
--shadow-lg: 0 12px 32px rgba(0,0,0,.30);
--shadow-xl: 0 24px 60px rgba(0,0,0,.38);
--shadow-2xl: 0 32px 80px rgba(0,0,0,.45);
```
| Uso | Shadow |
|---|---|
| Chip em card | `--shadow-xs` |
| Card em hover | `--shadow-sm` |
| Dropdown, popover | `--shadow-md` |
| Menu flutuante | `--shadow-lg` |
| Modal | `--shadow-xl` |
| Modal de destaque | `--shadow-2xl` |

**Regra:** `elevation` é profundidade neutra (preto). `glow` é cor semântica. Um card pode ter os dois (ex: shadow-md + glow verde).

### 3. Opacity scale semântica
```css
--op-disabled:     0.40;
--op-muted:        0.55;
--op-secondary:    0.70;
--op-hover:        0.85;
--op-overlay-bg:   0.50;   /* backdrop de modal */
--op-card-overlay: 0.92;   /* botão branco sobre gradiente */
```
**Regra:** qualquer `opacity:0.X` no estilo deve vir de token.

### 4. Easing curves
```css
--ease-out:    cubic-bezier(.4, 0, .2, 1);   /* default, entrada suave */
--ease-snap:   cubic-bezier(.2, 0, .2, 1);   /* hover rápido */
--ease-pop:    cubic-bezier(.15, .9, .3, 1); /* bounce leve, modal/toast */
--ease-in-out: cubic-bezier(.4, 0, .6, 1);   /* reversível */
```
**Regra:** nunca use `ease` ou `ease-in-out` literal. Use o token correto pro contexto.

### 5. Spacing scale
```css
--sp-1:  2px    --sp-2:  4px    --sp-3:  6px    --sp-4:  8px
--sp-5: 10px    --sp-6: 12px    --sp-7: 14px    --sp-8: 16px
--sp-9: 20px    --sp-10: 24px   --sp-11: 28px   --sp-12: 32px
--sp-14: 40px   --sp-16: 48px
```
**Regra:** padding, margin, gap — sempre múltiplos da escala. Os valores de referência na UI atual:
- Gap entre cards: `--sp-7` (14px)
- Padding de card padrão: `--sp-9` (20px) ou `18px`
- Padding de página: `--sp-11 --sp-11` (28px laterais)

### 6. Border widths
```css
--bw-thin:  1px   /* bordas padrão de card/input */
--bw-med:  1.5px  /* seleção ativa, foco */
--bw-thick: 2px   /* checkbox, radio, dropzone tracejada */
```

### 7. Breakpoints responsivos
Ainda não implementados via CSS var (limitação do @media), mas documentados:
```
mobile:  0–640px
tablet:  641–900px
desktop: 901px+
```
**Regra:** layouts principais desktop-first. Ao adicionar `@media (max-width: 640px)` ou `@media (max-width: 900px)`, colapsar sidebar de 320px → full-width embaixo do main.

### 8. Touch targets mínimos
```css
--tt-desktop: 32px   /* tamanho mínimo de área clicável em desktop */
--tt-mobile:  44px   /* mobile, conforme Apple HIG */
```
**Regra:** botões de ícone puros não podem ser menores que `--tt-desktop` em width+height. Para mobile aumentar.

### 9. Reduced motion
Duas camadas:
- **Setting do usuário:** classe `.no-animations` no root do app zera durations
- **OS-level:** `@media (prefers-reduced-motion: reduce)` também desliga automaticamente

**Regra:** nunca depender de animação pra transmitir informação essencial. Toda transição deve ser decorativa ou opcional.

### 10. Font weights
```css
--fw-regular:  400   /* body, parágrafos */
--fw-medium:   500   /* labels secundárias */
--fw-semibold: 600   /* botões, chips, ênfase leve */
--fw-bold:     700   /* títulos, valores, CTAs */
```
**Regra:** nunca usar 300 ou 800. A escala é 400/500/600/700 — nada mais.

### Line-heights
```css
--lh-tight:   1.1   /* valor em destaque (saldo total) */
--lh-snug:    1.2   /* títulos */
--lh-normal:  1.3   /* body geral */
--lh-relaxed: 1.5   /* parágrafo longo, help text */
```

---

## Cor & tema

### 11. Tema light vs dark (tokens por tema)
Valores em `src/types.ts` (`THEME_VARS`), injetados por `src/App.tsx` via `cssVars`.

| Token | dark-blue | light-soft |
|---|---|---|
| `--s1` (card bg) | `rgba(255,255,255,0.07)` | `rgba(255,255,255,0.48)` |
| `--s2` (sub-card) | `rgba(255,255,255,0.12)` | `rgba(255,255,255,0.68)` |
| `--b2` (borda) | `rgba(255,255,255,0.14)` | `rgba(0,0,0,0.12)` |
| `--b3` (borda forte) | `rgba(255,255,255,0.22)` | `rgba(0,0,0,0.18)` |
| `--t1` (texto primário) | `rgba(255,255,255,0.90)` | `rgba(0,0,0,0.87)` |
| `--t2` | `rgba(255,255,255,0.58)` | `rgba(0,0,0,0.56)` |
| `--t3` | `rgba(255,255,255,0.40)` | `rgba(0,0,0,0.40)` |
| `--t4` (muted) | `rgba(255,255,255,0.25)` | `rgba(0,0,0,0.28)` |
| `--ib` (input) | `rgba(255,255,255,0.08)` | `rgba(255,255,255,0.60)` |

**App bg:** dark = `#000` sólido; light = `#f2f0eb`.

**Regra:** componentes novos consomem tokens — nunca hard-code `#fff` ou `#000` pra texto/superfície. Pra glow/accent a cor é a mesma nos dois temas (ela se destaca igual no claro/escuro).

### 12. Contraste mínimo AA
Ratio mínimo texto/fundo:
- **Texto normal:** `4.5:1`
- **Texto grande (>= 18px bold / 22px regular):** `3:1`
- **Elementos não-textuais (ícone, borda):** `3:1`

**Combinações seguras:**
- `--t1` em `--s1` ✓
- `--t2` em `--s1` ✓
- `--t3` em `--s1` ✓ (limite — só pra meta/label)
- `--t4` em `--s1` ✗ pra texto — **só decorativo** (ex: ícone empty state com `opacity: 0.3`)

**Regra:** nunca usar `--t4` pra valor numérico ou texto que o user precise ler. Pra indicar "disabled" use `opacity: var(--op-disabled)` no elemento inteiro.

### 13. Gradient library nomeada
Definidos em `:root` no CSS:
```css
var(--grad-balance)        /* azul total balance */
var(--grad-income)         /* halo verde em card */
var(--grad-expense)        /* halo vermelho em card */
var(--grad-success-pill)   /* pill verde saturado */
var(--grad-danger-pill)    /* pill vermelho saturado */
var(--grad-card-sheen)     /* sheen diagonal 115° sobre qualquer card */
var(--grad-subscription)   /* roxo recorrente */
```
**Regra:** nunca recriar degradês inline. Se precisar de um novo, adiciona em `:root` com nome semântico.

### 14. Accent color awareness
O app tem um accent color dinâmico (`useTaskStore().accentColor`, default `#356BFF`).

**Regra obrigatória:** nenhum componente **pode hard-codar azul**. Sempre:
```tsx
const { accentColor } = useTaskStore();
// usa accentColor no botão / halo / gradient dinâmico
```
Isso faz o app respeitar a preferência do user quando ele troca o accent.

Quando precisar do accent em CSS (não TSX), o App.tsx já expõe `var(--accent)` como CSS var.

### 15. Texto sobre cor saturada
Quando o fundo é uma cor saturada (pill verde, pill vermelho, gradient azul do balance), escolher o texto assim:

| Fundo | Cor do texto | Motivo |
|---|---|---|
| Azul saturado (accent, grad-balance) | `#fff` | melhor contraste |
| Verde saturado (`#30d158`) | `#071007` (quase-preto) | texto escuro em verde neon lê muito melhor |
| Vermelho saturado (`#ff453a`) | `#fff` ou `#1a0606` | ambos funcionam, `#fff` mais legível em tamanho pequeno |
| Gradient accent com transparência baixa | `rgba(255,255,255,0.85)` | mantém suavidade |

**Regra:** pills verdes/vermelhos usam texto escuro. Botões e CTAs azuis usam texto branco.

---

## Tipografia

- **Fonte:** `DM Sans` (fallback: `system-ui`, `-apple-system`, `sans-serif`) — definida em `src/index.css`
- **Smoothing:** `-webkit-font-smoothing: antialiased`

### Hierarquia (px)

| Uso | Tamanho | Weight | Observações |
|---|---|---|---|
| Título de página | `22` | `700` | Ex: "Finanças" |
| Subtítulo do título | `14` | `400` | Cor `--t3`, em linha com o título |
| Header de card | `14` | `700` | |
| Descrição do card | `10` | `400` | Cor `--t4` |
| Valor em destaque | `38` | `700` | line-height `1`. Ex: saldo total |
| Valor médio | `22` | `700` | Ex: income/expense |
| Valor pequeno em lista | `12-13` | `700` | |
| Label uppercase | `9` | `700` | `letter-spacing: 1.5px`, `text-transform: uppercase` |
| Label secundário | `10-11` | `500-600` | |
| Body em lista | `12` | `500` | |
| Meta / auxiliar | `10-11` | `400` | Cor `--t4` |

### Letter-spacing
- `1.2–2px` apenas em labels uppercase e texto monoespaçado (código, número de cartão)
- Caso contrário, default

### 16. Tabular numerals (alinhamento vertical)
Aplicar em tabelas, colunas de valor e qualquer lugar onde números precisam alinhar:
```tsx
<span className="nums-tabular">R$ 1.234,56</span>
```
Ou em estilo inline:
```tsx
style={{ fontVariantNumeric: 'tabular-nums' }}
```
**Regra:** tabelas de transações, cards de saldo, colunas de preço — sempre tabular.

### 17. Line-heights por contexto
| Contexto | Valor | Token |
|---|---|---|
| Valor em destaque (saldo, 32-38px) | `1.1` | `--lh-tight` |
| Títulos (22-24px) | `1.2` | `--lh-snug` |
| Body geral (12-14px) | `1.3` | `--lh-normal` |
| Parágrafo longo, help text | `1.5` | `--lh-relaxed` |

### 18. Truncation patterns
Classes utility no CSS global:
```tsx
<span className="truncate">texto muito longo que vai cortar com ...</span>
<p className="clamp-2">texto que corta em 2 linhas</p>
<p className="clamp-3">texto que corta em 3 linhas</p>
```
**Regra:** nunca deixar texto quebrar em layouts de largura fixa. Nomes de transação, descrições de task, etc — sempre `truncate` ou `clamp-X`.
Requisito: pai precisa ter `min-width: 0` se estiver em flex (já incluído na classe).

### 19. Formatação numérica padrão (`src/lib/format.ts`)
Nunca escreva `toLocaleString` ou `.toFixed` direto em componente. Use:

```ts
import { fmtBRL, fmtShort, fmtShortNum, fmtPct, fmtInt } from '../lib/format';

fmtBRL(1234.56)    // "R$ 1.234,56"
fmtShort(1234.56)  // "R$ 1,2k"
fmtShort(456)      // "R$ 456"
fmtShortNum(1234)  // "1,2k"  (sem R$)
fmtPct(15.7)       // "+15,7%"
fmtPct(-3.2)       // "−3,2%"
fmtInt(1234)       // "1.234"
```
**Regra:** toda exibição de moeda/% passa por aí. Se precisar de formato novo, adiciona em `format.ts` — não em componente.

### 20. Formatação de datas pt-BR padrão
Tokens de formato centralizados em `src/lib/format.ts`:

```ts
import { fmtDate, DATE_FMT } from '../lib/format';

fmtDate(new Date(), 'short')          // "21/04/2026"
fmtDate(new Date(), 'monthDay')       // "21 de abril"
fmtDate(new Date(), 'monthYear')      // "abr 2026"
fmtDate('2026-04-21', 'short')        // aceita ISO string também
```

Tokens disponíveis: `short`, `shortNoYear`, `long`, `monthDay`, `monthYear`, `monthShort`, `iso`, `monthKey`, `time`, `shortWithTime`.

**Regra:** nenhum componente chama `format()` do date-fns com string mágica. Use os tokens — se precisar de um formato novo, adiciona em `DATE_FMT`.

---

## Cores (tokens globais)

### Superfícies e texto
| Token | Uso |
|---|---|
| `--s1` | Background de card principal |
| `--s2` | Subcard / hover state |
| `--b2` | Borda padrão |
| `--b3` | Borda forte |
| `--ib` | Background de input |
| `--t1` | Texto primário |
| `--t2` | Texto secundário |
| `--t3` | Texto terciário |
| `--t4` | Texto muted / label auxiliar |

### Accent
- `--accent` / `accentColor` do `useTaskStore` — azul `#356BFF` por padrão

### Semânticos
| Cor | Hex | RGB triplet (para `--glow`) | Uso |
|---|---|---|---|
| Sucesso / Receita | `#30d158` | `48,209,88` | Income, pago, meta atingida |
| Erro / Despesa / Atraso | `#ff453a` | `255,69,58` | Expense, overdue, excluir |
| Alerta / Pendente | `#ff9f0a` | `255,159,10` | Status pendente |
| Info / Recorrente | `#bf5af2` | `191,90,242` | Subscriptions, tags info |
| Neutro | `#636366` | `99,99,102` | Cancelado, inativo |

### Paleta de categorias (charts/donut)
```ts
['#30d158', '#ff9f0a', '#ff453a', '#64d2ff', '#bf5af2', '#ffd60a', '#ff375f', '#5e5ce6']
```

---

## Cards — padrão base

```ts
{
  background: 'var(--s1)',
  borderRadius: 16,
  padding: 18,
  border: '1px solid var(--b2)',
}
```

### Regra de stroke (borda)

**Obrigatório em todo card do bento.** Todos os cards de conteúdo devem ter `border: '1px solid var(--b2)'` (raio 16). Isso dá hierarquia visual consistente.

**Exceção — cards de cor sólida/gradiente.** Cards que já têm preenchimento saturado (ex: Total Balance azul, card de Income/Expense com halo, cartões de crédito) **NÃO levam stroke** — o gradiente/halo já define o contorno. Adicionar borda por cima visual polui.

**Checklist rápido antes de criar um card novo:**
- Fundo é `--s1` (dark/light neutro)? → **tem stroke**
- Fundo é gradient/cor sólida viva? → **sem stroke**
- Fundo é `--s1` com halo radial sutil (apenas `backgroundImage` tint)? → **ainda tem stroke**, o halo não substitui a borda

### Raios de borda
- **Grande:** `16-18px` — cards principais
- **Médio:** `10-12px` — subcards dentro de cards
- **Pequeno:** `8px` — inputs, linhas de tabela, chips
- **Pill:** `99px` — badges, botões arredondados

### Padding por tamanho
- Card pequeno: `14-16px`
- Card médio: `18px` (padrão)
- Card destaque: `20-22px`

---

## Efeitos de glow (aurora) — em `src/index.css`

> **Regra de ouro:** toda cor visível em um elemento projeta glow da **mesma cor**.

### Classes utility
```css
/* Intenso — pills e CTAs */
.glow {
  box-shadow:
    0 0 12px 0 rgba(var(--glow), 0.45),
    0 0 28px 0 rgba(var(--glow), 0.25),
    0 0 52px 0 rgba(var(--glow), 0.14);
}

/* Suave — estados secundários */
.glow-soft {
  box-shadow:
    0 0 10px 0 rgba(var(--glow), 0.30),
    0 0 22px 0 rgba(var(--glow), 0.14);
}

/* Halo ambiental em cards grandes */
.ambient-glow::after {
  content: '';
  position: absolute;
  inset: -22% -18%;
  background: radial-gradient(closest-side, rgba(var(--glow), 0.55), transparent 70%);
  filter: blur(40px);
  z-index: -1;
  opacity: 0.55;
}
```

### Como aplicar em um elemento colorido
```tsx
<span
  className="glow"
  style={{
    background: '#30d158',
    color: '#071007',
    ['--glow' as any]: '48,209,88', // mesmo RGB do background
  }}>
  +15.7%
</span>
```

### Ambient em cards com estado
Cards que representam estado (verde/vermelho/azul) ganham halo radial interno:
```ts
{
  backgroundImage: `radial-gradient(circle at 110% 100%, rgba(${rgb}, 0.22), transparent 58%)`,
  boxShadow: `0 0 0 1px var(--b2), 0 0 30px -8px rgba(${rgb}, 0.35)`,
}
```

---

## Pills / Badges

```ts
{
  fontSize: 10,
  fontWeight: 700,
  padding: '2-3px 8-9px',
  borderRadius: 99,
  color: '#071007', // quando fundo é saturado
}
```
- Sempre com `.glow` + `--glow` da cor do fundo
- Altura visual: `16-18px`

---

## Botões

### Primário (CTA)
```ts
{
  background: accentColor,
  color: '#fff',
  fontSize: 12,
  fontWeight: 700,
  padding: '8-9px 16-18px',
  borderRadius: 10-12,
  boxShadow: `0 0 20px -4px ${accent}88`,
  transition: 'opacity .15s',
}
// Hover: opacity 0.85
```

### Pill escuro (sobre gradiente)
```ts
{
  background: '#0e1220',
  color: '#fff',
  borderRadius: 99,
  padding: '9px 18px',
  fontSize: 11,
  fontWeight: 700,
}
```

### Pill branco (secundário sobre gradiente)
```ts
{ background: 'rgba(255,255,255,0.92)', color: '#0e1220', /* resto igual */ }
```

### Chip de seleção (ex: "Mensal", "Aug")
```ts
{
  background: 'var(--s2)',
  border: '1px solid var(--b2)',
  color: 'var(--t2)',
  fontSize: 11,
  fontWeight: 600,
  borderRadius: 99,
  padding: '4px 12px',
}
```

---

## Header de página — padrão fixo

```
┌──────────────────────────────────────────────────────────┐
│ [Título 22/700] [— subtítulo 14/400 cor t3]  [control] [CTA]
└──────────────────────────────────────────────────────────┘
padding: 20px 28px 0
```

### Seletor de período/mês
- Fundo: `--s1`
- Borda: `1px solid var(--b2)`
- Radius: `10px`
- Altura: `~36px`
- Setas `FiChevronLeft/Right` size `14`
- Label central: `13/600`

---

## Layout / wireframe (bento grid)

### Container scrollável
```ts
{ padding: '16px 28px 28px', display: 'grid', gap: 14 }
```

### Classes CSS de bento responsivas
Em vez de `gridTemplateColumns` inline, usar as classes que já têm media queries:

```tsx
<div className="bento-grid bento-hero">...</div>     // 1.8fr 1fr (big + stats)
<div className="bento-grid bento-chart">...</div>    // 1.6fr 1fr (chart + side)
<div className="bento-grid bento-split">...</div>    // 1.5fr 1fr (cal + sec)
<div className="bento-grid bento-sidebar">...</div>  // 1fr 320px (main + sidebar)
<div className="bento-grid bento-2col">...</div>     // 1fr 1fr
<div className="bento-grid bento-3col">...</div>     // 1fr 1fr 1fr
```

**Regra obrigatória:** todo grid de layout de página usa essas classes (não inline `gridTemplateColumns`). Classes respeitam os breakpoints automaticamente.

### Breakpoints responsivos
Definidos em `src/index.css`:

| Largura | Comportamento |
|---|---|
| `> 1100px` (desktop) | layout original (hero 1.8fr + stats, sidebar 320px, etc) |
| `701–1100px` (tablet) | `.bento-hero`, `.bento-chart`, `.bento-sidebar`, `.bento-split` colapsam pra 1 coluna; `.bento-3col` vira 2 colunas |
| `≤ 700px` (mobile) | TUDO em 1 coluna (override `!important`) |

A classe `.bento-grid` também aplica `min-width: 0` em todos os filhos diretos, evitando overflow horizontal quando conteúdo é largo.

**Regra:** nunca escrever `display: grid; gridTemplateColumns: ...` inline em bento de página. Usar sempre uma das classes acima — caso contrário não responde no mobile.

### Orphan fill — nunca deixar buraco
Quando o número de itens não divide igualmente pelas colunas, o último item fica sozinho deixando espaço vazio à direita. As classes bento resolvem isso automaticamente via `grid-column: span` no `:last-child`:

| Cenário | Regra aplicada |
|---|---|
| `bento-2col` com 3 itens | item 3 ocupa 2 colunas (linha inteira) |
| `bento-3col` em tablet (vira 2-col) com 3 itens | item 3 ocupa 2 colunas |
| `bento-3col` em desktop com 4 itens | item 4 ocupa 3 colunas (linha inteira) |
| `bento-3col` em desktop com 5 itens | item 5 ocupa 2 colunas (cols 2-3) |

**Regra:** nunca adicionar `gridColumn` inline em card dentro de bento. As classes já cuidam dos orphans automaticamente.

**Observação:** se você quiser explicitamente QUE o orphan NÃO preencha (ex: propósito de alinhamento à esquerda), está sinalizando um design especial — reavalie o layout antes de forçar.

### Gap padrão
- Entre cards: `14px` (incluso na classe `.bento-grid`)
- Entre elementos dentro de card: `8-12px`

---

## Ícones

- **Biblioteca:** `react-icons/fi` (Feather Icons)
- **Regra:** sempre `react-icons/fi`, nunca misturar famílias

### Tamanhos
| Contexto | Size |
|---|---|
| Micro (inline, botões pequenos) | `11` |
| Inline em labels | `13-14` |
| Header de modal | `16` |
| Ícone central de empty state | `22-24` |

### Ícone em "quadradinho"
```ts
{
  width: 28-34,
  height: 28-34,
  borderRadius: 8-10,
  background: `rgba(${colorRgb}, 0.12-0.15)`,
  // ícone dentro com color: accentColor ou color semântico
}
```

---

## Gráficos

### Bar chart
- Barras com gradiente vertical: `linear-gradient(180deg, ${color} 0%, ${color}66 100%)`
- Radius: `10`
- Barra ativa com glow: `box-shadow: 0 0 24px -2px ${color}88, 0 0 60px -20px ${color}99`
- Barras inativas: branco fantasma `rgba(255,255,255,0.12)`

### Donut
- Stroke: `14px`
- Raio: `54`
- `strokeLinecap: round`
- `filter: drop-shadow(0 0 4px ${color}cc)` em cada segmento
- Total no centro: `18/700` + label `TOTAL` (`9/uppercase/1.5px`)

---

## Componentes de formulário (`src/components/ui/`)

> Todos importáveis de `src/components/ui` (barrel `index.ts`).

### 21. Switch / Toggle
```tsx
import { Switch } from '../components/ui';

<Switch checked={on} onChange={setOn} />
<Switch checked={on} onChange={setOn} label="Notificações" />
<Switch checked={on} onChange={setOn} label="Modo escuro" description="Usa tema dark-blue" size="sm" />
```
Track vira accent + glow quando ligado. Tamanhos `sm` (28×16) e `md` (36×20).

### 22. Checkbox
```tsx
import { Checkbox } from '../components/ui';

<Checkbox checked={x} onChange={setX} />
<Checkbox checked={x} onChange={setX} label="Aceito os termos" />
<Checkbox checked indeterminate onChange={setX} label="Selecionar todas" />
```
18×18, radius 5, border 2px, check branco. Estado `indeterminate` mostra `−`.

### 23. Radio group
```tsx
import { RadioGroup } from '../components/ui';

<RadioGroup
  value={freq}
  onChange={setFreq}
  options={[
    { value: 'daily',   label: 'Diário' },
    { value: 'weekly',  label: 'Semanal', description: 'Toda segunda' },
    { value: 'monthly', label: 'Mensal' },
  ]}
/>
```
Use pra escolha única em listas curtas (≤6). Mais que isso, use `Select`.

### 24. Segmented control
```tsx
import { Segmented } from '../components/ui';

<Segmented
  value={view}
  onChange={setView}
  options={[
    { value: 'day',   label: 'Dia' },
    { value: 'week',  label: 'Semana' },
    { value: 'month', label: 'Mês' },
  ]}
/>
```
Chips conectados com indicador deslizante (Framer `layoutId`). Substitui tabs simples.

### 25. Select (dropdown custom)
```tsx
import { Select } from '../components/ui';

<Select
  value={category}
  onChange={setCategory}
  placeholder="Categoria..."
  options={[
    { value: 'food',  label: 'Alimentação' },
    { value: 'tx',    label: 'Transporte', description: 'Uber, gasolina, etc' },
  ]}
/>
```
Suporte a keyboard nav (↑↓ Enter Esc). Ícones e descrição opcionais por option.

### 26. Autocomplete
```tsx
import { Autocomplete } from '../components/ui';

<Autocomplete
  value={clientId}
  onChange={setClientId}
  options={clients.map(c => ({ value: c.id, label: c.name, description: c.email }))}
  placeholder="Buscar cliente..."
  allowCreate
  onCreate={(name) => createClient(name)}
/>
```
Input + lista filtrada em tempo real. `allowCreate` mostra "+ Criar X" quando não há match.

### 27. SearchInput
```tsx
import { SearchInput } from '../components/ui';

<SearchInput value={q} onChange={setQ} placeholder="Buscar transações..." />
<SearchInput value={q} onChange={setQ} size="sm" width={200} onSubmit={doSearch} />
```
Ícone lupa + botão `✕` aparece quando tem valor. Substitui todas as barras de busca.

### 28-30. Input, Textarea e Field (label/helper/error)
```tsx
import { Field, TextInput, Textarea } from '../components/ui';

// Forma curta (input sem label)
<TextInput value={n} onChange={setN} placeholder="Nome" />

// Forma completa com Field
<Field label="E-mail" required helper="Não compartilhamos com ninguém" error={emailErr}>
  <TextInput value={email} onChange={setEmail} type="email" invalid={!!emailErr} />
</Field>

<Field label="Descrição">
  <Textarea value={desc} onChange={setDesc} rows={4} />
</Field>
```

- **`<Field>`** envelopa label + campo + helper/error/success
- **`<TextInput>`** aceita `invalid`, `success`, `leftIcon`, `rightIcon`
- **`<Textarea>`** idem com `rows` e resize vertical automático
- Focus ring sutil: 3px de cor accent/verde/vermelho conforme estado

---

## Componentes interativos (`src/components/ui/`)

### 31. Tooltip
```tsx
import { Tooltip } from '../components/ui';

<Tooltip content="Editar tarefa" placement="top">
  <button><FiEdit2 /></button>
</Tooltip>
```
Placements: `top` (default), `bottom`, `left`, `right`. Delay padrão 300ms. Trigger deve ser um `ReactElement` único.

### 32. Menu (dropdown por click)
```tsx
import { Menu } from '../components/ui';

<Menu items={[
  { label: 'Editar', icon: <FiEdit2 size={11} />, onClick: () => {}, shortcut: '⌘E' },
  { label: 'Duplicar', onClick: () => {} },
  { divider: true },
  { label: 'Excluir', destructive: true, onClick: () => {} },
]}>
  <button><FiMoreHorizontal /></button>
</Menu>
```
Props: `align` (`start`/`end`), `width`. Fecha no click fora e ESC.

### 33. ContextMenu (right-click)
```tsx
import { ContextMenu } from '../components/ui';

<ContextMenu items={[...]}>
  <div>Right-click aqui abre menu</div>
</ContextMenu>
```
Aparece exatamente onde o cursor clicou. Mesma API de `items` do `Menu`.

### 34. CommandPalette (⌘K)
```tsx
import { CommandPalette, useCommandShortcut } from '../components/ui';

const [open, setOpen] = useState(false);
useCommandShortcut(() => setOpen(o => !o)); // registra ⌘K globalmente

<CommandPalette
  open={open} onClose={() => setOpen(false)}
  items={[
    { id: 'new-task', label: 'Nova tarefa', group: 'Ações', icon: <FiPlus />, shortcut: '⌘N', onRun: openNewTask },
    { id: 'goto-home', label: 'Ir para Home', group: 'Navegação', onRun: () => setPage('home') },
    { id: 'goto-fin', label: 'Ir para Finanças', group: 'Navegação', keywords: ['dinheiro','financeiro'], onRun: () => setPage('finance') },
  ]}
/>
```
Busca fuzzy em `label`, `group`, `keywords`. Keyboard: ↑↓ navegar, Enter executa, Esc fecha. Agrupa por `group`.

### 35. Tabs
```tsx
import { Tabs } from '../components/ui';

<Tabs value={tab} onChange={setTab} tabs={[
  { value: 'overview', label: 'Visão' },
  { value: 'tx', label: 'Transações', count: 24 },
  { value: 'metas', label: 'Metas', icon: <FiTarget size={12} /> },
]} />
```
Underline desliza com `layoutId` do Framer. Badge de contagem opcional.

### 36. Accordion
```tsx
import { Accordion } from '../components/ui';

<Accordion items={[
  { id: 'q1', title: 'Como funciona?', subtitle: '1 min de leitura', content: <p>...</p> },
  { id: 'q2', title: 'Posso exportar?', content: <p>...</p>, defaultOpen: true },
]} allowMultiple />
```
Por padrão só um aberto por vez. `allowMultiple` libera vários.

### 37. Popover
```tsx
import { Popover } from '../components/ui';

<Popover content={<ColorPicker onChange={...} />} placement="bottom" width={240}>
  <button>Escolher cor</button>
</Popover>
```
Igual Tooltip mas clicável e pode conter UI rica. Fecha no click fora e ESC. Prop `trigger="hover"` opcional.

### 38. Drawer
```tsx
import { Drawer } from '../components/ui';

<Drawer
  open={open} onClose={close} side="right" width={380}
  title="Editar tarefa"
  footer={<button onClick={save}>Salvar</button>}
>
  <form>...</form>
</Drawer>
```
Slide lateral. `side: 'left' | 'right'`, backdrop blur com click pra fechar, ESC também.

### 39. ConfirmDialog
```tsx
import { ConfirmDialog } from '../components/ui';

<ConfirmDialog
  open={confirmOpen} onClose={() => setConfirmOpen(false)}
  onConfirm={() => deleteItem(id)}
  title="Excluir essa transação?"
  description="Ela some do histórico e do saldo — essa ação não pode ser desfeita."
  confirmLabel="Excluir" destructive
/>
```
Dialog 360px com ícone de alerta (se `destructive`) + descrição + Cancelar/Confirmar. Enter confirma, Esc cancela.

### 40. Stepper
```tsx
import { Stepper } from '../components/ui';

<Stepper
  current={1}
  steps={[
    { id: 'info', label: 'Informações' },
    { id: 'pay', label: 'Pagamento', description: 'cartão ou pix' },
    { id: 'done', label: 'Confirmar' },
  ]}
  onStepClick={(i) => goToStep(i)}
/>
```
Círculos numerados conectados. Passos anteriores ficam com `✓`, atual glow accent, próximos pálidos. Orientação `horizontal` (default) ou `vertical`.

---

## Data display (`src/components/ui/`)

### 41. Avatar
```tsx
import { Avatar } from '../components/ui';

<Avatar name="Gabriel Busquet" size="md" status="online" />
<Avatar src="https://.../foto.jpg" size="lg" />
```
Tamanhos: `xs`(20), `sm`(24), `md`(32), `lg`(40), `xl`(56).
Fallback: iniciais (1-2 letras) sobre fundo colorido determinístico pelo hash do nome.
Status dot opcional: `online`, `offline`, `busy`, `away` — com glow quando `online`.

### 42. AvatarStack
```tsx
import { AvatarStack } from '../components/ui';

<AvatarStack max={4} size="sm" avatars={[
  { name: 'Ana Silva' },
  { name: 'Bruno Costa' },
  { name: 'Carla Moraes' },
  { name: 'Diego Santos' },
  { name: 'Elisa' },
]} />
// Renderiza 4 + "+1"
```
Overlap de ~32% do tamanho, ring de 2px `--s1` separando cada um.

### 43. Tag
```tsx
import { Tag } from '../components/ui';

<Tag>urgente</Tag>                                      // soft (default)
<Tag color="#ff453a" variant="solid">atrasado</Tag>     // com glow
<Tag color="#5e5ce6" variant="outline">cliente A</Tag>
<Tag onRemove={() => removeTag(id)}>categoria</Tag>      // com ✕
```
3 variantes: `soft` (fundo 14%, borda 28%), `solid` (saturado + glow), `outline` (só borda + texto).

### 44. StatusDot
```tsx
import { StatusDot } from '../components/ui';

<StatusDot status="online" pulse />
<StatusDot status="error" label="Sync falhou" />
```
Tipos: `online`, `offline`, `busy`, `away`, `success`, `error`, `warning`, `info`. Sempre com glow da cor. `pulse` ativa animação de pulsar.

### 45. Badge
```tsx
import { Badge } from '../components/ui';

<Badge count={3}><FiBell size={16} /></Badge>
<Badge dot color="success"><Avatar name="User" /></Badge>
<Badge count={120} max={99}><button>Inbox</button></Badge>   // mostra "99+"
```
Flutua no canto superior direito do child. Cores: `accent`, `danger` (default), `warning`, `success`.

### 46. Skeleton
```tsx
import { Skeleton, SkeletonText } from '../components/ui';

<Skeleton width={200} height={14} />
<Skeleton circle width={32} height={32} />
<SkeletonText lines={3} lastLineWidth="60%" />
```
Gradient cinza com shimmer animado (`skeletonShimmer` keyframe). Use durante fetch inicial em vez de spinner.

### 47. ProgressRing
```tsx
import { ProgressRing } from '../components/ui';

<ProgressRing value={72} size={72} label="72%" sublabel="meta" />
<ProgressRing value={45} size={56} color="#ff9f0a" />
```
Anel SVG com progresso 0–100. Stroke com drop-shadow colorido. Alternativa circular à barra horizontal — ótimo pra metas e orçamento em cards compactos.

### 48. Sparkline
```tsx
import { Sparkline } from '../components/ui';

<Sparkline data={[4,7,5,8,12,10,14]} />
<Sparkline data={monthlyBalance} width={100} height={28} color="#30d158" />
<Sparkline data={arr} fill={false} showDot={false} />
```
Mini-chart SVG inline (largura padrão 80×24). Bom pra cards mostrando tendência sem precisar de chart completo. Fill com gradient + linha com drop-shadow, ponto destacado no último valor.

### 49. StatCard
```tsx
import { StatCard } from '../components/ui';

<StatCard label="Income" value="+R$ 2.456" variant="trend" trendPct={15.7}
  accent={{ hex: '#30d158', rgb: '48,209,88' }}
  icon={<FiTrendingUp size={12} />} subtitle="Do mês" positiveDir="up" />

<StatCard label="Despesa" value="R$ 1.124" variant="trend" trendPct={-10.7}
  accent={{ hex: '#ff453a', rgb: '255,69,58' }}
  icon={<FiTrendingDown size={12} />} positiveDir="down" />   // negativo aqui é bom

<StatCard label="Tendência" value="R$ 3.2k" variant="sparkline"
  sparkData={[2100, 2400, 2900, 3100, 2800, 3200]} />

<StatCard label="Total" value={42} variant="simple" />
```
3 variantes: `simple` (só valor), `trend` (valor + pill %), `sparkline` (valor + mini-chart).
`positiveDir` define a interpretação: `up` — crescimento positivo é verde (Income); `down` — queda positiva é verde (Expense).

### 50. RowActions (ações no hover da linha)
```tsx
import { RowActions } from '../components/ui';
import { Tooltip } from '../components/ui';

<div className="row-actions-host" style={{ display:'flex', alignItems:'center', gap:10 }}>
  <span>Nome da transação</span>
  <span style={{ marginLeft: 'auto' }}>R$ 1.234</span>
  <RowActions>
    <Tooltip content="Editar"><button><FiEdit2 size={11} /></button></Tooltip>
    <Tooltip content="Excluir"><button><FiTrash2 size={11} /></button></Tooltip>
  </RowActions>
</div>
```
A linha pai precisa da classe `row-actions-host`. As ações aparecem com fade-in no hover/focus-within. Passe `alwaysVisible` pra sempre mostrar (ignora o hover-gating).

---

## Feedback, motion & a11y

### 51. Toast (notificação efêmera)
Sistema global com store zustand. Montar `<ToastContainer />` uma vez no App.

```tsx
// src/App.tsx — monte uma vez
import { ToastContainer } from './components/ui';
<ToastContainer />

// Em qualquer lugar — imperativo:
import { toast } from './store/toasts';
toast.success('Salvo');
toast.error('Falha ao sincronizar', { description: 'Verifique sua conexão' });
toast.info('Nova versão disponível', { action: { label: 'Atualizar', onClick: reload } });
```
Posicionamento canto inferior-direito, `z-toast` (100), duração padrão 4s (6s pra erro), descrição e ação opcionais.

### 52. Alert (banner inline)
```tsx
import { Alert } from './components/ui';

<Alert severity="warning" title="Sync atrasado">Última sincronização há 2h</Alert>
<Alert severity="info" onClose={dismiss}>Nova versão disponível</Alert>
<Alert severity="error" title="Falha crítica" action={<button onClick={retry}>Tentar de novo</button>}>
  Conexão com servidor perdida
</Alert>
```
4 severities: `info`, `success`, `warning`, `error`. Ocupa espaço no fluxo (diferente do toast). Glow da cor correspondente.

### 53. EmptyState
```tsx
import { EmptyState } from './components/ui';

// Primeira vez (nada criado)
<EmptyState variant="first" icon={<FiTarget size={32} />}
  title="Nenhuma meta ainda"
  description="Crie sua primeira meta financeira para começar a acompanhar."
  action={{ label: 'Criar meta', onClick: openModal }} />

// Filtro sem resultado
<EmptyState variant="filtered" icon={<FiSearch size={32} />}
  title="Nada encontrado"
  description="Tente outros termos ou limpe os filtros."
  action={{ label: 'Limpar filtros', onClick: clearFilters }} />

// Erro de load
<EmptyState variant="error" icon={<FiAlertTriangle size={32} />}
  title="Não foi possível carregar"
  action={{ label: 'Tentar de novo', onClick: refetch }} />
```
Prop `compact` reduz pra uso em seções pequenas.

### 54. Spinner + LoadingOverlay
```tsx
import { Spinner, LoadingOverlay } from './components/ui';

<Spinner size={14} />                            // inline (em botão)
<Spinner size={20} />                            // seção
<Spinner size={36} centered />                   // página (com padding)
<LoadingOverlay message="Sincronizando..." />    // cobre o container pai (absolute)
<LoadingOverlay fullscreen />                    // cobre viewport inteiro
```
Overlay com backdrop blur, respeita `--accent`.

### 55. ErrorBoundary
```tsx
import { ErrorBoundary } from './components/ui';

// Envelope cada página no topo
<ErrorBoundary onError={(err, info) => reportError(err, info)}>
  <FinancePage />
</ErrorBoundary>

// Com fallback custom
<ErrorBoundary fallback={({ error, reset }) => <MyCustomError error={error} onReset={reset} />}>
  <Component />
</ErrorBoundary>
```
Fallback padrão: ícone vermelho + título + botão "Recarregar" + `<details>` com stack trace. Evita a "tela preta" quando um componente quebra.

### 56. Stagger (entrada em sequência)
```tsx
import { Stagger } from './components/ui';

<Stagger delay={0.04}>
  {items.map((item) => <Card key={item.id} {...item} />)}
</Stagger>

<Stagger delay={0.06} initialDelay={0.2} y={12}>
  {children}
</Stagger>
```
Fade + slide-up em sequência. Default: 40ms entre filhos, offset Y 8px. Respeita `prefers-reduced-motion` via CSS global.

### 57. Shared layout (continuidade entre telas)
Padrão do Framer Motion usando `layoutId` pra animar um elemento de uma tela a outra.

```tsx
// Card na lista
<motion.div layoutId={`task-${task.id}`}>...</motion.div>

// Quando abre modal de detalhe
<motion.div layoutId={`task-${task.id}`}>...</motion.div>
// → Framer interpola posição/tamanho automaticamente
```
Requisitos:
- Ambos devem estar montados (ou passar um pelo outro via `AnimatePresence`)
- `layoutId` precisa ser único e estável
- Pai com `layout` também ajuda quando o contêiner muda

### 58. useSwipe (gesto swipe)
```tsx
import { useSwipe } from '../hooks/useSwipe';

const swipe = useSwipe({
  onSwipeLeft:  () => completeTask(),
  onSwipeRight: () => markPending(),
  threshold: 50,   // px mínimos pra disparar
  tolerance: 60,   // desvio perpendicular máximo
});

<div {...swipe}>...</div>
```
Suporta mouse e touch. Bom pra list items mobile ou drag-to-complete.

### 59. Focus ring visível
CSS global em `src/index.css`:
```css
:focus { outline: none; }
:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
  border-radius: inherit;
}
```
Aplicado automaticamente em `button`, `a`, e elementos com `role="..."` interativos. Aparece **só com navegação por teclado** (graças ao `:focus-visible`), não em clique de mouse.
**Regra:** nunca remover outline em CSS sem providenciar alternativa — quebra a11y pra teclado-users.

### 60. Keyboard shortcuts + ShortcutsHelp
Dois níveis:

**`useKeyboardShortcuts` (global)** — já existente em `src/hooks/useKeyboardShortcuts.ts`, registra os atalhos principais do app (N, /, Esc, ⌘K, 1-5).

**`useShortcut` (pontual)** — `src/hooks/useShortcut.ts`, hook genérico pra atalhos locais:
```tsx
import { useShortcut } from '../hooks/useShortcut';

useShortcut('mod+n', () => newTask());
useShortcut('/', () => searchInputRef.current?.focus());
useShortcut('?', () => setHelpOpen(true));
useShortcut('escape', () => close());

// Opcional: limitar escopo a um container
useShortcut('delete', () => deleteSelected(), { scopeRef: listRef });
```
Notação: `mod` = Cmd no Mac / Ctrl no Windows. Combos: `mod+shift+k`, `alt+enter`. Por default não dispara dentro de input/textarea.

**`<ShortcutsHelp>`** — modal que lista todos os atalhos:
```tsx
import { ShortcutsHelp, DEFAULT_SHORTCUTS } from './components/ui';

const [helpOpen, setHelpOpen] = useState(false);
useShortcut('?', () => setHelpOpen(true));

<ShortcutsHelp open={helpOpen} onClose={() => setHelpOpen(false)} />
// ou passando grupos custom
<ShortcutsHelp open={helpOpen} onClose={close} groups={[{ label: 'Meu', items: [...] }]} />
```

**Convenções obrigatórias entre telas:**
| Atalho | Função |
|---|---|
| `⌘K` / `Ctrl+K` | Paleta de comandos |
| `N` | Nova entidade (tarefa, transação...) |
| `/` | Focar busca |
| `Esc` | Fechar modal / cancelar |
| `Enter` | Confirmar |
| `?` | Abrir ajuda de atalhos |
| `1–5` | Navegar entre páginas principais |

---

## Inputs (form)

```ts
{
  background: 'var(--ib)',
  border: '1px solid var(--b2)',
  borderRadius: 8,
  padding: '9px 12px',
  color: 'var(--t1)',
  fontSize: 13,
  outline: 'none',
}
```

### Label acima
```ts
{
  fontSize: 10,
  fontWeight: 700,
  letterSpacing: '1.5px',
  textTransform: 'uppercase',
  color: 'var(--t3)',
  marginBottom: 6,
}
```

### Gap entre campos do form
- `14px`

---

## Modais

### Backdrop
- Cor: `rgba(0,0,0,0.5)`
- Classe: `.glass-backdrop` (backdrop-filter blur 16px saturate 1.6)

### Painel
```ts
{
  width: 420-440,
  background: 'var(--modal-bg)',
  borderRadius: 18,
  padding: 24,
  boxShadow: '0 24px 80px rgba(0,0,0,0.45)',
}
```
- Classe: `.glass-panel`

### Header do modal
- Ícone em quadradinho accent (32x32, radius 10)
- Título `16/700`
- `FiX` size `16` no canto direito

---

## Animações (Framer Motion)

### Entrada de modais
```tsx
initial={{ scale: 0.95, opacity: 0 }}
animate={{ scale: 1, opacity: 1 }}
exit={{ scale: 0.95, opacity: 0 }}
```

### Hover em card
```tsx
whileHover={{ y: -4 }}
```

### Progress / bar fill
```tsx
initial={{ width: 0 }}
animate={{ width: `${pct}%` }}
transition={{ duration: 0.5 }}
```

### Transition CSS padrão
- Hover / opacity: `.12-.15s`
- Transform / layout: `.2-.3s`

---

## Regras de composição

1. Todo **dado numérico importante** usa weight `700`, tamanho relativo ao contexto
2. Toda **variação %** (pct change) vira pill com glow na cor do estado
3. Toda **borda interativa** é `1px solid` em `--b2` ou accent; hover sobe pra `var(--s2)` ou `${accent}18`
4. Toda **cor que aparece em retângulo/círculo** projeta glow da mesma cor via `box-shadow` multicamada ou `--glow`
5. **Mês/período/item ativo** sempre destacado com accent color (pill, borda, ou glow)
6. Empty state: ícone `22-24` opacity `0.3-0.5` + mensagem `12/--t4`, centralizado
7. Tabela: header `9/uppercase/1.5px/--t4`, linhas com hover `--s2`, padding linha `10px 8px`
8. Nunca misturar famílias de ícones (sempre Feather/`fi`)

---

## Checklist para novas telas

Ao criar ou refazer uma tela, verificar:

- [ ] Header segue o padrão: título + subtítulo + controles direita
- [ ] Container com `padding: 16px 28px 28px` e `gap: 14`
- [ ] Cards usam `cardStyle` base (bg `--s1`, radius `16`, padding `18`, border `--b2`)
- [ ] Cards com estado colorido têm `backgroundImage` radial + `boxShadow` com `--glow`
- [ ] Valores destacados usam weight `700` + tamanho da hierarquia
- [ ] Pills de métrica com `.glow` e `--glow` da cor
- [ ] Ícones `react-icons/fi` nos tamanhos padronizados
- [ ] Labels uppercase com `letter-spacing: 1.5px` e cor `--t3`/`--t4`
- [ ] Botão primário com accent + glow sombreado
- [ ] Hover de linhas em tabelas: `--s2`
- [ ] Empty state centralizado com ícone opacity baixa
- [ ] Modais seguem `.glass-panel` + `.glass-backdrop`
- [ ] Acentos visuais projetam glow da mesma cor

---

## Arquivos de referência

- Sistema visual em ação: `src/components/FinancePage.tsx`
- Classes de glow: `src/index.css` (seção "Aurora glow")
- Tokens de cor/fonte: `src/index.css` + `src/App.css`
- Store de accent color: `src/store/tasks.ts` (`accentColor`)
