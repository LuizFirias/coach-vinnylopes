"use client";



import { useEffect, useRef, useState, useMemo } from "react";

import Link from "next/link";

import { supabaseClient } from "@/lib/supabaseClient";

import DumbbellLoader from "@/app/components/DumbbellLoader";

import { SubscriptionBadge } from "@/app/components/SubscriptionBadge";

import { ScreenHeader } from "@/components/layout/ScreenHeader";

import { Card } from "@/components/ui/Card";

import { Button } from "@/components/ui/Button";

import { Check, ArrowLeft, ShieldCheck, Users } from "@phosphor-icons/react";

import { cn } from "@/lib/utils/cn";

import {

  formatStudentUsage,

  type BillingPeriod,

  type PlanTier,

} from "@/lib/subscriptions/plans";



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

  description: string;

  features: string[];

  billingOptions: PlanBillingOption[];

}



interface SubscriptionData {

  subscription: {

    status: string;

    current_period_end: string | null;

    last_payment_status: string | null;

  } | null;

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

}



declare global {

  interface Window {

    MercadoPago?: new (publicKey: string, options?: { locale: string }) => {

      bricks: () => {

        create: (

          brick: string,

          containerId: string,

          settings: Record<string, unknown>

        ) => Promise<unknown>;

      };

    };

  }

}



export default function AssinaturaPage() {

  const brickContainerRef = useRef<HTMLDivElement>(null);

  const brickControllerRef = useRef<{ unmount?: () => void } | null>(null);



  const [loading, setLoading] = useState(true);

  const [submitting, setSubmitting] = useState(false);

  const [data, setData] = useState<SubscriptionData | null>(null);

  const [error, setError] = useState<string | null>(null);

  const [success, setSuccess] = useState<string | null>(null);

  const [brickReady, setBrickReady] = useState(false);



  const [selectedTier, setSelectedTier] = useState<PlanTier>("start");

  const [selectedPeriod, setSelectedPeriod] = useState<BillingPeriod>("monthly");



  const loadStatus = async () => {

    const {

      data: { session },

    } = await supabaseClient.auth.getSession();

    if (!session?.access_token) {

      setError("Sessão expirada. Faça login novamente.");

      setLoading(false);

      return;

    }



    const res = await fetch("/api/subscriptions/status", {

      headers: { Authorization: `Bearer ${session.access_token}` },

    });

    const json = await res.json();

    if (!res.ok) {

      setError(json.error || "Erro ao carregar assinatura");

      setLoading(false);

      return;

    }

    setData(json);

    setLoading(false);

  };



  useEffect(() => {

    loadStatus();

  }, []);



  const selectedPlan = useMemo(() => {

    if (!data?.plans?.length) return null;

    const plan = data.plans.find((p) => p.tier === selectedTier);

    if (!plan) return null;

    const billing = plan.billingOptions.find((b) => b.period === selectedPeriod);

    if (!billing) return null;

    return { ...plan, billing };

  }, [data?.plans, selectedTier, selectedPeriod]);



  useEffect(() => {

    if (!data?.plans?.length) return;

    const plan = data.plans.find((p) => p.tier === selectedTier);

    if (!plan) return;

    const hasPeriod = plan.billingOptions.some((b) => b.period === selectedPeriod);

    if (!hasPeriod) {

      setSelectedPeriod(plan.billingOptions[0]?.period ?? "monthly");

    }

  }, [selectedTier, selectedPeriod, data?.plans]);



  const needsCheckout =

    data &&

    !data.isSuperAdmin &&

    !data.isActive &&

    data.subscription?.status !== "authorized";



  useEffect(() => {

    if (!needsCheckout || !data?.publicKey || !selectedPlan || !brickContainerRef.current) return;



    let cancelled = false;



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



        const mp = new window.MercadoPago(data.publicKey!, { locale: "pt-BR" });

        const bricksBuilder = mp.bricks();



        const controller = await bricksBuilder.create("cardPayment", "mp-card-brick", {

          initialization: { amount: selectedPlan.billing.price },

          customization: {

            visual: { style: { theme: "dark" } },

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

                    planTier: selectedTier,

                    billingPeriod: selectedPeriod,

                  }),

                });



                const json = await res.json();

                if (!res.ok) throw new Error(json.error || "Erro ao processar assinatura");



                setSuccess("Assinatura criada com sucesso! Seu acesso será liberado em instantes.");

                await loadStatus();

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



    initBrick();



    return () => {

      cancelled = true;

      brickControllerRef.current?.unmount?.();

    };

  }, [needsCheckout, data?.publicKey, selectedPlan?.billing.price, selectedTier, selectedPeriod]);



  if (loading) {

    return (

      <div className="min-h-screen bg-surface-0 flex items-center justify-center">

        <DumbbellLoader />

      </div>

    );

  }



  const subscription = data?.subscription;

  const displayPlanLabel = data?.currentPlan?.label ?? selectedPlan?.label ?? "—";

  const studentUsage =

    data?.studentLimit != null

      ? formatStudentUsage(data.activeStudentCount, data.studentLimit)

      : data?.isSuperAdmin

        ? `${data.activeStudentCount} alunos`

        : null;



  return (

    <div className="min-h-screen bg-surface-0 pb-24 lg:pl-28">

      <ScreenHeader

        title="Assinatura"

        subtitle={`Planos profissionais em ${data?.siteUrl?.replace(/^https?:\/\//, "") || "auronfit.com.br"}`}

        action={

          <Link

            href="/admin/perfil"

            className="h-8 px-3 rounded-md text-xs font-bold transition-all border border-border-subtle text-text-secondary hover:text-text-primary hover:bg-surface-2 flex items-center gap-1.5"

          >

            <ArrowLeft className="w-3.5 h-3.5" />

            Voltar

          </Link>

        }

      />



      <div className="px-4 max-w-4xl mx-auto flex flex-col gap-4">

        {error && (

          <div className="px-4 py-2.5 rounded-lg bg-danger-subtle border border-danger-border text-danger text-xs font-semibold">

            {error}

          </div>

        )}

        {success && (

          <div className="px-4 py-2.5 rounded-lg bg-success-subtle border border-success-border text-success text-xs font-semibold">

            {success}

          </div>

        )}



        <Card className="rounded-xl border border-border-subtle/80 p-5 shadow-sm">

          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">

            <div>

              <p className="text-[10px] font-bold text-text-tertiary uppercase tracking-wider mb-1">

                Status atual

              </p>

              <h2 className="text-lg font-bold text-text-primary">{displayPlanLabel}</h2>

              {data?.isSuperAdmin ? (

                <p className="text-xs text-text-secondary mt-1">Acesso administrativo — sem cobrança</p>

              ) : data?.currentPlan ? (

                <p className="text-xs text-text-secondary mt-1">{data.currentPlan.priceDisplay}</p>

              ) : null}

              {subscription?.current_period_end && (

                <p className="text-xs text-text-secondary mt-1">

                  Próximo ciclo:{" "}

                  {new Date(subscription.current_period_end).toLocaleDateString("pt-BR")}

                </p>

              )}

              {studentUsage && (

                <p className="text-xs text-text-secondary mt-2 flex items-center gap-1.5">

                  <Users className="w-3.5 h-3.5" />

                  {studentUsage} ativos

                </p>

              )}

            </div>

            <SubscriptionBadge

              planName={displayPlanLabel}

              status={subscription?.status ?? null}

              isActive={data?.isActive ?? false}

              studentUsage={studentUsage}

              size="md"

            />

          </div>

        </Card>



        {data?.isActive && (

          <Card className="rounded-xl border border-success-border/50 bg-success-subtle/30 p-5 shadow-sm">

            <div className="flex items-start gap-3">

              <ShieldCheck className="w-6 h-6 text-success flex-shrink-0" weight="fill" />

              <div>

                <h3 className="text-sm font-bold text-text-primary">Assinatura ativa</h3>

                <p className="text-xs text-text-secondary mt-1 leading-relaxed">

                  Seu painel de coach está liberado. Cobranças processadas automaticamente pelo

                  Mercado Pago a cada ciclo contratado.

                </p>

              </div>

            </div>

          </Card>

        )}



        {needsCheckout && data.plans.length > 0 && (

          <>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

              {data.plans.map((plan) => {

                const isSelected = selectedTier === plan.tier;

                return (

                  <button

                    key={plan.tier}

                    type="button"

                    onClick={() => setSelectedTier(plan.tier)}

                    className={cn(

                      "text-left rounded-xl border p-5 transition-all",

                      isSelected

                        ? "border-brand bg-brand/5 shadow-sm ring-1 ring-brand/30"

                        : "border-border-subtle/80 bg-surface-1 hover:border-border-default"

                    )}

                  >

                    <div className="flex items-center justify-between mb-2">

                      <h3 className="text-sm font-bold text-text-primary uppercase tracking-wider">

                        {plan.label}

                      </h3>

                      {isSelected && (

                        <span className="text-[10px] font-bold text-brand uppercase">Selecionado</span>

                      )}

                    </div>

                    <p className="text-xs text-text-secondary mb-3">{plan.description}</p>

                    <p className="text-xs font-semibold text-brand mb-3">

                      Até {plan.studentLimit} alunos ativos

                    </p>

                    <ul className="flex flex-col gap-1.5">

                      {plan.features.slice(0, 3).map((feature) => (

                        <li key={feature} className="flex items-center gap-1.5 text-[11px] text-text-secondary">

                          <Check className="w-3.5 h-3.5 text-brand flex-shrink-0" weight="bold" />

                          {feature}

                        </li>

                      ))}

                    </ul>

                  </button>

                );

              })}

            </div>



            {selectedPlan && (

              <Card className="rounded-xl border border-border-subtle/80 p-5 md:p-6 shadow-sm">

                <h3 className="text-xs font-bold text-text-primary uppercase tracking-wider border-b border-border-subtle pb-2 mb-4">

                  Plano {selectedPlan.label} — escolha a periodicidade

                </h3>



                <div className="flex flex-wrap gap-2 mb-5">

                  {selectedPlan.billingOptions.map((opt) => (

                    <button

                      key={opt.period}

                      type="button"

                      onClick={() => setSelectedPeriod(opt.period)}

                      className={cn(

                        "px-3 py-2 rounded-lg border text-xs font-bold transition-all",

                        selectedPeriod === opt.period

                          ? "border-brand bg-brand/10 text-brand"

                          : "border-border-subtle text-text-secondary hover:text-text-primary"

                      )}

                    >

                      {opt.periodLabel}

                    </button>

                  ))}

                </div>



                <p className="text-3xl font-bold text-text-primary mb-1">

                  {selectedPlan.billing.priceDisplay}

                </p>

                <p className="text-xs text-text-secondary mb-5">

                  Cobrança recorrente · até {selectedPlan.studentLimit} alunos ativos

                </p>



                <ul className="flex flex-col gap-2">

                  {selectedPlan.features.map((feature) => (

                    <li key={feature} className="flex items-center gap-2 text-xs text-text-secondary">

                      <Check className="w-4 h-4 text-brand flex-shrink-0" weight="bold" />

                      {feature}

                    </li>

                  ))}

                </ul>

              </Card>

            )}



            {data.publicKey ? (

              <Card className="rounded-xl border border-border-subtle/80 p-5 md:p-6 shadow-sm">

                <h3 className="text-xs font-bold text-text-primary uppercase tracking-wider border-b border-border-subtle pb-2 mb-4">

                  Dados de pagamento

                </h3>

                <p className="text-[11px] text-text-tertiary mb-4">

                  Pagamento seguro via Mercado Pago · retorno para {data.siteUrl}/admin/assinatura

                </p>

                <div

                  id="mp-card-brick"

                  ref={brickContainerRef}

                  className={cn("min-h-[200px]", !brickReady && "opacity-50")}

                />

                {submitting && (

                  <p className="text-xs text-text-secondary text-center mt-3 animate-pulse">

                    Processando assinatura...

                  </p>

                )}

              </Card>

            ) : (

              <Card className="rounded-xl border border-warning-border bg-warning-subtle/30 p-5">

                <p className="text-xs text-warning font-semibold">

                  Mercado Pago não configurado. Defina NEXT_PUBLIC_MP_PUBLIC_KEY nas variáveis de

                  ambiente.

                </p>

              </Card>

            )}

          </>

        )}



        {!needsCheckout && !data?.isActive && !data?.isSuperAdmin && subscription?.status === "pending" && (

          <Card className="rounded-xl border border-warning-border bg-warning-subtle/30 p-5">

            <p className="text-xs text-text-secondary">

              Sua assinatura está pendente de confirmação. Aguarde alguns instantes ou verifique seu

              e-mail.

            </p>

            <Button variant="secondary" className="mt-4 h-10 text-xs" onClick={loadStatus}>

              Atualizar status

            </Button>

          </Card>

        )}

      </div>

    </div>

  );

}

