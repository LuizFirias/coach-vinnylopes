-- Storage bucket policies
-- Torna os buckets sensíveis privados e cria object-level policies
-- para controle granular de upload, leitura e delete.
--
-- ⚠️  ANTES DE APLICAR:
--   1. Confirme os nomes exatos dos buckets:
--      SELECT id, name, public FROM storage.buckets;
--   2. Se 'plano alimentar' aparecer como 'plano_alimentar', ajuste
--      as policies abaixo de 'plano alimentar' para 'plano_alimentar'.
--
-- ROLLBACK: ver final do arquivo.
-- ============================================================

-- ── 1. Tornar buckets privados ────────────────────────────────
-- avatars e parceiros-logos ficam públicos (imagens não-sensíveis)
UPDATE storage.buckets
SET public = false
WHERE id IN ('evolucao-fotos', 'treinos-pdf', 'plano alimentar');

-- ── 2. evolucao-fotos ─────────────────────────────────────────
-- Path: {aluno_id}_{posicao}_{timestamp}_{filename}  (flat, sem pasta)
-- Aluno: INSERT + SELECT + DELETE dos próprios arquivos
-- Coach: SELECT de arquivos dos alunos gerenciados
-- ─────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "evolucao_fotos_aluno_upload"  ON storage.objects;
DROP POLICY IF EXISTS "evolucao_fotos_aluno_select"  ON storage.objects;
DROP POLICY IF EXISTS "evolucao_fotos_aluno_delete"  ON storage.objects;
DROP POLICY IF EXISTS "evolucao_fotos_coach_select"  ON storage.objects;

CREATE POLICY "evolucao_fotos_aluno_upload"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'evolucao-fotos'
    AND starts_with(name, auth.uid()::text)
  );

CREATE POLICY "evolucao_fotos_aluno_select"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'evolucao-fotos'
    AND starts_with(name, auth.uid()::text)
  );

CREATE POLICY "evolucao_fotos_aluno_delete"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'evolucao-fotos'
    AND starts_with(name, auth.uid()::text)
  );

-- Coach/super_admin vê fotos dos próprios alunos (path começa com aluno_id)
CREATE POLICY "evolucao_fotos_coach_select"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'evolucao-fotos'
    AND (
      EXISTS (
        SELECT 1 FROM public.coach_alunos
        WHERE coach_id = auth.uid()
          AND starts_with(storage.objects.name, aluno_id::text)
      )
      OR EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND role = 'super_admin'
      )
    )
  );

-- ── 3. treinos-pdf ────────────────────────────────────────────
-- Path: {aluno_id}/{timestamp}_{filename}  (1ª pasta = aluno_id)
-- Coach: INSERT + SELECT + DELETE (gerencia PDFs dos alunos)
-- Aluno: SELECT (acesso via signed URL)
-- ─────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "treinos_pdf_coach_insert"  ON storage.objects;
DROP POLICY IF EXISTS "treinos_pdf_coach_select"  ON storage.objects;
DROP POLICY IF EXISTS "treinos_pdf_coach_delete"  ON storage.objects;
DROP POLICY IF EXISTS "treinos_pdf_aluno_select"  ON storage.objects;

CREATE POLICY "treinos_pdf_coach_insert"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'treinos-pdf'
    AND EXISTS (
      SELECT 1 FROM public.coach_alunos
      WHERE coach_id = auth.uid()
        AND aluno_id::text = (storage.foldername(name))[1]
    )
  );

CREATE POLICY "treinos_pdf_coach_select"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'treinos-pdf'
    AND (
      EXISTS (
        SELECT 1 FROM public.coach_alunos
        WHERE coach_id = auth.uid()
          AND aluno_id::text = (storage.foldername(name))[1]
      )
      OR EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND role = 'super_admin'
      )
    )
  );

CREATE POLICY "treinos_pdf_coach_delete"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'treinos-pdf'
    AND (
      EXISTS (
        SELECT 1 FROM public.coach_alunos
        WHERE coach_id = auth.uid()
          AND aluno_id::text = (storage.foldername(name))[1]
      )
      OR EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND role = 'super_admin'
      )
    )
  );

-- Aluno lê os próprios PDFs (signed URL usa esta policy)
CREATE POLICY "treinos_pdf_aluno_select"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'treinos-pdf'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- ── 4. plano alimentar ────────────────────────────────────────
-- Path: {aluno_id}/{timestamp}_{filename}  (1ª pasta = aluno_id)
-- Coach: INSERT via supabaseAdmin (bypassa RLS) + DELETE direto
-- Aluno: SELECT via signed URL
--
-- ⚠️  Se o bucket real se chamar 'plano_alimentar' (underscore),
--     substitua 'plano alimentar' abaixo.
-- ─────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "plano_alimentar_aluno_select"  ON storage.objects;
DROP POLICY IF EXISTS "plano_alimentar_coach_select"  ON storage.objects;
DROP POLICY IF EXISTS "plano_alimentar_coach_delete"  ON storage.objects;

-- Aluno lê o próprio plano (signed URL usa esta policy)
CREATE POLICY "plano_alimentar_aluno_select"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'plano alimentar'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Coach lê planos dos próprios alunos (signed URL para preview)
CREATE POLICY "plano_alimentar_coach_select"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'plano alimentar'
    AND (
      EXISTS (
        SELECT 1 FROM public.coach_alunos
        WHERE coach_id = auth.uid()
          AND aluno_id::text = (storage.foldername(name))[1]
      )
      OR EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND role = 'super_admin'
      )
    )
  );

-- Coach deleta planos dos próprios alunos
CREATE POLICY "plano_alimentar_coach_delete"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'plano alimentar'
    AND (
      EXISTS (
        SELECT 1 FROM public.coach_alunos
        WHERE coach_id = auth.uid()
          AND aluno_id::text = (storage.foldername(name))[1]
      )
      OR EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND role = 'super_admin'
      )
    )
  );

-- ============================================================
-- Verificação pós-aplicação:
-- SELECT policyname, cmd FROM pg_policies
--   WHERE tablename = 'objects' ORDER BY policyname;
-- ============================================================

-- ============================================================
-- ROLLBACK (em ordem inversa)
--
-- DROP POLICY IF EXISTS "plano_alimentar_coach_delete"  ON storage.objects;
-- DROP POLICY IF EXISTS "plano_alimentar_coach_select"  ON storage.objects;
-- DROP POLICY IF EXISTS "plano_alimentar_aluno_select"  ON storage.objects;
-- DROP POLICY IF EXISTS "treinos_pdf_aluno_select"      ON storage.objects;
-- DROP POLICY IF EXISTS "treinos_pdf_coach_delete"      ON storage.objects;
-- DROP POLICY IF EXISTS "treinos_pdf_coach_select"      ON storage.objects;
-- DROP POLICY IF EXISTS "treinos_pdf_coach_insert"      ON storage.objects;
-- DROP POLICY IF EXISTS "evolucao_fotos_coach_select"   ON storage.objects;
-- DROP POLICY IF EXISTS "evolucao_fotos_aluno_delete"   ON storage.objects;
-- DROP POLICY IF EXISTS "evolucao_fotos_aluno_select"   ON storage.objects;
-- DROP POLICY IF EXISTS "evolucao_fotos_aluno_upload"   ON storage.objects;
-- UPDATE storage.buckets SET public = true
--   WHERE id IN ('evolucao-fotos', 'treinos-pdf', 'plano alimentar');
-- ============================================================
