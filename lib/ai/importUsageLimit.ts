import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { resolvePlanTier } from "@/lib/subscriptions/plans";

/** Coaches no freemium (sem plano pago) — limite semanal. PRO/START/teste/parceiro: ilimitado. */
const WEEKLY_LIMIT_FREEMIUM = 2;

export interface ImportQuota {
  allowed: boolean;
  /** null = ilimitado (não freemium). */
  remaining: number | null;
}

/**
 * Verifica se o coach ainda pode importar treino por IA essa semana.
 * Não consome a cota — isso é feito separadamente (logImportUsage), só
 * depois que a importação já deu certo, pra não gastar cota numa tentativa
 * que falhou.
 */
export async function checkImportQuota(
  adminClient: SupabaseClient,
  coachId: string,
): Promise<ImportQuota> {
  const { data: profile } = await adminClient
    .from("profiles")
    .select("plan_tier, account_type, role")
    .eq("id", coachId)
    .single();

  const unlimited =
    profile?.role === "super_admin" ||
    profile?.account_type === "teste" ||
    profile?.account_type === "parceiro" ||
    // Qualquer plano pago (START ou PRO) — só quem nunca assinou (freemium) tem limite.
    Boolean(resolvePlanTier(profile?.plan_tier as string | null | undefined));

  if (unlimited) {
    return { allowed: true, remaining: null };
  }

  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const { count } = await adminClient
    .from("ai_import_usage_log")
    .select("id", { count: "exact", head: true })
    .eq("coach_id", coachId)
    .gte("created_at", weekAgo);

  const usados = count ?? 0;
  const restante = WEEKLY_LIMIT_FREEMIUM - usados;
  return { allowed: restante > 0, remaining: Math.max(restante, 0) };
}

/** Registra 1 uso — chamar só depois de uma importação bem-sucedida. */
export async function logImportUsage(adminClient: SupabaseClient, coachId: string): Promise<void> {
  await adminClient.from("ai_import_usage_log").insert({ coach_id: coachId });
}
