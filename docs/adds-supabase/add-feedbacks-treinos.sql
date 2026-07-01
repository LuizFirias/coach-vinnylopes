-- =====================================================
-- CRIAR TABELA DE FEEDBACKS DE TREINOS
-- =====================================================
-- Data: 2026-03-23
-- Descrição: Tabela para armazenar feedbacks dos alunos sobre treinos
--            Feedbacks visíveis SOMENTE para o coach
-- =====================================================

-- 1. CRIAR TABELA feedbacks_treinos
-- =====================================================

CREATE TABLE IF NOT EXISTS feedbacks_treinos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  aluno_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  coach_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  ficha_id UUID REFERENCES fichas_treino(id) ON DELETE SET NULL,
  feedback TEXT NOT NULL,
  tipo VARCHAR(50) CHECK (tipo IN ('treino_completo', 'treino_dia')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. CRIAR ÍNDICES PARA PERFORMANCE
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_feedbacks_aluno ON feedbacks_treinos(aluno_id);
CREATE INDEX IF NOT EXISTS idx_feedbacks_coach ON feedbacks_treinos(coach_id);
CREATE INDEX IF NOT EXISTS idx_feedbacks_ficha ON feedbacks_treinos(ficha_id);
CREATE INDEX IF NOT EXISTS idx_feedbacks_created ON feedbacks_treinos(created_at DESC);

-- 3. HABILITAR RLS (Row Level Security)
-- =====================================================

ALTER TABLE feedbacks_treinos ENABLE ROW LEVEL SECURITY;

-- 4. POLÍTICAS RLS
-- =====================================================

-- Alunos podem inserir seus próprios feedbacks
CREATE POLICY "Alunos podem criar feedbacks"
  ON feedbacks_treinos
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = aluno_id);

-- Alunos podem ver seus próprios feedbacks
CREATE POLICY "Alunos podem ver próprios feedbacks"
  ON feedbacks_treinos
  FOR SELECT
  TO authenticated
  USING (auth.uid() = aluno_id);

-- Coaches podem ver feedbacks de seus alunos
CREATE POLICY "Coaches podem ver feedbacks de alunos"
  ON feedbacks_treinos
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() = coach_id OR
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'coach'
    )
  );

-- Alunos podem atualizar seus próprios feedbacks
CREATE POLICY "Alunos podem atualizar feedbacks"
  ON feedbacks_treinos
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = aluno_id)
  WITH CHECK (auth.uid() = aluno_id);

-- 5. TRIGGER PARA ATUALIZAR updated_at
-- =====================================================

CREATE OR REPLACE FUNCTION update_feedbacks_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_feedbacks_timestamp
  BEFORE UPDATE ON feedbacks_treinos
  FOR EACH ROW
  EXECUTE FUNCTION update_feedbacks_updated_at();

-- =====================================================
-- MIGRATION CONCLUÍDA
-- =====================================================
-- Tabela criada com:
-- - feedbacks_treinos com RLS habilitado
-- - Alunos podem criar/editar seus próprios feedbacks
-- - Coaches podem visualizar feedbacks de seus alunos
-- - Tipos: 'treino_completo' (fim da ficha) ou 'treino_dia' (dashboard)
-- =====================================================
