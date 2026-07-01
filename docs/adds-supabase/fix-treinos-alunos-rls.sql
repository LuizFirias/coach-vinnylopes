-- =====================================================
-- SECURITY FIX: Garantir isolamento de PDFs de treinos
-- =====================================================
-- Este script fixa isolamento de treinos_alunos similar a plano_alimentar_pdf

-- ===== 1. LIMPAR POLÍTICAS ANTIGAS =====

DROP POLICY IF EXISTS "treino_aluno_sees_own_pdfs" ON treinos_alunos;
DROP POLICY IF EXISTS "treino_aluno_no_modify" ON treinos_alunos;
DROP POLICY IF EXISTS "treino_aluno_no_delete" ON treinos_alunos;
DROP POLICY IF EXISTS "treino_coach_insert" ON treinos_alunos;
DROP POLICY IF EXISTS "treino_coach_sees_own_uploads" ON treinos_alunos;
DROP POLICY IF EXISTS "treino_coach_delete_own" ON treinos_alunos;
DROP POLICY IF EXISTS "treino_super_admin_all_access" ON treinos_alunos;

-- Garantir RLS está ativada
ALTER TABLE treinos_alunos ENABLE ROW LEVEL SECURITY;

-- ===== 2. NOVAS POLÍTICAS MAIS RESTRITIVAS =====

-- Policy 1: Alunos veem APENAS seus próprios PDFs de treino
CREATE POLICY "treino_aluno_sees_own_pdfs" ON treinos_alunos
  FOR SELECT
  USING (aluno_id = auth.uid());

-- Policy 2: Alunos não podem deletar/editar PDFs de treino (apenas coaches)
CREATE POLICY "treino_aluno_no_modify" ON treinos_alunos
  FOR UPDATE
  USING (false);

CREATE POLICY "treino_aluno_no_delete" ON treinos_alunos
  FOR DELETE
  USING (false);

-- Policy 3: Coaches criam PDFs para seus alunos
CREATE POLICY "treino_coach_insert" ON treinos_alunos
  FOR INSERT
  WITH CHECK (
    coach_id = auth.uid() AND
    -- Verificar se o aluno está vinculado ao coach
    EXISTS (
      SELECT 1 FROM coach_alunos
      WHERE coach_alunos.coach_id = auth.uid()
      AND coach_alunos.aluno_id = treinos_alunos.aluno_id
    )
  );

-- Policy 4: Coaches veem PDFs que criaram
CREATE POLICY "treino_coach_sees_own_uploads" ON treinos_alunos
  FOR SELECT
  USING (coach_id = auth.uid());

-- Policy 5: Coaches deletam seus próprios PDFs
CREATE POLICY "treino_coach_delete_own" ON treinos_alunos
  FOR DELETE
  USING (coach_id = auth.uid());

-- ===== 3. SUPER ADMIN (caso necessário) =====
-- Super admin pode ver tudo
CREATE POLICY "treino_super_admin_all_access" ON treinos_alunos
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'super_admin'
    )
  );

-- ===== 4. CRIAR ÍNDICE PARA PERFORMANCE =====

CREATE INDEX IF NOT EXISTS idx_treinos_alunos_aluno_coach ON treinos_alunos(aluno_id, coach_id);
