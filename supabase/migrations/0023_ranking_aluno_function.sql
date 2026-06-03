-- ============================================================
-- 0023 · Ranking para alunos: função SECURITY DEFINER
--
-- Problema: migration 0022 adicionou RLS em coach_alunos
-- que bloqueia alunos de ler seus próprios vínculos de coach.
-- v_leaderboard usa SECURITY INVOKER, então segue o RLS de
-- profiles que limita alunos ao próprio perfil.
--
-- Solução: função SECURITY DEFINER que encontra o coach do
-- aluno autenticado e retorna o leaderboard filtrado apenas
-- aos alunos do mesmo coach.
--
-- Tipos escolhidos para corresponder ao schema real:
--   full_name / coaching_reference / avatar_url → text (cast explícito)
--   pontos → integer  (pontuacao_alunos.total_pontos = INTEGER)
--   streak → integer  (v_streak_aluno.streak_atual = COUNT()::INTEGER)
-- ============================================================

DROP FUNCTION IF EXISTS get_ranking_colegas(text, timestamptz, timestamptz);

CREATE OR REPLACE FUNCTION get_ranking_colegas(
  p_periodo        text          DEFAULT 'total',
  p_inicio_periodo timestamptz   DEFAULT null,
  p_fim_periodo    timestamptz   DEFAULT null
)
RETURNS TABLE(
  aluno_id          uuid,
  full_name         text,
  coaching_reference text,
  avatar_url        text,
  pontos            integer,
  streak            integer
)
SECURITY DEFINER
SET search_path = public
LANGUAGE plpgsql AS $$
DECLARE
  v_coach_id uuid;
BEGIN
  -- Encontra o coach do usuário autenticado
  SELECT ca.coach_id INTO v_coach_id
  FROM coach_alunos ca
  WHERE ca.aluno_id = auth.uid()
  LIMIT 1;

  IF p_periodo = 'total' THEN
    RETURN QUERY
    SELECT
      p.id                                           AS aluno_id,
      p.full_name::text,
      p.coaching_reference::text,
      p.avatar_url::text,
      COALESCE(pa.total_pontos, 0)::integer          AS pontos,
      COALESCE(vs.streak_atual,  0)::integer         AS streak
    FROM (
      SELECT ca2.aluno_id FROM coach_alunos ca2 WHERE ca2.coach_id = v_coach_id
      UNION
      SELECT auth.uid()
    ) colegas
    JOIN profiles p ON p.id = colegas.aluno_id
    LEFT JOIN pontuacao_alunos pa  ON pa.aluno_id = p.id
    LEFT JOIN v_streak_aluno   vs  ON vs.aluno_id = p.id
    WHERE COALESCE(p.arquivado, false)         = false
      AND COALESCE(p.oculto_no_ranking, false) = false
    ORDER BY COALESCE(pa.total_pontos, 0) DESC;

  ELSE
    -- Cálculo mensal (p_inicio_periodo e p_fim_periodo obrigatórios)
    RETURN QUERY
    WITH colegas_ids AS (
      SELECT ca2.aluno_id FROM coach_alunos ca2 WHERE ca2.coach_id = v_coach_id
      UNION SELECT auth.uid()
    ),
    sessoes AS (
      SELECT
        ht.aluno_id,
        (COUNT(DISTINCT date_trunc('day', ht.data_conclusao)) * 20)::integer AS pts
      FROM historico_treinos ht
      JOIN colegas_ids c ON c.aluno_id = ht.aluno_id
      WHERE ht.data_conclusao >= p_inicio_periodo
        AND ht.data_conclusao <= p_fim_periodo
      GROUP BY ht.aluno_id
    ),
    manuais AS (
      SELECT
        tm.aluno_id,
        COALESCE(SUM(tm.pontos_earn), 0)::integer AS pts
      FROM treinos_manuais tm
      JOIN colegas_ids c ON c.aluno_id = tm.aluno_id
      WHERE tm.concluido = true
        AND tm.data_treino >= p_inicio_periodo::date
        AND tm.data_treino <= p_fim_periodo::date
      GROUP BY tm.aluno_id
    )
    SELECT
      p.id                                                         AS aluno_id,
      p.full_name::text,
      p.coaching_reference::text,
      p.avatar_url::text,
      (COALESCE(s.pts, 0) + COALESCE(m.pts, 0))::integer          AS pontos,
      0::integer                                                   AS streak
    FROM colegas_ids ci
    JOIN profiles p ON p.id = ci.aluno_id
    LEFT JOIN sessoes  s ON s.aluno_id = p.id
    LEFT JOIN manuais  m ON m.aluno_id = p.id
    WHERE COALESCE(p.arquivado, false)         = false
      AND COALESCE(p.oculto_no_ranking, false) = false
    ORDER BY (COALESCE(s.pts, 0) + COALESCE(m.pts, 0)) DESC;
  END IF;
END;
$$;

GRANT EXECUTE ON FUNCTION get_ranking_colegas(text, timestamptz, timestamptz) TO authenticated;
REVOKE EXECUTE ON FUNCTION get_ranking_colegas(text, timestamptz, timestamptz) FROM anon;

-- ============================================================
-- Verificação pós-aplicação:
--
-- SELECT * FROM get_ranking_colegas('total');
-- SELECT * FROM get_ranking_colegas(
--   'mes_atual',
--   date_trunc('month', now()),
--   (date_trunc('month', now()) + interval '1 month' - interval '1 second')
-- );
-- ============================================================
