-- Índices para as telas do aluno (nutrição e treinos)

-- Embed plano → dias na nutrição do aluno (loadStudentNutritionPageData)
CREATE INDEX IF NOT EXISTS idx_nutrition_plan_days_plan_id
  ON public.nutrition_plan_days (plan_id);

CREATE INDEX IF NOT EXISTS idx_nutrition_food_portions_food_id
  ON public.nutrition_food_portions (food_id);

-- Lista de rotinas do aluno: aluno_id + ativo, ordenado por criado_em DESC
CREATE INDEX IF NOT EXISTS idx_fichas_treino_aluno_criado
  ON public.fichas_treino (aluno_id, criado_em DESC)
  WHERE ativo = true;

-- Fichas PDF do aluno
CREATE INDEX IF NOT EXISTS idx_treinos_alunos_aluno_upload
  ON public.treinos_alunos (aluno_id, data_upload DESC);

-- Cargas "Anterior" na execução: aluno_id + exercicio_id, mais recentes primeiro
CREATE INDEX IF NOT EXISTS idx_historico_treinos_aluno_exercicio
  ON public.historico_treinos (aluno_id, exercicio_id, data_conclusao DESC);
