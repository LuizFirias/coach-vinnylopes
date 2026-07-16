import { NextResponse } from "next/server";

import { getAuthenticatedCoach } from "@/lib/auth/getAuthenticatedCoach";

import { buildMpPreapprovalBody, mpFetch } from "@/lib/mercadopago/client";

import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

import { mapMpPreapprovalStatus } from "@/lib/mercadopago/statusMapping";

import { setUserAccess } from "@/lib/access/setUserAccess";

import {

  isValidPlanCombo,

  getPlanOption,

  type PlanTier,

  type BillingPeriod,

} from "@/lib/subscriptions/plans";

import { getSiteUrl } from "@/lib/subscriptions/siteUrl";



interface MpPreapprovalResponse {

  id: string;

  status: string;

  init_point?: string;

  next_payment_date?: string;

  preapproval_plan_id?: string;

}



export async function POST(req: Request) {

  try {

    const auth = await getAuthenticatedCoach(req);

    if ("error" in auth) {

      return NextResponse.json({ error: auth.error }, { status: auth.status });

    }



    if (auth.role === "super_admin") {

      return NextResponse.json({

        success: true,

        message: "Super admin não requer assinatura",

      });

    }



    const { cardTokenId, payerEmail, planTier, billingPeriod } = await req.json();



    if (!cardTokenId) {

      return NextResponse.json({ error: "Token do cartão é obrigatório" }, { status: 400 });

    }



    if (!planTier || !billingPeriod || !isValidPlanCombo(planTier, billingPeriod)) {

      return NextResponse.json(

        { error: "Plano ou periodicidade inválidos" },

        { status: 400 }

      );

    }



    const tier = planTier as PlanTier;

    const period = billingPeriod as BillingPeriod;

    const planOption = getPlanOption(tier, period);



    const email = payerEmail || auth.email;

    if (!email) {

      return NextResponse.json({ error: "E-mail do pagador é obrigatório" }, { status: 400 });

    }



    const supabase = getSupabaseAdmin();

    const { data: existing } = await supabase
      .from("subscriptions")
      .select("id, status, mp_preapproval_id")
      .eq("user_id", auth.userId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    // authorized bloqueia; canceling/expired/cancelled/past_due podem reativar via checkout
    if (existing?.status === "authorized") {
      return NextResponse.json(
        { error: "Você já possui uma assinatura ativa" },
        { status: 409 },
      );
    }

    const siteUrl = getSiteUrl();

    const mpBody = buildMpPreapprovalBody(tier, period, {
      userId: auth.userId,
      email,
      cardTokenId,
      backUrl: `${siteUrl}/admin/assinatura?status=success`,
    });

    console.log("[SUBSCRIPTIONS-CHECKOUT] notification_url=", mpBody.notification_url, {
      tier,
      period,
      userId: auth.userId,
    });

    const preapproval = await mpFetch<MpPreapprovalResponse>("/preapproval", {
      method: "POST",
      body: JSON.stringify(mpBody),
    });

    const status = mapMpPreapprovalStatus(preapproval.status);
    const periodEnd = preapproval.next_payment_date || null;

    console.log("[SUBSCRIPTIONS-CHECKOUT] MP preapproval", {
      id: preapproval.id,
      mpStatus: preapproval.status,
      mappedStatus: status,
      periodEnd,
    });

    const planInfo = {
      planTier: tier,
      billingPeriod: period,
      studentLimit: planOption.studentLimit,
    };

    const row = {
      user_id: auth.userId,
      mp_preapproval_id: preapproval.id,
      mp_plan_id: preapproval.preapproval_plan_id || mpBody.preapproval_plan_id || null,
      status,
      current_period_end: periodEnd,
      grace_period_end: null,
      plan_tier: tier,
      billing_period: period,
      student_limit: planOption.studentLimit,
      payment_failure_count: 0,
      updated_at: new Date().toISOString(),
    };

    if (existing?.id) {
      const { error: updateError } = await supabase
        .from("subscriptions")
        .update(row)
        .eq("id", existing.id);

      if (updateError) {
        throw new Error(updateError.message);
      }
    } else {
      const { error: insertError } = await supabase.from("subscriptions").insert(row);
      if (insertError) {
        throw new Error(insertError.message);
      }
    }

    await setUserAccess(auth.userId, status, periodEnd, planInfo);

    console.log("[SUBSCRIPTIONS-CHECKOUT] setUserAccess aplicado", {
      userId: auth.userId,
      status,
      accessGranted: status === "authorized",
    });

    return NextResponse.json({
      success: true,
      status,
      planTier: tier,
      billingPeriod: period,
      studentLimit: planOption.studentLimit,
      initPoint: preapproval.init_point || null,
      notificationUrl: mpBody.notification_url,
    });

  } catch (err: unknown) {

    const message = err instanceof Error ? err.message : "Erro interno";

    console.error("[SUBSCRIPTIONS-CHECKOUT]", err);

    return NextResponse.json({ error: message }, { status: 500 });

  }

}

