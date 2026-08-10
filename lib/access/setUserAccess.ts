import "server-only";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { isAccessGranted, type AuronSubscriptionStatus } from "@/lib/mercadopago/statusMapping";
import type { BillingPeriod, PlanTier } from "@/lib/subscriptions/plans";
import { restoreCoachFreeTier } from "@/lib/asaas/trialAccess";

export interface PlanAccessInfo {
  planTier: PlanTier | null;
  billingPeriod: BillingPeriod | null;
  studentLimit: number | null;
}

export async function setUserAccess(
  userId: string,
  status: AuronSubscriptionStatus,
  currentPeriodEnd: string | null,
  planInfo?: PlanAccessInfo | null,
  gracePeriodEnd?: string | null,
): Promise<void> {
  const active = isAccessGranted(status, currentPeriodEnd, gracePeriodEnd);
  const supabase = getSupabaseAdmin();

  const { data: profile } = await supabase
    .from("profiles")
    .select("account_type")
    .eq("id", userId)
    .maybeSingle();

  if (profile?.account_type === "teste" || profile?.account_type === "parceiro") {
    return;
  }

  const update: Record<string, unknown> = {};

  // canceling: acesso permanece até current_period_end — NÃO forçar false aqui.
  // O cron (expire-subscriptions) é quem seta expired + freemium.
  if (status === "canceling") {
    update.subscription_active = active;
    if (active && currentPeriodEnd) {
      update.data_expiracao = currentPeriodEnd.split("T")[0];
      update.status_pagamento = "pago";
    } else {
      await restoreCoachFreeTier(userId);
      return;
    }
    if (planInfo && active) {
      if (planInfo.planTier) update.plan_tier = planInfo.planTier;
      if (planInfo.billingPeriod) update.billing_period = planInfo.billingPeriod;
      if (planInfo.studentLimit != null) update.student_limit = planInfo.studentLimit;
    }
    await supabase.from("profiles").update(update).eq("id", userId);
    return;
  }

  // Plano pago encerrado → freemium (3 alunos), não bloqueio total
  if (status === "cancelled" || status === "expired") {
    await restoreCoachFreeTier(userId);
    return;
  }

  update.subscription_active = active;

  if (planInfo && (status === "authorized" || active)) {
    if (planInfo.planTier) update.plan_tier = planInfo.planTier;
    if (planInfo.billingPeriod) update.billing_period = planInfo.billingPeriod;
    if (planInfo.studentLimit != null) update.student_limit = planInfo.studentLimit;
  }

  if (active && currentPeriodEnd) {
    update.data_expiracao = currentPeriodEnd.split("T")[0];
    update.status_pagamento =
      status === "past_due" || status === "paused" ? "atrasado" : "pago";
  } else if (!active && status === "past_due") {
    // Grace acabou sem regularizar → freemium
    await restoreCoachFreeTier(userId);
    return;
  }

  await supabase.from("profiles").update(update).eq("id", userId);
}
