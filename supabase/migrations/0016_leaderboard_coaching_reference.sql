-- Add coaching_reference to v_leaderboard so student ranking shows real names
-- Most students have coaching_reference set but not full_name

DROP VIEW IF EXISTS public.v_leaderboard;

CREATE VIEW public.v_leaderboard AS
SELECT
  p.id                               AS aluno_id,
  p.full_name,
  p.coaching_reference,
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
