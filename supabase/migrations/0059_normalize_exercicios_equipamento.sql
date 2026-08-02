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
