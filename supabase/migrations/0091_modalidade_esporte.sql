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
