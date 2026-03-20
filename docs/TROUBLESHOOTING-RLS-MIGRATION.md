# 🔧 Troubleshooting: Erros ao Executar RLS Migration

## Erro 1: "policy already exists"

**Causa:** A política já foi criada, mas o script tentou criar novamente.

**Solução:**
Copie o arquivo atualizado `docs/fix-plano-alimentar-rls.sql` que agora dropa TODOS os nomes de policies possíveis.

---

## Erro 2: "table does not exist"

**Causa:** A tabela `plano_alimentar_pdf` não existe ou tem nome diferente.

**Verificar:**
```sql
-- Execute APENAS isso no Supabase SQL Editor para verificar
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name LIKE '%plano%';
```

**Se vir resultado:** A tabela existe, copie o nome exato
**Se não vir:** Significa a tabela não foi criada ainda - contacte suporte

---

## Erro 3: "column does not exist"

**Causa:** Falta coluna `aluno_id`, `coach_id` ou outra não está no banco.

**Verificar:**
```sql
-- Veja todas as colunas da tabela
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'plano_alimentar_pdf';
```

**Se faltar coluna:** Precisa adicionar antes:
```sql
-- Exemplo: adicionar aluno_id se não existir
ALTER TABLE plano_alimentar_pdf 
ADD COLUMN IF NOT EXISTS aluno_id UUID REFERENCES profiles(id);
```

---

## Erro 4: "Foreign key constraint violation"

**Causa:** `coach_alunos` table não existe or estructura diferente.

**Verificar:**
```sql
-- Veja se a tabela existe
SELECT * FROM coach_alunos LIMIT 1;
```

**Se não existir:** Comente/remova as partes que usam `coach_alunos`:
```sql
-- COMENTAR esta policy se coach_alunos não existir:
-- CREATE POLICY "coach_insert_plan" ON plano_alimentar_pdf ...
```

---

## Solução Nuclear: Se Nada Funcionar

Execute APENAS as partes essenciais:

```sql
-- 1. Ativa RLS (obrigatório)
ALTER TABLE plano_alimentar_pdf ENABLE ROW LEVEL SECURITY;

-- 2. Delete tudo que tinha antes (opcional, em último caso)
DO $$ 
DECLARE
    pol RECORD;
BEGIN
    FOR pol IN (
        SELECT policyname FROM pg_policies 
        WHERE tablename = 'plano_alimentar_pdf'
    )
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON plano_alimentar_pdf', pol.policyname);
    END LOOP;
END $$;

-- 3. Cria a mais importante (alunos veem só seus PDFs)
CREATE POLICY "aluno_sees_own_plans" ON plano_alimentar_pdf
  FOR SELECT
  USING (aluno_id = auth.uid());

-- 4. Alunos não modificam
CREATE POLICY "aluno_no_modify" ON plano_alimentar_pdf
  FOR UPDATE
  USING (false);

CREATE POLICY "aluno_no_delete" ON plano_alimentar_pdf
  FOR DELETE
  USING (false);
```

Depois disso, XOs PDFs já estão isolados. As outras policies são extras.

---

## Como Verificar se Funcionou

No Supabase, valide:

1. **Veja as policies criadas:**
```sql
SELECT policyname, qual, with_check, cmd
FROM pg_policies
WHERE tablename = 'plano_alimentar_pdf';
```

Você deve ver pelo menos 3 policies para `plano_alimentar_pdf`.

2. **Teste (CUIDADO - use IDs reais):**
```sql
-- Simulando um aluno tentando ver seu próprio PDF
SELECT * FROM plano_alimentar_pdf
WHERE aluno_id = 'SEU_USER_ID_AQUI'
-- Deve retornar seus PDFs

-- Aluno tentando ver PDF de outro (vai falhar com RLS)
-- Em produção, isso vai returnar linha vazia automaticamente
```

---

## Histórico de Erros do Usuário

| Tentativa | Erro | Solução |
|-----------|------|---------|
| 1ª | "policy already exists" | Dropar todas as versões |
| ... (adicionar se houver mais) | ... | ... |

