import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { calcGracePeriodEnd } from "@/lib/mercadopago/statusMapping";
import { setUserAccess } from "@/lib/access/setUserAccess";
import type { BillingPeriod, PlanTier } from "@/lib/subscriptions/plans";

/**
 * Cron diário (03:00 UTC via vercel.json).
 * Auth: Authorization: Bearer CRON_SECRET
 * Em produção a Vercel injeta o header automaticamente.
 */
export async function GET(req: Request) {
  const auth = req.headers.get("authorization");
  const secret = process.env.CRON_SECRET;

  if (!secret || auth !== `Bearer ${secret}`) {
    return new NextResponse("unauthorized", { status: 401 });
  }

  const supabase = getSupabaseAdmin();
  const now = new Date().toISOString();
  const results = { expired: 0, past_due: 0, errors: [] as string[] };

  // ── 1) past_due com grace expirado → expired + bloqueia acesso ───────────
  const { data: toExpire, error: expireQueryError } = await supabase
    .from("subscriptions")
    .select("id, user_id, plan_tier, billing_period, student_limit")
    .eq("status", "past_due")
    .not("grace_period_end", "is", null)
    .lt("grace_period_end", now);

  if (expireQueryError) {
    results.errors.push(`query expire: ${expireQueryError.message}`);
  }

  for (const sub of toExpire ?? []) {
    const { error } = await supabase
      .from("subscriptions")
      .update({
        status: "expired",
        updated_at: now,
      })
      .eq("id", sub.id);

    if (error) {
      results.errors.push(`expire ${sub.user_id}: ${error.message}`);
      continue;
    }

    try {
      await setUserAccess(sub.user_id, "expired", null, null, null);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      results.errors.push(`expire profile ${sub.user_id}: ${msg}`);
      continue;
    }

    results.expired++;
  }

  // ── 2) authorized com current_period_end vencido (webhook falhou) → past_due
  const { data: toPastDue, error: pastDueQueryError } = await supabase
    .from("subscriptions")
    .select("id, user_id, current_period_end, plan_tier, billing_period, student_limit")
    .eq("status", "authorized")
    .not("current_period_end", "is", null)
    .lt("current_period_end", now);

  if (pastDueQueryError) {
    results.errors.push(`query past_due: ${pastDueQueryError.message}`);
  }

  for (const sub of toPastDue ?? []) {
    const gracePeriodEnd = calcGracePeriodEnd(sub.current_period_end);

    const { error } = await supabase
      .from("subscriptions")
      .update({
        status: "past_due",
        grace_period_end: gracePeriodEnd,
        updated_at: now,
      })
      .eq("id", sub.id);

    if (error) {
      results.errors.push(`past_due ${sub.user_id}: ${error.message}`);
      continue;
    }

    const planInfo =
      sub.plan_tier && sub.billing_period
        ? {
            planTier: sub.plan_tier as PlanTier,
            billingPeriod: sub.billing_period as BillingPeriod,
            studentLimit: sub.student_limit as number | null,
          }
        : null;

    try {
      await setUserAccess(
        sub.user_id,
        "past_due",
        sub.current_period_end,
        planInfo,
        gracePeriodEnd,
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      results.errors.push(`past_due profile ${sub.user_id}: ${msg}`);
      continue;
    }

    results.past_due++;
  }

  // ── 3) canceling com current_period_end vencido → expired + bloqueia ─────
  const { data: toExpireFromCanceling, error: cancelingQueryError } = await supabase
    .from("subscriptions")
    .select("id, user_id")
    .eq("status", "canceling")
    .not("current_period_end", "is", null)
    .lt("current_period_end", now);

  if (cancelingQueryError) {
    results.errors.push(`query cancel-expire: ${cancelingQueryError.message}`);
  }

  for (const sub of toExpireFromCanceling ?? []) {
    const { error } = await supabase
      .from("subscriptions")
      .update({
        status: "expired",
        updated_at: now,
      })
      .eq("id", sub.id);

    if (error) {
      results.errors.push(`cancel-expire ${sub.user_id}: ${error.message}`);
      continue;
    }

    try {
      await setUserAccess(sub.user_id, "expired", null, null, null);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      results.errors.push(`cancel-expire profile ${sub.user_id}: ${msg}`);
      continue;
    }

    results.expired++;
  }

  console.log("[cron] expire-subscriptions:", results);
  return NextResponse.json(results);
}
