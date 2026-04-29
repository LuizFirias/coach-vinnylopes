-- =====================================================
-- FIX: Garantir UNIQUE constraint em coach_alunos
-- =====================================================
-- Este script garante que a constraint UNIQUE existe
-- na tabela coach_alunos para evitar erros de upsert
-- =====================================================

-- 1. Verificar e criar a constraint UNIQUE se não existir
DO $$
BEGIN
    -- Verificar se a constraint já existe
    IF NOT EXISTS (
        SELECT 1 
        FROM pg_constraint 
        WHERE conname = 'coach_alunos_coach_id_aluno_id_key' 
        AND conrelid = 'coach_alunos'::regclass
    ) THEN
        -- Criar a constraint UNIQUE
        ALTER TABLE coach_alunos 
        ADD CONSTRAINT coach_alunos_coach_id_aluno_id_key 
        UNIQUE (coach_id, aluno_id);
        
        RAISE NOTICE 'Constraint UNIQUE criada com sucesso em coach_alunos';
    ELSE
        RAISE NOTICE 'Constraint UNIQUE já existe em coach_alunos';
    END IF;
END $$;

-- 2. Garantir índices para performance
CREATE INDEX IF NOT EXISTS idx_coach_alunos_coach_id ON coach_alunos(coach_id);
CREATE INDEX IF NOT EXISTS idx_coach_alunos_aluno_id ON coach_alunos(aluno_id);

-- 3. Verificar e ajustar políticas RLS
-- Garantir que coaches podem inserir na tabela
DROP POLICY IF EXISTS "Coaches podem vincular alunos" ON coach_alunos;
CREATE POLICY "Coaches podem vincular alunos" ON coach_alunos
    FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role = 'coach'
        )
        AND coach_id = auth.uid()
    );

-- Coaches podem ver seus próprios vínculos
DROP POLICY IF EXISTS "Coaches podem ver seus alunos" ON coach_alunos;
CREATE POLICY "Coaches podem ver seus alunos" ON coach_alunos
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role = 'coach'
        )
        AND coach_id = auth.uid()
    );

-- Alunos podem ver seu próprio vínculo com coach
DROP POLICY IF EXISTS "Alunos podem ver seu coach" ON coach_alunos;
CREATE POLICY "Alunos podem ver seu coach" ON coach_alunos
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.role = 'aluno'
        )
        AND aluno_id = auth.uid()
    );

-- 4. Verificar status final
SELECT 
    'coach_alunos' as tabela,
    COUNT(*) as total_vinculos,
    COUNT(DISTINCT coach_id) as total_coaches,
    COUNT(DISTINCT aluno_id) as total_alunos
FROM coach_alunos;

-- 5. Verificar duplicações (não deve retornar nada)
SELECT coach_id, aluno_id, COUNT(*) as duplicatas
FROM coach_alunos
GROUP BY coach_id, aluno_id
HAVING COUNT(*) > 1;
