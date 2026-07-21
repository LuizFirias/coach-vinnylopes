# Refatoração — Tela de Perfil do Coach (+ base para Mercado de Coaches)

> Documento de especificação para implementação via Cursor. Segue os tokens visuais e regras anti-template do `auron-design-SKILL.md` — reaproveitar componentes existentes, não recriar padrões já definidos.

---

## 1. Contexto / objetivo

A tela atual (`/perfil` ou equivalente, dentro de "Configurações da Conta") é só um formulário básico: avatar, nome, e-mail (readonly), trocar senha, gerenciar assinatura, sair. Não comunica identidade profissional nenhuma — é puramente administrativa.

Objetivo desta refatoração: transformar essa tela em um **perfil profissional real do coach**, e já embutir os campos que a futura funcionalidade de **Mercado** vai precisar — uma seção onde alunos sem coach navegam e "dão match" com coaches disponíveis (modelo tipo Tinder/LinkedIn: cards com foto, headline, tags, swipe/browse).

**Importante**: este documento cobre apenas a tela de edição de perfil e a estrutura de dados. A tela de browsing/matching do aluno (o "feed" de coaches) é um projeto separado, fora de escopo aqui — só estamos preparando o terreno para não ter que migrar dados depois.

---

## 2. Problemas da tela atual

- Card da esquerda é decorativo (avatar + nome + badge de plano) sem nenhuma informação profissional.
- Não existe conceito de "perfil público" vs "dados de conta" — tudo misturado no mesmo card.
- Nenhum campo hoje serviria para popular um card de descoberta (sem foto de capa/galeria, sem bio, sem especialidade, sem localização, sem prova social).
- `Gerenciar assinatura` e `Sair da conta` dividem espaço visual com o que deveria ser identidade profissional — são ações de conta, não de perfil.

---

## 3. Arquitetura de informação nova

Separar em duas grandes áreas, com IA clara sobre o que é **público** (visível no Mercado) e o que é **privado** (só o próprio coach vê):

### A. Perfil Público (visível no Mercado quando o coach optar por ficar disponível)

| Campo | Tipo | Obrigatório | Público no Mercado | Notas |
|---|---|---|---|---|
| Foto de perfil | imagem | sim (já existe) | sim | já existe, manter |
| Nome de exibição | texto | sim (já existe) | sim | já existe |
| Handle (@usuário) | texto único | sim | sim | já referenciado no design skill (compartilhamento IG); hoje não aparece nesta tela — trazer pra cá |
| Headline profissional | texto curto (≤60 char) | sim p/ Mercado | sim | ex: "Especialista em Hipertrofia e Emagrecimento" — é o que aparece no card tipo Tinder |
| Bio / Sobre mim | texto longo (≤500 char) | não | sim | expande no perfil completo |
| Especialidades | multi-select (tags) | sim p/ Mercado | sim | Emagrecimento, Hipertrofia, Funcional, Corrida, Crossfit, Reabilitação, Terceira idade, Gestante, Powerlifting, Online Coaching, etc. — lista configurável |
| Modalidade de atendimento | select único | sim p/ Mercado | sim | Online / Presencial / Híbrido |
| Cidade / Estado | texto + autocomplete | sim p/ Mercado | sim | usado pra filtro geográfico no Mercado |
| CREF (registro profissional) | texto (máscara XXXXXX-G/UF) | não, mas recomendado | sim (só o número, com selo "verificado" futuro) | forte sinal de confiança pro aluno |
| Anos de experiência | número | não | sim | |
| Certificações / formação | lista de texto livre | não | sim | ex: "Pós em Fisiologia do Exercício — USP" |
| Galeria de fotos | múltiplas imagens (até 6) | não | sim | portfólio: resultados, ambiente de trabalho — formato "card swipe" |
| Instagram | handle | não | sim | reaproveita padrão já usado nos cards de compartilhamento |
| Vagas abertas | toggle + número opcional | sim p/ Mercado | sim | ver seção "Disponibilidade" abaixo |
| Faixa de preço | texto/select (ex: "A partir de R$X" ou "Sob consulta") | não | sim | opcional, coach decide se mostra |

### B. Disponibilidade / Mercado (campo de controle central)

| Campo | Tipo | Notas |
|---|---|---|
| **Disponível no Mercado** | toggle master | Controla se o perfil aparece pra alunos sem coach. Desligado por padrão — opt-in explícito, nunca automático. |
| Aceitando novos alunos | toggle | Independente do anterior: coach pode estar visível mas "vagas fechadas" (mostra badge, não desaparece do feed). |

### C. Conta e Acesso (privado — mantém o que já existe)

| Campo | Tipo | Notas |
|---|---|---|
| E-mail de acesso | texto (readonly) | mantém |
| Senha | ação | mantém "Trocar senha" |
| Assinatura | ação | mantém "Gerenciar assinatura" |
| Sessão | ação | mantém "Sair da conta" |

### D. Prova social (somente leitura, calculado — preparar espaço, não construir agora)

| Campo | Fonte | Notas |
|---|---|---|
| Nº de alunos ativos | já existe no sistema | exibir como selo no card público, se coach permitir |
| Tempo na plataforma | `created_at` do perfil | "Coach desde 2025" |
| Avaliação média | fora de escopo | reservar espaço no layout, sem funcionalidade ainda (reviews é outro projeto) |

---

## 4. Layout — Desktop

Renomear header de "Configurações da Conta" para **"Perfil"**, com sub-tabs fixas no topo (não accordion — regra anti-template do design skill):

```
[Perfil Profissional]   [Conta e Acesso]
```

### Tab "Perfil Profissional" — duas colunas

**Coluna esquerda (sticky, ~360px)** — preview ao vivo do card público:
```
┌─────────────────────────────┐
│  [foto capa/galeria 1]      │
│                              │
│  ● Disponível no Mercado     │  ← reflete o toggle em tempo real
│                              │
│  Nome do Coach               │
│  @handle                     │
│  "Headline profissional"     │
│                              │
│  [tag] [tag] [tag]           │  ← especialidades, estilo chip
│  📍 Cidade, UF                │
│  🎓 CREF 000000-G/SP          │
│                              │
│  👥 24 alunos ativos          │
└─────────────────────────────┘
```
Esse preview é o que reforça pro coach, em tempo real, como ele vai aparecer pros alunos — mesmo padrão de feedback imediato que já existe nos outros construtores do app (ficha de treino, etc.).

**Coluna direita (formulário, scroll único — sem accordion escondendo campos)**:
1. Identidade — foto, nome, handle
2. Perfil profissional — headline, bio, CREF, anos de experiência, certificações
3. Especialidades — multi-select de tags (componente novo, ver seção 6)
4. Atendimento — modalidade, cidade/UF, faixa de preço
5. Galeria — upload de até 6 fotos, grid com reorder (drag handle, reaproveitando padrão HTML5 nativo já usado na ficha de treino)
6. Redes — Instagram
7. Mercado — toggle "Disponível no Mercado" + toggle "Aceitando novos alunos", com texto explicativo curto abaixo (não modal, inline)

Botão salvar: mesmo padrão do resto do app — disabled com opacity 0.4 quando `isDirty === false`, header sticky.

### Tab "Conta e Acesso" — mantém estrutura atual (dados de acesso, senha, assinatura, sessão), só remove o que foi pro "Perfil Profissional".

---

## 5. Layout — Mobile

- Tabs fixas no topo (mesmas duas: Perfil Profissional / Conta e Acesso), com `touch-action: manipulation`, tap target ≥44×44pt.
- **Sem coluna dupla**: preview do card público vira um componente compacto no topo (foto pequena + headline + badge de disponibilidade), expansível.
- Campos empilham em coluna única.
- Especialidades (multi-select) e Cidade (autocomplete) abrem em **bottom sheet** — não dropdown nativo, seguindo o padrão já definido no design skill pra campos com muitas opções.
- Galeria: grid 3 colunas, tap abre bottom sheet de reorder/exclusão (long press ativa modo de reordenação, mesmo padrão do drag & drop mobile já especificado).
- Botão salvar: **bottom bar fixa** (não no header) — regra explícita do design skill.
- Toggle "Disponível no Mercado": destaque visual maior no mobile (é a ação mais importante da tela), com confirmação leve ao ativar pela primeira vez ("seu perfil ficará visível para alunos buscando coach") — não bloqueante, só um toast/inline notice.

---

## 6. Componentes novos necessários

| Componente | Descrição | Reaproveita? |
|---|---|---|
| `SpecialtyTagSelector` | Multi-select de tags com chips (background semântico, border-radius 4-6px conforme token de badge) | Novo — seguir mesmo padrão visual de `Status pill` já definido |
| `AvailabilityToggle` | Toggle grande com label + descrição inline | Reaproveitar padrão de toggle já usado em outras configs, se existir |
| `PhotoGalleryUploader` | Upload múltiplo com grid + reorder | Novo, mas reutiliza drag & drop HTML5 nativo já padronizado |
| `PublicProfilePreviewCard` | Card de preview em tempo real (desktop: sticky lateral / mobile: topo compacto) | Novo — base do futuro card de "match" do Mercado, então vale construir já pensando em reuso |
| `CityAutocomplete` | Input de cidade/UF com sugestão | Novo — verificar se já existe alguma lib de cidades BR no projeto antes de adicionar dependência |

Todos seguem a paleta e tipografia do `auron-design-SKILL.md` (fundo `#141414`, accent `#2b7fff`, sem pill genérico fora de status/tabs).

---

## 7. Considerações técnicas / schema

- **Tabela**: confirmar no Supabase se os novos campos entram na tabela `profiles` existente ou justificam uma tabela separada `coach_public_profiles` (recomendado, dado o volume de campos e a natureza pública deles — mais fácil de dar RLS diferente pra dados públicos vs privados do que misturar tudo em `profiles`).
- **RLS — atenção especial**: o projeto já teve um incidente de privilege escalation em `profiles` (campos sensíveis auto-editáveis) corrigido via trigger `trg_prevent_privileged_self_update`. Ao criar a policy que expõe dados no Mercado:
  - Policy de leitura pública deve permitir SELECT **somente** nos campos marcados como "Público no Mercado" na tabela da seção 3, e **somente** quando `disponivel_no_mercado = true`.
  - Nunca expor e-mail, dados de assinatura/financeiro, ou qualquer campo da aba "Conta e Acesso" nessa policy.
  - Se for tabela separada (`coach_public_profiles`), fica mais simples de auditar do que adicionar exceções em `profiles`.
- **Storage**: novo bucket no Supabase Storage para galeria (`coach-gallery` ou similar), com policy de leitura pública apenas para coaches com `disponivel_no_mercado = true`, e escrita restrita ao próprio coach.
- **Migration**: nova migration numerada na sequência existente (última conhecida: `0045`).
- **Validação de CREF**: formato `XXXXXX-G/UF` — implementar validação de formato no frontend; validação de veracidade (selo "verificado") fica fora de escopo por ora.

---

## 8. Checklist para o Cursor

- [ ] Localizar arquivo/tela atual de perfil (`/perfil` ou dentro de configurações) e componente do card lateral.
- [ ] Decidir e criar schema: nova tabela `coach_public_profiles` (recomendado) ou colunas em `profiles` — migration nova.
- [ ] Implementar `SpecialtyTagSelector`, `AvailabilityToggle`, `PhotoGalleryUploader`, `PublicProfilePreviewCard`, `CityAutocomplete`.
- [ ] Criar bucket de Storage para galeria com policies corretas.
- [ ] Escrever policy de RLS pública restrita aos campos da seção 3-A, condicionada a `disponivel_no_mercado = true` — revisar com a mesma atenção da auditoria RLS anterior.
- [ ] Refatorar tela em duas tabs: "Perfil Profissional" / "Conta e Acesso".
- [ ] Implementar layout desktop (preview sticky + formulário) e mobile (preview compacto + bottom sheets + bottom bar de salvar).
- [ ] Popular lista de especialidades (definir lista inicial — sugestão na seção 3-A).
- [ ] Testar `isDirty` guard e warn on unsaved changes nos dois layouts.

---

## 9. Perguntas em aberto

1. Lista final de especialidades — a sugerida na seção 3-A é um ponto de partida, precisa validação de quem entende o produto/mercado fitness.
2. Tabela separada (`coach_public_profiles`) ou colunas em `profiles`? Recomendo separada por segurança e clareza de RLS, mas depende de como o resto do schema já está desenhado.
3. Faixa de preço pública: coach pode esconder esse campo? Ou é sempre visível quando disponível no Mercado?
4. Limite de galeria (sugeri 6 fotos) — confirmar se faz sentido pro caso de uso ou se deve ser maior/menor.
5. CREF obrigatório para aparecer no Mercado, ou opcional com selo "não verificado"?

---

## 10. Fora de escopo

- Tela de browsing/swipe do aluno (o "feed" do Mercado em si).
- Sistema de reviews/avaliação.
- Selo de verificação de CREF.
- Chat/match entre aluno e coach.
﻿
---

## 11. MP_PLAN IDs (gerados 21/07/2026 — token de teste)

Cole nas envs (.env.local / Vercel) apos desligar MP_TEST_DAILY_CYCLE:

MP_PLAN_INICIANTE_MONTHLY_ID=703a4affc8cd4b44b3bb0989d8deea1e
MP_PLAN_INICIANTE_SEMESTER_ID=8af7836ece4f4e418ed354b998ca589b
MP_PLAN_INICIANTE_YEARLY_ID=07b19e4251be4551a7790dd7046321d7
MP_PLAN_START_MONTHLY_ID=39ef6d47a6814806ba0d972393032aef
MP_PLAN_START_SEMESTER_ID=f4b61f6cf90a4005a92e0653ce25c6d0
MP_PLAN_START_YEARLY_ID=cd02a65cfc6142749495aa4673fa9e12
MP_PLAN_PRO_MONTHLY_ID=841e3a9c19a74e6ebd21284196dc8d8d
MP_PLAN_PRO_YEARLY_ID=be39c1a55bd34a75958d4832899cfa26
MP_PLAN_ELITE_MONTHLY_ID=1626955777a04337a241a30b736d6239
MP_PLAN_ELITE_SEMESTER_ID=664f17429a49408397bc216c49f4507e
MP_PLAN_ELITE_YEARLY_ID=48914cab5d914a79ab7d8ac65b212497

Com MP_TEST_DAILY_CYCLE=true, o checkout ignora esses preapproval_plan_id.
