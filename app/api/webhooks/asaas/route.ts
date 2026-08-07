import { NextRequest, NextResponse, after } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { verifyAsaasWebhookToken } from "@/lib/asaas/verifyWebhookToken";
import { handlePaymentEvent } from "@/lib/asaas/handlePaymentEvent";
import { handleSubscriptionEvent } from "@/lib/asaas/handleSubscriptionEvent";

type AsaasWebhookBody = {
  event?: string;
  payment?: { id?: string };
  subscription?: { id?: string };
};

async function processAsaasEvent(eventType: string, body: AsaasWebhookBody): Promise<void> {
  const t = eventType.toUpperCase();

  if (t.startsWith("PAYMENT_") && body.payment?.id) {
    await handlePaymentEvent(body.payment.id);
    return;
  }

  if (t.startsWith("SUBSCRIPTION_") && body.subscription?.id) {
    await handleSubscriptionEvent(body.subscription.id);
    return;
  }

  console.warn("[ASAAS-WEBHOOK] Evento ignorado (sem recurso mapeado):", eventType);
}

/**
 * Webhook Asaas — ciclo de vida da assinatura do coach.
 *
 * 1. Valida token estático (header asaas-access-token)
 * 2. Idempotência em webhook_events (mesma tabela do fluxo MP, provider='asaas')
 * 3. Agenda processamento (after) — revalida sempre via GET na API Asaas
 * 4. Retorna 200 rápido
 */
export async function POST(req: NextRequest) {
  const token = req.headers.get("asaas-access-token");
  const expected = process.env.ASAAS_WEBHOOK_TOKEN;

  if (!expected) {
    console.error("[ASAAS-WEBHOOK] ASAAS_WEBHOOK_TOKEN não configurado");
    return NextResponse.json({ error: "webhook not configured" }, { status: 500 });
  }

  if (!verifyAsaasWebhookToken(token, expected)) {
    console.error("[ASAAS-WEBHOOK] Token inválido");
    return NextResponse.json({ error: "invalid token" }, { status: 401 });
  }

  let body: AsaasWebhookBody;
  try {
    body = (await req.json()) as AsaasWebhookBody;
  } catch {
    return NextResponse.json({ error: "invalid body" }, { status: 400 });
  }

  const eventType = String(body.event || "unknown");
  const providerEventId = String(body.payment?.id || body.subscription?.id || "unknown");

  if (providerEventId === "unknown") {
    console.warn("[ASAAS-WEBHOOK] Evento sem id de recurso:", eventType);
    return NextResponse.json({ ok: true, ignored: true }, { status: 200 });
  }

  const supabase = getSupabaseAdmin();

  const { error: insertError } = await supabase.from("webhook_events").insert({
    provider: "asaas",
    event_type: eventType,
    provider_event_id: providerEventId,
    payload: body,
  });

  if (insertError) {
    // unique violation = evento duplicado (já processado / em voo)
    if (insertError.code === "23505") {
      return NextResponse.json({ ok: true, duplicate: true }, { status: 200 });
    }
    console.error("[ASAAS-WEBHOOK] Erro ao registrar evento:", insertError);
    return NextResponse.json({ error: "db error" }, { status: 500 });
  }

  // Responde 200 rápido e processa depois.
  after(async () => {
    try {
      await processAsaasEvent(eventType, body);
      await supabase
        .from("webhook_events")
        .update({ processed_at: new Date().toISOString() })
        .eq("provider_event_id", providerEventId)
        .eq("event_type", eventType)
        .eq("provider", "asaas");
    } catch (err) {
      console.error("[ASAAS-WEBHOOK] Erro processando evento:", eventType, providerEventId, err);
    }
  });

  return NextResponse.json({ ok: true }, { status: 200 });
}
