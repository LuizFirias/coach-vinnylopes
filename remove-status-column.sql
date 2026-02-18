-- Remove coluna redundante 'status' da tabela profiles
-- O sistema usa 'status_pagamento' (pago/pendente/atrasado) como coluna principal
-- Criado para resolver inconsistência onde ambas colunas existiam

ALTER TABLE profiles DROP COLUMN IF EXISTS status;

-- Verificar que status_pagamento existe e tem valores corretos
-- Se necessário, atualizar valores inconsistentes
UPDATE profiles 
SET status_pagamento = 'pago' 
WHERE status_pagamento IS NULL 
  AND data_expiracao IS NOT NULL 
  AND data_expiracao > NOW();

UPDATE profiles 
SET status_pagamento = 'pendente' 
WHERE status_pagamento IS NULL;
