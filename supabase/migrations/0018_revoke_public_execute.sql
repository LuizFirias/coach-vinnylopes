-- ============================================================
-- 0018 · Corrigir REVOKE de funções SECURITY DEFINER
--
-- A migração 0017 usou REVOKE FROM anon/authenticated, mas o
-- PostgreSQL faz GRANT EXECUTE TO PUBLIC por padrão ao criar
-- funções. REVOKE FROM anon não remove um grant herdado via
-- PUBLIC — precisa ser REVOKE FROM PUBLIC.
--
-- Rodar no: Supabase Dashboard → SQL Editor
-- ============================================================

BEGIN;

-- ============================================================
-- Funções de trigger e utilitários internos
-- Nenhum papel externo deve poder chamar via RPC
-- ============================================================

REVOKE ALL ON FUNCTION public.handle_new_user()             FROM PUBLIC;
REVOKE ALL ON FUNCTION public.trg_detectar_prs()            FROM PUBLIC;
REVOKE ALL ON FUNCTION public.update_feedbacks_updated_at() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.consolidar_pontos_aluno()     FROM PUBLIC;
REVOKE ALL ON FUNCTION public.rls_auto_enable()             FROM PUBLIC;
REVOKE ALL ON FUNCTION public.recalcular_pontos_aluno(uuid) FROM PUBLIC;

-- ============================================================
-- Funções user-facing: revoga PUBLIC, re-grant só authenticated
-- ============================================================

REVOKE ALL ON FUNCTION public.delete_user_account()                    FROM PUBLIC;
REVOKE ALL ON FUNCTION public.export_user_data()                       FROM PUBLIC;
REVOKE ALL ON FUNCTION public.detectar_prs_da_sessao(uuid)             FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_auth_user_role()                     FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_ultimo_treino_exercicio(uuid, uuid)  FROM PUBLIC;
REVOKE ALL ON FUNCTION public.realizar_checkin(uuid, text)             FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.delete_user_account()                   TO authenticated;
GRANT EXECUTE ON FUNCTION public.export_user_data()                      TO authenticated;
GRANT EXECUTE ON FUNCTION public.detectar_prs_da_sessao(uuid)            TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_auth_user_role()                    TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_ultimo_treino_exercicio(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.realizar_checkin(uuid, text)            TO authenticated;

COMMIT;

-- ============================================================
-- Verificação pós-aplicação:
--
-- SELECT routine_name, grantee, privilege_type
-- FROM information_schema.role_routine_grants
-- WHERE routine_schema = 'public'
--   AND routine_name IN (
--     'handle_new_user', 'delete_user_account', 'get_auth_user_role',
--     'realizar_checkin', 'export_user_data', 'detectar_prs_da_sessao'
--   )
-- ORDER BY routine_name, grantee;
--
-- Esperado:
-- - delete_user_account   → authenticated (EXECUTE)
-- - export_user_data      → authenticated (EXECUTE)
-- - get_auth_user_role    → authenticated (EXECUTE)
-- - realizar_checkin      → authenticated (EXECUTE)
-- - detectar_prs_da_sessao → authenticated (EXECUTE)
-- - get_ultimo_treino_exercicio → authenticated (EXECUTE)
-- - handle_new_user       → (nenhum)
-- - consolidar_pontos     → (nenhum)
-- ============================================================
