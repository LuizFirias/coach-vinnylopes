-- =====================================================
-- FIX DEFINITIVO: Recursão Circular entre profiles e coach_alunos
-- =====================================================
-- CAUSA RAIZ: Recursão circular entre 2 tabelas:
--   profiles policy → EXISTS em coach_alunos
--   coach_alunos policy → EXISTS em profiles
--   = Loop infinito!
-- 
-- SOLUÇÃO: Políticas que NÃO referenciam uma à outra
--   profiles: apenas auth.uid() = id
--   coach_alunos: apenas coach_id = auth.uid() ou aluno_id = auth.uid()
-- =====================================================

-- ========================
-- PART 1: TABELA profiles
-- ========================

ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;

-- Remover TODAS as políticas existentes
DROP POLICY IF EXISTS "Admins podem ver todos os perfis" ON profiles;
DROP POLICY IF EXISTS "Coaches podem editar perfis de alunos" ON profiles;
DROP POLICY IF EXISTS "users_own_profile" ON profiles;
DROP POLICY IF EXISTS "Alunos veem apenas a si mesmos" ON profiles;
DROP POLICY IF EXISTS "Coaches podem ver alunos vinculados" ON profiles;
DROP POLICY IF EXISTS "Users can read own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Enable read access for all users" ON profiles;
DROP POLICY IF EXISTS "users_can_view_own_profile" ON profiles;
DROP POLICY IF EXISTS "users_can_update_own_profile" ON profiles;
DROP POLICY IF EXISTS "coaches_can_view_linked_students" ON profiles;
DROP POLICY IF EXISTS "coaches_can_update_linked_students" ON profiles;
DROP POLICY IF EXISTS "users_can_update_linked_students" ON profiles;
DROP POLICY IF EXISTS "super_admins_see_all" ON profiles;
DROP POLICY IF EXISTS "super_admins_update_all" ON profiles;
DROP POLICY IF EXISTS "users_can_insert_own_profile" ON profiles;

-- Remover função recursiva
DROP FUNCTION IF EXISTS public.check_is_admin();

-- Criar políticas SIMPLES para profiles (SEM join com outras tabelas)
-- SELECT: qualquer autenticado pode ver qualquer perfil
-- (segurança real é feita via API com service_role)
CREATE POLICY "authenticated_can_read_profiles" ON profiles
    FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "users_update_own_profile" ON profiles
    FOR UPDATE
    TO authenticated
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

CREATE POLICY "users_insert_own_profile" ON profiles
    FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = id);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- ============================
-- PART 2: TABELA coach_alunos
-- ============================

ALTER TABLE coach_alunos DISABLE ROW LEVEL SECURITY;

-- Remover TODAS as políticas existentes
DROP POLICY IF EXISTS "Coaches podem vincular alunos" ON coach_alunos;
DROP POLICY IF EXISTS "Coaches podem ver seus alunos" ON coach_alunos;
DROP POLICY IF EXISTS "Alunos podem ver seu coach" ON coach_alunos;
DROP POLICY IF EXISTS "coaches_insert_alunos" ON coach_alunos;
DROP POLICY IF EXISTS "coaches_select_alunos" ON coach_alunos;
DROP POLICY IF EXISTS "alunos_see_coach" ON coach_alunos;

-- Criar políticas SIMPLES para coach_alunos (SEM join com profiles)
-- SELECT: coach vê seus vínculos, aluno vê seu vínculo
CREATE POLICY "coach_alunos_select" ON coach_alunos
    FOR SELECT
    TO authenticated
    USING (coach_id = auth.uid() OR aluno_id = auth.uid());

-- INSERT: qualquer autenticado pode criar vínculo onde é o coach
-- (validação real feita via API com service_role)
CREATE POLICY "coach_alunos_insert" ON coach_alunos
    FOR INSERT
    TO authenticated
    WITH CHECK (coach_id = auth.uid());

-- DELETE: coach pode remover seus vínculos
CREATE POLICY "coach_alunos_delete" ON coach_alunos
    FOR DELETE
    TO authenticated
    USING (coach_id = auth.uid());

ALTER TABLE coach_alunos ENABLE ROW LEVEL SECURITY;

-- ========================
-- VERIFICAÇÃO FINAL
-- ========================

-- Ver políticas ativas
SELECT 
    schemaname, tablename, policyname, cmd, qual
FROM pg_policies 
WHERE tablename IN ('profiles', 'coach_alunos')
ORDER BY tablename, policyname;

-- Ver contagens
SELECT 'profiles' as tabela, COUNT(*) as total FROM profiles
UNION ALL
SELECT 'coach_alunos', COUNT(*) FROM coach_alunos;
