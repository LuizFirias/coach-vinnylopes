import "server-only";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { isAccessGranted, type AuronSubscriptionStatus } from "@/lib/mercadopago/statusMapping";
import type { BillingPeriod, PlanTier } from "@/lib/subscriptions/plans";

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

  const update: Record<string, unknown> = {
    subscription_active: active,
  };

  if (planInfo && (status === "authorized" || active)) {
    if (planInfo.planTier) update.plan_tier = planInfo.planTier;
    if (planInfo.billingPeriod) update.billing_period = planInfo.billingPeriod;
    if (planInfo.studentLimit != null) update.student_limit = planInfo.studentLimit;
  }

  if (active && currentPeriodEnd) {
    update.data_expiracao = currentPeriodEnd.split("T")[0];
    update.status_pagamento =
      status === "past_due" || status === "paused" ? "atrasado" : "pago";
  } else if (status === "cancelled" || status === "expired") {
    update.status_pagamento = "atrasado";
    update.subscription_active = false;
  } else if (!active && (status === "past_due" || status === "canceling")) {
    update.status_pagamento = "atrasado";
    update.subscription_active = false;
  }

  await supabase.from("profiles").update(update).eq("id", userId);
}
