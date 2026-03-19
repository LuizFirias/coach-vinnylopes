-- =====================================================
-- FEATURE: Treinos Manuais + Sistema de Pontuação
-- =====================================================
-- Allows students to log manual workouts and earn points

-- =====================================================
-- 1. CRIAR TABELA treinos_manuais
-- =====================================================

CREATE TABLE IF NOT EXISTS treinos_manuais (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  aluno_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  coach_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  tipo_treino TEXT NOT NULL CHECK (tipo_treino IN ('musculacao', 'cardio')),
  duracao_minutos INTEGER, -- NULL para musculação, required para cardio (00:00 format stored as minutes)
  descricao TEXT,
  data_treino DATE NOT NULL,
  concluido BOOLEAN DEFAULT false,
  pontos_earn INTEGER DEFAULT 0,
  criado_em TIMESTAMP DEFAULT NOW(),
  atualizado_em TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_treinos_manuais_aluno_id ON treinos_manuais(aluno_id);
CREATE INDEX IF NOT EXISTS idx_treinos_manuais_coach_id ON treinos_manuais(coach_id);
CREATE INDEX IF NOT EXISTS idx_treinos_manuais_data ON treinos_manuais(data_treino);

-- =====================================================
-- 2. CRIAR TABELA pontuacao_alunos (consolidado)
-- =====================================================
-- Tracks total points earned by each student

CREATE TABLE IF NOT EXISTS pontuacao_alunos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  aluno_id UUID NOT NULL UNIQUE REFERENCES profiles(id) ON DELETE CASCADE,
  total_pontos INTEGER DEFAULT 0,
  atualizado_em TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_pontuacao_alunos_total ON pontuacao_alunos(total_pontos DESC);

-- =====================================================
-- 3. FUNÇÃO para calcular pontos baseado em tipo e duração
-- =====================================================

CREATE OR REPLACE FUNCTION calcular_pontos_treino(
  p_tipo TEXT,
  p_duracao_minutos INTEGER
)
RETURNS INTEGER AS $$
BEGIN
  CASE
    -- Musculação: 20 pontos
    WHEN p_tipo = 'musculacao' THEN RETURN 20;
    
    -- Cardio: baseado em duração
    WHEN p_tipo = 'cardio' THEN
      IF p_duracao_minutos BETWEEN 10 AND 19 THEN RETURN 10;
      ELSIF p_duracao_minutos BETWEEN 20 AND 49 THEN RETURN 20;
      ELSIF p_duracao_minutos >= 50 THEN RETURN 30;
      ELSE RETURN 0; -- Less than 10 minutes = 0 points
      END IF;
    
    ELSE RETURN 0;
  END CASE;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- =====================================================
-- 4. TRIGGER para recalcular pontos ao criar/atualizar treino manual
-- =====================================================

CREATE OR REPLACE FUNCTION atualizar_pontos_treino()
RETURNS TRIGGER AS $$
BEGIN
  -- Se o treino está sendo marcado como concluído e a data é <= hoje
  IF NEW.concluido = true AND NEW.data_treino <= CURRENT_DATE THEN
    -- Calcula os pontos
    NEW.pontos_earn := calcular_pontos_treino(NEW.tipo_treino, NEW.duracao_minutos);
  ELSE
    NEW.pontos_earn := 0;
  END IF;

  -- Atualizar timestamp
  NEW.atualizado_em := NOW();

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_atualizar_pontos_treino ON treinos_manuais;
CREATE TRIGGER trigger_atualizar_pontos_treino
BEFORE INSERT OR UPDATE ON treinos_manuais
FOR EACH ROW
EXECUTE FUNCTION atualizar_pontos_treino();

-- =====================================================
-- 5. TRIGGER para consolidar pontos na tabela pontuacao_alunos
-- =====================================================

CREATE OR REPLACE FUNCTION consolidar_pontos_aluno()
RETURNS TRIGGER AS $$
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

DROP TRIGGER IF EXISTS trigger_consolidar_pontos_aluno ON treinos_manuais;
CREATE TRIGGER trigger_consolidar_pontos_aluno
AFTER INSERT OR UPDATE ON treinos_manuais
FOR EACH ROW
EXECUTE FUNCTION consolidar_pontos_aluno();

-- =====================================================
-- 6. RLS POLICIES para treinos_manuais
-- =====================================================

ALTER TABLE treinos_manuais ENABLE ROW LEVEL SECURITY;

-- Alunos veem apenas seus próprios treinos
DROP POLICY IF EXISTS "Alunos veem seus próprios treinos manuais" ON treinos_manuais;
CREATE POLICY "Alunos veem seus próprios treinos manuais" ON treinos_manuais
  FOR SELECT
  USING (aluno_id = auth.uid());

-- Alunos criam treinos apenas para si mesmos
DROP POLICY IF EXISTS "Alunos criam treinos para si mesmos" ON treinos_manuais;
CREATE POLICY "Alunos criam treinos para si mesmos" ON treinos_manuais
  FOR INSERT
  WITH CHECK (aluno_id = auth.uid());

-- Alunos atualizam apenas seus próprios treinos
DROP POLICY IF EXISTS "Alunos atualizam seus treinos" ON treinos_manuais;
CREATE POLICY "Alunos atualizam seus treinos" ON treinos_manuais
  FOR UPDATE
  USING (aluno_id = auth.uid())
  WITH CHECK (aluno_id = auth.uid());

-- Coaches veem todos os treinos de seus alunos
DROP POLICY IF EXISTS "Coaches veem treinos de seus alunos" ON treinos_manuais;
CREATE POLICY "Coaches veem treinos de seus alunos" ON treinos_manuais
  FOR SELECT
  USING (
    coach_id = auth.uid() OR
    aluno_id = auth.uid()
  );

-- Super admins veem tudo
DROP POLICY IF EXISTS "Super admins veem todos treinos" ON treinos_manuais;
CREATE POLICY "Super admins veem todos treinos" ON treinos_manuais
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND role = 'super_admin'
    )
  );

-- =====================================================
-- 7. RLS POLICIES para pontuacao_alunos
-- =====================================================

ALTER TABLE pontuacao_alunos ENABLE ROW LEVEL SECURITY;

-- Alunos veem sua própria pontuação
DROP POLICY IF EXISTS "Alunos veem sua pontuação" ON pontuacao_alunos;
CREATE POLICY "Alunos veem sua pontuação" ON pontuacao_alunos
  FOR SELECT
  USING (aluno_id = auth.uid());

-- Coaches veem pontuação de seus alunos
DROP POLICY IF EXISTS "Coaches veem pontuação de seus alunos" ON pontuacao_alunos;
CREATE POLICY "Coaches veem pontuação de seus alunos" ON pontuacao_alunos
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM coach_alunos
      WHERE coach_alunos.coach_id = auth.uid()
      AND coach_alunos.aluno_id = pontuacao_alunos.aluno_id
    )
  );

-- =====================================================
-- 8. INICIALIZAR pontuação para alunos existentes
-- =====================================================

INSERT INTO pontuacao_alunos (aluno_id, total_pontos)
SELECT p.id, 0
FROM profiles p
WHERE p.role = 'aluno'
ON CONFLICT (aluno_id) DO NOTHING;

-- =====================================================
-- 9. VERIFICAÇÃO
-- =====================================================

SELECT 'treinos_manuais' as tabela, COUNT(*) as registros
FROM treinos_manuais
UNION ALL
SELECT 'pontuacao_alunos', COUNT(*)
FROM pontuacao_alunos;
