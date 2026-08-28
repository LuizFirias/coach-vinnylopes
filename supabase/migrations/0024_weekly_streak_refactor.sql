-- Redefine a view de streak para contabilizar semanas seguidas em vez de dias consecutivos
-- A ofensiva é mantida se houver pelo menos um treino na semana (Seg-Dom)

CREATE OR REPLACE VIEW public.v_streak_aluno WITH (security_invoker) AS
WITH semanas_treino AS (
  SELECT DISTINCT
    aluno_id,
    date_trunc('week', data_conclusao) AS semana
  FROM v_historico_validos
),
gaps AS (
  SELECT
    aluno_id,
    semana,
    semana - (INTERVAL '1 week' * ROW_NUMBER() OVER (
      PARTITION BY aluno_id ORDER BY semana DESC
    ))::INTERVAL AS grupo
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
    AND g2.semana >= date_trunc('week', CURRENT_DATE - INTERVAL '1 week')
)
GROUP BY aluno_id;
