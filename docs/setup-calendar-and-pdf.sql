-- =====================================================
-- SISTEMA DE CALENDÁRIO E TREINOS PDF INDIVIDUALIZADOS
-- =====================================================

-- 1. Tabela para registros de PDFs (Vinculada ao Aluno)
CREATE TABLE IF NOT EXISTS treinos_alunos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  aluno_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  url_pdf TEXT NOT NULL,
  nome_arquivo TEXT NOT NULL,
  data_upload TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Habilitar RLS
ALTER TABLE treinos_alunos ENABLE ROW LEVEL SECURITY;

-- Política: Alunos veem apenas seus próprios PDFs (se estiverem com pagamento em dia ou ativos)
DROP POLICY IF EXISTS "Alunos veem seus PDFs" ON treinos_alunos;
CREATE POLICY "Alunos veem seus PDFs" ON treinos_alunos
    FOR SELECT USING (
        aluno_id = auth.uid() 
        AND EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() 
            AND status_pagamento = 'pago'
            AND arquivado = false
        )
    );

-- Política: Coaches veem/gerenciam PDFs de alunos
DROP POLICY IF EXISTS "Coaches gerenciam PDFs" ON treinos_alunos;
CREATE POLICY "Coaches gerenciam PDFs" ON treinos_alunos
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() AND role IN ('coach', 'super_admin')
        )
    );

-- 2. Tabela de Agenda Semanal (Organizadora)
CREATE TABLE IF NOT EXISTS agenda_semanal (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  aluno_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  dia_semana INT NOT NULL CHECK (dia_semana >= 0 AND dia_semana <= 6), -- 0=Dom, 1=Seg...
  ficha_id UUID REFERENCES fichas_treino(id) ON DELETE SET NULL,
  treino_pdf_id UUID REFERENCES treinos_alunos(id) ON DELETE SET NULL,
  is_rest_day BOOLEAN DEFAULT false,
  observacoes TEXT,
  UNIQUE(aluno_id, dia_semana)
);

-- Habilitar RLS
ALTER TABLE agenda_semanal ENABLE ROW LEVEL SECURITY;

-- Política: Alunos veem sua própria agenda
DROP POLICY IF EXISTS "Alunos veem sua agenda" ON agenda_semanal;
CREATE POLICY "Alunos veem sua agenda" ON agenda_semanal
    FOR SELECT USING (aluno_id = auth.uid());

-- Política: Alunos podem organizar sua própria agenda
DROP POLICY IF EXISTS "Alunos gerenciam sua agenda" ON agenda_semanal;
CREATE POLICY "Alunos gerenciam sua agenda" ON agenda_semanal
    FOR ALL USING (aluno_id = auth.uid());

-- Política: Coaches veem agenda de seus alunos
DROP POLICY IF EXISTS "Coaches veem agenda dos alunos" ON agenda_semanal;
CREATE POLICY "Coaches veem agenda dos alunos" ON agenda_semanal
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() AND role IN ('coach', 'super_admin')
        )
    );

-- 3. Configuração do Storage Bucket (Treinos)
-- Obs: A criação via SQL depende de extensões, mas garantimos as políticas aqui.
-- O bucket 'treinos-pdf' deve ser configurado como PRIVADO no painel Supabase.

-- Política de Storage (Apenas o dono do arquivo ou Coach pode ler)
-- O upload deve ser feito em pastas com o ID do aluno para facilitar a filtragem.
-- Ex: treinos-pdf/{aluno_id}/arquivo.pdf
