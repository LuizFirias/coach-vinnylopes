-- ============================================================
-- 0086_nutrition_page_bootstrap_rpc.sql
--
-- A tela de nutrição do aluno faz 4 buscas em paralelo ao abrir
-- (nutrition_plans com embed profundo, plano_alimentar_pdf, registros_agua,
-- nutrition_meal_checkins) — ver lib/nutrition/plans.ts:loadStudentNutritionPageData.
--
-- A de nutrition_plans já é 1 requisição só mesmo sendo "funda" (o embed do
-- PostgREST já vira 1 query no banco) — deixamos ela como está, arriscado
-- reescrever esse embed de 4 níveis à mão. As outras 3 são tabelas simples
-- (1 tabela, sem join) e viram 1 RPC só aqui, reduzindo a rajada de 4
-- conexões simultâneas pra 2.
-- ============================================================

BEGIN;

CREATE OR REPLACE FUNCTION public.get_nutrition_page_extras(
  p_aluno_id UUID DEFAULT auth.uid(),
  p_today    DATE DEFAULT NULL
)
RETURNS JSONB
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT jsonb_build_object(
    'plano_alimentar_pdf', (
      SELECT COALESCE(jsonb_agg(row_to_json(pp) ORDER BY pp.criado_em DESC), '[]'::jsonb)
      FROM (
        SELECT id, aluno_id, nome_arquivo, descricao, criado_em, url_pdf
        FROM plano_alimentar_pdf
        WHERE aluno_id = p_aluno_id
      ) pp
    ),
    'registros_agua', (
      SELECT row_to_json(r) FROM (
        SELECT id, copos, ml_por_copo
        FROM registros_agua
        WHERE aluno_id = p_aluno_id
          AND data_registro = p_today
      ) r
    ),
    'nutrition_meal_checkins', (
      SELECT COALESCE(jsonb_agg(row_to_json(c)), '[]'::jsonb)
      FROM (
        SELECT meal_id, status
        FROM nutrition_meal_checkins
        WHERE student_id = p_aluno_id
          AND checkin_date = p_today
      ) c
    )
  );
$$;

GRANT EXECUTE ON FUNCTION public.get_nutrition_page_extras(UUID, DATE) TO authenticated;

COMMIT;
