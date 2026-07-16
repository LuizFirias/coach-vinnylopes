import { NextResponse } from "next/server";

import { getAuthenticatedCoach } from "@/lib/auth/getAuthenticatedCoach";

import { buildMpPreapprovalBody, mpFetch, MpApiError, getMpCredentialDiagnostics } from "@/lib/mercadopago/client";

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
import { resolvePeriodEndFromMp } from "@/lib/subscriptions/billingPeriod";



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

    console.log("[checkout] notification_url enviado:", mpBody.notification_url, {
      siteUrl,
      tier,
      period,
      userId: auth.userId,
      hasCardToken: Boolean(cardTokenId),
      existingStatus: existing?.status ?? null,
    });

    const creds = getMpCredentialDiagnostics();
    console.log("[checkout] public key usada:", creds.publicKeyMasked);
    console.log("[checkout] access token usado:", creds.accessTokenMasked);
    console.log("[checkout] credenciais:", {
      nodeEnv: creds.nodeEnv,
      expectedMode: creds.expectedMode,
      publicKeyMode: creds.publicKeyMode,
      accessTokenMode: creds.accessTokenMode,
      pairMatch: creds.pairMatch,
    });
    if (!creds.pairMatch) {
      console.error(
        "[checkout] ALERTA: Public Key e Access Token parecem de ambientes diferentes (TEST vs APP_USR). Isso costuma causar token inválido no MP.",
      );
    }

    let preapproval: MpPreapprovalResponse;
    try {
      preapproval = await mpFetch<MpPreapprovalResponse>("/preapproval", {
        method: "POST",
        body: JSON.stringify(mpBody),
      });
    } catch (err: unknown) {
      if (err instanceof MpApiError) {
        console.error("[checkout] erro MP:", {
          status: err.status,
          path: err.path,
          causeCode: err.causeCode,
          message: err.message,
          body: err.body,
          credentials: {
            publicKey: creds.publicKeyMasked,
            accessToken: creds.accessTokenMasked,
            publicKeyMode: creds.publicKeyMode,
            accessTokenMode: creds.accessTokenMode,
            pairMatch: creds.pairMatch,
          },
          request: {
            tier,
            period,
            userId: auth.userId,
            notification_url: mpBody.notification_url,
            has_preapproval_plan_id: Boolean(mpBody.preapproval_plan_id),
            has_auto_recurring: Boolean(mpBody.auto_recurring),
          },
        });
        // 4xx do MP → 400 (mensagem real); 5xx do MP → 502
        const httpStatus = err.status >= 400 && err.status < 500 ? 400 : 502;
        return NextResponse.json(
          {
            error: err.message,
            mpStatus: err.status,
            mpCause: err.causeCode,
            mpBody: err.body,
            credentialPairMatch: creds.pairMatch,
            credentialMode: {
              publicKey: creds.publicKeyMode,
              accessToken: creds.accessTokenMode,
              expected: creds.expectedMode,
            },
          },
          { status: httpStatus },
        );
      }
      throw err;
    }

    const status = mapMpPreapprovalStatus(preapproval.status);
    const periodEnd = resolvePeriodEndFromMp({
      nextPaymentDate: preapproval.next_payment_date || null,
      billingPeriod: period,
      planTier: tier,
    });

    console.log("[SUBSCRIPTIONS-CHECKOUT] MP preapproval", {
      id: preapproval.id,
      mpStatus: preapproval.status,
      mappedStatus: status,
      mpNextPaymentDate: preapproval.next_payment_date || null,
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

    if (err instanceof MpApiError) {
      console.error("[checkout] erro MP (catch geral):", {
        status: err.status,
        path: err.path,
        causeCode: err.causeCode,
        message: err.message,
        body: err.body,
      });
      const httpStatus = err.status >= 400 && err.status < 500 ? 400 : 502;
      return NextResponse.json(
        {
          error: err.message,
          mpStatus: err.status,
          mpCause: err.causeCode,
          mpBody: err.body,
        },
        { status: httpStatus },
      );
    }

    console.error("[checkout] erro:", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

