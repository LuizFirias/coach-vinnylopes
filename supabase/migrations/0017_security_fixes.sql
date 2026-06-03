-- ============================================================
-- 0017 · Security Fixes
-- Resolve todos os erros e avisos do Supabase Security Advisor
-- Rodar no: Supabase Dashboard → SQL Editor
-- ============================================================

BEGIN;

-- ============================================================
-- 1. ERRO · v_leaderboard SECURITY DEFINER
--
-- A migração 0016 recriou a view sem WITH (security_invoker),
-- desfazendo o fix da 0012. Recria com security_invoker e
-- mantém o campo coaching_reference adicionado na 0016.
-- ============================================================

DROP VIEW IF EXISTS public.v_leaderboard;

CREATE VIEW public.v_leaderboard WITH (security_invoker = on) AS
SELECT
  p.id                               AS aluno_id,
  p.full_name,
  p.coaching_reference,
  p.avatar_url,
  COALESCE(pa.total_pontos, 0)       AS pontos,
  COALESCE(s.streak_atual, 0)        AS streak,
  ROW_NUMBER() OVER (
    ORDER BY COALESCE(pa.total_pontos, 0) DESC
  )                                  AS posicao
FROM public.profiles p
LEFT JOIN public.pontuacao_alunos pa ON pa.aluno_id = p.id
LEFT JOIN public.v_streak_aluno s    ON s.aluno_id = p.id
WHERE p.role = 'aluno'
  AND COALESCE(p.arquivado, false)           = false
  AND COALESCE(p.oculto_no_ranking, false)   = false;

GRANT SELECT ON public.v_leaderboard TO authenticated;


-- ============================================================
-- 2. AVISO · update_updated_at_column search_path mutable
--
-- Adiciona SET search_path = '' para prevenir ataques via
-- search_path manipulation. Sem SECURITY DEFINER (é trigger).
-- ============================================================

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  NEW.atualizado_em = NOW();
  RETURN NEW;
END;
$$;


-- ============================================================
-- 3. AVISO · Funções SECURITY DEFINER acessíveis pelo papel anon
--
-- Por padrão o PostgreSQL faz GRANT EXECUTE ON FUNCTION TO PUBLIC,
-- o que inclui o papel anon. Precisamos REVOGAR esse acesso em
-- todas as funções que não devem ser chamadas sem autenticação.
-- ============================================================

-- ── 3a. Funções de trigger (nunca devem ser RPC) ─────────────
-- Trigger functions retornam TRIGGER — chamá-las via REST é
-- inútil e representa uma superfície de ataque desnecessária.

REVOKE EXECUTE ON FUNCTION public.handle_new_user()              FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.trg_detectar_prs()             FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.update_feedbacks_updated_at()  FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.consolidar_pontos_aluno()      FROM anon, authenticated;

-- ── 3b. Utilitários internos/admin (nunca devem ser RPC) ─────

REVOKE EXECUTE ON FUNCTION public.rls_auto_enable()              FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.recalcular_pontos_aluno(uuid)  FROM anon, authenticated;

-- ── 3c. Funções user-facing: manter para authenticated,
--        remover acesso anon ───────────────────────────────────

-- delete_user_account: aluno pode deletar a própria conta (LGPD)
-- mas NÃO pode ser chamado por anon (risco crítico)
REVOKE EXECUTE ON FUNCTION public.delete_user_account()                                   FROM anon;

-- export_user_data: aluno exporta os próprios dados (LGPD)
REVOKE EXECUTE ON FUNCTION public.export_user_data()                                      FROM anon;

-- detectar_prs_da_sessao: detecta PRs após salvar treino
REVOKE EXECUTE ON FUNCTION public.detectar_prs_da_sessao(uuid)                            FROM anon;

-- get_auth_user_role: verifica role do usuário logado
REVOKE EXECUTE ON FUNCTION public.get_auth_user_role()                                    FROM anon;

-- get_ultimo_treino_exercicio: usado nas telas de treino
REVOKE EXECUTE ON FUNCTION public.get_ultimo_treino_exercicio(uuid, uuid)                 FROM anon;

-- realizar_checkin: aluno registra presença
REVOKE EXECUTE ON FUNCTION public.realizar_checkin(uuid, text)                            FROM anon;


-- ============================================================
-- 4. AVISO · Buckets públicos com policy de listagem ampla
--
-- Os buckets 'avatars' e 'parceiros-logos' são públicos —
-- o acesso às URLs das imagens funciona sem nenhuma policy.
-- A policy SELECT broad permite que qualquer cliente liste
-- TODOS os arquivos via storage.list(), o que expõe mais
-- dados do que necessário. Removemos as policies de listagem;
-- o acesso por URL pública não é afetado.
-- ============================================================

DROP POLICY IF EXISTS "Avatares públicos para leitura"     ON storage.objects;
DROP POLICY IF EXISTS "Logos de parceiros são públicos"    ON storage.objects;

-- NÃO recriamos políticas SELECT amplas para esses buckets.
-- Para buckets públicos, o acesso às URLs (publicUrl / CDN) funciona
-- sem qualquer policy RLS — as policies SELECT só controlam a API de
-- listagem (/storage/v1/object/list). Sem elas, o app continua lendo
-- avatares e logos normalmente pelos links públicos.


-- ============================================================
-- 5. AVISO · auth_leaked_password_protection
--
-- Esta configuração não tem SQL — precisa ser habilitada no
-- Dashboard do Supabase:
--   Authentication → Providers → Email
--   → Enable "Leaked password protection"
-- ============================================================


COMMIT;

-- ============================================================
-- Verificação pós-aplicação:
--
-- -- 1. Confirmar security_invoker na view:
-- SELECT viewname, definition
-- FROM pg_views WHERE viewname = 'v_leaderboard';
--
-- -- 2. Confirmar search_path na função:
-- SELECT proname, proconfig FROM pg_proc
-- WHERE proname = 'update_updated_at_column';
--
-- -- 3. Confirmar que anon perdeu EXECUTE:
-- SELECT grantee, privilege_type FROM information_schema.role_routine_grants
-- WHERE routine_name = 'delete_user_account' AND routine_schema = 'public';
--
-- -- 4. Confirmar policies de storage:
-- SELECT policyname, cmd FROM pg_policies
-- WHERE tablename = 'objects' AND policyname LIKE '%avatars%'
--    OR policyname LIKE '%parceiros%';
-- ============================================================
