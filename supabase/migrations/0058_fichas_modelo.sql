-- Modelos de ficha de treino ("templates") que o coach pode salvar e reusar
-- ao criar uma ficha nova. Separado de fichas_treino de propósito — não tem
-- aluno, não entra em histórico/execução, é só um ponto de partida reutilizável.

CREATE TABLE IF NOT EXISTS public.fichas_modelo (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id       uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  nome           text NOT NULL,
  configuracao   jsonb NOT NULL,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_fichas_modelo_coach
  ON public.fichas_modelo (coach_id, updated_at DESC);

ALTER TABLE public.fichas_modelo ENABLE ROW LEVEL SECURITY;

-- Coach gerencia (CRUD completo) só os próprios modelos
DROP POLICY IF EXISTS fichas_modelo_coach_all ON public.fichas_modelo;
CREATE POLICY fichas_modelo_coach_all
  ON public.fichas_modelo
  FOR ALL
  TO authenticated
  USING (coach_id = auth.uid())
  WITH CHECK (coach_id = auth.uid());

DROP POLICY IF EXISTS fichas_modelo_super_admin ON public.fichas_modelo;
CREATE POLICY fichas_modelo_super_admin
  ON public.fichas_modelo
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'super_admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'super_admin'
    )
  );
