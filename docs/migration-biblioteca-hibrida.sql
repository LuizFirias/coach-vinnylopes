-- =====================================================
-- MIGRAÇÃO: Biblioteca Híbrida (Global + Privada)
-- =====================================================
-- Permite biblioteca global (mantida pelo admin) +
-- biblioteca privada (cada coach cria a sua)
-- =====================================================

-- 1. ADICIONAR CAMPO TIPO
-- =====================================================
ALTER TABLE exercicios_biblioteca 
ADD COLUMN IF NOT EXISTS tipo VARCHAR(20) DEFAULT 'privado' 
CHECK (tipo IN ('global', 'privado'));

-- 2. PERMITIR coach_id NULL (para exercícios globais)
-- =====================================================
ALTER TABLE exercicios_biblioteca 
ALTER COLUMN coach_id DROP NOT NULL;

-- 3. CRIAR ÍNDICES PARA PERFORMANCE
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_exercicios_tipo ON exercicios_biblioteca(tipo);
CREATE INDEX IF NOT EXISTS idx_exercicios_tipo_grupo ON exercicios_biblioteca(tipo, grupo_muscular);

-- 4. REMOVER POLÍTICAS ANTIGAS
-- =====================================================
DROP POLICY IF EXISTS "Todos podem visualizar exercícios" ON exercicios_biblioteca;
DROP POLICY IF EXISTS "Coaches podem criar exercícios" ON exercicios_biblioteca;
DROP POLICY IF EXISTS "Coaches podem editar exercícios" ON exercicios_biblioteca;
DROP POLICY IF EXISTS "Coach vê próprios exercícios" ON exercicios_biblioteca;
DROP POLICY IF EXISTS "Coach cria próprios exercícios" ON exercicios_biblioteca;
DROP POLICY IF EXISTS "Coach edita próprios exercícios" ON exercicios_biblioteca;
DROP POLICY IF EXISTS "Coach deleta próprios exercícios" ON exercicios_biblioteca;

-- 5. NOVAS POLÍTICAS RLS (Row Level Security)
-- =====================================================

-- 5.1 SELECT: Coaches veem global + próprios
CREATE POLICY "Coach vê global e próprios" ON exercicios_biblioteca
  FOR SELECT
  USING (
    tipo = 'global' OR  -- Todos veem exercícios globais
    coach_id = auth.uid()  -- Coach vê apenas os próprios
  );

-- 5.2 SELECT: Alunos veem global + do seu coach
CREATE POLICY "Aluno vê global e do coach" ON exercicios_biblioteca
  FOR SELECT
  USING (
    tipo = 'global' OR
    coach_id IN (
      SELECT coach_id 
      FROM coach_alunos 
      WHERE aluno_id = auth.uid()
    )
  );

-- 5.3 INSERT: Admin cria globais, Coach cria privados
CREATE POLICY "Admin cria globais, Coach cria privados" ON exercicios_biblioteca
  FOR INSERT
  WITH CHECK (
    (tipo = 'global' AND 
     auth.uid() IN (SELECT id FROM profiles WHERE role IN ('admin', 'super_admin'))
    ) OR
    (tipo = 'privado' AND 
     coach_id = auth.uid() AND
     EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'coach')
    )
  );

-- 5.4 UPDATE: Admin edita globais, Coach edita próprios
CREATE POLICY "Admin edita globais, Coach edita próprios" ON exercicios_biblioteca
  FOR UPDATE
  USING (
    (tipo = 'global' AND 
     auth.uid() IN (SELECT id FROM profiles WHERE role IN ('admin', 'super_admin'))
    ) OR
    (tipo = 'privado' AND coach_id = auth.uid())
  )
  WITH CHECK (
    (tipo = 'global' AND 
     auth.uid() IN (SELECT id FROM profiles WHERE role IN ('admin', 'super_admin'))
    ) OR
    (tipo = 'privado' AND coach_id = auth.uid())
  );

-- 5.5 DELETE: Admin deleta globais, Coach deleta próprios
CREATE POLICY "Admin deleta globais, Coach deleta próprios" ON exercicios_biblioteca
  FOR DELETE
  USING (
    (tipo = 'global' AND 
     auth.uid() IN (SELECT id FROM profiles WHERE role IN ('admin', 'super_admin'))
    ) OR
    (tipo = 'privado' AND coach_id = auth.uid())
  );

-- =====================================================
-- 6. MIGRAR EXERCÍCIOS EXISTENTES PARA PRIVADOS
-- =====================================================
UPDATE exercicios_biblioteca 
SET tipo = 'privado' 
WHERE tipo IS NULL AND coach_id IS NOT NULL;

-- =====================================================
-- 7. EXEMPLOS DE EXERCÍCIOS GLOBAIS (OPCIONAL)
-- =====================================================
-- Descomente para inserir biblioteca global básica

/*
INSERT INTO exercicios_biblioteca (nome, grupo_muscular, tipo, video_url, descricao) VALUES
  -- PEITO
  ('Supino Reto com Barra', 'Peito Médio', 'global', 'https://youtube.com/shorts/...', 'Exercício básico para peito'),
  ('Supino Inclinado com Halteres', 'Peito Superior', 'global', 'https://youtube.com/shorts/...', 'Foco na parte superior do peitoral'),
  ('Crucifixo Inclinado', 'Peito Superior', 'global', 'https://youtube.com/shorts/...', 'Isolamento do peito superior'),
  ('Supino Declinado', 'Peito Inferior', 'global', 'https://youtube.com/shorts/...', 'Foco na parte inferior'),
  
  -- COSTAS
  ('Puxada Frontal', 'Dorsais', 'global', 'https://youtube.com/shorts/...', 'Desenvolvimento de dorsais'),
  ('Remada Curvada', 'Dorsais', 'global', 'https://youtube.com/shorts/...', 'Espessura das costas'),
  ('Levantamento Terra', 'Lombar', 'global', 'https://youtube.com/shorts/...', 'Exercício composto completo'),
  ('Encolhimento com Barra', 'Trapézio', 'global', 'https://youtube.com/shorts/...', 'Desenvolvimento de trapézio'),
  
  -- OMBROS
  ('Desenvolvimento com Barra', 'Ombro Anterior', 'global', 'https://youtube.com/shorts/...', 'Ombros frontais'),
  ('Elevação Lateral', 'Ombro Lateral', 'global', 'https://youtube.com/shorts/...', 'Ombros laterais'),
  ('Crucifixo Inverso', 'Ombro Posterior', 'global', 'https://youtube.com/shorts/...', 'Parte posterior do ombro'),
  
  -- BRAÇOS
  ('Rosca Direta', 'Bíceps', 'global', 'https://youtube.com/shorts/...', 'Bíceps com barra'),
  ('Rosca Martelo', 'Bíceps', 'global', 'https://youtube.com/shorts/...', 'Bíceps + antebraço'),
  ('Tríceps Testa', 'Tríceps', 'global', 'https://youtube.com/shorts/...', 'Isolamento de tríceps'),
  ('Mergulho em Paralelas', 'Tríceps', 'global', 'https://youtube.com/shorts/...', 'Tríceps composto'),
  
  -- PERNAS
  ('Agachamento Livre', 'Quadríceps', 'global', 'https://youtube.com/shorts/...', 'Rei dos exercícios'),
  ('Leg Press 45°', 'Quadríceps', 'global', 'https://youtube.com/shorts/...', 'Quadríceps com segurança'),
  ('Cadeira Extensora', 'Quadríceps', 'global', 'https://youtube.com/shorts/...', 'Isolamento de quadríceps'),
  ('Mesa Flexora', 'Posterior (Isquiotibiais)', 'global', 'https://youtube.com/shorts/...', 'Posterior de coxa'),
  ('Stiff', 'Posterior (Isquiotibiais)', 'global', 'https://youtube.com/shorts/...', 'Posterior + lombar'),
  ('Panturrilha em Pé', 'Panturrilha', 'global', 'https://youtube.com/shorts/...', 'Panturrilha gastrocnêmio'),
  ('Agachamento Sumô', 'Glúteos', 'global', 'https://youtube.com/shorts/...', 'Foco em glúteos'),
  
  -- CORE
  ('Abdominal Supra', 'Abdômen', 'global', 'https://youtube.com/shorts/...', 'Reto abdominal'),
  ('Prancha Isométrica', 'Abdômen', 'global', 'https://youtube.com/shorts/...', 'Core completo'),
  ('Oblíquo com Peso', 'Oblíquos', 'global', 'https://youtube.com/shorts/...', 'Laterais do abdômen');
*/

-- =====================================================
-- 8. TABELA DE ASSINATURAS (PREPARAÇÃO MULTI-COACH)
-- =====================================================

CREATE TABLE IF NOT EXISTS coach_assinaturas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  plano VARCHAR(50) NOT NULL CHECK (plano IN ('free', 'starter', 'pro', 'premium')),
  status VARCHAR(50) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'canceled', 'past_due', 'trialing')),
  max_alunos INTEGER DEFAULT 5,
  acesso_biblioteca_global BOOLEAN DEFAULT true,
  stripe_customer_id VARCHAR(255),
  stripe_subscription_id VARCHAR(255),
  data_inicio TIMESTAMP DEFAULT NOW(),
  data_fim TIMESTAMP,
  valor_mensal DECIMAL(10,2),
  criado_em TIMESTAMP DEFAULT NOW(),
  atualizado_em TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_assinaturas_coach ON coach_assinaturas(coach_id);
CREATE INDEX IF NOT EXISTS idx_assinaturas_status ON coach_assinaturas(status);

-- RLS para assinaturas
ALTER TABLE coach_assinaturas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Coach vê própria assinatura" ON coach_assinaturas
  FOR SELECT USING (coach_id = auth.uid());

CREATE POLICY "Admin vê todas assinaturas" ON coach_assinaturas
  FOR ALL USING (
    auth.uid() IN (SELECT id FROM profiles WHERE role IN ('admin', 'super_admin'))
  );

-- =====================================================
-- 9. VERIFICAÇÃO DE SUCESSO
-- =====================================================

-- Verificar estrutura
SELECT 
  column_name, 
  data_type, 
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'exercicios_biblioteca'
ORDER BY ordinal_position;

-- Contar exercícios por tipo
SELECT 
  tipo,
  COUNT(*) as total,
  COUNT(DISTINCT grupo_muscular) as grupos_diferentes
FROM exercicios_biblioteca
GROUP BY tipo;

-- Verificar políticas
SELECT 
  schemaname, 
  tablename, 
  policyname,
  cmd
FROM pg_policies
WHERE tablename = 'exercicios_biblioteca';

-- =====================================================
-- MIGRAÇÃO CONCLUÍDA!
-- =====================================================
