import type { BillingPeriod, PlanTier } from "@/lib/subscriptions/plans";
import { PLANS, isValidPlanCombo } from "@/lib/subscriptions/plans";

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

/**
 * Calcula o fim do período a partir do pagamento aprovado.
 * Se já houver period_end futuro, estende a partir dele (renovação);
 * senão, a partir da data de aprovação.
 */
export function computePeriodEndFromPayment(opts: {
  dateApproved?: string | null;
  existingPeriodEnd?: string | null;
  billingPeriod?: string | null;
  planTier?: string | null;
}): string {
  const months = getBillingFrequencyMonths(opts.billingPeriod, opts.planTier);
  const approved = opts.dateApproved ? new Date(opts.dateApproved) : new Date();
  const existing = opts.existingPeriodEnd
    ? new Date(opts.existingPeriodEnd)
    : null;

  const base =
    existing && !Number.isNaN(existing.getTime()) && existing.getTime() > approved.getTime()
      ? existing
      : approved;

  const end = new Date(base.getTime());
  end.setMonth(end.getMonth() + months);
  return end.toISOString();
}
