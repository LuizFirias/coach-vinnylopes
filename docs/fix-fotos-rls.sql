-- =====================================================
-- FIX: Políticas RLS para fotos_evolucao
-- =====================================================
-- Problema: Coach não consegue ver fotos dos alunos
-- Solução: Atualizar política para usar coach_alunos
-- =====================================================

-- Drop políticas antigas
DROP POLICY IF EXISTS "Alunos veem suas próprias fotos" ON fotos_evolucao;
DROP POLICY IF EXISTS "Alunos podem inserir suas fotos" ON fotos_evolucao;
DROP POLICY IF EXISTS "Alunos podem deletar suas fotos" ON fotos_evolucao;
DROP POLICY IF EXISTS "Coaches veem fotos de seus alunos" ON fotos_evolucao;

-- Alunos podem ver suas próprias fotos
CREATE POLICY "Alunos veem suas próprias fotos" ON fotos_evolucao
  FOR SELECT 
  USING (aluno_id = auth.uid());

-- Alunos podem inserir suas próprias fotos
CREATE POLICY "Alunos podem inserir suas fotos" ON fotos_evolucao
  FOR INSERT 
  WITH CHECK (aluno_id = auth.uid());

-- Alunos podem deletar suas próprias fotos
CREATE POLICY "Alunos podem deletar suas fotos" ON fotos_evolucao
  FOR DELETE 
  USING (aluno_id = auth.uid());

-- Coaches veem fotos de SEUS alunos (via coach_alunos)
CREATE POLICY "Coaches veem fotos de seus alunos" ON fotos_evolucao
  FOR SELECT 
  USING (
    EXISTS (
      SELECT 1 FROM coach_alunos
      WHERE coach_alunos.coach_id = auth.uid()
      AND coach_alunos.aluno_id = fotos_evolucao.aluno_id
    )
  );

-- Super admin vê todas as fotos
CREATE POLICY "Super admin vê todas fotos" ON fotos_evolucao
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'super_admin'
    )
  );

-- Verificar políticas aplicadas
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE tablename = 'fotos_evolucao'
ORDER BY policyname;
