-- =====================================================
-- TABELAS ADICIONAIS: Fotos, Medidas, Feedback
-- =====================================================

-- 1. TABELA: fotos_evolucao (Fotos de evolução dos alunos)
CREATE TABLE IF NOT EXISTS fotos_evolucao (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  aluno_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  tipo VARCHAR(20) NOT NULL CHECK (tipo IN ('frente', 'lado', 'costas')),
  url_foto TEXT NOT NULL,
  data_upload TIMESTAMP DEFAULT NOW()
);

-- 2. TABELA: medidas (Medidas corporais dos alunos)
CREATE TABLE IF NOT EXISTS medidas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  aluno_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  peso DECIMAL(5,2),
  altura DECIMAL(3,2),
  gordura_corporal DECIMAL(4,2),
  massa_magra DECIMAL(5,2),
  imc DECIMAL(4,2),
  cintura DECIMAL(5,2),
  quadril DECIMAL(5,2),
  braco_direito DECIMAL(4,2),
  braco_esquerdo DECIMAL(4,2),
  perna_direita DECIMAL(5,2),
  perna_esquerda DECIMAL(5,2),
  peitoral DECIMAL(5,2),
  abdomen DECIMAL(5,2),
  data_medicao TIMESTAMP DEFAULT NOW(),
  observacoes TEXT
);

-- 3. TABELA: feedback_treinos (Feedback dos alunos sobre os treinos)
CREATE TABLE IF NOT EXISTS feedback_treinos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  historico_id UUID NOT NULL REFERENCES historico_treinos(id) ON DELETE CASCADE,
  ficha_id UUID NOT NULL REFERENCES fichas_treino(id) ON DELETE CASCADE,
  aluno_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  feedback TEXT,
  avaliacao INT CHECK (avaliacao >= 1 AND avaliacao <= 5),
  data_feedback TIMESTAMP DEFAULT NOW()
);

-- 4. ADICIONAR CAMPOS EM profiles para foto de perfil
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS avatar_url TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS bio TEXT;

-- 5. ÍNDICES para performance
CREATE INDEX IF NOT EXISTS idx_fotos_aluno ON fotos_evolucao(aluno_id, data_upload DESC);
CREATE INDEX IF NOT EXISTS idx_medidas_aluno ON medidas(aluno_id, data_medicao DESC);
CREATE INDEX IF NOT EXISTS idx_feedback_aluno ON feedback_treinos(aluno_id, data_feedback DESC);
CREATE INDEX IF NOT EXISTS idx_feedback_treino ON feedback_treinos(ficha_id);

-- 6. RLS (Row Level Security) para as novas tabelas
ALTER TABLE fotos_evolucao ENABLE ROW LEVEL SECURITY;
ALTER TABLE medidas ENABLE ROW LEVEL SECURITY;
ALTER TABLE feedback_treinos ENABLE ROW LEVEL SECURITY;

-- Políticas para fotos_evolucao
DROP POLICY IF EXISTS "Alunos veem suas próprias fotos" ON fotos_evolucao;
CREATE POLICY "Alunos veem suas próprias fotos" ON fotos_evolucao
  FOR SELECT USING (aluno_id = auth.uid());

DROP POLICY IF EXISTS "Alunos podem inserir suas fotos" ON fotos_evolucao;
CREATE POLICY "Alunos podem inserir suas fotos" ON fotos_evolucao
  FOR INSERT WITH CHECK (aluno_id = auth.uid());

DROP POLICY IF EXISTS "Coaches veem fotos de seus alunos" ON fotos_evolucao;
CREATE POLICY "Coaches veem fotos de seus alunos" ON fotos_evolucao
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role IN ('coach', 'super_admin')
    )
  );

-- Políticas para medidas
DROP POLICY IF EXISTS "Alunos veem suas próprias medidas" ON medidas;
CREATE POLICY "Alunos veem suas próprias medidas" ON medidas
  FOR SELECT USING (aluno_id = auth.uid());

DROP POLICY IF EXISTS "Alunos podem inserir suas medidas" ON medidas;
CREATE POLICY "Alunos podem inserir suas medidas" ON medidas
  FOR INSERT WITH CHECK (aluno_id = auth.uid());

DROP POLICY IF EXISTS "Alunos podem atualizar suas medidas" ON medidas;
CREATE POLICY "Alunos podem atualizar suas medidas" ON medidas
  FOR UPDATE USING (aluno_id = auth.uid());

DROP POLICY IF EXISTS "Coaches veem medidas de seus alunos" ON medidas;
CREATE POLICY "Coaches veem medidas de seus alunos" ON medidas
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role IN ('coach', 'super_admin')
    )
  );

-- Políticas para feedback_treinos
DROP POLICY IF EXISTS "Alunos veem seus próprios feedbacks" ON feedback_treinos;
CREATE POLICY "Alunos veem seus próprios feedbacks" ON feedback_treinos
  FOR SELECT USING (aluno_id = auth.uid());

DROP POLICY IF EXISTS "Alunos podem inserir feedbacks" ON feedback_treinos;
CREATE POLICY "Alunos podem inserir feedbacks" ON feedback_treinos
  FOR INSERT WITH CHECK (aluno_id = auth.uid());

DROP POLICY IF EXISTS "Coaches veem feedbacks de seus alunos" ON feedback_treinos;
CREATE POLICY "Coaches veem feedbacks de seus alunos" ON feedback_treinos
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role IN ('coach', 'super_admin')
    )
  );
