-- =====================================================
-- ADICIONAR CAMPOS DE GERENCIAMENTO DE PLANOS
-- Execute este script no SQL Editor do Supabase
-- =====================================================

-- Adicionar coluna tipo_plano (mensal, trimestral, semestral)
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS tipo_plano VARCHAR(20) DEFAULT 'mensal';

-- Adicionar coluna data_inicio (quando o plano começou)
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS data_inicio TIMESTAMP DEFAULT NOW();

-- Adicionar coluna data_expiracao se não existir (quando o plano expira)
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS data_expiracao TIMESTAMP;

-- Adicionar coluna valor_plano para permitir descontos por aluno
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS valor_plano NUMERIC(10,2);

-- Criar índice para consultas por data de expiração
CREATE INDEX IF NOT EXISTS idx_profiles_data_expiracao ON profiles(data_expiracao);

-- Comentário explicativo
COMMENT ON COLUMN profiles.tipo_plano IS 'Tipo de plano contratado: mensal, trimestral ou semestral';
COMMENT ON COLUMN profiles.data_inicio IS 'Data em que o plano atual foi iniciado';
COMMENT ON COLUMN profiles.data_expiracao IS 'Data em que o plano expira (calculada automaticamente)';
COMMENT ON COLUMN profiles.valor_plano IS 'Valor do plano definido pelo coach para o aluno';

