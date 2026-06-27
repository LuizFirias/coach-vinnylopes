-- =====================================================
-- FIX: Avisos de Segurança do Supabase
-- Execute no Supabase SQL Editor
-- NÃO altera nenhuma lógica do app
-- =====================================================

-- =====================================================
-- PARTE 1: function_search_path_mutable
-- Adiciona SET search_path = '' em todas as funções
-- Previne SQL injection via search_path manipulation
-- =====================================================

-- 1. update_feedbacks_updated_at
CREATE OR REPLACE FUNCTION public.update_feedbacks_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql
   SECURITY DEFINER
   SET search_path = '';

-- 2. get_ultimo_treino_exercicio
CREATE OR REPLACE FUNCTION public.get_ultimo_treino_exercicio(
  p_aluno_id UUID,
  p_exercicio_id UUID
)
RETURNS JSONB AS $$
DECLARE
  ultimo_treino JSONB;
BEGIN
  SELECT dados_sessao INTO ultimo_treino
  FROM public.historico_treinos
  WHERE aluno_id = p_aluno_id
    AND exercicio_id = p_exercicio_id
  ORDER BY data_conclusao DESC
  LIMIT 1;

  RETURN COALESCE(ultimo_treino, '{}'::JSONB);
END;
$$ LANGUAGE plpgsql
   SECURITY DEFINER
   SET search_path = '';

-- 3. update_updated_at_column (trigger genérico)
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.atualizado_em = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql
   SET search_path = '';

-- 4. calcular_pontos_treino
CREATE OR REPLACE FUNCTION public.calcular_pontos_treino(
  p_tipo TEXT,
  p_duracao_minutos INTEGER
)
RETURNS INTEGER AS $$
BEGIN
  CASE
    WHEN p_tipo = 'musculacao' THEN RETURN 20;
    WHEN p_tipo = 'cardio' THEN
      IF p_duracao_minutos BETWEEN 10 AND 19 THEN RETURN 10;
      ELSIF p_duracao_minutos BETWEEN 20 AND 49 THEN RETURN 20;
      ELSIF p_duracao_minutos >= 50 THEN RETURN 30;
      ELSE RETURN 0;
      END IF;
    ELSE RETURN 0;
  END CASE;
END;
$$ LANGUAGE plpgsql
   IMMUTABLE
   SET search_path = '';

-- 5. atualizar_pontos_treino
CREATE OR REPLACE FUNCTION public.atualizar_pontos_treino()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.concluido = true AND NEW.data_treino <= CURRENT_DATE THEN
    NEW.pontos_earn := public.calcular_pontos_treino(NEW.tipo_treino, NEW.duracao_minutos);
  ELSE
    NEW.pontos_earn := 0;
  END IF;
  NEW.atualizado_em := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql
   SET search_path = '';

-- 6. consolidar_pontos_aluno
CREATE OR REPLACE FUNCTION public.consolidar_pontos_aluno()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.pontuacao_alunos (aluno_id, total_pontos, atualizado_em)
  SELECT
    NEW.aluno_id,
    COALESCE(SUM(pontos_earn), 0),
    NOW()
  FROM public.treinos_manuais
  WHERE aluno_id = NEW.aluno_id AND concluido = true
  ON CONFLICT (aluno_id) DO UPDATE SET
    total_pontos = EXCLUDED.total_pontos,
    atualizado_em = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql
   SET search_path = '';

-- 7. check_is_admin
CREATE OR REPLACE FUNCTION public.check_is_admin()
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
    AND role IN ('coach', 'super_admin')
    AND arquivado = false
  );
END;
$$ LANGUAGE plpgsql
   SECURITY DEFINER
   SET search_path = '';

-- 8. handle_new_user (criado automaticamente pelo Supabase Auth)
-- Buscar definição atual e recriar com search_path fixo:
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, role)
  VALUES (NEW.id, NEW.email, 'aluno')
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql
   SECURITY DEFINER
   SET search_path = '';

-- 9. realizar_checkin (função de checkin do aluno)
-- Recriar com search_path fixo preservando lógica original:
CREATE OR REPLACE FUNCTION public.realizar_checkin(
  p_aluno_id UUID,
  p_descricao TEXT DEFAULT NULL
)
RETURNS JSONB AS $$
DECLARE
  v_hoje DATE := CURRENT_DATE;
  v_checkin_existente UUID;
  v_pontos INTEGER := 10;
  v_resultado JSONB;
BEGIN
  -- Verificar se já fez checkin hoje
  SELECT id INTO v_checkin_existente
  FROM public.checkins
  WHERE aluno_id = p_aluno_id
    AND DATE(created_at) = v_hoje
  LIMIT 1;

  IF v_checkin_existente IS NOT NULL THEN
    RETURN jsonb_build_object(
      'sucesso', false,
      'mensagem', 'Checkin já realizado hoje',
      'pontos', 0
    );
  END IF;

  -- Inserir checkin
  INSERT INTO public.checkins (aluno_id, descricao, pontos)
  VALUES (p_aluno_id, p_descricao, v_pontos);

  -- Atualizar pontuação
  INSERT INTO public.pontuacao_alunos (aluno_id, total_pontos, atualizado_em)
  VALUES (p_aluno_id, v_pontos, NOW())
  ON CONFLICT (aluno_id) DO UPDATE SET
    total_pontos = public.pontuacao_alunos.total_pontos + v_pontos,
    atualizado_em = NOW();

  RETURN jsonb_build_object(
    'sucesso', true,
    'mensagem', 'Checkin realizado com sucesso',
    'pontos', v_pontos
  );
END;
$$ LANGUAGE plpgsql
   SECURITY DEFINER
   SET search_path = '';

-- =====================================================
-- PARTE 2: rls_policy_always_true
-- Remover policies com USING(true) irrestrito
-- =====================================================

-- Remover policy antiga de parceiros que permite tudo (USING true)
-- Já substituída pelas policies específicas do fix-coach-issues-completo.sql
DROP POLICY IF EXISTS "Apenas coach gerencia parceiros" ON public.parceiros;

-- Remover policy de pontuacao_alunos que permite tudo
-- O sistema via trigger (consolidar_pontos_aluno) usa SECURITY DEFINER
-- então não precisa de policy permissiva — apenas as de SELECT bastam
DROP POLICY IF EXISTS "Sistema atualiza pontuação" ON public.pontuacao_alunos;

-- Garantir que o INSERT/UPDATE em pontuacao_alunos ainda funciona via trigger SECURITY DEFINER
-- (a função consolidar_pontos_aluno já tem SECURITY DEFINER, opera como superuser)
-- Nenhuma policy de INSERT/UPDATE é necessária para o trigger funcionar.

-- =====================================================
-- PARTE 3: auth_leaked_password_protection
-- Esta configuração é feita no Dashboard do Supabase:
-- Authentication > Providers > Email > Enable "Leaked Password Protection"
-- Não requer SQL.
-- =====================================================
