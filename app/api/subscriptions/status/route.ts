import { NextResponse } from "next/server";

import { getAuthenticatedCoach } from "@/lib/auth/getAuthenticatedCoach";

import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

import { isAccessGranted } from "@/lib/subscriptions/display";

import { getActiveStudentCount } from "@/lib/subscriptions/getActiveStudentCount";

import { getPlansCatalog, getPlanLabel, getPlanOption } from "@/lib/subscriptions/plans";

import { getSiteUrl } from "@/lib/subscriptions/siteUrl";

import type { BillingPeriod, PlanTier } from "@/lib/subscriptions/plans";



function getMpPublicKey(): string | null {

  const isProd = process.env.NODE_ENV === "production";

  return isProd

    ? process.env.NEXT_PUBLIC_MP_PUBLIC_KEY || null

    : process.env.NEXT_PUBLIC_MP_PUBLIC_KEY_TEST ||

        process.env.NEXT_PUBLIC_MP_PUBLIC_KEY ||

        null;

}



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

        .select("subscription_active, plan_tier, billing_period, student_limit")

        .eq("id", auth.userId)

        .single(),

      getActiveStudentCount(auth.userId),

    ]);



    const subscription = subscriptionResult.data;

    const profile = profileResult.data;



    const isActive = subscription

      ? isAccessGranted(subscription.status, subscription.current_period_end)

      : Boolean(profile?.subscription_active);



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



    return NextResponse.json({

      subscription: subscription || null,

      isActive,

      isSuperAdmin: false,

      planTier,

      billingPeriod,

      studentLimit,

      activeStudentCount,

      siteUrl,

      publicKey,

      plans,

      currentPlan,

    });

  } catch (err: unknown) {

    const message = err instanceof Error ? err.message : "Erro interno";

    return NextResponse.json({ error: message }, { status: 500 });

  }

}

