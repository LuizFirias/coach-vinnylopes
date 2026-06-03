-- ============================================================
-- 0021 · Fix detectar_prs_da_sessao: reps cast seguro
--
-- PROBLEMA: a linha `NULLIF(v_serie->>'reps', '')::INTEGER`
-- lança exceção quando reps contém formatos como "3x4", "12-15"
-- ou qualquer string não-inteira — o coach pode digitar esses
-- valores pois o placeholder da ficha mostra "12 ou 3x4".
-- Essa exceção não era capturada ANTES do CONTINUE WHEN,
-- então propagava e rollbackava o INSERT em historico_treinos.
--
-- CORREÇÃO:
--   1. Peso: cast dentro de bloco BEGIN/EXCEPTION para ignorar
--      valores não-numéricos.
--   2. Reps: regex '^\d+$' antes de cast — se não for inteiro
--      puro, define NULL (série ignorada pelo CONTINUE WHEN).
--   3. CONTINUE WHEN agora também pula reps > 100 e peso > 1000
--      (violam os CHECK constraints da tabela).
--   4. INSERT em recordes_pessoais dentro de BEGIN/EXCEPTION:
--      qualquer violação de constraint silenciosa — nunca
--      deve falhar o save do treino.
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
    -- Peso: cast tolerante (pode vir como string ou número)
    BEGIN
      v_peso := NULLIF(v_serie->>'peso_atual', '')::NUMERIC;
    EXCEPTION WHEN OTHERS THEN
      v_peso := NULL;
    END;

    -- Reps: aceita apenas inteiros puros — rejeita "3x4", "12-15", etc.
    IF (v_serie->>'reps') ~ '^\d+$' THEN
      v_reps := (v_serie->>'reps')::INTEGER;
    ELSE
      v_reps := NULL;
    END IF;

    v_completado := COALESCE((v_serie->>'completado')::BOOLEAN, false);

    -- Ignorar séries inválidas: não completadas, sem peso/reps, fora dos
    -- limites do CHECK constraint (peso <= 1000, reps BETWEEN 1 AND 100)
    CONTINUE WHEN NOT v_completado
               OR v_peso IS NULL OR v_peso <= 0 OR v_peso > 1000
               OR v_reps IS NULL OR v_reps < 1 OR v_reps > 100;

    SELECT peso INTO v_pr_atual
    FROM recordes_pessoais
    WHERE aluno_id     = v_aluno_id
      AND exercicio_id = v_exercicio_id
      AND reps         = v_reps;

    IF v_pr_atual IS NULL OR v_peso > v_pr_atual THEN
      BEGIN
        INSERT INTO recordes_pessoais (aluno_id, exercicio_id, peso, reps, historico_id)
        VALUES (v_aluno_id, v_exercicio_id, v_peso, v_reps, p_historico_id)
        ON CONFLICT (aluno_id, exercicio_id, reps)
        DO UPDATE SET
          peso           = EXCLUDED.peso,
          historico_id   = EXCLUDED.historico_id,
          conquistado_em = NOW();

        v_count := v_count + 1;
      EXCEPTION WHEN OTHERS THEN
        NULL;
      END;
    END IF;
  END LOOP;

  RETURN v_count;
END;
$$;
