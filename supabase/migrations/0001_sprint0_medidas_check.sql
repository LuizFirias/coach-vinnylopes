-- ═════════════════════════════════════════════════════════════════════════════════
-- Sprint 0 — Validação de Medidas (Blocos A.1, A.2, A.3)
-- ═════════════════════════════════════════════════════════════════════════════════
--
-- PROPÓSITO:
--   1. A.1 — Identificar medidas absurdas (read-only)
--   2. A.2 — Limpar campos absurdos (set NULL)
--   3. A.3 — Adicionar CHECK constraints para evitar inserções inválidas no futuro
--
-- ORDEM DE EXECUÇÃO:
--   1. Rodar A.1 em produção (read-only, sem mudança)
--   2. Rodar A.1 + A.2 + A.3 na branch
--   3. Testar app local com valores inválidos (deve falhar)
--   4. Rodar tudo em produção (após validação)
--
-- ROLLBACK:
--   Ver seção "-- ROLLBACK" ao final do arquivo
--
-- ═════════════════════════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────────────────────────────────────────
-- A.1 — Identificar dados absurdos (READ-ONLY — não muda nada)
-- ─────────────────────────────────────────────────────────────────────────────────
-- Execute esta query primeiro para validar o problema:

-- SELECT id, aluno_id, data_medicao,
--   peso, altura, gordura_corporal,
--   pescoco, ombros, peitoral,
--   braco_direito, braco_esquerdo,
--   antebraco_direito, antebraco_esquerdo,
--   cintura, abdomen, quadril,
--   coxa_direita, coxa_esquerda,
--   panturrilha_direita, panturrilha_esquerda
-- FROM medidas_aluno
-- WHERE
--   (peso IS NOT NULL AND (peso < 30 OR peso > 300))
--   OR (altura IS NOT NULL AND (altura < 100 OR altura > 250))
--   OR (gordura_corporal IS NOT NULL AND (gordura_corporal < 3 OR gordura_corporal > 60))
--   OR (pescoco IS NOT NULL AND (pescoco < 25 OR pescoco > 60))
--   OR (ombros IS NOT NULL AND (ombros < 60 OR ombros > 200))
--   OR (peitoral IS NOT NULL AND (peitoral < 40 OR peitoral > 200))
--   OR (braco_direito IS NOT NULL AND (braco_direito < 15 OR braco_direito > 80))
--   OR (braco_esquerdo IS NOT NULL AND (braco_esquerdo < 15 OR braco_esquerdo > 80))
--   OR (antebraco_direito IS NOT NULL AND (antebraco_direito < 15 OR antebraco_direito > 60))
--   OR (antebraco_esquerdo IS NOT NULL AND (antebraco_esquerdo < 15 OR antebraco_esquerdo > 60))
--   OR (cintura IS NOT NULL AND (cintura < 40 OR cintura > 200))
--   OR (abdomen IS NOT NULL AND (abdomen < 40 OR abdomen > 200))
--   OR (quadril IS NOT NULL AND (quadril < 40 OR quadril > 200))
--   OR (coxa_direita IS NOT NULL AND (coxa_direita < 25 OR coxa_direita > 100))
--   OR (coxa_esquerda IS NOT NULL AND (coxa_esquerda < 25 OR coxa_esquerda > 100))
--   OR (panturrilha_direita IS NOT NULL AND (panturrilha_direita < 20 OR panturrilha_direita > 70))
--   OR (panturrilha_esquerda IS NOT NULL AND (panturrilha_esquerda < 20 OR panturrilha_esquerda > 70));

-- ─────────────────────────────────────────────────────────────────────────────────
-- A.2 — Limpar campos absurdos (set NULL, mantém o registro)
-- ─────────────────────────────────────────────────────────────────────────────────

BEGIN;

UPDATE medidas_aluno SET peso = NULL                  WHERE peso IS NOT NULL                  AND (peso < 30 OR peso > 300);
UPDATE medidas_aluno SET altura = NULL                WHERE altura IS NOT NULL                AND (altura < 100 OR altura > 250);
UPDATE medidas_aluno SET gordura_corporal = NULL      WHERE gordura_corporal IS NOT NULL      AND (gordura_corporal < 3 OR gordura_corporal > 60);
UPDATE medidas_aluno SET massa_magra = NULL           WHERE massa_magra IS NOT NULL           AND (massa_magra < 20 OR massa_magra > 200);
UPDATE medidas_aluno SET pescoco = NULL               WHERE pescoco IS NOT NULL               AND (pescoco < 25 OR pescoco > 60);
UPDATE medidas_aluno SET ombros = NULL                WHERE ombros IS NOT NULL                AND (ombros < 60 OR ombros > 200);
UPDATE medidas_aluno SET peitoral = NULL              WHERE peitoral IS NOT NULL              AND (peitoral < 40 OR peitoral > 200);
UPDATE medidas_aluno SET braco_direito = NULL         WHERE braco_direito IS NOT NULL         AND (braco_direito < 15 OR braco_direito > 80);
UPDATE medidas_aluno SET braco_esquerdo = NULL        WHERE braco_esquerdo IS NOT NULL        AND (braco_esquerdo < 15 OR braco_esquerdo > 80);
UPDATE medidas_aluno SET antebraco_direito = NULL     WHERE antebraco_direito IS NOT NULL     AND (antebraco_direito < 15 OR antebraco_direito > 60);
UPDATE medidas_aluno SET antebraco_esquerdo = NULL    WHERE antebraco_esquerdo IS NOT NULL    AND (antebraco_esquerdo < 15 OR antebraco_esquerdo > 60);
UPDATE medidas_aluno SET cintura = NULL               WHERE cintura IS NOT NULL               AND (cintura < 40 OR cintura > 200);
UPDATE medidas_aluno SET abdomen = NULL               WHERE abdomen IS NOT NULL               AND (abdomen < 40 OR abdomen > 200);
UPDATE medidas_aluno SET quadril = NULL               WHERE quadril IS NOT NULL               AND (quadril < 40 OR quadril > 200);
UPDATE medidas_aluno SET coxa_direita = NULL          WHERE coxa_direita IS NOT NULL          AND (coxa_direita < 25 OR coxa_direita > 100);
UPDATE medidas_aluno SET coxa_esquerda = NULL         WHERE coxa_esquerda IS NOT NULL         AND (coxa_esquerda < 25 OR coxa_esquerda > 100);
UPDATE medidas_aluno SET panturrilha_direita = NULL   WHERE panturrilha_direita IS NOT NULL   AND (panturrilha_direita < 20 OR panturrilha_direita > 70);
UPDATE medidas_aluno SET panturrilha_esquerda = NULL  WHERE panturrilha_esquerda IS NOT NULL  AND (panturrilha_esquerda < 20 OR panturrilha_esquerda > 70);

COMMIT;

-- ─────────────────────────────────────────────────────────────────────────────────
-- A.3 — Adicionar CHECK constraints (NOT VALID)
-- ─────────────────────────────────────────────────────────────────────────────────
-- Constraints NOT VALID: só valem para INSERTs/UPDATEs novos, não validam dados antigos.
-- Isso garante que valores absurdos não entrarem no futuro, mas não quebra o app agora.

BEGIN;

ALTER TABLE medidas_aluno
  ADD CONSTRAINT chk_med_peso              CHECK (peso IS NULL OR peso BETWEEN 30 AND 300) NOT VALID,
  ADD CONSTRAINT chk_med_altura            CHECK (altura IS NULL OR altura BETWEEN 100 AND 250) NOT VALID,
  ADD CONSTRAINT chk_med_gordura           CHECK (gordura_corporal IS NULL OR gordura_corporal BETWEEN 3 AND 60) NOT VALID,
  ADD CONSTRAINT chk_med_massa_magra       CHECK (massa_magra IS NULL OR massa_magra BETWEEN 20 AND 200) NOT VALID,
  ADD CONSTRAINT chk_med_pescoco           CHECK (pescoco IS NULL OR pescoco BETWEEN 25 AND 60) NOT VALID,
  ADD CONSTRAINT chk_med_ombros            CHECK (ombros IS NULL OR ombros BETWEEN 60 AND 200) NOT VALID,
  ADD CONSTRAINT chk_med_peitoral          CHECK (peitoral IS NULL OR peitoral BETWEEN 40 AND 200) NOT VALID,
  ADD CONSTRAINT chk_med_braco_dir         CHECK (braco_direito IS NULL OR braco_direito BETWEEN 15 AND 80) NOT VALID,
  ADD CONSTRAINT chk_med_braco_esq         CHECK (braco_esquerdo IS NULL OR braco_esquerdo BETWEEN 15 AND 80) NOT VALID,
  ADD CONSTRAINT chk_med_antebraco_dir     CHECK (antebraco_direito IS NULL OR antebraco_direito BETWEEN 15 AND 60) NOT VALID,
  ADD CONSTRAINT chk_med_antebraco_esq     CHECK (antebraco_esquerdo IS NULL OR antebraco_esquerdo BETWEEN 15 AND 60) NOT VALID,
  ADD CONSTRAINT chk_med_cintura           CHECK (cintura IS NULL OR cintura BETWEEN 40 AND 200) NOT VALID,
  ADD CONSTRAINT chk_med_abdomen           CHECK (abdomen IS NULL OR abdomen BETWEEN 40 AND 200) NOT VALID,
  ADD CONSTRAINT chk_med_quadril           CHECK (quadril IS NULL OR quadril BETWEEN 40 AND 200) NOT VALID,
  ADD CONSTRAINT chk_med_coxa_dir          CHECK (coxa_direita IS NULL OR coxa_direita BETWEEN 25 AND 100) NOT VALID,
  ADD CONSTRAINT chk_med_coxa_esq          CHECK (coxa_esquerda IS NULL OR coxa_esquerda BETWEEN 25 AND 100) NOT VALID,
  ADD CONSTRAINT chk_med_pant_dir          CHECK (panturrilha_direita IS NULL OR panturrilha_direita BETWEEN 20 AND 70) NOT VALID,
  ADD CONSTRAINT chk_med_pant_esq          CHECK (panturrilha_esquerda IS NULL OR panturrilha_esquerda BETWEEN 20 AND 70) NOT VALID;

COMMIT;

-- ═════════════════════════════════════════════════════════════════════════════════
-- ROLLBACK (caso algo der errado)
-- ═════════════════════════════════════════════════════════════════════════════════

-- ALTER TABLE medidas_aluno
--   DROP CONSTRAINT IF EXISTS chk_med_peso,
--   DROP CONSTRAINT IF EXISTS chk_med_altura,
--   DROP CONSTRAINT IF EXISTS chk_med_gordura,
--   DROP CONSTRAINT IF EXISTS chk_med_massa_magra,
--   DROP CONSTRAINT IF EXISTS chk_med_pescoco,
--   DROP CONSTRAINT IF EXISTS chk_med_ombros,
--   DROP CONSTRAINT IF EXISTS chk_med_peitoral,
--   DROP CONSTRAINT IF EXISTS chk_med_braco_dir,
--   DROP CONSTRAINT IF EXISTS chk_med_braco_esq,
--   DROP CONSTRAINT IF EXISTS chk_med_antebraco_dir,
--   DROP CONSTRAINT IF EXISTS chk_med_antebraco_esq,
--   DROP CONSTRAINT IF EXISTS chk_med_cintura,
--   DROP CONSTRAINT IF EXISTS chk_med_abdomen,
--   DROP CONSTRAINT IF EXISTS chk_med_quadril,
--   DROP CONSTRAINT IF EXISTS chk_med_coxa_dir,
--   DROP CONSTRAINT IF EXISTS chk_med_coxa_esq,
--   DROP CONSTRAINT IF EXISTS chk_med_pant_dir,
--   DROP CONSTRAINT IF EXISTS chk_med_pant_esq;
