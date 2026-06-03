-- Sprint 2: Tabela de recordes pessoais + detecção automática de PRs via trigger
-- Aplicar em staging primeiro, depois produção (janela de manutenção)
-- Rollback: ver comentário no final do arquivo

BEGIN;

-- ============================================================
-- Tabela: recordes_pessoais
-- Melhor peso por (aluno, exercício, número de reps).
-- UNIQUE garante 1 PR por faixa de repetição.
-- Inserts apenas via trigger — nunca direto pelo cliente (policy bloqueia).
-- ============================================================

CREATE TABLE IF NOT EXISTS public.recordes_pessoais (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  aluno_id        UUID NOT NULL REFERENCES profiles(id),
  exercicio_id    UUID NOT NULL REFERENCES exercicios_biblioteca(id),
  peso            NUMERIC(6,2) NOT NULL CHECK (peso >= 0 AND peso <= 1000),
  reps            INTEGER NOT NULL CHECK (reps BETWEEN 1 AND 100),
  historico_id    UUID REFERENCES historico_treinos(id) ON DELETE SET NULL,
  conquistado_em  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (aluno_id, exercicio_id, reps)
);

CREATE INDEX IF NOT EXISTS idx_recordes_aluno
  ON recordes_pessoais(aluno_id, conquistado_em DESC);

ALTER TABLE recordes_pessoais ENABLE ROW LEVEL SECURITY;

-- Aluno lê apenas seus próprios PRs
CREATE POLICY "alunos_leem_proprios_prs"
  ON recordes_pessoais FOR SELECT
  USING (auth.uid() = aluno_id);

-- Coach lê PRs dos alunos vinculados
CREATE POLICY "coaches_leem_prs_dos_alunos"
  ON recordes_pessoais FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM coach_alunos
      WHERE coach_id = auth.uid()
        AND aluno_id = recordes_pessoais.aluno_id
    )
  );

-- Inserts apenas via função SECURITY DEFINER (trigger) — nunca direto
CREATE POLICY "ninguem_insere_pr_diretamente"
  ON recordes_pessoais FOR INSERT
  WITH CHECK (false);

COMMIT;

-- ============================================================
-- Função: detectar_prs_da_sessao
-- Percorre as séries de um historico_treinos e faz UPSERT
-- em recordes_pessoais para cada PR batido.
-- Retorna quantidade de PRs detectados.
--
-- Adaptada ao formato real de dados_sessao:
--   series[].peso_atual  (número ou string)
--   series[].reps        (número ou string)
--   series[].completado  (boolean)
-- ============================================================

CREATE OR REPLACE FUNCTION public.detectar_prs_da_sessao(p_historico_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_aluno_id     UUID;
  v_exercicio_id UUID;
  v_dados        JSONB;
  v_serie        JSONB;
  v_peso         NUMERIC;
  v_reps         INTEGER;
  v_completado   BOOLEAN;
  v_pr_atual     NUMERIC;
  v_count        INTEGER := 0;
BEGIN
  SELECT aluno_id, exercicio_id, dados_sessao
    INTO v_aluno_id, v_exercicio_id, v_dados
  FROM historico_treinos
  WHERE id = p_historico_id;

  IF v_dados IS NULL OR NOT (v_dados ? 'series') THEN
    RETURN 0;
  END IF;

  FOR v_serie IN SELECT * FROM jsonb_array_elements(v_dados->'series')
  LOOP
    -- Cast tolerante: peso_atual e reps podem vir como string ou número
    v_peso       := NULLIF(v_serie->>'peso_atual', '')::NUMERIC;
    v_reps       := NULLIF(v_serie->>'reps', '')::INTEGER;
    v_completado := COALESCE((v_serie->>'completado')::BOOLEAN, false);

    -- Ignorar séries não completadas, sem peso ou sem reps válidos
    CONTINUE WHEN NOT v_completado
               OR v_peso IS NULL OR v_peso <= 0
               OR v_reps IS NULL OR v_reps < 1;

    -- PR atual para esta combinação (aluno + exercício + reps)
    SELECT peso INTO v_pr_atual
    FROM recordes_pessoais
    WHERE aluno_id    = v_aluno_id
      AND exercicio_id = v_exercicio_id
      AND reps        = v_reps;

    -- Apenas atualiza se peso novo é maior
    IF v_pr_atual IS NULL OR v_peso > v_pr_atual THEN
      INSERT INTO recordes_pessoais (aluno_id, exercicio_id, peso, reps, historico_id)
      VALUES (v_aluno_id, v_exercicio_id, v_peso, v_reps, p_historico_id)
      ON CONFLICT (aluno_id, exercicio_id, reps)
      DO UPDATE SET
        peso           = EXCLUDED.peso,
        historico_id   = EXCLUDED.historico_id,
        conquistado_em = NOW();

      v_count := v_count + 1;
    END IF;
  END LOOP;

  RETURN v_count;
END;
$$;

GRANT EXECUTE ON FUNCTION public.detectar_prs_da_sessao(UUID) TO authenticated;

-- ============================================================
-- Trigger: dispara detectar_prs_da_sessao após INSERT ou UPDATE
-- de dados_sessao em historico_treinos.
-- ============================================================

CREATE OR REPLACE FUNCTION public.trg_detectar_prs()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Otimização: só roda se dados_sessao foi inserido/alterado
  IF TG_OP = 'INSERT'
     OR (TG_OP = 'UPDATE' AND NEW.dados_sessao IS DISTINCT FROM OLD.dados_sessao)
  THEN
    PERFORM detectar_prs_da_sessao(NEW.id);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_historico_treino_modificado ON historico_treinos;

CREATE TRIGGER on_historico_treino_modificado
  AFTER INSERT OR UPDATE OF dados_sessao ON historico_treinos
  FOR EACH ROW EXECUTE FUNCTION trg_detectar_prs();

-- ============================================================
-- Backfill (rodar UMA VEZ após criar a função, fora de BEGIN/COMMIT)
-- Detecta PRs em todas as sessões históricas existentes.
-- ============================================================
-- SELECT id, detectar_prs_da_sessao(id) AS prs_detectados
-- FROM historico_treinos
-- ORDER BY data_conclusao ASC;

-- ============================================================
-- ROLLBACK
-- DROP TRIGGER IF EXISTS on_historico_treino_modificado ON historico_treinos;
-- DROP FUNCTION IF EXISTS public.trg_detectar_prs();
-- DROP FUNCTION IF EXISTS public.detectar_prs_da_sessao(UUID);
-- DROP TABLE IF EXISTS public.recordes_pessoais;
-- ============================================================
