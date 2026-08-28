-- ============================================================
-- 0085_dashboard_bootstrap_rpc.sql
--
-- Continuação da 0084: junta o resto das buscas paralelas que a dashboard do
-- aluno faz no primeiro carregamento.
--
-- 1. get_dashboard_bootstrap_aluno — substitui o Promise.all de 4 chamadas
--    (get_kpis_aluno, perfil do coach, água de hoje, get_agenda_semanal_aluno)
--    por 1 só. Reaproveita as duas funções já existentes (kpis e agenda) via
--    chamada aninhada — sem duplicar a lógica de cada uma.
--
-- 2. get_dashboard_secondary_aluno — junta as 4 buscas "de fundo" (fichas +
--    PDFs pra popular o seletor de "editar agenda", feedbacks pendentes,
--    parceiros do coach) que hoje disparam em paralelo, mas cada uma em sua
--    própria requisição.
--
-- Ambas SECURITY INVOKER — respeitam a RLS de cada tabela normalmente.
-- ============================================================

BEGIN;

CREATE OR REPLACE FUNCTION public.get_dashboard_bootstrap_aluno(
  p_aluno_id UUID DEFAULT auth.uid(),
  p_coach_id UUID DEFAULT NULL,
  p_today    DATE DEFAULT NULL,
  p_start    DATE DEFAULT NULL,
  p_end      DATE DEFAULT NULL
)
RETURNS JSONB
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT
    public.get_agenda_semanal_aluno(p_aluno_id, p_start, p_end)
    || jsonb_build_object(
      'kpis', public.get_kpis_aluno(p_aluno_id),
      'coach_profile', (
        SELECT row_to_json(c) FROM (
          SELECT full_name, avatar_url, sexo, role
          FROM profiles
          WHERE id = p_coach_id
        ) c
      ),
      'agua_hoje', (
        SELECT row_to_json(a) FROM (
          SELECT id, copos, ml_por_copo
          FROM registros_agua
          WHERE aluno_id = p_aluno_id
            AND data_registro = p_today
        ) a
      )
    );
$$;

GRANT EXECUTE ON FUNCTION public.get_dashboard_bootstrap_aluno(UUID, UUID, DATE, DATE, DATE) TO authenticated;


CREATE OR REPLACE FUNCTION public.get_dashboard_secondary_aluno(
  p_aluno_id UUID DEFAULT auth.uid(),
  p_coach_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT jsonb_build_object(
    'fichas_treino', (
      SELECT COALESCE(jsonb_agg(row_to_json(f)), '[]'::jsonb)
      FROM (
        SELECT id, nome_rotina
        FROM fichas_treino
        WHERE aluno_id = p_aluno_id
          AND ativo = true
      ) f
    ),
    'treinos_alunos', (
      SELECT COALESCE(jsonb_agg(row_to_json(t)), '[]'::jsonb)
      FROM (
        SELECT id, nome_arquivo
        FROM treinos_alunos
        WHERE aluno_id = p_aluno_id
      ) t
    ),
    'feedbacks_count', (
      SELECT COUNT(*)::int
      FROM feedbacks_treinos
      WHERE aluno_id = p_aluno_id
    ),
    'parceiros', (
      CASE WHEN p_coach_id IS NULL THEN '[]'::jsonb ELSE (
        SELECT COALESCE(jsonb_agg(row_to_json(p) ORDER BY p.nome_marca), '[]'::jsonb)
        FROM (
          SELECT id, nome_marca, descricao, cupom, link_desconto, logo_url, imagens
          FROM parceiros
          WHERE coach_id = p_coach_id
        ) p
      ) END
    )
  );
$$;

GRANT EXECUTE ON FUNCTION public.get_dashboard_secondary_aluno(UUID, UUID) TO authenticated;

COMMIT;
