-- Perfil público do coach (base do futuro Mercado de Coaches)
-- Separado de profiles para RLS distinta e evitar misturar dados privados.

CREATE TABLE IF NOT EXISTS public.coach_public_profiles (
  coach_id uuid PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  handle text UNIQUE,
  headline text,
  bio text,
  specialties text[] NOT NULL DEFAULT '{}',
  modality text CHECK (modality IS NULL OR modality IN ('online', 'presencial', 'hibrido')),
  city text,
  state text CHECK (state IS NULL OR char_length(state) = 2),
  cref text,
  years_experience integer CHECK (years_experience IS NULL OR years_experience >= 0),
  certifications text[] NOT NULL DEFAULT '{}',
  gallery_paths text[] NOT NULL DEFAULT '{}',
  instagram text,
  disponivel_no_mercado boolean NOT NULL DEFAULT false,
  aceitando_novos_alunos boolean NOT NULL DEFAULT true,
  price_display text,
  show_student_count boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT coach_public_profiles_handle_format
    CHECK (handle IS NULL OR handle ~ '^[a-z0-9._]{3,30}$'),
  CONSTRAINT coach_public_profiles_headline_len
    CHECK (headline IS NULL OR char_length(headline) <= 60),
  CONSTRAINT coach_public_profiles_bio_len
    CHECK (bio IS NULL OR char_length(bio) <= 500),
  CONSTRAINT coach_public_profiles_gallery_len
    CHECK (cardinality(gallery_paths) <= 6)
);

CREATE INDEX IF NOT EXISTS idx_coach_public_profiles_mercado
  ON public.coach_public_profiles (disponivel_no_mercado)
  WHERE disponivel_no_mercado = true;

CREATE INDEX IF NOT EXISTS idx_coach_public_profiles_city_state
  ON public.coach_public_profiles (state, city)
  WHERE disponivel_no_mercado = true;

ALTER TABLE public.coach_public_profiles ENABLE ROW LEVEL SECURITY;

-- Coach gerencia o próprio perfil público
DROP POLICY IF EXISTS coach_public_profiles_select_own ON public.coach_public_profiles;
CREATE POLICY coach_public_profiles_select_own
  ON public.coach_public_profiles FOR SELECT
  USING (coach_id = auth.uid());

DROP POLICY IF EXISTS coach_public_profiles_insert_own ON public.coach_public_profiles;
CREATE POLICY coach_public_profiles_insert_own
  ON public.coach_public_profiles FOR INSERT
  WITH CHECK (coach_id = auth.uid());

DROP POLICY IF EXISTS coach_public_profiles_update_own ON public.coach_public_profiles;
CREATE POLICY coach_public_profiles_update_own
  ON public.coach_public_profiles FOR UPDATE
  USING (coach_id = auth.uid())
  WITH CHECK (coach_id = auth.uid());

DROP POLICY IF EXISTS coach_public_profiles_delete_own ON public.coach_public_profiles;
CREATE POLICY coach_public_profiles_delete_own
  ON public.coach_public_profiles FOR DELETE
  USING (coach_id = auth.uid());

-- Leitura pública no Mercado: só quem optou in (sem e-mail / assinatura)
DROP POLICY IF EXISTS coach_public_profiles_select_mercado ON public.coach_public_profiles;
CREATE POLICY coach_public_profiles_select_mercado
  ON public.coach_public_profiles FOR SELECT
  USING (disponivel_no_mercado = true);

-- Aluno vinculado lê o perfil público do próprio coach
-- (necessário p/ @ nos cards Instagram do fim do treino, mesmo sem Mercado)
DROP POLICY IF EXISTS coach_public_profiles_select_by_aluno ON public.coach_public_profiles;
CREATE POLICY coach_public_profiles_select_by_aluno
  ON public.coach_public_profiles FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.coach_alunos ca
      WHERE ca.coach_id = coach_public_profiles.coach_id
        AND ca.aluno_id = auth.uid()
    )
  );

-- updated_at
CREATE OR REPLACE FUNCTION public.set_coach_public_profiles_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_coach_public_profiles_updated_at ON public.coach_public_profiles;
CREATE TRIGGER trg_coach_public_profiles_updated_at
  BEFORE UPDATE ON public.coach_public_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.set_coach_public_profiles_updated_at();

-- Storage: galeria do coach (path: {coach_id}/...)
INSERT INTO storage.buckets (id, name, public)
VALUES ('coach-gallery', 'coach-gallery', true)
ON CONFLICT (id) DO UPDATE SET public = true;

DROP POLICY IF EXISTS coach_gallery_owner_insert ON storage.objects;
CREATE POLICY coach_gallery_owner_insert
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'coach-gallery'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS coach_gallery_owner_update ON storage.objects;
CREATE POLICY coach_gallery_owner_update
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'coach-gallery'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS coach_gallery_owner_delete ON storage.objects;
CREATE POLICY coach_gallery_owner_delete
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'coach-gallery'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS coach_gallery_public_select ON storage.objects;
CREATE POLICY coach_gallery_public_select
  ON storage.objects FOR SELECT
  USING (bucket_id = 'coach-gallery');
