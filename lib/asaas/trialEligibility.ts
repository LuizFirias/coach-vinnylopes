import "server-only";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

/**
 * Elegível ao trial de 30 dias se nunca teve cobrança confirmada.
 * Conta cancelada/expirada/"pausada" sem ter pago de verdade pode tentar de novo.
 * Quem já pagou 1x (status confirmado) não ganha outro trial.
 */
export async function isAsaasTrialEligible(userId: string): Promise<boolean> {
  const supabase = getSupabaseAdmin();
  const { count, error } = await supabase
    .from("subscription_payments")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("status", "confirmado");

  if (error) {
    console.error("[trial] falha ao checar elegibilidade:", error.message);
    // Fail-closed: sem confirmação no banco, não libera trial
    return false;
  }

  return (count ?? 0) === 0;
}
