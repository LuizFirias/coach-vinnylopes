-- Verificar EXATAMENTE quais colunas existem em agenda_semanal
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_name='agenda_semanal' 
ORDER BY ordinal_position;
