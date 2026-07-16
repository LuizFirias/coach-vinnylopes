export type PlanTier = "start" | "pro" | "elite" | "test";
export type BillingPeriod = "monthly" | "semester" | "yearly";

export interface PlanBillingOption {
  price: number;
  priceDisplay: string;
  periodLabel: string;
  mpFrequencyMonths: number;
}

export interface PlanDefinition {
  tier: PlanTier;
  label: string;
  studentLimit: number;
  description: string;
  features: string[];
  billing: Partial<Record<BillingPeriod, PlanBillingOption>>;
  /** Destaque visual (ex.: plano QA em vermelho). */
  accent?: "danger";
}

/** Tiers comerciais (sem o plano de teste R$5). */
export const PLAN_TIERS: PlanTier[] = ["start", "pro", "elite"];

/**
 * Plano QA R$5. Aceita NEXT_PUBLIC_SHOW_TEST_PLAN ou SHOW_TEST_PLAN.
 * Usa acesso por colchetes para não “congelar” o valor no build do Next.
 */
export function isTestPlanEnabled(): boolean {
  const raw =
    process.env["NEXT_PUBLIC_SHOW_TEST_PLAN"] ??
    process.env["SHOW_TEST_PLAN"] ??
    "";
  const v = String(raw).trim().toLowerCase();
  return v === "true" || v === "1" || v === "yes";
}

/** Inclui o plano TESTE quando a flag de QA estiver ativa. */
export function getVisiblePlanTiers(): PlanTier[] {
  if (isTestPlanEnabled()) {
    return ["test", ...PLAN_TIERS];
  }
  return PLAN_TIERS;
}

export const BILLING_PERIOD_LABELS: Record<BillingPeriod, string> = {
  monthly: "Mensal",
  semester: "Semestral",
  yearly: "Anual",
};

export const PLANS: Record<PlanTier, PlanDefinition> = {
  test: {
    tier: "test",
    label: "TESTE",
    studentLimit: 30,
    description: "Plano QA — R$ 5 (mesmo benefício do START). Remover após validação.",
    accent: "danger",
    features: [
      "Até 30 alunos ativos",
      "Treinos e nutrição",
      "Relatórios básicos",
      "Biblioteca de exercícios",
    ],
    billing: {
      monthly: {
        price: 5,
        priceDisplay: "R$ 5,00/mês",
        periodLabel: "Mensal",
        mpFrequencyMonths: 1,
      },
    },
  },
  start: {
    tier: "start",
    label: "START",
    studentLimit: 30,
    description: "Ideal para começar sua consultoria",
    features: [
      "Até 30 alunos ativos",
      "Treinos e nutrição",
      "Relatórios básicos",
      "Biblioteca de exercícios",
    ],
    billing: {
      monthly: {
        price: 39.9,
        priceDisplay: "R$ 39,90/mês",
        periodLabel: "Mensal",
        mpFrequencyMonths: 1,
      },
      semester: {
        price: 149.9,
        priceDisplay: "R$ 149,90/semestre",
        periodLabel: "Semestral",
        mpFrequencyMonths: 6,
      },
      yearly: {
        price: 249.9,
        priceDisplay: "R$ 249,90/ano",
        periodLabel: "Anual",
        mpFrequencyMonths: 12,
      },
    },
  },
  pro: {
    tier: "pro",
    label: "PRO",
    studentLimit: 150,
    description: "Para coaches em crescimento",
    features: [
      "Até 150 alunos ativos",
      "Tudo do START",
      "Relatórios avançados",
      "Suporte prioritário",
    ],
    billing: {
      monthly: {
        price: 64.9,
        priceDisplay: "R$ 64,90/mês",
        periodLabel: "Mensal",
        mpFrequencyMonths: 1,
      },
      yearly: {
        price: 549.9,
        priceDisplay: "R$ 549,90/ano",
        periodLabel: "Anual",
        mpFrequencyMonths: 12,
      },
    },
  },
  elite: {
    tier: "elite",
    label: "ELITE",
    studentLimit: 500,
    description: "Escala profissional sem limites práticos",
    features: [
      "Até 500 alunos ativos",
      "Tudo do PRO",
      "Gestão em escala",
      "Suporte dedicado",
    ],
    billing: {
      monthly: {
        price: 114.9,
        priceDisplay: "R$ 114,90/mês",
        periodLabel: "Mensal",
        mpFrequencyMonths: 1,
      },
      semester: {
        price: 519.9,
        priceDisplay: "R$ 519,90/semestre",
        periodLabel: "Semestral",
        mpFrequencyMonths: 6,
      },
      yearly: {
        price: 879.9,
        priceDisplay: "R$ 879,90/ano",
        periodLabel: "Anual",
        mpFrequencyMonths: 12,
      },
    },
  },
};

export function isValidPlanCombo(tier: string, period: string): tier is PlanTier {
  const allVariants: PlanTier[] = ["test", "start", "pro", "elite"];
  if (!allVariants.includes(tier as PlanTier)) return false;
  if (tier === "test" && !isTestPlanEnabled()) {
    return false;
  }
  return Boolean(PLANS[tier as PlanTier].billing[period as BillingPeriod]);
}

export function getPlanOption(tier: PlanTier, period: BillingPeriod): PlanBillingOption & {
  tier: PlanTier;
  label: string;
  studentLimit: number;
  period: BillingPeriod;
  reason: string;
} {
  const plan = PLANS[tier];
  const billing = plan.billing[period];
  if (!billing) {
    throw new Error(`Combinação inválida: ${tier} + ${period}`);
  }
  return {
    ...billing,
    tier,
    label: plan.label,
    studentLimit: plan.studentLimit,
    period,
    reason: `AuronFit ${plan.label} — ${billing.periodLabel}`,
  };
}

export function getPlanLabel(tier: PlanTier | string | null | undefined): string {
  if (!tier || !(tier in PLANS)) return "AuronFit";
  return PLANS[tier as PlanTier].label;
}

export function getBillingPeriodsForTier(tier: PlanTier): BillingPeriod[] {
  return Object.keys(PLANS[tier].billing) as BillingPeriod[];
}

/** Chave de env opcional para preapproval_plan_id pré-criado no MP */
export function getMpPlanEnvKey(tier: PlanTier, period: BillingPeriod): string {
  return `MP_PLAN_${tier.toUpperCase()}_${period.toUpperCase()}_ID`;
}

export function getPlansCatalog() {
  return getVisiblePlanTiers().map((tier) => {
    const plan = PLANS[tier];
    return {
      tier,
      label: plan.label,
      studentLimit: plan.studentLimit,
      description: plan.description,
      features: plan.features,
      accent: plan.accent ?? null,
      billingOptions: getBillingPeriodsForTier(tier).map((period) => ({
        period,
        ...plan.billing[period]!,
        periodLabel: BILLING_PERIOD_LABELS[period],
      })),
    };
  });
}

export function formatStudentUsage(count: number, limit: number | null): string {
  if (limit == null) return `${count} alunos`;
  return `${count}/${limit} alunos`;
}

/** Meses do ciclo (1 / 6 / 12). */
export function getBillingMonths(period: BillingPeriod): number {
  if (period === "yearly") return 12;
  if (period === "semester") return 6;
  return 1;
}

/** Equivalente mensal do preço total do ciclo. */
export function getMonthlyEquivalent(totalPrice: number, period: BillingPeriod): number {
  const months = getBillingMonths(period);
  return totalPrice / months;
}

export function formatCurrencyBRL(value: number): string {
  return value.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

/** Economia % vs pagar mensal o mesmo número de meses. */
export function getPeriodSavingsPercent(
  periodPrice: number,
  monthlyPrice: number,
  period: BillingPeriod,
): number {
  const months = getBillingMonths(period);
  if (months <= 1) return 0;
  const fullMonthly = monthlyPrice * months;
  if (fullMonthly <= periodPrice) return 0;
  return Math.round((1 - periodPrice / fullMonthly) * 100);
}
