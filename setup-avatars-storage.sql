-- ==============================================
-- SETUP AVATARS STORAGE BUCKET
-- Execute este script no Supabase SQL Editor
-- ==============================================

-- Criar bucket para avatares (se não existir)
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- Permitir que usuários autenticados façam upload de seus próprios avatares
CREATE POLICY "Usuários podem fazer upload de avatares"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'avatars' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Permitir que qualquer um veja os avatares (bucket público)
CREATE POLICY "Avatares são públicos"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'avatars');

-- Permitir que usuários atualizem/deletem apenas seus próprios avatares
CREATE POLICY "Usuários podem atualizar seus avatares"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'avatars' AND
  (storage.foldername(name))[1] = auth.uid()::text
)
WITH CHECK (
  bucket_id = 'avatars' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Usuários podem deletar seus avatares"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'avatars' AND
  (storage.foldername(name))[1] = auth.uid()::text
);
