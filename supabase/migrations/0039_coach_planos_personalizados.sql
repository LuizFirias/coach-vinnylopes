-- ═══════════════════════════════════════════════════════════════
-- 0056: Planos de venda personalizados por coach
-- Cada coach pode criar/editar seus próprios planos (ex.: mentoria
-- de 2 meses). RLS garante isolamento total: o plano pertence apenas
-- ao coach que o criou — nada é global nem visível a outros coaches.
-- Os planos padrão (mensal/trimestral/semestral/anual) continuam
-- hardcoded no app; esta tabela guarda somente os personalizados.
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.coach_planos (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id       uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  nome           text NOT NULL
    CHECK (char_length(btrim(nome)) BETWEEN 2 AND 40),
  -- slug: valor gravado em profiles.tipo_plano / aluno_planos_historico.tipo_plano
  slug           text NOT NULL
    CHECK (slug ~ '^[a-z0-9][a-z0-9_]{1,39}$'),
  duracao_meses  integer NOT NULL
    CHECK (duracao_meses BETWEEN 1 AND 60),
  valor_sugerido numeric(12,2)
    CHECK (valor_sugerido IS NULL OR valor_sugerido >= 0),
  ativo          boolean NOT NULL DEFAULT true,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now(),
  UNIQUE (coach_id, slug),
  -- Slugs reservados dos planos padrão/globais — evita colisão de semântica
  CONSTRAINT coach_planos_slug_nao_reservado
    CHECK (slug NOT IN ('mensal', 'trimestral', 'semestral', 'anual', 'outros', 'sem_plano'))
);

CREATE INDEX IF NOT EXISTS idx_coach_planos_coach_ativo
  ON public.coach_planos (coach_id)
  WHERE ativo;

-- updated_at automático
CREATE OR REPLACE FUNCTION public.tg_coach_planos_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_coach_planos_updated_at ON public.coach_planos;
CREATE TRIGGER trg_coach_planos_updated_at
  BEFORE UPDATE ON public.coach_planos
  FOR EACH ROW
  EXECUTE FUNCTION public.tg_coach_planos_updated_at();

-- ───────────────────────────────────────────────────────────────
-- RLS: cada linha visível/mutável APENAS pelo coach dono
-- ───────────────────────────────────────────────────────────────
ALTER TABLE public.coach_planos ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.coach_planos FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.coach_planos TO authenticated;

DROP POLICY IF EXISTS coach_planos_select_own ON public.coach_planos;
CREATE POLICY coach_planos_select_own
  ON public.coach_planos
  FOR SELECT
  TO authenticated
  USING (coach_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS coach_planos_insert_own ON public.coach_planos;
CREATE POLICY coach_planos_insert_own
  ON public.coach_planos
  FOR INSERT
  TO authenticated
  WITH CHECK (coach_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS coach_planos_update_own ON public.coach_planos;
CREATE POLICY coach_planos_update_own
  ON public.coach_planos
  FOR UPDATE
  TO authenticated
  USING (coach_id = (SELECT auth.uid()))
  WITH CHECK (coach_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS coach_planos_delete_own ON public.coach_planos;
CREATE POLICY coach_planos_delete_own
  ON public.coach_planos
  FOR DELETE
  TO authenticated
  USING (coach_id = (SELECT auth.uid()));

-- ───────────────────────────────────────────────────────────────
-- aluno_planos_historico: o CHECK antigo só aceitava os 4 planos
-- padrão — relaxa para aceitar slugs de planos personalizados.
-- ───────────────────────────────────────────────────────────────
ALTER TABLE public.aluno_planos_historico
  DROP CONSTRAINT IF EXISTS aluno_planos_historico_tipo_plano_check;

ALTER TABLE public.aluno_planos_historico
  ADD CONSTRAINT aluno_planos_historico_tipo_plano_check
  CHECK (char_length(btrim(tipo_plano)) BETWEEN 2 AND 40);
