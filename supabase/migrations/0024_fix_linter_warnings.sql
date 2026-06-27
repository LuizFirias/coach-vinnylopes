-- ============================================================
-- 0024 · Correção de Erro e Avisos do Supabase Database Linter
--
-- 1. Corrige erro 'security_definer_view' na view v_streak_aluno
--    configurando-a explicitamente como SECURITY INVOKER.
--
-- 2. Corrige avisos 'anon_security_definer_function_executable'
--    e 'authenticated_security_definer_function_executable'
--    revogando o privilégio EXECUTE padrão concedido a PUBLIC
--    (e consequentemente a anon/authenticated) em funções
--    SECURITY DEFINER e limitando o acesso apenas quando necessário.
-- ============================================================

BEGIN;

-- ── 1. Corrigir View v_streak_aluno ───────────────────────────
-- Configura a view para usar invoker security (segurança do usuário que consulta)
ALTER VIEW public.v_streak_aluno SET (security_invoker = true);

-- ── 2. Revogar EXECUTE de PUBLIC, anon e authenticated nas funções SECURITY DEFINER ──
REVOKE ALL ON FUNCTION public.consolidar_pontos_aluno() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.delete_user_account() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.detectar_prs_da_sessao(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.get_auth_user_role() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.get_ranking_colegas(text, timestamptz, timestamptz) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.realizar_checkin(uuid, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.recalcular_pontos_aluno(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.rls_auto_enable() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.trg_detectar_prs() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.update_feedbacks_updated_at() FROM PUBLIC, anon, authenticated;

-- ── 3. Garantir privilégios mínimos de execução ────────────────
-- Funções que o app/aluno precisa chamar via RPC (apenas autenticados)
GRANT EXECUTE ON FUNCTION public.delete_user_account() TO authenticated;
GRANT EXECUTE ON FUNCTION public.detectar_prs_da_sessao(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_auth_user_role() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_ranking_colegas(text, timestamptz, timestamptz) TO authenticated;
GRANT EXECUTE ON FUNCTION public.realizar_checkin(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.consolidar_pontos_aluno() TO authenticated;
GRANT EXECUTE ON FUNCTION public.recalcular_pontos_aluno(uuid) TO authenticated;

-- Notas:
-- As funções handle_new_user, trg_detectar_prs, update_feedbacks_updated_at e rls_auto_enable
-- são utilitários internos ou triggers do sistema e não devem ter execução concedida a nenhuma role pública.

COMMIT;
