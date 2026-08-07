import { NextResponse } from "next/server";
import { getAuthenticatedCoach } from "@/lib/auth/getAuthenticatedCoach";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { cancelMPPreapproval } from "@/lib/mercadopago/client";
import { cancelarAssinatura as cancelAsaasSubscription } from "@/lib/asaas/client";
import { setUserAccess } from "@/lib/access/setUserAccess";
import { resolveAccessUntilOnCancel } from "@/lib/subscriptions/billingPeriod";
import type { BillingPeriod, PlanTier } from "@/lib/subscriptions/plans";

const CANCELABLE_STATUSES = ["authorized", "past_due", "paused"] as const;

/**
 * POST /api/admin/subscription/cancel
 * Cancela o preapproval no MP e seta canceling no DB.
 * Acesso permanece até o fim do ciclo pago (nunca imediato) — o cron seta expired depois.
 */
export async function POST(req: Request) {
  try {
    const auth = await getAuthenticatedCoach(req);
    if ("error" in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    if (auth.role === "super_admin") {
      return NextResponse.json(
        { error: "Super admin não possui assinatura cancelável" },
        { status: 400 },
      );
    }

    const supabase = getSupabaseAdmin();

    const { data: sub, error } = await supabase
      .from("subscriptions")
      .select(
        "id, provider, mp_preapproval_id, asaas_subscription_id, status, current_period_end, plan_tier, billing_period, student_limit",
      )
      .eq("user_id", auth.userId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error || !sub) {
      return NextResponse.json({ error: "Assinatura não encontrada" }, { status: 404 });
    }

    if (
      !CANCELABLE_STATUSES.includes(
        sub.status as (typeof CANCELABLE_STATUSES)[number],
      )
    ) {
      return NextResponse.json(
        { error: "Assinatura não pode ser cancelada neste estado" },
        { status: 400 },
      );
    }

    if (sub.provider === "asaas") {
      if (!sub.asaas_subscription_id) {
        return NextResponse.json({ error: "Assinatura sem vínculo Asaas" }, { status: 400 });
      }
      await cancelAsaasSubscription(sub.asaas_subscription_id);
    } else {
      if (!sub.mp_preapproval_id) {
        return NextResponse.json(
          { error: "Assinatura sem vínculo Mercado Pago" },
          { status: 400 },
        );
      }
      await cancelMPPreapproval(sub.mp_preapproval_id);
    }

    const accessUntil = resolveAccessUntilOnCancel({
      currentPeriodEnd: sub.current_period_end,
      billingPeriod: sub.billing_period,
      planTier: sub.plan_tier,
    });

    const now = new Date().toISOString();
    const { error: updateError } = await supabase
      .from("subscriptions")
      .update({
        status: "canceling",
        current_period_end: accessUntil,
        grace_period_end: null,
        updated_at: now,
      })
      .eq("id", sub.id);

    if (updateError) {
      console.error("[SUBSCRIPTION-CANCEL] DB update:", updateError);
      return NextResponse.json(
        { error: "Cancelado no MP, mas falhou ao atualizar o banco" },
        { status: 500 },
      );
    }

    const planInfo =
      sub.plan_tier && sub.billing_period && sub.student_limit != null
        ? {
            planTier: sub.plan_tier as PlanTier,
            billingPeriod: sub.billing_period as BillingPeriod,
            studentLimit: sub.student_limit as number,
          }
        : null;

    // Mantém acesso até accessUntil (isAccessGranted trata canceling)
    await setUserAccess(auth.userId, "canceling", accessUntil, planInfo, null);

    return NextResponse.json({
      ok: true,
      access_until: accessUntil,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Erro interno";
    console.error("[SUBSCRIPTION-CANCEL]", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
