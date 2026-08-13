/** Limite do plano gratuito (coach novo, sem assinatura paga). */
export const FREE_TIER_STUDENT_LIMIT = 3;

export type PlanTier = "iniciante" | "start" | "pro" | "elite" | "test";
/** `semester` permanece só para assinaturas legadas em leitura; novas vendas: monthly | yearly. */
export type BillingPeriod = "monthly" | "semester" | "yearly";

/**
 * Conta no freemium: acesso ativo, sem plan_tier pago (START/PRO/ELITE).
 * Usado na UI de assinatura para mostrar upgrade em vez de "Meu plano".
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
  /** Teto técnico usado em validações / banco (ELITE usa valor alto, UI mostra "Ilimitado"). */
  studentLimit: number;
  /** Se true, UI/marketing exibe "Ilimitado" em vez do teto técnico. */
  unlimitedStudents?: boolean;
  description: string;
  features: string[];
  billing: Partial<Record<BillingPeriod, PlanBillingOption>>;
  /** Destaque visual (ex.: plano QA em vermelho). */
  accent?: "danger";
  /** Badge "Mais popular" nos cards de pricing. */
  featured?: boolean;
}

/** Tiers comerciais ofertado no checkout (spec: START / PRO / ELITE). */
export const PLAN_TIERS: PlanTier[] = ["start", "pro", "elite"];

/** Ciclos oferecidos no checkout (semestral removido). */
export const COMMERCIAL_BILLING_PERIODS: BillingPeriod[] = ["monthly", "yearly"];

/** Copy do desconto anual — modelo "pague 10, use 12". */
export const YEARLY_PROMO_COPY = "2 meses grátis — pague 10, use 12";

/**
 * Stand-by do plano QA R$5 na tela de assinaturas.
 * `true` = oculto (checkout também rejeita). Para nova rodada de QA:
 * setar false aqui + NEXT_PUBLIC_SHOW_TEST_PLAN=true (e redeploy).
 */
const TEST_PLAN_STANDBY = true;

/**
 * Plano QA R$5. Aceita NEXT_PUBLIC_SHOW_TEST_PLAN ou SHOW_TEST_PLAN.
 * Usa acesso por colchetes para não “congelar” o valor no build do Next.
 */
export function isTestPlanEnabled(): boolean {
  if (TEST_PLAN_STANDBY) return false;
  const raw =
    process.env["NEXT_PUBLIC_SHOW_TEST_PLAN"] ??
    process.env["SHOW_TEST_PLAN"] ??
    "";
  const v = String(raw).trim().toLowerCase();
  return v === "true" || v === "1" || v === "yes";
}

/**
 * QA: cobrança diária no plano TESTE (frequency_type=days).
 * Ativar só para validar renovação automática; desligar após o teste.
 * Env: MP_TEST_DAILY_CYCLE=true
 */
export function isMpTestDailyCycleEnabled(): boolean {
  const v = String(process.env["MP_TEST_DAILY_CYCLE"] ?? "")
    .trim()
    .toLowerCase();
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

/** Teto técnico do ELITE “ilimitado” — anti-abuso; não expor na UI. */
export const ELITE_TECHNICAL_STUDENT_LIMIT = 1000;

export const PLANS: Record<PlanTier, PlanDefinition> = {
  test: {
    tier: "test",
    label: "TESTE",
    studentLimit: 30,
    description: "Plano QA — R$ 5 (mesmo benefício do START). Remover após validação.",
    accent: "danger",
    features: [
      "Até 30 alunos ativos",
      "Auxílio de criação de treinos e nutrição com IA",
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
  iniciante: {
    tier: "iniciante",
    label: "INICIANTE",
    studentLimit: 15,
    description: "Plano legado — não ofertado em novas vendas",
    features: [
      "Até 15 alunos ativos",
      "Auxílio de criação de treinos e nutrição com IA",
      "Relatórios básicos",
      "Biblioteca de exercícios",
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
    description: "Ideal para consolidar sua consultoria",
    features: [
      "Até 30 alunos ativos",
      "Auxílio de criação de treinos e nutrição com IA",
      "Relatórios básicos",
      "Biblioteca de exercícios",
    ],
    billing: {
      monthly: {
        price: 47.9,
        priceDisplay: "R$ 47,90/mês",
        periodLabel: "Mensal",
        mpFrequencyMonths: 1,
      },
      // Legado — não ofertado no checkout
      semester: {
        price: 149.9,
        priceDisplay: "R$ 149,90/semestre",
        periodLabel: "Semestral",
        mpFrequencyMonths: 6,
      },
      yearly: {
        price: 479.0,
        priceDisplay: "R$ 479,00/ano",
        periodLabel: "Anual",
        mpFrequencyMonths: 12,
      },
    },
  },
  pro: {
    tier: "pro",
    label: "PRO",
    studentLimit: 150,
    featured: true,
    description: "Para personal trainers em crescimento",
    features: [
      "Até 150 alunos ativos",
      "Tudo do START",
      "Relatórios avançados",
      "Suporte prioritário",
      "Feedback personalizado",
    ],
    billing: {
      monthly: {
        price: 74.9,
        priceDisplay: "R$ 74,90/mês",
        periodLabel: "Mensal",
        mpFrequencyMonths: 1,
      },
      yearly: {
        price: 749.0,
        priceDisplay: "R$ 749,00/ano",
        periodLabel: "Anual",
        mpFrequencyMonths: 12,
      },
    },
  },
  elite: {
    tier: "elite",
    label: "ELITE",
    studentLimit: ELITE_TECHNICAL_STUDENT_LIMIT,
    unlimitedStudents: true,
    description: "Escala profissional sem limites práticos",
    features: [
      "Alunos ilimitados",
      "Tudo do PRO",
      "Gestão em escala",
      "Suporte dedicado",
    ],
    billing: {
      monthly: {
        price: 129.9,
        priceDisplay: "R$ 129,90/mês",
        periodLabel: "Mensal",
        mpFrequencyMonths: 1,
      },
      // Legado — não ofertado no checkout
      semester: {
        price: 452.9,
        priceDisplay: "R$ 452,90/semestre",
        periodLabel: "Semestral",
        mpFrequencyMonths: 6,
      },
      yearly: {
        price: 1299.0,
        priceDisplay: "R$ 1.299,00/ano",
        periodLabel: "Anual",
        mpFrequencyMonths: 12,
      },
    },
  },
};

export function isValidPlanCombo(tier: string, period: string): tier is PlanTier {
  const allVariants: PlanTier[] = ["test", "iniciante", "start", "pro", "elite"];
  if (!allVariants.includes(tier as PlanTier)) return false;
  // INICIANTE: legado — não ofertado em novas vendas
  if (tier === "iniciante") return false;
  if (tier === "test" && !isTestPlanEnabled()) {
    return false;
  }
  // Novas vendas: não oferece semestral (legado só em assinaturas já ativas)
  if (period === "semester") return false;
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
  return (Object.keys(PLANS[tier].billing) as BillingPeriod[]).filter(
    (p) => p !== "semester",
  );
}

/** Texto de limite para UI/marketing (ELITE → Ilimitado). */
export function formatPlanStudentCap(
  tier: PlanTier | string | null | undefined,
  limit?: number | null,
): string {
  if (tier && tier in PLANS && PLANS[tier as PlanTier].unlimitedStudents) {
    return "Ilimitado";
  }
  const n = limit ?? (tier && tier in PLANS ? PLANS[tier as PlanTier].studentLimit : null);
  if (n == null) return "—";
  return `Até ${n} alunos`;
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
      unlimitedStudents: Boolean(plan.unlimitedStudents),
      studentCapLabel: formatPlanStudentCap(tier, plan.studentLimit),
      description: plan.description,
      features: plan.features,
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

export function formatStudentUsage(count: number, limit: number | null): string {
  if (limit == null) return `${count} alunos`;
  if (limit >= ELITE_TECHNICAL_STUDENT_LIMIT) return `${count} · Ilimitado`;
  return `${count}/${limit} alunos`;
}

/** Meses do ciclo (1 / 6 legado / 12). */
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
