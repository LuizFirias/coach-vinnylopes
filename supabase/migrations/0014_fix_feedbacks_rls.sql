-- ============================================================
-- Fix RLS: feedbacks_treinos
-- ============================================================
-- Adiciona políticas RLS para permitir alunos e coaches
-- acessarem feedbacks de treinos adequadamente.
-- ============================================================

-- Garantir que RLS está habilitada
ALTER TABLE feedbacks_treinos ENABLE ROW LEVEL SECURITY;

-- Política: Alunos podem ver seus próprios feedbacks
DROP POLICY IF EXISTS "Alunos veem seus feedbacks" ON feedbacks_treinos;
CREATE POLICY "Alunos veem seus feedbacks"
  ON feedbacks_treinos
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() = aluno_id
  );

-- Política: Alunos podem inserir seus próprios feedbacks
DROP POLICY IF EXISTS "Alunos criam seus feedbacks" ON feedbacks_treinos;
CREATE POLICY "Alunos criam seus feedbacks"
  ON feedbacks_treinos
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = aluno_id
  );

-- Política: Coaches veem feedbacks dos seus alunos
DROP POLICY IF EXISTS "Coaches veem feedbacks dos alunos" ON feedbacks_treinos;
CREATE POLICY "Coaches veem feedbacks dos alunos"
  ON feedbacks_treinos
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM coach_alunos ca
      WHERE ca.coach_id = auth.uid()
        AND ca.aluno_id = feedbacks_treinos.aluno_id
    )
  );

-- Política: Coaches podem responder feedbacks
DROP POLICY IF EXISTS "Coaches respondem feedbacks" ON feedbacks_treinos;
CREATE POLICY "Coaches respondem feedbacks"
  ON feedbacks_treinos
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM coach_alunos ca
      WHERE ca.coach_id = auth.uid()
        AND ca.aluno_id = feedbacks_treinos.aluno_id
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM coach_alunos ca
      WHERE ca.coach_id = auth.uid()
        AND ca.aluno_id = feedbacks_treinos.aluno_id
    )
  );

-- Política: Super admins têm acesso total
DROP POLICY IF EXISTS "Super admins veem todos feedbacks" ON feedbacks_treinos;
CREATE POLICY "Super admins veem todos feedbacks"
  ON feedbacks_treinos
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'super_admin'
    )
  );
