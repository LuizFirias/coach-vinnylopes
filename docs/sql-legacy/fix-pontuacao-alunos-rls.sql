-- =====================================================
-- FIX: RLS para pontuacao_alunos (Check-in de Alunos)
-- =====================================================
-- Problema: Alunos não conseguem marcar treino como concluído
-- Causa: Trigger consolidar_pontos_aluno não tem SECURITY DEFINER
-- Solução: Adicionar SECURITY DEFINER + Políticas RLS

-- 1. Recriar função com SECURITY DEFINER
-- =====================================================
CREATE OR REPLACE FUNCTION consolidar_pontos_aluno()
RETURNS TRIGGER
SECURITY DEFINER  -- Executa com permissões do owner, ignorando RLS
SET search_path = public
AS $$
BEGIN
  -- Upsert na tabela pontuacao_alunos
  INSERT INTO pontuacao_alunos (aluno_id, total_pontos, atualizado_em)
  SELECT 
    NEW.aluno_id,
    COALESCE(SUM(pontos_earn), 0),
    NOW()
  FROM treinos_manuais
  WHERE aluno_id = NEW.aluno_id AND concluido = true
  ON CONFLICT (aluno_id) DO UPDATE SET
    total_pontos = EXCLUDED.total_pontos,
    atualizado_em = NOW();

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 2. Adicionar políticas INSERT/UPDATE (backup de segurança)
-- =====================================================
-- Estas políticas não serão usadas pelo trigger (devido ao SECURITY DEFINER)
-- mas servem como proteção caso precise usar service_role ou outro acesso

-- Permitir INSERT automático via trigger
DROP POLICY IF EXISTS "Sistema atualiza pontuação" ON pontuacao_alunos;
CREATE POLICY "Sistema atualiza pontuação" ON pontuacao_alunos
  FOR INSERT
  WITH CHECK (true);

-- Permitir UPDATE automático via trigger
DROP POLICY IF EXISTS "Sistema atualiza pontuação update" ON pontuacao_alunos;
CREATE POLICY "Sistema atualiza pontuação update" ON pontuacao_alunos
  FOR UPDATE
  USING (true);

-- 3. Verificação
-- =====================================================
SELECT 
  'Função consolidar_pontos_aluno' AS objeto,
  prosecdef AS security_definer
FROM pg_proc
WHERE proname = 'consolidar_pontos_aluno';

SELECT 
  schemaname,
  tablename,
  policyname,
  cmd,
  qual
FROM pg_policies
WHERE tablename = 'pontuacao_alunos'
ORDER BY cmd, policyname;
