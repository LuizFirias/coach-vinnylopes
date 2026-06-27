-- ==============================================
-- DIAGNÓSTICO E CORREÇÃO: Plano Alimentar Storage
-- ==============================================
-- Problema: "Object not found" ao tentar abrir PDF
-- Execute passo a passo no Supabase SQL Editor
-- ==============================================

-- 1. VERIFICAR SE O BUCKET EXISTE
-- ==============================================
SELECT id, name, public, file_size_limit, allowed_mime_types
FROM storage.buckets 
WHERE id = 'plano_alimentar';

-- Se não aparecer nada, criar o bucket:
INSERT INTO storage.buckets (id, name, public)
VALUES ('plano_alimentar', 'plano_alimentar', false)
ON CONFLICT (id) DO UPDATE SET public = false;


-- 2. VERIFICAR REGISTROS NO BANCO vs ARQUIVOS NO STORAGE
-- ==============================================
-- Ver os planos cadastrados no banco
SELECT 
  id,
  aluno_id,
  coach_id,
  nome_arquivo,
  url_pdf,
  criado_em
FROM plano_alimentar_pdf
ORDER BY criado_em DESC
LIMIT 10;

-- Ver os arquivos no storage
SELECT 
  name,
  bucket_id,
  created_at,
  metadata
FROM storage.objects
WHERE bucket_id = 'plano_alimentar'
ORDER BY created_at DESC
LIMIT 10;


-- 3. VERIFICAR POLÍTICAS RLS DO STORAGE
-- ==============================================
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies 
WHERE tablename = 'objects' 
AND policyname LIKE '%plano%alimentar%'
ORDER BY policyname;


-- 4. RECRIAR TODAS AS POLÍTICAS DE STORAGE
-- ==============================================

-- Remover políticas antigas
DROP POLICY IF EXISTS "Coaches podem fazer upload de planos alimentares" ON storage.objects;
DROP POLICY IF EXISTS "Alunos podem ver seus planos alimentares" ON storage.objects;
DROP POLICY IF EXISTS "Coaches podem ver planos dos seus alunos" ON storage.objects;
DROP POLICY IF EXISTS "Coaches podem deletar planos dos seus alunos" ON storage.objects;
DROP POLICY IF EXISTS "service_role acessa tudo plano_alimentar" ON storage.objects;

-- IMPORTANTE: Criar política para service_role (necessária para signed URLs)
CREATE POLICY "service_role acessa tudo plano_alimentar"
ON storage.objects
FOR ALL
TO service_role
USING (bucket_id = 'plano_alimentar')
WITH CHECK (bucket_id = 'plano_alimentar');

-- Coaches podem fazer upload
CREATE POLICY "Coaches podem fazer upload de planos alimentares"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'plano_alimentar' AND
  EXISTS (
    SELECT 1 FROM coach_alunos
    WHERE coach_alunos.coach_id = auth.uid()
    AND (storage.foldername(name))[1] = coach_alunos.aluno_id::text
  )
);

-- Alunos podem ver seus próprios planos (necessário para signed URLs)
CREATE POLICY "Alunos podem ver seus planos alimentares"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'plano_alimentar' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Coaches podem ver planos dos seus alunos
CREATE POLICY "Coaches podem ver planos dos seus alunos"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'plano_alimentar' AND
  EXISTS (
    SELECT 1 FROM coach_alunos
    WHERE coach_alunos.coach_id = auth.uid()
    AND (storage.foldername(name))[1] = coach_alunos.aluno_id::text
  )
);

-- Coaches podem deletar planos dos seus alunos
CREATE POLICY "Coaches podem deletar planos dos seus alunos"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'plano_alimentar' AND
  EXISTS (
    SELECT 1 FROM coach_alunos
    WHERE coach_alunos.coach_id = auth.uid()
    AND (storage.foldername(name))[1] = coach_alunos.aluno_id::text
  )
);


-- 5. VERIFICAR INCONSISTÊNCIAS (PDFs no banco sem arquivo no storage)
-- ==============================================
SELECT 
  'PDFs no banco SEM arquivo no storage' as problema,
  p.id,
  p.aluno_id,
  p.nome_arquivo,
  p.url_pdf,
  p.criado_em
FROM plano_alimentar_pdf p
LEFT JOIN storage.objects o ON o.name = p.url_pdf AND o.bucket_id = 'plano_alimentar'
WHERE o.id IS NULL
ORDER BY p.criado_em DESC;


-- 6. SOLUÇÃO TEMPORÁRIA: Deletar registros órfãos
-- ==============================================
-- ⚠️ CUIDADO: Isso vai apagar os registros do banco que não têm arquivo
-- Descomente e execute apenas se quiser limpar registros órfãos:

/*
DELETE FROM plano_alimentar_pdf p
WHERE NOT EXISTS (
  SELECT 1 FROM storage.objects o
  WHERE o.name = p.url_pdf 
  AND o.bucket_id = 'plano_alimentar'
);
*/


-- 7. VERIFICAÇÃO FINAL
-- ==============================================
-- Verificar se as políticas foram criadas
SELECT 
  policyname,
  cmd,
  CASE 
    WHEN roles = '{authenticated}' THEN 'authenticated'
    WHEN roles = '{service_role}' THEN 'service_role'
    ELSE roles::text
  END as roles
FROM pg_policies 
WHERE tablename = 'objects' 
AND (
  policyname LIKE '%plano%alimentar%' OR
  policyname LIKE '%service_role%plano%'
)
ORDER BY policyname;

-- Contar planos e arquivos
SELECT 
  'Registros no banco' as tipo,
  COUNT(*) as total
FROM plano_alimentar_pdf
UNION ALL
SELECT 
  'Arquivos no storage' as tipo,
  COUNT(*) as total
FROM storage.objects
WHERE bucket_id = 'plano_alimentar';
