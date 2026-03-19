-- =====================================================
-- FEATURE: Plano Alimentar PDF Upload
-- =====================================================
-- Allows coaches to upload nutrition plans for students

-- =====================================================
-- 1. CRIAR TABELA plano_alimentar_pdf
-- =====================================================

CREATE TABLE IF NOT EXISTS plano_alimentar_pdf (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  aluno_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  coach_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  nome_arquivo TEXT NOT NULL,
  url_pdf TEXT NOT NULL,
  descricao TEXT,
  criado_em TIMESTAMP DEFAULT NOW(),
  atualizado_em TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_plano_alimentar_aluno_id ON plano_alimentar_pdf(aluno_id);
CREATE INDEX IF NOT EXISTS idx_plano_alimentar_coach_id ON plano_alimentar_pdf(coach_id);

-- =====================================================
-- 2. RLS POLICIES para plano_alimentar_pdf
-- =====================================================

ALTER TABLE plano_alimentar_pdf ENABLE ROW LEVEL SECURITY;

-- Alunos veem apenas seus próprios planos
DROP POLICY IF EXISTS "Alunos veem seus próprios planos" ON plano_alimentar_pdf;
CREATE POLICY "Alunos veem seus próprios planos" ON plano_alimentar_pdf
  FOR SELECT
  USING (aluno_id = auth.uid());

-- Coaches podem fazer upload para seus alunos
DROP POLICY IF EXISTS "Coaches fazem upload para seus alunos" ON plano_alimentar_pdf;
CREATE POLICY "Coaches fazem upload para seus alunos" ON plano_alimentar_pdf
  FOR INSERT
  WITH CHECK (
    coach_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM coach_alunos
      WHERE coach_alunos.coach_id = auth.uid()
      AND coach_alunos.aluno_id = plano_alimentar_pdf.aluno_id
    )
  );

-- Coaches veem planos de seus alunos (para gerenciar/atualizar)
DROP POLICY IF EXISTS "Coaches veem planos de seus alunos" ON plano_alimentar_pdf;
CREATE POLICY "Coaches veem planos de seus alunos" ON plano_alimentar_pdf
  FOR SELECT
  USING (
    coach_id = auth.uid() OR
    aluno_id = auth.uid()
  );

-- =====================================================
-- 3. CONFIGURAR STORAGE para plano-alimentar
-- =====================================================
-- Execute via Supabase Dashboard se necessário:
-- - Criar bucket "plano-alimentar" (público)
-- - Ou use cliente admin para criar via API

-- =====================================================
-- 4. VERIFICAÇÃO
-- =====================================================

SELECT 'plano_alimentar_pdf' as tabela, COUNT(*) as registros
FROM plano_alimentar_pdf;
