-- Migration to add gif_url to exercicios_biblioteca and setup exercicios-gifs storage bucket
ALTER TABLE exercicios_biblioteca ADD COLUMN IF NOT EXISTS gif_url TEXT;

-- Criar bucket para exercicios-gifs (público)
INSERT INTO storage.buckets (id, name, public)
VALUES ('exercicios-gifs', 'exercicios-gifs', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Políticas de acesso para o bucket exercicios-gifs
DROP POLICY IF EXISTS "Qualquer um pode ver os gifs de exercicios" ON storage.objects;
DROP POLICY IF EXISTS "Coaches podem fazer upload de gifs" ON storage.objects;
DROP POLICY IF EXISTS "Coaches podem deletar gifs" ON storage.objects;

-- Permitir leitura pública dos gifs
CREATE POLICY "Qualquer um pode ver os gifs de exercicios"
ON storage.objects FOR SELECT
USING (bucket_id = 'exercicios-gifs');

-- Permitir upload por coaches autenticados
CREATE POLICY "Coaches podem fazer upload de gifs"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'exercicios-gifs'
  AND EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role IN ('coach', 'super_admin')
  )
);

-- Permitir deleção por coaches autenticados
CREATE POLICY "Coaches podem deletar gifs"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'exercicios-gifs'
  AND EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role IN ('coach', 'super_admin')
  )
);
