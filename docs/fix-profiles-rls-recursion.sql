-- =====================================================
-- FIX URGENTE: Recursão Infinita em Políticas RLS
-- =====================================================
-- Problema: check_is_admin() consulta profiles dentro 
-- das políticas RLS de profiles, causando recursão infinita
-- 
-- Solução: Remover políticas conflitantes e usar apenas
-- políticas simples sem recursão
-- =====================================================

-- 1. DESABILITAR RLS temporariamente para limpeza
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;

-- 2. REMOVER TODAS AS POLÍTICAS EXISTENTES (antigas e novas)
DROP POLICY IF EXISTS "Admins podem ver todos os perfis" ON profiles;
DROP POLICY IF EXISTS "Coaches podem editar perfis de alunos" ON profiles;
DROP POLICY IF EXISTS "users_own_profile" ON profiles;
DROP POLICY IF EXISTS "Alunos veem apenas a si mesmos" ON profiles;
DROP POLICY IF EXISTS "Coaches podem ver alunos vinculados" ON profiles;
DROP POLICY IF EXISTS "Users can read own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Enable read access for all users" ON profiles;

-- Remover também as novas políticas caso já existam
DROP POLICY IF EXISTS "users_can_view_own_profile" ON profiles;
DROP POLICY IF EXISTS "users_can_update_own_profile" ON profiles;
DROP POLICY IF EXISTS "coaches_can_view_linked_students" ON profiles;
DROP POLICY IF EXISTS "coaches_can_update_linked_students" ON profiles;
DROP POLICY IF EXISTS "users_can_update_linked_students" ON profiles;
DROP POLICY IF EXISTS "super_admins_see_all" ON profiles;
DROP POLICY IF EXISTS "super_admins_update_all" ON profiles;
DROP POLICY IF EXISTS "users_can_insert_own_profile" ON profiles;

-- 3. REMOVER FUNÇÃO PROBLEMÁTICA
DROP FUNCTION IF EXISTS public.check_is_admin();

-- 4. CRIAR POLÍTICAS SIMPLES SEM RECURSÃO

-- Política 1: Usuários podem ver e editar seu próprio perfil (alunos)
CREATE POLICY "users_can_view_own_profile" ON profiles
    FOR SELECT
    TO authenticated
    USING (auth.uid() = id);

CREATE POLICY "users_can_update_own_profile" ON profiles
    FOR UPDATE
    TO authenticated
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

-- Política 2: Coaches podem ver perfis de seus alunos vinculados
-- IMPORTANTE: Não fazer JOIN com profiles aqui para evitar recursão!
CREATE POLICY "coaches_can_view_linked_students" ON profiles
    FOR SELECT
    TO authenticated
    USING (
        -- O coach pode ver seu próprio perfil
        auth.uid() = id
        OR
        -- OU pode ver alunos que estão vinculados a ele
        EXISTS (
            SELECT 1 FROM coach_alunos
            WHERE coach_alunos.coach_id = auth.uid()
            AND coach_alunos.aluno_id = profiles.id
        )
    );

-- Política 3: Permitir UPDATE apenas do próprio perfil
-- NOTA: Coaches/admins devem usar service_role API para editar outros perfis
CREATE POLICY "users_can_update_linked_students" ON profiles
    FOR UPDATE
    TO authenticated
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

-- Política 4: Permitir INSERT apenas para o próprio usuário
CREATE POLICY "users_can_insert_own_profile" ON profiles
    FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = id);

-- 5. REABILITAR RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- 6. CORRIGIR DADOS (garantir que não há NULL)
UPDATE profiles SET arquivado = false WHERE arquivado IS NULL;
UPDATE profiles SET role = 'aluno' WHERE role IS NULL;

-- 7. VERIFICAÇÃO FINAL
SELECT 
    'Total de perfis' as info,
    COUNT(*) as quantidade
FROM profiles;

SELECT 
    'Perfis por role' as info,
    role,
    COUNT(*) as quantidade
FROM profiles
GROUP BY role;

-- 8. TESTAR ACESSO (execute como aluno para verificar)
-- SELECT * FROM profiles WHERE id = auth.uid();
