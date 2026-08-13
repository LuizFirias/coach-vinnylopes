-- Onboarding do coach: boas-vindas + progresso do guia de configuração

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS telefone text,
  ADD COLUMN IF NOT EXISTS alunos_atuais text,
  ADD COLUMN IF NOT EXISTS onboarding_visto boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.profiles.telefone IS
  'WhatsApp/telefone capturado na tela de boas-vindas do coach.';
COMMENT ON COLUMN public.profiles.alunos_atuais IS
  'Faixa de alunos que o coach tem hoje (onboarding). Segmentação — não confundir com student_limit do plano.';
COMMENT ON COLUMN public.profiles.onboarding_visto IS
  'true após o coach concluir a tela /admin/boas-vindas. Impede reexibir.';

-- Coaches já existentes não devem ver a tela de boas-vindas
UPDATE public.profiles
SET onboarding_visto = true
WHERE role IN ('coach', 'super_admin')
  AND onboarding_visto = false;

CREATE TABLE IF NOT EXISTS public.onboarding_passos (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id     uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  passo_id     text NOT NULL,
  concluido    boolean NOT NULL DEFAULT false,
  concluido_em timestamptz,
  UNIQUE (coach_id, passo_id)
);

CREATE INDEX IF NOT EXISTS idx_onboarding_passos_coach
  ON public.onboarding_passos (coach_id);

ALTER TABLE public.onboarding_passos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "coach vê próprio progresso" ON public.onboarding_passos;
CREATE POLICY "coach vê próprio progresso"
  ON public.onboarding_passos
  FOR ALL
  USING (coach_id = auth.uid())
  WITH CHECK (coach_id = auth.uid());
