import { NextResponse } from "next/server";

import { hasActiveAccess } from "@/lib/access/hasActiveAccess";
import { getAuthenticatedCoach } from "@/lib/auth/getAuthenticatedCoach";

import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

import { getEffectiveAccessEnd, isAccessGranted } from "@/lib/subscriptions/display";

import { getActiveStudentCount } from "@/lib/subscriptions/getActiveStudentCount";

import {
  getPlansCatalog,
  getPlanLabel,
  getPlanOption,
  isTestPlanEnabled,
  isMpTestDailyCycleEnabled,
} from "@/lib/subscriptions/plans";

import { getSiteUrl } from "@/lib/subscriptions/siteUrl";

import { resolveAccessUntilOnCancel } from "@/lib/subscriptions/billingPeriod";

import { setUserAccess } from "@/lib/access/setUserAccess";

import { getMpPublicKey } from "@/lib/mercadopago/client";

import type { BillingPeriod, PlanTier } from "@/lib/subscriptions/plans";



export async function GET(req: Request) {

  try {

    const auth = await getAuthenticatedCoach(req);

    if ("error" in auth) {

      return NextResponse.json({ error: auth.error }, { status: auth.status });

    }



    const siteUrl = getSiteUrl();

    const plans = getPlansCatalog();

    const publicKey = getMpPublicKey();



    if (auth.role === "super_admin") {

      const count = await getActiveStudentCount(auth.userId);

      return NextResponse.json({

        subscription: null,

        isActive: true,

        isSuperAdmin: true,

        planTier: null,

        billingPeriod: null,

        studentLimit: null,

        activeStudentCount: count,

        siteUrl,

        publicKey,

        plans,

        currentPlan: null,

      });

    }



    const supabase = getSupabaseAdmin();

    const [subscriptionResult, profileResult, activeStudentCount] = await Promise.all([

      supabase

        .from("subscriptions")

        .select("*")

        .eq("user_id", auth.userId)

        .order("created_at", { ascending: false })

        .limit(1)

        .maybeSingle(),

      supabase

        .from("profiles")

        .select("subscription_active, plan_tier, billing_period, student_limit, account_type")

        .eq("id", auth.userId)

        .single(),

      getActiveStudentCount(auth.userId),

    ]);



    let subscription = subscriptionResult.data;

    const profile = profileResult.data;

    // Repara canceling com period_end “curto” (ex.: data da assinatura/hoje)
    // para o coach não perder acesso no mesmo dia do cancelamento.
    if (subscription?.status === "canceling") {
      const fixedEnd = resolveAccessUntilOnCancel({
        currentPeriodEnd: subscription.current_period_end,
        billingPeriod: subscription.billing_period,
        planTier: subscription.plan_tier,
      });
      if (fixedEnd !== subscription.current_period_end) {
        await supabase
          .from("subscriptions")
          .update({
            current_period_end: fixedEnd,
            updated_at: new Date().toISOString(),
          })
          .eq("id", subscription.id);

        const planInfo =
          subscription.plan_tier &&
          subscription.billing_period &&
          subscription.student_limit != null
            ? {
                planTier: subscription.plan_tier as PlanTier,
                billingPeriod: subscription.billing_period as BillingPeriod,
                studentLimit: subscription.student_limit as number,
              }
            : null;

        await setUserAccess(
          auth.userId,
          "canceling",
          fixedEnd,
          planInfo,
          null,
        );

        subscription = { ...subscription, current_period_end: fixedEnd };
      }
    }

    const mpActive = subscription
      ? isAccessGranted(
          subscription.status,
          subscription.current_period_end,
          subscription.grace_period_end,
        )
      : Boolean(profile?.subscription_active);



    const isActive = hasActiveAccess(profile ?? {}) || mpActive;

    const accountType = profile?.account_type ?? "padrao";

    // TEMP debug — remover após validar webhook / polling
    console.log("[subscriptions/status]", {
      userId: auth.userId,
      isActive,
      profileSubscriptionActive: profile?.subscription_active ?? null,
      mpActive,
      subscriptionStatus: subscription?.status ?? null,
      accountType,
    });



    const planTier = (subscription?.plan_tier ?? profile?.plan_tier) as PlanTier | null;

    const billingPeriod = (subscription?.billing_period ??

      profile?.billing_period) as BillingPeriod | null;

    const studentLimit = subscription?.student_limit ?? profile?.student_limit ?? null;



    let currentPlan: {

      tier: PlanTier;

      period: BillingPeriod;

      label: string;

      priceDisplay: string;

      studentLimit: number;

    } | null = null;



    if (planTier && billingPeriod) {

      try {

        const option = getPlanOption(planTier, billingPeriod);

        currentPlan = {

          tier: planTier,

          period: billingPeriod,

          label: getPlanLabel(planTier),

          priceDisplay: option.priceDisplay,

          studentLimit: option.studentLimit,

        };

      } catch {

        currentPlan = null;

      }

    }



    const gracePeriodEnd = subscription?.grace_period_end ?? null;
    const effectiveAccessEnd = subscription
      ? getEffectiveAccessEnd(subscription.current_period_end, gracePeriodEnd)
      : null;

    return NextResponse.json({
      subscription: subscription || null,
      isActive,
      accountType,
      isSuperAdmin: false,
      planTier,
      billingPeriod,
      studentLimit,
      activeStudentCount,
      siteUrl,
      publicKey,
      plans,
      currentPlan,
      gracePeriodEnd,
      effectiveAccessEnd,
      /** debug QA — true se a flag liberar o card TESTE */
      testPlanEnabled: isTestPlanEnabled(),
      /** QA — ciclo diário no plano TESTE (MP_TEST_DAILY_CYCLE) */
      testDailyCycle: isMpTestDailyCycleEnabled(),
    });

  } catch (err: unknown) {

    const message = err instanceof Error ? err.message : "Erro interno";

    return NextResponse.json({ error: message }, { status: 500 });

  }

}

