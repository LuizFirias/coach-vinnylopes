-- =====================================================
-- FIX: Corrigir RLS para permitir aluno inserir treino
-- =====================================================
-- PROBLEMA 1: aluno tenta inserir com coach_id mas a política
-- antiga só permitia se aluno_id = auth.uid(), sem permitir definir coach_id
-- PROBLEMA 2: trigger tenta atualizar pontuacao_alunos mas não há política para INSERT/UPDATE

-- =====================================================
-- 1. Corrigir política de INSERT na tabela treinos_manuais
-- =====================================================

-- Remover política antiga restritiva
DROP POLICY IF EXISTS "Alunos criam treinos para si mesmos" ON treinos_manuais;

-- Criar nova política que permite aluno inserir treino para si mesmo
-- (independente do coach_id que ele passar)
CREATE POLICY "Alunos criam treinos para si mesmos" ON treinos_manuais
  FOR INSERT
  WITH CHECK (
    aluno_id = auth.uid()
    -- Não validamos coach_id porque o aluno deve poder registrar
    -- seu treino mesmo que tenha ou não um coach atribuído
  );

-- =====================================================
-- 2. Adicionar políticas para pontuacao_alunos (usadas pelo trigger)
-- =====================================================

-- Permitir que triggers atualizem a pontuação
-- (o trigger roda no contexto do usuário que inseriu o treino)
DROP POLICY IF EXISTS "Sistema atualiza pontuação" ON pontuacao_alunos;
CREATE POLICY "Sistema atualiza pontuação" ON pontuacao_alunos
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- OU se preferir uma abordagem mais restritiva, use estas políticas separadas:
-- (comentadas por padrão, descomente se quiser usar ao invés da política acima)

/*
-- Alunos podem inserir/atualizar apenas sua própria pontuação
DROP POLICY IF EXISTS "Alunos inserem sua pontuação" ON pontuacao_alunos;
CREATE POLICY "Alunos inserem sua pontuação" ON pontuacao_alunos
  FOR INSERT
  WITH CHECK (aluno_id = auth.uid());

DROP POLICY IF EXISTS "Alunos atualizam sua pontuação" ON pontuacao_alunos;
CREATE POLICY "Alunos atualizam sua pontuação" ON pontuacao_alunos
  FOR UPDATE
  USING (aluno_id = auth.uid())
  WITH CHECK (aluno_id = auth.uid());
*/
