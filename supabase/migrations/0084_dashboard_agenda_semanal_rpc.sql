-- ============================================================
-- 0084_dashboard_agenda_semanal_rpc.sql
--
-- Junta as 5 consultas paralelas que a dashboard do aluno faz pra montar a
-- agenda da semana (agenda_diaria, treinos_manuais, historico_treinos,
-- cardio_sessoes, cardio_prescricoes) numa única função — reduz 5 idas ao
-- banco pra 1 a cada carregamento da tela. Mesmos filtros exatos da versão
-- em JS (ver fetchWeeklyAgenda em app/aluno/dashboard/page.tsx), só isso.
--
-- SECURITY INVOKER (não DEFINER) — respeita a RLS de cada tabela normalmente,
-- mesmo padrão já usado em get_kpis_aluno e export_user_data.
-- ============================================================

BEGIN;

CREATE OR REPLACE FUNCTION public.get_agenda_semanal_aluno(
  p_aluno_id UUID DEFAULT auth.uid(),
  p_start    DATE DEFAULT NULL,
  p_end      DATE DEFAULT NULL
)
RETURNS JSONB
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT jsonb_build_object(
    'agenda_diaria', (
      SELECT COALESCE(jsonb_agg(row_to_json(a)), '[]'::jsonb)
      FROM (
        SELECT
          ad.data,
          ad.ficha_id,
          ad.treino_pdf_id,
          ad.is_off,
          ad.is_cardio,
          jsonb_build_object('nome_rotina', ft.nome_rotina) AS fichas_treino
        FROM agenda_diaria ad
        LEFT JOIN fichas_treino ft ON ft.id = ad.ficha_id
        WHERE ad.aluno_id = p_aluno_id
          AND ad.data >= p_start
          AND ad.data <= p_end
      ) a
    ),
    'checkins_semana', (
      SELECT COALESCE(jsonb_agg(row_to_json(t)), '[]'::jsonb)
      FROM (
        SELECT data_treino, concluido, pontos_earn
        FROM treinos_manuais
        WHERE aluno_id = p_aluno_id
          AND concluido = true
          AND data_treino >= p_start
          AND data_treino <= p_end
      ) t
    ),
    'historico_semana', (
      -- Mesma janela -03:00 explícita que a versão em JS usava
      -- (.gte(`${startOfWeek}T00:00:00-03:00`) / .lte(`${endOfWeek}T23:59:59-03:00`))
      -- — não usar apenas o cast de DATE, que cairia no fuso da sessão do banco.
      SELECT COALESCE(jsonb_agg(row_to_json(h)), '[]'::jsonb)
      FROM (
        SELECT data_conclusao
        FROM historico_treinos
        WHERE aluno_id = p_aluno_id
          AND data_conclusao >= (p_start::text || 'T00:00:00-03:00')::timestamptz
          AND data_conclusao <= (p_end::text || 'T23:59:59-03:00')::timestamptz
      ) h
    ),
    'cardio_sessoes_semana', (
      SELECT COALESCE(jsonb_agg(row_to_json(c)), '[]'::jsonb)
      FROM (
        SELECT data, duracao_min
        FROM cardio_sessoes
        WHERE aluno_id = p_aluno_id
          AND data >= p_start
          AND data <= p_end
      ) c
    ),
    'cardio_prescricoes_ativas', (
      SELECT COALESCE(jsonb_agg(row_to_json(p)), '[]'::jsonb)
      FROM (
        SELECT duracao_min, dias_semana
        FROM cardio_prescricoes
        WHERE aluno_id = p_aluno_id
          AND ativo = true
      ) p
    )
  );
$$;

GRANT EXECUTE ON FUNCTION public.get_agenda_semanal_aluno(UUID, DATE, DATE) TO authenticated;

COMMIT;
