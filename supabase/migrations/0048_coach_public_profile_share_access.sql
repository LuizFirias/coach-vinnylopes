-- Incremental: @ Instagram (ponto permitido) + aluno lê handle do coach p/ share cards

ALTER TABLE public.coach_public_profiles
  DROP CONSTRAINT IF EXISTS coach_public_profiles_handle_format;

ALTER TABLE public.coach_public_profiles
  ADD CONSTRAINT coach_public_profiles_handle_format
  CHECK (handle IS NULL OR handle ~ '^[a-z0-9._]{3,30}$');

DROP POLICY IF EXISTS coach_public_profiles_select_by_aluno ON public.coach_public_profiles;
CREATE POLICY coach_public_profiles_select_by_aluno
  ON public.coach_public_profiles FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.coach_alunos ca
      WHERE ca.coach_id = coach_public_profiles.coach_id
        AND ca.aluno_id = auth.uid()
    )
  );
