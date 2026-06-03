-- Sprint 3: Views e função de KPIs para o dashboard
-- Ordem: G0 → G → H (dependências em cascata)
-- Rollback: ver comentário no final

-- ============================================================
-- Bloco G0 — View base: v_historico_validos
-- Filtra historico_treinos para sessões com ≥1 série
-- completada com peso_atual > 0. Exclui templates/placeholders.
-- DEPENDÊNCIA de: v_streak_aluno, get_kpis_aluno (abaixo)
-- ============================================================

CREATE OR REPLACE VIEW public.v_historico_validos AS
SELECT h.*
FROM historico_treinos h
WHERE EXISTS (
  SELECT 1
  FROM jsonb_array_elements(COALESCE(h.dados_sessao->'series', '[]'::jsonb)) AS s
  WHERE COALESCE((s->>'completado')::BOOLEAN, false) = true
    AND COALESCE(NULLIF(s->>'peso_atual', '')::NUMERIC, 0) > 0
);

GRANT SELECT ON v_historico_validos TO authenticated;

-- ============================================================
-- Bloco G — View: v_streak_aluno
-- Streak atual por aluno (dias consecutivos com treino válido).
-- Tolera 1 dia de folga (academia fecha, aluno não foi ontem).
-- ============================================================

CREATE OR REPLACE VIEW public.v_streak_aluno AS
WITH dias_treino AS (
  SELECT DISTINCT
    aluno_id,
    DATE(data_conclusao) AS dia
  FROM v_historico_validos
),
gaps AS (
  SELECT
    aluno_id,
    dia,
    dia - (INTERVAL '1 day' * ROW_NUMBER() OVER (
      PARTITION BY aluno_id ORDER BY dia DESC
    ))::INTERVAL AS grupo
  FROM dias_treino
)
SELECT
  aluno_id,
  COUNT(*)::INTEGER AS streak_atual
FROM gaps
WHERE grupo = (
  SELECT MAX(g2.grupo)
  FROM gaps g2
  WHERE g2.aluno_id = gaps.aluno_id
    AND g2.dia >= CURRENT_DATE - INTERVAL '2 days'
)
GROUP BY aluno_id;

GRANT SELECT ON v_streak_aluno TO authenticated;

-- ============================================================
-- Bloco H — Função: get_kpis_aluno(p_aluno_id)
-- Retorna JSONB com todos os KPIs do dashboard:
--   volume_semana_kg, volume_delta_pct
--   peso_atual_kg, peso_delta_kg
--   treinos_mes, treinos_delta
--   streak_atual
-- ============================================================

CREATE OR REPLACE FUNCTION public.get_kpis_aluno(p_aluno_id UUID DEFAULT auth.uid())
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_volume_semana          NUMERIC := 0;
  v_volume_semana_anterior NUMERIC := 0;
  v_peso_atual             NUMERIC;
  v_peso_30d               NUMERIC;
  v_treinos_mes            INTEGER := 0;
  v_treinos_mes_anterior   INTEGER := 0;
  v_streak                 INTEGER := 0;
BEGIN
  -- Volume semana atual (soma peso × reps de séries completadas com peso > 0)
  SELECT COALESCE(SUM(
    (SELECT COALESCE(SUM(
        NULLIF(serie->>'peso_atual', '')::NUMERIC *
        CASE
          WHEN jsonb_typeof(serie->'reps') = 'number'
            THEN (serie->>'reps')::NUMERIC
          ELSE COALESCE(NULLIF(serie->>'reps', '')::NUMERIC, 0)
        END
      ), 0)
    FROM jsonb_array_elements(COALESCE(h.dados_sessao->'series', '[]'::jsonb)) AS serie
    WHERE COALESCE((serie->>'completado')::BOOLEAN, false) = true
      AND COALESCE(NULLIF(serie->>'peso_atual', '')::NUMERIC, 0) > 0
    )
  ), 0) INTO v_volume_semana
  FROM historico_treinos h
  WHERE h.aluno_id = p_aluno_id
    AND h.data_conclusao >= date_trunc('week', NOW());

  -- Volume semana anterior
  SELECT COALESCE(SUM(
    (SELECT COALESCE(SUM(
        NULLIF(serie->>'peso_atual', '')::NUMERIC *
        CASE
          WHEN jsonb_typeof(serie->'reps') = 'number'
            THEN (serie->>'reps')::NUMERIC
          ELSE COALESCE(NULLIF(serie->>'reps', '')::NUMERIC, 0)
        END
      ), 0)
    FROM jsonb_array_elements(COALESCE(h.dados_sessao->'series', '[]'::jsonb)) AS serie
    WHERE COALESCE((serie->>'completado')::BOOLEAN, false) = true
      AND COALESCE(NULLIF(serie->>'peso_atual', '')::NUMERIC, 0) > 0
    )
  ), 0) INTO v_volume_semana_anterior
  FROM historico_treinos h
  WHERE h.aluno_id = p_aluno_id
    AND h.data_conclusao >= date_trunc('week', NOW() - INTERVAL '1 week')
    AND h.data_conclusao <  date_trunc('week', NOW());

  -- Peso atual (medida mais recente)
  SELECT peso INTO v_peso_atual
  FROM medidas_aluno
  WHERE aluno_id = p_aluno_id AND peso IS NOT NULL
  ORDER BY data_medicao DESC
  LIMIT 1;

  -- Peso há ~30 dias
  SELECT peso INTO v_peso_30d
  FROM medidas_aluno
  WHERE aluno_id = p_aluno_id
    AND peso IS NOT NULL
    AND data_medicao <= NOW() - INTERVAL '30 days'
  ORDER BY data_medicao DESC
  LIMIT 1;

  -- Treinos mês atual (apenas sessões válidas)
  SELECT COUNT(*)::INTEGER INTO v_treinos_mes
  FROM v_historico_validos
  WHERE aluno_id = p_aluno_id
    AND data_conclusao >= date_trunc('month', NOW());

  -- Treinos mês anterior
  SELECT COUNT(*)::INTEGER INTO v_treinos_mes_anterior
  FROM v_historico_validos
  WHERE aluno_id = p_aluno_id
    AND data_conclusao >= date_trunc('month', NOW() - INTERVAL '1 month')
    AND data_conclusao <  date_trunc('month', NOW());

  -- Streak
  SELECT streak_atual INTO v_streak
  FROM v_streak_aluno
  WHERE aluno_id = p_aluno_id;

  RETURN jsonb_build_object(
    'volume_semana_kg',   ROUND(v_volume_semana::NUMERIC, 1),
    'volume_delta_pct',   CASE
      WHEN v_volume_semana_anterior > 0
        THEN ROUND(((v_volume_semana - v_volume_semana_anterior)
                    / v_volume_semana_anterior * 100)::NUMERIC, 1)
      ELSE NULL
    END,
    'peso_atual_kg',      v_peso_atual,
    'peso_delta_kg',      CASE
      WHEN v_peso_30d IS NOT NULL AND v_peso_atual IS NOT NULL
        THEN ROUND((v_peso_atual - v_peso_30d)::NUMERIC, 1)
      ELSE NULL
    END,
    'treinos_mes',        v_treinos_mes,
    'treinos_delta',      v_treinos_mes - v_treinos_mes_anterior,
    'streak_atual',       COALESCE(v_streak, 0)
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_kpis_aluno(UUID) TO authenticated;

-- ============================================================
-- ROLLBACK
-- DROP FUNCTION IF EXISTS public.get_kpis_aluno(UUID);
-- DROP VIEW IF EXISTS public.v_streak_aluno;
-- DROP VIEW IF EXISTS public.v_historico_validos;
-- ============================================================
