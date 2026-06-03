-- Sprint 6: Pontuação e Ranking
-- MIGRATION-PLAN §10 — Blocos L, M, N, O + backfill
-- Dependências: v_historico_validos (Sprint 3), recordes_pessoais (Sprint 2),
--               oculto_no_ranking em profiles (Sprint 5)

-- ============================================================
-- Bloco L — Função pública recalcular_pontos_aluno
-- ============================================================

CREATE OR REPLACE FUNCTION public.recalcular_pontos_aluno(p_aluno_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_total INTEGER;
BEGIN
  IF p_aluno_id IS NULL THEN RETURN 0; END IF;

  SELECT
    -- 1. Treinos manuais concluídos (scoring pré-existente via pontos_earn)
    COALESCE((SELECT SUM(pontos_earn) FROM treinos_manuais
              WHERE aluno_id = p_aluno_id AND concluido = true), 0)
    -- 2. Treinos pela tela de execução (20 pts — só sessões válidas)
    + COALESCE((SELECT COUNT(*) * 20 FROM v_historico_validos
                WHERE aluno_id = p_aluno_id), 0)
    -- 3. Recordes pessoais (10 pts cada)
    + COALESCE((SELECT COUNT(*) * 10 FROM recordes_pessoais
                WHERE aluno_id = p_aluno_id), 0)
    -- 4. Medidas registradas (3 pts cada)
    + COALESCE((SELECT COUNT(*) * 3 FROM medidas_aluno
                WHERE aluno_id = p_aluno_id), 0)
    -- 5. Fotos de evolução (5 pts cada)
    + COALESCE((SELECT COUNT(*) * 5 FROM fotos_evolucao
                WHERE aluno_id = p_aluno_id), 0)
  INTO v_total;

  INSERT INTO pontuacao_alunos (aluno_id, total_pontos, atualizado_em)
  VALUES (p_aluno_id, v_total, NOW())
  ON CONFLICT (aluno_id) DO UPDATE SET
    total_pontos  = EXCLUDED.total_pontos,
    atualizado_em = NOW();

  RETURN v_total;
END;
$$;

GRANT EXECUTE ON FUNCTION public.recalcular_pontos_aluno(UUID) TO authenticated;

-- ============================================================
-- Bloco M — Reescrever consolidar_pontos_aluno (trigger fn)
-- Mantém interface: continua sendo chamada via trigger em treinos_manuais
-- ============================================================

CREATE OR REPLACE FUNCTION public.consolidar_pontos_aluno()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_aluno_id UUID := COALESCE(NEW.aluno_id, OLD.aluno_id);
BEGIN
  IF v_aluno_id IS NOT NULL THEN
    PERFORM recalcular_pontos_aluno(v_aluno_id);
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- ============================================================
-- Bloco N — Triggers em outras fontes de pontos
-- ============================================================

-- Treinos da tela de execução
DROP TRIGGER IF EXISTS trg_pontos_historico ON historico_treinos;
CREATE TRIGGER trg_pontos_historico
  AFTER INSERT OR UPDATE OF dados_sessao OR DELETE ON historico_treinos
  FOR EACH ROW EXECUTE FUNCTION consolidar_pontos_aluno();

-- Recordes pessoais
DROP TRIGGER IF EXISTS trg_pontos_recordes ON recordes_pessoais;
CREATE TRIGGER trg_pontos_recordes
  AFTER INSERT OR DELETE ON recordes_pessoais
  FOR EACH ROW EXECUTE FUNCTION consolidar_pontos_aluno();

-- Medidas
DROP TRIGGER IF EXISTS trg_pontos_medidas ON medidas_aluno;
CREATE TRIGGER trg_pontos_medidas
  AFTER INSERT OR DELETE ON medidas_aluno
  FOR EACH ROW EXECUTE FUNCTION consolidar_pontos_aluno();

-- Fotos de evolução
DROP TRIGGER IF EXISTS trg_pontos_fotos ON fotos_evolucao;
CREATE TRIGGER trg_pontos_fotos
  AFTER INSERT OR DELETE ON fotos_evolucao
  FOR EACH ROW EXECUTE FUNCTION consolidar_pontos_aluno();

-- ============================================================
-- Bloco O — Views de leaderboard
-- ============================================================

CREATE OR REPLACE VIEW public.v_leaderboard AS
SELECT
  p.id                               AS aluno_id,
  p.full_name,
  p.avatar_url,
  COALESCE(pa.total_pontos, 0)       AS pontos,
  COALESCE(s.streak_atual, 0)        AS streak,
  ROW_NUMBER() OVER (
    ORDER BY COALESCE(pa.total_pontos, 0) DESC
  )                                  AS posicao
FROM profiles p
LEFT JOIN pontuacao_alunos pa ON pa.aluno_id = p.id
LEFT JOIN v_streak_aluno     s  ON s.aluno_id  = p.id
WHERE p.role = 'aluno'
  AND COALESCE(p.arquivado, false) = false
  AND COALESCE(p.oculto_no_ranking, false) = false;

GRANT SELECT ON v_leaderboard TO authenticated;

-- Conta alunos com pelo menos uma sessão válida na semana
CREATE OR REPLACE VIEW public.v_atletas_ativos_semana AS
SELECT COUNT(DISTINCT aluno_id)::INTEGER AS quantidade
FROM v_historico_validos
WHERE data_conclusao >= date_trunc('week', NOW());

GRANT SELECT ON v_atletas_ativos_semana TO authenticated;

-- ============================================================
-- Backfill — recalcular pontos de todos os alunos uma vez
-- (depois disso, triggers cuidam automaticamente)
-- ============================================================

DO $$
DECLARE
  v_id UUID;
BEGIN
  FOR v_id IN SELECT id FROM profiles WHERE role = 'aluno' LOOP
    PERFORM recalcular_pontos_aluno(v_id);
  END LOOP;
END;
$$;

-- ============================================================
-- ROLLBACK (em ordem inversa)
-- DROP TRIGGER IF EXISTS trg_pontos_fotos    ON fotos_evolucao;
-- DROP TRIGGER IF EXISTS trg_pontos_medidas  ON medidas_aluno;
-- DROP TRIGGER IF EXISTS trg_pontos_recordes ON recordes_pessoais;
-- DROP TRIGGER IF EXISTS trg_pontos_historico ON historico_treinos;
-- DROP VIEW IF EXISTS public.v_leaderboard;
-- DROP VIEW IF EXISTS public.v_atletas_ativos_semana;
-- DROP FUNCTION IF EXISTS public.recalcular_pontos_aluno(UUID);
-- (restaurar consolidar_pontos_aluno original — ver MIGRATION-PLAN §10.9)
-- ============================================================
