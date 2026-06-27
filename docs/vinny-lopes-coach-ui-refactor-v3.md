# Vinny Lopes Coach — UI Refactor Master Prompt (v3)

> **Como usar este documento:** cole no Copilot Agent uma seção por vez (não o documento inteiro). Comece pela Parte 1 (bugs), depois Parte 2 (design system) como uma tarefa só de "criar/atualizar tokens", e só então ataque a Parte 3 tela por tela. Cada bloco de código abaixo (CSS vars, Tailwind config) é para ser colado direto no projeto.

---

## Parte 1 — Bugs de lógica (corrigir antes de qualquer retoque visual)

Estes são erros de comportamento, não de estilo. Corrigir antes evita refatorar visual sobre uma base que ainda quebra.

1. **Gráfico de evolução de peso não aparece mesmo com dados suficientes.** A tela de Medidas mostra "Registre pelo menos 3 medidas para ver seu gráfico de evolução" simultaneamente com "Você tem 4 registros". A condição (`registros >= 3`) já é verdadeira mas o componente de gráfico continua oculto. Revisar a lógica condicional que decide entre `EmptyState` e `<Chart />` — provavelmente está comparando contra o valor errado ou o componente de gráfico não está sendo montado no mesmo `if`.

2. **Delta de medida com formatação quebrada.** Quando uma medida não muda (ex: Panturrilha), o delta exibe `— = cm` em vez de algo como `0.0 cm` ou apenas `—`. Revisar o componente `DeltaIndicator` (ou equivalente) para o caso `delta === 0`.

3. **Falta granularidade de horário no histórico de treinos.** "Últimos treinos" mostra apenas a data (`15/06/2026`), sem hora. Um usuário real pode treinar duas vezes no mesmo dia (cardio de manhã, força à noite) e os registros ficam indistinguíveis. Adicionar timestamp completo no card, exibindo só a hora quando a data for igual ao registro anterior da lista (ex: "Hoje, 07:32" / "Hoje, 19:10").

4. **Formulário de Nova Medida é ambíguo sobre o que conta como alteração.** Os campos vêm pré-preenchidos com o valor anterior, e o texto auxiliar diz "Salve apenas o que mudou" — mas não há indicação visual de quais campos foram de fato editados nesta sessão. Duas opções de correção (escolher uma):
   - **A:** Deixar os campos vazios por padrão, com o valor anterior como placeholder cinza.
   - **B:** Manter pré-preenchido, mas aplicar um estado visual diferente (borda dourada, por exemplo) no campo a partir do momento em que o valor é editado pelo usuário, e enviar ao backend apenas os campos com esse estado ativo.

5. **Falta validação de range nos campos de medida.** Não há limite superior/inferior nos inputs de Tórax, Cintura, Coxa, etc. Adicionar validação client-side com ranges plausíveis por campo (ex: Tórax 60–160cm, Cintura 40–150cm, Braço 15–60cm) para evitar entradas absurdas que quebram o gráfico de evolução depois.

6. **Botão primário contradiz o estado da tela.** No estado "Dia de descanso" da Home, o CTA principal em destaque (cor dourada, full-width) continua sendo "Iniciar treino" — o que contradiz a mensagem "Dia de descanso" exibida acima. Ver Parte 3 → Home para a correção de hierarquia.

7. **Card "Benefícios exclusivos disponíveis" cortado sem contexto.** Aparece no fim do scroll da Home sem nenhuma explicação do que é. Se for um banner de upsell/feature, precisa de um componente próprio com pelo menos um ícone, uma frase de contexto e um CTA — não pode ficar pendurado como um item de lista solto.

---

## Parte 2 — Design System (tokens premium)

Objetivo: sair de "funcional" para "parece um app pago de primeira linha" (referência: Whoop, Hevy Pro, Apple Fitness+). A app já usa um conceito dark + dourado — vamos reforçar isso com profundidade (gradientes sutis, glow, hierarquia tonal) em vez de mudar a paleta.

### 2.1 Cores — tokens base

```css
:root {
  /* Fundo — camadas de profundidade, não um preto chapado só */
  --bg-base: #0A0A0B;
  --bg-surface-1: #131316;   /* cards no nível 1 (a maioria) */
  --bg-surface-2: #1C1C20;   /* cards dentro de cards, modais */
  --bg-surface-3: #26262C;   /* hover/pressed states */

  /* Dourado — cor de marca, usado com parcimônia */
  --gold-50:  #FFF8E1;
  --gold-300: #F5D061;
  --gold-500: #E8B339;        /* dourado principal atual */
  --gold-600: #C9941F;
  --gold-700: #9C7216;

  /* Texto */
  --text-primary: #F5F5F7;
  --text-secondary: #9B9BA3;
  --text-tertiary: #5E5E66;

  /* Semântica (corrigindo o problema de cor relativa apontado na auditoria) */
  --success: #34D399;
  --danger: #F87171;
  --info: #60A5FA;

  /* Bordas */
  --border-subtle: rgba(255,255,255,0.06);
  --border-default: rgba(255,255,255,0.10);
  --border-gold: rgba(232,179,57,0.35);
}
```

### 2.2 Gradientes — onde usar

Gradientes devem comunicar **hierarquia e premium**, não decoração aleatória. Regra: máximo 1 gradiente "forte" visível por tela.

```css
/* Gradiente de marca — usar em: CTA principal, card de destaque do dia, header de streak */
--gradient-gold: linear-gradient(135deg, #F5D061 0%, #E8B339 45%, #C9941F 100%);

/* Gradiente de profundidade — usar em superfícies de card para dar sutileza, não em texto */
--gradient-surface: linear-gradient(160deg, #18181C 0%, #0F0F11 100%);

/* Gradiente de glow por trás de números grandes (ex: volume semanal, pts de ranking) */
--gradient-glow-gold: radial-gradient(circle at 30% 20%, rgba(232,179,57,0.18) 0%, rgba(232,179,57,0) 60%);

/* Gradiente de sucesso — usar SÓ no indicador de progresso positivo, nunca em botões genéricos */
--gradient-success: linear-gradient(135deg, #4ADE80 0%, #22C55E 100%);
```

**Aplicação prática:**
- Botão "Iniciar treino" → `background: var(--gradient-gold)` em vez de cor sólida, com leve `box-shadow` dourado por baixo (ver 2.4).
- Card de streak/sequência → fundo `var(--gradient-surface)` + glow `var(--gradient-glow-gold)` posicionado no canto superior, sutil, `opacity: 0.6`.
- Badges de PR (recorde pessoal) e troféu do ranking → `var(--gradient-gold)` no ícone/badge, nunca no card inteiro.

### 2.3 Tipografia

```css
--font-size-xs: 12px;
--font-size-sm: 14px;
--font-size-base: 16px;
--font-size-lg: 20px;
--font-size-xl: 24px;
--font-size-2xl: 32px;
--font-size-display: 40px;  /* números de destaque: volume, peso, pts */

--font-weight-regular: 400;
--font-weight-medium: 500;
--font-weight-semibold: 600;
--font-weight-bold: 700;

--letter-spacing-label: 0.06em; /* para labels em CAPS, tipo "SEQUÊNCIA", "VOLUME SEMANAL" */
```

Regra: labels em maiúsculas (SEQUÊNCIA, VOLUME SEMANAL, AGENDA SEMANAL) sempre `font-size-xs` + `letter-spacing-label` + `text-secondary`. Números de destaque sempre `font-size-display` + `font-weight-bold` + `text-primary`.

### 2.4 Espaçamento, raio e sombra

```css
/* Espaçamento — escala única, nada fora disso */
--space-1: 4px; --space-2: 8px; --space-3: 12px; --space-4: 16px;
--space-6: 24px; --space-8: 32px; --space-12: 48px; --space-16: 64px;

/* Raio */
--radius-sm: 8px;   /* badges, chips */
--radius-md: 14px;  /* botões */
--radius-lg: 20px;  /* cards padrão */
--radius-xl: 28px;  /* modais, sheets */

/* Sombra — usar com MUITA moderação em fundo escuro (sombra preta não se vê) */
--shadow-card: 0 1px 2px rgba(0,0,0,0.4), 0 0 0 1px var(--border-subtle);
--shadow-gold-glow: 0 4px 24px rgba(232,179,57,0.25);  /* só no CTA principal e badges de destaque */
--shadow-elevated: 0 8px 32px rgba(0,0,0,0.5);          /* modais, sheets */
```

### 2.5 Componente: Card padrão (referência para todos os outros)

```css
.card {
  background: var(--bg-surface-1);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-lg);
  padding: var(--space-4);
  box-shadow: var(--shadow-card);
}

.card--highlight {
  background: var(--gradient-surface);
  position: relative;
  overflow: hidden;
}
.card--highlight::before {
  content: "";
  position: absolute;
  inset: 0;
  background: var(--gradient-glow-gold);
  pointer-events: none;
}
```

### 2.6 Ícones

Trocar todos os emojis (💧🥩⏰🥗 na tela de Nutrição) pelo mesmo set de ícones de linha usado no resto do app (o nav inferior já usa um set consistente — usar a mesma família, provavelmente Lucide ou Phosphor, em `stroke-width: 1.5`, cor `--text-secondary` por padrão e `--gold-500` quando ativo/destacado).

---

## Parte 3 — Especificação por tela

### 3.1 Home

**Problemas a resolver:**
- CTA principal contradiz "Dia de descanso".
- "+621% volume" repetido duas vezes em formatos diferentes na mesma tela.
- Agenda semanal corta os últimos dias sem indicar scroll.
- Card de benefícios cortado sem contexto.

**Especificação:**
- Quando o dia for de descanso: CTA primário (gradiente dourado, full-width) passa a ser **"Registrar evolução"**. "Iniciar treino" desce para botão secundário (outline, sem gradiente).
- Remover "+621% volume" do header superior — manter essa métrica **só** no card de Volume Semanal, com badge de variação (`--success` gradient se positivo).
- Card "Dia de descanso": aplicar `.card--highlight` (gradiente sutil + glow), ícone de lua em destaque dourado.
- Agenda semanal: adicionar `mask-image: linear-gradient(to right, black 85%, transparent)` no container com overflow horizontal, para sinalizar visualmente que há mais conteúdo à direita.
- Card de benefícios: transformar em componente próprio com ícone, título curto, uma frase de valor e CTA explícito ("Ver benefícios →"), nunca como último item de uma lista que corta.

### 3.2 Treinos — Lista de rotinas

**Problemas:** tela com 1 rotina e o resto vazio, sem CTA de criar nova.

**Especificação:**
- Adicionar empty state abaixo da lista (mesmo padrão usado na tela de Fotos): ícone, texto "Crie sua próxima rotina" + subtítulo, botão "+ Nova rotina" em outline dourado.
- Card de rotina existente ("Treino Full"): aplicar `.card` padrão, badges dos exercícios (hoje em pills cinza) passam a usar `--bg-surface-2` com texto `--text-secondary`, e contagem de exercícios em `--text-tertiary` para reduzir ruído visual.

### 3.3 Treinos — Detalhe da rotina e execução de série

**Problemas:** siglas (FS, CS, WS, DS, TS, BS, SS, R) sem legenda na tabela de séries; só aparecem explicadas dentro da tela de execução.

**Especificação:**
- Adicionar um ícone de "info" pequeno no header da coluna "TÉ1"/"TÉ2" da tabela. Ao tocar, abre um bottom sheet com a legenda completa de técnicas (Cluster Set, Drop Set, Rest-Pause, etc.) mapeando cada sigla.
- Alternativa mais leve: trocar a sigla por uma cor + ponto colorido consistente (ex: dourado sólido = técnica avançada aplicada, cinza = série padrão), reduzindo a necessidade de decorar siglas.
- Gráfico de progresso de volume: aplicar `--gradient-gold` na linha (hoje é azul/roxo, fora da paleta da marca) e preencher a área sob a curva com `var(--gradient-glow-gold)` em baixa opacidade.

### 3.4 Nutrição

**Problemas:** único lugar do app usando emojis; estado "em preparação" é só texto.

**Especificação:**
- Substituir emojis pelos ícones de linha do design system (ver 2.6).
- Card central "Plano em preparação": aplicar `.card--highlight`, ícone de prato em destaque dourado com leve animação de pulso sutil (opcional, baixa prioridade).
- As 4 dicas ("Beba 35ml/kg", "Priorize proteínas"...) hoje são pills empilhadas verticalmente ocupando muito espaço — converter em grid 2x2 de cards pequenos, cada um com ícone + texto curto, usando `--bg-surface-1` e padding reduzido (`--space-3`).

### 3.5 Perfil

**Problemas:** seções bem organizadas, mas sem hierarquia visual entre dados "de identidade" (nome, foto) e "de configuração" (unidade de peso, notificações).

**Especificação:**
- Header com foto: aplicar borda em `var(--gradient-gold)` (hoje já é dourada, manter, mas usar o gradiente em vez de cor sólida para dar profundidade).
- Os 4 atalhos "Minha Jornada" (Progresso, Ranking, Calendário, Fotos): aplicar leve grid com ícones em `--gold-500`, fundo `--bg-surface-1`, e considerar adicionar um pequeno indicador numérico quando relevante (ex: "4 registros" no atalho de Progresso).
- Seções de configuração (Treino, Notificações, Segurança, Conta): manter como lista, mas reduzir o peso visual dos títulos de seção (`--text-tertiary`, `--font-size-xs`, `--letter-spacing-label`) para diferenciar claramente de conteúdo interativo.
- "Excluir minha conta": manter em `--danger`, mas isolar com mais espaço (`--space-8` acima) das outras opções para evitar toque acidental.

### 3.6 Medidas

**Problemas:** já cobertos na Parte 1 (bugs do gráfico e do delta). Aqui, só ajuste visual:

**Especificação:**
- Corrigir semântica de cor por métrica (não só por direção do número): criar um mapa `metricPolarity` no código — `{ peso: 'context-dependent', torax: 'up-good', cintura: 'up-bad', braço: 'up-good', coxa: 'up-good', panturrilha: 'up-good' }` — e usar `--success`/`--danger` de acordo com a polaridade real, não com sinal positivo/negativo bruto. Para "peso", manter neutro (`--info`) já que aumento pode ser bom ou mau dependendo do objetivo do usuário.
- Card de gráfico (depois de corrigido o bug): aplicar `.card--highlight`.
- Botão "+ Registrar nova medida": flutuante hoje funciona bem, manter, mas aplicar `--shadow-gold-glow`.

### 3.7 Ranking

**Problemas:** com só 1 atleta ativo, dar medalha de prata pra quem tem 0 pts é estranho; estrutura comparativa não faz sentido em fase solo.

**Especificação:**
- Quando houver menos de 3 atletas ativos na semana, substituir o card de "Classificação" por um card de **recordes pessoais e consistência** (sequência atual, melhor sequência, total de treinos no mês) — guardando a lógica de ranking comparativo para quando houver competição real.
- Manter "Como ganhar pontos" como está — funciona bem como tabela de referência.

### 3.8 Fotos

Esta tela já está bem resolvida (bom empty state, copy clara, ícone consistente). Usar como **referência de padrão** para replicar em "Minhas Rotinas" (3.2) e em qualquer outro empty state do app.

---

## Parte 4 — Checklist de validação (rodar depois de cada tela refeita)

- [ ] A tela usa só cores do token list (Parte 2.1)? Nenhum hex solto no código?
- [ ] Algum gradiente forte foi usado mais de 1x na mesma tela?
- [ ] Espaçamento usa só a escala definida (4/8/12/16/24/32/48/64)?
- [ ] Todo número de destaque usa `--font-size-display` + `--font-weight-bold`?
- [ ] Toda label em caps usa `--letter-spacing-label`?
- [ ] Existe algum emoji que devia ser ícone de linha?
- [ ] Existe empty state sem CTA?
- [ ] A cor semântica (verde/vermelho) reflete o significado real da métrica, não só a direção do número?
- [ ] O CTA principal da tela reflete corretamente o estado atual (ex: dia de descanso vs. dia de treino)?
