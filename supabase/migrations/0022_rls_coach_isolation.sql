-- ============================================================
-- 0022 · RLS Coach Isolation
-- Garante que cada coach só acessa dados dos seus próprios alunos.
--
-- Problema: várias tabelas sem RLS ou com policies permissivas
-- que permitiam qualquer coach ver dados de alunos de outros coaches.
--
-- Tabelas corrigidas:
--   historico_treinos  — fix: policy "Admins" incluía todos os coaches
--   treinos_alunos     — novo RLS
--   treinos_manuais    — novo RLS
--   pontuacao_alunos   — novo RLS (leitura aberta para leaderboard)
--   plano_alimentar_pdf — novo RLS (tabela, não só storage)
--   fotos_evolucao     — novo RLS (tabela, não só storage)
--   coach_alunos       — novo RLS
-- ============================================================

BEGIN;

-- ============================================================
-- 1. historico_treinos: corrigir policy permissiva
-- "Admins leem historico" usava role IN ('coach', 'super_admin')
-- sem join em coach_alunos → qualquer coach via ANY historico
-- ============================================================

DROP POLICY IF EXISTS "Admins leem historico" ON historico_treinos;

CREATE POLICY "super_admin_historico_all"
  ON historico_treinos FOR ALL
  TO authenticated
  USING (get_auth_user_role() = 'super_admin');

-- Nota: "Coaches leem historico dos alunos" (coach_alunos join) e
-- "Alunos leem historico" e "Alunos inserem historico" já existem
-- e são corretas. Apenas a policy permissiva foi removida acima.

-- ============================================================
-- 2. coach_alunos: habilitar RLS
-- Cada coach vê/gerencia só seus próprios vínculos.
-- ============================================================

ALTER TABLE coach_alunos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "coach_le_proprias_relacoes"
  ON coach_alunos FOR SELECT
  TO authenticated
  USING (coach_id = auth.uid() OR get_auth_user_role() = 'super_admin');

CREATE POLICY "coach_gerencia_proprias_relacoes"
  ON coach_alunos FOR INSERT
  TO authenticated
  WITH CHECK (coach_id = auth.uid() OR get_auth_user_role() = 'super_admin');

CREATE POLICY "coach_deleta_proprias_relacoes"
  ON coach_alunos FOR DELETE
  TO authenticated
  USING (coach_id = auth.uid() OR get_auth_user_role() = 'super_admin');

-- ============================================================
-- 3. treinos_alunos: habilitar RLS
-- PDFs de treino enviados pelo coach para o aluno.
-- ============================================================

ALTER TABLE treinos_alunos ENABLE ROW LEVEL SECURITY;

-- Aluno lê seus próprios PDFs
CREATE POLICY "aluno_le_proprios_treinos_pdf"
  ON treinos_alunos FOR SELECT
  TO authenticated
  USING (auth.uid() = aluno_id);

-- Coach gerencia PDFs dos seus alunos
CREATE POLICY "coach_gerencia_treinos_alunos"
  ON treinos_alunos FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM coach_alunos ca
      WHERE ca.coach_id = auth.uid() AND ca.aluno_id = treinos_alunos.aluno_id
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM coach_alunos ca
      WHERE ca.coach_id = auth.uid() AND ca.aluno_id = treinos_alunos.aluno_id
    )
  );

-- Super admin acessa tudo
CREATE POLICY "super_admin_treinos_alunos"
  ON treinos_alunos FOR ALL
  TO authenticated
  USING (get_auth_user_role() = 'super_admin');

-- ============================================================
-- 4. treinos_manuais: habilitar RLS
-- Treinos registrados manualmente pelo aluno.
-- ============================================================

ALTER TABLE treinos_manuais ENABLE ROW LEVEL SECURITY;

-- Aluno gerencia seus próprios treinos manuais
CREATE POLICY "aluno_gerencia_treinos_manuais"
  ON treinos_manuais FOR ALL
  TO authenticated
  USING (auth.uid() = aluno_id)
  WITH CHECK (auth.uid() = aluno_id);

-- Coach lê treinos manuais dos seus alunos (histórico no admin)
CREATE POLICY "coach_le_treinos_manuais_alunos"
  ON treinos_manuais FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM coach_alunos ca
      WHERE ca.coach_id = auth.uid() AND ca.aluno_id = treinos_manuais.aluno_id
    )
  );

-- Super admin acessa tudo
CREATE POLICY "super_admin_treinos_manuais"
  ON treinos_manuais FOR ALL
  TO authenticated
  USING (get_auth_user_role() = 'super_admin');

-- ============================================================
-- 5. pontuacao_alunos: habilitar RLS
-- Leitura aberta para todos autenticados (leaderboard global).
-- Escrita feita exclusivamente por funções SECURITY DEFINER
-- (recalcular_pontos_aluno / consolidar_pontos_aluno).
-- ============================================================

ALTER TABLE pontuacao_alunos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "authenticated_le_pontuacao"
  ON pontuacao_alunos FOR SELECT
  TO authenticated
  USING (true);

-- INSERT/UPDATE via SECURITY DEFINER bypass RLS — sem policy de escrita para clients.

-- ============================================================
-- 6. plano_alimentar_pdf: habilitar RLS em nível de tabela
-- (já existem storage policies; isso protege a tabela diretamente)
-- ============================================================

ALTER TABLE plano_alimentar_pdf ENABLE ROW LEVEL SECURITY;

-- Aluno lê seus próprios planos
CREATE POLICY "aluno_le_plano_alimentar_pdf"
  ON plano_alimentar_pdf FOR SELECT
  TO authenticated
  USING (auth.uid() = aluno_id);

-- Coach gerencia planos dos seus alunos
CREATE POLICY "coach_gerencia_plano_alimentar_pdf"
  ON plano_alimentar_pdf FOR ALL
  TO authenticated
  USING (
    auth.uid() = coach_id
    OR EXISTS (
      SELECT 1 FROM coach_alunos ca
      WHERE ca.coach_id = auth.uid() AND ca.aluno_id = plano_alimentar_pdf.aluno_id
    )
  )
  WITH CHECK (
    auth.uid() = coach_id
    OR EXISTS (
      SELECT 1 FROM coach_alunos ca
      WHERE ca.coach_id = auth.uid() AND ca.aluno_id = plano_alimentar_pdf.aluno_id
    )
  );

-- Super admin acessa tudo
CREATE POLICY "super_admin_plano_alimentar_pdf"
  ON plano_alimentar_pdf FOR ALL
  TO authenticated
  USING (get_auth_user_role() = 'super_admin');

-- ============================================================
-- 7. fotos_evolucao: habilitar RLS em nível de tabela
-- (já existem storage policies para os arquivos)
-- ============================================================

ALTER TABLE fotos_evolucao ENABLE ROW LEVEL SECURITY;

-- Aluno gerencia suas próprias fotos
CREATE POLICY "aluno_gerencia_fotos_evolucao"
  ON fotos_evolucao FOR ALL
  TO authenticated
  USING (auth.uid() = aluno_id)
  WITH CHECK (auth.uid() = aluno_id);

-- Coach lê fotos dos seus alunos
CREATE POLICY "coach_le_fotos_alunos"
  ON fotos_evolucao FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM coach_alunos ca
      WHERE ca.coach_id = auth.uid() AND ca.aluno_id = fotos_evolucao.aluno_id
    )
  );

-- Super admin acessa tudo
CREATE POLICY "super_admin_fotos_evolucao"
  ON fotos_evolucao FOR ALL
  TO authenticated
  USING (get_auth_user_role() = 'super_admin');

COMMIT;

-- ============================================================
-- Verificação pós-aplicação:
--
-- -- 1. Policies em historico_treinos (não deve ter "Admins leem historico"):
-- SELECT policyname, cmd FROM pg_policies WHERE tablename = 'historico_treinos';
--
-- -- 2. Confirmar RLS habilitado nas novas tabelas:
-- SELECT tablename, rowsecurity FROM pg_tables
-- WHERE tablename IN ('coach_alunos','treinos_alunos','treinos_manuais',
--                     'pontuacao_alunos','plano_alimentar_pdf','fotos_evolucao');
--
-- -- 3. Testar isolamento: logado como coach, não deve ver dados de aluno de outro coach:
-- SELECT count(*) FROM treinos_alunos WHERE aluno_id NOT IN (
--   SELECT aluno_id FROM coach_alunos WHERE coach_id = auth.uid()
-- ); -- deve ser 0
-- ============================================================

-- ============================================================
-- ROLLBACK (em caso de regressão):
--
-- DROP POLICY IF EXISTS "super_admin_historico_all"          ON historico_treinos;
-- CREATE POLICY "Admins leem historico" ON historico_treinos FOR ALL TO authenticated
--   USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('coach','super_admin')));
--
-- ALTER TABLE coach_alunos         DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE treinos_alunos       DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE treinos_manuais      DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE pontuacao_alunos     DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE plano_alimentar_pdf  DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE fotos_evolucao       DISABLE ROW LEVEL SECURITY;
-- ============================================================
