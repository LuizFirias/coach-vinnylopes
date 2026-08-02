-- WhatsApp em profiles (alunos e coaches)
-- Antes: digitos com DDI (ex.: 5567999999999). UI continua coletando; app deixa de depender só de user_metadata.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS whatsapp text;

COMMENT ON COLUMN public.profiles.whatsapp IS
  'Telefone WhatsApp (somente digitos, com DDI). Usado em wa.me e contato coach/aluno.';

CREATE INDEX IF NOT EXISTS idx_profiles_whatsapp
  ON public.profiles (whatsapp)
  WHERE whatsapp IS NOT NULL;
