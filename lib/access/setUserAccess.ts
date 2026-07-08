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

  planInfo?: PlanAccessInfo | null

): Promise<void> {

  const active = isAccessGranted(status, currentPeriodEnd);

  const supabase = getSupabaseAdmin();

  const { data: profile } = await supabase
    .from("profiles")
    .select("account_type")
    .eq("id", userId)
    .maybeSingle();

  if (profile?.account_type === "teste" || profile?.account_type === "parceiro") {
    return;
  }

  const update: Record<string, unknown> = { subscription_active: active };



  if (planInfo) {

    if (active) {

      update.plan_tier = planInfo.planTier;

      update.billing_period = planInfo.billingPeriod;

      update.student_limit = planInfo.studentLimit;

    }

  }



  if (active && currentPeriodEnd) {

    update.data_expiracao = currentPeriodEnd.split("T")[0];

    update.status_pagamento = "pago";

  } else if (!active && (status === "cancelled" || status === "past_due")) {

    update.status_pagamento = "atrasado";

  }



  await supabase.from("profiles").update(update).eq("id", userId);

}

