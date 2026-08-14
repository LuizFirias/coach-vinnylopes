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
  /** Cards menores (gestão de assinatura — conteúdo dos planos ainda vai mudar). */
  compact?: boolean;
  /** Esconde o interruptor Mensal/Anual (quando o pai já mostra). */
  hidePeriodToggle?: boolean;
};

export function BillingCycleSwitcher({
  period,
  onPeriodChange,
}: {
  period: BillingPeriod;
  onPeriodChange: (period: BillingPeriod) => void;
}) {
  const monthly = period !== "yearly";
  return (
    <div className="flex h-10 min-w-[180px] flex-1 overflow-hidden rounded-lg border border-border-subtle sm:flex-initial">
      <button
        type="button"
        onClick={() => onPeriodChange("yearly")}
        className={cn(
          "flex-1 px-4 text-sm font-medium transition-colors touch-manipulation",
          !monthly
            ? "bg-brand/15 text-brand"
            : "bg-surface-1 text-text-secondary hover:text-text-primary",
        )}
      >
        Anual
      </button>
      <button
        type="button"
        onClick={() => onPeriodChange("monthly")}
        className={cn(
          "flex-1 px-4 text-sm font-medium transition-colors touch-manipulation",
          monthly
            ? "bg-brand/15 text-brand"
            : "bg-surface-1 text-text-secondary hover:text-text-primary",
        )}
      >
        Mensal
      </button>
    </div>
  );
}

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
  compact,
}: {
  plan: PlanPricingCatalogItem;
  period: BillingPeriod;
  featured: boolean;
  ctaLabel: string;
  onSelect: () => void;
  compact?: boolean;
}) {
  const pricing = priceForPeriod(plan, period);
  if (!pricing) return null;

  const displayPrice = period === "yearly" ? pricing.monthlyEq : pricing.total;
  const isTest = plan.tier === "test" || plan.accent === "danger";
  const features = compact ? plan.features.slice(0, 3) : plan.features;

  return (
    <div
      className={cn(
        "relative flex h-full flex-col overflow-visible rounded-2xl bg-surface-1",
        compact ? "auron-widget-shadow p-4" : "p-6",
        featured && !compact
          ? "border-2 border-brand pt-8"
          : featured && compact
            ? "border border-brand"
            : "border border-border-subtle",
        isTest && "border-danger/40",
      )}
    >
      {featured && !compact && (
        <span className="absolute -top-3 left-1/2 z-10 -translate-x-1/2 whitespace-nowrap rounded-full bg-brand px-3 py-1 text-xs font-bold text-white">
          Mais popular
        </span>
      )}

      <p
        className={cn(
          compact ? "text-base font-bold text-text-primary" : "text-lg font-semibold text-text-primary",
          isTest && "text-danger",
        )}
      >
        {plan.label}
      </p>

      <div className={cn("flex items-baseline gap-1", compact ? "mt-2" : "mt-3")}>
        <span
          className={cn(
            "font-black tabular-nums lining-nums tracking-[-0.03em] text-text-primary",
            compact ? "text-2xl" : "text-4xl",
          )}
        >
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

      <ul className={cn("flex flex-col", compact ? "mt-3 gap-1.5" : "mt-5 gap-2.5")}>
        {features.map((f) => (
          <li
            key={f}
            className={cn(
              "flex items-start gap-2 text-text-secondary",
              compact ? "text-xs" : "text-sm",
            )}
          >
            <Check
              size={compact ? 14 : 16}
              weight="bold"
              className="mt-0.5 shrink-0 text-brand"
              aria-hidden
            />
            <span>{f}</span>
          </li>
        ))}
      </ul>

      <div className={cn("mt-auto", compact ? "pt-4" : "pt-6")}>
        <button
          type="button"
          onClick={onSelect}
          className={cn(
            "flex w-full shrink-0 items-center justify-center rounded-[10px] font-bold text-white shadow-btn-glow",
            compact ? "h-10 text-xs" : "h-12 text-sm",
          )}
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
  compact = false,
  hidePeriodToggle = false,
}: Props) {
  const [native, setNative] = useState(false);
  useEffect(() => {
    setNative(isNativeApp());
  }, []);

  const commercial = plans.filter((p) =>
    p.billingOptions.some((b) => b.period === period),
  );

  return (
    <div className={cn("flex flex-col", compact ? "gap-4" : "gap-6", className)}>
      {!hidePeriodToggle && (
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
      )}

      {period === "yearly" && !compact && (
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
        <div
          className={cn(
            "grid grid-cols-1 items-stretch",
            compact
              ? "gap-3 sm:grid-cols-2 xl:grid-cols-3"
              : "gap-6 md:grid-cols-3",
          )}
        >
          {commercial.map((plan) => {
            const featured = Boolean(plan.featured) || plan.tier === "pro";
            const ctaLabel = compact
              ? `Assinar ${plan.label}`
              : trialEligible
                ? "Liberar 30 dias grátis"
                : "Assinar agora";
            return (
              <PlanCard
                key={plan.tier}
                plan={plan}
                period={period}
                featured={featured}
                compact={compact}
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
