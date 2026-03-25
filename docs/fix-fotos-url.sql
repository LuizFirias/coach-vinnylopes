-- =====================================================
-- FIX: Corrigir URLs das fotos_evolucao
-- =====================================================
-- Problema: As fotos foram salvas com URL completa do Supabase
-- Solução: Extrair apenas o fileName (path relativo)
-- =====================================================

-- Atualizar todas as fotos que contém URL completa
-- Extrair apenas o nome do arquivo depois de '/evolucao-fotos/'

UPDATE fotos_evolucao
SET url_foto = SUBSTRING(
  url_foto 
  FROM POSITION('/evolucao-fotos/' IN url_foto) + LENGTH('/evolucao-fotos/')
)
WHERE url_foto LIKE '%/evolucao-fotos/%';

-- Verificar o resultado
SELECT 
  id,
  aluno_id,
  posicao,
  url_foto,
  data_upload
FROM fotos_evolucao
ORDER BY data_upload DESC
LIMIT 10;

-- Se houver fotos com URL pública que não contém '/evolucao-fotos/' no path,
-- tentar extrair após o último '/'
UPDATE fotos_evolucao
SET url_foto = SUBSTRING(
  url_foto 
  FROM POSITION('evolucao-fotos/' IN url_foto) + LENGTH('evolucao-fotos/')
)
WHERE url_foto LIKE '%evolucao-fotos/%'
AND url_foto NOT LIKE '%/%_%_%.%'; -- não atualizar se já é apenas nome de arquivo
