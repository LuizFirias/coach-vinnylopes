-- Agenda de aulas presenciais/online do coach com o aluno.
-- Usado na tela /admin/agenda e no card "Próxima aula" do dashboard.

CREATE TABLE IF NOT EXISTS public.aulas_presenciais (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id     uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  aluno_id     uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  data_hora    timestamptz NOT NULL,
  duracao_min  integer NOT NULL DEFAULT 60,
  local_tipo   text NOT NULL DEFAULT 'presencial',
  endereco     text,
  status       text NOT NULL DEFAULT 'agendada',
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT aulas_presenciais_local_tipo_check CHECK (local_tipo IN ('presencial', 'online')),
  CONSTRAINT aulas_presenciais_status_check CHECK (status IN ('agendada', 'concluida', 'cancelada'))
);

CREATE INDEX IF NOT EXISTS idx_aulas_presenciais_coach_data
  ON public.aulas_presenciais (coach_id, data_hora);

CREATE INDEX IF NOT EXISTS idx_aulas_presenciais_aluno_data
  ON public.aulas_presenciais (aluno_id, data_hora);

ALTER TABLE public.aulas_presenciais ENABLE ROW LEVEL SECURITY;

-- Coach gerencia (CRUD completo) só as próprias aulas
DROP POLICY IF EXISTS aulas_presenciais_coach_all ON public.aulas_presenciais;
CREATE POLICY aulas_presenciais_coach_all
  ON public.aulas_presenciais
  FOR ALL
  TO authenticated
  USING (coach_id = auth.uid())
  WITH CHECK (coach_id = auth.uid());

-- Aluno só enxerga as próprias aulas (sem editar)
DROP POLICY IF EXISTS aulas_presenciais_aluno_select ON public.aulas_presenciais;
CREATE POLICY aulas_presenciais_aluno_select
  ON public.aulas_presenciais
  FOR SELECT
  TO authenticated
  USING (aluno_id = auth.uid());

DROP POLICY IF EXISTS aulas_presenciais_super_admin ON public.aulas_presenciais;
CREATE POLICY aulas_presenciais_super_admin
  ON public.aulas_presenciais
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
