"use client";

import type { ReactNode } from "react";
import { CreditCard, Gift, Info } from "@phosphor-icons/react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { BackButton } from "@/app/components/ui/BackButton";
import {
  BillingCycleSwitcher,
  PlanPricingCards,
  type PlanPricingCatalogItem,
} from "@/app/components/subscriptions/PlanPricingCards";
import type { BillingPeriod, PlanTier } from "@/lib/subscriptions/plans";

export type StatusCardTone = "trial" | "ok" | "warn" | "danger" | "neutral";

export type StatusCardInfo = {
  title: string;
  subtitle: string;
  pill: string;
  tone: StatusCardTone;
};

type Props = {
  children?: ReactNode;
  onBack: () => void;
  backHref?: string;
  useBackClick: boolean;
  statusCard: StatusCardInfo;
  showManageActions: boolean;
  canCancel: boolean;
  onCancelClick: () => void;
  onAlterarPagamento: () => void;
  cardLastFour: string | null;
  billingName: string;
  onBillingName: (v: string) => void;
  cpfCnpj: string;
  onCpfCnpj: (v: string) => void;
  billingAddress: string;
  onBillingAddress: (v: string) => void;
  billingCity: string;
  onBillingCity: (v: string) => void;
  billingCep: string;
  onBillingCep: (v: string) => void;
  catalogPeriod: BillingPeriod;
  onPeriodChange: (period: BillingPeriod) => void;
  couponOpen: boolean;
  onToggleCoupon: () => void;
  coupon: string;
  onCoupon: (v: string) => void;
  couponMsg: string | null;
  onApplyCoupon: () => void;
  plans: PlanPricingCatalogItem[];
  onSelectPlan: (tier: PlanTier, period: BillingPeriod) => void;
  trialEligible: boolean;
  checkout: ReactNode;
  pendingBlock: ReactNode;
};

const fieldClass =
  "h-11 w-full rounded-[10px] border border-border-subtle bg-surface-1 px-3.5 text-[16px] font-normal text-text-primary placeholder:text-text-disabled focus:outline-none focus:ring-1 focus:ring-brand/30";

export function AssinaturaGestaoScreen({
  children,
  onBack,
  backHref = "/admin/perfil",
  useBackClick,
  statusCard,
  showManageActions,
  canCancel,
  onCancelClick,
  onAlterarPagamento,
  cardLastFour,
  billingName,
  onBillingName,
  cpfCnpj,
  onCpfCnpj,
  billingAddress,
  onBillingAddress,
  billingCity,
  onBillingCity,
  billingCep,
  onBillingCep,
  catalogPeriod,
  onPeriodChange,
  couponOpen,
  onToggleCoupon,
  coupon,
  onCoupon,
  couponMsg,
  onApplyCoupon,
  plans,
  onSelectPlan,
  trialEligible,
  checkout,
  pendingBlock,
}: Props) {
  return (
    <div className="auron-settings-page min-h-screen bg-surface-0 pb-24 lg:pl-28">
      <div className="mx-auto w-full max-w-[min(1400px,96vw)] px-4 pt-4 md:px-8 lg:px-10">
        <div className="mb-5 flex items-center gap-3">
          {useBackClick ? (
            <BackButton onClick={onBack} aria-label="Voltar" />
          ) : (
            <BackButton href={backHref} aria-label="Voltar ao perfil" />
          )}
          <h1 className="text-2xl font-medium text-text-primary sm:text-[28px] sm:font-normal">
            Gestão da assinatura
          </h1>
        </div>

        <div className="mb-3 empty:hidden">{children}</div>

        <div className="flex flex-col gap-8 lg:flex-row lg:items-start lg:gap-10">
          <aside className="flex w-full shrink-0 flex-col gap-5 lg:w-[320px] xl:w-[360px]">
            <h2 className="text-lg font-semibold text-text-primary">
              Informações da assinatura
            </h2>

            <div
              className="flex min-w-0 items-center justify-between gap-3 rounded-xl px-4 py-3 shadow-btn-glow"
              style={{ background: "var(--btn-primary-bg)" }}
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold leading-tight text-text-on-brand">
                  {statusCard.title}
                </p>
                <p className="mt-0.5 truncate text-xs leading-tight text-text-on-brand/80">
                  {statusCard.subtitle}
                </p>
              </div>
              <span className="shrink-0 rounded-full border border-white/35 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-text-on-brand tabular-nums lining-nums">
                {statusCard.pill}
              </span>
            </div>

            {showManageActions && (
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="ghost"
                  className="h-10 text-xs"
                  disabled={!canCancel}
                  onClick={onCancelClick}
                >
                  Cancelar
                </Button>
                <Button
                  variant="secondary"
                  className="h-10 text-xs"
                  onClick={onAlterarPagamento}
                >
                  Alterar pagamento
                </Button>
              </div>
            )}

            {cardLastFour && (
              <p className="text-xs text-text-tertiary">Cartão ·••• {cardLastFour}</p>
            )}

            <div className="auron-widget-card p-4 sm:p-5">
              <h3 className="mb-4 text-base font-semibold text-text-primary">
                Informações de faturamento
              </h3>
              <div className="flex flex-col gap-3">
                <Field label="Nome" htmlFor="bill-name">
                  <input
                    id="bill-name"
                    value={billingName}
                    onChange={(e) => onBillingName(e.target.value)}
                    placeholder="ex: João da Silva"
                    className={fieldClass}
                  />
                </Field>
                <Field label="CPF" htmlFor="cpf-cnpj">
                  <input
                    id="cpf-cnpj"
                    type="text"
                    inputMode="numeric"
                    value={cpfCnpj}
                    onChange={(e) => onCpfCnpj(e.target.value)}
                    placeholder="Escreva aqui..."
                    className={fieldClass}
                  />
                </Field>
                <Field label="Endereço" htmlFor="bill-addr">
                  <input
                    id="bill-addr"
                    value={billingAddress}
                    onChange={(e) => onBillingAddress(e.target.value)}
                    placeholder="ex: Av. Paulista, 1000"
                    className={fieldClass}
                  />
                </Field>
                <Field label="Cidade" htmlFor="bill-city">
                  <input
                    id="bill-city"
                    value={billingCity}
                    onChange={(e) => onBillingCity(e.target.value)}
                    placeholder="Insira cidade"
                    className={fieldClass}
                  />
                </Field>
                <Field label="CEP" htmlFor="bill-cep">
                  <input
                    id="bill-cep"
                    value={billingCep}
                    onChange={(e) => onBillingCep(e.target.value)}
                    placeholder="Insira CEP"
                    className={fieldClass}
                  />
                </Field>
                <div>
                  <p className="mb-1 text-sm font-normal text-text-tertiary">País</p>
                  <div className="relative flex min-h-[44px] items-center rounded-[10px] border border-border-subtle bg-surface-1 px-3.5 pr-10 text-[16px] text-text-primary">
                    Brasil
                    <span
                      className="absolute right-3 text-text-tertiary"
                      title="País fixo para faturamento no Brasil."
                    >
                      <Info size={18} />
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </aside>

          <div className="min-w-0 flex-1">
            <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-lg font-medium text-text-secondary sm:text-xl">
                Encontre o melhor plano para a sua consultoria
              </p>
              <div className="flex h-10 items-center gap-2">
                <BillingCycleSwitcher
                  period={catalogPeriod}
                  onPeriodChange={onPeriodChange}
                />
                <button
                  type="button"
                  aria-label="Adicionar código promocional"
                  onClick={onToggleCoupon}
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-border-subtle bg-surface-1 text-text-secondary hover:text-brand"
                >
                  <Gift size={20} />
                </button>
              </div>
            </div>

            {couponOpen && (
              <div className="mb-4">
                <Input
                  placeholder="Inserir cupom de desconto"
                  value={coupon}
                  onChange={(e) => onCoupon(e.target.value)}
                />
                <button
                  type="button"
                  className="mt-2 text-xs font-medium text-brand"
                  onClick={onApplyCoupon}
                >
                  Aplicar cupom
                </button>
                {couponMsg && (
                  <p className="mt-1 text-[11px] text-text-tertiary">{couponMsg}</p>
                )}
              </div>
            )}

            {plans.length > 0 && (
              <PlanPricingCards
                compact
                hidePeriodToggle
                plans={plans}
                period={catalogPeriod}
                onPeriodChange={onPeriodChange}
                onSelectPlan={onSelectPlan}
                trialEligible={trialEligible}
              />
            )}

            {checkout}
            {pendingBlock}

            <div className="auron-widget-card mt-8 hidden overflow-hidden sm:block">
              <div className="border-b border-border-subtle px-5 py-3">
                <p className="flex items-center gap-2 text-sm font-medium text-text-primary">
                  <CreditCard size={18} />
                  Histórico de pagamentos
                </p>
              </div>
              <div className="flex min-h-[160px] flex-col items-center justify-center gap-2 px-5 py-10 text-text-tertiary">
                <CreditCard size={28} className="opacity-50" />
                <p className="text-sm">Nenhum pagamento realizado até o momento</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  htmlFor,
  children,
}: {
  label: string;
  htmlFor: string;
  children: ReactNode;
}) {
  return (
    <div>
      <label className="mb-1 block text-sm font-normal text-text-tertiary" htmlFor={htmlFor}>
        {label}
      </label>
      {children}
    </div>
  );
}
