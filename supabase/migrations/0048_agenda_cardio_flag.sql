-- Permite marcar um dia da agenda como "Cardio" (sem ficha vinculada),
-- ao lado das opções já existentes de treino/descanso.
-- AURONFIT · agosto 2026

ALTER TABLE public.agenda_semanal
  ADD COLUMN IF NOT EXISTS is_cardio boolean NOT NULL DEFAULT false;

ALTER TABLE public.agenda_diaria
  ADD COLUMN IF NOT EXISTS is_cardio boolean NOT NULL DEFAULT false;
