-- Cardio: prescrição do coach + sessões executadas pelo aluno
-- kcal/zona de FC são calculados no servidor e persistidos com snapshot de peso/idade,
-- para que o histórico não mude quando o aluno atualiza as medidas.

CREATE TABLE IF NOT EXISTS public.cardio_prescricoes (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id          uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  aluno_id          uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  modalidade        text NOT NULL,
  duracao_min       integer NOT NULL CHECK (duracao_min > 0 AND duracao_min <= 600),
  intensidade       text CHECK (intensidade IS NULL OR intensidade IN ('leve', 'moderada', 'intensa')),
  fc_alvo_min       integer CHECK (fc_alvo_min IS NULL OR fc_alvo_min BETWEEN 30 AND 250),
  fc_alvo_max       integer CHECK (fc_alvo_max IS NULL OR fc_alvo_max BETWEEN 30 AND 250),
  distancia_alvo_km numeric(5,2) CHECK (distancia_alvo_km IS NULL OR distancia_alvo_km > 0),
  observacao        text,
  dias_semana       smallint[],
  ativo             boolean NOT NULL DEFAULT true,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT cardio_prescricoes_fc_alvo_ordem
    CHECK (fc_alvo_min IS NULL OR fc_alvo_max IS NULL OR fc_alvo_min <= fc_alvo_max),
  -- Postgres não permite subquery em CHECK; <@ valida que todos os dias ∈ 0..6
  CONSTRAINT cardio_prescricoes_dias_semana_validos
    CHECK (
      dias_semana IS NULL
      OR (
        cardinality(dias_semana) <= 7
        AND dias_semana <@ ARRAY[0, 1, 2, 3, 4, 5, 6]::smallint[]
      )
    )
);

CREATE TABLE IF NOT EXISTS public.cardio_sessoes (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  aluno_id       uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  prescricao_id  uuid REFERENCES public.cardio_prescricoes(id) ON DELETE SET NULL,
  modalidade     text NOT NULL,
  data           date NOT NULL DEFAULT current_date,
  duracao_min    integer NOT NULL CHECK (duracao_min > 0 AND duracao_min <= 600),
  fc_media       integer CHECK (fc_media IS NULL OR fc_media BETWEEN 30 AND 250),
  distancia_km   numeric(5,2) CHECK (distancia_km IS NULL OR distancia_km > 0),
  rpe            integer CHECK (rpe IS NULL OR rpe BETWEEN 1 AND 10),
  kcal_calculado numeric(7,1) CHECK (kcal_calculado IS NULL OR kcal_calculado >= 0),
  peso_usado     numeric(5,2) CHECK (peso_usado IS NULL OR peso_usado BETWEEN 20 AND 300),
  idade_usada    integer CHECK (idade_usada IS NULL OR idade_usada BETWEEN 5 AND 120),
  zona_fc        text CHECK (zona_fc IS NULL OR zona_fc IN ('Z1','Z2','Z3','Z4','Z5')),
  observacao     text,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_cardio_prescricoes_aluno  ON public.cardio_prescricoes (aluno_id) WHERE ativo = true;
CREATE INDEX IF NOT EXISTS idx_cardio_prescricoes_coach  ON public.cardio_prescricoes (coach_id);
CREATE INDEX IF NOT EXISTS idx_cardio_sessoes_aluno_data ON public.cardio_sessoes (aluno_id, data DESC);
CREATE INDEX IF NOT EXISTS idx_cardio_sessoes_prescricao ON public.cardio_sessoes (prescricao_id);

ALTER TABLE public.cardio_prescricoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cardio_sessoes     ENABLE ROW LEVEL SECURITY;

-- ── cardio_prescricoes ──────────────────────────────────────────────────────
-- Coach lê as prescrições que criou para os próprios alunos
DROP POLICY IF EXISTS cardio_prescricoes_coach_select ON public.cardio_prescricoes;
CREATE POLICY cardio_prescricoes_coach_select
  ON public.cardio_prescricoes FOR SELECT
  TO authenticated
  USING (
    coach_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.coach_alunos ca
      WHERE ca.coach_id = auth.uid() AND ca.aluno_id = cardio_prescricoes.aluno_id
    )
  );

-- Aluno lê as próprias prescrições
DROP POLICY IF EXISTS cardio_prescricoes_aluno_select ON public.cardio_prescricoes;
CREATE POLICY cardio_prescricoes_aluno_select
  ON public.cardio_prescricoes FOR SELECT
  TO authenticated
  USING (aluno_id = auth.uid());

-- Escrita do coach passa pelo gate de assinatura, como nas demais tabelas
DROP POLICY IF EXISTS cardio_prescricoes_coach_insert ON public.cardio_prescricoes;
CREATE POLICY cardio_prescricoes_coach_insert
  ON public.cardio_prescricoes FOR INSERT
  TO authenticated
  WITH CHECK (
    coach_id = auth.uid()
    AND public.coach_has_write_access()
    AND EXISTS (
      SELECT 1 FROM public.coach_alunos ca
      WHERE ca.coach_id = auth.uid() AND ca.aluno_id = cardio_prescricoes.aluno_id
    )
  );

DROP POLICY IF EXISTS cardio_prescricoes_coach_update ON public.cardio_prescricoes;
CREATE POLICY cardio_prescricoes_coach_update
  ON public.cardio_prescricoes FOR UPDATE
  TO authenticated
  USING (coach_id = auth.uid() AND public.coach_has_write_access())
  WITH CHECK (coach_id = auth.uid() AND public.coach_has_write_access());

DROP POLICY IF EXISTS cardio_prescricoes_coach_delete ON public.cardio_prescricoes;
CREATE POLICY cardio_prescricoes_coach_delete
  ON public.cardio_prescricoes FOR DELETE
  TO authenticated
  USING (coach_id = auth.uid() AND public.coach_has_write_access());

DROP POLICY IF EXISTS super_admin_cardio_prescricoes ON public.cardio_prescricoes;
CREATE POLICY super_admin_cardio_prescricoes
  ON public.cardio_prescricoes FOR ALL
  TO authenticated
  USING (public.get_auth_user_role() = 'super_admin');

-- ── cardio_sessoes ──────────────────────────────────────────────────────────
-- Aluno gerencia as próprias sessões
DROP POLICY IF EXISTS cardio_sessoes_aluno_select ON public.cardio_sessoes;
CREATE POLICY cardio_sessoes_aluno_select
  ON public.cardio_sessoes FOR SELECT
  TO authenticated
  USING (aluno_id = auth.uid());

DROP POLICY IF EXISTS cardio_sessoes_aluno_insert ON public.cardio_sessoes;
CREATE POLICY cardio_sessoes_aluno_insert
  ON public.cardio_sessoes FOR INSERT
  TO authenticated
  WITH CHECK (aluno_id = auth.uid());

DROP POLICY IF EXISTS cardio_sessoes_aluno_update ON public.cardio_sessoes;
CREATE POLICY cardio_sessoes_aluno_update
  ON public.cardio_sessoes FOR UPDATE
  TO authenticated
  USING (aluno_id = auth.uid())
  WITH CHECK (aluno_id = auth.uid());

DROP POLICY IF EXISTS cardio_sessoes_aluno_delete ON public.cardio_sessoes;
CREATE POLICY cardio_sessoes_aluno_delete
  ON public.cardio_sessoes FOR DELETE
  TO authenticated
  USING (aluno_id = auth.uid());

-- Coach lê as sessões dos próprios alunos (inclui sessões livres, sem prescrição)
DROP POLICY IF EXISTS cardio_sessoes_coach_select ON public.cardio_sessoes;
CREATE POLICY cardio_sessoes_coach_select
  ON public.cardio_sessoes FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.coach_alunos ca
      WHERE ca.coach_id = auth.uid() AND ca.aluno_id = cardio_sessoes.aluno_id
    )
  );

DROP POLICY IF EXISTS super_admin_cardio_sessoes ON public.cardio_sessoes;
CREATE POLICY super_admin_cardio_sessoes
  ON public.cardio_sessoes FOR ALL
  TO authenticated
  USING (public.get_auth_user_role() = 'super_admin');

-- ── updated_at ──────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.set_cardio_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_cardio_prescricoes_updated_at ON public.cardio_prescricoes;
CREATE TRIGGER trg_cardio_prescricoes_updated_at
  BEFORE UPDATE ON public.cardio_prescricoes
  FOR EACH ROW
  EXECUTE FUNCTION public.set_cardio_updated_at();

DROP TRIGGER IF EXISTS trg_cardio_sessoes_updated_at ON public.cardio_sessoes;
CREATE TRIGGER trg_cardio_sessoes_updated_at
  BEFORE UPDATE ON public.cardio_sessoes
  FOR EACH ROW
  EXECUTE FUNCTION public.set_cardio_updated_at();
