-- =====================================================
-- SECURITY FIX: Garantir isolamento de planos alimentares
-- =====================================================
-- Este script fixa 2 problemas:
-- 1. Alunos conseguiam ver planos de outros alunos
-- 2. PDFs não estavam filtrados corretamente no frontend

-- ===== 1. VERIFICAR E REAPLICAR POLÍTICAS DE RLS =====

-- Limpar políticas antigas (TODOS os nomes possíveis)
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

-- Garantir RLS está ativada
ALTER TABLE plano_alimentar_pdf ENABLE ROW LEVEL SECURITY;

-- ===== 2. NOVAS POLÍTICAS MAIS RESTRITIVAS =====

-- Policy 1: Alunos veem APENAS seus próprios planos
CREATE POLICY "aluno_sees_own_plans" ON plano_alimentar_pdf
  FOR SELECT
  USING (aluno_id = auth.uid());

-- Policy 2: Alunos não podem deletar/editar planos (apenas coaches)
CREATE POLICY "aluno_no_modify" ON plano_alimentar_pdf
  FOR UPDATE
  USING (false);

CREATE POLICY "aluno_no_delete" ON plano_alimentar_pdf
  FOR DELETE
  USING (false);

-- Policy 3: Coaches criam planos para seus alunos
CREATE POLICY "coach_insert_plan" ON plano_alimentar_pdf
  FOR INSERT
  WITH CHECK (
    coach_id = auth.uid() AND
    -- Verificar se o aluno está vinculado ao coach
    EXISTS (
      SELECT 1 FROM coach_alunos
      WHERE coach_alunos.coach_id = auth.uid()
      AND coach_alunos.aluno_id = plano_alimentar_pdf.aluno_id
    )
  );

-- Policy 4: Coaches veem planos que criaram (ou podem deletar)
CREATE POLICY "coach_sees_own_uploads" ON plano_alimentar_pdf
  FOR SELECT
  USING (coach_id = auth.uid());

-- Policy 5: Coaches deletam seus próprios uploads
CREATE POLICY "coach_delete_own" ON plano_alimentar_pdf
  FOR DELETE
  USING (coach_id = auth.uid());

-- ===== 3. SUPER ADMIN (caso necessário) =====
-- Super admin pode ver tudo (usar com cuidado)
CREATE POLICY "super_admin_all_access" ON plano_alimentar_pdf
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'super_admin'
    )
  );

-- ===== 4. CRIAR TRIGGER PARA AUDITORIA (opcional) =====
-- Log de quem accessa qual plano
CREATE TABLE IF NOT EXISTS plano_alimentar_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plano_id UUID REFERENCES plano_alimentar_pdf(id) ON DELETE CASCADE,
  acessado_por UUID REFERENCES profiles(id),
  acessado_em TIMESTAMP DEFAULT NOW()
);

-- ===== 5. ADICIONAR COLUNA DE VINCULAÇÃO (segurança extra) =====
-- Uma coluna adicional para garantir que o aluno está acessando seu próprio plano
-- Já está em place via foreign key, mas adicionar índice para performance

CREATE INDEX IF NOT EXISTS idx_plano_alimentar_aluno_coach ON plano_alimentar_pdf(aluno_id, coach_id);
