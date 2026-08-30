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
