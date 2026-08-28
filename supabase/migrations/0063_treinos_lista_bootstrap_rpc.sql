-- ============================================================
-- 0088_treinos_lista_bootstrap_rpc.sql
--
-- A lista "Minhas Rotinas" (app/aluno/treinos/page.tsx) busca fichas_treino.
-- configuracao INTEIRO (toda série, técnica, descanso, observações de cada
-- exercício) só pra montar um resuminho de 2-3 nomes de exercício por card —
-- o resto do JSON é descartado no cliente. Em fichas com muitos exercícios
-- isso é bastante dado trafegado à toa.
--
-- Essa função devolve só {nome, grupo_muscular} por exercício (o que o card
-- realmente usa) em vez da configuração inteira, e já junta com a busca de
-- PDFs — 2 requisições viram 1.
-- ============================================================

BEGIN;

CREATE OR REPLACE FUNCTION public.get_treinos_lista_aluno(
  p_aluno_id UUID DEFAULT auth.uid()
)
RETURNS JSONB
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT jsonb_build_object(
    'fichas', (
      SELECT COALESCE(jsonb_agg(row_to_json(f) ORDER BY f.criado_em DESC), '[]'::jsonb)
      FROM (
        SELECT
          ft.id,
          ft.nome_rotina,
          ft.criado_em,
          (
            SELECT COALESCE(jsonb_agg(jsonb_build_object(
              'nome', ex->>'nome',
              'grupo_muscular', ex->>'grupo_muscular'
            )), '[]'::jsonb)
            FROM jsonb_array_elements(COALESCE(ft.configuracao->'exercicios', '[]'::jsonb)) AS ex
          ) AS exercicios
        FROM fichas_treino ft
        WHERE ft.aluno_id = p_aluno_id
          AND ft.ativo = true
      ) f
    ),
    'treinos_pdf', (
      SELECT COALESCE(jsonb_agg(row_to_json(t) ORDER BY t.data_upload DESC), '[]'::jsonb)
      FROM (
        SELECT id, aluno_id, url_pdf, nome_arquivo, data_upload
        FROM treinos_alunos
        WHERE aluno_id = p_aluno_id
      ) t
    )
  );
$$;

GRANT EXECUTE ON FUNCTION public.get_treinos_lista_aluno(UUID) TO authenticated;

COMMIT;
