-- =====================================================
-- FIX: RLS do bucket avatars alinhado ao path do app
-- =====================================================
-- Problema:
--   Policies exigiam pasta {user_id}/arquivo.jpg
--   App faz upload flat: avatar_{user_id}_{timestamp}.ext
--   Sem SELECT, DELETE/UPDATE do próprio arquivo também falham
--   (Supabase Storage exige SELECT para enxergar o objeto).
--
-- Solução:
--   Aceitar pasta {uid}/... OU nome contendo o uid
--   + SELECT próprio para permitir substituir foto

-- ── Remover policies antigas (nomes históricos possíveis) ──
DROP POLICY IF EXISTS "Usuários podem fazer upload de avatares" ON storage.objects;
DROP POLICY IF EXISTS "Usuários podem fazer upload do próprio avatar" ON storage.objects;
DROP POLICY IF EXISTS "Usuários autenticados podem fazer upload de avatares" ON storage.objects;

DROP POLICY IF EXISTS "Usuários podem atualizar seus avatares" ON storage.objects;
DROP POLICY IF EXISTS "Usuários podem atualizar próprio avatar" ON storage.objects;
DROP POLICY IF EXISTS "Usuários podem atualizar seus próprios avatares" ON storage.objects;

DROP POLICY IF EXISTS "Usuários podem deletar seus avatares" ON storage.objects;
DROP POLICY IF EXISTS "Usuários podem deletar próprio avatar" ON storage.objects;
DROP POLICY IF EXISTS "Usuários podem deletar seus próprios avatares" ON storage.objects;

DROP POLICY IF EXISTS "Avatares são públicos" ON storage.objects;
DROP POLICY IF EXISTS "Avatares são públicos para leitura" ON storage.objects;
DROP POLICY IF EXISTS "Avatares públicos para leitura" ON storage.objects;
DROP POLICY IF EXISTS "avatars_select_own" ON storage.objects;

-- Garante bucket público (URL pública sem listagem ampla)
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id)
DO UPDATE SET public = true;

-- SELECT: só o dono vê o próprio arquivo (necessário p/ DELETE/UPDATE)
CREATE POLICY "avatars_select_own"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'avatars'
  AND (
    (storage.foldername(name))[1] = auth.uid()::text
    OR name LIKE '%' || auth.uid()::text || '%'
  )
);

-- INSERT
CREATE POLICY "avatars_insert_own"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'avatars'
  AND (
    (storage.foldername(name))[1] = auth.uid()::text
    OR name LIKE '%' || auth.uid()::text || '%'
  )
);

-- UPDATE
CREATE POLICY "avatars_update_own"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'avatars'
  AND (
    (storage.foldername(name))[1] = auth.uid()::text
    OR name LIKE '%' || auth.uid()::text || '%'
  )
)
WITH CHECK (
  bucket_id = 'avatars'
  AND (
    (storage.foldername(name))[1] = auth.uid()::text
    OR name LIKE '%' || auth.uid()::text || '%'
  )
);

-- DELETE
CREATE POLICY "avatars_delete_own"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'avatars'
  AND (
    (storage.foldername(name))[1] = auth.uid()::text
    OR name LIKE '%' || auth.uid()::text || '%'
  )
);
