import "server-only";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { asaasFetch } from "@/lib/asaas/client";
import { mapAsaasSubscriptionStatus } from "@/lib/asaas/statusMapping";
import { setUserAccess } from "@/lib/access/setUserAccess";
import { sendSubscriptionCancelledEmail } from "@/lib/mercadopago/emails";

interface AsaasSubscription {
  id: string;
  status: string;
  customer: string;
  externalReference?: string;
  nextDueDate?: string;
}

/**
 * subscription.* — sempre revalida via GET /subscriptions/{id}.
 * A concessão de acesso é feita pelos eventos de pagamento (handlePaymentEvent);
 * este handler cobre principalmente o desligamento: assinatura cancelada/expirada no Asaas
 * (ex.: cancelamento feito direto no painel do Asaas, fora do nosso botão de cancelar).
 */
export async function handleSubscriptionEvent(asaasSubscriptionId: string): Promise<void> {
  const asaasSubscription = await asaasFetch<AsaasSubscription>(
    `/subscriptions/${asaasSubscriptionId}`,
  );

  const supabase = getSupabaseAdmin();

  const { data: existing } = await supabase
    .from("subscriptions")
    .select("id, user_id, status, current_period_end")
    .eq("asaas_subscription_id", asaasSubscriptionId)
    .maybeSingle();

  if (!existing) {
    console.warn("[ASAAS] subscription não encontrada localmente:", asaasSubscriptionId);
    return;
  }

  const status = mapAsaasSubscriptionStatus(asaasSubscription.status);

  // Já em 'canceling' (coach pediu cancelamento por dentro do app) — não sobrescrever
  // com 'cancelled' vindo do Asaas; o cron expira no current_period_end, igual ao fluxo MP.
  if (existing.status === "canceling" && status === "cancelled") {
    console.log("[ASAAS] subscription cancelled ignorado (já canceling):", asaasSubscriptionId);
    return;
  }

  if (status !== "cancelled") {
    // Estado ACTIVE — não mexe em acesso aqui (isso é responsabilidade do payment event).
    return;
  }

  await supabase
    .from("subscriptions")
    .update({ status: "cancelled", updated_at: new Date().toISOString() })
    .eq("id", existing.id);

  await setUserAccess(existing.user_id, "cancelled", null, null, null);

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, email")
    .eq("id", existing.user_id)
    .maybeSingle();

  if (profile?.email) {
    sendSubscriptionCancelledEmail(profile.email, profile.full_name || "Coach", null);
  }
}
