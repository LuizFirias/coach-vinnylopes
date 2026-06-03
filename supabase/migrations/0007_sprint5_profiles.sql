-- Sprint 5: Preferências do usuário — colunas novas em profiles
-- MIGRATION-PLAN §9.1 (Bloco J)

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS height_cm                SMALLINT
    CHECK (height_cm IS NULL OR height_cm BETWEEN 100 AND 250),
  ADD COLUMN IF NOT EXISTS sexo                     TEXT
    CHECK (sexo IS NULL OR sexo IN ('masculino','feminino','outro')),
  ADD COLUMN IF NOT EXISTS objetivo                 TEXT
    CHECK (objetivo IS NULL OR objetivo IN ('cutting','bulking','manutencao','recomposicao')),
  ADD COLUMN IF NOT EXISTS unidade_peso             TEXT NOT NULL DEFAULT 'kg'
    CHECK (unidade_peso IN ('kg','lb')),
  ADD COLUMN IF NOT EXISTS unidade_medida           TEXT NOT NULL DEFAULT 'cm'
    CHECK (unidade_medida IN ('cm','in')),
  ADD COLUMN IF NOT EXISTS incremento_peso_padrao   NUMERIC(4,2) NOT NULL DEFAULT 2.5,
  ADD COLUMN IF NOT EXISTS oculto_no_ranking        BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS notificacoes_ativas      BOOLEAN NOT NULL DEFAULT TRUE;

-- ROLLBACK
-- ALTER TABLE profiles
--   DROP COLUMN IF EXISTS height_cm,
--   DROP COLUMN IF EXISTS sexo,
--   DROP COLUMN IF EXISTS objetivo,
--   DROP COLUMN IF EXISTS unidade_peso,
--   DROP COLUMN IF EXISTS unidade_medida,
--   DROP COLUMN IF EXISTS incremento_peso_padrao,
--   DROP COLUMN IF EXISTS oculto_no_ranking,
--   DROP COLUMN IF EXISTS notificacoes_ativas;
