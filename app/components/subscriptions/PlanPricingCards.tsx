"use client";

import { useEffect, useState } from "react";
import { Check } from "@phosphor-icons/react";
import { cn } from "@/lib/utils/cn";
import {
  formatCurrencyBRL,
  formatPlanStudentCap,
  getMonthlyEquivalent,
  YEARLY_PROMO_COPY,
  type BillingPeriod,
  type PlanTier,
} from "@/lib/subscriptions/plans";
import { isNativeApp } from "@/lib/platform/isNativeApp";

export type PlanPricingCatalogItem = {
  tier: PlanTier;
  label: string;
  studentLimit: number;
  unlimitedStudents?: boolean;
  studentCapLabel?: string;
  features: string[];
  featured?: boolean;
  accent?: "danger" | null;
  billingOptions: {
    period: BillingPeriod;
    periodLabel: string;
    price: number;
    priceDisplay: string;
  }[];
};

type Props = {
  plans: PlanPricingCatalogItem[];
  period: BillingPeriod;
  onPeriodChange: (period: BillingPeriod) => void;
  onSelectPlan: (tier: PlanTier, period: BillingPeriod) => void;
  /** CTA quando elegível a trial (cartão). */
  trialEligible?: boolean;
  className?: string;
};

function priceForPeriod(
  plan: PlanPricingCatalogItem,
  period: BillingPeriod,
): { total: number; monthlyEq: number } | null {
  const opt = plan.billingOptions.find((b) => b.period === period);
  if (!opt) return null;
  return {
    total: opt.price,
    monthlyEq: getMonthlyEquivalent(opt.price, period),
  };
}

function capLine(plan: PlanPricingCatalogItem): string {
  if (plan.unlimitedStudents) return "alunos ilimitados";
  const cap =
    plan.studentCapLabel ?? formatPlanStudentCap(plan.tier, plan.studentLimit);
  if (cap.toLowerCase().startsWith("até ")) {
    return `${cap.toLowerCase()} ativos`;
  }
  return `${cap.toLowerCase()} ativos`;
}

function PlanCard({
  plan,
  period,
  featured,
  ctaLabel,
  onSelect,
}: {
  plan: PlanPricingCatalogItem;
  period: BillingPeriod;
  featured: boolean;
  ctaLabel: string;
  onSelect: () => void;
}) {
  const pricing = priceForPeriod(plan, period);
  if (!pricing) return null;

  const displayPrice = period === "yearly" ? pricing.monthlyEq : pricing.total;
  const isTest = plan.tier === "test" || plan.accent === "danger";

  return (
    <div
      className={cn(
        "relative flex h-full flex-col overflow-visible rounded-2xl bg-surface-1 p-6",
        featured
          ? "border-2 border-brand pt-8"
          : "border border-border-card-hover",
        isTest && "border-danger/40",
      )}
    >
      {featured && (
        <span className="absolute -top-3 left-1/2 z-10 -translate-x-1/2 whitespace-nowrap rounded-full bg-brand px-3 py-1 text-xs font-bold text-white">
          Mais popular
        </span>
      )}

      <p
        className={cn(
          "text-lg font-semibold text-text-primary",
          isTest && "text-danger",
        )}
      >
        {plan.label}
      </p>

      <div className="mt-3 flex items-baseline gap-1">
        <span className="text-4xl font-black tabular-nums lining-nums tracking-[-0.03em] text-text-primary">
          {formatCurrencyBRL(displayPrice)}
        </span>
        <span className="text-sm text-text-secondary">/mês</span>
      </div>

      {period === "yearly" && (
        <p className="mt-0.5 text-xs text-text-tertiary">
          {formatCurrencyBRL(pricing.total)} cobrado uma vez por ano
        </p>
      )}

      <p className="mt-1 text-xs font-medium text-brand">{capLine(plan)}</p>

      <ul className="mt-5 flex flex-col gap-2.5">
        {plan.features.map((f) => (
          <li
            key={f}
            className="flex items-start gap-2 text-sm text-text-secondary"
          >
            <Check
              size={16}
              weight="bold"
              className="mt-0.5 shrink-0 text-brand"
              aria-hidden
            />
            <span>{f}</span>
          </li>
        ))}
      </ul>

      {/* CTA fora de flex-1 — sempre no rodapé, altura fixa */}
      <div className="mt-auto pt-6">
        <button
          type="button"
          onClick={onSelect}
          className="flex h-12 w-full shrink-0 items-center justify-center rounded-[10px] text-sm font-bold text-white shadow-btn-glow"
          style={{
            background: "var(--btn-primary-bg)",
            color: "var(--text-on-brand)",
          }}
        >
          {ctaLabel}
        </button>
      </div>
    </div>
  );
}

export function PlanPricingCards({
  plans,
  period,
  onPeriodChange,
  onSelectPlan,
  trialEligible = true,
  className,
}: Props) {
  const [native, setNative] = useState(false);
  useEffect(() => {
    setNative(isNativeApp());
  }, []);

  const ctaLabel = trialEligible
    ? "Liberar 30 dias grátis"
    : "Assinar agora";

  const commercial = plans.filter((p) =>
    p.billingOptions.some((b) => b.period === period),
  );

  return (
    <div className={cn("flex flex-col gap-6", className)}>
      <div className="mx-auto flex w-fit rounded-full bg-surface-1 p-1">
        <button
          type="button"
          onClick={() => onPeriodChange("monthly")}
          className={cn(
            "rounded-full px-4 py-2 text-sm font-medium transition-colors",
            period === "monthly"
              ? "bg-brand text-white"
              : "text-text-secondary hover:text-text-primary",
          )}
        >
          Mensal
        </button>
        <button
          type="button"
          onClick={() => onPeriodChange("yearly")}
          className={cn(
            "flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-medium transition-colors",
            period === "yearly"
              ? "bg-brand text-white"
              : "text-text-secondary hover:text-text-primary",
          )}
        >
          Anual
          <span
            className={cn(
              "rounded-full px-1.5 py-0.5 text-[10px] font-bold",
              period === "yearly"
                ? "bg-white/20 text-white"
                : "bg-success/15 text-success",
            )}
          >
            2 meses grátis
          </span>
        </button>
      </div>

      {period === "yearly" && (
        <p className="text-center text-[11px] font-semibold text-brand">
          {YEARLY_PROMO_COPY}
        </p>
      )}

      {native ? (
        <div className="rounded-xl border border-border-subtle bg-surface-1 p-4 text-center">
          <p className="text-sm leading-relaxed text-text-secondary">
            Para assinar um plano, acesse{" "}
            <span className="font-semibold text-brand">auronfit.com.br</span>{" "}
            pelo navegador do seu celular ou computador.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 items-stretch gap-6 md:grid-cols-3 md:gap-6">
          {commercial.map((plan) => {
            const featured = Boolean(plan.featured) || plan.tier === "pro";
            return (
              <PlanCard
                key={plan.tier}
                plan={plan}
                period={period}
                featured={featured}
                ctaLabel={ctaLabel}
                onSelect={() => onSelectPlan(plan.tier, period)}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
