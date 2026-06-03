-- ============================================================
-- 0019 · Converter funções read-only para SECURITY INVOKER
--
-- Funções que apenas lêem dados do próprio usuário via auth.uid()
-- não precisam de SECURITY DEFINER. Com SECURITY INVOKER as
-- políticas RLS do chamador se aplicam normalmente, eliminando
-- os avisos do Security Advisor sem alterar comportamento.
--
-- Funções que FICAM como SECURITY DEFINER (por necessidade):
--   - delete_user_account  → precisa deletar de auth.users
--   - detectar_prs_da_sessao → INSERT em recordes_pessoais
--     (RLS bloqueia INSERT direto: "ninguem_insere_pr_diretamente")
--   - realizar_checkin → INSERT/UPSERT em checkins + pontuacao_alunos
--
-- Rodar no: Supabase Dashboard → SQL Editor
-- ============================================================

BEGIN;

-- ── 1. get_auth_user_role ─────────────────────────────────────
-- Só lê profiles WHERE id = auth.uid() — RLS protege corretamente.

CREATE OR REPLACE FUNCTION public.get_auth_user_role()
RETURNS text
LANGUAGE sql
SECURITY INVOKER
SET search_path = ''
STABLE
AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid();
$$;


-- ── 2. export_user_data ───────────────────────────────────────
-- Lê dados do próprio usuário em várias tabelas. RLS em cada
-- tabela garante que uid só vê seus próprios registros.

CREATE OR REPLACE FUNCTION public.export_user_data()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
  uid    uuid := auth.uid();
  result jsonb;
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'Não autenticado';
  END IF;

  SELECT jsonb_build_object(
    'profile',           (SELECT row_to_json(p) FROM public.profiles p WHERE p.id = uid),
    'medidas',           (SELECT jsonb_agg(row_to_json(m)) FROM public.medidas_aluno m WHERE m.aluno_id = uid),
    'historico_treinos', (SELECT jsonb_agg(row_to_json(h)) FROM public.historico_treinos h WHERE h.aluno_id = uid),
    'fotos',             (SELECT jsonb_agg(row_to_json(f)) FROM public.fotos_evolucao f WHERE f.aluno_id = uid),
    'feedbacks',         (SELECT jsonb_agg(row_to_json(fb)) FROM public.feedbacks_treinos fb WHERE fb.aluno_id = uid),
    'pontuacao',         (SELECT row_to_json(pa) FROM public.pontuacao_alunos pa WHERE pa.aluno_id = uid),
    'fichas_treino',     (SELECT jsonb_agg(row_to_json(ft)) FROM public.fichas_treino ft WHERE ft.aluno_id = uid),
    'agenda_semanal',    (SELECT jsonb_agg(row_to_json(a)) FROM public.agenda_semanal a WHERE a.aluno_id = uid),
    'treinos_manuais',   (SELECT jsonb_agg(row_to_json(tm)) FROM public.treinos_manuais tm WHERE tm.aluno_id = uid),
    'planos_alimentares',(SELECT jsonb_agg(row_to_json(pl)) FROM public.plano_alimentar_pdf pl WHERE pl.aluno_id = uid),
    'exportado_em',      NOW()
  ) INTO result;

  RETURN result;
END;
$$;


-- ── 3. get_ultimo_treino_exercicio ────────────────────────────
-- SELECT simples em historico_treinos filtrado por aluno_id.
-- RLS da tabela já restringe o acesso ao próprio aluno.

CREATE OR REPLACE FUNCTION public.get_ultimo_treino_exercicio(
  p_aluno_id    uuid,
  p_exercicio_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
  ultimo_treino jsonb;
BEGIN
  SELECT dados_sessao INTO ultimo_treino
  FROM public.historico_treinos
  WHERE aluno_id    = p_aluno_id
    AND exercicio_id = p_exercicio_id
  ORDER BY data_conclusao DESC
  LIMIT 1;

  RETURN COALESCE(ultimo_treino, '{}'::jsonb);
END;
$$;

COMMIT;

-- ============================================================
-- Verificação pós-aplicação:
--
-- SELECT proname, prosecdef
-- FROM pg_proc
-- WHERE proname IN (
--   'get_auth_user_role',
--   'export_user_data',
--   'get_ultimo_treino_exercicio'
-- )
-- AND pronamespace = 'public'::regnamespace;
--
-- prosecdef = false → SECURITY INVOKER (correto)
-- prosecdef = true  → SECURITY DEFINER (não deveria acontecer)
-- ============================================================
