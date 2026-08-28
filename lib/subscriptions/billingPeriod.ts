import type { BillingPeriod, PlanTier } from "@/lib/subscriptions/plans";
import {
  PLANS,
  isValidPlanCombo,
  isMpTestDailyCycleEnabled,
} from "@/lib/subscriptions/plans";

/** Meses do ciclo conforme billing_period (e plano, se informado). */
export function getBillingFrequencyMonths(
  billingPeriod: string | null | undefined,
  planTier?: string | null,
): number {
  if (
    planTier &&
    billingPeriod &&
    isValidPlanCombo(planTier, billingPeriod)
  ) {
    return PLANS[planTier as PlanTier].billing[billingPeriod as BillingPeriod]!
      .mpFrequencyMonths;
  }

  switch (billingPeriod) {
    case "yearly":
      return 12;
    case "semester":
      return 6;
    default:
      return 1;
  }
}

/** true quando o checkout/renovação do plano TESTE usa ciclo diário (QA). */
export function shouldUseDailyBillingCycle(planTier?: string | null): boolean {
  return planTier === "test" && isMpTestDailyCycleEnabled();
}

/**
 * Calcula o fim do período a partir do pagamento aprovado.
 * Se já houver period_end futuro, estende a partir dele (renovação);
 * senão, a partir da data de aprovação.
 * Com MP_TEST_DAILY_CYCLE + tier test → +1 dia (não +meses).
 */
export function computePeriodEndFromPayment(opts: {
  dateApproved?: string | null;
  existingPeriodEnd?: string | null;
  billingPeriod?: string | null;
  planTier?: string | null;
}): string {
  const approved = opts.dateApproved ? new Date(opts.dateApproved) : new Date();
  const existing = opts.existingPeriodEnd
    ? new Date(opts.existingPeriodEnd)
    : null;

  const base =
    existing && !Number.isNaN(existing.getTime()) && existing.getTime() > approved.getTime()
      ? existing
      : approved;

  const end = new Date(base.getTime());

  if (shouldUseDailyBillingCycle(opts.planTier)) {
    end.setDate(end.getDate() + 1);
    return end.toISOString();
  }

  const months = getBillingFrequencyMonths(opts.billingPeriod, opts.planTier);
  end.setMonth(end.getMonth() + months);
  return end.toISOString();
}

/**
 * Fim de acesso ao cancelar: não é imediato.
 * Usa current_period_end se ainda for futuro (>1 dia, ou >1h no ciclo diário);
 * senão, agora + duração do ciclo.
 */
export function resolveAccessUntilOnCancel(opts: {
  currentPeriodEnd?: string | null;
  billingPeriod?: string | null;
  planTier?: string | null;
  now?: Date;
}): string {
  const now = opts.now ?? new Date();
  const daily = shouldUseDailyBillingCycle(opts.planTier);
  const minFutureMs = now.getTime() + (daily ? 60 * 60 * 1000 : 24 * 60 * 60 * 1000);
  const existing = opts.currentPeriodEnd ? new Date(opts.currentPeriodEnd) : null;

  if (existing && !Number.isNaN(existing.getTime()) && existing.getTime() > minFutureMs) {
    return existing.toISOString();
  }

  return computePeriodEndFromPayment({
    dateApproved: now.toISOString(),
    existingPeriodEnd: null,
    billingPeriod: opts.billingPeriod,
    planTier: opts.planTier,
  });
}

/**
 * Normaliza next_payment_date do MP: se ausente ou pouco no futuro,
 * calcula pelo ciclo do plano (mensal/anual; semestral só legado; ou diário QA).
 */
export function resolvePeriodEndFromMp(opts: {
  nextPaymentDate?: string | null;
  billingPeriod?: string | null;
  planTier?: string | null;
  now?: Date;
}): string {
  const now = opts.now ?? new Date();
  const daily = shouldUseDailyBillingCycle(opts.planTier);
  // Ciclo diário: aceita next_payment mesmo ~horas à frente
  const minFutureMs = now.getTime() + (daily ? 30 * 60 * 1000 : 24 * 60 * 60 * 1000);
  const next = opts.nextPaymentDate ? new Date(opts.nextPaymentDate) : null;

  if (next && !Number.isNaN(next.getTime()) && next.getTime() > minFutureMs) {
    return next.toISOString();
  }

  return computePeriodEndFromPayment({
    dateApproved: now.toISOString(),
    existingPeriodEnd: null,
    billingPeriod: opts.billingPeriod,
    planTier: opts.planTier,
  });
}
