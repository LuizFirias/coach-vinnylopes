-- Expande prevent_privileged_self_update: bloqueia também account_type e billing_period.
-- account_type = 'teste'|'parceiro' bypassa coach_has_write_access() — porta crítica.
-- status_pagamento / data_expiracao ficam de fora por ora (legado pagamento manual).
-- CREATE OR REPLACE é idempotente; o trigger trg_prevent_privileged_self_update
-- já referencia o nome da função e não precisa ser recriado.

CREATE OR REPLACE FUNCTION public.prevent_privileged_self_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
BEGIN
  IF (NEW.role IS DISTINCT FROM OLD.role
      OR NEW.subscription_active IS DISTINCT FROM OLD.subscription_active
      OR NEW.plan_tier IS DISTINCT FROM OLD.plan_tier
      OR NEW.student_limit IS DISTINCT FROM OLD.student_limit
      OR NEW.account_type IS DISTINCT FROM OLD.account_type
      OR NEW.billing_period IS DISTINCT FROM OLD.billing_period)
     AND auth.role() != 'service_role' THEN
    RAISE EXCEPTION 'Não é permitido alterar estes campos diretamente';
  END IF;
  RETURN NEW;
END;
$function$;

COMMENT ON FUNCTION public.prevent_privileged_self_update() IS
  'Bloqueia UPDATE client-side de colunas privilegiadas em profiles (role, assinatura, account_type, billing). Só service_role.';
