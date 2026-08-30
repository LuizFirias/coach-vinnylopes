-- ============================================================
-- Coach Vinny — migrations trazidas do AURON (0026 a 0068)
-- JÁ APLICADAS em produção em 2026-08-28 (ver backups/ antes/depois).
-- Mantido aqui só como registro/referência — não precisa rodar de novo.
-- ============================================================

-- @@FILE_START@@ 0026_auron_nutricao_digital_fase01.sql
-- Auron Nutrição Digital — Fase 01
-- Fundação Técnica: Banco, Tipos, Cálculo de Macros e Base Global de Alimentos

BEGIN;

-- ============================================================
-- 1. Base Global de Alimentos
-- ============================================================
CREATE TABLE IF NOT EXISTS public.nutrition_foods (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  name text NOT NULL,
  slug text UNIQUE,
  category text NOT NULL,

  default_state text,
  description text,

  base_unit text NOT NULL DEFAULT 'g',
  base_quantity numeric NOT NULL DEFAULT 100,

  calories_per_100g numeric NOT NULL DEFAULT 0,
  protein_per_100g numeric NOT NULL DEFAULT 0,
  carbs_per_100g numeric NOT NULL DEFAULT 0,
  fat_per_100g numeric NOT NULL DEFAULT 0,
  fiber_per_100g numeric DEFAULT 0,

  source_name text,
  source_reference text,

  origin text NOT NULL DEFAULT 'auron_global',
  coach_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,

  is_active boolean NOT NULL DEFAULT true,

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- 2. Porções Caseiras
-- ============================================================
CREATE TABLE IF NOT EXISTS public.nutrition_food_portions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  food_id uuid NOT NULL REFERENCES public.nutrition_foods(id) ON DELETE CASCADE,

  label text NOT NULL,
  grams numeric NOT NULL,
  is_default boolean NOT NULL DEFAULT false,

  created_at timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- 3. Planos Alimentares
-- ============================================================
CREATE TABLE IF NOT EXISTS public.nutrition_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  coach_id uuid NOT NULL REFERENCES public.profiles(id),
  student_id uuid NOT NULL REFERENCES public.profiles(id),

  name text NOT NULL,
  goal text,
  notes text,

  calories_target numeric,
  protein_target numeric,
  carbs_target numeric,
  fat_target numeric,

  status text NOT NULL DEFAULT 'draft',

  start_date date,
  end_date date,

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  published_at timestamptz
);

-- ============================================================
-- 4. Dias do Plano
-- ============================================================
CREATE TABLE IF NOT EXISTS public.nutrition_plan_days (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  plan_id uuid NOT NULL REFERENCES public.nutrition_plans(id) ON DELETE CASCADE,

  day_index integer NOT NULL DEFAULT 1,
  label text NOT NULL DEFAULT 'Dia 1',
  notes text,

  created_at timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- 5. Refeições do Plano
-- ============================================================
CREATE TABLE IF NOT EXISTS public.nutrition_meals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  plan_day_id uuid NOT NULL REFERENCES public.nutrition_plan_days(id) ON DELETE CASCADE,

  meal_type text NOT NULL,
  title text NOT NULL,
  time_suggestion time,
  notes text,
  sort_order integer NOT NULL DEFAULT 0,

  created_at timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- 6. Itens de Refeição (Alimentos Prescritos)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.nutrition_meal_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  meal_id uuid NOT NULL REFERENCES public.nutrition_meals(id) ON DELETE CASCADE,
  food_id uuid NOT NULL REFERENCES public.nutrition_foods(id),

  quantity_grams numeric NOT NULL,
  portion_label text,
  notes text,
  sort_order integer NOT NULL DEFAULT 0,

  created_at timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- 7. Substituições Alimentares
-- ============================================================
CREATE TABLE IF NOT EXISTS public.nutrition_substitutions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  meal_item_id uuid NOT NULL REFERENCES public.nutrition_meal_items(id) ON DELETE CASCADE,
  substitute_food_id uuid NOT NULL REFERENCES public.nutrition_foods(id),

  quantity_grams numeric NOT NULL,
  portion_label text,
  notes text,

  created_at timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- 8. Check-ins de Refeição (Adesão do Aluno)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.nutrition_meal_checkins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  student_id uuid NOT NULL REFERENCES public.profiles(id),
  plan_id uuid NOT NULL REFERENCES public.nutrition_plans(id) ON DELETE CASCADE,
  meal_id uuid NOT NULL REFERENCES public.nutrition_meals(id) ON DELETE CASCADE,

  checkin_date date NOT NULL DEFAULT current_date,

  status text NOT NULL DEFAULT 'done',
  notes text,

  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (student_id, meal_id, checkin_date)
);

-- ============================================================
-- 9. Índices
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_nutrition_foods_name ON public.nutrition_foods(name);
CREATE INDEX IF NOT EXISTS idx_nutrition_foods_category ON public.nutrition_foods(category);
CREATE INDEX IF NOT EXISTS idx_nutrition_foods_origin ON public.nutrition_foods(origin);

CREATE INDEX IF NOT EXISTS idx_nutrition_plans_coach_id ON public.nutrition_plans(coach_id);
CREATE INDEX IF NOT EXISTS idx_nutrition_plans_student_id ON public.nutrition_plans(student_id);
CREATE INDEX IF NOT EXISTS idx_nutrition_plans_status ON public.nutrition_plans(status);

CREATE INDEX IF NOT EXISTS idx_nutrition_meals_plan_day_id ON public.nutrition_meals(plan_day_id);
CREATE INDEX IF NOT EXISTS idx_nutrition_meal_items_meal_id ON public.nutrition_meal_items(meal_id);
CREATE INDEX IF NOT EXISTS idx_nutrition_checkins_student_date ON public.nutrition_meal_checkins(student_id, checkin_date);

-- ============================================================
-- 10. Habilitar RLS
-- ============================================================
ALTER TABLE public.nutrition_foods ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nutrition_food_portions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nutrition_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nutrition_plan_days ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nutrition_meals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nutrition_meal_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nutrition_substitutions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nutrition_meal_checkins ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- 11. Policies RLS
-- ============================================================

-- A. nutrition_foods
DROP POLICY IF EXISTS "read_nutrition_foods" ON public.nutrition_foods;
CREATE POLICY "read_nutrition_foods" ON public.nutrition_foods
  FOR SELECT TO authenticated
  USING (
    is_active = true 
    AND (
      origin = 'auron_global' 
      OR coach_id = auth.uid() 
      OR EXISTS (
        SELECT 1 FROM public.coach_alunos ca 
        WHERE ca.aluno_id = auth.uid() AND ca.coach_id = nutrition_foods.coach_id
      )
    )
  );

DROP POLICY IF EXISTS "manage_custom_nutrition_foods" ON public.nutrition_foods;
CREATE POLICY "manage_custom_nutrition_foods" ON public.nutrition_foods
  FOR ALL TO authenticated
  USING (coach_id = auth.uid())
  WITH CHECK (coach_id = auth.uid());

-- B. nutrition_food_portions
DROP POLICY IF EXISTS "read_portions" ON public.nutrition_food_portions;
CREATE POLICY "read_portions" ON public.nutrition_food_portions
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.nutrition_foods f WHERE f.id = food_id));

DROP POLICY IF EXISTS "manage_portions" ON public.nutrition_food_portions;
CREATE POLICY "manage_portions" ON public.nutrition_food_portions
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.nutrition_foods f WHERE f.id = food_id AND (f.coach_id = auth.uid())));

-- C. nutrition_plans
DROP POLICY IF EXISTS "read_nutrition_plans" ON public.nutrition_plans;
CREATE POLICY "read_nutrition_plans" ON public.nutrition_plans
  FOR SELECT TO authenticated
  USING (
    student_id = auth.uid() 
    OR coach_id = auth.uid() 
    OR EXISTS (SELECT 1 FROM public.coach_alunos ca WHERE ca.coach_id = auth.uid() AND ca.aluno_id = student_id)
  );

DROP POLICY IF EXISTS "manage_nutrition_plans" ON public.nutrition_plans;
CREATE POLICY "manage_nutrition_plans" ON public.nutrition_plans
  FOR ALL TO authenticated
  USING (
    coach_id = auth.uid() 
    OR EXISTS (SELECT 1 FROM public.coach_alunos ca WHERE ca.coach_id = auth.uid() AND ca.aluno_id = student_id)
  );

-- D. nutrition_plan_days
DROP POLICY IF EXISTS "read_plan_days" ON public.nutrition_plan_days;
CREATE POLICY "read_plan_days" ON public.nutrition_plan_days
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.nutrition_plans p WHERE p.id = plan_id));

DROP POLICY IF EXISTS "manage_plan_days" ON public.nutrition_plan_days;
CREATE POLICY "manage_plan_days" ON public.nutrition_plan_days
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.nutrition_plans p WHERE p.id = plan_id AND (p.coach_id = auth.uid())));

-- E. nutrition_meals
DROP POLICY IF EXISTS "read_meals" ON public.nutrition_meals;
CREATE POLICY "read_meals" ON public.nutrition_meals
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.nutrition_plan_days pd JOIN public.nutrition_plans p ON p.id = pd.plan_id WHERE pd.id = plan_day_id));

DROP POLICY IF EXISTS "manage_meals" ON public.nutrition_meals;
CREATE POLICY "manage_meals" ON public.nutrition_meals
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.nutrition_plan_days pd JOIN public.nutrition_plans p ON p.id = pd.plan_id WHERE pd.id = plan_day_id AND (p.coach_id = auth.uid())));

-- F. nutrition_meal_items
DROP POLICY IF EXISTS "read_meal_items" ON public.nutrition_meal_items;
CREATE POLICY "read_meal_items" ON public.nutrition_meal_items
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.nutrition_meals m JOIN public.nutrition_plan_days pd ON pd.id = m.plan_day_id JOIN public.nutrition_plans p ON p.id = pd.plan_id WHERE m.id = meal_id));

DROP POLICY IF EXISTS "manage_meal_items" ON public.nutrition_meal_items;
CREATE POLICY "manage_meal_items" ON public.nutrition_meal_items
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.nutrition_meals m JOIN public.nutrition_plan_days pd ON pd.id = m.plan_day_id JOIN public.nutrition_plans p ON p.id = pd.plan_id WHERE m.id = meal_id AND (p.coach_id = auth.uid())));

-- G. nutrition_substitutions
DROP POLICY IF EXISTS "read_substitutions" ON public.nutrition_substitutions;
CREATE POLICY "read_substitutions" ON public.nutrition_substitutions
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.nutrition_meal_items mi JOIN public.nutrition_meals m ON m.id = mi.meal_id JOIN public.nutrition_plan_days pd ON pd.id = m.plan_day_id JOIN public.nutrition_plans p ON p.id = pd.plan_id WHERE mi.id = meal_item_id));

DROP POLICY IF EXISTS "manage_substitutions" ON public.nutrition_substitutions;
CREATE POLICY "manage_substitutions" ON public.nutrition_substitutions
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.nutrition_meal_items mi JOIN public.nutrition_meals m ON m.id = mi.meal_id JOIN public.nutrition_plan_days pd ON pd.id = m.plan_day_id JOIN public.nutrition_plans p ON p.id = pd.plan_id WHERE mi.id = meal_item_id AND (p.coach_id = auth.uid())));

-- H. nutrition_meal_checkins
DROP POLICY IF EXISTS "read_checkins" ON public.nutrition_meal_checkins;
CREATE POLICY "read_checkins" ON public.nutrition_meal_checkins
  FOR SELECT TO authenticated
  USING (
    student_id = auth.uid() 
    OR EXISTS (SELECT 1 FROM public.coach_alunos ca WHERE ca.coach_id = auth.uid() AND ca.aluno_id = student_id)
  );

DROP POLICY IF EXISTS "manage_checkins" ON public.nutrition_meal_checkins;
CREATE POLICY "manage_checkins" ON public.nutrition_meal_checkins
  FOR ALL TO authenticated
  USING (student_id = auth.uid())
  WITH CHECK (student_id = auth.uid());

COMMIT;

-- @@FILE_END@@ 0026_auron_nutricao_digital_fase01.sql

-- @@FILE_START@@ 0027_add_gif_url_to_exercicios.sql
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

-- @@FILE_END@@ 0027_add_gif_url_to_exercicios.sql

-- @@FILE_START@@ 0028_must_change_password.sql
-- Flag para forçar troca de senha no primeiro acesso (convites com senha temporária)
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS must_change_password BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_profiles_must_change_password
  ON profiles (must_change_password)
  WHERE must_change_password = true;

COMMENT ON COLUMN profiles.must_change_password IS 'Quando true, o usuário deve trocar a senha antes de acessar o app';

-- @@FILE_END@@ 0028_must_change_password.sql

-- @@FILE_START@@ 0029_fichas_treino_fk_on_delete.sql
-- Corrige FKs que impedem exclusão de fichas_treino e treinos_alunos (PDF).
-- agenda_semanal: desvincula o dia da semana (SET NULL)
-- historico_treinos: remove execuções da ficha excluída (CASCADE)
-- feedbacks_treinos: preserva feedback, remove referência (SET NULL)

BEGIN;

ALTER TABLE agenda_semanal
  DROP CONSTRAINT IF EXISTS agenda_semanal_ficha_id_fkey;

ALTER TABLE agenda_semanal
  ADD CONSTRAINT agenda_semanal_ficha_id_fkey
  FOREIGN KEY (ficha_id) REFERENCES fichas_treino(id) ON DELETE SET NULL;

ALTER TABLE agenda_semanal
  DROP CONSTRAINT IF EXISTS agenda_semanal_treino_pdf_id_fkey;

ALTER TABLE agenda_semanal
  ADD CONSTRAINT agenda_semanal_treino_pdf_id_fkey
  FOREIGN KEY (treino_pdf_id) REFERENCES treinos_alunos(id) ON DELETE SET NULL;

ALTER TABLE historico_treinos
  DROP CONSTRAINT IF EXISTS historico_treinos_ficha_id_fkey;

ALTER TABLE historico_treinos
  ADD CONSTRAINT historico_treinos_ficha_id_fkey
  FOREIGN KEY (ficha_id) REFERENCES fichas_treino(id) ON DELETE CASCADE;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'feedbacks_treinos'
  ) THEN
    ALTER TABLE feedbacks_treinos
      DROP CONSTRAINT IF EXISTS feedbacks_treinos_ficha_id_fkey;

    ALTER TABLE feedbacks_treinos
      ADD CONSTRAINT feedbacks_treinos_ficha_id_fkey
      FOREIGN KEY (ficha_id) REFERENCES fichas_treino(id) ON DELETE SET NULL;
  END IF;
END $$;

COMMIT;

-- @@FILE_END@@ 0029_fichas_treino_fk_on_delete.sql

-- @@FILE_START@@ 0030_series_treino_peso_kg.sql
-- Colunas de peso em series_treino (schema normalizado, se existir).
-- No AURON, a carga é registrada pelo ALUNO na execução (historico_treinos),
-- não prescrita pelo coach na ficha. Estas colunas servem apenas para
-- ambientes com tabela normalizada que armazenem carga executada por série.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'series_treino'
  ) THEN
    ALTER TABLE series_treino ADD COLUMN IF NOT EXISTS peso_kg NUMERIC(6, 2);
    ALTER TABLE series_treino ADD COLUMN IF NOT EXISTS unidade_peso VARCHAR(2) DEFAULT 'kg';
  END IF;
END $$;

-- @@FILE_END@@ 0030_series_treino_peso_kg.sql

-- @@FILE_START@@ 0031_treinos_list_perf.sql
-- Performance da listagem /admin/treinos:
-- índices nas queries quentes + contagem sem enviar configuracao JSONB.

CREATE INDEX IF NOT EXISTS idx_fichas_treino_coach_criado
  ON public.fichas_treino (coach_id, criado_em DESC);

CREATE INDEX IF NOT EXISTS idx_treinos_alunos_coach_upload
  ON public.treinos_alunos (coach_id, data_upload DESC);

CREATE INDEX IF NOT EXISTS idx_historico_treinos_ficha_conclusao
  ON public.historico_treinos (ficha_id, data_conclusao DESC);

CREATE INDEX IF NOT EXISTS idx_historico_treinos_aluno_conclusao
  ON public.historico_treinos (aluno_id, data_conclusao DESC);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'fichas_treino'
      AND column_name = 'exercicios_count'
  ) THEN
    ALTER TABLE public.fichas_treino
      ADD COLUMN exercicios_count integer
      GENERATED ALWAYS AS (
        COALESCE(jsonb_array_length(configuracao->'exercicios'), 0)
      ) STORED;
  END IF;
END $$;

-- @@FILE_END@@ 0031_treinos_list_perf.sql

-- @@FILE_START@@ 0032_nutrition_orientacoes_e_alimentos.sql
-- Nutrição: orientações gerais (suplementação) + farinha de arroz + ovo mexido

ALTER TABLE public.nutrition_plans
  ADD COLUMN IF NOT EXISTS orientacoes_gerais text;

COMMENT ON COLUMN public.nutrition_plans.orientacoes_gerais IS
  'Orientações gerais do plano: suplementação (creatina, ômega 3), hidratação, timing, etc.';

UPDATE public.nutrition_plans
SET orientacoes_gerais = notes
WHERE orientacoes_gerais IS NULL
  AND notes IS NOT NULL
  AND btrim(notes) <> '';

-- Farinha de arroz enriquecida (TACO)
INSERT INTO public.nutrition_foods (
  name, slug, category, default_state, description,
  base_unit, base_quantity,
  calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g,
  source_name, source_reference, origin, is_active
)
SELECT
  'Farinha de arroz enriquecida',
  'farinha-de-arroz-enriquecida',
  'carboidrato',
  'em_po',
  'Farinha de arroz enriquecida — comum em dietas off/cutting',
  'g', 100,
  363, 1.3, 85.5, 0.3, 0.6,
  'TACO', 'UNICAMP', 'auron_global', true
WHERE NOT EXISTS (
  SELECT 1 FROM public.nutrition_foods WHERE slug = 'farinha-de-arroz-enriquecida'
);

INSERT INTO public.nutrition_foods (
  name, slug, category, default_state, description,
  base_unit, base_quantity,
  calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g,
  source_name, source_reference, origin, is_active
)
SELECT
  'Farinha de arroz integral',
  'farinha-de-arroz-integral',
  'carboidrato',
  'em_po',
  'Farinha de arroz integral',
  'g', 100,
  363, 7.0, 76.0, 2.2, 4.0,
  'TBCA', 'Valor médio', 'auron_global', true
WHERE NOT EXISTS (
  SELECT 1 FROM public.nutrition_foods WHERE slug = 'farinha-de-arroz-integral'
);

INSERT INTO public.nutrition_foods (
  name, slug, category, default_state, description,
  base_unit, base_quantity,
  calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, fiber_per_100g,
  source_name, source_reference, origin, is_active
)
SELECT
  'Ovo inteiro cru ou mexido',
  'ovo-inteiro-cru-mexido',
  'proteina',
  'cru',
  'Ovo de galinha inteiro cru ou mexido (sem óleo)',
  'g', 100,
  143, 13.0, 0.8, 9.5, 0.0,
  'TACO', 'UNICAMP', 'auron_global', true
WHERE NOT EXISTS (
  SELECT 1 FROM public.nutrition_foods WHERE slug = 'ovo-inteiro-cru-mexido'
);

INSERT INTO public.nutrition_food_portions (food_id, label, grams, is_default)
SELECT f.id, p.label, p.grams, p.is_default
FROM public.nutrition_foods f
CROSS JOIN (
  VALUES
    ('Colher de sopa cheia', 10::numeric, false),
    ('Colher de chá', 3::numeric, false),
    ('30g', 30::numeric, true)
) AS p(label, grams, is_default)
WHERE f.slug = 'farinha-de-arroz-enriquecida'
  AND NOT EXISTS (
    SELECT 1 FROM public.nutrition_food_portions fp
    WHERE fp.food_id = f.id AND fp.label = p.label
  );

INSERT INTO public.nutrition_food_portions (food_id, label, grams, is_default)
SELECT f.id, p.label, p.grams, p.is_default
FROM public.nutrition_foods f
CROSS JOIN (
  VALUES
    ('Colher de sopa cheia', 10::numeric, false),
    ('Colher de chá', 3::numeric, false),
    ('30g', 30::numeric, true)
) AS p(label, grams, is_default)
WHERE f.slug = 'farinha-de-arroz-integral'
  AND NOT EXISTS (
    SELECT 1 FROM public.nutrition_food_portions fp
    WHERE fp.food_id = f.id AND fp.label = p.label
  );

INSERT INTO public.nutrition_food_portions (food_id, label, grams, is_default)
SELECT f.id, p.label, p.grams, p.is_default
FROM public.nutrition_foods f
CROSS JOIN (
  VALUES
    ('Unidade média', 50::numeric, true),
    ('100g', 100::numeric, false)
) AS p(label, grams, is_default)
WHERE f.slug = 'ovo-inteiro-cru-mexido'
  AND NOT EXISTS (
    SELECT 1 FROM public.nutrition_food_portions fp
    WHERE fp.food_id = f.id AND fp.label = p.label
  );

-- Ovo cozido: garantir "Unidade média" como default limpa p/ Nx
INSERT INTO public.nutrition_food_portions (food_id, label, grams, is_default)
SELECT f.id, 'Unidade média', 50, false
FROM public.nutrition_foods f
WHERE f.slug = 'ovo-inteiro-cozido'
  AND NOT EXISTS (
    SELECT 1 FROM public.nutrition_food_portions fp
    WHERE fp.food_id = f.id AND fp.label = 'Unidade média'
  );

UPDATE public.nutrition_food_portions fp
SET is_default = (fp.label = 'Unidade média')
FROM public.nutrition_foods f
WHERE fp.food_id = f.id
  AND f.slug = 'ovo-inteiro-cozido';

-- @@FILE_END@@ 0032_nutrition_orientacoes_e_alimentos.sql

-- @@FILE_START@@ 0033_fix_avatars_storage_rls.sql
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

-- @@FILE_END@@ 0033_fix_avatars_storage_rls.sql

-- @@FILE_START@@ 0034_create_cardio_tables.sql
-- Cardio: prescrição do coach + sessões executadas pelo aluno
-- kcal/zona de FC são calculados no servidor e persistidos com snapshot de peso/idade,
-- para que o histórico não mude quando o aluno atualiza as medidas.

CREATE TABLE IF NOT EXISTS public.cardio_prescricoes (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id          uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  aluno_id          uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  modalidade        text NOT NULL,
  duracao_min       integer NOT NULL CHECK (duracao_min > 0 AND duracao_min <= 600),
  intensidade       text CHECK (intensidade IS NULL OR intensidade IN ('leve', 'moderada', 'intensa')),
  fc_alvo_min       integer CHECK (fc_alvo_min IS NULL OR fc_alvo_min BETWEEN 30 AND 250),
  fc_alvo_max       integer CHECK (fc_alvo_max IS NULL OR fc_alvo_max BETWEEN 30 AND 250),
  distancia_alvo_km numeric(5,2) CHECK (distancia_alvo_km IS NULL OR distancia_alvo_km > 0),
  observacao        text,
  dias_semana       smallint[],
  ativo             boolean NOT NULL DEFAULT true,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT cardio_prescricoes_fc_alvo_ordem
    CHECK (fc_alvo_min IS NULL OR fc_alvo_max IS NULL OR fc_alvo_min <= fc_alvo_max),
  -- Postgres não permite subquery em CHECK; <@ valida que todos os dias ∈ 0..6
  CONSTRAINT cardio_prescricoes_dias_semana_validos
    CHECK (
      dias_semana IS NULL
      OR (
        cardinality(dias_semana) <= 7
        AND dias_semana <@ ARRAY[0, 1, 2, 3, 4, 5, 6]::smallint[]
      )
    )
);

CREATE TABLE IF NOT EXISTS public.cardio_sessoes (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  aluno_id       uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  prescricao_id  uuid REFERENCES public.cardio_prescricoes(id) ON DELETE SET NULL,
  modalidade     text NOT NULL,
  data           date NOT NULL DEFAULT current_date,
  duracao_min    integer NOT NULL CHECK (duracao_min > 0 AND duracao_min <= 600),
  fc_media       integer CHECK (fc_media IS NULL OR fc_media BETWEEN 30 AND 250),
  distancia_km   numeric(5,2) CHECK (distancia_km IS NULL OR distancia_km > 0),
  rpe            integer CHECK (rpe IS NULL OR rpe BETWEEN 1 AND 10),
  kcal_calculado numeric(7,1) CHECK (kcal_calculado IS NULL OR kcal_calculado >= 0),
  peso_usado     numeric(5,2) CHECK (peso_usado IS NULL OR peso_usado BETWEEN 20 AND 300),
  idade_usada    integer CHECK (idade_usada IS NULL OR idade_usada BETWEEN 5 AND 120),
  zona_fc        text CHECK (zona_fc IS NULL OR zona_fc IN ('Z1','Z2','Z3','Z4','Z5')),
  observacao     text,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_cardio_prescricoes_aluno  ON public.cardio_prescricoes (aluno_id) WHERE ativo = true;
CREATE INDEX IF NOT EXISTS idx_cardio_prescricoes_coach  ON public.cardio_prescricoes (coach_id);
CREATE INDEX IF NOT EXISTS idx_cardio_sessoes_aluno_data ON public.cardio_sessoes (aluno_id, data DESC);
CREATE INDEX IF NOT EXISTS idx_cardio_sessoes_prescricao ON public.cardio_sessoes (prescricao_id);

ALTER TABLE public.cardio_prescricoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cardio_sessoes     ENABLE ROW LEVEL SECURITY;

-- ── cardio_prescricoes ──────────────────────────────────────────────────────
-- Coach lê as prescrições que criou para os próprios alunos
DROP POLICY IF EXISTS cardio_prescricoes_coach_select ON public.cardio_prescricoes;
CREATE POLICY cardio_prescricoes_coach_select
  ON public.cardio_prescricoes FOR SELECT
  TO authenticated
  USING (
    coach_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.coach_alunos ca
      WHERE ca.coach_id = auth.uid() AND ca.aluno_id = cardio_prescricoes.aluno_id
    )
  );

-- Aluno lê as próprias prescrições
DROP POLICY IF EXISTS cardio_prescricoes_aluno_select ON public.cardio_prescricoes;
CREATE POLICY cardio_prescricoes_aluno_select
  ON public.cardio_prescricoes FOR SELECT
  TO authenticated
  USING (aluno_id = auth.uid());

-- Escrita do coach passa pelo gate de assinatura, como nas demais tabelas
DROP POLICY IF EXISTS cardio_prescricoes_coach_insert ON public.cardio_prescricoes;
CREATE POLICY cardio_prescricoes_coach_insert
  ON public.cardio_prescricoes FOR INSERT
  TO authenticated
  WITH CHECK (
    coach_id = auth.uid()
    AND public.coach_has_write_access()
    AND EXISTS (
      SELECT 1 FROM public.coach_alunos ca
      WHERE ca.coach_id = auth.uid() AND ca.aluno_id = cardio_prescricoes.aluno_id
    )
  );

DROP POLICY IF EXISTS cardio_prescricoes_coach_update ON public.cardio_prescricoes;
CREATE POLICY cardio_prescricoes_coach_update
  ON public.cardio_prescricoes FOR UPDATE
  TO authenticated
  USING (coach_id = auth.uid() AND public.coach_has_write_access())
  WITH CHECK (coach_id = auth.uid() AND public.coach_has_write_access());

DROP POLICY IF EXISTS cardio_prescricoes_coach_delete ON public.cardio_prescricoes;
CREATE POLICY cardio_prescricoes_coach_delete
  ON public.cardio_prescricoes FOR DELETE
  TO authenticated
  USING (coach_id = auth.uid() AND public.coach_has_write_access());

DROP POLICY IF EXISTS super_admin_cardio_prescricoes ON public.cardio_prescricoes;
CREATE POLICY super_admin_cardio_prescricoes
  ON public.cardio_prescricoes FOR ALL
  TO authenticated
  USING (public.get_auth_user_role() = 'super_admin');

-- ── cardio_sessoes ──────────────────────────────────────────────────────────
-- Aluno gerencia as próprias sessões
DROP POLICY IF EXISTS cardio_sessoes_aluno_select ON public.cardio_sessoes;
CREATE POLICY cardio_sessoes_aluno_select
  ON public.cardio_sessoes FOR SELECT
  TO authenticated
  USING (aluno_id = auth.uid());

DROP POLICY IF EXISTS cardio_sessoes_aluno_insert ON public.cardio_sessoes;
CREATE POLICY cardio_sessoes_aluno_insert
  ON public.cardio_sessoes FOR INSERT
  TO authenticated
  WITH CHECK (aluno_id = auth.uid());

DROP POLICY IF EXISTS cardio_sessoes_aluno_update ON public.cardio_sessoes;
CREATE POLICY cardio_sessoes_aluno_update
  ON public.cardio_sessoes FOR UPDATE
  TO authenticated
  USING (aluno_id = auth.uid())
  WITH CHECK (aluno_id = auth.uid());

DROP POLICY IF EXISTS cardio_sessoes_aluno_delete ON public.cardio_sessoes;
CREATE POLICY cardio_sessoes_aluno_delete
  ON public.cardio_sessoes FOR DELETE
  TO authenticated
  USING (aluno_id = auth.uid());

-- Coach lê as sessões dos próprios alunos (inclui sessões livres, sem prescrição)
DROP POLICY IF EXISTS cardio_sessoes_coach_select ON public.cardio_sessoes;
CREATE POLICY cardio_sessoes_coach_select
  ON public.cardio_sessoes FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.coach_alunos ca
      WHERE ca.coach_id = auth.uid() AND ca.aluno_id = cardio_sessoes.aluno_id
    )
  );

DROP POLICY IF EXISTS super_admin_cardio_sessoes ON public.cardio_sessoes;
CREATE POLICY super_admin_cardio_sessoes
  ON public.cardio_sessoes FOR ALL
  TO authenticated
  USING (public.get_auth_user_role() = 'super_admin');

-- ── updated_at ──────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.set_cardio_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_cardio_prescricoes_updated_at ON public.cardio_prescricoes;
CREATE TRIGGER trg_cardio_prescricoes_updated_at
  BEFORE UPDATE ON public.cardio_prescricoes
  FOR EACH ROW
  EXECUTE FUNCTION public.set_cardio_updated_at();

DROP TRIGGER IF EXISTS trg_cardio_sessoes_updated_at ON public.cardio_sessoes;
CREATE TRIGGER trg_cardio_sessoes_updated_at
  BEFORE UPDATE ON public.cardio_sessoes
  FOR EACH ROW
  EXECUTE FUNCTION public.set_cardio_updated_at();
-- @@FILE_END@@ 0034_create_cardio_tables.sql

-- @@FILE_START@@ 0035_create_agenda_diaria.sql
-- Overrides de agenda por data específica.
-- A agenda_semanal continua sendo o template recorrente (seg–dom).
-- Edits em semanas futuras/passadas gravam aqui e NÃO espelham o template.

CREATE TABLE IF NOT EXISTS public.agenda_diaria (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  aluno_id       uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  data           date NOT NULL,
  ficha_id       uuid REFERENCES public.fichas_treino(id) ON DELETE SET NULL,
  treino_pdf_id  uuid REFERENCES public.treinos_alunos(id) ON DELETE SET NULL,
  is_off         boolean NOT NULL DEFAULT false,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT agenda_diaria_aluno_data_unique UNIQUE (aluno_id, data)
);

CREATE INDEX IF NOT EXISTS idx_agenda_diaria_aluno_data
  ON public.agenda_diaria (aluno_id, data);

ALTER TABLE public.agenda_diaria ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS agenda_diaria_aluno_all ON public.agenda_diaria;
CREATE POLICY agenda_diaria_aluno_all
  ON public.agenda_diaria
  FOR ALL
  TO authenticated
  USING (aluno_id = auth.uid())
  WITH CHECK (aluno_id = auth.uid());

DROP POLICY IF EXISTS agenda_diaria_coach_select ON public.agenda_diaria;
CREATE POLICY agenda_diaria_coach_select
  ON public.agenda_diaria
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.coach_alunos ca
      WHERE ca.coach_id = auth.uid()
        AND ca.aluno_id = agenda_diaria.aluno_id
    )
  );

DROP POLICY IF EXISTS agenda_diaria_super_admin ON public.agenda_diaria;
CREATE POLICY agenda_diaria_super_admin
  ON public.agenda_diaria
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'super_admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'super_admin'
    )
  );

-- @@FILE_END@@ 0035_create_agenda_diaria.sql

-- @@FILE_START@@ 0036_nutrition_substitutions_meal_item_idx.sql
-- Acelera leitura de substituições por item (hydratePlanDays usa .in(meal_item_id, ...))
CREATE INDEX IF NOT EXISTS idx_nutrition_substitutions_meal_item_id
  ON public.nutrition_substitutions (meal_item_id);

-- @@FILE_END@@ 0036_nutrition_substitutions_meal_item_idx.sql

-- @@FILE_START@@ 0037_aluno_screens_perf.sql
-- Índices para as telas do aluno (nutrição e treinos)

-- Embed plano → dias na nutrição do aluno (loadStudentNutritionPageData)
CREATE INDEX IF NOT EXISTS idx_nutrition_plan_days_plan_id
  ON public.nutrition_plan_days (plan_id);

CREATE INDEX IF NOT EXISTS idx_nutrition_food_portions_food_id
  ON public.nutrition_food_portions (food_id);

-- Lista de rotinas do aluno: aluno_id + ativo, ordenado por criado_em DESC
CREATE INDEX IF NOT EXISTS idx_fichas_treino_aluno_criado
  ON public.fichas_treino (aluno_id, criado_em DESC)
  WHERE ativo = true;

-- Fichas PDF do aluno
CREATE INDEX IF NOT EXISTS idx_treinos_alunos_aluno_upload
  ON public.treinos_alunos (aluno_id, data_upload DESC);

-- Cargas "Anterior" na execução: aluno_id + exercicio_id, mais recentes primeiro
CREATE INDEX IF NOT EXISTS idx_historico_treinos_aluno_exercicio
  ON public.historico_treinos (aluno_id, exercicio_id, data_conclusao DESC);

-- @@FILE_END@@ 0037_aluno_screens_perf.sql

-- @@FILE_START@@ 0038_aluno_planos_historico.sql
-- Histórico financeiro por aluno (vendas e renovações de mentoria)
-- Fonte para métricas de faturamento sem estimativas por vigência.

CREATE TABLE IF NOT EXISTS public.aluno_planos_historico (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  aluno_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  coach_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status_pagamento text NOT NULL
    CHECK (status_pagamento IN ('pago', 'pendente', 'atrasado')),
  tipo_plano text NOT NULL
    CHECK (tipo_plano IN ('mensal', 'trimestral', 'semestral', 'anual')),
  valor_plano numeric(12,2) NOT NULL CHECK (valor_plano >= 0),
  data_inicio date NOT NULL,
  data_expiracao date NOT NULL,
  origem text NOT NULL DEFAULT 'manual_coach',
  observacao text,
  registrado_em timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_aluno_planos_historico_aluno_data
  ON public.aluno_planos_historico (aluno_id, registrado_em DESC);

CREATE INDEX IF NOT EXISTS idx_aluno_planos_historico_coach_data
  ON public.aluno_planos_historico (coach_id, registrado_em DESC);

-- Backfill inicial: cria 1 registro por plano atual pago, evitando card zerado
-- para alunos já ativos antes desta migração.
INSERT INTO public.aluno_planos_historico (
  aluno_id,
  coach_id,
  status_pagamento,
  tipo_plano,
  valor_plano,
  data_inicio,
  data_expiracao,
  origem,
  observacao
)
SELECT
  p.id AS aluno_id,
  p.coach_id,
  p.status_pagamento,
  p.tipo_plano,
  p.valor_plano,
  p.data_inicio::date,
  p.data_expiracao::date,
  'migration_backfill',
  'Backfill inicial do plano vigente pago'
FROM public.profiles p
WHERE p.role = 'aluno'
  AND p.coach_id IS NOT NULL
  AND p.status_pagamento = 'pago'
  AND p.valor_plano IS NOT NULL
  AND p.tipo_plano IN ('mensal', 'trimestral', 'semestral', 'anual')
  AND p.data_inicio IS NOT NULL
  AND p.data_expiracao IS NOT NULL
  AND NOT EXISTS (
    SELECT 1
    FROM public.aluno_planos_historico h
    WHERE h.aluno_id = p.id
      AND h.tipo_plano = p.tipo_plano
      AND h.valor_plano = p.valor_plano
      AND h.data_inicio = p.data_inicio::date
      AND h.data_expiracao = p.data_expiracao::date
  );

ALTER TABLE public.aluno_planos_historico ENABLE ROW LEVEL SECURITY;

-- Coach lê somente os próprios registros
DROP POLICY IF EXISTS coach_select_own_plan_history ON public.aluno_planos_historico;
CREATE POLICY coach_select_own_plan_history
  ON public.aluno_planos_historico
  FOR SELECT
  USING (coach_id = auth.uid());

-- Super admin lê tudo
DROP POLICY IF EXISTS super_admin_select_all_plan_history ON public.aluno_planos_historico;
CREATE POLICY super_admin_select_all_plan_history
  ON public.aluno_planos_historico
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role = 'super_admin'
    )
  );

-- Coach insere apenas para alunos vinculados
DROP POLICY IF EXISTS coach_insert_own_plan_history ON public.aluno_planos_historico;
CREATE POLICY coach_insert_own_plan_history
  ON public.aluno_planos_historico
  FOR INSERT
  WITH CHECK (
    coach_id = auth.uid()
    AND EXISTS (
      SELECT 1
      FROM public.coach_alunos ca
      WHERE ca.coach_id = auth.uid()
        AND ca.aluno_id = aluno_id
    )
  );

-- Super admin pode inserir histórico para qualquer aluno
DROP POLICY IF EXISTS super_admin_insert_plan_history ON public.aluno_planos_historico;
CREATE POLICY super_admin_insert_plan_history
  ON public.aluno_planos_historico
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role = 'super_admin'
    )
  );

-- @@FILE_END@@ 0038_aluno_planos_historico.sql

-- @@FILE_START@@ 0039_coach_planos_personalizados.sql
-- ═══════════════════════════════════════════════════════════════
-- 0056: Planos de venda personalizados por coach
-- Cada coach pode criar/editar seus próprios planos (ex.: mentoria
-- de 2 meses). RLS garante isolamento total: o plano pertence apenas
-- ao coach que o criou — nada é global nem visível a outros coaches.
-- Os planos padrão (mensal/trimestral/semestral/anual) continuam
-- hardcoded no app; esta tabela guarda somente os personalizados.
-- ═══════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.coach_planos (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id       uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  nome           text NOT NULL
    CHECK (char_length(btrim(nome)) BETWEEN 2 AND 40),
  -- slug: valor gravado em profiles.tipo_plano / aluno_planos_historico.tipo_plano
  slug           text NOT NULL
    CHECK (slug ~ '^[a-z0-9][a-z0-9_]{1,39}$'),
  duracao_meses  integer NOT NULL
    CHECK (duracao_meses BETWEEN 1 AND 60),
  valor_sugerido numeric(12,2)
    CHECK (valor_sugerido IS NULL OR valor_sugerido >= 0),
  ativo          boolean NOT NULL DEFAULT true,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now(),
  UNIQUE (coach_id, slug),
  -- Slugs reservados dos planos padrão/globais — evita colisão de semântica
  CONSTRAINT coach_planos_slug_nao_reservado
    CHECK (slug NOT IN ('mensal', 'trimestral', 'semestral', 'anual', 'outros', 'sem_plano'))
);

CREATE INDEX IF NOT EXISTS idx_coach_planos_coach_ativo
  ON public.coach_planos (coach_id)
  WHERE ativo;

-- updated_at automático
CREATE OR REPLACE FUNCTION public.tg_coach_planos_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_coach_planos_updated_at ON public.coach_planos;
CREATE TRIGGER trg_coach_planos_updated_at
  BEFORE UPDATE ON public.coach_planos
  FOR EACH ROW
  EXECUTE FUNCTION public.tg_coach_planos_updated_at();

-- ───────────────────────────────────────────────────────────────
-- RLS: cada linha visível/mutável APENAS pelo coach dono
-- ───────────────────────────────────────────────────────────────
ALTER TABLE public.coach_planos ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.coach_planos FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.coach_planos TO authenticated;

DROP POLICY IF EXISTS coach_planos_select_own ON public.coach_planos;
CREATE POLICY coach_planos_select_own
  ON public.coach_planos
  FOR SELECT
  TO authenticated
  USING (coach_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS coach_planos_insert_own ON public.coach_planos;
CREATE POLICY coach_planos_insert_own
  ON public.coach_planos
  FOR INSERT
  TO authenticated
  WITH CHECK (coach_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS coach_planos_update_own ON public.coach_planos;
CREATE POLICY coach_planos_update_own
  ON public.coach_planos
  FOR UPDATE
  TO authenticated
  USING (coach_id = (SELECT auth.uid()))
  WITH CHECK (coach_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS coach_planos_delete_own ON public.coach_planos;
CREATE POLICY coach_planos_delete_own
  ON public.coach_planos
  FOR DELETE
  TO authenticated
  USING (coach_id = (SELECT auth.uid()));

-- ───────────────────────────────────────────────────────────────
-- aluno_planos_historico: o CHECK antigo só aceitava os 4 planos
-- padrão — relaxa para aceitar slugs de planos personalizados.
-- ───────────────────────────────────────────────────────────────
ALTER TABLE public.aluno_planos_historico
  DROP CONSTRAINT IF EXISTS aluno_planos_historico_tipo_plano_check;

ALTER TABLE public.aluno_planos_historico
  ADD CONSTRAINT aluno_planos_historico_tipo_plano_check
  CHECK (char_length(btrim(tipo_plano)) BETWEEN 2 AND 40);

-- @@FILE_END@@ 0039_coach_planos_personalizados.sql

-- @@FILE_START@@ 0040_chat_coach_aluno.sql
-- Chat Coach ↔ Aluno (texto, 1:1, Realtime)
-- AURONFIT · julho 2026

-- ─── 1. Conversas ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.chat_conversas (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id        uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  aluno_id        uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  criada_em       timestamptz NOT NULL DEFAULT now(),
  ultima_msg      text,
  ultima_msg_em   timestamptz,
  ultima_msg_de   uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  nao_lidas_coach integer NOT NULL DEFAULT 0 CHECK (nao_lidas_coach >= 0),
  nao_lidas_aluno integer NOT NULL DEFAULT 0 CHECK (nao_lidas_aluno >= 0),
  UNIQUE (coach_id, aluno_id),
  CONSTRAINT chat_conversas_diferentes CHECK (coach_id <> aluno_id)
);

-- ─── 2. Mensagens ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.chat_mensagens (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversa_id     uuid NOT NULL REFERENCES public.chat_conversas(id) ON DELETE CASCADE,
  remetente_id    uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  texto           text NOT NULL CHECK (char_length(texto) BETWEEN 1 AND 4000),
  enviada_em      timestamptz NOT NULL DEFAULT now(),
  lida_em         timestamptz
);

CREATE INDEX IF NOT EXISTS idx_chat_msgs_conversa
  ON public.chat_mensagens (conversa_id, enviada_em DESC);

CREATE INDEX IF NOT EXISTS idx_chat_conversas_coach
  ON public.chat_conversas (coach_id, ultima_msg_em DESC NULLS LAST);

CREATE INDEX IF NOT EXISTS idx_chat_conversas_aluno
  ON public.chat_conversas (aluno_id, ultima_msg_em DESC NULLS LAST);

-- ─── 3. RLS ──────────────────────────────────────────────────────────────────
ALTER TABLE public.chat_conversas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_mensagens ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "chat_conversas_select" ON public.chat_conversas;
CREATE POLICY "chat_conversas_select" ON public.chat_conversas
  FOR SELECT TO authenticated
  USING (auth.uid() = coach_id OR auth.uid() = aluno_id);

DROP POLICY IF EXISTS "chat_conversas_insert" ON public.chat_conversas;
CREATE POLICY "chat_conversas_insert" ON public.chat_conversas
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = coach_id
    AND EXISTS (
      SELECT 1 FROM public.coach_alunos ca
      WHERE ca.coach_id = auth.uid() AND ca.aluno_id = chat_conversas.aluno_id
    )
  );

DROP POLICY IF EXISTS "chat_conversas_update" ON public.chat_conversas;
CREATE POLICY "chat_conversas_update" ON public.chat_conversas
  FOR UPDATE TO authenticated
  USING (auth.uid() = coach_id OR auth.uid() = aluno_id)
  WITH CHECK (auth.uid() = coach_id OR auth.uid() = aluno_id);

DROP POLICY IF EXISTS "chat_mensagens_select" ON public.chat_mensagens;
CREATE POLICY "chat_mensagens_select" ON public.chat_mensagens
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.chat_conversas c
      WHERE c.id = conversa_id
        AND (c.coach_id = auth.uid() OR c.aluno_id = auth.uid())
    )
  );

DROP POLICY IF EXISTS "chat_mensagens_insert" ON public.chat_mensagens;
CREATE POLICY "chat_mensagens_insert" ON public.chat_mensagens
  FOR INSERT TO authenticated
  WITH CHECK (
    remetente_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.chat_conversas c
      WHERE c.id = conversa_id
        AND (c.coach_id = auth.uid() OR c.aluno_id = auth.uid())
    )
  );

DROP POLICY IF EXISTS "chat_mensagens_update" ON public.chat_mensagens;
CREATE POLICY "chat_mensagens_update" ON public.chat_mensagens
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.chat_conversas c
      WHERE c.id = conversa_id
        AND (c.coach_id = auth.uid() OR c.aluno_id = auth.uid())
    )
  );

-- ─── 4. Trigger — última mensagem + não lidas ────────────────────────────────
CREATE OR REPLACE FUNCTION public.fn_after_chat_mensagem()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_coach_id uuid;
  v_aluno_id uuid;
BEGIN
  SELECT coach_id, aluno_id INTO v_coach_id, v_aluno_id
  FROM public.chat_conversas
  WHERE id = NEW.conversa_id;

  IF v_coach_id IS NULL THEN
    RETURN NEW;
  END IF;

  UPDATE public.chat_conversas SET
    ultima_msg      = NEW.texto,
    ultima_msg_em   = NEW.enviada_em,
    ultima_msg_de   = NEW.remetente_id,
    nao_lidas_coach = CASE
      WHEN NEW.remetente_id = v_aluno_id THEN nao_lidas_coach + 1
      ELSE nao_lidas_coach
    END,
    nao_lidas_aluno = CASE
      WHEN NEW.remetente_id = v_coach_id THEN nao_lidas_aluno + 1
      ELSE nao_lidas_aluno
    END
  WHERE id = NEW.conversa_id;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_after_chat_mensagem ON public.chat_mensagens;
CREATE TRIGGER trg_after_chat_mensagem
  AFTER INSERT ON public.chat_mensagens
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_after_chat_mensagem();

-- ─── 5. RPC — marcar lidas ───────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.fn_marcar_lidas(p_conversa_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_coach_id uuid;
  v_aluno_id uuid;
  v_uid uuid := auth.uid();
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Não autenticado';
  END IF;

  SELECT coach_id, aluno_id INTO v_coach_id, v_aluno_id
  FROM public.chat_conversas
  WHERE id = p_conversa_id;

  IF v_coach_id IS NULL OR (v_uid <> v_coach_id AND v_uid <> v_aluno_id) THEN
    RAISE EXCEPTION 'Sem permissão';
  END IF;

  UPDATE public.chat_mensagens
  SET lida_em = now()
  WHERE conversa_id = p_conversa_id
    AND remetente_id <> v_uid
    AND lida_em IS NULL;

  IF v_uid = v_coach_id THEN
    UPDATE public.chat_conversas SET nao_lidas_coach = 0 WHERE id = p_conversa_id;
  ELSE
    UPDATE public.chat_conversas SET nao_lidas_aluno = 0 WHERE id = p_conversa_id;
  END IF;
END;
$$;

-- ─── 6. RPC — get ou criar conversa (aluno ou coach) ─────────────────────────
CREATE OR REPLACE FUNCTION public.fn_get_ou_criar_conversa(p_coach_id uuid, p_aluno_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_id uuid;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Não autenticado';
  END IF;

  IF v_uid <> p_coach_id AND v_uid <> p_aluno_id THEN
    RAISE EXCEPTION 'Sem permissão';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.coach_alunos
    WHERE coach_id = p_coach_id AND aluno_id = p_aluno_id
  ) THEN
    RAISE EXCEPTION 'Relação coach-aluno inexistente';
  END IF;

  SELECT id INTO v_id
  FROM public.chat_conversas
  WHERE coach_id = p_coach_id AND aluno_id = p_aluno_id;

  IF v_id IS NOT NULL THEN
    RETURN v_id;
  END IF;

  INSERT INTO public.chat_conversas (coach_id, aluno_id)
  VALUES (p_coach_id, p_aluno_id)
  ON CONFLICT (coach_id, aluno_id) DO UPDATE
    SET coach_id = EXCLUDED.coach_id
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.fn_marcar_lidas(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.fn_get_ou_criar_conversa(uuid, uuid) TO authenticated;

-- ─── 7. Realtime ─────────────────────────────────────────────────────────────
DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_conversas;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_mensagens;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
END $$;

-- @@FILE_END@@ 0040_chat_coach_aluno.sql

-- @@FILE_START@@ 0041_profiles_whatsapp.sql
-- WhatsApp em profiles (alunos e coaches)
-- Antes: digitos com DDI (ex.: 5567999999999). UI continua coletando; app deixa de depender só de user_metadata.

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS whatsapp text;

COMMENT ON COLUMN public.profiles.whatsapp IS
  'Telefone WhatsApp (somente digitos, com DDI). Usado em wa.me e contato coach/aluno.';

CREATE INDEX IF NOT EXISTS idx_profiles_whatsapp
  ON public.profiles (whatsapp)
  WHERE whatsapp IS NOT NULL;

-- @@FILE_END@@ 0041_profiles_whatsapp.sql

-- @@FILE_START@@ 0042_normalize_exercicios_equipamento.sql
-- Normaliza valores legados/duplicados de equipamento para a lista canônica
-- (CHECK: Nenhum, Banda de Resistência, Banda de Suspensão, Barra, Disco de Peso,
--  Haltere, Kettlebell, Máquina, Outro).

-- Haltere (inclui EN e plurais)
UPDATE public.exercicios_biblioteca
SET equipamento = 'Haltere'
WHERE equipamento IS NOT NULL
  AND lower(trim(equipamento)) IN (
    'haltere',
    'halter',
    'halteres',
    'halteres / dumbbells',
    'halteres/dumbbells',
    'dumbbell',
    'dumbbells',
    'dumbell',
    'dumbells'
  );

-- Máquina / cabo / polia / smith / cardio machine
UPDATE public.exercicios_biblioteca
SET equipamento = 'Máquina'
WHERE equipamento IS NOT NULL
  AND lower(trim(equipamento)) IN (
    'máquina',
    'maquina',
    'máquina / cabo / polia',
    'maquina / cabo / polia',
    'máquina/cabo/polia',
    'maquina/cabo/polia',
    'cabo/polia',
    'cabo',
    'polia',
    'cable',
    'smith',
    'máquina de cardio',
    'maquina de cardio',
    'cardio machine'
  );

-- Peso corporal → Nenhum
UPDATE public.exercicios_biblioteca
SET equipamento = 'Nenhum'
WHERE equipamento IS NOT NULL
  AND lower(trim(equipamento)) IN (
    'peso corporal',
    'bodyweight',
    'body weight',
    'nenhum',
    'none'
  );

-- Barra
UPDATE public.exercicios_biblioteca
SET equipamento = 'Barra'
WHERE equipamento IS NOT NULL
  AND lower(trim(equipamento)) IN (
    'barra',
    'barbell',
    'barra olímpica',
    'barra olimpica'
  );

-- Kettlebell
UPDATE public.exercicios_biblioteca
SET equipamento = 'Kettlebell'
WHERE equipamento IS NOT NULL
  AND lower(trim(equipamento)) IN (
    'kettlebell',
    'kettlebells',
    'kettle bell'
  );

-- Bandas
UPDATE public.exercicios_biblioteca
SET equipamento = 'Banda de Resistência'
WHERE equipamento IS NOT NULL
  AND lower(trim(equipamento)) IN (
    'banda de resistência',
    'banda de resistencia',
    'elástico',
    'elastico',
    'resistance band',
    'banda elástica',
    'banda elastica'
  );

UPDATE public.exercicios_biblioteca
SET equipamento = 'Banda de Suspensão'
WHERE equipamento IS NOT NULL
  AND lower(trim(equipamento)) IN (
    'banda de suspensão',
    'banda de suspensao',
    'trx',
    'suspension trainer'
  );

-- Disco
UPDATE public.exercicios_biblioteca
SET equipamento = 'Disco de Peso'
WHERE equipamento IS NOT NULL
  AND lower(trim(equipamento)) IN (
    'disco de peso',
    'disco',
    'plate',
    'plates'
  );

-- Qualquer restante fora do CHECK → Outro (preserva NULL)
UPDATE public.exercicios_biblioteca
SET equipamento = 'Outro'
WHERE equipamento IS NOT NULL
  AND equipamento NOT IN (
    'Nenhum',
    'Banda de Resistência',
    'Banda de Suspensão',
    'Barra',
    'Disco de Peso',
    'Haltere',
    'Kettlebell',
    'Máquina',
    'Outro'
  );

-- @@FILE_END@@ 0042_normalize_exercicios_equipamento.sql

-- @@FILE_START@@ 0043_notificacoes.sql
-- Notificações in-app (aluno) — check-in reminder e futuros avisos
-- AURONFIT · agosto 2026

CREATE TABLE IF NOT EXISTS public.notificacoes (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  destinatario_id  uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  remetente_id     uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  tipo             text NOT NULL CHECK (tipo IN ('checkin_reminder', 'photos_reminder')),
  titulo           text NOT NULL CHECK (char_length(titulo) BETWEEN 1 AND 120),
  corpo            text NOT NULL CHECK (char_length(corpo) BETWEEN 1 AND 500),
  link             text,
  metadata         jsonb NOT NULL DEFAULT '{}'::jsonb,
  lida_em          timestamptz,
  criada_em        timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notificacoes_destinatario_criada
  ON public.notificacoes (destinatario_id, criada_em DESC);

CREATE INDEX IF NOT EXISTS idx_notificacoes_destinatario_nao_lidas
  ON public.notificacoes (destinatario_id)
  WHERE lida_em IS NULL;

ALTER TABLE public.notificacoes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "notificacoes_select" ON public.notificacoes;
CREATE POLICY "notificacoes_select" ON public.notificacoes
  FOR SELECT TO authenticated
  USING (auth.uid() = destinatario_id);

DROP POLICY IF EXISTS "notificacoes_insert" ON public.notificacoes;
CREATE POLICY "notificacoes_insert" ON public.notificacoes
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = remetente_id
    AND EXISTS (
      SELECT 1 FROM public.coach_alunos ca
      WHERE ca.coach_id = auth.uid()
        AND ca.aluno_id = notificacoes.destinatario_id
    )
  );

DROP POLICY IF EXISTS "notificacoes_update" ON public.notificacoes;
CREATE POLICY "notificacoes_update" ON public.notificacoes
  FOR UPDATE TO authenticated
  USING (auth.uid() = destinatario_id)
  WITH CHECK (auth.uid() = destinatario_id);

-- Realtime (badge / lista)
DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.notificacoes;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
END $$;

-- @@FILE_END@@ 0043_notificacoes.sql

-- @@FILE_START@@ 0044_notificacoes_photos.sql
-- Amplia tipos de notificação in-app (fotos de evolução)
-- AURONFIT · agosto 2026

ALTER TABLE public.notificacoes
  DROP CONSTRAINT IF EXISTS notificacoes_tipo_check;

ALTER TABLE public.notificacoes
  ADD CONSTRAINT notificacoes_tipo_check
  CHECK (tipo IN ('checkin_reminder', 'photos_reminder'));

-- @@FILE_END@@ 0044_notificacoes_photos.sql

-- @@FILE_START@@ 0045_aluno_observacoes.sql
-- Observações do coach para o aluno (lista com leitura)
-- AURONFIT · agosto 2026

CREATE TABLE IF NOT EXISTS public.aluno_observacoes (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  aluno_id         uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  coach_id         uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  conteudo         text NOT NULL CHECK (char_length(conteudo) BETWEEN 1 AND 4000),
  criada_em        timestamptz NOT NULL DEFAULT now(),
  visualizada_em   timestamptz
);

CREATE INDEX IF NOT EXISTS idx_aluno_observacoes_aluno_criada
  ON public.aluno_observacoes (aluno_id, criada_em DESC);

CREATE INDEX IF NOT EXISTS idx_aluno_observacoes_aluno_nao_lidas
  ON public.aluno_observacoes (aluno_id)
  WHERE visualizada_em IS NULL;

ALTER TABLE public.aluno_observacoes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "aluno_observacoes_select" ON public.aluno_observacoes;
CREATE POLICY "aluno_observacoes_select" ON public.aluno_observacoes
  FOR SELECT TO authenticated
  USING (
    auth.uid() = aluno_id
    OR auth.uid() = coach_id
    OR EXISTS (
      SELECT 1 FROM public.coach_alunos ca
      WHERE ca.coach_id = auth.uid() AND ca.aluno_id = aluno_observacoes.aluno_id
    )
  );

DROP POLICY IF EXISTS "aluno_observacoes_insert" ON public.aluno_observacoes;
CREATE POLICY "aluno_observacoes_insert" ON public.aluno_observacoes
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = coach_id
    AND EXISTS (
      SELECT 1 FROM public.coach_alunos ca
      WHERE ca.coach_id = auth.uid() AND ca.aluno_id = aluno_observacoes.aluno_id
    )
  );

DROP POLICY IF EXISTS "aluno_observacoes_update" ON public.aluno_observacoes;
CREATE POLICY "aluno_observacoes_update" ON public.aluno_observacoes
  FOR UPDATE TO authenticated
  USING (
    auth.uid() = aluno_id
    OR auth.uid() = coach_id
  )
  WITH CHECK (
    auth.uid() = aluno_id
    OR auth.uid() = coach_id
  );

DROP POLICY IF EXISTS "aluno_observacoes_delete" ON public.aluno_observacoes;
CREATE POLICY "aluno_observacoes_delete" ON public.aluno_observacoes
  FOR DELETE TO authenticated
  USING (
    auth.uid() = coach_id
    OR EXISTS (
      SELECT 1 FROM public.coach_alunos ca
      WHERE ca.coach_id = auth.uid() AND ca.aluno_id = aluno_observacoes.aluno_id
    )
  );

-- @@FILE_END@@ 0045_aluno_observacoes.sql

-- @@FILE_START@@ 0046_historico_pagamento_caixa.sql
-- Regime de caixa no histórico de planos: data_pagamento + forma_pagamento
-- Soft-cancel via status_pagamento = 'cancelado'

-- Ampliar check de status para incluir cancelado
ALTER TABLE public.aluno_planos_historico
  DROP CONSTRAINT IF EXISTS aluno_planos_historico_status_pagamento_check;

ALTER TABLE public.aluno_planos_historico
  ADD CONSTRAINT aluno_planos_historico_status_pagamento_check
  CHECK (status_pagamento IN ('pago', 'pendente', 'atrasado', 'cancelado'));

ALTER TABLE public.aluno_planos_historico
  ADD COLUMN IF NOT EXISTS data_pagamento date;

ALTER TABLE public.aluno_planos_historico
  ADD COLUMN IF NOT EXISTS forma_pagamento text;

ALTER TABLE public.aluno_planos_historico
  DROP CONSTRAINT IF EXISTS aluno_planos_historico_forma_pagamento_check;

ALTER TABLE public.aluno_planos_historico
  ADD CONSTRAINT aluno_planos_historico_forma_pagamento_check
  CHECK (
    forma_pagamento IS NULL
    OR forma_pagamento IN (
      'pix',
      'dinheiro',
      'cartao_credito',
      'cartao_debito',
      'transferencia',
      'outro'
    )
  );

COMMENT ON COLUMN public.aluno_planos_historico.data_pagamento IS
  'Regime de caixa: data em que o dinheiro entrou (independente da vigência).';

COMMENT ON COLUMN public.aluno_planos_historico.forma_pagamento IS
  'Forma de pagamento registrada pelo coach (pix, dinheiro, cartão, etc.).';

-- Backfill: usa a data do registro quando data_pagamento ainda é nula
UPDATE public.aluno_planos_historico
SET data_pagamento = (registrado_em AT TIME ZONE 'America/Sao_Paulo')::date
WHERE data_pagamento IS NULL;

CREATE INDEX IF NOT EXISTS idx_aluno_planos_historico_coach_pagamento
  ON public.aluno_planos_historico (coach_id, data_pagamento DESC);

-- Coach pode atualizar (soft-cancel) apenas os próprios registros
DROP POLICY IF EXISTS coach_update_own_plan_history ON public.aluno_planos_historico;
CREATE POLICY coach_update_own_plan_history
  ON public.aluno_planos_historico
  FOR UPDATE
  USING (coach_id = auth.uid())
  WITH CHECK (coach_id = auth.uid());

DROP POLICY IF EXISTS super_admin_update_plan_history ON public.aluno_planos_historico;
CREATE POLICY super_admin_update_plan_history
  ON public.aluno_planos_historico
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role = 'super_admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role = 'super_admin'
    )
  );

-- @@FILE_END@@ 0046_historico_pagamento_caixa.sql

-- @@FILE_START@@ 0047_aluno_observacoes_finalizada.sql
-- Permite ao aluno "concluir" uma nota do personal, removendo-a do dashboard
-- AURONFIT · agosto 2026

ALTER TABLE public.aluno_observacoes
  ADD COLUMN IF NOT EXISTS finalizada_em timestamptz;

CREATE INDEX IF NOT EXISTS idx_aluno_observacoes_aluno_ativas
  ON public.aluno_observacoes (aluno_id)
  WHERE finalizada_em IS NULL;

-- @@FILE_END@@ 0047_aluno_observacoes_finalizada.sql

-- @@FILE_START@@ 0048_agenda_cardio_flag.sql
-- Permite marcar um dia da agenda como "Cardio" (sem ficha vinculada),
-- ao lado das opções já existentes de treino/descanso.
-- AURONFIT · agosto 2026

ALTER TABLE public.agenda_semanal
  ADD COLUMN IF NOT EXISTS is_cardio boolean NOT NULL DEFAULT false;

ALTER TABLE public.agenda_diaria
  ADD COLUMN IF NOT EXISTS is_cardio boolean NOT NULL DEFAULT false;

-- @@FILE_END@@ 0048_agenda_cardio_flag.sql

-- @@FILE_START@@ 0049_notificacoes_treino_iniciado.sql
-- Notifica o coach em tempo real quando o aluno inicia um treino
-- AURONFIT · agosto 2026

ALTER TABLE public.notificacoes DROP CONSTRAINT IF EXISTS notificacoes_tipo_check;
ALTER TABLE public.notificacoes ADD CONSTRAINT notificacoes_tipo_check
  CHECK (tipo IN ('checkin_reminder', 'photos_reminder', 'treino_iniciado'));

-- Aluno pode notificar o próprio coach (direção oposta da policy já existente,
-- que só permite coach → aluno)
DROP POLICY IF EXISTS "notificacoes_insert_aluno" ON public.notificacoes;
CREATE POLICY "notificacoes_insert_aluno" ON public.notificacoes
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = remetente_id
    AND EXISTS (
      SELECT 1 FROM public.coach_alunos ca
      WHERE ca.aluno_id = auth.uid()
        AND ca.coach_id = notificacoes.destinatario_id
    )
  );

-- @@FILE_END@@ 0049_notificacoes_treino_iniciado.sql

-- @@FILE_START@@ 0050_push_subscriptions.sql
-- Inscrições de Web Push (notificação no celular mesmo com o app fechado)
-- AURONFIT · agosto 2026

CREATE TABLE IF NOT EXISTS public.push_subscriptions (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  endpoint     text NOT NULL UNIQUE,
  p256dh       text NOT NULL,
  auth         text NOT NULL,
  user_agent   text,
  criada_em    timestamptz NOT NULL DEFAULT now(),
  atualizada_em timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user
  ON public.push_subscriptions (user_id);

ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "push_subscriptions_select" ON public.push_subscriptions;
CREATE POLICY "push_subscriptions_select" ON public.push_subscriptions
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "push_subscriptions_insert" ON public.push_subscriptions;
CREATE POLICY "push_subscriptions_insert" ON public.push_subscriptions
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "push_subscriptions_update" ON public.push_subscriptions;
CREATE POLICY "push_subscriptions_update" ON public.push_subscriptions
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "push_subscriptions_delete" ON public.push_subscriptions;
CREATE POLICY "push_subscriptions_delete" ON public.push_subscriptions
  FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- @@FILE_END@@ 0050_push_subscriptions.sql

-- @@FILE_START@@ 0051_feedbacks_lido.sql
-- Feedbacks: controle de leitura pelo coach (badge + marcar como lido)
ALTER TABLE public.feedbacks_treinos
  ADD COLUMN IF NOT EXISTS lido_em timestamptz NULL;

CREATE INDEX IF NOT EXISTS idx_feedbacks_treinos_coach_nao_lidos
  ON public.feedbacks_treinos (coach_id)
  WHERE lido_em IS NULL;

COMMENT ON COLUMN public.feedbacks_treinos.lido_em IS
  'Quando o coach marcou o feedback como lido. NULL = não lido (mostra badge).';

-- @@FILE_END@@ 0051_feedbacks_lido.sql

-- @@FILE_START@@ 0052_coach_onboarding.sql
-- Onboarding do coach: boas-vindas + progresso do guia de configuração

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS telefone text,
  ADD COLUMN IF NOT EXISTS alunos_atuais text,
  ADD COLUMN IF NOT EXISTS onboarding_visto boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.profiles.telefone IS
  'WhatsApp/telefone capturado na tela de boas-vindas do coach.';
COMMENT ON COLUMN public.profiles.alunos_atuais IS
  'Faixa de alunos que o coach tem hoje (onboarding). Segmentação — não confundir com student_limit do plano.';
COMMENT ON COLUMN public.profiles.onboarding_visto IS
  'true após o coach concluir a tela /admin/boas-vindas. Impede reexibir.';

-- Coaches já existentes não devem ver a tela de boas-vindas
UPDATE public.profiles
SET onboarding_visto = true
WHERE role IN ('coach', 'super_admin')
  AND onboarding_visto = false;

CREATE TABLE IF NOT EXISTS public.onboarding_passos (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id     uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  passo_id     text NOT NULL,
  concluido    boolean NOT NULL DEFAULT false,
  concluido_em timestamptz,
  UNIQUE (coach_id, passo_id)
);

CREATE INDEX IF NOT EXISTS idx_onboarding_passos_coach
  ON public.onboarding_passos (coach_id);

ALTER TABLE public.onboarding_passos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "coach vê próprio progresso" ON public.onboarding_passos;
CREATE POLICY "coach vê próprio progresso"
  ON public.onboarding_passos
  FOR ALL
  USING (coach_id = auth.uid())
  WITH CHECK (coach_id = auth.uid());

-- @@FILE_END@@ 0052_coach_onboarding.sql

-- @@FILE_START@@ 0053_aulas_presenciais.sql
-- Agenda de aulas presenciais/online do coach com o aluno.
-- Usado na tela /admin/agenda e no card "Próxima aula" do dashboard.

CREATE TABLE IF NOT EXISTS public.aulas_presenciais (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id     uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  aluno_id     uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  data_hora    timestamptz NOT NULL,
  duracao_min  integer NOT NULL DEFAULT 60,
  local_tipo   text NOT NULL DEFAULT 'presencial',
  endereco     text,
  status       text NOT NULL DEFAULT 'agendada',
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT aulas_presenciais_local_tipo_check CHECK (local_tipo IN ('presencial', 'online')),
  CONSTRAINT aulas_presenciais_status_check CHECK (status IN ('agendada', 'concluida', 'cancelada'))
);

CREATE INDEX IF NOT EXISTS idx_aulas_presenciais_coach_data
  ON public.aulas_presenciais (coach_id, data_hora);

CREATE INDEX IF NOT EXISTS idx_aulas_presenciais_aluno_data
  ON public.aulas_presenciais (aluno_id, data_hora);

ALTER TABLE public.aulas_presenciais ENABLE ROW LEVEL SECURITY;

-- Coach gerencia (CRUD completo) só as próprias aulas
DROP POLICY IF EXISTS aulas_presenciais_coach_all ON public.aulas_presenciais;
CREATE POLICY aulas_presenciais_coach_all
  ON public.aulas_presenciais
  FOR ALL
  TO authenticated
  USING (coach_id = auth.uid())
  WITH CHECK (coach_id = auth.uid());

-- Aluno só enxerga as próprias aulas (sem editar)
DROP POLICY IF EXISTS aulas_presenciais_aluno_select ON public.aulas_presenciais;
CREATE POLICY aulas_presenciais_aluno_select
  ON public.aulas_presenciais
  FOR SELECT
  TO authenticated
  USING (aluno_id = auth.uid());

DROP POLICY IF EXISTS aulas_presenciais_super_admin ON public.aulas_presenciais;
CREATE POLICY aulas_presenciais_super_admin
  ON public.aulas_presenciais
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'super_admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'super_admin'
    )
  );

-- @@FILE_END@@ 0053_aulas_presenciais.sql

-- @@FILE_START@@ 0054_agenda_calendario.sql
-- Calendário da Agenda: permite "eventos" sem aluno vinculado (bloqueio de
-- horário) e guarda o horário de trabalho do coach por dia da semana.

-- aluno_id vira opcional — só é obrigatório quando tipo = 'aula'
ALTER TABLE public.aulas_presenciais
  ALTER COLUMN aluno_id DROP NOT NULL;

ALTER TABLE public.aulas_presenciais
  ADD COLUMN IF NOT EXISTS tipo text NOT NULL DEFAULT 'aula';

ALTER TABLE public.aulas_presenciais
  DROP CONSTRAINT IF EXISTS aulas_presenciais_tipo_check;
ALTER TABLE public.aulas_presenciais
  ADD CONSTRAINT aulas_presenciais_tipo_check CHECK (tipo IN ('aula', 'evento'));

ALTER TABLE public.aulas_presenciais
  ADD COLUMN IF NOT EXISTS titulo text;

ALTER TABLE public.aulas_presenciais
  DROP CONSTRAINT IF EXISTS aulas_presenciais_aluno_obrigatorio_em_aula;
ALTER TABLE public.aulas_presenciais
  ADD CONSTRAINT aulas_presenciais_aluno_obrigatorio_em_aula
  CHECK (tipo <> 'aula' OR aluno_id IS NOT NULL);

COMMENT ON COLUMN public.aulas_presenciais.tipo IS
  'aula: sessão com aluno vinculado. evento: bloqueio de agenda simples (ex: compromisso pessoal).';
COMMENT ON COLUMN public.aulas_presenciais.titulo IS
  'Usado quando tipo = evento (sem aluno vinculado) — descrição livre do bloqueio.';

-- Horário de trabalho do coach — uma linha por dia da semana (0=domingo..6=sábado)
CREATE TABLE IF NOT EXISTS public.coach_horario_trabalho (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id     uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  dia_semana   smallint NOT NULL,
  ativo        boolean NOT NULL DEFAULT false,
  hora_inicio  time NOT NULL DEFAULT '08:00',
  hora_fim     time NOT NULL DEFAULT '18:00',
  updated_at   timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT coach_horario_trabalho_dia_semana_check CHECK (dia_semana BETWEEN 0 AND 6),
  CONSTRAINT coach_horario_trabalho_coach_dia_unique UNIQUE (coach_id, dia_semana)
);

ALTER TABLE public.coach_horario_trabalho ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS coach_horario_trabalho_coach_all ON public.coach_horario_trabalho;
CREATE POLICY coach_horario_trabalho_coach_all
  ON public.coach_horario_trabalho
  FOR ALL
  TO authenticated
  USING (coach_id = auth.uid())
  WITH CHECK (coach_id = auth.uid());

DROP POLICY IF EXISTS coach_horario_trabalho_aluno_select ON public.coach_horario_trabalho;
CREATE POLICY coach_horario_trabalho_aluno_select
  ON public.coach_horario_trabalho
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.coach_alunos ca
      WHERE ca.coach_id = coach_horario_trabalho.coach_id
        AND ca.aluno_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS coach_horario_trabalho_super_admin ON public.coach_horario_trabalho;
CREATE POLICY coach_horario_trabalho_super_admin
  ON public.coach_horario_trabalho
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'super_admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'super_admin'
    )
  );

-- @@FILE_END@@ 0054_agenda_calendario.sql

-- @@FILE_START@@ 0055_perfil_aluno_everfit.sql
-- Perfil do aluno (redesign estilo Everfit, desktop) — agosto 2026
-- 1) separa Notes de Limitations/Injuries dentro de aluno_observacoes (coluna tipo)
-- 2) tabela nova aluno_objetivos para o card Goal & Countdown

-- ── 1. aluno_observacoes.tipo ──────────────────────────────────────────────
ALTER TABLE public.aluno_observacoes
  ADD COLUMN IF NOT EXISTS tipo text NOT NULL DEFAULT 'nota';

ALTER TABLE public.aluno_observacoes
  DROP CONSTRAINT IF EXISTS aluno_observacoes_tipo_check;

ALTER TABLE public.aluno_observacoes
  ADD CONSTRAINT aluno_observacoes_tipo_check CHECK (tipo IN ('nota', 'lesao'));

CREATE INDEX IF NOT EXISTS idx_aluno_observacoes_aluno_tipo
  ON public.aluno_observacoes (aluno_id, tipo, criada_em DESC);

-- ── 2. aluno_objetivos ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.aluno_objetivos (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  aluno_id     uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  coach_id     uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  titulo       text NOT NULL CHECK (char_length(titulo) BETWEEN 1 AND 200),
  descricao    text,
  data_alvo    date,
  criado_em    timestamptz NOT NULL DEFAULT now(),
  atualizado_em timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_aluno_objetivos_aluno
  ON public.aluno_objetivos (aluno_id, criado_em DESC);

ALTER TABLE public.aluno_objetivos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "aluno_objetivos_select" ON public.aluno_objetivos;
CREATE POLICY "aluno_objetivos_select" ON public.aluno_objetivos
  FOR SELECT TO authenticated
  USING (
    auth.uid() = aluno_id
    OR auth.uid() = coach_id
    OR EXISTS (
      SELECT 1 FROM public.coach_alunos ca
      WHERE ca.coach_id = auth.uid() AND ca.aluno_id = aluno_objetivos.aluno_id
    )
  );

DROP POLICY IF EXISTS "aluno_objetivos_insert" ON public.aluno_objetivos;
CREATE POLICY "aluno_objetivos_insert" ON public.aluno_objetivos
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = coach_id
    AND EXISTS (
      SELECT 1 FROM public.coach_alunos ca
      WHERE ca.coach_id = auth.uid() AND ca.aluno_id = aluno_objetivos.aluno_id
    )
  );

DROP POLICY IF EXISTS "aluno_objetivos_update" ON public.aluno_objetivos;
CREATE POLICY "aluno_objetivos_update" ON public.aluno_objetivos
  FOR UPDATE TO authenticated
  USING (auth.uid() = coach_id)
  WITH CHECK (auth.uid() = coach_id);

DROP POLICY IF EXISTS "aluno_objetivos_delete" ON public.aluno_objetivos;
CREATE POLICY "aluno_objetivos_delete" ON public.aluno_objetivos
  FOR DELETE TO authenticated
  USING (auth.uid() = coach_id);

-- @@FILE_END@@ 0055_perfil_aluno_everfit.sql

-- @@FILE_START@@ 0056_cardio_maquinas_kcal.sql
-- Campos de máquina (velocidade/inclinação/resistência) e origem do kcal calculado
-- em cardio_sessoes / cardio_prescricoes. Ver lib/constants/cardio.ts (CARDIO_CAMPOS)
-- e lib/utils/cardio.ts (calcKcalMet) para o consumo desses campos.

ALTER TABLE public.cardio_sessoes
  ADD COLUMN IF NOT EXISTS velocidade_kmh    numeric(4,1) CHECK (velocidade_kmh IS NULL OR (velocidade_kmh > 0 AND velocidade_kmh <= 40)),
  ADD COLUMN IF NOT EXISTS inclinacao_pct    numeric(4,1) CHECK (inclinacao_pct IS NULL OR (inclinacao_pct >= 0 AND inclinacao_pct <= 25)),
  ADD COLUMN IF NOT EXISTS nivel_resistencia smallint     CHECK (nivel_resistencia IS NULL OR (nivel_resistencia BETWEEN 1 AND 20)),
  ADD COLUMN IF NOT EXISTS kcal_origem       text         CHECK (kcal_origem IS NULL OR kcal_origem IN ('fc','met','manual'));

ALTER TABLE public.cardio_prescricoes
  ADD COLUMN IF NOT EXISTS velocidade_alvo_kmh    numeric(4,1) CHECK (velocidade_alvo_kmh IS NULL OR (velocidade_alvo_kmh > 0 AND velocidade_alvo_kmh <= 40)),
  ADD COLUMN IF NOT EXISTS inclinacao_alvo_pct    numeric(4,1) CHECK (inclinacao_alvo_pct IS NULL OR (inclinacao_alvo_pct >= 0 AND inclinacao_alvo_pct <= 25)),
  ADD COLUMN IF NOT EXISTS nivel_resistencia_alvo smallint     CHECK (nivel_resistencia_alvo IS NULL OR (nivel_resistencia_alvo BETWEEN 1 AND 20));

-- @@FILE_END@@ 0056_cardio_maquinas_kcal.sql

-- @@FILE_START@@ 0057_exercicios_gif_genero.sql
-- GIFs de exercício migrando pro Cloudflare R2 (fora do Supabase Storage) +
-- versão feminina do GIF/miniatura. imagem_url já existe no schema mas
-- IF NOT EXISTS por segurança; os campos novos guardam só a key dentro do
-- bucket R2, resolvida pra URL pública em tempo de leitura (lib/r2/urls.ts) —
-- mesmo padrão já documentado em lib/storageUrls.ts pro Supabase Storage.

ALTER TABLE exercicios_biblioteca
  ADD COLUMN IF NOT EXISTS imagem_url text,
  ADD COLUMN IF NOT EXISTS gif_url_feminino text,
  ADD COLUMN IF NOT EXISTS imagem_url_feminino text;

-- @@FILE_END@@ 0057_exercicios_gif_genero.sql

-- @@FILE_START@@ 0058_fichas_modelo.sql
-- Modelos de ficha de treino ("templates") que o coach pode salvar e reusar
-- ao criar uma ficha nova. Separado de fichas_treino de propósito — não tem
-- aluno, não entra em histórico/execução, é só um ponto de partida reutilizável.

CREATE TABLE IF NOT EXISTS public.fichas_modelo (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id       uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  nome           text NOT NULL,
  configuracao   jsonb NOT NULL,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_fichas_modelo_coach
  ON public.fichas_modelo (coach_id, updated_at DESC);

ALTER TABLE public.fichas_modelo ENABLE ROW LEVEL SECURITY;

-- Coach gerencia (CRUD completo) só os próprios modelos
DROP POLICY IF EXISTS fichas_modelo_coach_all ON public.fichas_modelo;
CREATE POLICY fichas_modelo_coach_all
  ON public.fichas_modelo
  FOR ALL
  TO authenticated
  USING (coach_id = auth.uid())
  WITH CHECK (coach_id = auth.uid());

DROP POLICY IF EXISTS fichas_modelo_super_admin ON public.fichas_modelo;
CREATE POLICY fichas_modelo_super_admin
  ON public.fichas_modelo
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'super_admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'super_admin'
    )
  );

-- @@FILE_END@@ 0058_fichas_modelo.sql

-- @@FILE_START@@ 0059_dashboard_agenda_semanal_rpc.sql
-- ============================================================
-- 0084_dashboard_agenda_semanal_rpc.sql
--
-- Junta as 5 consultas paralelas que a dashboard do aluno faz pra montar a
-- agenda da semana (agenda_diaria, treinos_manuais, historico_treinos,
-- cardio_sessoes, cardio_prescricoes) numa única função — reduz 5 idas ao
-- banco pra 1 a cada carregamento da tela. Mesmos filtros exatos da versão
-- em JS (ver fetchWeeklyAgenda em app/aluno/dashboard/page.tsx), só isso.
--
-- SECURITY INVOKER (não DEFINER) — respeita a RLS de cada tabela normalmente,
-- mesmo padrão já usado em get_kpis_aluno e export_user_data.
-- ============================================================

BEGIN;

CREATE OR REPLACE FUNCTION public.get_agenda_semanal_aluno(
  p_aluno_id UUID DEFAULT auth.uid(),
  p_start    DATE DEFAULT NULL,
  p_end      DATE DEFAULT NULL
)
RETURNS JSONB
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT jsonb_build_object(
    'agenda_diaria', (
      SELECT COALESCE(jsonb_agg(row_to_json(a)), '[]'::jsonb)
      FROM (
        SELECT
          ad.data,
          ad.ficha_id,
          ad.treino_pdf_id,
          ad.is_off,
          ad.is_cardio,
          jsonb_build_object('nome_rotina', ft.nome_rotina) AS fichas_treino
        FROM agenda_diaria ad
        LEFT JOIN fichas_treino ft ON ft.id = ad.ficha_id
        WHERE ad.aluno_id = p_aluno_id
          AND ad.data >= p_start
          AND ad.data <= p_end
      ) a
    ),
    'checkins_semana', (
      SELECT COALESCE(jsonb_agg(row_to_json(t)), '[]'::jsonb)
      FROM (
        SELECT data_treino, concluido, pontos_earn
        FROM treinos_manuais
        WHERE aluno_id = p_aluno_id
          AND concluido = true
          AND data_treino >= p_start
          AND data_treino <= p_end
      ) t
    ),
    'historico_semana', (
      -- Mesma janela -03:00 explícita que a versão em JS usava
      -- (.gte(`${startOfWeek}T00:00:00-03:00`) / .lte(`${endOfWeek}T23:59:59-03:00`))
      -- — não usar apenas o cast de DATE, que cairia no fuso da sessão do banco.
      SELECT COALESCE(jsonb_agg(row_to_json(h)), '[]'::jsonb)
      FROM (
        SELECT data_conclusao
        FROM historico_treinos
        WHERE aluno_id = p_aluno_id
          AND data_conclusao >= (p_start::text || 'T00:00:00-03:00')::timestamptz
          AND data_conclusao <= (p_end::text || 'T23:59:59-03:00')::timestamptz
      ) h
    ),
    'cardio_sessoes_semana', (
      SELECT COALESCE(jsonb_agg(row_to_json(c)), '[]'::jsonb)
      FROM (
        SELECT data, duracao_min
        FROM cardio_sessoes
        WHERE aluno_id = p_aluno_id
          AND data >= p_start
          AND data <= p_end
      ) c
    ),
    'cardio_prescricoes_ativas', (
      SELECT COALESCE(jsonb_agg(row_to_json(p)), '[]'::jsonb)
      FROM (
        SELECT duracao_min, dias_semana
        FROM cardio_prescricoes
        WHERE aluno_id = p_aluno_id
          AND ativo = true
      ) p
    )
  );
$$;

GRANT EXECUTE ON FUNCTION public.get_agenda_semanal_aluno(UUID, DATE, DATE) TO authenticated;

COMMIT;

-- @@FILE_END@@ 0059_dashboard_agenda_semanal_rpc.sql

-- @@FILE_START@@ 0060_dashboard_bootstrap_rpc.sql
-- ============================================================
-- 0085_dashboard_bootstrap_rpc.sql
--
-- Continuação da 0084: junta o resto das buscas paralelas que a dashboard do
-- aluno faz no primeiro carregamento.
--
-- 1. get_dashboard_bootstrap_aluno — substitui o Promise.all de 4 chamadas
--    (get_kpis_aluno, perfil do coach, água de hoje, get_agenda_semanal_aluno)
--    por 1 só. Reaproveita as duas funções já existentes (kpis e agenda) via
--    chamada aninhada — sem duplicar a lógica de cada uma.
--
-- 2. get_dashboard_secondary_aluno — junta as 4 buscas "de fundo" (fichas +
--    PDFs pra popular o seletor de "editar agenda", feedbacks pendentes,
--    parceiros do coach) que hoje disparam em paralelo, mas cada uma em sua
--    própria requisição.
--
-- Ambas SECURITY INVOKER — respeitam a RLS de cada tabela normalmente.
-- ============================================================

BEGIN;

CREATE OR REPLACE FUNCTION public.get_dashboard_bootstrap_aluno(
  p_aluno_id UUID DEFAULT auth.uid(),
  p_coach_id UUID DEFAULT NULL,
  p_today    DATE DEFAULT NULL,
  p_start    DATE DEFAULT NULL,
  p_end      DATE DEFAULT NULL
)
RETURNS JSONB
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT
    public.get_agenda_semanal_aluno(p_aluno_id, p_start, p_end)
    || jsonb_build_object(
      'kpis', public.get_kpis_aluno(p_aluno_id),
      'coach_profile', (
        SELECT row_to_json(c) FROM (
          SELECT full_name, avatar_url, sexo, role
          FROM profiles
          WHERE id = p_coach_id
        ) c
      ),
      'agua_hoje', (
        SELECT row_to_json(a) FROM (
          SELECT id, copos, ml_por_copo
          FROM registros_agua
          WHERE aluno_id = p_aluno_id
            AND data_registro = p_today
        ) a
      )
    );
$$;

GRANT EXECUTE ON FUNCTION public.get_dashboard_bootstrap_aluno(UUID, UUID, DATE, DATE, DATE) TO authenticated;


CREATE OR REPLACE FUNCTION public.get_dashboard_secondary_aluno(
  p_aluno_id UUID DEFAULT auth.uid(),
  p_coach_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT jsonb_build_object(
    'fichas_treino', (
      SELECT COALESCE(jsonb_agg(row_to_json(f)), '[]'::jsonb)
      FROM (
        SELECT id, nome_rotina
        FROM fichas_treino
        WHERE aluno_id = p_aluno_id
          AND ativo = true
      ) f
    ),
    'treinos_alunos', (
      SELECT COALESCE(jsonb_agg(row_to_json(t)), '[]'::jsonb)
      FROM (
        SELECT id, nome_arquivo
        FROM treinos_alunos
        WHERE aluno_id = p_aluno_id
      ) t
    ),
    'feedbacks_count', (
      SELECT COUNT(*)::int
      FROM feedbacks_treinos
      WHERE aluno_id = p_aluno_id
    ),
    'parceiros', (
      CASE WHEN p_coach_id IS NULL THEN '[]'::jsonb ELSE (
        SELECT COALESCE(jsonb_agg(row_to_json(p) ORDER BY p.nome_marca), '[]'::jsonb)
        FROM (
          SELECT id, nome_marca, descricao, cupom, link_desconto, logo_url, imagens
          FROM parceiros
          WHERE coach_id = p_coach_id
        ) p
      ) END
    )
  );
$$;

GRANT EXECUTE ON FUNCTION public.get_dashboard_secondary_aluno(UUID, UUID) TO authenticated;

COMMIT;

-- @@FILE_END@@ 0060_dashboard_bootstrap_rpc.sql

-- @@FILE_START@@ 0061_nutrition_page_bootstrap_rpc.sql
-- ============================================================
-- 0086_nutrition_page_bootstrap_rpc.sql
--
-- A tela de nutrição do aluno faz 4 buscas em paralelo ao abrir
-- (nutrition_plans com embed profundo, plano_alimentar_pdf, registros_agua,
-- nutrition_meal_checkins) — ver lib/nutrition/plans.ts:loadStudentNutritionPageData.
--
-- A de nutrition_plans já é 1 requisição só mesmo sendo "funda" (o embed do
-- PostgREST já vira 1 query no banco) — deixamos ela como está, arriscado
-- reescrever esse embed de 4 níveis à mão. As outras 3 são tabelas simples
-- (1 tabela, sem join) e viram 1 RPC só aqui, reduzindo a rajada de 4
-- conexões simultâneas pra 2.
-- ============================================================

BEGIN;

CREATE OR REPLACE FUNCTION public.get_nutrition_page_extras(
  p_aluno_id UUID DEFAULT auth.uid(),
  p_today    DATE DEFAULT NULL
)
RETURNS JSONB
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT jsonb_build_object(
    'plano_alimentar_pdf', (
      SELECT COALESCE(jsonb_agg(row_to_json(pp) ORDER BY pp.criado_em DESC), '[]'::jsonb)
      FROM (
        SELECT id, aluno_id, nome_arquivo, descricao, criado_em, url_pdf
        FROM plano_alimentar_pdf
        WHERE aluno_id = p_aluno_id
      ) pp
    ),
    'registros_agua', (
      SELECT row_to_json(r) FROM (
        SELECT id, copos, ml_por_copo
        FROM registros_agua
        WHERE aluno_id = p_aluno_id
          AND data_registro = p_today
      ) r
    ),
    'nutrition_meal_checkins', (
      SELECT COALESCE(jsonb_agg(row_to_json(c)), '[]'::jsonb)
      FROM (
        SELECT meal_id, status
        FROM nutrition_meal_checkins
        WHERE student_id = p_aluno_id
          AND checkin_date = p_today
      ) c
    )
  );
$$;

GRANT EXECUTE ON FUNCTION public.get_nutrition_page_extras(UUID, DATE) TO authenticated;

COMMIT;

-- @@FILE_END@@ 0061_nutrition_page_bootstrap_rpc.sql

-- @@FILE_START@@ 0062_cardio_page_bootstrap_rpc.sql
-- ============================================================
-- 0087_cardio_page_bootstrap_rpc.sql
--
-- A tela de cardio do aluno faz 3 buscas em paralelo ao abrir (sessões,
-- prescrições ativas, 1 medida de peso pra saber se avisa "cadastre seu
-- peso") — ver app/aluno/cardio/page.tsx:fetchData. Junta as 3 numa função
-- só, mesmo padrão já aplicado na dashboard e na nutrição.
-- ============================================================

BEGIN;

CREATE OR REPLACE FUNCTION public.get_cardio_page_bootstrap(
  p_aluno_id UUID DEFAULT auth.uid()
)
RETURNS JSONB
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT jsonb_build_object(
    'sessoes', (
      SELECT COALESCE(jsonb_agg(row_to_json(s)), '[]'::jsonb)
      FROM (
        SELECT *
        FROM cardio_sessoes
        WHERE aluno_id = p_aluno_id
        ORDER BY data DESC
        LIMIT 60
      ) s
    ),
    'prescricoes', (
      SELECT COALESCE(jsonb_agg(row_to_json(p)), '[]'::jsonb)
      FROM (
        SELECT *
        FROM cardio_prescricoes
        WHERE aluno_id = p_aluno_id
          AND ativo = true
        ORDER BY created_at DESC
      ) p
    ),
    'tem_peso_cadastrado', (
      SELECT EXISTS (
        SELECT 1 FROM medidas_aluno
        WHERE aluno_id = p_aluno_id
          AND peso IS NOT NULL
        LIMIT 1
      )
    )
  );
$$;

GRANT EXECUTE ON FUNCTION public.get_cardio_page_bootstrap(UUID) TO authenticated;

COMMIT;

-- @@FILE_END@@ 0062_cardio_page_bootstrap_rpc.sql

-- @@FILE_START@@ 0063_treinos_lista_bootstrap_rpc.sql
-- ============================================================
-- 0088_treinos_lista_bootstrap_rpc.sql
--
-- A lista "Minhas Rotinas" (app/aluno/treinos/page.tsx) busca fichas_treino.
-- configuracao INTEIRO (toda série, técnica, descanso, observações de cada
-- exercício) só pra montar um resuminho de 2-3 nomes de exercício por card —
-- o resto do JSON é descartado no cliente. Em fichas com muitos exercícios
-- isso é bastante dado trafegado à toa.
--
-- Essa função devolve só {nome, grupo_muscular} por exercício (o que o card
-- realmente usa) em vez da configuração inteira, e já junta com a busca de
-- PDFs — 2 requisições viram 1.
-- ============================================================

BEGIN;

CREATE OR REPLACE FUNCTION public.get_treinos_lista_aluno(
  p_aluno_id UUID DEFAULT auth.uid()
)
RETURNS JSONB
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT jsonb_build_object(
    'fichas', (
      SELECT COALESCE(jsonb_agg(row_to_json(f) ORDER BY f.criado_em DESC), '[]'::jsonb)
      FROM (
        SELECT
          ft.id,
          ft.nome_rotina,
          ft.criado_em,
          (
            SELECT COALESCE(jsonb_agg(jsonb_build_object(
              'nome', ex->>'nome',
              'grupo_muscular', ex->>'grupo_muscular'
            )), '[]'::jsonb)
            FROM jsonb_array_elements(COALESCE(ft.configuracao->'exercicios', '[]'::jsonb)) AS ex
          ) AS exercicios
        FROM fichas_treino ft
        WHERE ft.aluno_id = p_aluno_id
          AND ft.ativo = true
      ) f
    ),
    'treinos_pdf', (
      SELECT COALESCE(jsonb_agg(row_to_json(t) ORDER BY t.data_upload DESC), '[]'::jsonb)
      FROM (
        SELECT id, aluno_id, url_pdf, nome_arquivo, data_upload
        FROM treinos_alunos
        WHERE aluno_id = p_aluno_id
      ) t
    )
  );
$$;

GRANT EXECUTE ON FUNCTION public.get_treinos_lista_aluno(UUID) TO authenticated;

COMMIT;

-- @@FILE_END@@ 0063_treinos_lista_bootstrap_rpc.sql

-- @@FILE_START@@ 0064_ficha_execucao_extras_rpc.sql
-- ============================================================
-- 0089_ficha_execucao_extras_rpc.sql
--
-- Tela de execução de treino (app/aluno/treinos/[id]/executar/page.tsx).
-- A busca da ficha continua separada (o app extrai os IDs de exercício da
-- configuração em JS, lógica sensível — não mexemos nisso). Mas depois de ter
-- os IDs, hoje rodam 3 requisições em paralelo pra biblioteca, histórico e
-- perfil (sexo) — e a de histórico busca até 10x mais linhas do que precisa
-- (só usa a sessão mais recente de cada exercício, mas trazia várias e
-- descartava o resto no celular).
--
-- Essa função junta as 3 numa só e já devolve exatamente 1 linha de
-- histórico por exercício (a mais recente — DISTINCT ON), não 10.
-- ============================================================

BEGIN;

CREATE OR REPLACE FUNCTION public.get_ficha_execucao_extras(
  p_aluno_id      UUID DEFAULT auth.uid(),
  p_exercicio_ids UUID[] DEFAULT '{}'
)
RETURNS JSONB
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT jsonb_build_object(
    'biblioteca', (
      SELECT COALESCE(jsonb_agg(row_to_json(b)), '[]'::jsonb)
      FROM (
        SELECT id, grupo_muscular, gif_url, gif_url_feminino, imagem_url,
               imagem_url_feminino, video_url, equipamento
        FROM exercicios_biblioteca
        WHERE id = ANY(p_exercicio_ids)
      ) b
    ),
    'ultimo_historico', (
      -- 1 linha por exercício — a sessão mais recente (DISTINCT ON já traz só
      -- o que a tela usa, em vez de até 10x mais linhas pra deduplicar no cliente).
      SELECT COALESCE(jsonb_agg(row_to_json(h)), '[]'::jsonb)
      FROM (
        SELECT DISTINCT ON (exercicio_id)
          exercicio_id, data_conclusao, dados_sessao
        FROM historico_treinos
        WHERE aluno_id = p_aluno_id
          AND exercicio_id = ANY(p_exercicio_ids)
        ORDER BY exercicio_id, data_conclusao DESC
      ) h
    ),
    'sexo', (
      SELECT sexo FROM profiles WHERE id = p_aluno_id
    )
  );
$$;

GRANT EXECUTE ON FUNCTION public.get_ficha_execucao_extras(UUID, UUID[]) TO authenticated;

COMMIT;

-- @@FILE_END@@ 0064_ficha_execucao_extras_rpc.sql

-- @@FILE_START@@ 0065_modalidade_esporte.sql
-- 0091_modalidade_esporte.sql
-- Separa "o que o aluno pratica" (modalidade) de "o que ele quer alcançar"
-- (objetivo) — hoje só existia objetivo, misturando as duas coisas.

-- 1. Campo novo de modalidades (array, permite múltiplas)
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS modalidades_esporte text[] DEFAULT '{musculacao}';

-- Alunos existentes: garante o default explícito (quem já tinha a coluna
-- NULL por algum motivo cai em musculação, igual ao default de novos).
UPDATE profiles
  SET modalidades_esporte = '{musculacao}'
  WHERE modalidades_esporte IS NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'profiles_modalidades_esporte_check'
  ) THEN
    ALTER TABLE profiles
      ADD CONSTRAINT profiles_modalidades_esporte_check
      CHECK (
        modalidades_esporte <@ ARRAY[
          'musculacao', 'corrida', 'natacao', 'ciclismo', 'crossfit',
          'futevolei', 'futebol', 'tenis', 'artes_marciais', 'funcional', 'outro'
        ]::text[]
      );
  END IF;
END $$;

-- 2. Revisão dos valores de `objetivo` — os valores REAIS em uso hoje no
-- app são bulking/cutting/recomposicao/manutencao (ver NovoAlunoForm.tsx,
-- aluno/perfil/page.tsx, signup/aluno/page.tsx), não os nomes que a spec
-- original assumia. Mapeamento:
--
-- Coach Vinny já tinha uma constraint com esse mesmo nome, restringindo
-- objetivo aos valores antigos (bulking/cutting/manutencao/recomposicao)
-- — precisa cair antes do remapeamento abaixo, senão o UPDATE nem roda.
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_objetivo_check;

UPDATE profiles SET objetivo = 'hipertrofia'   WHERE objetivo = 'bulking';
UPDATE profiles SET objetivo = 'emagrecimento' WHERE objetivo = 'cutting';
UPDATE profiles SET objetivo = 'definicao'     WHERE objetivo = 'recomposicao';
UPDATE profiles SET objetivo = 'saude'         WHERE objetivo = 'manutencao';

-- Rede de segurança: qualquer valor fora do mapeamento acima E fora do
-- enum novo vira 'outro' em vez de quebrar a constraint abaixo (não deveria
-- sobrar nenhum, mas evita falhar a migration por um dado legado imprevisto).
UPDATE profiles
  SET objetivo = 'outro'
  WHERE objetivo IS NOT NULL
    AND objetivo NOT IN (
      'hipertrofia', 'emagrecimento', 'definicao', 'performance',
      'saude', 'reabilitacao', 'outro'
    );

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'profiles_objetivo_check'
  ) THEN
    ALTER TABLE profiles
      ADD CONSTRAINT profiles_objetivo_check
      CHECK (objetivo IS NULL OR objetivo IN (
        'hipertrofia', 'emagrecimento', 'definicao', 'performance',
        'saude', 'reabilitacao', 'outro'
      ));
  END IF;
END $$;

-- 3. Índices — filtros futuros no dashboard do coach
CREATE INDEX IF NOT EXISTS idx_profiles_modalidades_esporte
  ON profiles USING GIN (modalidades_esporte);

CREATE INDEX IF NOT EXISTS idx_profiles_objetivo
  ON profiles (objetivo);

-- @@FILE_END@@ 0065_modalidade_esporte.sql

-- @@FILE_START@@ 0066_aulas_falta_de.sql
-- Quem faltou quando uma aula é marcada como cancelada por falta (coach ou
-- aluno) — usado nos cards de estatística e no gráfico da agenda.
-- null = motivo não especificado (aulas canceladas antes desta feature).

alter table public.aulas_presenciais
  add column if not exists falta_de text;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'aulas_presenciais_falta_de_check'
  ) then
    alter table public.aulas_presenciais
      add constraint aulas_presenciais_falta_de_check
      check (falta_de is null or falta_de in ('coach', 'aluno'));
  end if;
end $$;

-- @@FILE_END@@ 0066_aulas_falta_de.sql

-- @@FILE_START@@ 0067_historico_treinos_preserva_ao_excluir_ficha.sql
-- CRÍTICO: historico_treinos (cargas/recordes já feitos pelo aluno) estava
-- em ON DELETE CASCADE com fichas_treino (migration 0033) — excluir (ou
-- recriar) uma ficha apagava PERMANENTEMENTE todo o histórico de execuções
-- ligado a ela. Uma vez gravado, o histórico é do aluno pra sempre — não
-- pode sumir só porque a ficha que originou foi excluída depois.
--
-- Mesmo padrão já usado em agenda_semanal e feedbacks_treinos (migration
-- 0033): SET NULL — a linha do histórico continua existindo, só perde a
-- referência pra ficha que não existe mais.

BEGIN;

ALTER TABLE historico_treinos
  DROP CONSTRAINT IF EXISTS historico_treinos_ficha_id_fkey;

ALTER TABLE historico_treinos
  ADD CONSTRAINT historico_treinos_ficha_id_fkey
  FOREIGN KEY (ficha_id) REFERENCES fichas_treino(id) ON DELETE SET NULL;

COMMIT;

-- @@FILE_END@@ 0067_historico_treinos_preserva_ao_excluir_ficha.sql

-- @@FILE_START@@ 0068_coach_has_write_access_stub.sql
-- Stub da função coach_has_write_access() usada por policies do AURON
-- (ex.: 0034_create_cardio_tables.sql) que checavam assinatura ativa do
-- coach antes de liberar escrita. Coach Vinny não tem plano/assinatura
-- (treinador único) — a versão original dependia de colunas
-- (subscription_active, account_type) que não existem neste banco.
--
-- Equivalente ao hasActiveAccess()/assertCoachWriteAccess() neutralizados
-- do lado da aplicação: sempre libera.
--
-- Aplicada manualmente antes da 0034 durante o merge do AURON (sem essa
-- função, a policy de cardio_prescricoes_coach_insert falha ao ser criada).

CREATE OR REPLACE FUNCTION public.coach_has_write_access()
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
  SELECT true;
$$;

-- @@FILE_END@@ 0068_coach_has_write_access_stub.sql

