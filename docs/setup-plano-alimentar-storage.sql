-- ==============================================
-- SETUP PLANO ALIMENTAR STORAGE BUCKET
-- Execute este script no Supabase SQL Editor
-- ==============================================

-- Criar bucket para plano-alimentar (se não existir)
INSERT INTO storage.buckets (id, name, public)
VALUES ('plano_alimentar', 'plano_alimentar', false)
ON CONFLICT (id) DO UPDATE SET public = false;

-- REMOVER POLICIES ANTIGAS
DROP POLICY IF EXISTS "Coaches podem fazer upload de planos alimentares" ON storage.objects;
DROP POLICY IF EXISTS "Alunos podem ver seus planos alimentares" ON storage.objects;
DROP POLICY IF EXISTS "Coaches podem ver planos dos seus alunos" ON storage.objects;
DROP POLICY IF EXISTS "Coaches podem deletar planos dos seus alunos" ON storage.objects;
DROP POLICY IF EXISTS "Alunos podem deletar seus planos" ON storage.objects; -- Remover se existir

-- Permitir que coaches façam upload de PDFs para seus alunos
CREATE POLICY "Coaches podem fazer upload de planos alimentares"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'plano_alimentar' AND
  (
    -- Service role sempre pode
    auth.role() = 'service_role' OR
    -- Coaches podem fazer upload para seus alunos
    EXISTS (
      SELECT 1 FROM coach_alunos
      WHERE coach_alunos.coach_id = auth.uid()
      AND (storage.foldername(name))[1] = coach_alunos.aluno_id::text
    )
  )
);

-- Permitir que alunos vejam seus próprios planos
CREATE POLICY "Alunos podem ver seus planos alimentares"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'plano_alimentar' AND
  (
    -- Service role sempre pode
    auth.role() = 'service_role' OR
    -- Alunos podem ver seus próprios arquivos
    (storage.foldername(name))[1] = auth.uid()::text
  )
);

-- Permitir que coaches vejam planos dos seus alunos
CREATE POLICY "Coaches podem ver planos dos seus alunos"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'plano_alimentar' AND
  (
    -- Service role sempre pode
    auth.role() = 'service_role' OR
    -- Coaches podem ver planos dos seus alunos
    EXISTS (
      SELECT 1 FROM coach_alunos
      WHERE coach_alunos.coach_id = auth.uid()
      AND (storage.foldername(name))[1] = coach_alunos.aluno_id::text
    )
  )
);

-- Permitir que coaches deletem planos dos seus alunos (apenas coaches)
CREATE POLICY "Coaches podem deletar planos dos seus alunos"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'plano_alimentar' AND
  (
    -- Service role sempre pode
    auth.role() = 'service_role' OR
    -- Coaches podem deletar planos dos seus alunos
    EXISTS (
      SELECT 1 FROM coach_alunos
      WHERE coach_alunos.coach_id = auth.uid()
      AND (storage.foldername(name))[1] = coach_alunos.aluno_id::text
    )
  )
);

-- ==============================================
-- VERIFICAÇÃO
-- ==============================================
-- Verificar se o bucket foi criado
SELECT id, name, public FROM storage.buckets WHERE id = 'plano_alimentar';

-- Verificar as policies criadas
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies 
WHERE tablename = 'objects' 
AND policyname LIKE '%plano%'
ORDER BY policyname;
