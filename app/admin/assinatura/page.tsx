"use client";

import { useEffect, useRef, useState, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { supabaseClient } from "@/lib/supabaseClient";
import DumbbellLoader from "@/app/components/DumbbellLoader";
import { Button } from "@/components/ui/Button";
import { Check, Lock } from "@phosphor-icons/react";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { AssinaturaGestaoScreen } from "@/app/components/subscriptions/AssinaturaGestaoScreen";
import {
  FormularioCartao,
  type DadosCartaoForm,
} from "@/app/components/subscriptions/FormularioCartao";
import { cn } from "@/lib/utils/cn";
import {
  BILLING_PERIOD_LABELS,
  getMonthlyEquivalent,
  formatPlanStudentCap,
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
  studentLimit: number | null;
  unlimitedStudents?: boolean;
  studentCapLabel?: string;
  description: string;
  features: { text: string; included: boolean; highlight?: boolean }[];
  cta?: string;
  badge?: string | null;
  accent?: "danger" | null;
  featured?: boolean;
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
    studentLimit: number | null;
  } | null;
  trialAtivo?: boolean;
  trialFim?: string | null;
  /** true se nunca teve pagamento confirmado — pode ganhar 30 dias grátis no cartão */
  trialEligible?: boolean;
  isFreeTier?: boolean;
  trialPendenteCartao?: boolean;
  /** Token Asaas salvo — permite reativar/trocar sem novo formulário */
  hasSavedCard?: boolean;
  savedCardLastFour?: string | null;
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
  const d = new Date(iso.includes("T") ? iso : `${iso}T12:00:00`);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString("pt-BR");
}

function daysUntil(iso: string | null | undefined): number | null {
  if (!iso) return null;
  const d = new Date(iso.includes("T") ? iso : `${iso}T12:00:00`);
  if (Number.isNaN(d.getTime())) return null;
  return Math.max(0, Math.ceil((d.getTime() - Date.now()) / 86_400_000));
}

/** Preview da data de cobrança do trial (hoje + 30 dias, calendário local). */
function trialChargeDateLabel(days = 30): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toLocaleDateString("pt-BR");
}

function splitPrice(price: number): { int: string; dec: string } {
  const [int, dec] = price.toFixed(2).split(".");
  return { int, dec };
}

function periodUnit(period: BillingPeriod): string {
  if (period === "yearly") return "/ano";
  if (period === "semester") return "/sem";
  return "/mês";
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
  // No anual, destaca o equivalente mensal (mensagem "pague 10, use 12")
  const displayPrice =
    period === "yearly" ? getMonthlyEquivalent(price, "yearly") : price;
  const unit = period === "yearly" ? "/mês" : period ? periodUnit(period) : "/mês";
  const { int, dec } = splitPrice(displayPrice);
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
  trial,
  trialEndsOnLabel,
}: {
  planLabel: string;
  periodLabel: string;
  priceDisplay: string;
  trial?: boolean;
  trialEndsOnLabel?: string | null;
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
      {trial ? (
        <p className="text-[11px] font-medium text-brand mt-3 leading-relaxed">
          Grátis por 30 dias.
          {trialEndsOnLabel ? ` Você só será cobrado em ${trialEndsOnLabel}.` : ""}{" "}
          Cancele quando quiser, sem multa.
        </p>
      ) : (
        <p className="text-[10px] text-text-tertiary mt-3">
          Cobrança recorrente · cancele quando quiser
        </p>
      )}
      <p className="text-[10px] text-text-tertiary mt-1 flex items-center gap-1">
        <Lock className="w-3 h-3" weight="fill" />
        Seus dados são protegidos e processados com segurança
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

  const paymentAreaRef = useRef<HTMLDivElement>(null);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pollAttemptsRef = useRef(0);
  /** Trava síncrona — setState de submitting só aplica no próximo render. */
  const submittingRef = useRef(false);

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [data, setData] = useState<SubscriptionData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod | null>("CREDIT_CARD");
  const [cpfCnpj, setCpfCnpj] = useState("");
  const [invoiceUrl, setInvoiceUrl] = useState<string | null>(null);
  const [useSavedCard, setUseSavedCard] = useState(true);
  const [canceling, setCanceling] = useState(false);
  const [pollingTimedOut, setPollingTimedOut] = useState(false);
  const [pollingActive, setPollingActive] = useState(false);
  /** Só true após gerar a fatura Asaas — nunca após cancelamento. */
  const [awaitingPayment, setAwaitingPayment] = useState(false);
  /** Alterar plano/cartão com assinatura ativa — abre checkout sem exigir expiração. */
  const [forceCheckout, setForceCheckout] = useState(false);

  const [selectedTier, setSelectedTier] = useState<PlanTier>("start");
  const [selectedPeriod, setSelectedPeriod] = useState<BillingPeriod>("monthly");
  const [checkoutSelection, setCheckoutSelection] = useState<CheckoutSelection | null>(null);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [billingName, setBillingName] = useState("");
  const [billingAddress, setBillingAddress] = useState("");
  const [billingCity, setBillingCity] = useState("");
  const [billingCep, setBillingCep] = useState("");
  const [couponOpen, setCouponOpen] = useState(false);
  const [coupon, setCoupon] = useState("");
  const [couponMsg, setCouponMsg] = useState<string | null>(null);

  const loadStatus = useCallback(async (): Promise<SubscriptionData | null> => {
    let {
      data: { session },
    } = await supabaseClient.auth.getSession();

    // Sessão ainda hidratando após signup — tenta refresh uma vez
    if (!session?.access_token) {
      const { data: refreshed } = await supabaseClient.auth.refreshSession();
      session = refreshed.session;
    }

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
      // Cookie stale pode ter causado 401 mesmo com Bearer — tenta renovar e repetir 1x
      if (res.status === 401) {
        const { data: refreshed } = await supabaseClient.auth.refreshSession();
        const token = refreshed.session?.access_token;
        if (token) {
          const retry = await fetch(`/api/subscriptions/status?_=${Date.now()}`, {
            headers: { Authorization: `Bearer ${token}` },
            cache: "no-store",
          });
          const retryJson = await retry.json();
          if (retry.ok) {
            setData(retryJson);
            setLoading(false);
            return retryJson as SubscriptionData;
          }
        }
      }
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
      hasSavedCard: json.hasSavedCard ?? false,
    });

    if (json.hasSavedCard) setUseSavedCard(true);

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

  useEffect(() => {
    void (async () => {
      const {
        data: { session },
      } = await supabaseClient.auth.getSession();
      const uid = session?.user?.id;
      if (!uid) return;
      const { data: profile } = await supabaseClient
        .from("profiles")
        .select("full_name")
        .eq("id", uid)
        .maybeSingle();
      const name = profile?.full_name?.trim();
      if (name) setBillingName(name);
    })();
  }, []);

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

  /** Confirma o checkout. Cartão: formulário embutido ou token salvo. Pix/Boleto: fatura. */
  const handleConfirmPayment = useCallback(
    async (cartao?: DadosCartaoForm, opts?: { useSavedCard?: boolean }) => {
      if (!checkoutSelection || !paymentMethod) return;
      if (submittingRef.current) return;

      const withSaved = Boolean(opts?.useSavedCard && data?.hasSavedCard);

      const digits = cpfCnpj.replace(/\D/g, "");
      if (!withSaved && digits.length !== 11 && digits.length !== 14) {
        setError("Informe um CPF ou CNPJ válido.");
        return;
      }

      if (paymentMethod === "CREDIT_CARD" && !withSaved && !cartao) {
        setError("Preencha os dados do cartão.");
        return;
      }

      submittingRef.current = true;
      setSubmitting(true);
      setError(null);
      setInvoiceUrl(null);
      try {
        const {
          data: { session },
        } = await supabaseClient.auth.getSession();
        if (!session?.access_token) throw new Error("Sessão expirada");

        const payload: Record<string, unknown> = {
          planTier: checkoutSelection.tier,
          billingPeriod: checkoutSelection.period,
          billingType: paymentMethod,
          cpfCnpj: digits || undefined,
          useSavedCard: withSaved,
        };

        if (paymentMethod === "CREDIT_CARD" && cartao && !withSaved) {
          payload.cartao = {
            holderName: cartao.nomeTitular,
            number: cartao.numero,
            expiryMonth: cartao.validadeMes,
            expiryYear: cartao.validadeAno,
            ccv: cartao.cvv,
          };
          payload.holder = {
            cpfCnpj: cartao.cpfTitular || digits,
            postalCode: cartao.cep,
            addressNumber: cartao.numeroEndereco,
            phone: cartao.telefone,
          };
        }

        const res = await fetch("/api/subscriptions/checkout", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify(payload),
        });

        const json = await res.json();
        if (!res.ok) {
          throw new Error(json.error || "Erro ao processar assinatura");
        }

        if (json.cardValidated || json.trial) {
          const chargeLabel = formatDateBR(json.trialEndsOn) || trialChargeDateLabel();
          setSuccess(
            json.trial
              ? `Cartão validado com sucesso. Teste grátis ativo até ${chargeLabel}.`
              : "Cartão validado com sucesso. Sua assinatura está ativa.",
          );
          setCheckoutSelection(null);
          setForceCheckout(false);
          setAwaitingPayment(false);
          await loadStatus();
          router.refresh();
          return;
        }

        if (json.invoiceUrl) {
          setInvoiceUrl(json.invoiceUrl);
          window.open(json.invoiceUrl, "_blank", "noopener,noreferrer");
        }

        setSuccess("Fatura gerada. Finalize o pagamento na aba aberta.");
        setAwaitingPayment(true);
        startPolling();
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Erro ao assinar";
        setError(msg);
      } finally {
        submittingRef.current = false;
        setSubmitting(false);
      }
    },
    [
      checkoutSelection,
      paymentMethod,
      cpfCnpj,
      data?.hasSavedCard,
      startPolling,
      loadStatus,
      router,
    ],
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-surface-0 flex items-center justify-center">
        <DumbbellLoader />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen bg-surface-0 flex flex-col items-center justify-center gap-4 px-4">
        <p className="text-sm text-text-secondary text-center max-w-sm">
          {error || "Não foi possível carregar os planos. Tente novamente."}
        </p>
        <Button
          variant="primary"
          className="h-10 text-xs rounded-md"
          onClick={() => {
            setLoading(true);
            setError(null);
            void loadStatus();
          }}
        >
          Tentar de novo
        </Button>
      </div>
    );
  }

  const subscription = data.subscription;

  const statusPlanLabel = data.currentPlan?.label ?? selectedPlan?.label ?? "—";
  const statusPeriod = data.currentPlan?.period ?? data.billingPeriod ?? selectedPeriod;

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

  const cardLastFour = subscription?.card_last_four || null;
  const cancelAccessUntil = resolveAccessUntilOnCancel({
    currentPeriodEnd: subscription?.current_period_end,
    billingPeriod: data?.billingPeriod ?? data?.currentPlan?.period ?? null,
    planTier: data?.planTier ?? data?.currentPlan?.tier ?? null,
  });
  const cancelAccessUntilLabel = formatDateBR(cancelAccessUntil);

  const featuresList = selectedPlan && (
    <ul className="flex flex-col mt-6">
      {selectedPlan.features.map((feature) => (
        <li
          key={feature.text}
          className="flex items-center gap-2 py-2.5 border-b border-divider text-xs text-text-secondary last:border-0"
        >
          <Check className="w-3.5 h-3.5 text-brand shrink-0" weight="bold" />
          {feature.text}
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
        trial={paymentMethod === "CREDIT_CARD" && Boolean(data?.trialEligible)}
        trialEndsOnLabel={
          paymentMethod === "CREDIT_CARD" && data?.trialEligible
            ? trialChargeDateLabel()
            : null
        }
      />
      <div key={`${checkoutSelection.tier}-${checkoutSelection.period}`} className="pt-2 pb-8">
        {paymentMethod !== "CREDIT_CARD" && (
          <>
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
          </>
        )}

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
        {paymentMethod === "CREDIT_CARD" && data?.trialEligible && (
          <p className="text-[10px] text-text-secondary mt-2 leading-relaxed">
            Com cartão você ganha 30 dias grátis. Pix e boleto cobram na hora.
          </p>
        )}

        {paymentMethod === "CREDIT_CARD" ? (
          <div className="mt-6">
            {data?.hasSavedCard && useSavedCard ? (
              <div className="flex flex-col gap-3">
                <div className="rounded-xl border border-border-card-hover bg-surface-1 p-4">
                  <p className="text-sm text-text-primary font-medium">
                    Cartão salvo
                    {data.savedCardLastFour
                      ? ` ·••• ${data.savedCardLastFour}`
                      : ""}
                  </p>
                  <p className="text-xs text-text-tertiary mt-1">
                    Usaremos o cartão já cadastrado — sem digitar de novo.
                  </p>
                </div>
                <button
                  type="button"
                  disabled={submitting}
                  className="flex h-12 w-full shrink-0 items-center justify-center rounded-[10px] text-sm font-bold shadow-btn-glow disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{
                    background: "var(--btn-primary-bg)",
                    color: "var(--text-on-brand)",
                  }}
                  onClick={() => void handleConfirmPayment(undefined, { useSavedCard: true })}
                >
                  {submitting
                    ? "Processando..."
                    : data?.trialEligible
                      ? "Liberar 30 dias grátis"
                      : "Confirmar com cartão salvo"}
                </button>
                <button
                  type="button"
                  className="text-xs font-medium text-brand hover:underline"
                  onClick={() => setUseSavedCard(false)}
                >
                  Usar outro cartão
                </button>
                <p className="text-center text-xs text-text-tertiary leading-relaxed">
                  Seus dados são protegidos e processados com segurança.
                </p>
              </div>
            ) : (
              <>
                {data?.hasSavedCard && (
                  <button
                    type="button"
                    className="mb-4 text-xs font-medium text-brand hover:underline"
                    onClick={() => setUseSavedCard(true)}
                  >
                    ← Voltar ao cartão salvo
                    {data.savedCardLastFour ? ` ·••• ${data.savedCardLastFour}` : ""}
                  </button>
                )}
                <FormularioCartao
                  loading={submitting}
                  defaultCpf={cpfCnpj}
                  submitLabel={
                    data?.trialEligible ? "Liberar 30 dias grátis" : "Confirmar cartão"
                  }
                  onSubmit={async (dados) => {
                    if (!cpfCnpj.replace(/\D/g, "")) {
                      setCpfCnpj(dados.cpfTitular);
                    }
                    await handleConfirmPayment(dados, { useSavedCard: false });
                  }}
                />
              </>
            )}
          </div>
        ) : (
          <button
            type="button"
            onClick={() => void handleConfirmPayment()}
            disabled={!paymentMethod || submitting}
            className="mt-6 w-full h-12 rounded-md text-sm font-bold text-white bg-brand hover:bg-brand-hover transition-colors disabled:opacity-50"
          >
            {submitting ? "Processando..." : "Ir para pagamento"}
          </button>
        )}

        {invoiceUrl && paymentMethod !== "CREDIT_CARD" && (
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

  const showManageActions =
    !forceCheckout && canReturnToManage && !data.isFreeTier;

  const trialDays = daysUntil(data.trialFim);
  const trialFimLabel = formatDateBR(data.trialFim);
  const catalogPeriod = selectedPeriod === "semester" ? "monthly" : selectedPeriod;

  const statusCard = (() => {
    if (data.trialAtivo && !data.isSuperAdmin) {
      return {
        title: "Período experimental",
        subtitle: trialFimLabel ? `Até ${trialFimLabel}` : "Teste grátis ativo",
        pill: trialDays != null ? `${trialDays} dias` : "Ativo",
        tone: "trial" as const,
      };
    }
    if (data.isFreeTier) {
      return {
        title: "Plano gratuito",
        subtitle: formatPlanStudentCap(data.planTier, data.studentLimit),
        pill: "Grátis",
        tone: "neutral" as const,
      };
    }
    if (displayStatus === "canceling") {
      return {
        title: statusPlanLabel,
        subtitle: accessEndDate ? `Acesso até ${accessEndDate}` : "Cancelamento agendado",
        pill: "Cancelando",
        tone: "neutral" as const,
      };
    }
    if (displayStatus === "past_due") {
      return {
        title: statusPlanLabel,
        subtitle: accessEndDate ? `Acesso até ${accessEndDate}` : "Cobrança pendente",
        pill: "Pendente",
        tone: "warn" as const,
      };
    }
    if (displayStatus === "expired" || displayStatus === "cancelled") {
      return {
        title: statusPlanLabel,
        subtitle: "Acesso pausado",
        pill: "Expirada",
        tone: "danger" as const,
      };
    }
    return {
      title: data.isSuperAdmin ? "ADMIN" : statusPlanLabel,
      subtitle: accessEndDate
        ? `Renovação em ${accessEndDate}`
        : BILLING_PERIOD_LABELS[statusPeriod] ?? "Assinatura ativa",
      pill: STATUS_LINE[displayStatus]?.label ?? "Ativo",
      tone: "ok" as const,
    };
  })();

  const checkoutBlock = checkoutSelection && checkoutPlan ? (
    <div className="mt-8 max-w-xl">
      <button
        type="button"
        onClick={() => setCheckoutSelection(null)}
        className="mb-4 text-xs font-medium text-brand hover:underline"
      >
        ← Trocar plano
      </button>
      {selectedPlan && (
        <div className="mb-4">
          <p className="text-[11px] font-medium uppercase tracking-wider text-text-secondary mb-2">
            {selectedPlan.label}
          </p>
          <PriceHero
            price={
              selectedPeriod === "yearly"
                ? getMonthlyEquivalent(selectedPlan.billing.price, "yearly")
                : selectedPlan.billing.price
            }
            period="monthly"
            size="md"
          />
          {featuresList}
        </div>
      )}
      {paymentSection}
    </div>
  ) : null;

  const pendingBlock =
    subscription?.status === "pending" && !data.isActive && !checkoutSelection ? (
      <section className="py-6">
        <p className="mb-4 text-xs text-text-secondary">
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
    ) : null;

  return (
    <>
      <AssinaturaGestaoScreen
        useBackClick={Boolean(forceCheckout && canReturnToManage)}
        onBack={() => {
          setForceCheckout(false);
          setCheckoutSelection(null);
        }}
        statusCard={statusCard}
        showManageActions={showManageActions}
        canCancel={canCancel}
        onCancelClick={() => setShowCancelModal(true)}
        onAlterarPagamento={() => {
          const tier = data.currentPlan?.tier ?? data.planTier ?? selectedTier;
          const period = data.currentPlan?.period ?? data.billingPeriod ?? selectedPeriod;
          openCheckout(tier, period);
        }}
        cardLastFour={cardLastFour}
        billingName={billingName}
        onBillingName={setBillingName}
        cpfCnpj={cpfCnpj}
        onCpfCnpj={setCpfCnpj}
        billingAddress={billingAddress}
        onBillingAddress={setBillingAddress}
        billingCity={billingCity}
        onBillingCity={setBillingCity}
        billingCep={billingCep}
        onBillingCep={setBillingCep}
        catalogPeriod={catalogPeriod}
        onPeriodChange={setSelectedPeriod}
        couponOpen={couponOpen}
        onToggleCoupon={() => setCouponOpen((v) => !v)}
        coupon={coupon}
        onCoupon={(v) => {
          setCoupon(v);
          setCouponMsg(null);
        }}
        couponMsg={couponMsg}
        onApplyCoupon={() =>
          setCouponMsg(
            coupon.trim()
              ? "Cupons ainda não estão disponíveis. Em breve."
              : "Digite um cupom para aplicar.",
          )
        }
        plans={data.plans}
        onSelectPlan={(tier, period) => {
          setSelectedTier(tier);
          setSelectedPeriod(period);
          setCheckoutSelection({ tier, period });
          setForceCheckout(true);
        }}
        trialEligible={Boolean(data?.trialEligible)}
        currentPlanTier={
          data.isFreeTier || data.isSuperAdmin ? null : data.planTier
        }
        checkout={checkoutBlock}
        pendingBlock={pendingBlock}
      >
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

        {displayStatus === "canceling" && accessEndDate && (
          <AlertLine borderColor="#7a8aab">
            Renovação cancelada. Seu acesso continua até{" "}
            <span className="text-text-primary font-medium">{accessEndDate}</span>
            . Não haverá novas cobranças.
          </AlertLine>
        )}

        {displayStatus === "past_due" && accessEndDate && (
          <AlertLine borderColor="#f59e0b">
            Cobrança recusada. Atualize seu cartão ou aguarde a retentativa.
            <br />
            Acesso garantido até{" "}
            <span className="text-warning font-semibold">{accessEndDate}</span>.
          </AlertLine>
        )}

        {(displayStatus === "expired" || displayStatus === "cancelled") && needsCheckout && !data.isFreeTier && (
          <AlertLine borderColor="#e05555">
            <span className="text-danger font-medium">Seu acesso foi pausado.</span>
            <br />
            Todos os dados dos seus alunos estão preservados.
            <br />
            Reative para continuar prescrevendo.
          </AlertLine>
        )}

        {data?.trialPendenteCartao && (
          <AlertLine borderColor="#9333ea">
            <span className="text-brand font-medium">Finalize seu cadastro</span>
            <br />
            Valide o cartão abaixo para liberar o teste de 30 dias. Sem isso, a cobrança
            automática não é ativada.
          </AlertLine>
        )}

      </AssinaturaGestaoScreen>
      <ConfirmModal
        open={showCancelModal}
        title="Cancelar assinatura?"
        description={
          cancelAccessUntilLabel
            ? `Você continuará com o plano atual até ${cancelAccessUntilLabel}. Depois volta ao gratuito (até 3 alunos). Não haverá novas cobranças.`
            : "Você continuará com o plano atual até o fim do período já pago. Depois volta ao gratuito (até 3 alunos). Não haverá novas cobranças."
        }
        confirmLabel="Confirmar cancelamento"
        cancelLabel="Manter assinatura"
        confirmVariant="danger"
        loading={canceling}
        onConfirm={async () => {
          await handleCancel();
          setShowCancelModal(false);
        }}
        onClose={() => !canceling && setShowCancelModal(false)}
      />
    </>
  );
}
