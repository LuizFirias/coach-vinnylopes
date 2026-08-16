import "server-only";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { FREE_TIER_STUDENT_LIMIT } from "@/lib/subscriptions/plans";

/**
 * Volta o coach ao freemium (3 alunos) quando o plano pago expira/cancela.
 * Mantém subscription_active e asaas_card_token (reativação sem novo cartão).
 */
export async function restoreCoachFreeTier(userId: string): Promise<void> {
  const supabase = getSupabaseAdmin();

  const { data: profile } = await supabase
    .from("profiles")
    .select("account_type, role")
    .eq("id", userId)
    .maybeSingle();

  if (!profile || profile.role !== "coach") return;
  if (profile.account_type === "teste" || profile.account_type === "parceiro") return;

  await supabase
    .from("profiles")
    .update({
      subscription_active: true,
      student_limit: FREE_TIER_STUDENT_LIMIT,
      plan_tier: null,
      billing_period: null,
      trial_ativo: false,
      trial_fim: null,
      trial_pendente_cartao: false,
      status_pagamento: "pago",
      asaas_subscription_id: null,
      // asaas_card_token e asaas_customer_id preservados de propósito
    })
    .eq("id", userId);
}

/** Ativa trial após cartão validado com sucesso (resposta síncrona ou webhook). */
export async function confirmarCartaoTrial(
  coachId: string,
  opts: {
    trialFim: string;
    planTier: string;
    billingPeriod: string;
    studentLimit: number | null;
    asaasSubscriptionId: string;
    periodEndIso: string | null;
    creditCardToken?: string | null;
    cardLastFour?: string | null;
  },
): Promise<void> {
  const supabase = getSupabaseAdmin();
  const { setUserAccess } = await import("@/lib/access/setUserAccess");

  await setUserAccess(
    coachId,
    "authorized",
    opts.periodEndIso,
    {
      planTier: opts.planTier as import("@/lib/subscriptions/plans").PlanTier,
      billingPeriod: opts.billingPeriod as import("@/lib/subscriptions/plans").BillingPeriod,
      studentLimit: opts.studentLimit,
    },
    null,
  );

  const profileUpdate: Record<string, unknown> = {
    trial_ativo: true,
    trial_fim: opts.trialFim,
    trial_pendente_cartao: false,
    asaas_subscription_id: opts.asaasSubscriptionId,
    plan_tier: opts.planTier,
    billing_period: opts.billingPeriod,
    student_limit: opts.studentLimit,
  };

  if (opts.creditCardToken) {
    profileUpdate.asaas_card_token = opts.creditCardToken;
  }

  await supabase.from("profiles").update(profileUpdate).eq("id", coachId);
}
