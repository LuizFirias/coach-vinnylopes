import "server-only";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { asaasFetch } from "@/lib/asaas/client";
import { mapAsaasPaymentStatus, calcGracePeriodEnd } from "@/lib/asaas/statusMapping";
import { setUserAccess } from "@/lib/access/setUserAccess";
import { computePeriodEndFromPayment } from "@/lib/subscriptions/billingPeriod";
import { sendPaymentFailedEmail, sendSubscriptionWelcomeEmail } from "@/lib/mercadopago/emails";
import type { BillingPeriod, PlanTier } from "@/lib/subscriptions/plans";

interface AsaasPayment {
  id: string;
  status: string;
  subscription?: string;
  customer?: string;
  value: number;
  billingType?: string;
  confirmedDate?: string;
  paymentDate?: string;
  dueDate?: string;
}

const GRACE_FAIL_THRESHOLD = 1;

function mapMetodoPagamento(billingType?: string): "pix" | "cartao_credito" | "boleto" | null {
  switch ((billingType || "").toUpperCase()) {
    case "PIX":
      return "pix";
    case "CREDIT_CARD":
      return "cartao_credito";
    case "BOLETO":
      return "boleto";
    default:
      return null;
  }
}

/**
 * payment.* — sempre revalida via GET /payments/{id} (mesmo padrão do handlePaymentUpdate do MP).
 */
export async function handlePaymentEvent(paymentId: string): Promise<void> {
  const payment = await asaasFetch<AsaasPayment>(`/payments/${paymentId}`);
  const supabase = getSupabaseAdmin();

  if (!payment.subscription) {
    console.warn("[ASAAS] payment sem subscription vinculada:", paymentId);
    return;
  }

  const { data: subscription } = await supabase
    .from("subscriptions")
    .select("*")
    .eq("asaas_subscription_id", payment.subscription)
    .maybeSingle();

  if (!subscription) {
    console.warn("[ASAAS] subscription não encontrada para payment:", paymentId, payment.subscription);
    return;
  }

  const mappedStatus = mapAsaasPaymentStatus(payment.status);
  const planInfo =
    subscription.plan_tier && subscription.billing_period
      ? {
          planTier: subscription.plan_tier as PlanTier,
          billingPeriod: subscription.billing_period as BillingPeriod,
          studentLimit: subscription.student_limit as number | null,
        }
      : null;

  // Idempotência: já processado como confirmado, não reprocessa boas-vindas/valores.
  const { data: existingPayment } = await supabase
    .from("subscription_payments")
    .select("id, status")
    .eq("provider", "asaas")
    .eq("provider_payment_id", payment.id)
    .maybeSingle();

  const competencia = new Date().toISOString().slice(0, 7) + "-01";
  const metodoPagamento = mapMetodoPagamento(payment.billingType);

  if (mappedStatus === "authorized") {
    const periodEnd = computePeriodEndFromPayment({
      dateApproved: payment.confirmedDate || payment.paymentDate || null,
      existingPeriodEnd: subscription.current_period_end,
      billingPeriod: subscription.billing_period,
      planTier: subscription.plan_tier,
    });

    await supabase
      .from("subscriptions")
      .update({
        status: "authorized",
        last_payment_status: "approved",
        current_period_end: periodEnd,
        grace_period_end: null,
        payment_failure_count: 0,
        updated_at: new Date().toISOString(),
      })
      .eq("id", subscription.id);

    if (existingPayment?.status !== "confirmado") {
      await supabase.from("subscription_payments").upsert(
        {
          user_id: subscription.user_id,
          provider: "asaas",
          provider_payment_id: payment.id,
          plan_tier: subscription.plan_tier,
          billing_period: subscription.billing_period,
          valor: payment.value,
          metodo_pagamento: metodoPagamento,
          status: "confirmado",
          competencia,
          confirmado_em: new Date().toISOString(),
        },
        { onConflict: "provider,provider_payment_id" },
      );
    }

    const wasAuthorized = subscription.status === "authorized";
    await setUserAccess(subscription.user_id, "authorized", periodEnd, planInfo, null);

    // 1ª cobrança real encerra o trial
    await supabase
      .from("profiles")
      .update({ trial_ativo: false })
      .eq("id", subscription.user_id)
      .eq("trial_ativo", true);

    if (!wasAuthorized) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name, email")
        .eq("id", subscription.user_id)
        .maybeSingle();
      if (profile?.email) {
        sendSubscriptionWelcomeEmail(
          profile.email,
          profile.full_name || "Coach",
          `AuronFit ${subscription.plan_tier || ""}`.trim(),
          "",
        );
      }
    }
    return;
  }

  if (mappedStatus === "past_due") {
    const failureCount = (subscription.payment_failure_count ?? 0) + 1;
    const periodEnd = subscription.current_period_end;
    const nextStatus = failureCount >= GRACE_FAIL_THRESHOLD ? "past_due" : subscription.status;
    const gracePeriodEnd = nextStatus === "past_due" ? calcGracePeriodEnd(periodEnd) : null;

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

    await supabase.from("subscription_payments").upsert(
      {
        user_id: subscription.user_id,
        provider: "asaas",
        provider_payment_id: payment.id,
        plan_tier: subscription.plan_tier,
        billing_period: subscription.billing_period,
        valor: payment.value,
        metodo_pagamento: metodoPagamento,
        status: "atrasado",
        competencia,
      },
      { onConflict: "provider,provider_payment_id" },
    );

    if (nextStatus === "past_due") {
      await setUserAccess(subscription.user_id, "past_due", periodEnd, planInfo, gracePeriodEnd);
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name, email")
      .eq("id", subscription.user_id)
      .maybeSingle();
    if (profile?.email) {
      sendPaymentFailedEmail(profile.email, profile.full_name || "Coach");
    }
    return;
  }

  // Demais status (PENDING, AWAITING_RISK_ANALYSIS, etc.) — só registra, sem mudar acesso.
  await supabase.from("subscription_payments").upsert(
    {
      user_id: subscription.user_id,
      provider: "asaas",
      provider_payment_id: payment.id,
      plan_tier: subscription.plan_tier,
      billing_period: subscription.billing_period,
      valor: payment.value,
      metodo_pagamento: metodoPagamento,
      status: "pendente",
      competencia,
    },
    { onConflict: "provider,provider_payment_id" },
  );
}
