-- =====================================================
-- FIX: Atualizar constraint de tipo_exercicio
-- =====================================================
-- Data: 2026-03-23
-- Descrição: Simplificar tipos de exercício para sistema baseado em componentes
--            Componentes: KG, Repetições, TEMPO, KM
-- =====================================================

-- 1. REMOVER CONSTRAINT ANTIGA
-- =====================================================

ALTER TABLE exercicios_biblioteca
DROP CONSTRAINT IF EXISTS check_tipo_exercicio;

-- 2. ADICIONAR NOVA CONSTRAINT COM TIPOS SIMPLIFICADOS
-- =====================================================

ALTER TABLE exercicios_biblioteca
ADD CONSTRAINT check_tipo_exercicio CHECK (
  tipo_exercicio IS NULL OR
  tipo_exercicio IN (
    'Peso & Repetições',
    'Repetições',
    'Peso Corporal com Peso Acrescido',
    'Duração',
    'Duração e Peso',
    'Distância e Duração',
    'Peso e Distância'
  )
);

-- 3. ATUALIZAR EXERCÍCIOS EXISTENTES COM TIPOS ANTIGOS
-- =====================================================

-- "Repetições de Peso Corporal" → "Repetições"
UPDATE exercicios_biblioteca
SET tipo_exercicio = 'Repetições'
WHERE tipo_exercicio = 'Repetições de Peso Corporal';

-- "Peso Corporal Assistido" → "Repetições" (assistido ainda é peso corporal)
UPDATE exercicios_biblioteca
SET tipo_exercicio = 'Repetições'
WHERE tipo_exercicio = 'Peso Corporal Assistido';

-- "Duração e peso" → "Duração e Peso" (capitalização)
UPDATE exercicios_biblioteca
SET tipo_exercicio = 'Duração e Peso'
WHERE tipo_exercicio = 'Duração e peso';

-- "Distância & Duração" → "Distância e Duração"
UPDATE exercicios_biblioteca
SET tipo_exercicio = 'Distância e Duração'
WHERE tipo_exercicio = 'Distância & Duração';

-- "Peso Corporal Com Peso Acrescido" → "Peso Corporal com Peso Acrescido"
UPDATE exercicios_biblioteca
SET tipo_exercicio = 'Peso Corporal com Peso Acrescido'
WHERE tipo_exercicio = 'Peso Corporal Com Peso Acrescido';

-- 4. VERIFICAÇÃO
-- =====================================================

SELECT 
  tipo_exercicio,
  COUNT(*) as quantidade
FROM exercicios_biblioteca
WHERE tipo_exercicio IS NOT NULL
GROUP BY tipo_exercicio
ORDER BY tipo_exercicio;

-- =====================================================
-- MIGRATION CONCLUÍDA
-- =====================================================
-- Após executar, exercícios terão tipos simplificados:
-- - "Peso & Repetições" → mostrar KG + Repetições
-- - "Repetições" → mostrar apenas Repetições (peso corporal)
-- - "Peso Corporal com Peso Acrescido" → mostrar KG + Repetições (ex: pullup com peso)
-- - "Duração" → mostrar apenas TEMPO
-- - "Duração e Peso" → mostrar TEMPO + KG
-- - "Distância e Duração" → mostrar KM + TEMPO
-- - "Peso e Distância" → mostrar KG + KM
-- =====================================================
