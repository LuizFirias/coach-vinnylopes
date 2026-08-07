"use client";

import { useEffect, useRef, useState, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { supabaseClient } from "@/lib/supabaseClient";
import DumbbellLoader from "@/app/components/DumbbellLoader";
import { Button } from "@/components/ui/Button";
import { Check, Lock } from "@phosphor-icons/react";
import { BackButton } from "@/app/components/ui/BackButton";
import { MeuPlanoView } from "@/app/components/subscriptions/MeuPlanoView";
import { cn } from "@/lib/utils/cn";
import { useBreakpoint } from "@/lib/hooks/useBreakpoint";
import {
  BILLING_PERIOD_LABELS,
  formatCurrencyBRL,
  formatPlanStudentCap,
  getBillingMonths,
  getMonthlyEquivalent,
  getPeriodSavingsPercent,
  type BillingPeriod,
  type PlanTier,
} from "@/lib/subscriptions/plans";
import { resolveAccessUntilOnCancel } from "@/lib/subscriptions/billingPeriod";
import { invalidateSubscriptionStatusCache } from "@/lib/subscriptions/statusClientCache";

interface PlanBillingOption {
  period: BillingPeriod;
  periodLabel: string;
  price: number;
  priceDisplay: string;
}

interface PlanCatalogItem {
  tier: PlanTier;
  label: string;
  studentLimit: number;
  unlimitedStudents?: boolean;
  studentCapLabel?: string;
  description: string;
  features: string[];
  accent?: "danger" | null;
  billingOptions: PlanBillingOption[];
}

interface SubscriptionData {
  subscription: {
    status: string;
    current_period_end: string | null;
    grace_period_end?: string | null;
    last_payment_status: string | null;
    card_last_four?: string | null;
  } | null;
  gracePeriodEnd?: string | null;
  effectiveAccessEnd?: string | null;
  isActive: boolean;
  isSuperAdmin: boolean;
  planTier: PlanTier | null;
  billingPeriod: BillingPeriod | null;
  studentLimit: number | null;
  activeStudentCount: number;
  siteUrl: string;
  publicKey: string | null;
  plans: PlanCatalogItem[];
  currentPlan: {
    tier: PlanTier;
    period: BillingPeriod;
    label: string;
    priceDisplay: string;
    studentLimit: number;
  } | null;
  testPlanEnabled?: boolean;
  /** QA: MP_TEST_DAILY_CYCLE — renovação diária no plano TESTE */
  testDailyCycle?: boolean;
}

type DisplayStatus =
  | "active"
  | "canceling"
  | "past_due"
  | "expired"
  | "cancelled"
  | "pending"
  | "super_admin";

type CheckoutSelection = { tier: PlanTier; period: BillingPeriod };

function formatDateBR(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString("pt-BR");
}

function splitPrice(price: number): { int: string; dec: string } {
  const [int, dec] = price.toFixed(2).split(".");
  return { int, dec };
}

function periodUnit(period: BillingPeriod): string {
  if (period === "monthly") return "/mês";
  if (period === "semester") return "/sem";
  return "/ano";
}

function resolveDisplayStatus(data: SubscriptionData | null): DisplayStatus {
  if (!data) return "expired";
  if (data.isSuperAdmin) return "super_admin";
  const s = data.subscription?.status;
  if (s === "canceling") return "canceling";
  if (s === "past_due" || s === "paused") return "past_due";
  if (s === "expired") return "expired";
  if (s === "cancelled") return "cancelled";
  if (s === "pending") return "pending";
  if (s === "authorized" && data.isActive) return "active";
  if (data.isActive) return "active";
  return "expired";
}

const STATUS_LINE: Record<DisplayStatus, { label: string; color: string }> = {
  active: { label: "Ativo", color: "#39c75a" },
  canceling: { label: "Cancelamento agendado", color: "#7a8aab" },
  past_due: { label: "Pendente", color: "#f59e0b" },
  expired: { label: "Expirada", color: "#e05555" },
  cancelled: { label: "Expirada", color: "#e05555" },
  pending: { label: "Pendente", color: "#f59e0b" },
  super_admin: { label: "Ativo", color: "#39c75a" },
};

function PriceHero({
  price,
  period,
  dimmed,
  size = "lg",
}: {
  price: number;
  period?: BillingPeriod;
  dimmed?: boolean;
  size?: "lg" | "md";
}) {
  const { int, dec } = splitPrice(price);
  const unit = period ? periodUnit(period) : "/mês";
  const intCls = size === "lg" ? "text-[52px]" : "text-[32px]";
  const decCls = size === "lg" ? "text-[28px]" : "text-[18px]";
  const unitCls = size === "lg" ? "text-[15px] pb-2" : "text-[13px] pb-1";

  return (
    <div className={cn("flex items-end gap-0.5", dimmed && "opacity-40")}>
      <span
        className={cn(intCls, "font-black leading-none tracking-[-0.03em]")}
        style={{ color: dimmed ? "var(--text-disabled)" : "var(--text-primary)" }}
      >
        R$ {int}
      </span>
      <span
        className={cn(decCls, "font-black leading-none pb-1 tracking-[-0.01em]")}
        style={{ color: dimmed ? "var(--text-disabled)" : "var(--text-primary)" }}
      >
        ,{dec}
      </span>
      <span
        className={cn(unitCls, "font-medium ml-1")}
        style={{ color: dimmed ? "var(--text-disabled)" : "var(--brand-primary)" }}
      >
        {unit}
      </span>
    </div>
  );
}

function getPlanPrice(
  data: SubscriptionData,
  selectedPlan: { billing: { price: number } } | null,
): number {
  if (data.currentPlan) {
    const plan = data.plans.find((p) => p.tier === data.currentPlan?.tier);
    const billing = plan?.billingOptions.find((b) => b.period === data.currentPlan?.period);
    if (billing) return billing.price;
  }
  return selectedPlan?.billing.price ?? 0;
}

function AlertLine({
  borderColor,
  children,
}: {
  borderColor: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className="py-2 pl-3 text-xs leading-relaxed text-text-tertiary"
      style={{ borderLeft: `2px solid ${borderColor}` }}
    >
      {children}
    </div>
  );
}

function OrderSummary({
  planLabel,
  periodLabel,
  priceDisplay,
}: {
  planLabel: string;
  periodLabel: string;
  priceDisplay: string;
}) {
  return (
    <div className="border-t border-divider py-4">
      <div className="flex justify-between text-[12px] py-1">
        <span className="text-text-tertiary">Plano</span>
        <span className="text-text-primary font-medium">{planLabel}</span>
      </div>
      <div className="flex justify-between text-[12px] py-1">
        <span className="text-text-tertiary">Periodicidade</span>
        <span className="text-text-primary font-medium">{periodLabel}</span>
      </div>
      <div className="flex justify-between text-[12px] py-1.5">
        <span className="text-text-tertiary">Total</span>
        <span className="text-text-primary text-[14px] font-bold">{priceDisplay}</span>
      </div>
      <p className="text-[10px] text-text-tertiary mt-3">
        Cobrança recorrente · cancele quando quiser
      </p>
      <p className="text-[10px] text-text-tertiary mt-1 flex items-center gap-1">
        <Lock className="w-3 h-3" weight="fill" />
        Processado por Asaas
      </p>
    </div>
  );
}

type PaymentMethod = "PIX" | "BOLETO" | "CREDIT_CARD";

const PAYMENT_METHOD_OPTIONS: { value: PaymentMethod; label: string }[] = [
  { value: "PIX", label: "Pix" },
  { value: "BOLETO", label: "Boleto" },
  { value: "CREDIT_CARD", label: "Cartão de crédito" },
];

export default function AssinaturaPage() {
  const router = useRouter();
  const isBelowDesktop = useBreakpoint("tablet");
  const isDesktop = !isBelowDesktop;

  const paymentAreaRef = useRef<HTMLDivElement>(null);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pollAttemptsRef = useRef(0);

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [data, setData] = useState<SubscriptionData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | null>(null);
  const [cpfCnpj, setCpfCnpj] = useState("");
  const [invoiceUrl, setInvoiceUrl] = useState<string | null>(null);
  const [canceling, setCanceling] = useState(false);
  const [pollingTimedOut, setPollingTimedOut] = useState(false);
  const [pollingActive, setPollingActive] = useState(false);
  /** Só true após gerar a fatura Asaas — nunca após cancelamento. */
  const [awaitingPayment, setAwaitingPayment] = useState(false);
  /** Alterar plano/cartão com assinatura ativa — abre checkout sem exigir expiração. */
  const [forceCheckout, setForceCheckout] = useState(false);

  const [selectedTier, setSelectedTier] = useState<PlanTier>("iniciante");
  const [selectedPeriod, setSelectedPeriod] = useState<BillingPeriod>("monthly");
  const [checkoutSelection, setCheckoutSelection] = useState<CheckoutSelection | null>(null);

  const loadStatus = useCallback(async (): Promise<SubscriptionData | null> => {
    const {
      data: { session },
    } = await supabaseClient.auth.getSession();

    if (!session?.access_token) {
      setError("Sessão expirada. Faça login novamente.");
      setLoading(false);
      return null;
    }

    // cache-bust: evita resposta stale enquanto o polling espera o webhook
    invalidateSubscriptionStatusCache();
    const res = await fetch(`/api/subscriptions/status?_=${Date.now()}`, {
      headers: { Authorization: `Bearer ${session.access_token}` },
      cache: "no-store",
    });
    const json = await res.json();

    if (!res.ok) {
      setError(json.error || "Erro ao carregar assinatura");
      setLoading(false);
      return null;
    }

    // TEMP debug — remover após validar fluxo R$5 / webhook
    console.log("[assinatura:loadStatus]", {
      isActive: json.isActive,
      subscriptionStatus: json.subscription?.status ?? null,
      planTier: json.planTier,
      accountType: json.accountType,
      studentLimit: json.studentLimit,
      cardLastFour: json.subscription?.card_last_four ?? null,
    });

    const subStatus = (json as SubscriptionData).subscription?.status ?? null;
    if (
      subStatus === "canceling" ||
      subStatus === "cancelled" ||
      subStatus === "expired" ||
      subStatus === "authorized" ||
      (json as SubscriptionData).isActive
    ) {
      setAwaitingPayment(false);
      setPollingTimedOut(false);
    }

    setData(json);
    setLoading(false);
    return json as SubscriptionData;
  }, []);

  const stopPolling = useCallback(() => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
    setPollingActive(false);
  }, []);

  const startPolling = useCallback(() => {
    if (pollingRef.current) return;
    pollAttemptsRef.current = 0;
    setPollingTimedOut(false);
    setPollingActive(true);

    pollingRef.current = setInterval(async () => {
      pollAttemptsRef.current += 1;
      if (pollAttemptsRef.current > 36) {
        stopPolling();
        setPollingTimedOut(true);
        console.warn("[assinatura:polling] timeout após 36 tentativas (~3min)");
        return;
      }
      const status = await loadStatus();
      const subStatus = status?.subscription?.status ?? null;
      const activated =
        Boolean(status?.isActive) ||
        subStatus === "authorized" ||
        subStatus === "past_due";

      console.log("[assinatura:polling]", {
        attempt: pollAttemptsRef.current,
        isActive: status?.isActive,
        subStatus,
        activated,
      });

      if (activated) {
        stopPolling();
        setPollingTimedOut(false);
        router.refresh();
      }
    }, 5000);
  }, [loadStatus, router, stopPolling]);

  useEffect(() => {
    void loadStatus();
  }, [loadStatus]);

  // Polling só no pós-checkout (pending), nunca em canceling/cancelled/expired.
  useEffect(() => {
    if (loading || !data || data.isSuperAdmin) {
      stopPolling();
      return;
    }

    const subStatus = data.subscription?.status ?? null;

    if (
      subStatus === "canceling" ||
      subStatus === "cancelled" ||
      subStatus === "expired" ||
      subStatus === "authorized" ||
      subStatus === "past_due" ||
      subStatus === "paused"
    ) {
      setAwaitingPayment(false);
      setPollingTimedOut(false);
      stopPolling();
      return;
    }

    const shouldPoll =
      awaitingPayment &&
      !data.isActive &&
      (subStatus === "pending" || subStatus == null);

    if (shouldPoll) {
      startPolling();
    } else {
      stopPolling();
    }
    return () => stopPolling();
  }, [
    awaitingPayment,
    data?.isActive,
    data?.isSuperAdmin,
    data?.subscription?.status,
    loading,
    startPolling,
    stopPolling,
  ]);

  const selectedPlan = useMemo(() => {
    if (!data?.plans?.length) return null;
    const plan = data.plans.find((p) => p.tier === selectedTier);
    if (!plan) return null;
    const billing = plan.billingOptions.find((b) => b.period === selectedPeriod);
    if (!billing) return null;
    return { ...plan, billing };
  }, [data?.plans, selectedTier, selectedPeriod]);

  const checkoutPlan = useMemo(() => {
    if (!checkoutSelection || !data?.plans?.length) return null;
    const plan = data.plans.find((p) => p.tier === checkoutSelection.tier);
    if (!plan) return null;
    const billing = plan.billingOptions.find((b) => b.period === checkoutSelection.period);
    if (!billing) return null;
    return { ...plan, billing };
  }, [checkoutSelection, data?.plans]);

  useEffect(() => {
    if (!data?.plans?.length) return;
    const plan = data.plans.find((p) => p.tier === selectedTier);
    if (!plan) return;
    const hasPeriod = plan.billingOptions.some((b) => b.period === selectedPeriod);
    if (!hasPeriod) {
      setSelectedPeriod(plan.billingOptions[0]?.period ?? "monthly");
    }
  }, [selectedTier, selectedPeriod, data?.plans]);

  // Se trocar tab/período enquanto o checkout está aberto, sincroniza a seleção
  useEffect(() => {
    if (!checkoutSelection) return;
    if (
      checkoutSelection.tier !== selectedTier ||
      checkoutSelection.period !== selectedPeriod
    ) {
      setCheckoutSelection({ tier: selectedTier, period: selectedPeriod });
    }
  }, [selectedTier, selectedPeriod, checkoutSelection]);

  useEffect(() => {
    if (!checkoutSelection) return;
    const t = window.setTimeout(() => {
      paymentAreaRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 80);
    return () => window.clearTimeout(t);
  }, [checkoutSelection?.tier, checkoutSelection?.period]);

  const subscriptionStatus = data?.subscription?.status ?? null;
  const displayStatus = resolveDisplayStatus(data);

  const needsCheckout =
    !!data &&
    !data.isSuperAdmin &&
    subscriptionStatus !== "authorized" &&
    subscriptionStatus !== "past_due" &&
    subscriptionStatus !== "paused" &&
    subscriptionStatus !== "canceling" &&
    (subscriptionStatus === "expired" ||
      subscriptionStatus === "cancelled" ||
      !data.isActive);

  const showCheckout = needsCheckout || forceCheckout;

  const canCancel =
    !!data &&
    !data.isSuperAdmin &&
    (subscriptionStatus === "authorized" || subscriptionStatus === "past_due");

  const openCheckout = useCallback(
    (tier: PlanTier, period: BillingPeriod) => {
      setSelectedTier(tier);
      setSelectedPeriod(period);
      setCheckoutSelection({ tier, period });
      setForceCheckout(true);
      setError(null);
      setSuccess(null);
    },
    [],
  );

  const handleCancel = async () => {
    setCanceling(true);
    setError(null);
    try {
      const {
        data: { session },
      } = await supabaseClient.auth.getSession();

      if (!session?.access_token) {
        setError("Sessão expirada. Faça login novamente.");
        return;
      }

      const res = await fetch("/api/admin/subscription/cancel", {
        method: "POST",
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      const json = await res.json().catch(() => ({}));

      if (!res.ok) {
        setError(json.error || "Não foi possível cancelar a assinatura");
        return;
      }

      setSuccess(
        json.access_until
          ? `Assinatura cancelada. Acesso até ${new Date(json.access_until).toLocaleDateString("pt-BR")}.`
          : "Assinatura cancelada. Você mantém o acesso até o fim do ciclo.",
      );
      setAwaitingPayment(false);
      stopPolling();
      setPollingTimedOut(false);
      setCheckoutSelection(null);
      setForceCheckout(false);
      setLoading(true);
      await loadStatus();
      router.refresh();
    } catch {
      setError("Não foi possível cancelar a assinatura");
    } finally {
      setCanceling(false);
    }
  };

  /** Confirma o checkout: cria a assinatura no Asaas e abre a fatura hospedada (Pix/Boleto/Cartão). */
  const handleConfirmPayment = useCallback(async () => {
    if (!checkoutSelection || !paymentMethod) return;

    const digits = cpfCnpj.replace(/\D/g, "");
    if (digits.length !== 11 && digits.length !== 14) {
      setError("Informe um CPF ou CNPJ válido.");
      return;
    }

    setSubmitting(true);
    setError(null);
    setInvoiceUrl(null);
    try {
      const {
        data: { session },
      } = await supabaseClient.auth.getSession();
      if (!session?.access_token) throw new Error("Sessão expirada");

      const res = await fetch("/api/subscriptions/checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          planTier: checkoutSelection.tier,
          billingPeriod: checkoutSelection.period,
          billingType: paymentMethod,
          cpfCnpj: digits,
        }),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || "Erro ao processar assinatura");
      }

      if (json.invoiceUrl) {
        setInvoiceUrl(json.invoiceUrl);
        window.open(json.invoiceUrl, "_blank", "noopener,noreferrer");
      }

      setSuccess("Fatura gerada. Finalize o pagamento na aba aberta pelo Asaas.");
      setAwaitingPayment(true);
      startPolling();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erro ao assinar";
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  }, [checkoutSelection, paymentMethod, cpfCnpj, startPolling]);

  if (loading) {
    return (
      <div className="min-h-screen bg-surface-0 flex items-center justify-center">
        <DumbbellLoader />
      </div>
    );
  }

  const subscription = data?.subscription;

  const statusPlanLabel = data?.currentPlan?.label ?? selectedPlan?.label ?? "—";
  const statusPrice = getPlanPrice(data!, selectedPlan);
  const statusPeriod = data?.currentPlan?.period ?? data?.billingPeriod ?? selectedPeriod;

  const periodEnd = subscription?.current_period_end;
  const graceEnd = data?.gracePeriodEnd || subscription?.grace_period_end;
  // Em canceling, se o period_end no banco estiver “curto” (ex.: data de hoje),
  // mostra o fim de ciclo real (agora + billing) — mesma regra do cancel.
  const cancelingAccessIso =
    displayStatus === "canceling"
      ? resolveAccessUntilOnCancel({
          currentPeriodEnd: periodEnd,
          billingPeriod: data?.billingPeriod ?? data?.currentPlan?.period ?? null,
          planTier: data?.planTier ?? data?.currentPlan?.tier ?? null,
        })
      : null;
  const accessEndDate = formatDateBR(
    displayStatus === "past_due"
      ? graceEnd || periodEnd
      : displayStatus === "canceling"
        ? cancelingAccessIso
        : periodEnd,
  );

  const monthlyRef = selectedPlan?.billingOptions.find((b) => b.period === "monthly");
  const cardLastFour = subscription?.card_last_four || null;
  const cancelAccessUntil = resolveAccessUntilOnCancel({
    currentPeriodEnd: subscription?.current_period_end,
    billingPeriod: data?.billingPeriod ?? data?.currentPlan?.period ?? null,
    planTier: data?.planTier ?? data?.currentPlan?.tier ?? null,
  });
  const cancelAccessUntilLabel = formatDateBR(cancelAccessUntil);

  const planTabs = data && (
    <div className="flex flex-wrap gap-0 border-b border-divider">
      {data.plans.map((plan) => {
        const isSelected = selectedTier === plan.tier;
        const isTest = plan.tier === "test" || plan.accent === "danger";
        return (
          <button
            key={plan.tier}
            type="button"
            onClick={() => setSelectedTier(plan.tier)}
            className={cn(
              "px-4 py-3 text-xs font-medium uppercase tracking-wider transition-colors border-b-2 -mb-px",
              isSelected
                ? isTest
                  ? "text-[#e05555] border-[#e05555]"
                  : "text-text-primary border-[#751BB4]"
                : isTest
                  ? "text-[#e05555]/70 border-transparent hover:text-[#e05555]"
                  : "text-text-tertiary border-transparent hover:text-text-primary",
            )}
          >
            {plan.label}
          </button>
        );
      })}
    </div>
  );

  const periodControl = selectedPlan && (
    <div className="flex mt-6 rounded-lg overflow-hidden bg-surface-1">
      {selectedPlan.billingOptions.map((opt, idx) => {
        const active = selectedPeriod === opt.period;
        const months = getBillingMonths(opt.period);
        const monthlyEq = getMonthlyEquivalent(opt.price, opt.period);
        const monthlyPrice = monthlyRef?.price ?? opt.price;
        const savings = getPeriodSavingsPercent(opt.price, monthlyPrice, opt.period);

        return (
          <button
            key={opt.period}
            type="button"
            onClick={() => setSelectedPeriod(opt.period)}
            className={cn(
              "flex-1 py-2.5 px-2 text-center transition-colors relative",
              idx > 0 && "border-l border-divider",
              active
                ? "bg-[#111111] text-white z-1 ring-1 ring-[#751BB4] ring-inset"
                : "bg-transparent text-text-tertiary hover:text-text-primary",
            )}
          >
            <span className="block text-[11px] font-medium uppercase">{opt.periodLabel}</span>
            <span
              className={cn(
                "block text-[12px] font-bold mt-0.5",
                active ? "text-white" : "text-text-secondary",
              )}
            >
              {months === 1
                ? formatCurrencyBRL(opt.price)
                : `${formatCurrencyBRL(monthlyEq)}/mês`}
            </span>
            {savings > 0 && (
              <span className="block text-[9px] font-semibold text-[#39c75a] mt-0.5">
                economize {savings}%
              </span>
            )}
          </button>
        );
      })}
    </div>
  );

  const featuresList = selectedPlan && (
    <ul className="flex flex-col mt-6">
      {selectedPlan.features.map((feature) => (
        <li
          key={feature}
          className="flex items-center gap-2 py-2.5 border-b border-divider text-xs text-text-secondary last:border-0"
        >
          <Check className="w-3.5 h-3.5 text-[#39c75a] shrink-0" weight="bold" />
          {feature}
        </li>
      ))}
    </ul>
  );

  const paymentSection = checkoutSelection && checkoutPlan && (
    <div ref={paymentAreaRef} className="pt-2">
      <OrderSummary
        planLabel={checkoutPlan.label}
        periodLabel={BILLING_PERIOD_LABELS[checkoutSelection.period]}
        priceDisplay={checkoutPlan.billing.priceDisplay}
      />
      <div key={`${checkoutSelection.tier}-${checkoutSelection.period}`} className="pt-2 pb-8">
        <label className="block text-[11px] font-medium text-text-tertiary mb-1.5" htmlFor="cpf-cnpj">
          CPF ou CNPJ
        </label>
        <input
          id="cpf-cnpj"
          type="text"
          inputMode="numeric"
          value={cpfCnpj}
          onChange={(e) => setCpfCnpj(e.target.value)}
          placeholder="000.000.000-00"
          className="w-full h-11 px-3 rounded-lg bg-surface-2 border border-input text-sm text-text-primary placeholder:text-text-disabled focus:outline-none focus:border-brand/40"
        />

        <p className="text-[11px] font-medium text-text-tertiary mt-5 mb-2">Forma de pagamento</p>
        <div className="grid grid-cols-3 gap-2">
          {PAYMENT_METHOD_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setPaymentMethod(opt.value)}
              className={cn(
                "h-11 rounded-lg text-xs font-semibold border transition-colors",
                paymentMethod === opt.value
                  ? "border-brand bg-brand/10 text-brand"
                  : "border-input text-text-secondary hover:border-brand/40",
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={handleConfirmPayment}
          disabled={!paymentMethod || submitting}
          className="mt-6 w-full h-12 rounded-md text-sm font-bold text-white bg-brand hover:bg-brand-hover transition-colors disabled:opacity-50"
        >
          {submitting ? "Gerando fatura..." : "Ir para pagamento"}
        </button>

        {invoiceUrl && (
          <p className="text-[11px] text-text-tertiary mt-3">
            A aba de pagamento não abriu?{" "}
            <a href={invoiceUrl} target="_blank" rel="noopener noreferrer" className="text-brand underline">
              Clique aqui
            </a>
            .
          </p>
        )}
      </div>
    </div>
  );

  const canReturnToManage =
    displayStatus === "active" ||
    displayStatus === "canceling" ||
    displayStatus === "past_due" ||
    displayStatus === "super_admin";

  const showManageView = !forceCheckout && canReturnToManage;

  const statusBadgeLabel =
    displayStatus === "canceling"
      ? "Cancelando"
      : displayStatus === "past_due"
        ? "Pendente"
        : STATUS_LINE[displayStatus]?.label ?? "Ativo";

  return (
    <div className="min-h-screen bg-surface-0 pb-24 lg:pl-28">
      <header className="sticky top-0 z-40 bg-surface-0 border-b border-border-divider">
        <div className="relative flex items-center justify-center px-4 py-3 max-w-[min(1600px,96vw)] mx-auto">
          <div className="absolute left-4 top-1/2 -translate-y-1/2">
            {forceCheckout && canReturnToManage ? (
              <BackButton
                onClick={() => {
                  setForceCheckout(false);
                  setCheckoutSelection(null);
                }}
                aria-label="Voltar ao meu plano"
              />
            ) : (
              <BackButton href="/admin/perfil" aria-label="Voltar ao perfil" />
            )}
          </div>
          <h1 className="text-base font-semibold text-text-primary">
            {forceCheckout ? "Alterar plano" : "Meu plano"}
          </h1>
        </div>
      </header>

      <div className="px-4 pt-4 w-full max-w-[min(720px,96vw)] mx-auto flex flex-col gap-4">
        {data?.testDailyCycle && selectedTier === "test" && (
          <AlertLine borderColor="#e05555">
            <span className="text-[#e05555]">
              QA ativo: plano TESTE com ciclo diário (MP_TEST_DAILY_CYCLE). Desligue a env após
              validar 2–3 renovações.
            </span>
          </AlertLine>
        )}

        {error && (
          <AlertLine borderColor="#e05555">
            <span className="text-[#e05555]">{error}</span>
          </AlertLine>
        )}

        {success && (
          <p className="text-[11px] font-semibold text-success py-1">{success}</p>
        )}

        {awaitingPayment &&
          (pollingActive || pollingTimedOut) &&
          !data?.isActive &&
          data?.subscription?.status !== "canceling" &&
          displayStatus !== "canceling" && (
          <p className="text-[11px] font-semibold text-warning py-1">
            {pollingTimedOut
              ? "Ainda não recebemos a confirmação. Você pode atualizar a página ou voltar em alguns minutos."
              : "Confirmando pagamento..."}
          </p>
        )}

        {displayStatus === "canceling" && accessEndDate && showManageView && (
          <AlertLine borderColor="#7a8aab">
            Renovação cancelada. Seu acesso continua até{" "}
            <span className="text-text-primary font-medium">{accessEndDate}</span>
            . Não haverá novas cobranças.
          </AlertLine>
        )}

        {displayStatus === "past_due" && accessEndDate && showManageView && (
          <AlertLine borderColor="#f59e0b">
            Cobrança recusada. Atualize seu cartão ou aguarde a retentativa.
            <br />
            Acesso garantido até{" "}
            <span className="text-warning font-semibold">{accessEndDate}</span>.
          </AlertLine>
        )}

        {(displayStatus === "expired" || displayStatus === "cancelled") && needsCheckout && (
          <AlertLine borderColor="#e05555">
            <span className="text-danger font-medium">Seu acesso foi pausado.</span>
            <br />
            Todos os dados dos seus alunos estão preservados.
            <br />
            Reative para continuar prescrevendo.
          </AlertLine>
        )}

        {showManageView && data && (
          <MeuPlanoView
            planLabel={data.isSuperAdmin ? "ADMIN" : statusPlanLabel}
            price={data.isSuperAdmin ? 0 : statusPrice}
            billingPeriod={statusPeriod}
            renewalDateLabel={accessEndDate}
            statusBadge={statusBadgeLabel}
            isActive={displayStatus === "active" || displayStatus === "super_admin"}
            cardLastFour={cardLastFour}
            canCancel={canCancel}
            canceling={canceling}
            cancelAccessUntilLabel={cancelAccessUntilLabel}
            onCancel={handleCancel}
            onAlterarPlano={(tier, period) => openCheckout(tier, period)}
            onAlterarPagamento={() => {
              const tier = data.currentPlan?.tier ?? data.planTier ?? selectedTier;
              const period =
                data.currentPlan?.period ?? data.billingPeriod ?? selectedPeriod;
              openCheckout(tier, period);
            }}
            plans={data.plans}
            currentTier={data.currentPlan?.tier ?? data.planTier}
            currentPeriod={data.currentPlan?.period ?? data.billingPeriod}
          />
        )}

        {showCheckout && data!.plans.length > 0 && (
          <section className="pt-2 pb-12">
            {forceCheckout && (
              <p className="text-sm text-text-secondary mb-4">
                Confirme o novo plano e a forma de pagamento abaixo.
              </p>
            )}

            {planTabs}

            {checkoutSelection && isDesktop ? (
              <div className="grid gap-12 mt-8" style={{ gridTemplateColumns: "320px 1fr" }}>
                <aside className="sticky top-6 self-start">
                  <p className="text-[11px] font-medium uppercase tracking-wider text-text-secondary mb-2">
                    {selectedPlan?.label}
                  </p>
                  {selectedPlan && (
                    <PriceHero
                      price={selectedPlan.billing.price}
                      period={selectedPeriod}
                      size="md"
                    />
                  )}
                  <p className="text-[11px] text-text-secondary mt-2">
                    {selectedPeriod ? BILLING_PERIOD_LABELS[selectedPeriod] : ""}
                  </p>
                  {periodControl}
                  {featuresList}
                </aside>
                <div>{paymentSection}</div>
              </div>
            ) : (
              <div className="max-w-3xl mt-8">
                {selectedPlan && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                    <div>
                      <PriceHero price={selectedPlan.billing.price} period={selectedPeriod} />
                      <p className="text-xs text-text-secondary mt-3 leading-relaxed">
                        {selectedPlan.description}
                      </p>
                      <p className="text-[11px] text-text-secondary mt-2">
                        {formatPlanStudentCap(selectedPlan.tier, selectedPlan.studentLimit)} · cobrança recorrente
                      </p>
                      {periodControl}
                      {!checkoutSelection && (
                        <button
                          type="button"
                          onClick={() =>
                            setCheckoutSelection({
                              tier: selectedTier,
                              period: selectedPeriod,
                            })
                          }
                          className="mt-6 w-full flex items-center justify-between px-5 py-3.5 rounded-md text-sm font-bold text-white bg-brand hover:bg-brand-hover transition-colors"
                        >
                          <span>Assinar {selectedPlan.label}</span>
                          <span>{selectedPlan.billing.priceDisplay}</span>
                        </button>
                      )}
                    </div>
                    {!checkoutSelection && featuresList}
                  </div>
                )}

                {checkoutSelection && (
                  <div className="mt-8 border-t border-border-divider pt-6">
                    {selectedPlan && (
                      <div className="mb-6 sm:hidden">
                        <p className="text-[11px] font-medium uppercase tracking-wider text-text-secondary mb-2">
                          Resumo
                        </p>
                        <PriceHero
                          price={selectedPlan.billing.price}
                          period={selectedPeriod}
                          size="md"
                        />
                        {featuresList}
                      </div>
                    )}
                    {paymentSection}
                  </div>
                )}
              </div>
            )}
          </section>
        )}

        {!showCheckout &&
          !showManageView &&
          !data?.isActive &&
          !data?.isSuperAdmin &&
          subscription?.status === "pending" && (
            <section className="py-8">
              <p className="text-xs text-text-secondary mb-4">
                Assinatura pendente de confirmação. Aguarde alguns instantes.
              </p>
              <Button
                variant="secondary"
                className="h-10 text-xs rounded-md"
                onClick={() => loadStatus()}
              >
                Atualizar status
              </Button>
            </section>
          )}
      </div>
    </div>
  );
}
