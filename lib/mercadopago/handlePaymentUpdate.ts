import "server-only";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { mpFetch } from "@/lib/mercadopago/client";
import { calcGracePeriodEnd } from "@/lib/mercadopago/statusMapping";
import { setUserAccess } from "@/lib/access/setUserAccess";
import { sendPaymentFailedEmail } from "@/lib/mercadopago/emails";
import { computePeriodEndFromPayment } from "@/lib/subscriptions/billingPeriod";

interface MpPayment {
  id: number | string;
  status: string;
  external_reference?: string;
  preapproval_id?: string;
  date_approved?: string;
  metadata?: Record<string, unknown>;
  card?: {
    last_four_digits?: string;
    last_four?: string;
  };
}

const GRACE_FAIL_THRESHOLD = 1;

/**
 * payment / subscription_authorized_payment —
 * sempre revalida via GET /v1/payments/{id}.
 */
export async function handlePaymentUpdate(paymentId: string): Promise<void> {
  const payment = await mpFetch<MpPayment>(`/v1/payments/${paymentId}`);
  const supabase = getSupabaseAdmin();

  let subscriptionQuery = supabase.from("subscriptions").select("*");

  if (payment.preapproval_id) {
    subscriptionQuery = subscriptionQuery.eq(
      "mp_preapproval_id",
      String(payment.preapproval_id),
    );
  } else if (payment.external_reference) {
    subscriptionQuery = subscriptionQuery.eq("user_id", payment.external_reference);
  } else {
    console.warn("[MP] payment sem referência de assinatura:", paymentId);
    return;
  }

  const { data: subscription } = await subscriptionQuery.maybeSingle();
  if (!subscription) {
    console.warn("[MP] subscription não encontrada para payment:", paymentId);
    return;
  }

  const lastPaymentStatus = payment.status;
  const planInfo =
    subscription.plan_tier &&
    subscription.billing_period &&
    subscription.student_limit != null
      ? {
          planTier: subscription.plan_tier,
          billingPeriod: subscription.billing_period,
          studentLimit: subscription.student_limit,
        }
      : null;

  if (lastPaymentStatus === "approved") {
    const periodEnd = computePeriodEndFromPayment({
      dateApproved: payment.date_approved,
      existingPeriodEnd: subscription.current_period_end,
      billingPeriod: subscription.billing_period,
      planTier: subscription.plan_tier,
    });

    const cardLastFour =
      payment.card?.last_four_digits || payment.card?.last_four || null;

    await supabase
      .from("subscriptions")
      .update({
        status: "authorized",
        last_payment_status: "approved",
        current_period_end: periodEnd,
        grace_period_end: null,
        payment_failure_count: 0,
        ...(cardLastFour ? { card_last_four: String(cardLastFour).slice(-4) } : {}),
        updated_at: new Date().toISOString(),
      })
      .eq("id", subscription.id);

    await setUserAccess(subscription.user_id, "authorized", periodEnd, planInfo, null);
    return;
  }

  if (
    lastPaymentStatus === "rejected" ||
    lastPaymentStatus === "cancelled" ||
    lastPaymentStatus === "refunded"
  ) {
    const failureCount = (subscription.payment_failure_count ?? 0) + 1;
    const periodEnd = subscription.current_period_end;
    const nextStatus =
      failureCount >= GRACE_FAIL_THRESHOLD ? "past_due" : subscription.status;
    const gracePeriodEnd =
      nextStatus === "past_due" ? calcGracePeriodEnd(periodEnd) : null;

    await supabase
      .from("subscriptions")
      .update({
        status: nextStatus,
        last_payment_status: "rejected",
        payment_failure_count: failureCount,
        ...(gracePeriodEnd != null ? { grace_period_end: gracePeriodEnd } : {}),
        updated_at: new Date().toISOString(),
      })
      .eq("id", subscription.id);

    if (nextStatus === "past_due") {
      await setUserAccess(
        subscription.user_id,
        "past_due",
        periodEnd,
        planInfo,
        gracePeriodEnd,
      );
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name, email")
      .eq("id", subscription.user_id)
      .single();

    if (profile?.email) {
      sendPaymentFailedEmail(profile.email, profile.full_name || "Coach");
    }
    return;
  }

  const normalizedLast =
    lastPaymentStatus === "in_process" || lastPaymentStatus === "pending"
      ? lastPaymentStatus
      : "pending";

  await supabase
    .from("subscriptions")
    .update({
      last_payment_status: normalizedLast,
      updated_at: new Date().toISOString(),
    })
    .eq("id", subscription.id);
}
