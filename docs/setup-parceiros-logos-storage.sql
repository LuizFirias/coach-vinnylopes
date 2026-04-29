-- ==============================================
-- SETUP PARCEIROS LOGOS STORAGE BUCKET
-- Execute este script no Supabase SQL Editor
-- ==============================================

-- Criar bucket para logos de parceiros (se não existir)
INSERT INTO storage.buckets (id, name, public)
VALUES ('parceiros-logos', 'parceiros-logos', true)
ON CONFLICT (id) DO NOTHING;

-- Remover políticas antigas se existirem
DROP POLICY IF EXISTS "Coaches podem fazer upload de logos de parceiros" ON storage.objects;
DROP POLICY IF EXISTS "Logos de parceiros são públicos" ON storage.objects;
DROP POLICY IF EXISTS "Coaches podem atualizar logos de parceiros" ON storage.objects;
DROP POLICY IF EXISTS "Coaches podem deletar logos de parceiros" ON storage.objects;
DROP POLICY IF EXISTS "Super-admin pode gerenciar logos de parceiros" ON storage.objects;

-- Permitir que coaches façam upload apenas na sua própria pasta (coach_id/)
CREATE POLICY "Coaches podem fazer upload de logos de parceiros"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'parceiros-logos' AND
  (storage.foldername(name))[1] = auth.uid()::text AND
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'coach'
  )
);

-- Permitir que qualquer um veja os logos (bucket público)
CREATE POLICY "Logos de parceiros são públicos"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'parceiros-logos');

-- Permitir que coaches atualizem apenas logos na sua própria pasta
CREATE POLICY "Coaches podem atualizar logos de parceiros"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'parceiros-logos' AND
  (storage.foldername(name))[1] = auth.uid()::text AND
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'coach'
  )
)
WITH CHECK (
  bucket_id = 'parceiros-logos' AND
  (storage.foldername(name))[1] = auth.uid()::text AND
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'coach'
  )
);

-- Permitir que coaches deletem apenas logos na sua própria pasta
CREATE POLICY "Coaches podem deletar logos de parceiros"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'parceiros-logos' AND
  (storage.foldername(name))[1] = auth.uid()::text AND
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'coach'
  )
);

-- Super-admin também pode gerenciar logos
CREATE POLICY "Super-admin pode gerenciar logos de parceiros"
ON storage.objects
FOR ALL
TO authenticated
USING (
  bucket_id = 'parceiros-logos' AND
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'super_admin'
  )
)
WITH CHECK (
  bucket_id = 'parceiros-logos' AND
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'super_admin'
  )
);

-- Verificação final
SELECT 
  id, 
  name, 
  public,
  created_at
FROM storage.buckets 
WHERE id = 'parceiros-logos';

-- Listar políticas criadas
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd
FROM pg_policies
WHERE tablename = 'objects'
AND policyname LIKE '%parceiros%'
ORDER BY policyname;
