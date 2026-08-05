"use client";

import { useEffect, useRef, useState, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { supabaseClient } from "@/lib/supabaseClient";
import DumbbellLoader from "@/app/components/DumbbellLoader";
import { ScreenHeader } from "@/components/layout/ScreenHeader";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { Button } from "@/components/ui/Button";
import { Check, Lock } from "@phosphor-icons/react";
import { BackButton } from "@/app/components/ui/BackButton";
import { cn } from "@/lib/utils/cn";
import { useBreakpoint } from "@/lib/hooks/useBreakpoint";
import {
  BILLING_PERIOD_LABELS,
  formatCurrencyBRL,
  formatStudentUsage,
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

declare global {
  interface Window {
    MercadoPago?: new (publicKey: string, options?: { locale: string }) => {
      bricks: () => {
        create: (
          brick: string,
          containerId: string,
          settings: Record<string, unknown>,
        ) => Promise<unknown>;
      };
    };
  }
}

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
        style={{ color: dimmed ? "#6b7280" : "#ffffff" }}
      >
        R$ {int}
      </span>
      <span
        className={cn(decCls, "font-black leading-none pb-1 tracking-[-0.01em]")}
        style={{ color: dimmed ? "#6b7280" : "#ffffff" }}
      >
        ,{dec}
      </span>
      <span
        className={cn(unitCls, "font-medium ml-1")}
        style={{ color: dimmed ? "#4b5563" : "#751BB4" }}
      >
        {unit}
      </span>
    </div>
  );
}

function StatusDot({ color }: { color: string }) {
  return (
    <span
      className="inline-block w-1.5 h-1.5 rounded-full mr-1.5"
      style={{ backgroundColor: color }}
    />
  );
}

function InlineStatus({ status }: { status: DisplayStatus }) {
  const cfg = STATUS_LINE[status];
  return (
    <p className="text-[11px] font-semibold flex items-center" style={{ color: cfg.color }}>
      <StatusDot color={cfg.color} />
      {cfg.label}
    </p>
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
      className="py-2 pl-3 text-xs leading-relaxed text-[#7a8aab]"
      style={{ borderLeft: `2px solid ${borderColor}` }}
    >
      {children}
    </div>
  );
}

function MetaRow({ label, value, valueColor }: { label: string; value: string; valueColor?: string }) {
  return (
    <div className="flex justify-between gap-4 text-[12px] py-1">
      <span className="text-[#7a8aab]">{label}</span>
      <span className="font-medium" style={{ color: valueColor || "#c5cdd8" }}>
        {value}
      </span>
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
        <span className="text-[#7a8aab]">Plano</span>
        <span className="text-white font-medium">{planLabel}</span>
      </div>
      <div className="flex justify-between text-[12px] py-1">
        <span className="text-[#7a8aab]">Periodicidade</span>
        <span className="text-white font-medium">{periodLabel}</span>
      </div>
      <div className="flex justify-between text-[12px] py-1.5">
        <span className="text-[#7a8aab]">Total</span>
        <span className="text-white text-[14px] font-bold">{priceDisplay}</span>
      </div>
      <p className="text-[10px] text-[#7a8aab] mt-3">
        Cobrança recorrente · cancele quando quiser
      </p>
      <p className="text-[10px] text-[#7a8aab] mt-1 flex items-center gap-1">
        <Lock className="w-3 h-3" weight="fill" />
        Processado por Mercado Pago
      </p>
    </div>
  );
}

const BRICK_VISUAL = {
  style: {
    theme: "dark",
    customVariables: {
      baseColor: "#751BB4",
      buttonTextColor: "#ffffff",
      formBackgroundColor: "transparent",
      inputBackgroundColor: "#222222",
      textPrimaryColor: "#ffffff",
      textSecondaryColor: "#7a8aab",
      outlinePrimaryColor: "#751BB4",
      outlineSecondaryColor: "#282828",
      baseColorFirstVariant: "#8B2FD4",
      // Fundo de listas/dropdowns — evita texto preto ilegível no dark
      baseColorSecondVariant: "#222222",
      errorColor: "#e05555",
      successColor: "#39c75a",
      borderRadiusSmall: "8px",
      borderRadiusMedium: "8px",
      borderRadiusLarge: "10px",
      inputVerticalPadding: "16px",
      inputHorizontalPadding: "12px",
      // Padding inferior grande = espaço entre e-mail e botão Pagar
      formPadding: "12px 0 48px 0",
      inputBorderWidth: "1px",
      inputFocusedBorderWidth: "1px",
    },
  },
};

/** Assinatura recorrente: só à vista — evita dropdown de parcelas com contraste ruim. */
const BRICK_PAYMENT_METHODS = {
  minInstallments: 1,
  maxInstallments: 1,
};

export default function AssinaturaPage() {
  const router = useRouter();
  const isBelowDesktop = useBreakpoint("tablet");
  const isDesktop = !isBelowDesktop;

  const brickAreaRef = useRef<HTMLDivElement>(null);
  const brickContainerRef = useRef<HTMLDivElement>(null);
  const brickControllerRef = useRef<{ unmount?: () => void } | null>(null);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pollAttemptsRef = useRef(0);

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [data, setData] = useState<SubscriptionData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [brickReady, setBrickReady] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [canceling, setCanceling] = useState(false);
  const [pollingTimedOut, setPollingTimedOut] = useState(false);
  const [pollingActive, setPollingActive] = useState(false);
  /** Só true após submit do Brick — nunca após cancelamento. */
  const [awaitingPayment, setAwaitingPayment] = useState(false);

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

  // Se trocar tab/período enquanto Brick está aberto, sincroniza seleção do checkout
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
      brickAreaRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
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
    (subscriptionStatus === "canceling" ||
      subscriptionStatus === "expired" ||
      subscriptionStatus === "cancelled" ||
      !data.isActive);

  const canCancel =
    !!data &&
    !data.isSuperAdmin &&
    (subscriptionStatus === "authorized" || subscriptionStatus === "past_due");

  const priceDimmed = displayStatus === "expired" || displayStatus === "cancelled";

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

      setShowCancelModal(false);
      setSuccess(
        json.access_until
          ? `Assinatura cancelada. Acesso até ${new Date(json.access_until).toLocaleDateString("pt-BR")}.`
          : "Assinatura cancelada. Você mantém o acesso até o fim do ciclo.",
      );
      setAwaitingPayment(false);
      stopPolling();
      setPollingTimedOut(false);
      setCheckoutSelection(null);
      setLoading(true);
      await loadStatus();
      router.refresh();
    } catch {
      setError("Não foi possível cancelar a assinatura");
    } finally {
      setCanceling(false);
    }
  };

  // Brick só monta após Assinar
  useEffect(() => {
    if (
      !needsCheckout ||
      !checkoutSelection ||
      !checkoutPlan ||
      !data?.publicKey ||
      !brickContainerRef.current
    ) {
      return;
    }

    let cancelled = false;
    const amount = checkoutPlan.billing.price;
    const tier = checkoutSelection.tier;
    const period = checkoutSelection.period;

    const initBrick = async () => {
      try {
        setBrickReady(false);

        if (!window.MercadoPago) {
          await new Promise<void>((resolve, reject) => {
            const existing = document.querySelector('script[src*="mercadopago.com/js/v2"]');
            if (existing) {
              existing.addEventListener("load", () => resolve());
              return;
            }
            const script = document.createElement("script");
            script.src = "https://sdk.mercadopago.com/js/v2";
            script.async = true;
            script.onload = () => resolve();
            script.onerror = () => reject(new Error("Falha ao carregar Mercado Pago"));
            document.body.appendChild(script);
          });
        }

        if (cancelled || !window.MercadoPago) return;

        brickControllerRef.current?.unmount?.();
        brickControllerRef.current = null;

        const mp = new window.MercadoPago(data.publicKey!, { locale: "pt-BR" });
        const bricksBuilder = mp.bricks();

        const controller = await bricksBuilder.create("cardPayment", "mp-card-brick", {
          initialization: { amount },
          customization: {
            visual: BRICK_VISUAL,
            paymentMethods: BRICK_PAYMENT_METHODS,
          },
          callbacks: {
            onReady: () => {
              if (!cancelled) setBrickReady(true);
            },
            onSubmit: async (formData: { token?: string; payer?: { email?: string } }) => {
              setSubmitting(true);
              setError(null);
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
                    cardTokenId: formData.token,
                    payerEmail: formData.payer?.email,
                    planTier: tier,
                    billingPeriod: period,
                  }),
                });

                const json = await res.json();
                if (!res.ok) {
                  const detail =
                    json.mpCause != null
                      ? `${json.error || "Erro ao processar assinatura"} (MP ${json.mpStatus ?? "?"} · ${json.mpCause})`
                      : json.error || "Erro ao processar assinatura";
                  console.error("[assinatura:checkout] falhou", json);
                  throw new Error(detail);
                }

                // TEMP debug — resposta síncrona do checkout vs o que o status API lê
                console.log("[assinatura:checkout]", {
                  status: json.status,
                  notificationUrl: json.notificationUrl,
                  planTier: json.planTier,
                });

                setSuccess(
                  json.status === "authorized"
                    ? "Assinatura confirmada."
                    : "Pagamento enviado. Confirmando assinatura...",
                );
                setAwaitingPayment(true);
                startPolling();
                const latest = await loadStatus();
                if (json.status === "authorized" || latest?.isActive) {
                  setAwaitingPayment(false);
                  stopPolling();
                  router.refresh();
                }
                return;
              } catch (err: unknown) {
                const msg = err instanceof Error ? err.message : "Erro ao assinar";
                setError(msg);
                throw err;
              } finally {
                setSubmitting(false);
              }
            },
            onError: (err: unknown) => {
              console.error("[MP-BRICK]", err);
            },
          },
        });

        brickControllerRef.current = controller as { unmount?: () => void };
      } catch (err: unknown) {
        if (!cancelled) {
          const msg = err instanceof Error ? err.message : "Erro ao inicializar pagamento";
          setError(msg);
        }
      }
    };

    void initBrick();

    return () => {
      cancelled = true;
      brickControllerRef.current?.unmount?.();
      brickControllerRef.current = null;
    };
  }, [
    needsCheckout,
    checkoutSelection?.tier,
    checkoutSelection?.period,
    checkoutPlan?.billing.price,
    data?.publicKey,
    loadStatus,
    startPolling,
    stopPolling,
    router,
  ]);

  if (loading) {
    return (
      <div className="min-h-screen bg-surface-0 flex items-center justify-center">
        <DumbbellLoader />
      </div>
    );
  }

  const subscription = data?.subscription;
  const studentUsage =
    data?.studentLimit != null
      ? formatStudentUsage(data.activeStudentCount, data.studentLimit)
      : data?.isSuperAdmin
        ? `${data.activeStudentCount} alunos`
        : null;

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

  const dateLine = (() => {
    if (!accessEndDate) return null;
    if (displayStatus === "canceling") {
      return { label: "Acesso até", date: accessEndDate, color: "#7a8aab" };
    }
    if (displayStatus === "active" || displayStatus === "super_admin") {
      return { label: "Próximo ciclo", date: accessEndDate, color: "#7a8aab" };
    }
    if (displayStatus === "past_due") {
      return { label: "Acesso até", date: accessEndDate, color: "#f59e0b" };
    }
    if (displayStatus === "expired" || displayStatus === "cancelled") {
      return { label: "Expirou em", date: accessEndDate, color: "#e05555" };
    }
    return null;
  })();

  const monthlyRef = selectedPlan?.billingOptions.find((b) => b.period === "monthly");
  const cardLastFour = subscription?.card_last_four || null;
  const billingLabel = statusPeriod ? BILLING_PERIOD_LABELS[statusPeriod] : null;
  const cancelAccessUntil = resolveAccessUntilOnCancel({
    currentPeriodEnd: subscription?.current_period_end,
    billingPeriod: data?.billingPeriod ?? data?.currentPlan?.period ?? null,
    planTier: data?.planTier ?? data?.currentPlan?.tier ?? null,
  });
  const cancelAccessUntilLabel = formatDateBR(cancelAccessUntil);
  const showFinancialMeta =
    displayStatus === "active" ||
    displayStatus === "canceling" ||
    displayStatus === "past_due" ||
    displayStatus === "expired" ||
    displayStatus === "cancelled";

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
                  : "text-white border-[#751BB4]"
                : isTest
                  ? "text-[#e05555]/70 border-transparent hover:text-[#e05555]"
                  : "text-[#7a8aab] border-transparent hover:text-white",
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
                : "bg-transparent text-[#7a8aab] hover:text-white",
            )}
          >
            <span className="block text-[11px] font-medium uppercase">{opt.periodLabel}</span>
            <span
              className={cn(
                "block text-[12px] font-bold mt-0.5",
                active ? "text-white" : "text-[#a8b4c8]",
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

  const brickSection = checkoutSelection && checkoutPlan && data?.publicKey && (
    <div ref={brickAreaRef} className="pt-2">
      <OrderSummary
        planLabel={checkoutPlan.label}
        periodLabel={BILLING_PERIOD_LABELS[checkoutSelection.period]}
        priceDisplay={checkoutPlan.billing.priceDisplay}
      />
      <div
        key={`${checkoutSelection.tier}-${checkoutSelection.period}`}
        id="mp-card-brick"
        ref={brickContainerRef}
        className={cn("mp-card-brick min-h-[200px] mt-2 pb-8", !brickReady && "opacity-50")}
      />
      {submitting && (
        <p className="text-[11px] text-[#7a8aab] mt-4">Confirmando pagamento...</p>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-surface-0 pb-24 lg:pl-28">
      <ScreenHeader
        title="Assinatura"
        subtitle={data?.siteUrl?.replace(/^https?:\/\//, "") || "auronfit.com.br"}
        action={<BackButton href="/admin/perfil" aria-label="Voltar ao perfil" />}
      />

      <div className="px-4 w-full max-w-[min(1600px,96vw)] mx-auto flex flex-col gap-0">
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
          <p className="text-[11px] font-semibold text-[#39c75a] py-3">{success}</p>
        )}

        {awaitingPayment &&
          (pollingActive || pollingTimedOut) &&
          !data?.isActive &&
          data?.subscription?.status !== "canceling" &&
          displayStatus !== "canceling" && (
          <p className="text-[11px] font-semibold text-[#f59e0b] py-3">
            {pollingTimedOut
              ? "Ainda não recebemos a confirmação. Você pode atualizar a página ou voltar em alguns minutos."
              : "Confirmando pagamento..."}
          </p>
        )}

        {/* ── Status line ── */}
        <section className="py-8 border-b border-divider">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 sm:gap-8">
            <div>
              <p className="text-[11px] font-medium uppercase tracking-wider text-[#7a8aab] mb-2">
                {data?.isSuperAdmin ? "Acesso admin" : statusPlanLabel}
              </p>
              {data?.isSuperAdmin ? (
                <p className="text-2xl font-black text-white tracking-tight">Sem cobrança</p>
              ) : (
                <PriceHero price={statusPrice} period={statusPeriod} dimmed={priceDimmed} />
              )}
              {studentUsage && (
                <p className="text-[11px] text-[#7a8aab] mt-3">{studentUsage} ativos</p>
              )}
            </div>

            <div className="flex flex-col items-start sm:items-end justify-center gap-2">
              <InlineStatus status={displayStatus} />
              {dateLine && (
                <p className="text-[11px] text-[#7a8aab]">
                  {dateLine.label}{" "}
                  <span style={{ color: dateLine.color }}>{dateLine.date}</span>
                </p>
              )}

              {showFinancialMeta && !data?.isSuperAdmin && (
                <div className="w-full sm:w-auto sm:min-w-[220px] mt-3 space-y-0.5">
                  <MetaRow
                    label="Forma de pagamento"
                    value={cardLastFour ? `•••• ${cardLastFour}` : "—"}
                  />
                  {displayStatus === "past_due" ? (
                    <MetaRow
                      label="Última tentativa"
                      value="recusada"
                      valueColor="#f59e0b"
                    />
                  ) : displayStatus === "canceling" ? (
                    <>
                      <MetaRow label="Próxima cobrança" value="cancelada" />
                      <MetaRow
                        label="Cobrança"
                        value="encerrada · sem novas cobranças"
                      />
                    </>
                  ) : displayStatus === "active" ? (
                    <>
                      <MetaRow
                        label="Próxima cobrança"
                        value={
                          accessEndDate
                            ? `${accessEndDate} · ${formatCurrencyBRL(statusPrice)}`
                            : "—"
                        }
                      />
                      <MetaRow
                        label="Cobrança"
                        value={billingLabel ? `${billingLabel} · recorrente` : "—"}
                      />
                    </>
                  ) : (
                    <>
                      <MetaRow label="Próxima cobrança" value="—" />
                      <MetaRow label="Cobrança" value="—" />
                    </>
                  )}
                </div>
              )}

              {canCancel && (
                <button
                  type="button"
                  onClick={() => setShowCancelModal(true)}
                  className="text-[11px] text-[#7a8aab] hover:text-[#e05555] underline underline-offset-[3px] transition-colors sm:ml-auto mt-2"
                >
                  cancelar assinatura
                </button>
              )}
            </div>
          </div>
        </section>

        <ConfirmModal
          open={showCancelModal}
          title="Cancelar assinatura?"
          description={
            cancelAccessUntilLabel
              ? `Você mantém o acesso até ${cancelAccessUntilLabel}. Após essa data o painel será bloqueado. Não haverá novas cobranças.`
              : "Após o cancelamento, o painel permanece ativo até o fim do ciclo atual. Não haverá novas cobranças."
          }
          confirmLabel="Sim, cancelar"
          confirmVariant="danger"
          loading={canceling}
          onConfirm={handleCancel}
          onClose={() => !canceling && setShowCancelModal(false)}
        />

        {displayStatus === "canceling" && accessEndDate && (
          <section className="py-5 border-b border-divider">
            <AlertLine borderColor="#7a8aab">
              Renovação cancelada. Seu acesso continua até{" "}
              <span className="text-white font-medium">{accessEndDate}</span>
              . Não haverá novas cobranças. Se quiser continuar depois, escolha um
              plano abaixo para reativar.
            </AlertLine>
          </section>
        )}

        {displayStatus === "past_due" && accessEndDate && (
          <section className="py-5 border-b border-divider">
            <AlertLine borderColor="#f59e0b">
              Cobrança recusada. Atualize seu cartão ou aguarde a retentativa.
              <br />
              Acesso garantido até{" "}
              <span className="text-[#f59e0b] font-semibold">{accessEndDate}</span>.
            </AlertLine>
          </section>
        )}

        {(displayStatus === "expired" || displayStatus === "cancelled") && needsCheckout && (
          <section className="py-5 border-b border-divider">
            <AlertLine borderColor="#e05555">
              <span className="text-[#e05555] font-medium">Seu acesso foi pausado.</span>
              <br />
              Todos os dados dos seus alunos estão preservados.
              <br />
              Reative para continuar prescrevendo.
            </AlertLine>
          </section>
        )}

        {needsCheckout && data!.plans.length > 0 && (
          <section className="pt-8 pb-12 border-b border-divider">
            {!data?.publicKey && (
              <div className="mb-6">
                <AlertLine borderColor="#f59e0b">
                  Mercado Pago não configurado. Defina NEXT_PUBLIC_MP_PUBLIC_KEY nas variáveis de
                  ambiente.
                </AlertLine>
              </div>
            )}

            {planTabs}

            {/* Desktop ≥1024 com Brick: resumo sticky + formulário */}
            {checkoutSelection && isDesktop && data?.publicKey ? (
              <div className="grid gap-12 mt-8" style={{ gridTemplateColumns: "320px 1fr" }}>
                <aside className="sticky top-6 self-start">
                  <p className="text-[11px] font-medium uppercase tracking-wider text-[#7a8aab] mb-2">
                    {selectedPlan?.label}
                  </p>
                  {selectedPlan && (
                    <PriceHero
                      price={selectedPlan.billing.price}
                      period={selectedPeriod}
                      size="md"
                    />
                  )}
                  <p className="text-[11px] text-[#7a8aab] mt-2">
                    {selectedPeriod ? BILLING_PERIOD_LABELS[selectedPeriod] : ""}
                  </p>
                  {periodControl}
                  {featuresList}
                </aside>
                <div>{brickSection}</div>
              </div>
            ) : (
              <div className="max-w-3xl mt-8">
                {selectedPlan && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                    <div>
                      <PriceHero price={selectedPlan.billing.price} period={selectedPeriod} />
                      <p className="text-xs text-[#7a8aab] mt-3 leading-relaxed">
                        {selectedPlan.description}
                      </p>
                      <p className="text-[11px] text-[#7a8aab] mt-2">
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

                {checkoutSelection && data?.publicKey && (
                  <div className="mt-8 border-t border-divider pt-6">
                    {selectedPlan && (
                      <div className="mb-6 sm:hidden">
                        <p className="text-[11px] font-medium uppercase tracking-wider text-[#7a8aab] mb-2">
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
                    {brickSection}
                  </div>
                )}
              </div>
            )}
          </section>
        )}

        {!needsCheckout &&
          !data?.isActive &&
          !data?.isSuperAdmin &&
          subscription?.status === "pending" && (
            <section className="py-8 border-b border-divider">
              <p className="text-xs text-[#7a8aab] mb-4">
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
