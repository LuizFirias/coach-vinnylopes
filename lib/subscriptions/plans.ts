/** Limite do plano gratuito (coach novo, sem assinatura paga). */
export const FREE_TIER_STUDENT_LIMIT = 3;

export type PlanSlug = "start" | "pro";
/** `elite` só para linhas antigas até a migration 0077; leitura mapeia para PRO. */
export type PlanTier = "iniciante" | "start" | "pro" | "elite" | "test";
/** `semester` permanece só para assinaturas legadas em leitura; novas vendas: monthly | yearly. */
export type BillingPeriod = "monthly" | "semester" | "yearly";

export type PlanFeature = {
  text: string;
  included: boolean;
  highlight?: boolean;
};

/**
 * Conta no freemium: acesso ativo, sem plan_tier pago (START/PRO).
 */
export function isFreeTierProfile(profile: {
  plan_tier?: string | null;
  student_limit?: number | null;
  subscription_active?: boolean | null;
  account_type?: string | null;
}): boolean {
  const accountType = profile.account_type ?? "padrao";
  if (accountType === "teste" || accountType === "parceiro") return false;
  if (profile.plan_tier) return false;
  return (
    profile.subscription_active === true &&
    (profile.student_limit ?? 0) > 0 &&
    (profile.student_limit ?? 0) <= FREE_TIER_STUDENT_LIMIT
  );
}

export interface PlanBillingOption {
  price: number;
  priceDisplay: string;
  periodLabel: string;
  mpFrequencyMonths: number;
}

export interface PlanDefinition {
  tier: PlanTier;
  label: string;
  /** null = ilimitado (PRO). */
  studentLimit: number | null;
  unlimitedStudents?: boolean;
  hasAiDiet: boolean;
  description: string;
  features: PlanFeature[];
  cta: string;
  yearlySavings?: number;
  badge?: string;
  billing: Partial<Record<BillingPeriod, PlanBillingOption>>;
  accent?: "danger";
  featured?: boolean;
}

/** Tiers comerciais ofertado no checkout. */
export const PLAN_TIERS: PlanTier[] = ["start", "pro"];

/** Ciclos oferecidos no checkout (semestral removido). */
export const COMMERCIAL_BILLING_PERIODS: BillingPeriod[] = ["monthly", "yearly"];

/** Copy do desconto anual — modelo "pague 10, use 12". */
export const YEARLY_PROMO_COPY = "2 meses grátis — pague 10, use 12";

/**
 * Stand-by do plano QA R$5 na tela de assinaturas.
 */
const TEST_PLAN_STANDBY = true;

export function isTestPlanEnabled(): boolean {
  if (TEST_PLAN_STANDBY) return false;
  const raw =
    process.env["NEXT_PUBLIC_SHOW_TEST_PLAN"] ??
    process.env["SHOW_TEST_PLAN"] ??
    "";
  const v = String(raw).trim().toLowerCase();
  return v === "true" || v === "1" || v === "yes";
}

export function isMpTestDailyCycleEnabled(): boolean {
  const v = String(process.env["MP_TEST_DAILY_CYCLE"] ?? "")
    .trim()
    .toLowerCase();
  return v === "true" || v === "1" || v === "yes";
}

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

const START_FEATURES: PlanFeature[] = [
  { text: "Até 30 alunos", included: true },
  { text: "Fichas digitais de treino", included: true },
  { text: "Nutrição digital", included: true },
  { text: "Biblioteca de exercícios", included: true },
  { text: "App do aluno incluso", included: true },
  { text: "Relatórios básicos", included: true },
  { text: "IA de dietas inclusa", included: false },
];

const PRO_FEATURES: PlanFeature[] = [
  { text: "Alunos ilimitados", included: true },
  { text: "Tudo do START", included: true },
  { text: "IA de dietas inclusa", included: true, highlight: true },
  { text: "Relatórios avançados", included: true },
  { text: "Suporte prioritário", included: true },
];

export const PLANS: Record<PlanTier, PlanDefinition> = {
  test: {
    tier: "test",
    label: "TESTE",
    studentLimit: 30,
    hasAiDiet: false,
    description: "Plano QA — R$ 5 (mesmo benefício do START). Remover após validação.",
    accent: "danger",
    cta: "Assinar TESTE",
    features: START_FEATURES,
    billing: {
      monthly: {
        price: 5,
        priceDisplay: "R$ 5,00/mês",
        periodLabel: "Mensal",
        mpFrequencyMonths: 1,
      },
    },
  },
  iniciante: {
    tier: "iniciante",
    label: "INICIANTE",
    studentLimit: 15,
    hasAiDiet: false,
    description: "Plano legado — não ofertado em novas vendas",
    cta: "Assinar",
    features: [
      { text: "Até 15 alunos ativos", included: true },
      { text: "Relatórios básicos", included: true },
      { text: "Biblioteca de exercícios", included: true },
    ],
    billing: {
      monthly: {
        price: 24.9,
        priceDisplay: "R$ 24,90/mês",
        periodLabel: "Mensal",
        mpFrequencyMonths: 1,
      },
      semester: {
        price: 93.9,
        priceDisplay: "R$ 93,90/semestre",
        periodLabel: "Semestral",
        mpFrequencyMonths: 6,
      },
      yearly: {
        price: 249.0,
        priceDisplay: "R$ 249,00/ano",
        periodLabel: "Anual",
        mpFrequencyMonths: 12,
      },
    },
  },
  start: {
    tier: "start",
    label: "START",
    studentLimit: 30,
    hasAiDiet: false,
    description: "Ideal para consolidar sua consultoria",
    cta: "Começar grátis",
    yearlySavings: 78.8,
    features: START_FEATURES,
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
        price: 399.0,
        priceDisplay: "R$ 399,00/ano",
        periodLabel: "Anual",
        mpFrequencyMonths: 12,
      },
    },
  },
  pro: {
    tier: "pro",
    label: "PRO",
    studentLimit: null,
    unlimitedStudents: true,
    hasAiDiet: true,
    featured: true,
    badge: "Mais popular",
    description: "Para personal trainers em crescimento",
    cta: "Assinar PRO",
    yearlySavings: 118.8,
    features: PRO_FEATURES,
    billing: {
      monthly: {
        price: 59.9,
        priceDisplay: "R$ 59,90/mês",
        periodLabel: "Mensal",
        mpFrequencyMonths: 1,
      },
      yearly: {
        price: 599.0,
        priceDisplay: "R$ 599,00/ano",
        periodLabel: "Anual",
        mpFrequencyMonths: 12,
      },
    },
  },
  elite: {
    tier: "elite",
    label: "PRO",
    studentLimit: null,
    unlimitedStudents: true,
    hasAiDiet: true,
    description: "Migrado para PRO",
    cta: "Assinar PRO",
    features: PRO_FEATURES,
    billing: {
      monthly: {
        price: 59.9,
        priceDisplay: "R$ 59,90/mês",
        periodLabel: "Mensal",
        mpFrequencyMonths: 1,
      },
      yearly: {
        price: 599.0,
        priceDisplay: "R$ 599,00/ano",
        periodLabel: "Anual",
        mpFrequencyMonths: 12,
      },
    },
  },
};

/** Linhas antigas `elite` leem como PRO. */
export function resolvePlanTier(tier: string | null | undefined): PlanTier | null {
  if (!tier) return null;
  if (tier === "elite") return "pro";
  if (tier in PLANS) return tier as PlanTier;
  return null;
}

export function isValidPlanCombo(tier: string, period: string): tier is PlanTier {
  const allVariants: PlanTier[] = ["test", "iniciante", "start", "pro"];
  if (!allVariants.includes(tier as PlanTier)) return false;
  if (tier === "iniciante") return false;
  if (tier === "test" && !isTestPlanEnabled()) {
    return false;
  }
  if (period === "semester") return false;
  return Boolean(PLANS[tier as PlanTier].billing[period as BillingPeriod]);
}

export function getPlanOption(tier: PlanTier, period: BillingPeriod): PlanBillingOption & {
  tier: PlanTier;
  label: string;
  studentLimit: number | null;
  period: BillingPeriod;
  reason: string;
} {
  const resolved = resolvePlanTier(tier) ?? tier;
  const plan = PLANS[resolved];
  const billing = plan.billing[period];
  if (!billing) {
    throw new Error(`Combinação inválida: ${tier} + ${period}`);
  }
  return {
    ...billing,
    tier: resolved,
    label: plan.label,
    studentLimit: plan.studentLimit,
    period,
    reason: `AuronFit ${plan.label} — ${billing.periodLabel}`,
  };
}

export function getPlanLabel(tier: PlanTier | string | null | undefined): string {
  const resolved = resolvePlanTier(tier ?? null);
  if (!resolved) return "AURONFIT";
  return PLANS[resolved].label;
}

export function getPlanStudentLimit(slug: PlanSlug | PlanTier | string | null | undefined): number | null {
  const resolved = resolvePlanTier(slug ?? null);
  if (!resolved) return null;
  return PLANS[resolved].studentLimit ?? null;
}

export function isUnlimitedStudents(slug: PlanSlug | PlanTier | string | null | undefined): boolean {
  const resolved = resolvePlanTier(slug ?? null);
  return Boolean(resolved && PLANS[resolved].unlimitedStudents);
}

export function planHasAiDiet(slug: PlanSlug | PlanTier | string | null | undefined): boolean {
  const resolved = resolvePlanTier(slug ?? null);
  if (!resolved) return false;
  return PLANS[resolved].hasAiDiet ?? false;
}

export function getBillingPeriodsForTier(tier: PlanTier): BillingPeriod[] {
  const resolved = resolvePlanTier(tier) ?? tier;
  return (Object.keys(PLANS[resolved].billing) as BillingPeriod[]).filter(
    (p) => p !== "semester",
  );
}

export function formatPlanStudentCap(
  tier: PlanTier | string | null | undefined,
  limit?: number | null,
): string {
  const resolved = resolvePlanTier(tier ?? null);
  if (resolved && PLANS[resolved].unlimitedStudents) {
    return "Ilimitado";
  }
  const n = limit ?? (resolved ? PLANS[resolved].studentLimit : null);
  if (n == null) return "Ilimitado";
  return `Até ${n} alunos`;
}

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
      unlimitedStudents: Boolean(plan.unlimitedStudents),
      hasAiDiet: plan.hasAiDiet,
      studentCapLabel: formatPlanStudentCap(tier, plan.studentLimit),
      description: plan.description,
      features: plan.features,
      cta: plan.cta,
      badge: plan.badge ?? null,
      accent: plan.accent ?? null,
      featured: Boolean(plan.featured),
      billingOptions: getBillingPeriodsForTier(tier).map((period) => ({
        period,
        ...plan.billing[period]!,
        periodLabel: BILLING_PERIOD_LABELS[period],
      })),
    };
  });
}

export function formatStudentUsage(active: number, limit: number | null): string {
  if (limit === null) return `${active} alunos`;
  return `${active}/${limit} alunos`;
}

export function getYearlySavings(tier: PlanTier): number {
  const resolved = resolvePlanTier(tier) ?? tier;
  const explicit = PLANS[resolved].yearlySavings;
  if (explicit != null) return explicit;
  const monthly = PLANS[resolved].billing.monthly?.price;
  const yearly = PLANS[resolved].billing.yearly?.price;
  if (monthly == null || yearly == null) return 0;
  return Math.round((monthly * 12 - yearly) * 100) / 100;
}

export function getBillingMonths(period: BillingPeriod): number {
  if (period === "yearly") return 12;
  if (period === "semester") return 6;
  return 1;
}

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
