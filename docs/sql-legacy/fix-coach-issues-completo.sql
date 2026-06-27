-- =====================================================
-- FIX COMPLETO: Parceiros + Fichas + Performance
-- Execute este script no Supabase SQL Editor
-- =====================================================

-- =====================================================
-- PARTE 1: Adicionar coach_id à tabela parceiros
-- Isso faz os parceiros aparecerem na listagem do coach
-- e permite criar novos parceiros vinculados ao coach
-- =====================================================

ALTER TABLE parceiros
ADD COLUMN IF NOT EXISTS coach_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_parceiros_coach_id ON parceiros(coach_id);

-- Atualizar RLS de parceiros para usar coach_id
DROP POLICY IF EXISTS "Todos podem visualizar parceiros" ON parceiros;
DROP POLICY IF EXISTS "Coaches podem criar parceiros" ON parceiros;
DROP POLICY IF EXISTS "Coaches podem editar parceiros" ON parceiros;
DROP POLICY IF EXISTS "Coaches podem deletar parceiros" ON parceiros;

ALTER TABLE parceiros ENABLE ROW LEVEL SECURITY;

-- SELECT: alunos veem todos os ativos; coaches veem os seus (incluindo inativos)
CREATE POLICY "Todos podem visualizar parceiros" ON parceiros
  FOR SELECT USING (
    ativo = true
    OR coach_id = auth.uid()
  );

-- INSERT: coach deve vincular ao seu próprio id
CREATE POLICY "Coaches podem criar parceiros" ON parceiros
  FOR INSERT WITH CHECK (
    coach_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'coach'
    )
  );

-- UPDATE: coach edita apenas os seus
CREATE POLICY "Coaches podem editar parceiros" ON parceiros
  FOR UPDATE USING (
    coach_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'coach'
    )
  );

-- DELETE: coach deleta apenas os seus
CREATE POLICY "Coaches podem deletar parceiros" ON parceiros
  FOR DELETE USING (
    coach_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'coach'
    )
  );

-- =====================================================
-- PARTE 2: Corrigir parceiros antigos sem coach_id
-- SUBSTITUA 'SEU_COACH_UUID_AQUI' pelo UUID do coach
-- (encontre em: Authentication > Users no dashboard)
-- =====================================================
-- UPDATE parceiros
-- SET coach_id = 'SEU_COACH_UUID_AQUI'
-- WHERE coach_id IS NULL;

-- =====================================================
-- PARTE 3: Garantir que coaches podem ver perfis de alunos
-- (necessário para listar alunos ao criar fichas)
-- =====================================================

-- Função SECURITY DEFINER evita recursão infinita no RLS
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

-- Coaches e super admins veem todos os perfis
DROP POLICY IF EXISTS "Admins podem ver todos os perfis" ON profiles;
CREATE POLICY "Admins podem ver todos os perfis" ON profiles
  FOR SELECT
  USING ( (auth.uid() = id) OR public.check_is_admin() );

-- Coaches podem editar perfis de alunos
DROP POLICY IF EXISTS "Coaches podem editar perfis de alunos" ON profiles;
CREATE POLICY "Coaches podem editar perfis de alunos" ON profiles
  FOR UPDATE
  USING ( public.check_is_admin() )
  WITH CHECK ( public.check_is_admin() );

-- Política básica: usuários editam apenas o próprio perfil
DROP POLICY IF EXISTS "users_own_profile" ON profiles;
CREATE POLICY "users_own_profile" ON profiles
  FOR ALL
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Corrigir dados nulos
UPDATE profiles SET arquivado = false WHERE arquivado IS NULL;
UPDATE profiles SET role = 'aluno' WHERE role IS NULL;

-- =====================================================
-- PARTE 4: Garantir RLS de fichas_treino está correto
-- =====================================================

ALTER TABLE fichas_treino ENABLE ROW LEVEL SECURITY;

-- Garantir policy correta para coaches criarem fichas
DROP POLICY IF EXISTS "Coaches podem criar fichas" ON fichas_treino;
CREATE POLICY "Coaches podem criar fichas" ON fichas_treino
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('coach', 'super_admin')
    )
  );

-- =====================================================
-- PARTE 5: Ativar RLS nas tabelas que estão com aviso
-- (coach_alunos e plano_alimentar_audit)
-- =====================================================

-- plano_alimentar_audit: não é usada pelo app, apenas habilitar RLS
ALTER TABLE plano_alimentar_audit ENABLE ROW LEVEL SECURITY;

-- coach_alunos: habilitar RLS com todas as policies necessárias
ALTER TABLE coach_alunos ENABLE ROW LEVEL SECURITY;

-- SELECT: coach vê seus alunos; aluno vê sua própria relação
DROP POLICY IF EXISTS "Coaches veem seus alunos" ON coach_alunos;
CREATE POLICY "Coaches veem seus alunos" ON coach_alunos
  FOR SELECT USING (
    coach_id = auth.uid()
    OR aluno_id = auth.uid()
  );

-- INSERT: coach vincula alunos (feito pelo UI e pela API de convite)
DROP POLICY IF EXISTS "Coaches gerenciam suas relações" ON coach_alunos;
CREATE POLICY "Coaches gerenciam suas relações" ON coach_alunos
  FOR INSERT WITH CHECK (
    coach_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'coach'
    )
  );

-- DELETE: coach remove vínculo ao reatribuir aluno (tela admin/aluno/[id])
DROP POLICY IF EXISTS "Coaches removem seus vínculos" ON coach_alunos;
CREATE POLICY "Coaches removem seus vínculos" ON coach_alunos
  FOR DELETE USING (
    coach_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND role = 'coach'
    )
  );

-- =====================================================
-- DIAGNÓSTICO: Execute as queries abaixo para verificar
-- =====================================================
-- Ver parceiros e seus coach_ids:
-- SELECT id, nome_marca, coach_id, ativo FROM parceiros ORDER BY criado_em DESC;

-- Ver se coach consegue ver alunos:
-- SELECT id, email, role, coaching_reference FROM profiles WHERE role = 'aluno' LIMIT 5;

-- Ver fichas ativas:
-- SELECT id, nome_rotina, coach_id, aluno_id, ativo FROM fichas_treino LIMIT 5;
