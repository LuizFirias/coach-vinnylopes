-- =====================================================
-- MIGRAÇÃO CONSOLIDADA: Sistema Coach Vinny Premium
-- =====================================================

-- =====================================================
-- 1. TABELA: exercicios_biblioteca
-- Catálogo de exercícios (acervo do coach)
-- =====================================================

CREATE TABLE IF NOT EXISTS exercicios_biblioteca (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome VARCHAR(255) NOT NULL,
  grupo_muscular VARCHAR(100),
  video_url TEXT,
  imagem_url TEXT,
  descricao TEXT,
  criado_em TIMESTAMP DEFAULT NOW(),
  criado_por UUID REFERENCES profiles(id)
);

-- =====================================================
-- 2. TABELA: fichas_treino
-- Rotinas montadas pelo Coach (Treino A, Treino B, etc)
-- Campo configuracao (JSONB) salva séries e repetições
-- =====================================================

CREATE TABLE IF NOT EXISTS fichas_treino (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  aluno_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  nome_rotina VARCHAR(255) NOT NULL,
  configuracao JSONB NOT NULL,
  ativo BOOLEAN DEFAULT true,
  criado_em TIMESTAMP DEFAULT NOW(),
  atualizado_em TIMESTAMP DEFAULT NOW()
);

-- =====================================================
-- 3. TABELA: historico_treinos
-- Registros de execução dos alunos (KG, Reps, Checks)
-- Alimenta a coluna ANTERIOR do próximo treino
-- =====================================================

CREATE TABLE IF NOT EXISTS historico_treinos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ficha_id UUID NOT NULL REFERENCES fichas_treino(id) ON DELETE CASCADE,
  aluno_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  exercicio_id UUID NOT NULL REFERENCES exercicios_biblioteca(id) ON DELETE CASCADE,
  dados_sessao JSONB NOT NULL,
  data_conclusao TIMESTAMP DEFAULT NOW(),
  duracao_minutos INTEGER,
  observacoes TEXT
);

-- =====================================================
-- 4. TABELA: parceiros
-- Parceiros comerciais com cupons e imagens
-- =====================================================

CREATE TABLE IF NOT EXISTS parceiros (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome_marca VARCHAR(255) NOT NULL,
  descricao TEXT,
  cupom VARCHAR(100),
  link_desconto TEXT,
  logo_url TEXT,
  imagens TEXT[],
  ordem INTEGER DEFAULT 0,
  ativo BOOLEAN DEFAULT true,
  criado_em TIMESTAMP DEFAULT NOW()
);

-- =====================================================
-- GARANTIR COLUNAS EXISTEM (para bancos já criados)
-- =====================================================

-- Adicionar coluna ativo em fichas_treino se não existir
ALTER TABLE fichas_treino 
ADD COLUMN IF NOT EXISTS ativo BOOLEAN DEFAULT true;

-- Adicionar coluna ativo em parceiros se não existir
ALTER TABLE parceiros 
ADD COLUMN IF NOT EXISTS ativo BOOLEAN DEFAULT true;

-- Adicionar coluna exercicio_id em historico_treinos se não existir
-- Primeiro sem foreign key
ALTER TABLE historico_treinos 
ADD COLUMN IF NOT EXISTS exercicio_id UUID;

-- Depois adicionar a constraint se a coluna não tinha
DO $$ 
BEGIN
  -- Verificar se a constraint já existe
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'historico_treinos_exercicio_id_fkey' 
    AND table_name = 'historico_treinos'
  ) THEN
    -- Adicionar NOT NULL e foreign key
    ALTER TABLE historico_treinos 
    ALTER COLUMN exercicio_id SET NOT NULL;
    
    ALTER TABLE historico_treinos
    ADD CONSTRAINT historico_treinos_exercicio_id_fkey 
    FOREIGN KEY (exercicio_id) REFERENCES exercicios_biblioteca(id) ON DELETE CASCADE;
  END IF;
END $$;

-- =====================================================
-- ÍNDICES para Performance
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_exercicios_grupo ON exercicios_biblioteca(grupo_muscular);
CREATE INDEX IF NOT EXISTS idx_fichas_treino_aluno ON fichas_treino(aluno_id) WHERE ativo = true;
CREATE INDEX IF NOT EXISTS idx_fichas_treino_coach ON fichas_treino(coach_id);
CREATE INDEX IF NOT EXISTS idx_historico_aluno_exercicio ON historico_treinos(aluno_id, exercicio_id, data_conclusao DESC);
CREATE INDEX IF NOT EXISTS idx_historico_ficha ON historico_treinos(ficha_id, data_conclusao DESC);
CREATE INDEX IF NOT EXISTS idx_parceiros_ordem ON parceiros(ordem, nome_marca) WHERE ativo = true;

-- =====================================================
-- RLS (Row Level Security)
-- =====================================================

-- Habilitar RLS nas tabelas
ALTER TABLE exercicios_biblioteca ENABLE ROW LEVEL SECURITY;
ALTER TABLE fichas_treino ENABLE ROW LEVEL SECURITY;
ALTER TABLE historico_treinos ENABLE ROW LEVEL SECURITY;
ALTER TABLE parceiros ENABLE ROW LEVEL SECURITY;

-- EXERCÍCIOS BIBLIOTECA: Todos podem ver, apenas coaches podem criar/editar
DROP POLICY IF EXISTS "Todos podem visualizar exercícios" ON exercicios_biblioteca;
CREATE POLICY "Todos podem visualizar exercícios" ON exercicios_biblioteca
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Coaches podem criar exercícios" ON exercicios_biblioteca;
CREATE POLICY "Coaches podem criar exercícios" ON exercicios_biblioteca
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'coach'
    )
  );

DROP POLICY IF EXISTS "Coaches podem editar exercícios" ON exercicios_biblioteca;
CREATE POLICY "Coaches podem editar exercícios" ON exercicios_biblioteca
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'coach'
    )
  );

-- FICHAS DE TREINO: Alunos veem apenas suas fichas, coaches veem as que criaram
DROP POLICY IF EXISTS "Alunos veem suas próprias fichas" ON fichas_treino;
CREATE POLICY "Alunos veem suas próprias fichas" ON fichas_treino
  FOR SELECT USING (
    aluno_id = auth.uid() OR coach_id = auth.uid()
  );

DROP POLICY IF EXISTS "Coaches podem criar fichas" ON fichas_treino;
CREATE POLICY "Coaches podem criar fichas" ON fichas_treino
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'coach'
    )
  );

DROP POLICY IF EXISTS "Coaches podem editar suas fichas" ON fichas_treino;
CREATE POLICY "Coaches podem editar suas fichas" ON fichas_treino
  FOR UPDATE USING (
    coach_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'coach'
    )
  );

DROP POLICY IF EXISTS "Coaches podem deletar suas fichas" ON fichas_treino;
CREATE POLICY "Coaches podem deletar suas fichas" ON fichas_treino
  FOR DELETE USING (
    coach_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'coach'
    )
  );

-- HISTÓRICO: Alunos podem criar e ver seu próprio histórico, coaches veem histórico de seus alunos
DROP POLICY IF EXISTS "Alunos veem seu próprio histórico" ON historico_treinos;
CREATE POLICY "Alunos veem seu próprio histórico" ON historico_treinos
  FOR SELECT USING (
    aluno_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM fichas_treino 
      WHERE fichas_treino.id = historico_treinos.ficha_id 
      AND fichas_treino.coach_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Alunos podem salvar seu histórico" ON historico_treinos;
CREATE POLICY "Alunos podem salvar seu histórico" ON historico_treinos
  FOR INSERT WITH CHECK (aluno_id = auth.uid());

-- PARCEIROS: Todos veem, apenas coaches podem gerenciar
DROP POLICY IF EXISTS "Todos podem visualizar parceiros" ON parceiros;
CREATE POLICY "Todos podem visualizar parceiros" ON parceiros
  FOR SELECT USING (ativo = true);

DROP POLICY IF EXISTS "Coaches podem criar parceiros" ON parceiros;
CREATE POLICY "Coaches podem criar parceiros" ON parceiros
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'coach'
    )
  );

DROP POLICY IF EXISTS "Coaches podem editar parceiros" ON parceiros;
CREATE POLICY "Coaches podem editar parceiros" ON parceiros
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'coach'
    )
  );

DROP POLICY IF EXISTS "Coaches podem deletar parceiros" ON parceiros;
CREATE POLICY "Coaches podem deletar parceiros" ON parceiros
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'coach'
    )
  );

-- =====================================================
-- FUNÇÕES AUXILIARES
-- =====================================================

-- Função para buscar último treino do aluno para um exercício específico
CREATE OR REPLACE FUNCTION get_ultimo_treino_exercicio(
  p_aluno_id UUID, 
  p_exercicio_id UUID
)
RETURNS JSONB AS $$
DECLARE
  ultimo_treino JSONB;
BEGIN
  SELECT dados_sessao INTO ultimo_treino
  FROM historico_treinos
  WHERE aluno_id = p_aluno_id 
    AND exercicio_id = p_exercicio_id
  ORDER BY data_conclusao DESC
  LIMIT 1;
  
  RETURN COALESCE(ultimo_treino, '{}'::JSONB);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger para atualizar atualizado_em em fichas_treino
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.atualizado_em = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_fichas_treino_updated_at ON fichas_treino;
CREATE TRIGGER update_fichas_treino_updated_at
BEFORE UPDATE ON fichas_treino
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- DADOS DE EXEMPLO (opcional - comente se não quiser)
-- =====================================================

-- Inserir alguns exercícios de exemplo na biblioteca
INSERT INTO exercicios_biblioteca (nome, grupo_muscular, video_url) VALUES
  ('Leg Press Horizontal', 'Quadríceps', 'https://youtube.com/embed/IZxyjW7MPJQ'),
  ('Agachamento Livre', 'Quadríceps', 'https://youtube.com/embed/ultWZbUMPL8'),
  ('Extensora', 'Quadríceps', 'https://youtube.com/embed/YyvSfVjQeL0'),
  ('Stiff', 'Posterior de Coxa', 'https://youtube.com/embed/1uDiW5--rAE'),
  ('Cadeira Flexora', 'Posterior de Coxa', 'https://youtube.com/embed/ELOCsoDSmrg'),
  ('Supino Reto', 'Peitoral', 'https://youtube.com/embed/rT7DgCr-3pg'),
  ('Crucifixo Inclinado', 'Peitoral', 'https://youtube.com/embed/IP4oeKh8xfg'),
  ('Puxada Frontal', 'Dorsal', 'https://youtube.com/embed/CAwf7n6Luuc'),
  ('Remada Curvada', 'Dorsal', 'https://youtube.com/embed/kBWAon7ItDw'),
  ('Desenvolvimento com Halteres', 'Ombro', 'https://youtube.com/embed/qEwKCR5JCog'),
  ('Elevação Lateral', 'Ombro', 'https://youtube.com/embed/3VcKaXpzqRo'),
  ('Rosca Direta', 'Bíceps', 'https://youtube.com/embed/kwG2ipFRgfo'),
  ('Tríceps Testa', 'Tríceps', 'https://youtube.com/embed/d_KZxkY_0cM')
ON CONFLICT DO NOTHING;

-- =====================================================
-- MIGRAÇÃO: Renomear coluna antiga (se existir)
-- =====================================================

-- Se você já tinha uma tabela com estrutura_treino, renomeie para configuracao
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'fichas_treino' 
    AND column_name = 'estrutura_treino'
  ) THEN
    ALTER TABLE fichas_treino RENAME COLUMN estrutura_treino TO configuracao;
  END IF;
END $$;
