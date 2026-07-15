import "server-only";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { mpFetch } from "@/lib/mercadopago/client";
import {
  calcGracePeriodEnd,
  mapMpPreapprovalStatus,
} from "@/lib/mercadopago/statusMapping";
import { setUserAccess } from "@/lib/access/setUserAccess";
import { getPlanOption, getPlanLabel } from "@/lib/subscriptions/plans";
import type { BillingPeriod, PlanTier } from "@/lib/subscriptions/plans";
import {
  sendSubscriptionWelcomeEmail,
  sendSubscriptionCancelledEmail,
  sendSubscriptionPausedEmail,
} from "@/lib/mercadopago/emails";

interface MpPreapproval {
  id: string;
  status: string;
  preapproval_plan_id?: string;
  external_reference?: string;
  next_payment_date?: string;
  auto_recurring?: { end_date?: string };
  payer_email?: string;
}

async function getUserProfile(userId: string) {
  const supabase = getSupabaseAdmin();
  const { data } = await supabase
    .from("profiles")
    .select("full_name, email, subscription_active, plan_tier")
    .eq("id", userId)
    .single();
  return data;
}

function resolvePlanDisplay(
  planTier: PlanTier | null,
  billingPeriod: BillingPeriod | null,
): { name: string; priceDisplay: string } {
  if (planTier && billingPeriod) {
    try {
      const option = getPlanOption(planTier, billingPeriod);
      return { name: `AuronFit ${option.label}`, priceDisplay: option.priceDisplay };
    } catch {
      /* fallback */
    }
  }
  return {
    name: planTier ? `AuronFit ${getPlanLabel(planTier)}` : "AuronFit",
    priceDisplay: "",
  };
}

/**
 * subscription_preapproval — sempre revalida via GET /preapproval/{id}.
 */
export async function handlePreapprovalUpdate(preapprovalId: string): Promise<void> {
  const preapproval = await mpFetch<MpPreapproval>(`/preapproval/${preapprovalId}`);

  const userId = preapproval.external_reference;
  if (!userId) {
    console.warn("[MP] preapproval sem external_reference:", preapprovalId);
    return;
  }

  const status = mapMpPreapprovalStatus(preapproval.status);
  const supabase = getSupabaseAdmin();

  const { data: existing } = await supabase
    .from("subscriptions")
    .select(
      "status, user_id, plan_tier, billing_period, student_limit, current_period_end, payment_failure_count, grace_period_end",
    )
    .eq("mp_preapproval_id", preapprovalId)
    .maybeSingle();

  // Cancelamento solicitado pelo coach: não sobrescrever canceling → cancelled.
  // O cron expira no current_period_end.
  if (existing?.status === "canceling" && status === "cancelled") {
    console.log("[MP] preapproval cancelled ignorado (já canceling):", preapprovalId);
    return;
  }

  const wasAuthorized = existing?.status === "authorized";
  const planTier = (existing?.plan_tier as PlanTier | null) ?? null;
  const billingPeriod = (existing?.billing_period as BillingPeriod | null) ?? null;
  const studentLimit = existing?.student_limit ?? null;

  let periodEnd: string | null =
    preapproval.next_payment_date ||
    preapproval.auto_recurring?.end_date ||
    existing?.current_period_end ||
    null;

  if (status === "cancelled") {
    periodEnd =
      existing?.current_period_end && new Date(existing.current_period_end) < new Date()
        ? existing.current_period_end
        : new Date().toISOString();
  }

  const paymentFailureCount =
    status === "authorized" ? 0 : (existing?.payment_failure_count ?? 0);

  // Grace só em past_due/paused; limpa em authorized
  const gracePeriodEnd =
    status === "past_due" || status === "paused"
      ? calcGracePeriodEnd(existing?.current_period_end ?? periodEnd)
      : null;

  await supabase.from("subscriptions").upsert(
    {
      user_id: userId,
      mp_preapproval_id: preapprovalId,
      mp_plan_id: preapproval.preapproval_plan_id || null,
      status,
      current_period_end: periodEnd,
      grace_period_end: gracePeriodEnd,
      plan_tier: planTier,
      billing_period: billingPeriod,
      student_limit: studentLimit,
      payment_failure_count: paymentFailureCount,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "mp_preapproval_id" },
  );

  const planInfo =
    planTier && billingPeriod && studentLimit != null
      ? { planTier, billingPeriod, studentLimit }
      : null;

  const accessPeriodEnd = status === "cancelled" ? null : periodEnd;
  await setUserAccess(userId, status, accessPeriodEnd, planInfo, gracePeriodEnd);

  const profile = await getUserProfile(userId);
  const email = profile?.email || preapproval.payer_email;
  const name = profile?.full_name || "Coach";
  if (!email) return;

  const { name: planName, priceDisplay: planPrice } = resolvePlanDisplay(
    planTier,
    billingPeriod,
  );

  if (status === "authorized" && !wasAuthorized && !profile?.subscription_active) {
    sendSubscriptionWelcomeEmail(email, name, planName, planPrice || "—");
  } else if (status === "cancelled") {
    sendSubscriptionCancelledEmail(email, name, periodEnd);
  } else if (status === "past_due") {
    sendSubscriptionPausedEmail(email, name);
  }
}
