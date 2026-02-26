-- =====================================================
-- ADICIONAR SUPORTE A AVATARES
-- Execute este script no SQL Editor do Supabase
-- =====================================================

-- Adicionar coluna avatar_url na tabela profiles
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- Comentário explicativo
COMMENT ON COLUMN profiles.avatar_url IS 'URL da foto de perfil do usuário (coach ou aluno)';

-- =====================================================
-- CRIAR BUCKET DE STORAGE PARA AVATARES
-- Execute no SQL Editor ou crie manualmente no Dashboard Storage
-- =====================================================

-- Criar bucket 'avatars' (público para leitura)
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- Política: Qualquer usuário autenticado pode fazer upload do próprio avatar
CREATE POLICY IF NOT EXISTS "Usuários podem fazer upload do próprio avatar"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'avatars' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Política: Qualquer pessoa pode visualizar avatares
CREATE POLICY IF NOT EXISTS "Avatares são públicos para leitura"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'avatars');

-- Política: Usuários podem atualizar apenas seus próprios avatares
CREATE POLICY IF NOT EXISTS "Usuários podem atualizar próprio avatar"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'avatars' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Política: Usuários podem deletar apenas seus próprios avatares
CREATE POLICY IF NOT EXISTS "Usuários podem deletar próprio avatar"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'avatars' AND
  (storage.foldername(name))[1] = auth.uid()::text
);
