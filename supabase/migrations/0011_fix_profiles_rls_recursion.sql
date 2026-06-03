-- Fix: infinite recursion (42P17) nas policies de profiles
-- Causa: "Coaches veem perfis dos alunos" e "alunos_leem_perfis_alunos"
-- fazem sub-SELECT em profiles enquanto são policies ON profiles.
--
-- Solução: função SECURITY DEFINER que lê a role sem acionar RLS,
-- depois as policies usam a função em vez do sub-SELECT recursivo.

-- ── 1. Função auxiliar (bypassa RLS — roda como postgres) ─────
CREATE OR REPLACE FUNCTION public.get_auth_user_role()
RETURNS text
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid();
$$;

GRANT EXECUTE ON FUNCTION public.get_auth_user_role() TO authenticated;

-- ── 2. Recriar "Coaches veem perfis dos alunos" sem recursão ──
DROP POLICY IF EXISTS "Coaches veem perfis dos alunos" ON profiles;

CREATE POLICY "Coaches veem perfis dos alunos"
  ON profiles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM coach_alunos
      WHERE coach_alunos.coach_id = auth.uid()
        AND coach_alunos.aluno_id = profiles.id
    )
    OR get_auth_user_role() = 'super_admin'
  );

-- ── 3. Recriar "alunos_leem_perfis_alunos" sem recursão ───────
DROP POLICY IF EXISTS "alunos_leem_perfis_alunos" ON profiles;

CREATE POLICY "alunos_leem_perfis_alunos"
  ON profiles FOR SELECT
  USING (
    role = 'aluno'
    AND get_auth_user_role() IN ('aluno', 'coach', 'super_admin')
  );

-- ── Verificação ───────────────────────────────────────────────
-- SELECT policyname, qual FROM pg_policies WHERE tablename = 'profiles';
-- Deve retornar as policies sem sub-SELECT em profiles.

-- ── ROLLBACK ──────────────────────────────────────────────────
-- DROP POLICY IF EXISTS "Coaches veem perfis dos alunos" ON profiles;
-- DROP POLICY IF EXISTS "alunos_leem_perfis_alunos" ON profiles;
-- DROP FUNCTION IF EXISTS public.get_auth_user_role();
-- (recriar manualmente as versões antigas com sub-SELECT)
