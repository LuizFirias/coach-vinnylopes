"use client";

import { useState } from "react";
import {
  ArrowRight,
  Barbell,
  MinusCircle,
  PauseCircle,
  ArrowClockwise,
  PencilSimple,
  CreditCard,
  Star,
  Plus,
  PersonSimpleRun,
} from "@phosphor-icons/react";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { cn } from "@/lib/utils/cn";
import {
  type BillingPeriod,
  type PlanTier,
  BILLING_PERIOD_LABELS,
  formatCurrencyBRL,
  formatPlanStudentCap,
} from "@/lib/subscriptions/plans";

type ActionColor = "danger" | "disabled" | "brand";

const ACTION_COLOR: Record<
  ActionColor,
  { text: string; border: string }
> = {
  danger: { text: "text-danger", border: "border-danger/30" },
  brand: { text: "text-brand", border: "border-brand/30" },
  disabled: { text: "text-text-disabled", border: "border-border-subtle" },
};

function ActionCard({
  icon,
  label,
  color,
  onClick,
  disabled,
}: {
  icon: React.ReactNode;
  label: string;
  color: ActionColor;
  onClick: () => void;
  disabled?: boolean;
}) {
  const c = ACTION_COLOR[color];
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      style={{ touchAction: "manipulation" }}
      className={cn(
        "flex flex-col items-center justify-center gap-2 rounded-xl border p-4 text-center",
        "min-h-[92px] transition-colors active:scale-[0.98]",
        "bg-surface-1 cursor-pointer",
        c.border,
        disabled && "opacity-40 cursor-not-allowed",
      )}
    >
      <span className={c.text}>{icon}</span>
      <span className={cn("text-xs font-medium leading-tight", c.text)}>
        {label}
      </span>
    </button>
  );
}

export type MeuPlanoCatalogItem = {
  tier: PlanTier;
  label: string;
  studentLimit: number;
  unlimitedStudents?: boolean;
  description: string;
  billingOptions: {
    period: BillingPeriod;
    periodLabel: string;
    price: number;
    priceDisplay: string;
  }[];
};

type Props = {
  planLabel: string;
  price: number;
  billingPeriod: BillingPeriod | null;
  renewalDateLabel: string | null;
  statusBadge: string;
  isActive: boolean;
  cardLastFour: string | null;
  canCancel: boolean;
  canceling: boolean;
  cancelAccessUntilLabel: string | null;
  onCancel: () => Promise<void> | void;
  onAlterarPlano: (tier: PlanTier, period: BillingPeriod) => void;
  onAlterarPagamento: () => void;
  plans: MeuPlanoCatalogItem[];
  currentTier: PlanTier | null;
  currentPeriod: BillingPeriod | null;
};

function splitPrice(price: number): { int: string; dec: string } {
  const [int, dec] = price.toFixed(2).split(".");
  return { int, dec };
}

export function MeuPlanoView({
  planLabel,
  price,
  billingPeriod,
  renewalDateLabel,
  statusBadge,
  isActive,
  cardLastFour,
  canCancel,
  canceling,
  cancelAccessUntilLabel,
  onCancel,
  onAlterarPlano,
  onAlterarPagamento,
  plans,
  currentTier,
  currentPeriod,
}: Props) {
  const [coupon, setCoupon] = useState("");
  const [couponMsg, setCouponMsg] = useState<string | null>(null);
  const [faqOpen, setFaqOpen] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [showPauseModal, setShowPauseModal] = useState(false);
  const [pauseDays, setPauseDays] = useState<7 | 15 | 30>(30);
  const [showChangeModal, setShowChangeModal] = useState(false);
  const [changeTier, setChangeTier] = useState<PlanTier | null>(currentTier);
  const [changePeriod, setChangePeriod] = useState<BillingPeriod | null>(
    currentPeriod ?? "monthly",
  );

  const { int, dec } = splitPrice(price);
  const periodSuffix =
    billingPeriod === "semester"
      ? "/sem"
      : billingPeriod === "yearly"
        ? "/ano"
        : "/mês";

  const handleApplyCoupon = () => {
    const code = coupon.trim();
    if (!code) {
      setCouponMsg("Digite um cupom para aplicar.");
      return;
    }
    setCouponMsg("Cupons ainda não estão disponíveis. Em breve.");
  };

  const changePlan = plans.find((p) => p.tier === changeTier);
  const changeOpt =
    changePlan?.billingOptions.find((o) => o.period === changePeriod) ??
    changePlan?.billingOptions[0];

  return (
    <div className="flex flex-col gap-4">
      {/* Hero card */}
      <div
        className="relative overflow-hidden rounded-2xl p-6 text-white"
        style={{
          background:
            "linear-gradient(135deg, #a855f7 0%, #9333ea 50%, #7e22ce 100%)",
        }}
      >
        <Barbell
          size={180}
          weight="fill"
          className="pointer-events-none absolute -right-6 top-1/2 -translate-y-1/2 rotate-12 text-white/10"
          aria-hidden
        />

        <div className="relative flex items-center justify-between gap-3 mb-6">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-white/40 px-3 py-1 text-xs font-medium text-white">
            <PersonSimpleRun size={14} weight="bold" />
            {statusBadge}
          </span>
          {renewalDateLabel && (
            <span className="text-[11px] italic text-white/80 text-right leading-snug">
              {isActive
                ? `Renovação automática em ${renewalDateLabel}`
                : `Acesso até ${renewalDateLabel}`}
            </span>
          )}
        </div>

        <div className="relative flex items-end justify-between gap-3">
          <span className="text-lg font-semibold text-white/95 tracking-wide">
            {planLabel}
          </span>
          <div className="flex flex-col items-end">
            <div className="flex items-baseline gap-0.5">
              <span className="text-sm font-medium text-white/90">R$</span>
              <span className="text-4xl font-black text-white tabular-nums lining-nums leading-none">
                {int}
              </span>
              <span className="text-2xl font-black text-white tabular-nums lining-nums leading-none">
                ,{dec}
              </span>
            </div>
            <span className="text-[11px] text-white/75 mt-0.5">{periodSuffix}</span>
          </div>
        </div>
      </div>

      {/* Cupom */}
      <div>
        <Input
          placeholder="Inserir cupom de desconto"
          value={coupon}
          onChange={(e) => {
            setCoupon(e.target.value);
            setCouponMsg(null);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              handleApplyCoupon();
            }
          }}
          rightElement={
            <button
              type="button"
              onClick={handleApplyCoupon}
              aria-label="Aplicar cupom"
              className="flex h-8 w-8 items-center justify-center rounded-lg text-text-secondary hover:text-brand border-0 bg-transparent cursor-pointer"
            >
              <ArrowRight size={18} weight="bold" />
            </button>
          }
        />
        {couponMsg && (
          <p className="mt-1.5 text-[11px] text-text-tertiary px-1">{couponMsg}</p>
        )}
      </div>

      {/* Ações */}
      <div className="grid grid-cols-3 gap-2">
        <ActionCard
          icon={<MinusCircle size={20} weight="bold" />}
          label="Cancelar plano"
          color="danger"
          disabled={!canCancel}
          onClick={() => setShowCancelModal(true)}
        />
        <ActionCard
          icon={<PauseCircle size={20} weight="bold" />}
          label="Pausar por um tempo"
          color="disabled"
          onClick={() => setShowPauseModal(true)}
        />
        <ActionCard
          icon={<ArrowClockwise size={20} weight="bold" />}
          label="Alterar plano"
          color="brand"
          onClick={() => {
            setChangeTier(currentTier);
            setChangePeriod(currentPeriod ?? "monthly");
            setShowChangeModal(true);
          }}
        />
      </div>

      {/* Forma de pagamento */}
      <div className="border-t border-border-divider pt-4">
        <div className="mb-3 flex items-center justify-between px-1">
          <h2 className="text-base font-semibold text-text-primary">
            Forma de pagamento
          </h2>
          <button
            type="button"
            onClick={onAlterarPagamento}
            className="flex items-center gap-1.5 text-sm font-medium text-brand border-0 bg-transparent cursor-pointer touch-manipulation"
          >
            <PencilSimple size={16} weight="bold" />
            Alterar
          </button>
        </div>

        <div className="flex items-center gap-3 rounded-xl bg-surface-1 p-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand/15 shrink-0">
            <CreditCard size={20} weight="fill" className="text-brand" />
          </div>
          <div className="min-w-0">
            <p className="flex items-center gap-1 text-sm font-medium text-text-primary">
              Crédito - Principal
              <Star size={12} weight="fill" className="text-warning" />
            </p>
            <p className="text-sm text-brand">
              {cardLastFour ? `Cartão •••• ${cardLastFour}` : "Nenhum cartão cadastrado"}
            </p>
          </div>
        </div>
      </div>

      {/* FAQ */}
      <div className="rounded-xl bg-surface-1 overflow-hidden">
        <button
          type="button"
          onClick={() => setFaqOpen((v) => !v)}
          aria-expanded={faqOpen}
          className="w-full flex items-center justify-between gap-3 px-4 py-3.5 text-left border-0 bg-transparent cursor-pointer touch-manipulation"
        >
          <span className="text-sm font-medium text-text-primary">
            Como funciona o pagamento do plano?
          </span>
          <Plus
            size={18}
            weight="bold"
            className={cn(
              "text-text-secondary shrink-0 transition-transform",
              faqOpen && "rotate-45",
            )}
          />
        </button>
        {faqOpen && (
          <p className="px-4 pb-4 text-sm text-text-secondary leading-relaxed">
            Sua assinatura é cobrada via Mercado Pago na forma de pagamento
            cadastrada. Você pode alterar, pausar ou cancelar a qualquer momento,
            sem multa. O acesso permanece ativo até o fim do período já pago.
          </p>
        )}
      </div>

      <ConfirmModal
        open={showCancelModal}
        title="Cancelar assinatura?"
        description={
          cancelAccessUntilLabel
            ? `Você continuará com acesso até ${cancelAccessUntilLabel}. Após essa data, sua conta perde acesso aos recursos do AURON. Não haverá novas cobranças.`
            : "Você continuará com acesso até o fim do período já pago. Após essa data, o painel será bloqueado. Não haverá novas cobranças."
        }
        confirmLabel="Confirmar cancelamento"
        cancelLabel="Manter assinatura"
        confirmVariant="danger"
        loading={canceling}
        onConfirm={async () => {
          await onCancel();
          setShowCancelModal(false);
        }}
        onClose={() => !canceling && setShowCancelModal(false)}
      />

      {/* Pausar — UI pronta; backend ainda não exposto */}
      {showPauseModal && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          role="dialog"
          aria-modal
          onClick={() => setShowPauseModal(false)}
        >
          <div
            className="w-full max-w-sm rounded-2xl bg-surface-1 border border-border-subtle p-5"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-semibold text-text-primary mb-1">
              Pausar assinatura
            </h3>
            <p className="text-sm text-text-secondary mb-4">
              Escolha por quanto tempo deseja pausar. Em breve esta opção estará
              disponível com o Mercado Pago.
            </p>
            <div className="flex gap-2 mb-5">
              {([7, 15, 30] as const).map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => setPauseDays(d)}
                  className={cn(
                    "flex-1 h-10 rounded-lg text-xs font-semibold border-0 cursor-pointer",
                    pauseDays === d
                      ? "bg-brand/15 text-brand"
                      : "bg-surface-2 text-text-secondary",
                  )}
                >
                  {d} dias
                </button>
              ))}
            </div>
            <div className="flex flex-col gap-2">
              <Button
                variant="primary"
                onClick={() => {
                  setShowPauseModal(false);
                  setCouponMsg("Pausa de assinatura em breve.");
                }}
              >
                Pausar
              </Button>
              <Button variant="secondary" onClick={() => setShowPauseModal(false)}>
                Cancelar
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Alterar plano */}
      {showChangeModal && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          role="dialog"
          aria-modal
          onClick={() => setShowChangeModal(false)}
        >
          <div
            className="w-full max-w-md rounded-2xl bg-surface-1 border border-border-subtle p-5 max-h-[85vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-semibold text-text-primary mb-1">
              Escolher novo plano
            </h3>
            <p className="text-sm text-text-secondary mb-4">
              Selecione o plano e o período de cobrança.
            </p>

            <div className="flex flex-col gap-2 mb-4">
              {plans
                .filter((p) => p.tier !== "test")
                .map((p) => {
                  const selected = changeTier === p.tier;
                  return (
                    <button
                      key={p.tier}
                      type="button"
                      onClick={() => {
                        setChangeTier(p.tier);
                        const periods = p.billingOptions.map((o) => o.period);
                        if (!changePeriod || !periods.includes(changePeriod)) {
                          setChangePeriod(periods[0] ?? "monthly");
                        }
                      }}
                      className={cn(
                        "w-full text-left rounded-xl border px-4 py-3 transition-colors cursor-pointer bg-transparent",
                        selected
                          ? "border-brand bg-brand/5"
                          : "border-border-subtle hover:border-brand/30",
                      )}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm font-bold text-text-primary">
                          {p.label}
                        </span>
                        <span className="text-[11px] text-text-tertiary">
                          {formatPlanStudentCap(p.tier, p.studentLimit)}
                        </span>
                      </div>
                      <p className="text-[11px] text-text-secondary mt-0.5">
                        {p.description}
                      </p>
                    </button>
                  );
                })}
            </div>

            {changePlan && (
              <div className="flex gap-1 p-1 rounded-lg bg-surface-2 mb-4">
                {changePlan.billingOptions.map((o) => (
                  <button
                    key={o.period}
                    type="button"
                    onClick={() => setChangePeriod(o.period)}
                    className={cn(
                      "flex-1 py-2 rounded-md text-[10px] font-semibold uppercase tracking-wide border-0 cursor-pointer",
                      changePeriod === o.period
                        ? "bg-surface-0 text-brand shadow-sm"
                        : "bg-transparent text-text-tertiary",
                    )}
                  >
                    {BILLING_PERIOD_LABELS[o.period]}
                    <span className="block text-[10px] font-bold normal-case mt-0.5 tabular-nums">
                      {formatCurrencyBRL(o.price)}
                    </span>
                  </button>
                ))}
              </div>
            )}

            <div className="flex flex-col gap-2">
              <Button
                variant="primary"
                disabled={!changeTier || !changeOpt}
                onClick={() => {
                  if (!changeTier || !changeOpt) return;
                  setShowChangeModal(false);
                  onAlterarPlano(changeTier, changeOpt.period);
                }}
              >
                Confirmar troca
              </Button>
              <Button variant="secondary" onClick={() => setShowChangeModal(false)}>
                Cancelar
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
