-- =====================================================
-- MIGRAÇÃO DE DADOS: DE 'medidas' PARA 'medidas_aluno'
-- Execute este script no SQL Editor do Supabase
-- =====================================================

INSERT INTO public.medidas_aluno (
    aluno_id,
    data_medicao,
    peso,
    pescoco,
    ombros,         -- Mapeado de 'ombro'
    peitoral,       -- Mapeado de 'torax'
    cintura,
    abdomen,        -- Mapeado de 'abdome'
    quadril,
    braco_direito,      -- Mapeado de 'braco_dir'
    braco_esquerdo,     -- Mapeado de 'braco_esq'
    antebraco_direito,  -- Mapeado de 'antebraco_dir'
    antebraco_esquerdo, -- Mapeado de 'antebraco_esq'
    coxa_direita,       -- Mapeado de 'coxa_dir'
    coxa_esquerda,      -- Mapeado de 'coxa_esq'
    panturrilha_direita, -- Mapeado de 'panturrilha_dir'
    panturrilha_esquerda -- Mapeado de 'panturrilha_esq'
)
SELECT 
    aluno_id,
    COALESCE(data, NOW()), -- 'data' para 'data_medicao'
    peso,
    pescoco,
    ombro,         -- 'ombro' para 'ombros'
    torax,         -- 'torax' para 'peitoral'
    cintura,
    abdome,        -- 'abdome' para 'abdomen'
    quadril,
    braco_dir,     -- 'braco_dir' para 'braco_direito'
    braco_esq,     -- 'braco_esq' para 'braco_esquerdo'
    antebraco_dir, -- 'antebraco_dir' para 'antebraco_direito'
    antebraco_esq, -- 'antebraco_esq' para 'antebraco_esquerdo'
    coxa_dir,      -- 'coxa_dir' para 'coxa_direita'
    coxa_esq,      -- 'coxa_esq' para 'coxa_esquerda'
    panturrilha_dir, -- 'panturrilha_dir' para 'panturrilha_direita'
    panturrilha_esq  -- 'panturrilha_esq' para 'panturrilha_esquerda'
FROM public.medidas
ON CONFLICT DO NOTHING;

-- Opcional: Remover tabela antiga após confirmar a migração
-- DROP TABLE IF EXISTS public.medidas;
