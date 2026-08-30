-- Stub da função coach_has_write_access() usada por policies do AURON
-- (ex.: 0034_create_cardio_tables.sql) que checavam assinatura ativa do
-- coach antes de liberar escrita. Coach Vinny não tem plano/assinatura
-- (treinador único) — a versão original dependia de colunas
-- (subscription_active, account_type) que não existem neste banco.
--
-- Equivalente ao hasActiveAccess()/assertCoachWriteAccess() neutralizados
-- do lado da aplicação: sempre libera.
--
-- Aplicada manualmente antes da 0034 durante o merge do AURON (sem essa
-- função, a policy de cardio_prescricoes_coach_insert falha ao ser criada).

CREATE OR REPLACE FUNCTION public.coach_has_write_access()
RETURNS boolean
LANGUAGE sql
STABLE
AS $$
  SELECT true;
$$;
