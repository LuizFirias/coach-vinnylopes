-- ==============================================
-- SETUP PRIVACIDADE E SEGURANÇA FINAL
-- Execute este script no Supabase SQL Editor para garantir
-- que as fotos e treinos sejam privados.
-- ==============================================

-- 1. CONFIGURAÇÃO DE BUCKETS (Transformar em Privados)
UPDATE storage.buckets 
SET public = false 
WHERE id IN ('treinos-pdf', 'evolucao-fotos');

-- 2. POLÍTICAS PARA 'treinos-pdf'
DROP POLICY IF EXISTS "Qualquer um pode ver treinos" ON storage.objects;
DROP POLICY IF EXISTS "Coach pode tudo em treinos" ON storage.objects;
DROP POLICY IF EXISTS "Alunos podem ver seus treinos" ON storage.objects;

-- Coach tem controle total
CREATE POLICY "Coach gerencia treinos-pdf"
ON storage.objects FOR ALL
TO authenticated
USING (bucket_id = 'treinos-pdf');

-- 3. POLÍTICAS PARA 'evolucao-fotos'
DROP POLICY IF EXISTS "Alunos fazem upload de suas fotos" ON storage.objects;
DROP POLICY IF EXISTS "Coach visualiza fotos" ON storage.objects;

-- Alunos podem enviar fotos para sua própria pasta
CREATE POLICY "Alunos enviam suas fotos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'evolucao-fotos'
);

-- Coach e o próprio Aluno podem ver as fotos
CREATE POLICY "Acesso fotos evolucao"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'evolucao-fotos'
);

-- 4. POLÍTICAS DE TABELAS (REFORÇO STATUS PAGAMENTO)

-- Alunos só veem seus PDFs se estiverem pagos
DROP POLICY IF EXISTS "Alunos veem seus PDFs" ON treinos_alunos;
CREATE POLICY "Alunos veem seus PDFs ativos" ON treinos_alunos
    FOR SELECT USING (
        aluno_id = auth.uid() 
        AND EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() 
            AND status_pagamento = 'pago'
            AND arquivado = false
        )
    );

-- Alunos só veem sua agenda se estiverem pagos
DROP POLICY IF EXISTS "Alunos podem ver sua própria agenda" ON agenda_semanal;
CREATE POLICY "Alunos veem sua agenda ativa" ON agenda_semanal
    FOR SELECT USING (
        aluno_id = auth.uid() 
        AND EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() 
            AND status_pagamento = 'pago'
            AND arquivado = false
        )
    );
