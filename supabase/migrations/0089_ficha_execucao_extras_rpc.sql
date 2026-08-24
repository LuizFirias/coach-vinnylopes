-- ============================================================
-- 0089_ficha_execucao_extras_rpc.sql
--
-- Tela de execução de treino (app/aluno/treinos/[id]/executar/page.tsx).
-- A busca da ficha continua separada (o app extrai os IDs de exercício da
-- configuração em JS, lógica sensível — não mexemos nisso). Mas depois de ter
-- os IDs, hoje rodam 3 requisições em paralelo pra biblioteca, histórico e
-- perfil (sexo) — e a de histórico busca até 10x mais linhas do que precisa
-- (só usa a sessão mais recente de cada exercício, mas trazia várias e
-- descartava o resto no celular).
--
-- Essa função junta as 3 numa só e já devolve exatamente 1 linha de
-- histórico por exercício (a mais recente — DISTINCT ON), não 10.
-- ============================================================

BEGIN;

CREATE OR REPLACE FUNCTION public.get_ficha_execucao_extras(
  p_aluno_id      UUID DEFAULT auth.uid(),
  p_exercicio_ids UUID[] DEFAULT '{}'
)
RETURNS JSONB
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT jsonb_build_object(
    'biblioteca', (
      SELECT COALESCE(jsonb_agg(row_to_json(b)), '[]'::jsonb)
      FROM (
        SELECT id, grupo_muscular, gif_url, gif_url_feminino, imagem_url,
               imagem_url_feminino, video_url, equipamento
        FROM exercicios_biblioteca
        WHERE id = ANY(p_exercicio_ids)
      ) b
    ),
    'ultimo_historico', (
      -- 1 linha por exercício — a sessão mais recente (DISTINCT ON já traz só
      -- o que a tela usa, em vez de até 10x mais linhas pra deduplicar no cliente).
      SELECT COALESCE(jsonb_agg(row_to_json(h)), '[]'::jsonb)
      FROM (
        SELECT DISTINCT ON (exercicio_id)
          exercicio_id, data_conclusao, dados_sessao
        FROM historico_treinos
        WHERE aluno_id = p_aluno_id
          AND exercicio_id = ANY(p_exercicio_ids)
        ORDER BY exercicio_id, data_conclusao DESC
      ) h
    ),
    'sexo', (
      SELECT sexo FROM profiles WHERE id = p_aluno_id
    )
  );
$$;

GRANT EXECUTE ON FUNCTION public.get_ficha_execucao_extras(UUID, UUID[]) TO authenticated;

COMMIT;
