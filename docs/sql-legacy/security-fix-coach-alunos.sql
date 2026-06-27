-- =====================================================
-- SEGURANÇA: Isolamento de Dados - Coaches vs Alunos
-- =====================================================
-- Este script corrige dois problemas de privacidade:
-- 1. Coaches podiam ver alunos de OUTROS coaches
-- 2. Alunos podiam ver fichas de treino de OUTROS alunos
-- =====================================================

-- =====================================================
-- 1. CRIAR TABELA DE RELACIONAMENTO (coach_alunos)
-- =====================================================

CREATE TABLE IF NOT EXISTS coach_alunos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  aluno_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  criado_em TIMESTAMP DEFAULT NOW(),
  
  -- Garantir unicidade e índices para performance
  UNIQUE(coach_id, aluno_id)
);

CREATE INDEX IF NOT EXISTS idx_coach_alunos_coach_id ON coach_alunos(coach_id);
CREATE INDEX IF NOT EXISTS idx_coach_alunos_aluno_id ON coach_alunos(aluno_id);

-- =====================================================
-- 2. MIGRAÇÃO DE DADOS: Popular tabela coach_alunos
-- =====================================================
-- Se a coluna coach_id já existe em fichas_treino, usaremos ela
-- Caso contrário, você precisará adicionar manualmente

-- Inserir relacionamentos únicos baseado nas fichas_treino existentes
INSERT INTO coach_alunos (coach_id, aluno_id)
SELECT DISTINCT coach_id, aluno_id
FROM fichas_treino
WHERE coach_id IS NOT NULL AND aluno_id IS NOT NULL
ON CONFLICT (coach_id, aluno_id) DO NOTHING;

-- =====================================================
-- 3. ADICIONAR COLUNA DE ISOLAMENTO (se necessário)
-- =====================================================
-- Se você quer rastrear quando o aluno foi atribuído ao coach

ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS coach_id UUID REFERENCES profiles(id) ON DELETE SET NULL;

-- Atualizar coach_id dos alunos com base na tabela coach_alunos
UPDATE profiles p
SET coach_id = ca.coach_id
FROM coach_alunos ca
WHERE p.id = ca.aluno_id
AND p.role = 'aluno'
AND p.coach_id IS NULL;

-- =====================================================
-- 4. ADICIONAR RLS - FICHAS DE TREINO (ALUNOS)
-- =====================================================
-- Alunos só veem suas próprias fichas

DROP POLICY IF EXISTS "Alunos veem suas próprias fichas (isolado)" ON fichas_treino;
CREATE POLICY "Alunos veem suas próprias fichas (isolado)" ON fichas_treino
  FOR SELECT
  USING (
    aluno_id = auth.uid() OR 
    coach_id = auth.uid()
  );

-- =====================================================
-- 5. ADICIONAR RLS - COACH_ALUNOS 
-- =====================================================
-- Coaches só veem seus próprios alunos

DROP POLICY IF EXISTS "Coaches veem seus alunos" ON coach_alunos;
CREATE POLICY "Coaches veem seus alunos" ON coach_alunos
  FOR SELECT
  USING (
    coach_id = auth.uid() OR 
    aluno_id = auth.uid()
  );

DROP POLICY IF EXISTS "Coaches gerenciam suas relações" ON coach_alunos;
CREATE POLICY "Coaches gerenciam suas relações" ON coach_alunos
  FOR INSERT WITH CHECK (
    coach_id = auth.uid() AND 
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND role = 'coach'
    )
  );

-- =====================================================
-- 6.ADICIONAR RLS - PERFIS (ALUNOS ISOLADOS)
-- =====================================================
-- Coaches só veem alunos relacionados (via coach_alunos)
-- Super admins veem todos
-- Alunos veem apenas a si mesmos

DROP POLICY IF EXISTS "Alunos veem apenas a si mesmos" ON profiles;
CREATE POLICY "Alunos veem apenas a si mesmos" ON profiles
  FOR SELECT
  USING (
    auth.uid() = id OR
    role = 'coach' OR
    role = 'super_admin'
  );

-- =====================================================
-- 7. VERIFICAÇÃO DE INTEGRIDADE
-- =====================================================

-- Tabela de coach_alunos foi criada com sucesso
SELECT 'coach_alunos' as tabela, COUNT(*) as registros
FROM coach_alunos
UNION ALL
-- Contar alunos sem coach atribuído
SELECT 'alunos_sem_coach', COUNT(*)
FROM profiles
WHERE role = 'aluno' AND coach_id IS NULL
UNION ALL
-- Contar coaches ativos
SELECT 'coaches_ativos', COUNT(*)
FROM profiles
WHERE role = 'coach' AND arquivado = false;

-- =====================================================
-- MANUAL: Atribuir alunos existentes a coaches
-- =====================================================
-- Se você tem alunos criados SEM coach, execute:
-- 
-- INSERT INTO coach_alunos (coach_id, aluno_id)
-- SELECT 'UUID_DO_COACH', id
-- FROM profiles
-- WHERE role = 'aluno' AND arquivado = false
-- AND id NOT IN (SELECT aluno_id FROM coach_alunos);
--
-- Ou faça via interface do aplicativo já atualizada
