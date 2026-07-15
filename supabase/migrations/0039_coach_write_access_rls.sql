-- Gate de escrita do coach sem assinatura ativa (fichas_treino + treinos_alunos).
-- Leitura do aluno e do coach permanece; INSERT/UPDATE/DELETE exigem acesso ativo.
-- Policies PERMISSIVE são OR — por isso recriamos as policies de coach com o check
-- embutido, em vez de adicionar uma policy paralela.

CREATE OR REPLACE FUNCTION public.coach_has_write_access()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = auth.uid()
      AND (
        p.subscription_active = true
        OR p.account_type IN ('teste', 'parceiro')
        OR p.role = 'super_admin'
      )
  );
$$;

GRANT EXECUTE ON FUNCTION public.coach_has_write_access() TO authenticated;

COMMENT ON FUNCTION public.coach_has_write_access() IS
  'True se o usuário autenticado pode escrever como coach (assinatura ativa ou conta especial).';

-- ── fichas_treino ──────────────────────────────────────────────────────────
-- Substitui ficha_coach_all (FOR ALL) por SELECT livre + writes com gate.

DROP POLICY IF EXISTS "ficha_coach_all" ON public.fichas_treino;
DROP POLICY IF EXISTS "coach_write_active_subscription" ON public.fichas_treino;
DROP POLICY IF EXISTS "coach_select_fichas_treino" ON public.fichas_treino;
DROP POLICY IF EXISTS "coach_insert_fichas_treino" ON public.fichas_treino;
DROP POLICY IF EXISTS "coach_update_fichas_treino" ON public.fichas_treino;
DROP POLICY IF EXISTS "coach_delete_fichas_treino" ON public.fichas_treino;

CREATE POLICY "coach_select_fichas_treino"
  ON public.fichas_treino
  FOR SELECT
  TO authenticated
  USING (
    coach_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.coach_alunos
      WHERE coach_id = auth.uid() AND aluno_id = fichas_treino.aluno_id
    )
  );

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

-- ── treinos_alunos ─────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "coach_gerencia_treinos_alunos" ON public.treinos_alunos;
DROP POLICY IF EXISTS "coach_write_active_subscription" ON public.treinos_alunos;
DROP POLICY IF EXISTS "coach_select_treinos_alunos" ON public.treinos_alunos;
DROP POLICY IF EXISTS "coach_insert_treinos_alunos" ON public.treinos_alunos;
DROP POLICY IF EXISTS "coach_update_treinos_alunos" ON public.treinos_alunos;
DROP POLICY IF EXISTS "coach_delete_treinos_alunos" ON public.treinos_alunos;

CREATE POLICY "coach_select_treinos_alunos"
  ON public.treinos_alunos
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.coach_alunos ca
      WHERE ca.coach_id = auth.uid() AND ca.aluno_id = treinos_alunos.aluno_id
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
