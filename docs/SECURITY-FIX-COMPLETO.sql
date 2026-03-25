-- =====================================================
-- SECURITY FIX COMPLETO — Isolamento entre alunos
-- =====================================================
-- EXECUTE ESTE SCRIPT COMPLETO no Supabase SQL Editor
-- Corrige: alunos vendo PDFs e fichas de outros alunos
--          coaches vendo dados de todos os alunos via /aluno/*
-- =====================================================

-- ===== PASSO 1: Adicionar coach_id em treinos_alunos (se não existir) =====
ALTER TABLE treinos_alunos
  ADD COLUMN IF NOT EXISTS coach_id UUID REFERENCES profiles(id) ON DELETE SET NULL;

-- Preencher coach_id para registros antigos usando a tabela coach_alunos
UPDATE treinos_alunos t
SET coach_id = (
  SELECT ca.coach_id FROM coach_alunos ca
  WHERE ca.aluno_id = t.aluno_id
  LIMIT 1
)
WHERE t.coach_id IS NULL;

CREATE INDEX IF NOT EXISTS idx_treinos_alunos_coach_id ON treinos_alunos(coach_id);

-- ===== PASSO 2: RLS — treinos_alunos =====
-- Limpar todas as policies existentes
DROP POLICY IF EXISTS "Alunos veem seus PDFs" ON treinos_alunos;
DROP POLICY IF EXISTS "Coaches gerenciam PDFs" ON treinos_alunos;
DROP POLICY IF EXISTS "treino_aluno_sees_own_pdfs" ON treinos_alunos;
DROP POLICY IF EXISTS "treino_aluno_no_modify" ON treinos_alunos;
DROP POLICY IF EXISTS "treino_aluno_no_delete" ON treinos_alunos;
DROP POLICY IF EXISTS "treino_coach_insert" ON treinos_alunos;
DROP POLICY IF EXISTS "treino_coach_sees_own_uploads" ON treinos_alunos;
DROP POLICY IF EXISTS "treino_coach_delete_own" ON treinos_alunos;
DROP POLICY IF EXISTS "treino_super_admin_all_access" ON treinos_alunos;

ALTER TABLE treinos_alunos ENABLE ROW LEVEL SECURITY;

-- Alunos veem APENAS seus próprios PDFs
CREATE POLICY "treino_aluno_sees_own_pdfs" ON treinos_alunos
  FOR SELECT
  USING (aluno_id = auth.uid());

-- Alunos não modificam
CREATE POLICY "treino_aluno_no_modify" ON treinos_alunos
  FOR UPDATE USING (false);

CREATE POLICY "treino_aluno_no_delete" ON treinos_alunos
  FOR DELETE USING (false);

-- Coaches inserem APENAS para alunos vinculados
CREATE POLICY "treino_coach_insert" ON treinos_alunos
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('coach', 'super_admin')
    )
    AND EXISTS (
      SELECT 1 FROM coach_alunos
      WHERE coach_alunos.coach_id = auth.uid()
      AND coach_alunos.aluno_id = treinos_alunos.aluno_id
    )
  );

-- Coaches veem APENAS PDFs dos seus próprios alunos
CREATE POLICY "treino_coach_sees_own_uploads" ON treinos_alunos
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM coach_alunos
      WHERE coach_alunos.coach_id = auth.uid()
      AND coach_alunos.aluno_id = treinos_alunos.aluno_id
    )
  );

-- Coaches deletam APENAS PDFs dos seus alunos
CREATE POLICY "treino_coach_delete_own" ON treinos_alunos
  FOR DELETE
  USING (
    coach_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM coach_alunos
      WHERE coach_alunos.coach_id = auth.uid()
      AND coach_alunos.aluno_id = treinos_alunos.aluno_id
    )
  );

-- Super admin acesso total
CREATE POLICY "treino_super_admin_all_access" ON treinos_alunos
  FOR ALL
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'super_admin')
  );

-- ===== PASSO 3: RLS — agenda_semanal =====
DROP POLICY IF EXISTS "Alunos veem sua agenda" ON agenda_semanal;
DROP POLICY IF EXISTS "Alunos gerenciam sua agenda" ON agenda_semanal;
DROP POLICY IF EXISTS "Coaches veem agenda dos alunos" ON agenda_semanal;
DROP POLICY IF EXISTS "agenda_aluno_all" ON agenda_semanal;
DROP POLICY IF EXISTS "agenda_coach_sees_own" ON agenda_semanal;
DROP POLICY IF EXISTS "agenda_super_admin" ON agenda_semanal;

ALTER TABLE agenda_semanal ENABLE ROW LEVEL SECURITY;

-- Alunos gerenciam APENAS sua própria agenda
CREATE POLICY "agenda_aluno_all" ON agenda_semanal
  FOR ALL
  USING (aluno_id = auth.uid())
  WITH CHECK (aluno_id = auth.uid());

-- Coaches veem agenda APENAS dos seus alunos
CREATE POLICY "agenda_coach_sees_own" ON agenda_semanal
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM coach_alunos
      WHERE coach_alunos.coach_id = auth.uid()
      AND coach_alunos.aluno_id = agenda_semanal.aluno_id
    )
  );

-- Super admin
CREATE POLICY "agenda_super_admin" ON agenda_semanal
  FOR ALL
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'super_admin')
  );

-- ===== PASSO 4: RLS — fichas_treino =====
DROP POLICY IF EXISTS "Alunos veem suas fichas" ON fichas_treino;
DROP POLICY IF EXISTS "Coaches gerenciam fichas" ON fichas_treino;
DROP POLICY IF EXISTS "ficha_aluno_select" ON fichas_treino;
DROP POLICY IF EXISTS "ficha_coach_all" ON fichas_treino;
DROP POLICY IF EXISTS "ficha_super_admin" ON fichas_treino;

ALTER TABLE fichas_treino ENABLE ROW LEVEL SECURITY;

-- Alunos veem APENAS suas fichas
CREATE POLICY "ficha_aluno_select" ON fichas_treino
  FOR SELECT
  USING (aluno_id = auth.uid());

-- Coaches gerenciam fichas APENAS dos seus alunos
CREATE POLICY "ficha_coach_all" ON fichas_treino
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM coach_alunos
      WHERE coach_alunos.coach_id = auth.uid()
      AND coach_alunos.aluno_id = fichas_treino.aluno_id
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM coach_alunos
      WHERE coach_alunos.coach_id = auth.uid()
      AND coach_alunos.aluno_id = fichas_treino.aluno_id
    )
  );

-- Super admin
CREATE POLICY "ficha_super_admin" ON fichas_treino
  FOR ALL
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'super_admin')
  );

-- ===== PASSO 5: RLS — plano_alimentar_pdf (reforço) =====
DROP POLICY IF EXISTS "Alunos veem seus próprios planos" ON plano_alimentar_pdf;
DROP POLICY IF EXISTS "Coaches fazem upload para seus alunos" ON plano_alimentar_pdf;
DROP POLICY IF EXISTS "Coaches veem planos de seus alunos" ON plano_alimentar_pdf;
DROP POLICY IF EXISTS "Super admin vê tudo" ON plano_alimentar_pdf;
DROP POLICY IF EXISTS "aluno_sees_own_plans" ON plano_alimentar_pdf;
DROP POLICY IF EXISTS "aluno_no_modify" ON plano_alimentar_pdf;
DROP POLICY IF EXISTS "aluno_no_delete" ON plano_alimentar_pdf;
DROP POLICY IF EXISTS "coach_insert_plan" ON plano_alimentar_pdf;
DROP POLICY IF EXISTS "coach_sees_own_uploads" ON plano_alimentar_pdf;
DROP POLICY IF EXISTS "coach_delete_own" ON plano_alimentar_pdf;
DROP POLICY IF EXISTS "super_admin_all_access" ON plano_alimentar_pdf;

ALTER TABLE plano_alimentar_pdf ENABLE ROW LEVEL SECURITY;

-- Alunos veem APENAS seus planos
CREATE POLICY "aluno_sees_own_plans" ON plano_alimentar_pdf
  FOR SELECT USING (aluno_id = auth.uid());

CREATE POLICY "aluno_no_modify" ON plano_alimentar_pdf
  FOR UPDATE USING (false);

CREATE POLICY "aluno_no_delete" ON plano_alimentar_pdf
  FOR DELETE USING (false);

-- Coaches inserem APENAS para seus alunos vinculados
CREATE POLICY "coach_insert_plan" ON plano_alimentar_pdf
  FOR INSERT
  WITH CHECK (
    coach_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM coach_alunos
      WHERE coach_alunos.coach_id = auth.uid()
      AND coach_alunos.aluno_id = plano_alimentar_pdf.aluno_id
    )
  );

-- Coaches veem APENAS planos dos seus alunos
CREATE POLICY "coach_sees_own_uploads" ON plano_alimentar_pdf
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM coach_alunos
      WHERE coach_alunos.coach_id = auth.uid()
      AND coach_alunos.aluno_id = plano_alimentar_pdf.aluno_id
    )
  );

-- Coaches deletam APENAS seus uploads
CREATE POLICY "coach_delete_own" ON plano_alimentar_pdf
  FOR DELETE USING (coach_id = auth.uid());

-- Super admin
CREATE POLICY "super_admin_all_access" ON plano_alimentar_pdf
  FOR ALL
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'super_admin')
  );

-- ===== VERIFICAÇÃO =====
SELECT tablename, policyname, cmd
FROM pg_policies
WHERE tablename IN ('treinos_alunos', 'agenda_semanal', 'fichas_treino', 'plano_alimentar_pdf')
ORDER BY tablename, cmd;
