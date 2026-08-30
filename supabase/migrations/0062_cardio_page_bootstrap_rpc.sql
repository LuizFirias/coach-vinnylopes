-- ============================================================
-- 0087_cardio_page_bootstrap_rpc.sql
--
-- A tela de cardio do aluno faz 3 buscas em paralelo ao abrir (sessões,
-- prescrições ativas, 1 medida de peso pra saber se avisa "cadastre seu
-- peso") — ver app/aluno/cardio/page.tsx:fetchData. Junta as 3 numa função
-- só, mesmo padrão já aplicado na dashboard e na nutrição.
-- ============================================================

BEGIN;

CREATE OR REPLACE FUNCTION public.get_cardio_page_bootstrap(
  p_aluno_id UUID DEFAULT auth.uid()
)
RETURNS JSONB
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT jsonb_build_object(
    'sessoes', (
      SELECT COALESCE(jsonb_agg(row_to_json(s)), '[]'::jsonb)
      FROM (
        SELECT *
        FROM cardio_sessoes
        WHERE aluno_id = p_aluno_id
        ORDER BY data DESC
        LIMIT 60
      ) s
    ),
    'prescricoes', (
      SELECT COALESCE(jsonb_agg(row_to_json(p)), '[]'::jsonb)
      FROM (
        SELECT *
        FROM cardio_prescricoes
        WHERE aluno_id = p_aluno_id
          AND ativo = true
        ORDER BY created_at DESC
      ) p
    ),
    'tem_peso_cadastrado', (
      SELECT EXISTS (
        SELECT 1 FROM medidas_aluno
        WHERE aluno_id = p_aluno_id
          AND peso IS NOT NULL
        LIMIT 1
      )
    )
  );
$$;

GRANT EXECUTE ON FUNCTION public.get_cardio_page_bootstrap(UUID) TO authenticated;

COMMIT;
