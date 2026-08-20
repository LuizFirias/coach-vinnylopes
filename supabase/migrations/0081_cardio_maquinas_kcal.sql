-- Campos de máquina (velocidade/inclinação/resistência) e origem do kcal calculado
-- em cardio_sessoes / cardio_prescricoes. Ver lib/constants/cardio.ts (CARDIO_CAMPOS)
-- e lib/utils/cardio.ts (calcKcalMet) para o consumo desses campos.

ALTER TABLE public.cardio_sessoes
  ADD COLUMN IF NOT EXISTS velocidade_kmh    numeric(4,1) CHECK (velocidade_kmh IS NULL OR (velocidade_kmh > 0 AND velocidade_kmh <= 40)),
  ADD COLUMN IF NOT EXISTS inclinacao_pct    numeric(4,1) CHECK (inclinacao_pct IS NULL OR (inclinacao_pct >= 0 AND inclinacao_pct <= 25)),
  ADD COLUMN IF NOT EXISTS nivel_resistencia smallint     CHECK (nivel_resistencia IS NULL OR (nivel_resistencia BETWEEN 1 AND 20)),
  ADD COLUMN IF NOT EXISTS kcal_origem       text         CHECK (kcal_origem IS NULL OR kcal_origem IN ('fc','met','manual'));

ALTER TABLE public.cardio_prescricoes
  ADD COLUMN IF NOT EXISTS velocidade_alvo_kmh    numeric(4,1) CHECK (velocidade_alvo_kmh IS NULL OR (velocidade_alvo_kmh > 0 AND velocidade_alvo_kmh <= 40)),
  ADD COLUMN IF NOT EXISTS inclinacao_alvo_pct    numeric(4,1) CHECK (inclinacao_alvo_pct IS NULL OR (inclinacao_alvo_pct >= 0 AND inclinacao_alvo_pct <= 25)),
  ADD COLUMN IF NOT EXISTS nivel_resistencia_alvo smallint     CHECK (nivel_resistencia_alvo IS NULL OR (nivel_resistencia_alvo BETWEEN 1 AND 20));
