-- Revogar políticas antigas de escrita nos exercícios da biblioteca
DROP POLICY IF EXISTS "Coaches podem criar exercícios" ON public.exercicios_biblioteca;
DROP POLICY IF EXISTS "Coaches podem editar exercícios" ON public.exercicios_biblioteca;
DROP POLICY IF EXISTS "Coaches podem deletar exercícios" ON public.exercicios_biblioteca;
DROP POLICY IF EXISTS "Super admins podem criar exercícios" ON public.exercicios_biblioteca;
DROP POLICY IF EXISTS "Super admins podem editar exercícios" ON public.exercicios_biblioteca;
DROP POLICY IF EXISTS "Super admins podem deletar exercícios" ON public.exercicios_biblioteca;

-- Criar novas políticas de escrita restritas a super_admin
CREATE POLICY "Super admins podem criar exercícios"
ON public.exercicios_biblioteca FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'super_admin'
  )
);

CREATE POLICY "Super admins podem editar exercícios"
ON public.exercicios_biblioteca FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'super_admin'
  )
);

CREATE POLICY "Super admins podem deletar exercícios"
ON public.exercicios_biblioteca FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'super_admin'
  )
);

-- Revogar políticas antigas do bucket de GIFs
DROP POLICY IF EXISTS "Coaches podem fazer upload de gifs" ON storage.objects;
DROP POLICY IF EXISTS "Coaches podem deletar gifs" ON storage.objects;
DROP POLICY IF EXISTS "Super admins podem fazer upload de gifs" ON storage.objects;
DROP POLICY IF EXISTS "Super admins podem deletar gifs" ON storage.objects;

-- Criar novas políticas do bucket de GIFs restritas a super_admin
CREATE POLICY "Super admins podem fazer upload de gifs"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'exercicios-gifs'
  AND EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'super_admin'
  )
);

CREATE POLICY "Super admins podem deletar gifs"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'exercicios-gifs'
  AND EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'super_admin'
  )
);
