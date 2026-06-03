-- RLS Audit — Corrigir 4 findings de segurança (MIGRATION-PLAN §11)
-- Aplique este arquivo em produção DEPOIS de validar em branch.
--
-- ⚠️  ANTES DE APLICAR FINDING D: confirme que v_leaderboard existe
--     e que o app não tem outras leituras cruzadas de profiles.
--
-- ROLLBACK de cada bloco está no final do arquivo.

-- ============================================================
-- Finding A — fichas_treino: policy permissiva (OBRIGATÓRIO)
-- Qualquer coach podia editar ficha de aluno de outro coach.
-- ============================================================

BEGIN;

-- Criar policy correta via coach_alunos (idempotente via DO)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'fichas_treino' AND policyname = 'ficha_coach_all'
  ) THEN
    EXECUTE $p$
      CREATE POLICY "ficha_coach_all"
        ON fichas_treino FOR ALL
        USING (
          coach_id = auth.uid()
          OR EXISTS (
            SELECT 1 FROM coach_alunos
            WHERE coach_id = auth.uid() AND aluno_id = fichas_treino.aluno_id
          )
        )
        WITH CHECK (
          coach_id = auth.uid()
          OR EXISTS (
            SELECT 1 FROM coach_alunos
            WHERE coach_id = auth.uid() AND aluno_id = fichas_treino.aluno_id
          )
        )
    $p$;
  END IF;
END;
$$;

-- Dropar a policy permissiva (role='coach' sem checar coach_alunos)
DROP POLICY IF EXISTS "Coach gere as fichas" ON fichas_treino;

COMMIT;

-- ============================================================
-- Finding B — medidas_aluno: policies permissivas (OBRIGATÓRIO)
-- Qualquer coach via role='coach' lia medidas de qualquer aluno.
-- ============================================================

BEGIN;

-- Criar policy correta via coach_alunos
CREATE POLICY "medidas_coach_apenas_proprios_alunos"
  ON medidas_aluno FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM coach_alunos
      WHERE coach_alunos.coach_id = auth.uid()
        AND coach_alunos.aluno_id = medidas_aluno.aluno_id
    )
  );

-- Dropar as duas policies permissivas
DROP POLICY IF EXISTS "Coaches podem ver as medidas de todos os alunos" ON medidas_aluno;
DROP POLICY IF EXISTS "Coaches veem todas as medidas" ON medidas_aluno;

COMMIT;

-- ============================================================
-- Finding C — plano_alimentar_audit: sem policies (RLS bloqueava tudo)
-- ============================================================

BEGIN;

CREATE POLICY "audit_coach_insere"
  ON plano_alimentar_audit FOR INSERT
  WITH CHECK (
    acessado_por = auth.uid()
    AND EXISTS (
      SELECT 1 FROM plano_alimentar_pdf p
      WHERE p.id = plano_alimentar_audit.plano_id
        AND p.coach_id = auth.uid()
    )
  );

CREATE POLICY "audit_coach_le_proprios"
  ON plano_alimentar_audit FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM plano_alimentar_pdf p
      WHERE p.id = plano_alimentar_audit.plano_id
        AND p.coach_id = auth.uid()
    )
  );

CREATE POLICY "audit_aluno_le_proprio"
  ON plano_alimentar_audit FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM plano_alimentar_pdf p
      WHERE p.id = plano_alimentar_audit.plano_id
        AND p.aluno_id = auth.uid()
    )
  );

CREATE POLICY "audit_super_admin"
  ON plano_alimentar_audit FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'super_admin'
    )
  );

COMMIT;

-- ============================================================
-- Finding D — profiles: policy "authenticated_can_read_profiles"
-- com USING true expõe email, status_pagamento, valor_plano, etc.
--
-- Pré-condições confirmadas:
--   ✅ v_leaderboard existe (Sprint 6) e o front usa ela
--   ✅ Alunos só leem próprio profile diretamente
--   ✅ Admin/coach usa coach_alunos para filtrar alunos
--
-- Substituir por duas policies específicas:
--   1. Aluno lê perfis de outros ALUNOS (para ranking/leaderboard)
--   2. Coach lê perfis dos próprios alunos (para área admin)
-- ============================================================

BEGIN;

-- 1) Garantir policy de coach via coach_alunos (idempotente)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'profiles' AND policyname = 'Coaches veem perfis dos alunos'
  ) THEN
    EXECUTE $p$
      CREATE POLICY "Coaches veem perfis dos alunos"
        ON profiles FOR SELECT
        USING (
          EXISTS (
            SELECT 1 FROM coach_alunos
            WHERE coach_alunos.coach_id = auth.uid()
              AND coach_alunos.aluno_id = profiles.id
          )
          OR EXISTS (
            SELECT 1 FROM profiles p
            WHERE p.id = auth.uid() AND p.role = 'super_admin'
          )
        )
    $p$;
  END IF;
END;
$$;

-- 2) Permitir aluno ler perfis de outros alunos (role='aluno' apenas)
--    Necessário para contextos de leaderboard e eventual busca de parceiros.
--    Não expõe perfis de coaches (que têm campos sensíveis como coach_id, valor_plano).
CREATE POLICY "alunos_leem_perfis_alunos"
  ON profiles FOR SELECT
  USING (
    role = 'aluno'
    AND EXISTS (
      SELECT 1 FROM profiles me
      WHERE me.id = auth.uid() AND me.role IN ('aluno', 'coach', 'super_admin')
    )
  );

-- 3) Remover a policy permissiva que expunha TODOS os perfis
DROP POLICY IF EXISTS "authenticated_can_read_profiles" ON profiles;

COMMIT;

-- ============================================================
-- Verificação pós-aplicação (rodar e confirmar resultados)
-- ============================================================
--
-- Políticas restantes em fichas_treino (deve ter ficha_coach_all, sem "Coach gere as fichas"):
-- SELECT policyname, cmd FROM pg_policies WHERE tablename = 'fichas_treino' ORDER BY policyname;
--
-- Políticas restantes em medidas_aluno (não deve ter as duas policies genéricas):
-- SELECT policyname, cmd FROM pg_policies WHERE tablename = 'medidas_aluno' ORDER BY policyname;
--
-- Políticas em plano_alimentar_audit (deve ter as 4 novas):
-- SELECT policyname, cmd FROM pg_policies WHERE tablename = 'plano_alimentar_audit' ORDER BY policyname;
--
-- Políticas em profiles (deve ter: profiles_select_own, Coaches veem perfis dos alunos, alunos_leem_perfis_alunos):
-- SELECT policyname, cmd FROM pg_policies WHERE tablename = 'profiles' ORDER BY policyname;

-- ============================================================
-- ROLLBACK por finding (caso quebre algo no app)
-- ============================================================
--
-- Finding A:
--   CREATE POLICY "Coach gere as fichas" ON fichas_treino FOR ALL
--     USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'coach'));
--   DROP POLICY IF EXISTS "ficha_coach_all" ON fichas_treino;
--
-- Finding B:
--   CREATE POLICY "Coaches veem todas as medidas" ON medidas_aluno FOR SELECT
--     USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid()
--       AND role = ANY (ARRAY['coach'::text, 'super_admin'::text])));
--   DROP POLICY IF EXISTS "medidas_coach_apenas_proprios_alunos" ON medidas_aluno;
--
-- Finding C:
--   DROP POLICY IF EXISTS "audit_coach_insere" ON plano_alimentar_audit;
--   DROP POLICY IF EXISTS "audit_coach_le_proprios" ON plano_alimentar_audit;
--   DROP POLICY IF EXISTS "audit_aluno_le_proprio" ON plano_alimentar_audit;
--   DROP POLICY IF EXISTS "audit_super_admin" ON plano_alimentar_audit;
--
-- Finding D:
--   CREATE POLICY "authenticated_can_read_profiles" ON profiles FOR SELECT USING (true);
--   DROP POLICY IF EXISTS "alunos_leem_perfis_alunos" ON profiles;
