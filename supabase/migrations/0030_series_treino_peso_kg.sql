-- Colunas de peso em series_treino (schema normalizado, se existir).
-- No AURON, a carga é registrada pelo ALUNO na execução (historico_treinos),
-- não prescrita pelo coach na ficha. Estas colunas servem apenas para
-- ambientes com tabela normalizada que armazenem carga executada por série.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'series_treino'
  ) THEN
    ALTER TABLE series_treino ADD COLUMN IF NOT EXISTS peso_kg NUMERIC(6, 2);
    ALTER TABLE series_treino ADD COLUMN IF NOT EXISTS unidade_peso VARCHAR(2) DEFAULT 'kg';
  END IF;
END $$;
