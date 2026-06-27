# Sprint 5 — Preferências do Usuário

## ✅ O que foi criado

Migration `0013_sprint5_preferencias.sql` adicionando 8 novas colunas na tabela `profiles`:

### Colunas adicionadas:

1. **`height_cm`** (SMALLINT, opcional)
   - Altura do usuário em centímetros
   - Validação: entre 100 e 250 cm

2. **`sexo`** (TEXT, opcional)
   - Opções: 'masculino', 'feminino', 'outro'

3. **`objetivo`** (TEXT, opcional)
   - Opções: 'cutting', 'bulking', 'manutencao', 'recomposicao'

4. **`unidade_peso`** (TEXT, obrigatório, padrão 'kg')
   - Opções: 'kg', 'lb'

5. **`unidade_medida`** (TEXT, obrigatório, padrão 'cm')
   - Opções: 'cm', 'in'

6. **`incremento_peso_padrao`** (NUMERIC(4,2), obrigatório, padrão 2.5)
   - Incremento padrão ao adicionar peso nos exercícios

7. **`oculto_no_ranking`** (BOOLEAN, obrigatório, padrão FALSE)
   - Permite ao usuário se esconder do ranking público

8. **`notificacoes_ativas`** (BOOLEAN, obrigatório, padrão TRUE)
   - Controle de notificações do app

## 📋 Como aplicar

### Opção 1: Supabase Dashboard (Recomendado)

1. Acesse: https://ulyssryxgkvdkbgvfgpz.supabase.co/project/ulyssryxgkvdkbgvfgpz/sql
2. Abra o arquivo `supabase/migrations/0013_sprint5_preferencias.sql`
3. Copie todo o conteúdo SQL (linhas 1-26, excluindo o bloco de rollback comentado)
4. Cole no SQL Editor do Supabase
5. Clique em "Run" para executar

### Opção 2: Supabase CLI

```bash
# Primeiro, linkar o projeto (se ainda não fez)
npx supabase link --project-ref ulyssryxgkvdkbgvfgpz

# Aplicar a migration
npx supabase db push
```

### Opção 3: psql direto

```bash
psql "postgresql://postgres:[SUA-SENHA]@db.ulyssryxgkvdkbgvfgpz.supabase.co:5432/postgres" \
  -f supabase/migrations/0013_sprint5_preferencias.sql
```

## 🔄 Rollback

Se precisar reverter as mudanças:

```sql
ALTER TABLE profiles
  DROP COLUMN IF EXISTS height_cm,
  DROP COLUMN IF EXISTS sexo,
  DROP COLUMN IF EXISTS objetivo,
  DROP COLUMN IF EXISTS unidade_peso,
  DROP COLUMN IF EXISTS unidade_medida,
  DROP COLUMN IF EXISTS incremento_peso_padrao,
  DROP COLUMN IF EXISTS oculto_no_ranking,
  DROP COLUMN IF EXISTS notificacoes_ativas;
```

## 📝 Próximos passos no frontend

Após aplicar a migration, você pode:

1. **Página de Perfil**: adicionar campos para editar essas preferências
2. **Configurações de Treino**: usar `incremento_peso_padrao` na tela de execução
3. **Ranking**: respeitar `oculto_no_ranking` ao exibir leaderboard
4. **Conversão de Unidades**: usar `unidade_peso` e `unidade_medida` para exibir valores
5. **Notificações**: verificar `notificacoes_ativas` antes de enviar push notifications

## 🎯 Impacto

- ✅ Retrocompatível (todas as colunas são opcionais ou têm defaults)
- ✅ Sem downtime (ALTER TABLE com IF NOT EXISTS)
- ✅ Sem necessidade de migração de dados (defaults aplicados automaticamente)
- ✅ RLS continua funcionando (sem mudanças nas policies)

## 📚 Referência

- Baseado em: `MIGRATION-PLAN.md` §9 (Sprint 5)
- Branch: `sprint-1-design-system`
- Data: 2026-05-06
