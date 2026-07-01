# AURON — Evolução e Relatório de Medidas do Aluno (Coach)

**Executor:** Claude (Antigravity)  
**Modo:** Fase a fase, com validação de compilação  
**Objetivo:** Refatorar a visualização de evolução de medidas na visão do Coach (`app/admin/aluno/[id]/page.tsx`), integrando um gráfico dinâmico composto (peso, gordura e circunferências) e adicionando um gerador de relatório PDF premium A4 usando `jspdf` e `jspdf-autotable`.

---

## 1. Inspiração & Melhores Práticas de Personal Trainers

Com base em pesquisas de relatórios de avaliação física e de composição corporal (como MFIT, Nexur, Planilhas Antropométricas avançadas):
- **Visualização de Tendência Clara:** O coach precisa alternar e comparar facilmente entre Peso, % de Gordura e Circunferências Corporais.
- **Antes vs. Depois / Deltas Totais:** Mostrar o ponto de partida (primeiro registro) vs. o estado atual (último registro) para evidenciar a evolução total do aluno.
- **Relatório Exportável (PDF A4):** O arquivo PDF precisa parecer um documento oficial impresso (limpo, com cabeçalho institucional, cores sóbrias, tabelas com alinhamento numérico exato e sumário de deltas).

---

## 2. Design Tokens (Visão Admin)

Manter a consistência com o tema escuro do painel administrativo:
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
```

---

## 3. Fase 1 — Adicionar Gráfico de Medidas Dinâmico no Perfil do Aluno (Visão Coach)

**Objetivo:** Inserir um gráfico de evolução de medidas no topo da tab `evolucao` de `app/admin/aluno/[id]/page.tsx`.

- **Métricas Suportadas:** Peso, % Gordura, Cintura, Tórax, Braços, Coxas, Panturrilhas.
- **Estilo do Gráfico:** Recharts `ComposedChart` com uma linha de tendência suavizada (`Line`) e pontos de dispersão (`Scatter`) para os registros originais.
- **Estrutura Visual:**
  - Seletor de chip de métrica (Peso, % Gordura, Circunferências).
  - Estatística da métrica ativa (Valor Atual e Delta Total desde a primeira avaliação).

**Fórmula de Tendência (Média Móvel de 7 pontos):**
Igual ao implementado na tela do aluno para consistência de dados.

---

## 4. Fase 2 — Implementar o Botão "Exportar Relatório PDF"

**Objetivo:** Adicionar o botão de exportar relatório ao lado do título "Evolução de Medidas".

- **Estilo:** Botão outline/secundário, utilizando o ícone de PDF/Download.
- **Posicionamento:** Alinhado à direita no header da seção de evolução de medidas.

---

## 5. Fase 3 — Gerar o PDF Premium A4 (jspdf + jspdf-autotable)

O PDF deve ser renderizado no tamanho **A4** (retrato) com uma estética corporativa limpa:
- **Cores do PDF:** Cabeçalhos em Azul Auronfit (`#2563EB`), texto principal em `#1F1F23`, fundo alternado de linhas em cinza claro (`#F4F4F5`).
- **Cabeçalho:** Logo/Nome "Auronfit — Assessoria Esportiva", nome do Coach, data de emissão.
- **Ficha do Aluno:** Nome do aluno, e-mail, quantidade total de medições.
- **Quadro de Evolução Geral (Deltas):** Resumo comparando a primeira data registrada vs. a última data de medição, destacando a perda/ganho de peso e redução de medidas.
- **Tabela de Histórico (AutoTable):** Listagem de todas as medições ordenadas cronologicamente com colunas formatadas (`Peso (kg)`, `% Gord.`, `Cintura (cm)`, `Tórax (cm)`, `Braço E/D (cm)`, `Coxa E/D (cm)`).

---

## 6. Checklist de Aceite

- [ ] Gráfico renderiza sem erros na tab `evolucao` do Admin.
- [ ] Chips do gráfico permitem alternar métricas de forma reativa.
- [ ] Botão de exportação PDF é exibido somente quando há medições registradas.
- [ ] O PDF exportado é gerado diretamente no navegador (A4 vertical).
- [ ] O PDF contém cabeçalho, dados do aluno, quadro comparativo de deltas e histórico tabulado completo.
- [ ] Sem quebras de layout responsivo no painel administrativo.
- [ ] Compilação limpa do projeto (`npm run build` ou `tsc --noEmit`).
