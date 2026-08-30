-- Overrides de agenda por data específica.
-- A agenda_semanal continua sendo o template recorrente (seg–dom).
-- Edits em semanas futuras/passadas gravam aqui e NÃO espelham o template.

CREATE TABLE IF NOT EXISTS public.agenda_diaria (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  aluno_id       uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  data           date NOT NULL,
  ficha_id       uuid REFERENCES public.fichas_treino(id) ON DELETE SET NULL,
  treino_pdf_id  uuid REFERENCES public.treinos_alunos(id) ON DELETE SET NULL,
  is_off         boolean NOT NULL DEFAULT false,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT agenda_diaria_aluno_data_unique UNIQUE (aluno_id, data)
);

CREATE INDEX IF NOT EXISTS idx_agenda_diaria_aluno_data
  ON public.agenda_diaria (aluno_id, data);

ALTER TABLE public.agenda_diaria ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS agenda_diaria_aluno_all ON public.agenda_diaria;
CREATE POLICY agenda_diaria_aluno_all
  ON public.agenda_diaria
  FOR ALL
  TO authenticated
  USING (aluno_id = auth.uid())
  WITH CHECK (aluno_id = auth.uid());

DROP POLICY IF EXISTS agenda_diaria_coach_select ON public.agenda_diaria;
CREATE POLICY agenda_diaria_coach_select
  ON public.agenda_diaria
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.coach_alunos ca
      WHERE ca.coach_id = auth.uid()
        AND ca.aluno_id = agenda_diaria.aluno_id
    )
  );

DROP POLICY IF EXISTS agenda_diaria_super_admin ON public.agenda_diaria;
CREATE POLICY agenda_diaria_super_admin
  ON public.agenda_diaria
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
