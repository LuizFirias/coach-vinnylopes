-- CRÍTICO: historico_treinos (cargas/recordes já feitos pelo aluno) estava
-- em ON DELETE CASCADE com fichas_treino (migration 0033) — excluir (ou
-- recriar) uma ficha apagava PERMANENTEMENTE todo o histórico de execuções
-- ligado a ela. Uma vez gravado, o histórico é do aluno pra sempre — não
-- pode sumir só porque a ficha que originou foi excluída depois.
--
-- Mesmo padrão já usado em agenda_semanal e feedbacks_treinos (migration
-- 0033): SET NULL — a linha do histórico continua existindo, só perde a
-- referência pra ficha que não existe mais.

BEGIN;

ALTER TABLE historico_treinos
  DROP CONSTRAINT IF EXISTS historico_treinos_ficha_id_fkey;

ALTER TABLE historico_treinos
  ADD CONSTRAINT historico_treinos_ficha_id_fkey
  FOREIGN KEY (ficha_id) REFERENCES fichas_treino(id) ON DELETE SET NULL;

COMMIT;
