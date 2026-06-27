-- =====================================================
-- CORREÇÃO: Adicionar coluna treino_pdf_id faltante
-- Execute no SQL Editor do Supabase
-- =====================================================

-- 1. Adicionar a coluna treino_pdf_id que está faltando
ALTER TABLE agenda_semanal 
ADD COLUMN treino_pdf_id UUID REFERENCES treinos_alunos(id) ON DELETE SET NULL;

-- 2. Adicionar coluna created_at se não existir
ALTER TABLE agenda_semanal 
ADD COLUMN created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- 3. Adicionar coluna observacoes se não existir
ALTER TABLE agenda_semanal 
ADD COLUMN observacoes TEXT;

-- 4. Verificar que tudo funcionou
SELECT column_name, data_type FROM information_schema.columns 
WHERE table_name='agenda_semanal' 
ORDER BY ordinal_position;
