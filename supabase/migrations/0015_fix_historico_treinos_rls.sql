-- ============================================================
-- Fix RLS: historico_treinos
-- ============================================================
-- Adiciona policies de INSERT/SELECT/DELETE para que alunos
-- consigam salvar e ler seus próprios treinos concluídos.
-- Coaches e admins leem treinos dos seus alunos.
-- ============================================================

ALTER TABLE historico_treinos ENABLE ROW LEVEL SECURITY;

-- Alunos inserem seus próprios registros
DROP POLICY IF EXISTS "Alunos inserem historico" ON historico_treinos;
CREATE POLICY "Alunos inserem historico"
  ON historico_treinos
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = aluno_id);

-- Alunos leem seus próprios registros
DROP POLICY IF EXISTS "Alunos leem historico" ON historico_treinos;
CREATE POLICY "Alunos leem historico"
  ON historico_treinos
  FOR SELECT
  TO authenticated
  USING (auth.uid() = aluno_id);

-- Coaches leem histórico dos seus alunos
DROP POLICY IF EXISTS "Coaches leem historico dos alunos" ON historico_treinos;
CREATE POLICY "Coaches leem historico dos alunos"
  ON historico_treinos
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM coach_alunos ca
      WHERE ca.coach_id = auth.uid()
        AND ca.aluno_id = historico_treinos.aluno_id
    )
  );

-- Admins leem tudo
DROP POLICY IF EXISTS "Admins leem historico" ON historico_treinos;
CREATE POLICY "Admins leem historico"
  ON historico_treinos
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
        AND role IN ('coach', 'super_admin')
    )
  );
