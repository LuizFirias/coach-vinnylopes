-- ============================================================
-- AURONFIT · Correções pós-restauração (multi-coach + plataforma)
-- Aplicar DEPOIS de restaurar docs/schema-dump-auronfit.sql
-- Idempotente: pode rodar mais de uma vez sem problema.
-- ============================================================

BEGIN;

-- ------------------------------------------------------------
-- 1) GRANTS para a API do Supabase (PostgREST)
-- O dump foi gerado com --no-privileges. Garantimos que os
-- papéis da API tenham acesso (a segurança real continua no RLS).
-- ------------------------------------------------------------
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL TABLES    IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO anon, authenticated, service_role;

ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES    TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON FUNCTIONS TO anon, authenticated, service_role;

-- ------------------------------------------------------------
-- 2) FIX DE VAZAMENTO: parceiros
-- Remove as policies permissivas que deixavam QUALQUER usuário
-- ver os parceiros de TODOS os coaches.
-- As policies corretas e isoladas já existem no dump:
--   "aluno vê parceiros do seu coach"  (SELECT)
--   "coach vê seus próprios parceiros" (ALL)
--   "Coaches podem criar/editar/deletar parceiros"
-- ------------------------------------------------------------
DROP POLICY IF EXISTS "Qualquer um visualiza parceiros" ON public.parceiros;
DROP POLICY IF EXISTS "Todos podem visualizar parceiros" ON public.parceiros;

-- Super admin enxerga/gerencia todos os parceiros
DROP POLICY IF EXISTS "parceiros_superadmin_all" ON public.parceiros;
CREATE POLICY "parceiros_superadmin_all" ON public.parceiros
  FOR ALL TO authenticated
  USING (public.get_auth_user_role() = 'super_admin')
  WITH CHECK (public.get_auth_user_role() = 'super_admin');

-- ------------------------------------------------------------
-- 3) Trigger de criação de perfil no signup
-- A função public.handle_new_user() veio no dump, mas o trigger
-- em auth.users NÃO (fica fora do schema public). Sem ele, novos
-- cadastros não criam a linha em profiles.
-- ------------------------------------------------------------
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

COMMIT;

-- ============================================================
-- Verificação rápida (rode separado se quiser conferir):
--
-- -- Não deve sobrar nenhuma policy permissiva em parceiros:
-- SELECT policyname, cmd, qual FROM pg_policies WHERE tablename = 'parceiros';
--
-- -- Trigger de signup deve existir:
-- SELECT tgname FROM pg_trigger WHERE tgrelid = 'auth.users'::regclass;
-- ============================================================
