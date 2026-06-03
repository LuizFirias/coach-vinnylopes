-- Fix: Remover SECURITY DEFINER desnecessário
-- Problema: Supabase Security Advisor reporta views como tendo SECURITY DEFINER
-- Causa raiz: Funções com SECURITY DEFINER que usam essas views
-- Solução: Remover SECURITY DEFINER de funções read-only (como get_kpis_aluno)
--         e recriar views com SECURITY INVOKER explícito
-- Ref: https://supabase.com/docs/guides/database/database-linter?lint=0010_security_definer_view

BEGIN;

-- ============================================================
-- 1. Remover SECURITY DEFINER de get_kpis_aluno (função read-only)
-- Recria sem SECURITY DEFINER para respeitar RLS do usuário
-- ============================================================

DROP FUNCTION IF EXISTS public.get_kpis_aluno(UUID);

CREATE OR REPLACE FUNCTION public.get_kpis_aluno(p_aluno_id UUID DEFAULT auth.uid())
RETURNS JSONB
LANGUAGE plpgsql
STABLE
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
  FROM public.v_historico_validos
  WHERE aluno_id = p_aluno_id
    AND data_conclusao >= date_trunc('month', NOW());

  -- Treinos mês anterior
  SELECT COUNT(*)::INTEGER INTO v_treinos_mes_anterior
  FROM public.v_historico_validos
  WHERE aluno_id = p_aluno_id
    AND data_conclusao >= date_trunc('month', NOW() - INTERVAL '1 month')
    AND data_conclusao <  date_trunc('month', NOW());

  -- Streak
  SELECT streak_atual INTO v_streak
  FROM public.v_streak_aluno
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
-- 2. Drop all dependent views in correct order
-- ============================================================

DROP VIEW IF EXISTS public.v_atletas_ativos_semana CASCADE;
DROP VIEW IF EXISTS public.v_leaderboard CASCADE;
DROP VIEW IF EXISTS public.v_streak_aluno CASCADE;
DROP VIEW IF EXISTS public.v_historico_validos CASCADE;

-- ============================================================
-- 3. Recriar v_historico_validos com SECURITY INVOKER
-- ============================================================

CREATE VIEW public.v_historico_validos WITH (security_invoker) AS
SELECT h.*
FROM historico_treinos h
WHERE EXISTS (
  SELECT 1
  FROM jsonb_array_elements(COALESCE(h.dados_sessao->'series', '[]'::jsonb)) AS s
  WHERE COALESCE((s->>'completado')::BOOLEAN, false) = true
    AND COALESCE(NULLIF(s->>'peso_atual', '')::NUMERIC, 0) > 0
);

GRANT SELECT ON public.v_historico_validos TO authenticated;

-- ============================================================
-- 4. Recriar v_streak_aluno com SECURITY INVOKER
-- ============================================================

CREATE VIEW public.v_streak_aluno WITH (security_invoker) AS
WITH dias_treino AS (
  SELECT DISTINCT
    aluno_id,
    DATE(data_conclusao) AS dia
  FROM public.v_historico_validos
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

GRANT SELECT ON public.v_streak_aluno TO authenticated;

-- ============================================================
-- 5. Recriar v_leaderboard com SECURITY INVOKER
-- ============================================================

CREATE VIEW public.v_leaderboard WITH (security_invoker) AS
SELECT
  p.id                               AS aluno_id,
  p.full_name,
  p.avatar_url,
  COALESCE(pa.total_pontos, 0)       AS pontos,
  COALESCE(s.streak_atual, 0)        AS streak,
  ROW_NUMBER() OVER (
    ORDER BY COALESCE(pa.total_pontos, 0) DESC
  )                                  AS posicao
FROM public.profiles p
LEFT JOIN public.pontuacao_alunos pa ON pa.aluno_id = p.id
LEFT JOIN public.v_streak_aluno s ON s.aluno_id = p.id
WHERE p.role = 'aluno'
  AND COALESCE(p.arquivado, false) = false
  AND COALESCE(p.oculto_no_ranking, false) = false;

GRANT SELECT ON public.v_leaderboard TO authenticated;

-- ============================================================
-- 6. Recriar v_atletas_ativos_semana com SECURITY INVOKER
-- ============================================================

CREATE VIEW public.v_atletas_ativos_semana WITH (security_invoker) AS
SELECT COUNT(DISTINCT aluno_id)::INTEGER AS quantidade
FROM public.v_historico_validos
WHERE data_conclusao >= date_trunc('week', NOW());

GRANT SELECT ON public.v_atletas_ativos_semana TO authenticated;

COMMIT;

-- ============================================================
-- NOTES
-- ============================================================
--
-- What changed:
-- 1. get_kpis_aluno: Removed SECURITY DEFINER (was unnecessary for read-only)
-- 2. All 4 views: Explicitly use WITH (security_invoker) syntax (PostgreSQL 15+)
--
-- If Supabase uses PostgreSQL < 15:
-- - Remove "WITH (security_invoker)" from CREATE VIEW statements
-- - SECURITY INVOKER is the default and doesn't need explicit syntax
--
-- ROLLBACK:
-- Reapply migrations 0005_sprint3_dashboard.sql and 0008_sprint6_pontuacao.sql
