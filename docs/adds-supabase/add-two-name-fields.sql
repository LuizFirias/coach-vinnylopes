-- Migration: Separar nome do coach (referência) de nome do aluno (verdadeira identidade)
-- Descrição: Adiciona campos para armazenar dois nomes separados:
--   1. coaching_reference: Nome que o coach atribui ao aluno (privado, apenas coach vê)
--   2. full_name agora é: Nome que o aluno define (visível para aluno, ranking, outros)
--   3. date_of_birth: Data de nascimento do aluno
--   4. first_access_completed: Flag para detectar primeiro acesso

-- ===== 1. ADICIONAR COLUNAS =====
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS coaching_reference VARCHAR(255),
ADD COLUMN IF NOT EXISTS date_of_birth DATE,
ADD COLUMN IF NOT EXISTS first_access_completed BOOLEAN DEFAULT false;

-- ===== 2. MIGRAR DADOS EXISTENTES =====
-- Para alunos existentes: copia full_name para coaching_reference se ainda não tiver
UPDATE profiles 
SET coaching_reference = full_name,
    first_access_completed = true  -- Marca como já acessou (dados legados)
WHERE role = 'aluno' 
  AND coaching_reference IS NULL;

-- ===== 3. CRIAR ÍNDICES PARA PERFORMANCE =====
CREATE INDEX IF NOT EXISTS idx_profiles_coaching_reference ON profiles(coaching_reference);
CREATE INDEX IF NOT EXISTS idx_profiles_first_access_completed ON profiles(first_access_completed);

-- ===== 4. COMENTÁRIOS NAS COLUNAS =====
COMMENT ON COLUMN profiles.coaching_reference IS 'Nome que o coach atribui ao aluno para referência (privado)';
COMMENT ON COLUMN profiles.date_of_birth IS 'Data de nascimento do aluno';
COMMENT ON COLUMN profiles.first_access_completed IS 'Flag indicando se o aluno completou onboarding inicial';
