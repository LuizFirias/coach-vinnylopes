-- =====================================================
-- FIX: Adicionar coach_id à tabela parceiros
-- Problema: Parceiros cadastrados sem vínculo com coach
-- não apareciam na listagem do painel admin.
-- =====================================================

-- 1. Adicionar coluna coach_id se não existir
ALTER TABLE parceiros
ADD COLUMN IF NOT EXISTS coach_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- 2. Criar índice para performance nas queries por coach
CREATE INDEX IF NOT EXISTS idx_parceiros_coach_id ON parceiros(coach_id);

-- 3. Atualizar RLS policies para parceiros vinculados ao coach

-- SELECT: coaches veem apenas seus próprios parceiros; alunos/visitantes veem todos os ativos
DROP POLICY IF EXISTS "Todos podem visualizar parceiros" ON parceiros;
CREATE POLICY "Todos podem visualizar parceiros" ON parceiros
  FOR SELECT USING (
    -- Alunos e visitantes veem todos os parceiros ativos
    ativo = true
    OR
    -- Coaches veem os seus próprios (mesmo inativos)
    coach_id = auth.uid()
  );

-- INSERT: coaches só podem criar com seu próprio coach_id
DROP POLICY IF EXISTS "Coaches podem criar parceiros" ON parceiros;
CREATE POLICY "Coaches podem criar parceiros" ON parceiros
  FOR INSERT WITH CHECK (
    coach_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'coach'
    )
  );

-- UPDATE: coaches só podem editar seus próprios parceiros
DROP POLICY IF EXISTS "Coaches podem editar parceiros" ON parceiros;
CREATE POLICY "Coaches podem editar parceiros" ON parceiros
  FOR UPDATE USING (
    coach_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'coach'
    )
  );

-- DELETE: coaches só podem deletar seus próprios parceiros
DROP POLICY IF EXISTS "Coaches podem deletar parceiros" ON parceiros;
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
-- ATENÇÃO: Se houver parceiros já cadastrados sem
-- coach_id, execute o comando abaixo substituindo
-- 'SEU_COACH_UUID_AQUI' pelo UUID do coach correto
-- (encontrado em auth.users ou na tabela profiles):
--
-- UPDATE parceiros
-- SET coach_id = 'SEU_COACH_UUID_AQUI'
-- WHERE coach_id IS NULL;
-- =====================================================
