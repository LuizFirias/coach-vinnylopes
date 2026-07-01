-- =====================================================
-- FIX SEGURANÇA: pontuacao_alunos - remover USING(true)
-- =====================================================
-- O trigger consolidar_pontos_aluno já tem SECURITY DEFINER
-- (bypassa RLS automaticamente), então as políticas
-- WITH CHECK (true) são desnecessárias e inseguras.
-- =====================================================

-- Remover políticas permissivas antigas
DROP POLICY IF EXISTS "Sistema atualiza pontuação" ON pontuacao_alunos;
DROP POLICY IF EXISTS "Sistema atualiza pontuação update" ON pontuacao_alunos;

-- SELECT: aluno vê só a própria pontuação, coach vê de seus alunos
DROP POLICY IF EXISTS "Alunos veem sua pontuação" ON pontuacao_alunos;
DROP POLICY IF EXISTS "Coaches veem pontuação de seus alunos" ON pontuacao_alunos;
DROP POLICY IF EXISTS "pontuacao_select" ON pontuacao_alunos;

CREATE POLICY "pontuacao_select" ON pontuacao_alunos
    FOR SELECT
    TO authenticated
    USING (
        aluno_id = auth.uid()
        OR EXISTS (
            SELECT 1 FROM coach_alunos
            WHERE coach_alunos.coach_id = auth.uid()
            AND coach_alunos.aluno_id = pontuacao_alunos.aluno_id
        )
    );

-- INSERT/UPDATE: bloqueado para clientes (só o trigger com SECURITY DEFINER pode)
-- Nenhuma política = nenhum acesso direto pelo cliente
-- O trigger ignora RLS por ter SECURITY DEFINER

-- Verificação: confirmar que o trigger ainda tem SECURITY DEFINER
SELECT 
    proname AS funcao,
    prosecdef AS security_definer
FROM pg_proc
WHERE proname = 'consolidar_pontos_aluno';

-- Verificar políticas ativas
SELECT policyname, cmd, qual, with_check
FROM pg_policies
WHERE tablename = 'pontuacao_alunos';
