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
