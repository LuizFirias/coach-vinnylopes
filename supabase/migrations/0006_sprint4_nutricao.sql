-- Sprint 4: Nutrição estruturada
-- Tabelas: refeicoes_plano, consumos_refeicao, registros_agua
-- Rollback: ver comentário no final

-- ============================================================
-- Bloco I — Tabelas de nutrição estruturada
-- ============================================================

BEGIN;

CREATE TABLE public.refeicoes_plano (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plano_id          UUID NOT NULL REFERENCES plano_alimentar_pdf(id) ON DELETE CASCADE,
  nome              TEXT NOT NULL,
  horario_sugerido  TIME,
  ordem             INTEGER NOT NULL DEFAULT 0,
  ingredientes      JSONB NOT NULL DEFAULT '[]'::jsonb,
  observacoes       TEXT,
  criado_em         TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_refeicoes_plano ON refeicoes_plano(plano_id, ordem);

CREATE TABLE public.consumos_refeicao (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  aluno_id      UUID NOT NULL REFERENCES profiles(id),
  refeicao_id   UUID NOT NULL REFERENCES refeicoes_plano(id) ON DELETE CASCADE,
  data_consumo  DATE NOT NULL DEFAULT CURRENT_DATE,
  consumido_em  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  observacoes   TEXT,
  UNIQUE (aluno_id, refeicao_id, data_consumo)
);

CREATE INDEX idx_consumos_aluno_data ON consumos_refeicao(aluno_id, data_consumo DESC);

CREATE TABLE public.registros_agua (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  aluno_id        UUID NOT NULL REFERENCES profiles(id),
  data_registro   DATE NOT NULL DEFAULT CURRENT_DATE,
  copos           INTEGER NOT NULL DEFAULT 0 CHECK (copos BETWEEN 0 AND 20),
  ml_por_copo     INTEGER NOT NULL DEFAULT 250,
  atualizado_em   TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (aluno_id, data_registro)
);

CREATE INDEX idx_agua_aluno_data ON registros_agua(aluno_id, data_registro DESC);

-- RLS
ALTER TABLE refeicoes_plano   ENABLE ROW LEVEL SECURITY;
ALTER TABLE consumos_refeicao ENABLE ROW LEVEL SECURITY;
ALTER TABLE registros_agua    ENABLE ROW LEVEL SECURITY;

-- refeicoes_plano: aluno lê refeições do próprio plano; coach gerencia
CREATE POLICY "alunos_leem_refeicoes_proprio_plano"
  ON refeicoes_plano FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM plano_alimentar_pdf p
      WHERE p.id = refeicoes_plano.plano_id
        AND (p.aluno_id = auth.uid() OR p.coach_id = auth.uid())
    )
  );

CREATE POLICY "coaches_gerenciam_refeicoes"
  ON refeicoes_plano FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM plano_alimentar_pdf p
      WHERE p.id = refeicoes_plano.plano_id AND p.coach_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM plano_alimentar_pdf p
      WHERE p.id = refeicoes_plano.plano_id AND p.coach_id = auth.uid()
    )
  );

-- consumos_refeicao: aluno gerencia os próprios
CREATE POLICY "alunos_gerenciam_proprios_consumos"
  ON consumos_refeicao FOR ALL
  USING (auth.uid() = aluno_id)
  WITH CHECK (auth.uid() = aluno_id);

-- registros_agua: aluno gerencia os próprios
CREATE POLICY "alunos_gerenciam_propria_agua"
  ON registros_agua FOR ALL
  USING (auth.uid() = aluno_id)
  WITH CHECK (auth.uid() = aluno_id);

COMMIT;

-- ============================================================
-- ROLLBACK
-- DROP TABLE IF EXISTS public.consumos_refeicao;
-- DROP TABLE IF EXISTS public.registros_agua;
-- DROP TABLE IF EXISTS public.refeicoes_plano;
-- ============================================================
