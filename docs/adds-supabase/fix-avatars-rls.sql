-- =====================================================
-- FIX: Corrigir RLS do bucket avatars para permitir upload
-- =====================================================
-- Problema: Código faz upload com nome "userid_timestamp.jpg"
-- mas política espera estrutura de pasta "userid/arquivo.jpg"
-- Solução: Permitir upload se o nome do arquivo contém o user ID

-- =====================================================
-- 1. REMOVER POLÍTICAS ANTIGAS RESTRITIVAS
-- =====================================================

DROP POLICY IF EXISTS "Usuários podem fazer upload de avatares" ON storage.objects;
DROP POLICY IF EXISTS "Usuários podem fazer upload do próprio avatar" ON storage.objects;
DROP POLICY IF EXISTS "Usuários podem atualizar seus avatares" ON storage.objects;
DROP POLICY IF EXISTS "Usuários podem atualizar próprio avatar" ON storage.objects;
DROP POLICY IF EXISTS "Usuários podem deletar seus avatares" ON storage.objects;
DROP POLICY IF EXISTS "Usuários podem deletar próprio avatar" ON storage.objects;

-- =====================================================
-- 2. CRIAR NOVAS POLÍTICAS FLEXÍVEIS
-- =====================================================

-- INSERT: Permite upload se o nome do arquivo contém o user ID
CREATE POLICY "Usuários autenticados podem fazer upload de avatares"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'avatars' AND
  (
    -- Permite estrutura de pasta: {user_id}/arquivo.jpg
    (storage.foldername(name))[1] = auth.uid()::text
    OR
    -- Permite nome direto contendo user_id: avatar_{user_id}_timestamp.jpg
    name LIKE '%' || auth.uid()::text || '%'
  )
);

-- UPDATE: Permite atualizar se o arquivo é do usuário
CREATE POLICY "Usuários podem atualizar seus próprios avatares"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'avatars' AND
  (
    (storage.foldername(name))[1] = auth.uid()::text
    OR
    name LIKE '%' || auth.uid()::text || '%'
  )
)
WITH CHECK (
  bucket_id = 'avatars' AND
  (
    (storage.foldername(name))[1] = auth.uid()::text
    OR
    name LIKE '%' || auth.uid()::text || '%'
  )
);

-- DELETE: Permite deletar apenas seus próprios arquivos
CREATE POLICY "Usuários podem deletar seus próprios avatares"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'avatars' AND
  (
    (storage.foldername(name))[1] = auth.uid()::text
    OR
    name LIKE '%' || auth.uid()::text || '%'
  )
);

-- SELECT: Mantém leitura pública (bucket público)
DROP POLICY IF EXISTS "Avatares são públicos" ON storage.objects;
DROP POLICY IF EXISTS "Avatares são públicos para leitura" ON storage.objects;

CREATE POLICY "Avatares públicos para leitura"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'avatars');

-- =====================================================
-- 3. VERIFICAR SE O BUCKET EXISTE E É PÚBLICO
-- =====================================================

-- Garante que o bucket existe e é público
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) 
DO UPDATE SET public = true;

-- =====================================================
-- VERIFICAÇÃO
-- =====================================================
-- Execute para verificar as políticas criadas:
-- SELECT * FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname LIKE '%avatar%';
