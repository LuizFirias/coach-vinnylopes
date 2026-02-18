-- =====================================================
-- CORREÇÃO V4: PERMISSÃO PARA COACH VER ALUNOS
-- =====================================================
-- O script anterior (v3) era restritivo demais, impedindo 
-- que o coach visse a lista de alunos.

-- 1. CRIAR FUNÇÃO SEGURA PARA VERIFICAR ROLE (Evita Recursão Infinita)
CREATE OR REPLACE FUNCTION public.check_is_admin() 
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() 
    AND role IN ('coach', 'super_admin')
    AND arquivado = false
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. ADICIONAR POLÍTICA PARA VISUALIZAÇÃO
DROP POLICY IF EXISTS "Admins podem ver todos os perfis" ON profiles;
CREATE POLICY "Admins podem ver todos os perfis" ON profiles
  FOR SELECT
  USING ( (auth.uid() = id) OR public.check_is_admin() );

-- 3. ADICIONAR POLÍTICA PARA EDIÇÃO (Coach pode editar alunos)
DROP POLICY IF EXISTS "Coaches podem editar perfis de alunos" ON profiles;
CREATE POLICY "Coaches podem editar perfis de alunos" ON profiles
  FOR UPDATE
  USING ( public.check_is_admin() )
  WITH CHECK ( public.check_is_admin() );

-- 4. MANTER A POLÍTICA DE SEGURANÇA BÁSICA
DROP POLICY IF EXISTS "users_own_profile" ON profiles;
CREATE POLICY "users_own_profile" ON profiles
  FOR ALL
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- 5. CORRIGIR DADOS EXISTENTES (Garantir que ninguém tenha arquivado como NULL)
UPDATE profiles SET arquivado = false WHERE arquivado IS NULL;
UPDATE profiles SET role = 'aluno' WHERE role IS NULL;

-- NOTA: O Supabase aplicará as políticas usando OR (se passar em uma, permite).
-- Como coaches passarão na check_is_admin(), eles terão acesso.
