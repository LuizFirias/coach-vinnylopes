-- SCRIPT DE CORREÇÃO PARA TABELA DE FICHAS DE TREINO
-- Execute este script no SQL Editor do seu Supabase para corrigir a inconsistência de colunas
-- ERRO ORIGINAL: null value in column "nome_treino" violates not-null constraint

-- 1. RENOMEAR nome_treino para nome_rotina (solução primary)
-- Se a tabela fichas_treino já possui nome_treino mas o código espera nome_rotina
DO $$ 
BEGIN 
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='fichas_treino' AND column_name='nome_treino') 
    AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='fichas_treino' AND column_name='nome_rotina') THEN
        ALTER TABLE fichas_treino RENAME COLUMN nome_treino TO nome_rotina;
    END IF;
END $$;

-- 2. Se nome_rotina não existir, criar a coluna
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='fichas_treino' AND column_name='nome_rotina') THEN
        ALTER TABLE fichas_treino ADD COLUMN nome_rotina VARCHAR(255) NOT NULL DEFAULT 'Nova Ficha';
    END IF;
END $$;

-- 3. Garantir que a tabela fichas_treino tenha a coluna configuracao (JSONB)
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='fichas_treino' AND column_name='configuracao') THEN
        ALTER TABLE fichas_treino ADD COLUMN configuracao JSONB NOT NULL DEFAULT '{"exercicios": []}'::jsonb;
    END IF;
END $$;

-- 4. Garantir que a tabela fichas_treino tenha a coluna ativo
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='fichas_treino' AND column_name='ativo') THEN
        ALTER TABLE fichas_treino ADD COLUMN ativo BOOLEAN DEFAULT true;
    END IF;
END $$;

-- 5. Garantir que a coluna de data seja criado_em (conforme migrações)
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='fichas_treino' AND column_name='criado_em') THEN
        ALTER TABLE fichas_treino ADD COLUMN criado_em TIMESTAMP WITH TIME ZONE DEFAULT NOW();
    END IF;
END $$;

-- 6. Remover coluna antigas se existirem (opcional, para limpeza)
-- ALTER TABLE fichas_treino DROP COLUMN IF EXISTS nome_treino CASCADE;
-- ALTER TABLE fichas_treino DROP COLUMN IF EXISTS created_at CASCADE;

-- 7. Verificação final - Mostrar a estrutura atual da tabela
-- Descomente a linha abaixo para ver as colunas atuais:
-- SELECT column_name, data_type, is_nullable FROM information_schema.columns WHERE table_name='fichas_treino' ORDER BY ordinal_position;
