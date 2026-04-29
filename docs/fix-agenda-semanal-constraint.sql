-- ==============================================
-- FIX: Constraint única para agenda_semanal
-- ==============================================
-- Problema: "there is no unique or exclusion constraint matching the ON CONFLICT specification"
-- Erro ao tentar fazer upsert na tabela agenda_semanal
-- ==============================================

-- 1. VERIFICAR SE A CONSTRAINT EXISTE
-- ==============================================
SELECT 
  conname as constraint_name,
  contype as constraint_type,
  pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint
WHERE conrelid = 'agenda_semanal'::regclass
ORDER BY conname;

-- Resultado esperado: deve ter uma constraint UNIQUE(aluno_id, dia_semana)


-- 2. VERIFICAR ÍNDICES
-- ==============================================
SELECT
  indexname,
  indexdef
FROM pg_indexes
WHERE tablename = 'agenda_semanal';


-- 3. CRIAR A CONSTRAINT ÚNICA (SE NÃO EXISTIR)
-- ==============================================
-- Esta constraint é necessária para o upsert funcionar
DO $$ 
BEGIN
  -- Tentar adicionar a constraint única
  -- Se já existir, o erro será capturado e ignorado
  BEGIN
    ALTER TABLE agenda_semanal 
    ADD CONSTRAINT agenda_semanal_aluno_dia_unique 
    UNIQUE (aluno_id, dia_semana);
    
    RAISE NOTICE 'Constraint criada com sucesso';
  EXCEPTION 
    WHEN duplicate_table THEN 
      RAISE NOTICE 'Constraint já existe';
    WHEN others THEN
      RAISE NOTICE 'Erro: %', SQLERRM;
  END;
END $$;


-- 4. VERIFICAR SE A CONSTRAINT FOI CRIADA
-- ==============================================
SELECT 
  conname as constraint_name,
  pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint
WHERE conrelid = 'agenda_semanal'::regclass
AND conname LIKE '%unique%';


-- 5. ALTERNATIVA: Se houver dados duplicados, limpar antes
-- ==============================================
-- ⚠️ CUIDADO: Execute apenas se a constraint não puder ser criada por dados duplicados

-- Ver se há duplicados
SELECT 
  aluno_id, 
  dia_semana, 
  COUNT(*) as total
FROM agenda_semanal
GROUP BY aluno_id, dia_semana
HAVING COUNT(*) > 1;

-- Se houver duplicados, deletar os mais antigos (mantém apenas o mais recente)
-- Descomente apenas se necessário:
/*
DELETE FROM agenda_semanal a
WHERE id NOT IN (
  SELECT DISTINCT ON (aluno_id, dia_semana) id
  FROM agenda_semanal
  ORDER BY aluno_id, dia_semana, created_at DESC NULLS LAST, id DESC
);
*/


-- 6. APÓS LIMPAR DUPLICADOS, CRIAR A CONSTRAINT
-- ==============================================
-- Descomente apenas se precisou limpar duplicados:
/*
ALTER TABLE agenda_semanal 
ADD CONSTRAINT agenda_semanal_aluno_dia_unique 
UNIQUE (aluno_id, dia_semana);
*/


-- 7. VERIFICAÇÃO FINAL
-- ==============================================
-- Deve retornar a constraint única
SELECT 
  tc.constraint_name,
  tc.constraint_type,
  kcu.column_name
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu 
  ON tc.constraint_name = kcu.constraint_name
WHERE tc.table_name = 'agenda_semanal'
  AND tc.constraint_type = 'UNIQUE'
ORDER BY kcu.ordinal_position;
