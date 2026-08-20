-- Calendário da Agenda: permite "eventos" sem aluno vinculado (bloqueio de
-- horário) e guarda o horário de trabalho do coach por dia da semana.

-- aluno_id vira opcional — só é obrigatório quando tipo = 'aula'
ALTER TABLE public.aulas_presenciais
  ALTER COLUMN aluno_id DROP NOT NULL;

ALTER TABLE public.aulas_presenciais
  ADD COLUMN IF NOT EXISTS tipo text NOT NULL DEFAULT 'aula';

ALTER TABLE public.aulas_presenciais
  DROP CONSTRAINT IF EXISTS aulas_presenciais_tipo_check;
ALTER TABLE public.aulas_presenciais
  ADD CONSTRAINT aulas_presenciais_tipo_check CHECK (tipo IN ('aula', 'evento'));

ALTER TABLE public.aulas_presenciais
  ADD COLUMN IF NOT EXISTS titulo text;

ALTER TABLE public.aulas_presenciais
  DROP CONSTRAINT IF EXISTS aulas_presenciais_aluno_obrigatorio_em_aula;
ALTER TABLE public.aulas_presenciais
  ADD CONSTRAINT aulas_presenciais_aluno_obrigatorio_em_aula
  CHECK (tipo <> 'aula' OR aluno_id IS NOT NULL);

COMMENT ON COLUMN public.aulas_presenciais.tipo IS
  'aula: sessão com aluno vinculado. evento: bloqueio de agenda simples (ex: compromisso pessoal).';
COMMENT ON COLUMN public.aulas_presenciais.titulo IS
  'Usado quando tipo = evento (sem aluno vinculado) — descrição livre do bloqueio.';

-- Horário de trabalho do coach — uma linha por dia da semana (0=domingo..6=sábado)
CREATE TABLE IF NOT EXISTS public.coach_horario_trabalho (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id     uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  dia_semana   smallint NOT NULL,
  ativo        boolean NOT NULL DEFAULT false,
  hora_inicio  time NOT NULL DEFAULT '08:00',
  hora_fim     time NOT NULL DEFAULT '18:00',
  updated_at   timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT coach_horario_trabalho_dia_semana_check CHECK (dia_semana BETWEEN 0 AND 6),
  CONSTRAINT coach_horario_trabalho_coach_dia_unique UNIQUE (coach_id, dia_semana)
);

ALTER TABLE public.coach_horario_trabalho ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS coach_horario_trabalho_coach_all ON public.coach_horario_trabalho;
CREATE POLICY coach_horario_trabalho_coach_all
  ON public.coach_horario_trabalho
  FOR ALL
  TO authenticated
  USING (coach_id = auth.uid())
  WITH CHECK (coach_id = auth.uid());

DROP POLICY IF EXISTS coach_horario_trabalho_aluno_select ON public.coach_horario_trabalho;
CREATE POLICY coach_horario_trabalho_aluno_select
  ON public.coach_horario_trabalho
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.coach_alunos ca
      WHERE ca.coach_id = coach_horario_trabalho.coach_id
        AND ca.aluno_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS coach_horario_trabalho_super_admin ON public.coach_horario_trabalho;
CREATE POLICY coach_horario_trabalho_super_admin
  ON public.coach_horario_trabalho
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
