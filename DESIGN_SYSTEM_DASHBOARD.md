# Design System — Dashboard

Guia visual e técnico pra construir páginas no estilo da **Home** do evo-tasks. Aplica-se a qualquer página que mostre dados, KPIs, gráficos ou listas estruturadas.

> **TL;DR**: importe componentes de `src/components/dashboard` e siga as regras de paleta + tipografia abaixo. Não reinvente cards ou tiles — use o que já existe.

---

## Paleta

### Cores semânticas (usar pra contexto, não decoração)

| Cor | Hex | Uso |
|---|---|---|
| Azul (marca) | `#356BFF` | accent principal, hero gradients, CTAs |
| Verde sucesso | `#30d158` | crescimento, deltas positivos, completos |
| Vermelho alerta | `#ff453a` | atrasos, atenção, deltas negativos |
| Laranja warn | `#ff9f0a` | em aberto, vencendo, leads em contato |
| Roxo CRM | `#bf5af2` | pipeline, propostas, aprovações |
| Ciano info | `#64C4FF` / `#64d2ff` | empresas, próximos eventos |
| Amarelo destaque | `#ffd60a` | ideias, ideias da semana |

### Aplicação de cor

- **Backgrounds tonalizados**: `rgba(R,G,B,0.10)` pro fundo + `rgba(R,G,B,0.22)` pra borda
- **Glow / hover**: `rgba(R,G,B,0.18)` no hover, `box-shadow: 0 0 10px rgba(R,G,B,0.4)` pra destaque
- **Branco como cor primária de texto** — sempre `#ffffff` em títulos, `rgba(255,255,255,0.78)` em secundários
- **Use `hexToRgb(hex)`** de `dashboard/utils` pra converter cores em formato rgba

---

## Tipografia

| Elemento | Tamanho | Peso | Spacing | Cor |
|---|---|---|---|---|
| Hero h1 | 30-32px | 800 | -0.7px | `#ffffff` |
| KPI número | 26px | 800 | -0.6px | `#ffffff` |
| Título de card (CardHeader) | 11px | 700 | 1.4px / UPPERCASE | `#ffffff` |
| Texto principal de linha | 12.5px | 500-600 | -0.1px | `#ffffff` |
| Texto secundário | 11px | 600 | — | `rgba(255,255,255,0.78)` |
| Label de seção | 9-10px | 800 | 1.2-1.4px / UPPERCASE | `rgba(255,255,255,0.65)` |
| Caption / hint | 10-11px | 700 | — | `rgba(255,255,255,0.55)` |

**Regra**: nunca use texto cinza puro. Use sempre `rgba(255,255,255,0.X)`.

---

## Espaçamento e dimensões

- **Card border-radius**: 14
- **Hero border-radius**: 18
- **Pill / badge border-radius**: 99 (pílula)
- **Padding interno de card**: `12-14px 16px`
- **Gap entre cards**: 14
- **Gap entre seções (rows)**: 16

---

## Sombra / depth

```css
/* Card padrão */
box-shadow: 0 1px 0 rgba(255,255,255,0.02), 0 6px 22px rgba(0,0,0,0.28);

/* Hero / KPI tile */
box-shadow: 0 12px 40px rgba(R,G,B,0.28), 0 0 0 1px rgba(255,255,255,0.06) inset;

/* Botão CTA branco no hero */
box-shadow: 0 8px 22px rgba(0,0,0,0.25), 0 0 0 1px rgba(255,255,255,0.4) inset;
```

---

## Componentes

Todos em `src/components/dashboard`. Importe via barrel:

```tsx
import {
  Card, CardHeader, EmptyState, KpiTile, AreaChart, Funnel,
  DonutChart, ProgressRing, ProductivityHeatmap, Sparkline,
  hexToRgb, fmtBRL, fmtBRLfull,
} from '../components/dashboard';
```

### `<Card>` + `<CardHeader>`

Container padrão com header opcional.

```tsx
<Card>
  <CardHeader
    icon={<FiTrendingUp size={14} />}
    title="Faturamento — últimos 6 meses"
    accent="#356BFF"
    right={<span>Total: R$ 50.000</span>}
  />
  <div style={{ padding: 14 }}>{/* conteúdo */}</div>
</Card>
```

- `accentLeft` em Card adiciona borda esquerda colorida (3px) — use pro card mais importante da página

### `<KpiTile>`

Tile de métrica com número, delta, sparkline.

```tsx
<KpiTile
  label="Receita do mês"
  value={fmtBRL(50000)}
  delta={12.5}            // % vs período anterior
  icon={<FiDollarSign size={13} />}
  color="#30d158"
  sparkline={[10, 15, 12, 18, 20, 17, 22]}
/>
```

- `delta` positivo = verde (se `deltaPositiveIsGood: true` que é o default)
- Pra métricas onde queda é boa (latência, custos): `deltaPositiveIsGood={false}`
- Use grid `repeat(auto-fit, minmax(220px, 1fr))` pra layout responsivo

### `<AreaChart>`

Gráfico de área com gradiente. Texto em HTML (não distorce).

```tsx
<AreaChart
  series={[
    { label: 'jan', value: 5000 },
    { label: 'fev', value: 7500 },
    // ...
  ]}
  accentColor="#356BFF"
  accentRgb={hexToRgb('#356BFF')}
  formatY={(v) => fmtBRL(v)}  // opcional, default BRL
/>
```

### `<Funnel>`

Barras horizontais por estágio (CRM, status, etc.).

```tsx
<Funnel
  stages={[
    { label: 'Prospecção', count: 12, value: 0, color: '#64d2ff' },
    { label: 'Negociação', count: 4,  value: 50000, color: '#ff375f' },
    { label: 'Fechado',    count: 2,  value: 30000, color: '#30d158' },
  ]}
  onClick={() => navigate('crm')}
/>
```

### `<DonutChart>`

Donut com legenda lateral, total no centro.

```tsx
<DonutChart
  data={[
    { label: 'Cliente A', value: 12, color: '#64C4FF' },
    { label: 'Cliente B', value: 8,  color: '#bf5af2' },
  ]}
  total={20}
  centerLabel="TAREFAS"   // opcional, default 'TOTAL'
/>
```

### `<ProgressRing>`

Anel de progresso com % no centro.

```tsx
<ProgressRing value={75} goal={120} color="#ff453a" />
```

### `<ProductivityHeatmap>`

Heatmap multi-view (Anual/Mensal/Semanal/Por dia) com seletor.

```tsx
<ProductivityHeatmap
  counts={new Map([
    ['2026-04-25', 3],
    ['2026-04-24', 5],
  ])}
/>
```

### `<EmptyState>`

Estado vazio padrão com ícone + texto + CTA opcional.

```tsx
<EmptyState
  icon={<FiCalendar size={20} />}
  text="Nenhum item ainda."
  cta="Criar primeiro"
  onCta={() => navigate('algo')}
  iconColor="#bf5af2"
/>
```

---

## Padrões de página

### Hero (saudação no topo)

Card grande com gradiente azul + h1 grande + CTA branco. Use só uma vez por página:

```tsx
<div style={{
  background: `linear-gradient(135deg, ${accentColor} 0%, #1d4ed8 60%, #1e3a8a 100%)`,
  borderRadius: 18, padding: '24px 28px', minHeight: 130,
  position: 'relative', overflow: 'hidden',
  boxShadow: `0 12px 40px rgba(${accentRgb},0.28), 0 0 0 1px rgba(255,255,255,0.06) inset`,
}}>
  {/* glow decoration + h1 + CTA */}
</div>
```

### Insight banner

Banner horizontal cheio com 1 frase de destaque. Padding pequeno, ícone à esquerda, texto branco.

### Grid de KPIs (4 tiles)

```tsx
<div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
  <KpiTile ... />
</div>
```

### Linhas de cards (2 colunas com pesos diferentes)

```tsx
<div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1.4fr) minmax(0,1fr)', gap: 14 }}>
  <Card>...</Card>
  <Card>...</Card>
</div>
```

---

## Convenções de gráficos SVG

**Regra de ouro**: nunca colocar `<text>` dentro de SVG com `preserveAspectRatio="none"`. Texto dentro de SVG estica horizontalmente e fica feio em containers largos.

**Solução padrão**:
1. SVG com `preserveAspectRatio="none"` só pra paths/área/grid
2. Labels (Y-axis, X-axis, datapoints) em **HTML** posicionados sobre o SVG com `position: absolute`
3. Use `vectorEffect="non-scaling-stroke"` pra que linhas finas não distorçam

Veja `<AreaChart>` como referência.

---

## Anti-padrões (não faça)

- ❌ `var(--t1)` puro em backgrounds escuros — use `#ffffff`
- ❌ Cinzas chapados (`#999`, `#aaa`) — sempre `rgba(255,255,255,0.X)`
- ❌ Emojis Unicode em UI — sempre `react-icons/fi`
- ❌ Cards sem padding interno — sempre `12-14px 16px`
- ❌ Texto em SVG estirado — use HTML overlay
- ❌ Bordas em cinza médio (`#444`) — use `rgba(255,255,255,0.10-0.22)` ou tonalizar com a accent

---

## Adaptação por arquétipo de página (CRÍTICO)

**Não aplicar todos os primitivos cegamente.** Cada página tem uma natureza — algumas precisam de mais peso visual, outras de menos. Antes de mexer numa página, identifique o arquétipo e aplique só o que faz sentido.

### Taxonomia

| Arquétipo | Páginas | Peso visual | O que aplicar |
|---|---|---|---|
| **Dashboard executivo** | Home, KPIs, Finanças | Alto | Hero gigante + 4 KpiTiles + Charts (Area, Donut, Funnel) + Heatmap + Listas inteligentes + Insight banner |
| **Listas com gestão** | Empresas, CRM, Aprovações | Médio-alto | Hero compacto + 2-3 KpiTiles relevantes + filtros + list/kanban/grid |
| **Editor / produção** | Tarefas/Calendário, Editorial | Médio | Hero pequeno + view selectors (kanban/lista/grid) + grid principal. Sem KPIs. |
| **Triagem** | Inbox, Lixeira | Compacto | Header pequeno com counts por seção + listas agrupadas |
| **Documentos individuais** | Briefings, Propostas, Faturas | Baixo-médio | Header com filtro de status + lista. KpiTile só se houver métrica forte (ex: "R$ em aberto"). |
| **Bibliotecas** | Snippets, Onboarding templates | Mínimo | Header simples (busca + filtro) + grid. Sem hero, sem KPIs. |
| **Time-based** | Hábitos, Time tracking | Médio | Hero compacto + Heatmap + lista. KpiTile pra streak/total. |
| **Criativo (caixa de ideias)** | Ideias | Médio | Hero compacto + 3-4 KpiTiles (com sparkline em 1) + grid/kanban |

### Regra de ouro

**Sempre aplicar:**
- Tipografia branca (`#ffffff` em títulos, `rgba(255,255,255,0.78)` secundário)
- Paleta semântica (azul/verde/vermelho/laranja/roxo)
- Card + CardHeader pros containers
- EmptyState com ícone (NUNCA emoji)

**Aplicar só se fizer sentido pra página:**
- Hero gigante → só páginas com saudação ou contexto complexo (Home, Finanças)
- KpiTiles → só se as métricas guiam ação (não use stat só pra encher)
- Charts → só se há tendência relevante a mostrar
- Heatmap → só se a dimensão temporal é central pra página

### Exemplos do que evitar

- ❌ Hero gigante com gradient azul em Snippets (é só biblioteca)
- ❌ 4 KpiTiles forçados quando 2 já cobrem o que importa
- ❌ Heatmap em página sem dimensão temporal forte
- ❌ Charts decorativos sem tendência real a mostrar

### Exemplos do que aplicar bem

- ✅ Home / Finanças → completo (hero + 4 tiles + charts + listas inteligentes)
- ✅ Empresas / CRM → médio (hero compacto + 2-3 tiles + list/kanban)
- ✅ Snippets → mínimo (header com busca + grid de cards)
- ✅ Inbox → compacto (header com counts + sections agrupadas)
- ✅ Hábitos → médio (hero + heatmap + list)

---

## Workflow

Pra refazer uma página existente no estilo dashboard:

1. **Ler este doc + identificar o arquétipo** da página na tabela acima
2. **Ler o componente atual** pra entender a função real da página
3. Importar primitivos de `src/components/dashboard` — só os que fazem sentido pro arquétipo
4. Aplicar tipografia branca + paleta semântica conforme regras
5. Build e revisar
6. Se em dúvida sobre nível de complexidade, **perguntar antes** de aplicar

Pra qualquer dúvida visual, **referenciar `src/components/HomePage.tsx`** — é o exemplo canônico do arquétipo "Dashboard executivo" (peso alto).
