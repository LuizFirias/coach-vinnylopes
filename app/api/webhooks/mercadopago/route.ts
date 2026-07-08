import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { verifyMpSignature } from "@/lib/mercadopago/verifySignature";
import { handlePreapprovalUpdate } from "@/lib/mercadopago/handlePreapprovalUpdate";
import { handlePaymentUpdate } from "@/lib/mercadopago/handlePaymentUpdate";

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

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid body" }, { status: 400 });
  }

  if (!xSignature || !verifyMpSignature(xSignature, xRequestId, dataId, secret)) {
    return NextResponse.json({ error: "invalid signature" }, { status: 401 });
  }

  const eventType = String(body.type || body.topic || body.action || "unknown");
  const providerEventId = String(
    (body.data as { id?: string })?.id ?? dataId ?? body.id ?? "unknown"
  );

  const supabase = getSupabaseAdmin();

  const { error: insertError } = await supabase.from("webhook_events").insert({
    event_type: eventType,
    provider_event_id: providerEventId,
    payload: body,
  });

  if (insertError) {
    return NextResponse.json({ ok: true, duplicate: true }, { status: 200 });
  }

  try {
    if (
      eventType === "subscription_preapproval" ||
      eventType.includes("preapproval")
    ) {
      await handlePreapprovalUpdate(providerEventId);
    } else if (
      eventType === "payment" ||
      eventType === "subscription_authorized_payment"
    ) {
      await handlePaymentUpdate(providerEventId);
    }

    await supabase
      .from("webhook_events")
      .update({ processed_at: new Date().toISOString() })
      .eq("provider_event_id", providerEventId)
      .eq("event_type", eventType);

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (err) {
    console.error("[MP-WEBHOOK] Erro processando evento:", err);
    return NextResponse.json({ error: "internal error" }, { status: 500 });
  }
}
