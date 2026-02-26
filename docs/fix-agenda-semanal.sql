-- =====================================================
-- CORREÇÃO: Garantir que a tabela agenda_semanal tem todas as colunas necessárias
-- Executa no SQL Editor do Supabase para corrigir a schema cache
-- =====================================================

-- 1. Recriar a tabela do zero se necessário (esta é a versão correta)
-- DROP TABLE IF EXISTS agenda_semanal CASCADE;

CREATE TABLE IF NOT EXISTS agenda_semanal (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  aluno_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  dia_semana INT NOT NULL CHECK (dia_semana >= 0 AND dia_semana <= 6),
  ficha_id UUID REFERENCES fichas_treino(id) ON DELETE SET NULL,
  treino_pdf_id UUID REFERENCES treinos_alunos(id) ON DELETE SET NULL,
  is_rest_day BOOLEAN DEFAULT false,
  observacoes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(aluno_id, dia_semana)
);

-- 2. Garantir que todas as colunas existem
DO $$ 
BEGIN 
    -- ficha_id
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='agenda_semanal' AND column_name='ficha_id') THEN
        ALTER TABLE agenda_semanal ADD COLUMN ficha_id UUID REFERENCES fichas_treino(id) ON DELETE SET NULL;
    END IF;

    -- treino_pdf_id
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='agenda_semanal' AND column_name='treino_pdf_id') THEN
        ALTER TABLE agenda_semanal ADD COLUMN treino_pdf_id UUID REFERENCES treinos_alunos(id) ON DELETE SET NULL;
    END IF;

    -- is_rest_day
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='agenda_semanal' AND column_name='is_rest_day') THEN
        ALTER TABLE agenda_semanal ADD COLUMN is_rest_day BOOLEAN DEFAULT false;
    END IF;

    -- observacoes
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='agenda_semanal' AND column_name='observacoes') THEN
        ALTER TABLE agenda_semanal ADD COLUMN observacoes TEXT;
    END IF;

    -- timestamps
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='agenda_semanal' AND column_name='created_at') THEN
        ALTER TABLE agenda_semanal ADD COLUMN created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='agenda_semanal' AND column_name='updated_at') THEN
        ALTER TABLE agenda_semanal ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
    END IF;
END $$;

-- 3. Habilitar RLS se ainda não estiver habilitado
ALTER TABLE agenda_semanal ENABLE ROW LEVEL SECURITY;

-- 4. Recriar políticas de acesso
DROP POLICY IF EXISTS "Alunos veem sua agenda ativa" ON agenda_semanal;
CREATE POLICY "Alunos veem sua agenda ativa" ON agenda_semanal
    FOR SELECT USING (aluno_id = auth.uid());

DROP POLICY IF EXISTS "Alunos gerenciam sua agenda" ON agenda_semanal;
CREATE POLICY "Alunos gerenciam sua agenda" ON agenda_semanal
    FOR ALL USING (aluno_id = auth.uid());

DROP POLICY IF EXISTS "Coaches veem agenda dos alunos" ON agenda_semanal;
CREATE POLICY "Coaches veem agenda dos alunos" ON agenda_semanal
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() AND role IN ('coach', 'super_admin')
        )
    );

-- 5. Comentário final
-- Execute este script no SQL Editor do Supabase
-- https://app.supabase.com/project/[seu-projeto]/sql/migrations
-- Isso garante que todas as colunas necessárias existem na tabela
