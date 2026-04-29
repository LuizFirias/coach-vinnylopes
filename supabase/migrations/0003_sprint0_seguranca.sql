-- ═════════════════════════════════════════════════════════════════════════════════
-- Sprint 0 — Segurança RLS (2-5 coaches confirmados)
-- ═════════════════════════════════════════════════════════════════════════════════
--
-- PROBLEMA DESCOBERTO:
--   - fichas_treino: policy "Coach gere as fichas" usa role='coach' sem verificar coach_alunos
--     → qualquer coach pode editar ficha de aluno de outro coach
--   - medidas_aluno: 2 policies permissivas ("Coaches veem..." + "Coaches podem...")
--     → qualquer coach lê medidas de qualquer aluno
--
-- SOLUÇÃO:
--   - Fix A: Remover policy genérica de fichas_treino, usar a existente via coach_alunos
--   - Fix B: Criar policy correta em medidas_aluno via coach_alunos, remover permissivas
--
-- SEGURANÇA: cada fix em seu próprio BEGIN/COMMIT. Rollback comentado ao final.
--
-- ═════════════════════════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────────────────────────────────────────
-- FIX A — fichas_treino: remover policy genérica, usar policy correta via coach_alunos
-- ─────────────────────────────────────────────────────────────────────────────────

BEGIN;

-- 1) Confirmar que policy correta já existe (criada antes deste migration)
-- SELECT policyname, qual FROM pg_policies
-- WHERE tablename = 'fichas_treino' ORDER BY policyname;

-- 2) Dropar a policy genérica permissiva
DROP POLICY IF EXISTS "Coach gere as fichas" ON fichas_treino;

-- 3) Validação: após commitar, logado como coach, deve ver só fichas dos próprios alunos
-- SET ROLE authenticated;
-- SELECT auth.uid();
-- SELECT count(*) FROM fichas_treino;  -- deve ser menor que total

COMMIT;

-- ROLLBACK Fix A:
-- CREATE POLICY "Coach gere as fichas" ON fichas_treino FOR ALL
--   USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'coach'));

-- ─────────────────────────────────────────────────────────────────────────────────
-- FIX B — medidas_aluno: criar policy correta via coach_alunos, remover permissivas
-- ─────────────────────────────────────────────────────────────────────────────────

BEGIN;

-- 1) Criar policy correta que usa coach_alunos
CREATE POLICY "medidas_coach_apenas_proprios_alunos"
  ON medidas_aluno FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM coach_alunos
      WHERE coach_alunos.coach_id = auth.uid()
        AND coach_alunos.aluno_id = medidas_aluno.aluno_id
    )
  );

-- 2) Dropar AS DUAS policies permissivas (nomes exatos)
DROP POLICY IF EXISTS "Coaches podem ver as medidas de todos os alunos" ON medidas_aluno;
DROP POLICY IF EXISTS "Coaches veem todas as medidas" ON medidas_aluno;

-- 3) Verificação: listar policies restantes (todas devem ser específicas)
-- SELECT policyname, cmd, qual FROM pg_policies
-- WHERE tablename = 'medidas_aluno' ORDER BY policyname;

COMMIT;

-- ROLLBACK Fix B:
-- CREATE POLICY "Coaches veem todas as medidas" ON medidas_aluno FOR SELECT
--   USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid()
--     AND profiles.role = ANY (ARRAY['coach'::text, 'super_admin'::text])));
-- DROP POLICY IF EXISTS "medidas_coach_apenas_proprios_alunos" ON medidas_aluno;

-- ═════════════════════════════════════════════════════════════════════════════════
-- VALIDAÇÃO PÓS-APLICAÇÃO
-- ═════════════════════════════════════════════════════════════════════════════════
--
-- TESTE 1: Coach A lê fichas do Coach B
--   - Logado como Coach A
--   - SELECT count(*) FROM fichas_treino WHERE coach_id != auth.uid();
--   - ESPERADO: 0 (não deve retornar fichas de outro coach)
--
-- TESTE 2: Coach A lê medidas de aluno do Coach B
--   - Logado como Coach A
--   - SELECT count(*) FROM medidas_aluno WHERE aluno_id NOT IN (
--     SELECT aluno_id FROM coach_alunos WHERE coach_id = auth.uid()
--   );
--   - ESPERADO: 0 (RLS deve bloquear, erro "no rows")
--
-- TESTE 3: Coach A lê medidas de próprio aluno
--   - Logado como Coach A, com aluno X vinculado
--   - SELECT count(*) FROM medidas_aluno WHERE aluno_id = <id do aluno X>;
--   - ESPERADO: retorna a contagem (funciona)
--
-- ═════════════════════════════════════════════════════════════════════════════════
