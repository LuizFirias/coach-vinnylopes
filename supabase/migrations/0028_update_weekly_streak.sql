-- Migration: Update streak calculation to weekly instead of daily
-- Redefines v_streak_aluno to compute consecutive training weeks and recreates v_leaderboard.

DROP VIEW IF EXISTS public.v_leaderboard CASCADE;
DROP VIEW IF EXISTS public.v_streak_aluno CASCADE;

-- 1. Create v_streak_aluno with weekly logic
CREATE VIEW public.v_streak_aluno WITH (security_invoker) AS
WITH semanas_treino AS (
  SELECT DISTINCT
    aluno_id,
    date_trunc('week', data_conclusao)::date AS semana
  FROM public.v_historico_validos
),
gaps AS (
  SELECT
    aluno_id,
    semana,
    (semana - (INTERVAL '1 week' * ROW_NUMBER() OVER (
      PARTITION BY aluno_id ORDER BY semana DESC
    )))::date AS grupo
  FROM semanas_treino
)
SELECT
  aluno_id,
  COUNT(*)::INTEGER AS streak_atual
FROM gaps
WHERE grupo = (
  SELECT MAX(g2.grupo)
  FROM gaps g2
  WHERE g2.aluno_id = gaps.aluno_id
    AND g2.semana >= date_trunc('week', CURRENT_DATE - INTERVAL '1 week')::date
)
GROUP BY aluno_id;

GRANT SELECT ON public.v_streak_aluno TO authenticated;

-- 2. Recriar v_leaderboard
CREATE VIEW public.v_leaderboard WITH (security_invoker) AS
SELECT
  p.id                               AS aluno_id,
  p.full_name,
  p.avatar_url,
  p.coaching_reference,
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
