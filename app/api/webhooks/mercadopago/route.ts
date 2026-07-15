import { NextRequest, NextResponse, after } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { verifyMpSignature } from "@/lib/mercadopago/verifySignature";
import { handlePreapprovalUpdate } from "@/lib/mercadopago/handlePreapprovalUpdate";
import { handlePaymentUpdate } from "@/lib/mercadopago/handlePaymentUpdate";

type MpWebhookBody = {
  type?: string;
  topic?: string;
  action?: string;
  id?: string | number;
  data?: { id?: string | number };
};

function resolveEventType(body: MpWebhookBody): string {
  return String(body.type || body.topic || body.action || "unknown");
}

function resolveResourceId(body: MpWebhookBody, queryDataId: string | null): string {
  return String(body.data?.id ?? queryDataId ?? body.id ?? "unknown");
}

function isPreapprovalEvent(eventType: string): boolean {
  const t = eventType.toLowerCase();
  return (
    t === "subscription_preapproval" ||
    t.includes("subscription_preapproval") ||
    (t.includes("preapproval") && !t.includes("payment"))
  );
}

function isPaymentEvent(eventType: string): boolean {
  const t = eventType.toLowerCase();
  return (
    t === "payment" ||
    t === "subscription_authorized_payment" ||
    t === "subscription_preapproval_payment" ||
    t.includes("authorized_payment") ||
    (t.includes("payment") && !t.includes("preapproval_plan"))
  );
}

async function processMpEvent(eventType: string, resourceId: string): Promise<void> {
  // Sempre revalida o recurso na API do MP dentro dos handlers (GET).
  if (isPreapprovalEvent(eventType)) {
    await handlePreapprovalUpdate(resourceId);
    return;
  }
  if (isPaymentEvent(eventType)) {
    await handlePaymentUpdate(resourceId);
    return;
  }
  console.warn("[MP-WEBHOOK] Evento ignorado (tipo não mapeado):", eventType, resourceId);
}

/**
 * Webhook Mercado Pago — ciclo de vida da assinatura.
 *
 * 1. Valida x-signature
 * 2. Idempotência em webhook_events
 * 3. Agenda processamento (GET no MP + mapear status)
 * 4. Retorna 200 rápido (timeout curto do MP)
 */
export async function POST(req: NextRequest) {
  const url = new URL(req.url);
  const dataId = url.searchParams.get("data.id") || url.searchParams.get("id");
  const xSignature = req.headers.get("x-signature");
  const xRequestId = req.headers.get("x-request-id");
  const secret = process.env.MP_WEBHOOK_SECRET;

  if (!secret) {
    console.error("[MP-WEBHOOK] MP_WEBHOOK_SECRET não configurado");
    return NextResponse.json({ error: "webhook not configured" }, { status: 500 });
  }

  let body: MpWebhookBody;
  try {
    body = (await req.json()) as MpWebhookBody;
  } catch {
    return NextResponse.json({ error: "invalid body" }, { status: 400 });
  }

  if (!xSignature || !verifyMpSignature(xSignature, xRequestId, dataId, secret)) {
    return NextResponse.json({ error: "invalid signature" }, { status: 401 });
  }

  const eventType = resolveEventType(body);
  const providerEventId = resolveResourceId(body, dataId);

  if (providerEventId === "unknown") {
    console.warn("[MP-WEBHOOK] Evento sem id de recurso:", eventType);
    return NextResponse.json({ ok: true, ignored: true }, { status: 200 });
  }

  const supabase = getSupabaseAdmin();

  const { error: insertError } = await supabase.from("webhook_events").insert({
    event_type: eventType,
    provider_event_id: providerEventId,
    payload: body,
  });

  if (insertError) {
    // Apenas unique violation = duplicata (já processado / em voo)
    if (insertError.code === "23505") {
      return NextResponse.json({ ok: true, duplicate: true }, { status: 200 });
    }
    console.error("[MP-WEBHOOK] Erro ao registrar evento:", insertError);
    return NextResponse.json({ error: "db error" }, { status: 500 });
  }

  // Responde 200 e processa depois — MP tem timeout curto
  after(async () => {
    try {
      await processMpEvent(eventType, providerEventId);
      await supabase
        .from("webhook_events")
        .update({ processed_at: new Date().toISOString() })
        .eq("provider_event_id", providerEventId)
        .eq("event_type", eventType)
        .eq("provider", "mercadopago");
    } catch (err) {
      console.error("[MP-WEBHOOK] Erro processando evento:", eventType, providerEventId, err);
    }
  });

  return NextResponse.json({ ok: true }, { status: 200 });
}
