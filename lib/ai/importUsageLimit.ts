import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";

export interface ImportQuota {
  allowed: boolean;
  /** null = ilimitado. */
  remaining: number | null;
}

/**
 * Coach Vinny não tem planos/tiers nem limite semanal de importação por IA
 * (isso era do freemium do AURON — a tabela ai_import_usage_log e as
 * colunas plan_tier/account_type nem existem neste banco). Sempre libera.
 */
export async function checkImportQuota(
  _adminClient: SupabaseClient,
  _coachId: string,
): Promise<ImportQuota> {
  return { allowed: true, remaining: null };
}

/** No-op — sem cota pra registrar. */
export async function logImportUsage(_adminClient: SupabaseClient, _coachId: string): Promise<void> {
  return;
}
