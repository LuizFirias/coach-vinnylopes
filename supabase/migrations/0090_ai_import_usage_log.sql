-- Log de uso da importação de treino por IA (texto/PDF) — só pra controlar
-- o limite de 2x/semana dos coaches no freemium (PRO/START/teste/parceiro
-- são ilimitados, ver lib/ai/importUsageLimit.ts). Um registro por uso.

CREATE TABLE IF NOT EXISTS ai_import_usage_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ai_import_usage_log_coach_created
  ON ai_import_usage_log (coach_id, created_at DESC);

ALTER TABLE ai_import_usage_log ENABLE ROW LEVEL SECURITY;

-- Só a service role (rota server-side) grava/lê — nada de acesso direto do
-- client, então nenhuma policy pra authenticated/anon (RLS fecha por padrão).
DROP POLICY IF EXISTS "service role full access" ON ai_import_usage_log;
CREATE POLICY "service role full access" ON ai_import_usage_log
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');
