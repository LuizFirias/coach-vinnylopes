-- Corrige a view v_streak_aluno: o truque "gaps and islands" usava sinal
-- errado no agrupamento por semanas consecutivas, o que fazia toda semana
-- virar uma "ilha" isolada e o streak nunca passar de 1, mesmo treinando
-- semanas seguidas.
--
-- ORDER BY semana DESC exige SOMAR (semana + intervalo * row_number) para
-- que semanas consecutivas caiam no mesmo grupo — a versão anterior (0028)
-- SUBTRAÍA, o que quebrava o agrupamento.

BEGIN;

DROP VIEW IF EXISTS public.v_leaderboard CASCADE;
DROP VIEW IF EXISTS public.v_streak_aluno CASCADE;

CREATE VIEW public.v_streak_aluno WITH (security_invoker) AS
WITH semanas_treino AS (
  SELECT DISTINCT aluno_id, date_trunc('week', data_conclusao)::date AS semana
  FROM public.v_historico_validos
),
gaps AS (
  SELECT aluno_id, semana,
    (semana + (INTERVAL '1 week' * ROW_NUMBER() OVER (
      PARTITION BY aluno_id ORDER BY semana DESC
    )))::date AS grupo
  FROM semanas_treino
)
SELECT aluno_id, COUNT(*)::INTEGER AS streak_atual
FROM gaps
WHERE grupo = (
  SELECT MAX(g2.grupo) FROM gaps g2
  WHERE g2.aluno_id = gaps.aluno_id
    AND g2.semana >= date_trunc('week', CURRENT_DATE - INTERVAL '1 week')::date
)
GROUP BY aluno_id;

-- Recria v_leaderboard EXATAMENTE como está hoje em produção (mesma
-- definição do schema-dump), só apontando pra v_streak_aluno corrigida.
CREATE VIEW public.v_leaderboard WITH (security_invoker='on') AS
 SELECT p.id AS aluno_id,
    p.full_name,
    p.coaching_reference,
    p.avatar_url,
    COALESCE(pa.total_pontos, 0) AS pontos,
    COALESCE(s.streak_atual, 0) AS streak,
    row_number() OVER (ORDER BY COALESCE(pa.total_pontos, 0) DESC) AS posicao
   FROM ((public.profiles p
     LEFT JOIN public.pontuacao_alunos pa ON ((pa.aluno_id = p.id)))
     LEFT JOIN public.v_streak_aluno s ON ((s.aluno_id = p.id)))
  WHERE ((p.role = 'aluno'::text) AND (COALESCE(p.arquivado, false) = false) AND (COALESCE(p.oculto_no_ranking, false) = false));

COMMIT;
