-- Remove policies antigas que bypassam o gate de assinatura (coach_has_write_access).
-- Policies PERMISSIVE são OR: qualquer INSERT/UPDATE/DELETE sem o gate anula a 0039.
--
-- Confirmado em produção (pg_policies audit 2026-07-16):
--   fichas_treino: "Coaches podem criar/editar/deletar suas fichas" — só checa role=coach
--   treinos_alunos: "treino_coach_insert" / "treino_coach_delete_own" — sem subscription gate

-- ── fichas_treino ──────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "Coaches podem criar fichas" ON public.fichas_treino;
DROP POLICY IF EXISTS "Coaches podem editar suas fichas" ON public.fichas_treino;
DROP POLICY IF EXISTS "Coaches podem deletar suas fichas" ON public.fichas_treino;

-- Duplicatas de SELECT (inofensivas para o gate, mas ruidosas) — opcional limpar depois.
-- Mantemos SELECT duplicadas por agora (só leitura).

-- ── treinos_alunos ─────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "treino_coach_insert" ON public.treinos_alunos;
DROP POLICY IF EXISTS "treino_coach_delete_own" ON public.treinos_alunos;

-- Garante que as policies com gate existem (idempotente com 0039)
DROP POLICY IF EXISTS "coach_insert_fichas_treino" ON public.fichas_treino;
DROP POLICY IF EXISTS "coach_update_fichas_treino" ON public.fichas_treino;
DROP POLICY IF EXISTS "coach_delete_fichas_treino" ON public.fichas_treino;
DROP POLICY IF EXISTS "coach_insert_treinos_alunos" ON public.treinos_alunos;
DROP POLICY IF EXISTS "coach_update_treinos_alunos" ON public.treinos_alunos;
DROP POLICY IF EXISTS "coach_delete_treinos_alunos" ON public.treinos_alunos;

CREATE POLICY "coach_insert_fichas_treino"
  ON public.fichas_treino
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.coach_has_write_access()
    AND (
      coach_id = auth.uid()
      OR EXISTS (
        SELECT 1 FROM public.coach_alunos
        WHERE coach_id = auth.uid() AND aluno_id = fichas_treino.aluno_id
      )
    )
  );

CREATE POLICY "coach_update_fichas_treino"
  ON public.fichas_treino
  FOR UPDATE
  TO authenticated
  USING (
    coach_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.coach_alunos
      WHERE coach_id = auth.uid() AND aluno_id = fichas_treino.aluno_id
    )
  )
  WITH CHECK (
    public.coach_has_write_access()
    AND (
      coach_id = auth.uid()
      OR EXISTS (
        SELECT 1 FROM public.coach_alunos
        WHERE coach_id = auth.uid() AND aluno_id = fichas_treino.aluno_id
      )
    )
  );

CREATE POLICY "coach_delete_fichas_treino"
  ON public.fichas_treino
  FOR DELETE
  TO authenticated
  USING (
    public.coach_has_write_access()
    AND (
      coach_id = auth.uid()
      OR EXISTS (
        SELECT 1 FROM public.coach_alunos
        WHERE coach_id = auth.uid() AND aluno_id = fichas_treino.aluno_id
      )
    )
  );

CREATE POLICY "coach_insert_treinos_alunos"
  ON public.treinos_alunos
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.coach_has_write_access()
    AND EXISTS (
      SELECT 1 FROM public.coach_alunos ca
      WHERE ca.coach_id = auth.uid() AND ca.aluno_id = treinos_alunos.aluno_id
    )
  );

CREATE POLICY "coach_update_treinos_alunos"
  ON public.treinos_alunos
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.coach_alunos ca
      WHERE ca.coach_id = auth.uid() AND ca.aluno_id = treinos_alunos.aluno_id
    )
  )
  WITH CHECK (
    public.coach_has_write_access()
    AND EXISTS (
      SELECT 1 FROM public.coach_alunos ca
      WHERE ca.coach_id = auth.uid() AND ca.aluno_id = treinos_alunos.aluno_id
    )
  );

CREATE POLICY "coach_delete_treinos_alunos"
  ON public.treinos_alunos
  FOR DELETE
  TO authenticated
  USING (
    public.coach_has_write_access()
    AND EXISTS (
      SELECT 1 FROM public.coach_alunos ca
      WHERE ca.coach_id = auth.uid() AND ca.aluno_id = treinos_alunos.aluno_id
    )
  );

COMMENT ON POLICY "coach_insert_fichas_treino" ON public.fichas_treino IS
  'Escrita exige coach_has_write_access(); policies legado sem gate foram removidas em 0042.';
