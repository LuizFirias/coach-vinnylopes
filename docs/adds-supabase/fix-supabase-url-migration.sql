-- =====================================================
-- FIX: URLs do projeto Supabase antigo após migração
-- =====================================================
-- Problema: O storage foi migrado de
--   atlozefvdyssuruxnzqd.supabase.co  (projeto antigo, Oregon)
--   para
--   ulyssryxgkvdkbgvfgpz.supabase.co  (projeto novo, BR)
-- Mas as colunas que armazenam URLs completas continuaram
-- apontando para o domínio antigo, gerando ERR_NAME_NOT_RESOLVED
-- no navegador.
--
-- Este script substitui o host antigo pelo novo em todas as
-- tabelas conhecidas que guardam URLs completas.
-- Rode no SQL Editor do Supabase (projeto NOVO).
-- =====================================================

BEGIN;

-- 1) Avatares dos perfis
UPDATE profiles
SET avatar_url = REPLACE(
  avatar_url,
  'atlozefvdyssuruxnzqd.supabase.co',
  'ulyssryxgkvdkbgvfgpz.supabase.co'
)
WHERE avatar_url LIKE '%atlozefvdyssuruxnzqd%';

-- 2) Fotos de evolução
UPDATE fotos_evolucao
SET url_foto = REPLACE(
  url_foto,
  'atlozefvdyssuruxnzqd.supabase.co',
  'ulyssryxgkvdkbgvfgpz.supabase.co'
)
WHERE url_foto LIKE '%atlozefvdyssuruxnzqd%';

-- 3) PDFs de treino
UPDATE treinos_alunos
SET url_pdf = REPLACE(
  url_pdf,
  'atlozefvdyssuruxnzqd.supabase.co',
  'ulyssryxgkvdkbgvfgpz.supabase.co'
)
WHERE url_pdf LIKE '%atlozefvdyssuruxnzqd%';

-- 4) Plano alimentar (PDF)
UPDATE plano_alimentar
SET url_pdf = REPLACE(
  url_pdf,
  'atlozefvdyssuruxnzqd.supabase.co',
  'ulyssryxgkvdkbgvfgpz.supabase.co'
)
WHERE url_pdf LIKE '%atlozefvdyssuruxnzqd%';

-- 5) Parceiros: logo único
UPDATE parceiros
SET logo_url = REPLACE(
  logo_url,
  'atlozefvdyssuruxnzqd.supabase.co',
  'ulyssryxgkvdkbgvfgpz.supabase.co'
)
WHERE logo_url LIKE '%atlozefvdyssuruxnzqd%';

-- 6) Parceiros: array de imagens
UPDATE parceiros
SET imagens = ARRAY(
  SELECT REPLACE(
    img,
    'atlozefvdyssuruxnzqd.supabase.co',
    'ulyssryxgkvdkbgvfgpz.supabase.co'
  )
  FROM unnest(imagens) AS img
)
WHERE EXISTS (
  SELECT 1 FROM unnest(imagens) AS img
  WHERE img LIKE '%atlozefvdyssuruxnzqd%'
);

COMMIT;

-- =====================================================
-- VERIFICAÇÃO: confirmar que não restou nenhuma URL antiga
-- =====================================================
SELECT 'profiles.avatar_url'      AS coluna, COUNT(*) AS restantes FROM profiles        WHERE avatar_url LIKE '%atlozefvdyssuruxnzqd%'
UNION ALL
SELECT 'fotos_evolucao.url_foto', COUNT(*)            FROM fotos_evolucao  WHERE url_foto   LIKE '%atlozefvdyssuruxnzqd%'
UNION ALL
SELECT 'treinos_alunos.url_pdf',  COUNT(*)            FROM treinos_alunos  WHERE url_pdf    LIKE '%atlozefvdyssuruxnzqd%'
UNION ALL
SELECT 'plano_alimentar.url_pdf', COUNT(*)            FROM plano_alimentar WHERE url_pdf    LIKE '%atlozefvdyssuruxnzqd%'
UNION ALL
SELECT 'parceiros.logo_url',      COUNT(*)            FROM parceiros       WHERE logo_url   LIKE '%atlozefvdyssuruxnzqd%'
UNION ALL
SELECT 'parceiros.imagens',       COUNT(*)            FROM parceiros
  WHERE EXISTS (SELECT 1 FROM unnest(imagens) AS img WHERE img LIKE '%atlozefvdyssuruxnzqd%');

-- Se todos vierem com 0, está limpo.
