-- =====================================================
-- FIX: Permitir alunos salvarem PDFs de suas próprias fichas
-- =====================================================
-- Permite que alunos baixem suas fichas digitais em PDF
-- e salvem nos seus protocolos

-- Adicionar política para aluno inserir seus próprios PDFs
CREATE POLICY "treino_aluno_insert_own" ON treinos_alunos
  FOR INSERT
  WITH CHECK (
    aluno_id = auth.uid()
  );

-- Comentário: Esta política permite que o aluno salve PDFs onde ele é o destinatário
-- Útil para quando o aluno baixa uma ficha digital em PDF
