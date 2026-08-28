-- Corrige FKs que impedem exclusão de fichas_treino e treinos_alunos (PDF).
-- agenda_semanal: desvincula o dia da semana (SET NULL)
-- historico_treinos: remove execuções da ficha excluída (CASCADE)
-- feedbacks_treinos: preserva feedback, remove referência (SET NULL)

BEGIN;

ALTER TABLE agenda_semanal
  DROP CONSTRAINT IF EXISTS agenda_semanal_ficha_id_fkey;

ALTER TABLE agenda_semanal
  ADD CONSTRAINT agenda_semanal_ficha_id_fkey
  FOREIGN KEY (ficha_id) REFERENCES fichas_treino(id) ON DELETE SET NULL;

ALTER TABLE agenda_semanal
  DROP CONSTRAINT IF EXISTS agenda_semanal_treino_pdf_id_fkey;

ALTER TABLE agenda_semanal
  ADD CONSTRAINT agenda_semanal_treino_pdf_id_fkey
  FOREIGN KEY (treino_pdf_id) REFERENCES treinos_alunos(id) ON DELETE SET NULL;

ALTER TABLE historico_treinos
  DROP CONSTRAINT IF EXISTS historico_treinos_ficha_id_fkey;

ALTER TABLE historico_treinos
  ADD CONSTRAINT historico_treinos_ficha_id_fkey
  FOREIGN KEY (ficha_id) REFERENCES fichas_treino(id) ON DELETE CASCADE;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'feedbacks_treinos'
  ) THEN
    ALTER TABLE feedbacks_treinos
      DROP CONSTRAINT IF EXISTS feedbacks_treinos_ficha_id_fkey;

    ALTER TABLE feedbacks_treinos
      ADD CONSTRAINT feedbacks_treinos_ficha_id_fkey
      FOREIGN KEY (ficha_id) REFERENCES fichas_treino(id) ON DELETE SET NULL;
  END IF;
END $$;

COMMIT;
