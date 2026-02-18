# 📋 Sistema de Fichas de Treino Premium - Coach Vinny

## 🎯 Visão Geral

Sistema completo de fichas de treino digitais com design premium Black & Gold (estilo Hevy), permitindo que coaches criem fichas personalizadas e alunos registrem seu progresso de forma interativa com histórico automático.

## 🗄️ Estrutura do Banco de Dados

### Tabelas Consolidadas

#### 1. **exercicios_biblioteca** - Catálogo/Acervo de Exercícios
Biblioteca central de exercícios disponíveis para montar treinos.

```sql
CREATE TABLE exercicios_biblioteca (
  id UUID PRIMARY KEY,
  nome VARCHAR(255) NOT NULL,
  grupo_muscular VARCHAR(100),
  video_url TEXT,
  imagem_url TEXT,
  descricao TEXT,
  criado_em TIMESTAMP,
  criado_por UUID
);
```

**Exemplos**: Leg Press Horizontal, Agachamento Livre, Supino Reto, etc.

#### 2. **fichas_treino** - Rotinas Montadas pelo Coach
Fichas personalizadas (Treino A, Treino B, etc) com séries e repetições definidas.

```sql
CREATE TABLE fichas_treino (
  id UUID PRIMARY KEY,
  coach_id UUID NOT NULL,
  aluno_id UUID NOT NULL,
  nome_rotina VARCHAR(255) NOT NULL,
  configuracao JSONB NOT NULL,  -- ⚠️ Campo principal: salva séries e reps
  ativo BOOLEAN DEFAULT true,
  criado_em TIMESTAMP,
  atualizado_em TIMESTAMP
);
```

**Estrutura do campo `configuracao` (JSONB)**:
```json
{
  "exercicios": [
    {
      "id": "uuid-do-exercicio",
      "nome": "Leg Press Horizontal",
      "descanso": "1min 30s",
      "video_url": "https://youtube.com/embed/...",
      "series": [
        { "ordem": 1, "peso_atual": 50, "reps": 12 },
        { "ordem": 2, "peso_atual": 55, "reps": 10 },
        { "ordem": 3, "peso_atual": 60, "reps": 8 }
      ]
    }
  ]
}
```

#### 3. **historico_treinos** - Execuções dos Alunos
Registra KG, Reps e Checks de cada treino completo. **Alimenta a coluna ANTERIOR**.

```sql
CREATE TABLE historico_treinos (
  id UUID PRIMARY KEY,
  ficha_id UUID NOT NULL,
  aluno_id UUID NOT NULL,
  exercicio_id UUID NOT NULL,  -- Para buscar histórico por exercício
  dados_sessao JSONB NOT NULL,
  data_conclusao TIMESTAMP,
  duracao_minutos INTEGER,
  observacoes TEXT
);
```

**Estrutura do campo `dados_sessao` (JSONB)**:
```json
{
  "nome_rotina": "Quadríceps (em casa)",
  "exercicios": [
    {
      "id": "ex-001",
      "nome": "Leg Press Horizontal",
      "series": [
        { "ordem": 1, "peso_atual": 52, "reps": 16, "completado": true },
        { "ordem": 2, "peso_atual": 55, "reps": 12, "completado": true }
      ]
    }
  ],
  "data_sessao": "2026-02-17T20:30:00Z"
}
```

#### 4. **parceiros** - Parceiros Comerciais
Parceiros com cupons de desconto e carrossel de até 5 imagens.

```sql
CREATE TABLE parceiros (
  id UUID PRIMARY KEY,
  nome_marca VARCHAR(255) NOT NULL,
  descricao TEXT,
  cupom VARCHAR(100),
  link_desconto TEXT,
  logo_url TEXT,
  imagens TEXT[],  -- Array de até 5 URLs
  ordem INTEGER DEFAULT 0,
  ativo BOOLEAN DEFAULT true,
  criado_em TIMESTAMP
);
```

## 🔐 Políticas de Segurança (RLS)

### exercicios_biblioteca
- ✅ **Todos** podem visualizar
- ✅ Apenas **coaches** podem criar/editar

### fichas_treino
- ✅ **Alunos** veem apenas suas fichas
- ✅ **Coaches** veem fichas que criaram
- ✅ Apenas **coaches** podem criar/editar/deletar

### historico_treinos
- ✅ **Alunos** podem inserir e ver seu próprio histórico
- ✅ **Coaches** veem histórico dos alunos de suas fichas

### parceiros
- ✅ **Todos** podem visualizar parceiros ativos
- ✅ Apenas **coaches** podem gerenciar

## 💻 Funcionalidades

### 👨‍🏫 Para o Coach

#### 1. Criar Nova Ficha Digital

**Rota**: `/admin/treinos/nova-ficha`

1. Selecione o aluno
2. Digite o nome da rotina (ex: "Quadríceps - Avançado", "Treino A")
3. Adicione exercícios da biblioteca (exercicios_biblioteca)
4. Configure para cada exercício:
   - Tempo de descanso (ex: "1min 30s")
   - Séries (pode adicionar/remover dinamicamente)
   - Peso sugerido e repetições para cada série
   - URL do vídeo explicativo (opcional)
5. Clique em "SALVAR FICHA"

A ficha é salva em `fichas_treino` com campo `configuracao` (JSONB).

#### 2. Gerenciar Parceiros

**Rota**: `/admin/parceiros`

- Adicionar novo parceiro via modal
- Upload de até 5 imagens por parceiro
- Definir cupom de desconto e link para site
- Apenas coaches têm acesso aos controles de edição

### 👨‍🎓 Para o Aluno

#### 1. Visualizar Fichas Disponíveis

**Rota**: `/aluno/treinos`

- Cards destacados com fichas digitais premium
- Botão "ABRIR FICHA" para cada rotina
- Também exibe treinos em PDF (se houver)

#### 2. Executar Ficha de Treino

**Rota**: `/aluno/treinos/ficha?id={ficha_id}`

**Layout Premium (Estilo Hevy)**:
- ✅ Fundo `#0a0a0a` (preto profundo)
- ✅ Cards escuros com bordas douradas (`border-yellow-500/10`)
- ✅ Botão "INICIAR ROTINA" com gradiente dourado
- ✅ Ícones e emojis para exercícios

**Tabela de Séries**:

| SÉRIE | ANTERIOR | KG | REPS | CHECK |
|-------|----------|-----|------|-------|
| 1ª | 50kg x 16 | [input] | [input] | ⭕ |
| 2ª | 52kg x 10 | [input] | [input] | ⭕ |
| 3ª | — | [input] | [input] | ⭕ |

- **SÉRIE**: Número da série (1ª, 2ª, 3ª...)
- **ANTERIOR**: 🎯 **Busca automática de `historico_treinos`** (último treino daquele exercício)
- **KG**: Campo editável para peso atual
- **REPS**: Campo editável para repetições atuais
- **CHECK**: Checkbox arredondado - ao marcar, a linha ganha destaque visual

**Vídeo Explicativo**:
- Botão abaixo do nome do exercício
- Abre modal com iframe do YouTube

**Finalizar Treino**:
1. Preencha KG e REPS de todas as séries
2. Marque o CHECK ao completar cada série
3. Clique em "FINALIZAR TREINO"
4. Dados são salvos em `historico_treinos`
5. Na próxima sessão, esses dados aparecem na coluna ANTERIOR

#### 3. Visualizar Parceiros

**Rota**: `/aluno/parceiros`

- **Carrossel de imagens** (até 5 fotos por parceiro)
- Botão "COPIAR CUPOM" (copia para área de transferência)
- Botão "IR PARA SITE" (abre link em nova aba)
- Visual premium com navegação por setas

## 🔄 Fluxo de Dados

### Criação de Ficha (Coach)

```
Coach seleciona aluno
  ↓
Adiciona exercícios de exercicios_biblioteca
  ↓
Define séries, pesos e reps
  ↓
Salva em fichas_treino.configuracao (JSONB)
  ↓
Ficha fica disponível para o aluno
```

### Execução de Treino (Aluno)

```
Aluno abre ficha
  ↓
Sistema busca último histórico:
SELECT dados_sessao FROM historico_treinos
WHERE aluno_id = ? AND exercicio_id = ?
ORDER BY data_conclusao DESC LIMIT 1
  ↓
Preenche coluna ANTERIOR automaticamente
  ↓
Aluno preenche KG, REPS e marca CHECK
  ↓
Finaliza treino
  ↓
INSERT em historico_treinos (dados_sessao JSONB)
  ↓
Próximo treino: os dados aparecem em ANTERIOR
```

## 🚀 Instalação

### 1. Execute o SQL no Supabase

```bash
# No Supabase Dashboard:
# 1. Vá para SQL Editor
# 2. Copie e cole o conteúdo de supabase-migrations.sql
# 3. Execute o script (cria tabelas, políticas RLS e dados de exemplo)
```

### 2. Verifique Storage Buckets

Certifique-se de que os buckets existem:

```
✅ treinos-pdf (para PDFs de treino)
✅ parceiros-logos (para imagens de parceiros)
```

**Configuração**:
- Public read
- Authenticated write

### 3. Adicione Exercícios à Biblioteca

O SQL já insere 13 exercícios de exemplo. Para adicionar mais:

```sql
INSERT INTO exercicios_biblioteca (nome, grupo_muscular, video_url) VALUES
('Rosca Martelo', 'Bíceps', 'https://youtube.com/embed/...');
```

## 🔍 Queries Úteis

### Buscar fichas ativas de um aluno

```sql
SELECT 
  id, 
  nome_rotina, 
  configuracao,
  criado_em
FROM fichas_treino
WHERE aluno_id = 'uuid-do-aluno'
  AND ativo = true
ORDER BY criado_em DESC;
```

### Buscar último treino de um exercício específico

```sql
SELECT 
  dados_sessao,
  data_conclusao
FROM historico_treinos
WHERE aluno_id = 'uuid-do-aluno'
  AND exercicio_id = 'uuid-do-exercicio'
ORDER BY data_conclusao DESC
LIMIT 1;
```

### Estatísticas de treino (últimos 30 dias)

```sql
SELECT 
  COUNT(*) as total_treinos,
  MAX(data_conclusao) as ultimo_treino,
  AVG(duracao_minutos) as media_duracao
FROM historico_treinos
WHERE aluno_id = 'uuid-do-aluno'
  AND data_conclusao >= NOW() - INTERVAL '30 days';
```

### Exercícios mais usados por grupo muscular

```sql
SELECT 
  grupo_muscular,
  COUNT(*) as total_uso
FROM exercicios_biblioteca
GROUP BY grupo_muscular
ORDER BY total_uso DESC;
```

### Verificar integridade da tabela fichas_treino

```sql
-- Verificar se tem coluna 'configuracao' 
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'fichas_treino';

-- Se ainda tiver 'estrutura_treino', rode a migração:
ALTER TABLE fichas_treino RENAME COLUMN estrutura_treino TO configuracao;
```

## 🎨 Design Premium (Black & Gold)

### Cores Utilizadas

- **Background**: `#0a0a0a` (preto profundo)
- **Cards**: `bg-zinc-900` com borda `border-yellow-500/10`
- **Botões principais**: Gradiente `from-[#B8860B] via-[#FFD700] to-[#B8860B]`
- **Texto primário**: `text-white`
- **Texto secundário**: `text-gray-400`
- **Inputs**: `bg-zinc-800` com foco em `border-yellow-500`

### Elementos Visuais

- Cards com bordas arredondadas (`rounded-xl`)
- Bordas sutis douradas (`border-yellow-500/10`)
- Checkboxes arredondados (`rounded-full`)
- Efeitos hover suaves
- Modal para vídeos explicativos
- Ícones do Lucide React

## 🐛 Troubleshooting

### ❌ Problema: Coluna ANTERIOR não mostra dados

**Causa**: Não existe histórico anterior para aquele exercício.

**Solução**: 
1. Verifique se existem registros em `historico_treinos`:
```sql
SELECT * FROM historico_treinos 
WHERE aluno_id = 'uuid' 
  AND exercicio_id = 'uuid';
```
2. Certifique-se de que o aluno já finalizou pelo menos um treino com aquele exercício.

### ❌ Problema: Erro ao salvar ficha (campo estrutura_treino não existe)

**Causa**: A coluna foi renomeada de `estrutura_treino` para `configuracao`.

**Solução**: 
```sql
-- Rode esta migração no Supabase SQL Editor:
ALTER TABLE fichas_treino RENAME COLUMN estrutura_treino TO configuracao;
```

### ❌ Problema: Erro ao buscar exercícios (tabela exercicios não existe)

**Causa**: A tabela foi renomeada para `exercicios_biblioteca`.

**Solução**: Execute o script `supabase-migrations.sql` completo para criar a tabela correta.

### ❌ Problema: Vídeos não aparecem ou não carregam

**Solução**: 
1. Use URLs do YouTube no formato embed: `https://youtube.com/embed/VIDEO_ID`
2. Exemplo: `https://youtube.com/embed/IZxyjW7MPJQ`
3. Certifique-se de que o campo `video_url` não está vazio

### ❌ Problema: Coach não consegue criar fichas

**Solução**:
1. Verifique se o usuário tem `role = 'coach'` na tabela `profiles`
2. Verifique as políticas RLS no Supabase
3. Teste a query manualmente:
```sql
SELECT role FROM profiles WHERE id = auth.uid();
```

### ❌ Problema: Parceiros sem cupom ou imagens

**Causa**: A tabela `parceiros` não tem as colunas corretas.

**Solução**:
```sql
-- Adicione as colunas se não existirem:
ALTER TABLE parceiros 
ADD COLUMN IF NOT EXISTS cupom VARCHAR(100),
ADD COLUMN IF NOT EXISTS link_desconto TEXT,
ADD COLUMN IF NOT EXISTS imagens TEXT[];
```

## 📱 Rotas da Aplicação

### 👨‍🏫 Coach

- `/admin/treinos` - Gerenciar treinos (PDFs + Fichas digitais)
- `/admin/treinos/nova-ficha` - Criar nova ficha digital
- `/admin/parceiros` - Gerenciar parceiros (modal com 5 imagens)
- `/admin/alunos` - Listar alunos/convidar novos

### 👨‍🎓 Aluno

- `/aluno/treinos` - Ver fichas digitais e PDFs
- `/aluno/treinos/ficha?id={id}` - Executar ficha específica
- `/aluno/parceiros` - Ver parceiros (carrossel)
- `/aluno/perfil` - Perfil e configurações

## ⚙️ Estrutura Técnica

### Tecnologias

- **Frontend**: Next.js 16.1.6, React 19, TypeScript 5- **Styling**: Tailwind CSS v4 (com `bg-linear-to-r` para gradientes)
- **Icons**: Lucide React (Clock, Play, Check, Video, etc)
- **Database**: Supabase PostgreSQL (JSONB para dados dinâmicos)
- **Storage**: Supabase Storage (treinos-pdf, parceiros-logos)
- **Auth**: Supabase Auth com RLS

### Arquivos Principais

```
app/
├── aluno/
│   └── treinos/
│       ├── page.tsx              # Lista fichas + PDFs
│       └── ficha/
│           └── page.tsx          # Executar ficha (interface premium)
├── admin/
│   └── treinos/
│       ├── page.tsx              # Upload PDF + botão criar ficha
│       └── nova-ficha/
│           └── page.tsx          # Criar ficha digital (coach)
lib/
├── supabaseClient.ts             # Cliente do Supabase
└── supabaseAdmin.ts              # Admin client (server-only)
supabase-migrations.sql            # Script completo do banco
```

## 🎯 Checklist de Verificação

Antes de usar o sistema, confirme:

- [ ] SQL executado no Supabase (tabelas criadas)
- [ ] Tabela `fichas_treino` tem coluna `configuracao` (JSONB)
- [ ] Tabela `exercicios_biblioteca` existe e tem exercícios
- [ ] Tabela `parceiros` tem colunas `cupom`, `link_desconto`, `imagens`
- [ ] Buckets `treinos-pdf` e `parceiros-logos` existem
- [ ] Usuários têm `role = 'coach'` ou `role = 'aluno'` em `profiles`
- [ ] Políticas RLS estão ativas

## 🎯 Próximas Melhorias (Opcional)

1. **Analytics Avançado**:
   - Gráfico de evolução de carga por exercício
   - Comparação de volume de treino (séries × reps × kg)
   - Taxa de conclusão semanal

2. **Funcionalidades Extras**:
   - Clone de fichas (reutilizar treinos)
   - Templates de treino (Hipertrofia, Força, Resistência)
   - Comentários do coach nos treinos finalizados
   - Notificações push (novo treino, lembrete)
   - Timer de descanso integrado

3. **Social**:
   - Feed de atividades
   - Ranking de frequência
   - Conquistas/badges

## 📞 Suporte

**Problemas Comuns**:
1. Verifique logs do console (F12 no navegador)
2. Verifique logs do Supabase (Dashboard → Logs)
3. Confirme políticas RLS (Dashboard → Authentication → Policies)
4. Teste queries SQL manualmente no SQL Editor

**Arquitetura**:
- Frontend renderiza dados do JSONB
- Coluna ANTERIOR vem de query em `historico_treinos`
- Coach monta treino → salva em `fichas_treino.configuracao`
- Aluno executa → salva em `historico_treinos.dados_sessao`

---

**✨ Desenvolvido com 💪 para Coach Vinny - Black & Gold Premium Edition**

**Design inspirado em**: Hevy App (layout premium de fichas de treino)
- **Cards**: `bg-zinc-900` com borda `border-yellow-500/10`
- **Botões principais**: Gradiente `from-[#B8860B] via-[#FFD700] to-[#B8860B]`
- **Texto primário**: `text-white`
- **Texto secundário**: `text-gray-400`
- **Inputs**: `bg-zinc-800` com foco em `border-yellow-500`

### Elementos Visuais

- Cards com bordas arredondadas (`rounded-xl`)
- Bordas sutis douradas (`border-yellow-500/10`)
- Checkboxes arredondados (`rounded-full`)
- Efeitos hover suaves
- Modal para vídeos explicativos
- Ícones do HeroIcons

## 📊 Fluxo de Dados

### Criação de Ficha (Coach)

```
Coach seleciona aluno
  ↓
Adiciona exercícios do catálogo
  ↓
Define séries, pesos e reps
  ↓
Salva em fichas_treino (JSONB)
  ↓
Ficha fica disponível para o aluno
```

### Execução de Treino (Aluno)

```
Aluno abre ficha
  ↓
Sistema busca último histórico
  ↓
Preenche coluna ANTERIOR automaticamente
  ↓
Aluno preenche KG, REPS e marca CHECK
  ↓
Finaliza treino
  ↓
Dados salvos em historico_treinos
```

## 🔍 Queries Úteis

### Buscar fichas ativas de um aluno

```sql
SELECT * FROM fichas_treino
WHERE aluno_id = 'uuid-do-aluno'
  AND ativo = true
ORDER BY criado_em DESC;
```

### Buscar último treino de um aluno

```sql
SELECT dados_sessao FROM historico_treinos
WHERE aluno_id = 'uuid-do-aluno'
  AND ficha_id = 'uuid-da-ficha'
ORDER BY data_conclusao DESC
LIMIT 1;
```

### Estatísticas de treino

```sql
SELECT 
  COUNT(*) as total_treinos,
  MAX(data_conclusao) as ultimo_treino
FROM historico_treinos
WHERE aluno_id = 'uuid-do-aluno'
  AND data_conclusao >= NOW() - INTERVAL '30 days';
```

## 🐛 Troubleshooting

### Problema: Coluna ANTERIOR não mostra dados

**Solução**: Verifique se existe histórico anterior na tabela `historico_treinos` para aquela ficha específica.

### Problema: Erro ao salvar ficha

**Solução**: 
1. Verifique se o coach está autenticado
2. Confirme que o campo `estrutura_treino` está em formato JSONB válido
3. Verifique as políticas RLS no Supabase

### Problema: Vídeos não aparecem

**Solução**: 
1. Verifique se a URL do vídeo é válida
2. Use URLs do YouTube no formato: `https://youtube.com/embed/VIDEO_ID`
3. Certifique-se de que o campo `video_url` não está vazio

## 📱 Rotas da Aplicação

### Coach
- `/admin/treinos` - Lista treinos e botão para criar ficha
- `/admin/treinos/nova-ficha` - Criar nova ficha digital

### Aluno
- `/aluno/treinos` - Lista todas as fichas e treinos em PDF
- `/aluno/treinos/ficha?id={ficha_id}` - Visualizar e executar ficha específica

## 🎯 Próximas Melhorias (Opcional)

1. **Analytics**:
   - Gráfico de evolução de carga por exercício
   - Taxa de conclusão de treinos
   - Frequência semanal

2. **Notificações**:
   - Lembrete de treino
   - Novas fichas disponíveis

3. **Funcionalidades Extras**:
   - Clone de fichas
   - Templates de treino
   - Biblioteca de vídeos próprios
   - Observações do aluno por treino
   - Feedback do coach nos treinos completos

## 📞 Suporte

Para dúvidas ou problemas:
1. Verifique os logs do console do navegador
2. Verifique os logs do Supabase
3. Confirme as políticas RLS
4. Teste as queries SQL manualmente

---

**Desenvolvido com 💪 para Coach Vinny - Black & Gold Premium**
