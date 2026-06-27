-- =====================================================
-- MIGRATION: Adicionar campos de Equipamento e Tipo
-- =====================================================

-- 1. ADICIONAR NOVOS CAMPOS
-- =====================================================

ALTER TABLE exercicios_biblioteca
ADD COLUMN IF NOT EXISTS equipamento VARCHAR(100),
ADD COLUMN IF NOT EXISTS musculos_secundarios TEXT,
ADD COLUMN IF NOT EXISTS tipo_exercicio VARCHAR(100);

-- 2. CRIAR ÍNDICES
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_exercicios_equipamento ON exercicios_biblioteca(equipamento);
CREATE INDEX IF NOT EXISTS idx_exercicios_tipo ON exercicios_biblioteca(tipo_exercicio);

-- 3. ADICIONAR CONSTRAINTS (validação)
-- =====================================================

ALTER TABLE exercicios_biblioteca
DROP CONSTRAINT IF EXISTS check_equipamento;

ALTER TABLE exercicios_biblioteca
ADD CONSTRAINT check_equipamento CHECK (
  equipamento IS NULL OR
  equipamento IN (
    'Nenhum',
    'Banda de Resistência',
    'Banda de Suspensão',
    'Barra',
    'Disco de Peso',
    'Haltere',
    'Kettlebell',
    'Máquina',
    'Outro'
  )
);

ALTER TABLE exercicios_biblioteca
DROP CONSTRAINT IF EXISTS check_tipo_exercicio;

ALTER TABLE exercicios_biblioteca
ADD CONSTRAINT check_tipo_exercicio CHECK (
  tipo_exercicio IS NULL OR
  tipo_exercicio IN (
    'Peso & Repetições',
    'Repetições de Peso Corporal',
    'Peso Corporal Com Peso Acrescido',
    'Peso Corporal Assistido',
    'Duração',
    'Duração e peso',
    'Distância & Duração',
    'Peso e Distância'
  )
);

-- 4. VALORES PADRÃO PARA EXERCÍCIOS EXISTENTES
-- =====================================================

-- Exercícios sem equipamento definido = 'Nenhum'
UPDATE exercicios_biblioteca
SET equipamento = 'Nenhum'
WHERE equipamento IS NULL;

-- Exercícios sem tipo definido = 'Peso & Repetições' (mais comum)
UPDATE exercicios_biblioteca
SET tipo_exercicio = 'Peso & Repetições'
WHERE tipo_exercicio IS NULL;

-- 5. VERIFICAÇÃO
-- =====================================================

SELECT 
  column_name,
  data_type,
  character_maximum_length,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'exercicios_biblioteca'
  AND column_name IN ('equipamento', 'musculos_secundarios', 'tipo_exercicio')
ORDER BY ordinal_position;

-- =====================================================
-- MIGRATION CONCLUÍDA
-- =====================================================
