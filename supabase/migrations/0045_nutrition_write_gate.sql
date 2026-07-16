-- ============================================================
-- 0045 · Gate de escrita por assinatura nas tabelas de nutrição
-- Segue o padrão de fichas_treino / treinos_alunos (0039 / 0042)
-- Quebra policies ALL (sem gate) em SELECT (sem gate) + WRITE (com gate)
--
-- Regra: coach com assinatura expirada ainda LÊ; INSERT/UPDATE/DELETE
-- exigem public.coach_has_write_access().
-- ============================================================

-- ── nutrition_plans ──────────────────────────────────────────
DROP POLICY IF EXISTS "manage_nutrition_plans" ON public.nutrition_plans;
DROP POLICY IF EXISTS "nutrition_plans_select" ON public.nutrition_plans;
DROP POLICY IF EXISTS "nutrition_plans_write" ON public.nutrition_plans;
-- Substitui read_nutrition_plans pela select explícita (mesmo predicado)
DROP POLICY IF EXISTS "read_nutrition_plans" ON public.nutrition_plans;

CREATE POLICY "nutrition_plans_select"
  ON public.nutrition_plans
  FOR SELECT
  TO authenticated
  USING (
    coach_id = auth.uid()
    OR student_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.coach_alunos ca
      WHERE ca.coach_id = auth.uid() AND ca.aluno_id = nutrition_plans.student_id
    )
  );

-- WRITE: FOR ALL cobre INSERT/UPDATE/DELETE (e SELECT com gate — leitura
-- continua via nutrition_plans_select por OR permissivo)
CREATE POLICY "nutrition_plans_write"
  ON public.nutrition_plans
  FOR ALL
  TO authenticated
  USING (
    public.coach_has_write_access()
    AND (
      coach_id = auth.uid()
      OR EXISTS (
        SELECT 1 FROM public.coach_alunos ca
        WHERE ca.coach_id = auth.uid() AND ca.aluno_id = nutrition_plans.student_id
      )
    )
  )
  WITH CHECK (
    public.coach_has_write_access()
    AND (
      coach_id = auth.uid()
      OR EXISTS (
        SELECT 1 FROM public.coach_alunos ca
        WHERE ca.coach_id = auth.uid() AND ca.aluno_id = nutrition_plans.student_id
      )
    )
  );

-- ── nutrition_plan_days ──────────────────────────────────────
-- read_plan_days (SELECT) permanece
DROP POLICY IF EXISTS "manage_plan_days" ON public.nutrition_plan_days;
DROP POLICY IF EXISTS "nutrition_plan_days_write" ON public.nutrition_plan_days;

CREATE POLICY "nutrition_plan_days_write"
  ON public.nutrition_plan_days
  FOR ALL
  TO authenticated
  USING (
    public.coach_has_write_access()
    AND EXISTS (
      SELECT 1 FROM public.nutrition_plans p
      WHERE p.id = nutrition_plan_days.plan_id AND p.coach_id = auth.uid()
    )
  )
  WITH CHECK (
    public.coach_has_write_access()
    AND EXISTS (
      SELECT 1 FROM public.nutrition_plans p
      WHERE p.id = nutrition_plan_days.plan_id AND p.coach_id = auth.uid()
    )
  );

-- ── nutrition_meals ───────────────────────────────────────────
DROP POLICY IF EXISTS "manage_meals" ON public.nutrition_meals;
DROP POLICY IF EXISTS "nutrition_meals_write" ON public.nutrition_meals;

CREATE POLICY "nutrition_meals_write"
  ON public.nutrition_meals
  FOR ALL
  TO authenticated
  USING (
    public.coach_has_write_access()
    AND EXISTS (
      SELECT 1
      FROM public.nutrition_plan_days pd
      JOIN public.nutrition_plans p ON p.id = pd.plan_id
      WHERE pd.id = nutrition_meals.plan_day_id AND p.coach_id = auth.uid()
    )
  )
  WITH CHECK (
    public.coach_has_write_access()
    AND EXISTS (
      SELECT 1
      FROM public.nutrition_plan_days pd
      JOIN public.nutrition_plans p ON p.id = pd.plan_id
      WHERE pd.id = nutrition_meals.plan_day_id AND p.coach_id = auth.uid()
    )
  );

-- ── nutrition_meal_items ──────────────────────────────────────
DROP POLICY IF EXISTS "manage_meal_items" ON public.nutrition_meal_items;
DROP POLICY IF EXISTS "nutrition_meal_items_write" ON public.nutrition_meal_items;

CREATE POLICY "nutrition_meal_items_write"
  ON public.nutrition_meal_items
  FOR ALL
  TO authenticated
  USING (
    public.coach_has_write_access()
    AND EXISTS (
      SELECT 1
      FROM public.nutrition_meals m
      JOIN public.nutrition_plan_days pd ON pd.id = m.plan_day_id
      JOIN public.nutrition_plans p ON p.id = pd.plan_id
      WHERE m.id = nutrition_meal_items.meal_id AND p.coach_id = auth.uid()
    )
  )
  WITH CHECK (
    public.coach_has_write_access()
    AND EXISTS (
      SELECT 1
      FROM public.nutrition_meals m
      JOIN public.nutrition_plan_days pd ON pd.id = m.plan_day_id
      JOIN public.nutrition_plans p ON p.id = pd.plan_id
      WHERE m.id = nutrition_meal_items.meal_id AND p.coach_id = auth.uid()
    )
  );

-- ── nutrition_substitutions ───────────────────────────────────
DROP POLICY IF EXISTS "manage_substitutions" ON public.nutrition_substitutions;
DROP POLICY IF EXISTS "nutrition_substitutions_write" ON public.nutrition_substitutions;

CREATE POLICY "nutrition_substitutions_write"
  ON public.nutrition_substitutions
  FOR ALL
  TO authenticated
  USING (
    public.coach_has_write_access()
    AND EXISTS (
      SELECT 1
      FROM public.nutrition_meal_items mi
      JOIN public.nutrition_meals m ON m.id = mi.meal_id
      JOIN public.nutrition_plan_days pd ON pd.id = m.plan_day_id
      JOIN public.nutrition_plans p ON p.id = pd.plan_id
      WHERE mi.id = nutrition_substitutions.meal_item_id AND p.coach_id = auth.uid()
    )
  )
  WITH CHECK (
    public.coach_has_write_access()
    AND EXISTS (
      SELECT 1
      FROM public.nutrition_meal_items mi
      JOIN public.nutrition_meals m ON m.id = mi.meal_id
      JOIN public.nutrition_plan_days pd ON pd.id = m.plan_day_id
      JOIN public.nutrition_plans p ON p.id = pd.plan_id
      WHERE mi.id = nutrition_substitutions.meal_item_id AND p.coach_id = auth.uid()
    )
  );

-- ── nutrition_foods (custom do coach) ─────────────────────────
-- read_nutrition_foods (SELECT amplo) permanece
DROP POLICY IF EXISTS "manage_custom_nutrition_foods" ON public.nutrition_foods;
DROP POLICY IF EXISTS "nutrition_foods_select_own" ON public.nutrition_foods;
DROP POLICY IF EXISTS "nutrition_foods_write" ON public.nutrition_foods;

CREATE POLICY "nutrition_foods_select_own"
  ON public.nutrition_foods
  FOR SELECT
  TO authenticated
  USING (coach_id = auth.uid());

CREATE POLICY "nutrition_foods_write"
  ON public.nutrition_foods
  FOR ALL
  TO authenticated
  USING (public.coach_has_write_access() AND coach_id = auth.uid())
  WITH CHECK (public.coach_has_write_access() AND coach_id = auth.uid());

-- ── nutrition_food_portions (escrita custom ligada ao food) ───
DROP POLICY IF EXISTS "manage_portions" ON public.nutrition_food_portions;
DROP POLICY IF EXISTS "nutrition_food_portions_write" ON public.nutrition_food_portions;

CREATE POLICY "nutrition_food_portions_write"
  ON public.nutrition_food_portions
  FOR ALL
  TO authenticated
  USING (
    public.coach_has_write_access()
    AND EXISTS (
      SELECT 1 FROM public.nutrition_foods f
      WHERE f.id = food_id AND f.coach_id = auth.uid()
    )
  )
  WITH CHECK (
    public.coach_has_write_access()
    AND EXISTS (
      SELECT 1 FROM public.nutrition_foods f
      WHERE f.id = food_id AND f.coach_id = auth.uid()
    )
  );
-- read_portions (SELECT) permanece

-- ── plano_alimentar_pdf ───────────────────────────────────────
-- Remove ALL/INSERT/DELETE legado sem gate (OR permissivo bypassava)
DROP POLICY IF EXISTS "coach_gerencia_plano_alimentar_pdf" ON public.plano_alimentar_pdf;
DROP POLICY IF EXISTS "coach_insert_plan" ON public.plano_alimentar_pdf;
DROP POLICY IF EXISTS "coach_delete_own" ON public.plano_alimentar_pdf;
DROP POLICY IF EXISTS "plano_alimentar_pdf_write" ON public.plano_alimentar_pdf;

CREATE POLICY "plano_alimentar_pdf_write"
  ON public.plano_alimentar_pdf
  FOR ALL
  TO authenticated
  USING (
    public.coach_has_write_access()
    AND (
      coach_id = auth.uid()
      OR EXISTS (
        SELECT 1 FROM public.coach_alunos ca
        WHERE ca.coach_id = auth.uid() AND ca.aluno_id = plano_alimentar_pdf.aluno_id
      )
    )
  )
  WITH CHECK (
    public.coach_has_write_access()
    AND (
      coach_id = auth.uid()
      OR EXISTS (
        SELECT 1 FROM public.coach_alunos ca
        WHERE ca.coach_id = auth.uid() AND ca.aluno_id = plano_alimentar_pdf.aluno_id
      )
    )
  );
-- SELECT existentes (aluno_le_*, coach_sees_*, etc.) não mudam

-- ── refeicoes_plano ────────────────────────────────────────────
DROP POLICY IF EXISTS "coaches_gerenciam_refeicoes" ON public.refeicoes_plano;
DROP POLICY IF EXISTS "refeicoes_plano_write" ON public.refeicoes_plano;

CREATE POLICY "refeicoes_plano_write"
  ON public.refeicoes_plano
  FOR ALL
  TO authenticated
  USING (
    public.coach_has_write_access()
    AND EXISTS (
      SELECT 1 FROM public.plano_alimentar_pdf p
      WHERE p.id = refeicoes_plano.plano_id AND p.coach_id = auth.uid()
    )
  )
  WITH CHECK (
    public.coach_has_write_access()
    AND EXISTS (
      SELECT 1 FROM public.plano_alimentar_pdf p
      WHERE p.id = refeicoes_plano.plano_id AND p.coach_id = auth.uid()
    )
  );
-- alunos_leem_refeicoes_proprio_plano (SELECT) permanece

-- ── exercicios_biblioteca ──────────────────────────────────────
-- Policies super_admin de INSERT/UPDATE/DELETE (0027) permanecem
DROP POLICY IF EXISTS "Coach gerencia próprios exercícios" ON public.exercicios_biblioteca;
DROP POLICY IF EXISTS "exercicios_coach_select_own" ON public.exercicios_biblioteca;
DROP POLICY IF EXISTS "exercicios_coach_write" ON public.exercicios_biblioteca;

CREATE POLICY "exercicios_coach_select_own"
  ON public.exercicios_biblioteca
  FOR SELECT
  TO authenticated
  USING (
    coach_id = auth.uid()
    OR (
      coach_id IS NULL
      AND origem::text = 'custom'
      AND auth.uid() IN (
        SELECT id FROM public.profiles
        WHERE role = ANY (ARRAY['coach'::text, 'admin'::text, 'super_admin'::text])
      )
    )
  );

CREATE POLICY "exercicios_coach_write"
  ON public.exercicios_biblioteca
  FOR ALL
  TO authenticated
  USING (public.coach_has_write_access() AND coach_id = auth.uid())
  WITH CHECK (public.coach_has_write_access() AND coach_id = auth.uid());
-- "Coach vê global e próprios" / "Aluno vê..." (SELECT) permanecem
-- Super admin write policies (0027) permanecem

COMMENT ON POLICY "nutrition_plans_write" ON public.nutrition_plans IS
  'Escrita exige coach_has_write_access(); SELECT sem gate via nutrition_plans_select.';
