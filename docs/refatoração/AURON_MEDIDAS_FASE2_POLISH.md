# AURON — Medidas: Fase 2 - Polish & Refinamento

**Executor:** Claude Haiku 4.5 no VSCode  
**Modo:** Fase a fase, com commit intermediário ao final de cada fase  
**Contexto:** Build sobre a refatoração já entregue. Melhorias de UX/visual com base em análise de wireframes.

---

## 0. Setup — arquivo alvo

Se ainda não leu o arquivo de medidas, rode:

```bash
grep -r "Peso Atual\|PESO ATUAL" --include="*.tsx" -l
```

Leia o arquivo inteiro. Vamos apenas refinar CSS e estrutura HTML/JSX, não alterar queries de dados.

---

## Design tokens (referência)

```css
--surface-0: #09090B
--surface-1: #111113
--surface-2: #18181B
--surface-3: #1F1F23
--border-subtle: #27272A
--border-default: #3F3F46
--text-primary: #FAFAFA
--text-secondary: #A1A1AA
--text-muted: #71717A
--accent: #2563EB
--accent-hover: #1D4ED8
--success: #22C55E
--warning: #F59E0B
--danger: #EF4444
--font-mono: JetBrains Mono
--radius: 4px / 6px / 8px / 10px (sm/md/lg/xl)
```

---

## Fase 1 — Corrigir labels: ALL CAPS → Title Case

**Objetivo:** Eliminar todos os `text-transform: uppercase` e ALL CAPS de labels, seguindo padrão já aplicado no resto do app.

**Labels a corrigir:**

| Atual | Novo |
|-------|------|
| `PESO ATUAL` | `Peso Atual` |
| `VS. ANTERIOR` | `vs. Anterior` |
| `VS. 30D ATRÁS` | `vs. 30d atrás` |
| `REGISTRAR PESO` | `Registrar Peso` |
| `HISTÓRICO DE MEDIÇÕES` | `Histórico de Medições` |
| `RESUMO DA ÚLTIMA MEDIDA` | `Resumo da Última Medida` |
| `DATA:` | `Data:` |

**Implementação:**

- Procure por `text-transform: uppercase` no arquivo de estilos do componente ou classe Tailwind `uppercase`
- Remova todos os `uppercase`
- Ajuste os labels diretos no JSX (não confundir com labels de API/banco de dados — apenas UI)
- Se houver um arquivo `.css` ou `.module.css` específico para essa tela, edite lá; se for Tailwind inline no componente, remova o class `uppercase`

**Commit:** `style(medidas): corrige labels de ALL CAPS para Title Case`

---

## Fase 2 — Remover/consolidar cards "VS." vazios

**Objetivo:** Eliminar visual noise do "VS. ANTERIOR" e "VS. 30D ATRÁS" quando estão vazios (exibindo apenas "—").

**Implementação (opção A recomendada — remover):**

- Se não houver dado de comparação, renderize um estado vazio **sem mostrar o card**
- Deixe apenas o card de "Peso Atual" em destaque

**Lógica condicional:**

```javascript
// Se há 2+ registros, mostrar cards de delta; senão, não renderizar
{registrosCount >= 2 && (
  <>
    <div className="delta-card">vs. Anterior: {delta || "—"}</div>
    <div className="delta-card">vs. 30d atrás: {delta30d || "—"}</div>
  </>
)}
```

**Alternativa (opção B — consolidar em badge):**  
Se preferir manter alguma indicação de progresso, consolidar num único badge horizontal abaixo do valor principal:

```
Peso Atual
83.0 kg

↓ 0.5 kg vs. última medida (28 jun)  [em verde se favorável, vermelho se não]
```

Usar ícone SVG chevron-down/up (não emoji), cores `--success` ou `--danger` conforme a direção, e `--text-muted` para o texto de contexto.

**Recomendação para Luiz:** Escolha entre A (remover, mais limpo) ou B (consolidar, mais informativo). Assume-se **opção A** abaixo. Se quiser B, avise no commit message.

**Commit:** `refactor(medidas): remove cards de delta vazios para reduzir noise visual`

---

## Fase 3 — Feedback visual no input focado

**Objetivo:** Adicionar estado de foco (border ou fundo destacado) ao campo de entrada de valor.

**Implementação:**

- Input está em `background: var(--surface-2)` com `border: 1px solid var(--border-subtle)`
- Ao receber foco (`:focus`, `:focus-within`), mudar:
  - `border: 1px solid var(--accent)` 
  - Ou `box-shadow: 0 0 0 2px var(--surface-0), 0 0 0 4px var(--accent)` (outline duplo, padrão moderno)
  - Transição suave: `transition: border-color 200ms, box-shadow 200ms`
- Placeholder ou valor "83" em `--text-secondary`, mantém `--font-mono`
- Sufixo "kg" já bem posicionado, manter como está

**Checklist:**
- [ ] Input tem estado visual diferente ao focar
- [ ] Transição é suave, não abrupta
- [ ] Sem adicionar novos espaçamentos que quebrem layout

**Commit:** `style(medidas): adiciona feedback visual (border azul) ao input focado`

---

## Fase 4 — Deixar "Adicionar mais detalhes" mais evidente

**Objetivo:** Transformar o link discreto em componente mais claro e clicável.

**Implementação:**

- Mudar de link (`<a>` ou `<button className="text-secondary">`) para **botão outline secundário**
- Estilo:
  - `background: transparent`
  - `border: 1px solid var(--border-default)`
  - `border-radius: var(--radius-md)` (8px)
  - `color: var(--text-secondary)`
  - `padding: 10px 14px` (menor que botão primário)
  - Hover: `border-color: var(--accent)`, `color: var(--text-primary)`
  - Transição: `200ms`
- Adicionar ícone SVG de **chevron-down** ou **plus** à direita (ou antes) do texto
- Texto: "Adicionar mais detalhes" ou "Mais detalhes" (mais curto se houver espaço limitado)

**Implementação do ícone:**

Se o projeto já tem hook/componente de ícone (ex: `<Icon name="chevron-down" />`), use-o. Senão, inline SVG simples:

```jsx
<svg width="16" height="16" viewBox="0 0 16 16" fill="none">
  <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
</svg>
```

**Checklist:**
- [ ] Botão tem border visível, não é mais um link fantasma
- [ ] Ícone de chevron rotaciona/muda ao expandir o accordion
- [ ] Hover feedback é claro

**Commit:** `style(medidas): transforma "Adicionar mais detalhes" em botão outline com ícone`

---

## Fase 5 — Remover card "RESUMO DA ÚLTIMA MEDIDA" ou transformar em detalhe

**Objetivo:** Reduzir redundância visual — o resumo duplica a informação de "Peso Atual" acima.

**Implementação (opção A — remover):**

- Deletar o componente/seção inteira do "RESUMO DA ÚLTIMA MEDIDA"
- Manter apenas "Peso Atual" como única fonte de verdade

**Implementação (opção B — transformar em detalhe compacto):**

- Remover o card destacado
- Deixar um small text embaixo do "Peso Atual":
  ```
  Peso Atual
  83.0 kg
  
  Atualizado em 01 de julho de 2026
  ```
  - Tamanho menor: `font-size: 12px` ou `text-xs` (Tailwind)
  - Cor: `--text-muted`
  - Sem card, apenas texto
  - Altura mínima de espaço para não parecer colado

**Recomendação:** Opção A (remover) é mais limpo. Opção B funciona se o produto exigir mostrar "última vez que a medida foi atualizada".

**Assume-se opção A abaixo.**

**Commit:** `refactor(medidas): remove card de resumo redundante, mantém apenas "Peso Atual"`

---

## Fase 6 — Aumentar contraste no chip de período ativo (7d, 30d, etc)

**Objetivo:** Deixar claro qual período está selecionado.

**Implementação:**

- Chip inativo: `background: var(--surface-2)`, `border: 1px solid var(--border-subtle)`, `color: var(--text-secondary)`
- Chip **ativo** (ex: "7d" selecionado):
  - Opção 1 (recomendada): `background: var(--accent)`, `border: 1px solid var(--accent)`, `color: white` (ou `--text-primary`)
  - Opção 2: `background: transparent`, `border: 2px solid var(--accent)`, `color: var(--accent)`
  - Adicionar transição suave: `transition: all 150ms`

**Atual** é provavelmente só mudança de background. Adicionar border/text color para mais destaque.

**Checklist:**
- [ ] Chip ativo tem cor de texto que contrasta bem com fundo
- [ ] Border ou shadow sutil diferencia do inativo
- [ ] Sem adicionar muito peso visual

**Commit:** `style(medidas): aumenta contraste visual do chip de período ativo`

---

## Fase 7 — Reduzir gaps verticais excessivos (opcional, low priority)

**Objetivo:** Tela mais densa, menos "ar branco" entre seções.

**Implementação:**

- Medir gaps verticais entre:
  - Título "Medidas" e chips de filtro
  - Chips e "Peso Atual"
  - "Peso Atual" e gráfico/empty-state
  - Gráfico e "Registrar Peso"
  - "Registrar Peso" e "Histórico"

- Padrão sugerido:
  - Entre seções principais: `gap: 24px` (já faz sentido, manter)
  - Dentro de seção (ex: entre dois rows): `gap: 12px` ou `16px`
  - Se estiver com `gap: 32px` em algum lugar, reduzir para `24px`

**Commit:** `style(medidas): ajusta espaçamento vertical para densidade melhor`

---

## Fase 8 (Bônus) — Melhorar apresentação do histórico

**Objetivo:** Se o histórico tiver 10+ registros, évitar cards repetitivos. (Baixa prioridade — só se tiver tempo)

**Ideias:**

- Mostrar histórico em lista compacta inline:
  ```
  Histórico
  01 jul • 83.0 kg
  28 jun • 83.5 kg (↓ 0.5 kg)
  25 jun • 84.0 kg
  ```
  Ao invés de cards individuais gigantes.

- Ou agrupar por semana/mês.

**Escopo:** Deixa para depois se quiser. Não inclua nesta fase.

---

## Checklist de aceite final

- [x] Todos os labels em Title Case (nenhum ALL CAPS restante)
- [x] Cards de delta vazios removidos ou consolidados
- [x] Input focado tem feedback visual (border azul ou shadow)
- [x] "Adicionar mais detalhes" é um botão outline com ícone
- [x] Card "RESUMO DA ÚLTIMA MEDIDA" removido (ou transformado em texto pequeno de data)
- [x] Chip de período ativo tem contraste aumentado (border ou cor de texto)
- [x] Gaps verticais revisados, sem espaçamento excessivo
- [x] Sem regressão em responsividade (testar 375px)
- [x] Sem novo CSS sem sentido (manter design system)

---

## Ordem recomendada de execução

1. **Fase 1** — Labels (mais rápido, impacto visual alto)
2. **Fase 3** — Input feedback (já tem exemplo claro)
3. **Fase 2** — Remover deltas vazios (limpeza de componente)
4. **Fase 4** — Botão "Mais detalhes" (requer novo componente)
5. **Fase 5** — Remover resumo redundante (estrutura simples)
6. **Fase 6** — Chip ativo (tweaks de CSS)
7. **Fase 7** — Gaps verticais (refinamento final)

**Total estimado:** 45-60 min para todas as 7 fases.

---

## Fora de escopo

- Não adicionar nova funcionalidade (ex: upload de foto)
- Não alterar schema do Supabase
- Não redesenhar chips de medida (já feitos)
- Não reescrever gráfico (já funcional)

---

## Notas para o agente

Se encontrar labels em PT-BR que já estão em Title Case (ex: `Peso`, `Data`), deixe como estão — a intenção é manter consistência com o padrão do app, não traduzir ou mudar idioma.

Se encontrar algum CSS com `!important`, sinalize no commit message (marca técnica de dívida).

Se houver componente de "AlertDialog" ou toast que será acionado ao registrar medida, **não altere nesta fase** — apenas deixe o formulário funcional. O feedback ao usuário após submit fica para outra tarefa.
