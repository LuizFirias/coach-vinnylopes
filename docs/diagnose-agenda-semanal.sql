-- =====================================================
-- DIAGNÓSTICO: Verificar estrutura da tabela agenda_semanal
-- Executa no SQL Editor do Supabase para ver exatamente o que existe
-- =====================================================

-- 1. Ver todas as colunas da tabela agenda_semanal
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name='agenda_semanal' 
ORDER BY ordinal_position;

-- 2. Ver se a tabela existe
SELECT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_name = 'agenda_semanal'
) AS tabela_existe;

-- 3. Ver constraints da tabela
SELECT 
    constraint_name,
    constraint_type
FROM information_schema.table_constraints
WHERE table_name = 'agenda_semanal';

-- 4. Ver se existem policies de RLS
SELECT * FROM pg_policies WHERE tablename = 'agenda_semanal';

-- 5. Contar registros (se a tabela existir)
SELECT COUNT(*) as total_registros FROM agenda_semanal LIMIT 1;
