-- Amplia tipos de notificação in-app (fotos de evolução)
-- AURONFIT · agosto 2026

ALTER TABLE public.notificacoes
  DROP CONSTRAINT IF EXISTS notificacoes_tipo_check;

ALTER TABLE public.notificacoes
  ADD CONSTRAINT notificacoes_tipo_check
  CHECK (tipo IN ('checkin_reminder', 'photos_reminder'));
