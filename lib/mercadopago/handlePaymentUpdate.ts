import "server-only";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { mpFetch } from "@/lib/mercadopago/client";
import { setUserAccess } from "@/lib/access/setUserAccess";
import { sendPaymentFailedEmail } from "@/lib/mercadopago/emails";

interface MpPayment {
  id: number | string;
  status: string;
  external_reference?: string;
  preapproval_id?: string;
  date_approved?: string;
}

export async function handlePaymentUpdate(paymentId: string): Promise<void> {
  const payment = await mpFetch<MpPayment>(`/v1/payments/${paymentId}`);
  const supabase = getSupabaseAdmin();

  let subscriptionQuery = supabase.from("subscriptions").select("*");

  if (payment.preapproval_id) {
    subscriptionQuery = subscriptionQuery.eq("mp_preapproval_id", payment.preapproval_id);
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
  const periodEnd = payment.date_approved
    ? new Date(
        new Date(payment.date_approved).getTime() + 30 * 24 * 60 * 60 * 1000
      ).toISOString()
    : subscription.current_period_end;

  await supabase
    .from("subscriptions")
    .update({
      last_payment_status: lastPaymentStatus,
      current_period_end: periodEnd,
      updated_at: new Date().toISOString(),
    })
    .eq("id", subscription.id);

  if (lastPaymentStatus === "approved") {
    await supabase
      .from("subscriptions")
      .update({ status: "authorized" })
      .eq("id", subscription.id);

    const planInfo =
      subscription.plan_tier && subscription.billing_period && subscription.student_limit
        ? {
            planTier: subscription.plan_tier,
            billingPeriod: subscription.billing_period,
            studentLimit: subscription.student_limit,
          }
        : null;

    await setUserAccess(subscription.user_id, "authorized", periodEnd, planInfo);
  } else if (lastPaymentStatus === "rejected") {
    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name, email")
      .eq("id", subscription.user_id)
      .single();

    if (profile?.email) {
      sendPaymentFailedEmail(profile.email, profile.full_name || "Coach");
    }
  }
}
