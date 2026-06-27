-- =====================================================
-- FIX: Prevenir múltiplos check-ins no mesmo dia
-- =====================================================
-- Garante que um aluno só pode marcar "treinou hoje" uma vez por dia

-- 1. Remover possíveis duplicatas existentes
-- (mantém apenas o primeiro registro de cada dia)
DELETE FROM treinos_manuais a
USING treinos_manuais b
WHERE a.id > b.id
  AND a.aluno_id = b.aluno_id
  AND a.data_treino = b.data_treino;

-- 2. Adicionar constraint UNIQUE para prevenir futuras duplicações
ALTER TABLE treinos_manuais
DROP CONSTRAINT IF EXISTS unique_aluno_data_treino;

ALTER TABLE treinos_manuais
ADD CONSTRAINT unique_aluno_data_treino 
UNIQUE (aluno_id, data_treino);

-- 3. Criar índice para melhorar performance das queries de verificação
CREATE INDEX IF NOT EXISTS idx_treinos_manuais_aluno_data 
ON treinos_manuais(aluno_id, data_treino);

-- =====================================================
-- VERIFICAÇÃO: Conferir se há duplicatas após a limpeza
-- =====================================================
-- Execute para verificar (deve retornar 0 linhas):
-- SELECT aluno_id, data_treino, COUNT(*) as total
-- FROM treinos_manuais
-- GROUP BY aluno_id, data_treino
-- HAVING COUNT(*) > 1;
