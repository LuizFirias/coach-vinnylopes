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
  isFreeTierProfile,
  FREE_TIER_STUDENT_LIMIT,
  type BillingPeriod,
  type PlanTier,
} from "@/lib/subscriptions/plans";
import { getSiteUrl } from "@/lib/subscriptions/siteUrl";
import { resolveAccessUntilOnCancel } from "@/lib/subscriptions/billingPeriod";
import { setUserAccess } from "@/lib/access/setUserAccess";
import { isAsaasTrialEligible } from "@/lib/asaas/trialEligibility";

/**
 * GET /api/subscriptions/status
 *
 * Fonte de verdade: tabelas locais `subscriptions` + `profiles`, atualizadas pelo
 * checkout transparente Asaas e pelos webhooks Asaas (não há GET live na API Asaas
 * a cada poll — isso seria caro e redundante com o webhook).
 *
 * Status internos (`authorized`, `canceling`, etc.) são o modelo Auron, mapeados
 * a partir do Asaas em `lib/asaas/statusMapping.ts`. Provider legado mercadopago
 * ainda pode existir em linhas antigas, mas novas assinaturas são `provider=asaas`.
 */
export async function GET(req: Request) {
  try {
    const auth = await getAuthenticatedCoach(req);
    if ("error" in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const siteUrl = getSiteUrl();
    const plans = getPlansCatalog();

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
        publicKey: null,
        plans,
        currentPlan: null,
        provider: null,
      });
    }

    const supabase = getSupabaseAdmin();
    const [subscriptionResult, profileResult, activeStudentCount] = await Promise.all([
      // Prefere Asaas; se não houver, cai na mais recente (legado MP).
      supabase
        .from("subscriptions")
        .select("*")
        .eq("user_id", auth.userId)
        .order("created_at", { ascending: false })
        .limit(5),
      supabase
        .from("profiles")
        .select(
          "subscription_active, plan_tier, billing_period, student_limit, account_type, trial_ativo, trial_fim, trial_pendente_cartao, asaas_card_token",
        )
        .eq("id", auth.userId)
        .maybeSingle(),
      getActiveStudentCount(auth.userId),
    ]);

    let profile = profileResult.data as {
      subscription_active?: boolean | null;
      plan_tier?: string | null;
      billing_period?: string | null;
      student_limit?: number | null;
      account_type?: string | null;
      trial_ativo?: boolean | null;
      trial_fim?: string | null;
      trial_pendente_cartao?: boolean | null;
      asaas_card_token?: string | null;
    } | null;

    if (profileResult.error) {
      console.error("[subscriptions/status] profile:", profileResult.error.message);
      if (
        profileResult.error.message?.includes("trial_") ||
        profileResult.error.message?.includes("asaas_card_token")
      ) {
        const fallback = await supabase
          .from("profiles")
          .select("subscription_active, plan_tier, billing_period, student_limit, account_type")
          .eq("id", auth.userId)
          .maybeSingle();
        if (fallback.error) {
          return NextResponse.json(
            { error: fallback.error.message || "Erro ao carregar perfil" },
            { status: 500 },
          );
        }
        profile = fallback.data
          ? {
              ...fallback.data,
              trial_ativo: false,
              trial_fim: null,
              trial_pendente_cartao: false,
              asaas_card_token: null,
            }
          : null;
      } else {
        return NextResponse.json(
          { error: profileResult.error.message || "Erro ao carregar perfil" },
          { status: 500 },
        );
      }
    }

    if (subscriptionResult.error) {
      return NextResponse.json(
        { error: subscriptionResult.error.message || "Erro ao carregar assinatura" },
        { status: 500 },
      );
    }

    const rows = subscriptionResult.data ?? [];
    let subscription =
      rows.find((r) => r.provider === "asaas") ?? rows[0] ?? null;

    // Repara canceling com period_end “curto” (ex.: data da assinatura/hoje)
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

        await setUserAccess(auth.userId, "canceling", fixedEnd, planInfo, null);
        subscription = { ...subscription, current_period_end: fixedEnd };
      }
    }

    // Acesso pela linha de subscription (status Auron: authorized/canceling/past_due…)
    const accessFromSubscription = subscription
      ? isAccessGranted(
          subscription.status,
          subscription.current_period_end,
          subscription.grace_period_end,
        )
      : false;

    // Freemium / parceiro / teste: profiles.subscription_active
    const isActive = hasActiveAccess(profile ?? {}) || accessFromSubscription;
    const accountType = profile?.account_type ?? "padrao";
    const provider = (subscription?.provider as string | null) ?? null;

    console.log("[subscriptions/status]", {
      userId: auth.userId,
      isActive,
      profileSubscriptionActive: profile?.subscription_active ?? null,
      accessFromSubscription,
      provider,
      subscriptionStatus: subscription?.status ?? null,
      asaasSubscriptionId: subscription?.asaas_subscription_id ?? null,
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

    const trialEligible = await isAsaasTrialEligible(auth.userId);

    const freeTier = isFreeTierProfile({
      plan_tier: planTier,
      student_limit: studentLimit ?? FREE_TIER_STUDENT_LIMIT,
      subscription_active: profile?.subscription_active,
      account_type: accountType,
    });

    return NextResponse.json({
      subscription: subscription || null,
      isActive,
      accountType,
      isSuperAdmin: false,
      planTier,
      billingPeriod,
      studentLimit: studentLimit ?? (freeTier ? FREE_TIER_STUDENT_LIMIT : null),
      activeStudentCount,
      siteUrl,
      /** Brick MP removido — campo mantido null por compat com clients antigos */
      publicKey: null,
      provider,
      plans,
      currentPlan,
      gracePeriodEnd,
      effectiveAccessEnd,
      trialAtivo: Boolean(profile?.trial_ativo),
      trialFim: profile?.trial_fim ?? null,
      trialPendenteCartao: Boolean(profile?.trial_pendente_cartao),
      trialEligible,
      hasSavedCard: Boolean(profile?.asaas_card_token),
      savedCardLastFour: subscription?.card_last_four ?? null,
      isFreeTier: freeTier,
      testPlanEnabled: isTestPlanEnabled(),
      testDailyCycle: isMpTestDailyCycleEnabled(),
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Erro interno";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
