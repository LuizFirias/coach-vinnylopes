import { NextResponse } from "next/server";
import { getAuthenticatedCoach } from "@/lib/auth/getAuthenticatedCoach";
import {
  criarOuObterCustomer,
  criarAssinatura,
  listarAssinaturasCustomer,
  AsaasApiError,
  ASAAS_TRIAL_DAYS,
  type AsaasBillingType,
  type AsaasCreditCardInput,
  type AsaasCreditCardHolderInfo,
} from "@/lib/asaas/client";
import { isAsaasTrialEligible } from "@/lib/asaas/trialEligibility";
import { confirmarCartaoTrial } from "@/lib/asaas/trialAccess";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { isValidPlanCombo, getPlanOption, type PlanTier, type BillingPeriod } from "@/lib/subscriptions/plans";

const VALID_BILLING_TYPES: AsaasBillingType[] = ["PIX", "BOLETO", "CREDIT_CARD"];

/** Trava in-process (mesma instância Node) — cobre duplo submit antes do DB. */
const checkoutInflight = new Map<string, number>();
const CHECKOUT_LOCK_MS = 120_000;

function tryAcquireMemoryLock(userId: string): boolean {
  const now = Date.now();
  const until = checkoutInflight.get(userId);
  if (until && until > now) return false;
  checkoutInflight.set(userId, now + CHECKOUT_LOCK_MS);
  return true;
}

function releaseMemoryLock(userId: string) {
  checkoutInflight.delete(userId);
}

function isValidCpfCnpjLength(value: string): boolean {
  const digits = value.replace(/\D/g, "");
  return digits.length === 11 || digits.length === 14;
}

function clientIp(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }
  return req.headers.get("x-real-ip")?.trim() || "127.0.0.1";
}

function normalizeCard(raw: unknown): AsaasCreditCardInput | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const holderName = String(o.holderName || o.nomeTitular || "").trim();
  const number = String(o.number || o.numero || "").replace(/\D/g, "");
  const expiryMonth = String(o.expiryMonth || o.validadeMes || "").replace(/\D/g, "");
  const expiryYear = String(o.expiryYear || o.validadeAno || "").replace(/\D/g, "");
  const ccv = String(o.ccv || o.cvv || "").replace(/\D/g, "");
  if (!holderName || number.length < 13 || !expiryMonth || !expiryYear || ccv.length < 3) {
    return null;
  }
  return {
    holderName,
    number,
    expiryMonth: expiryMonth.padStart(2, "0").slice(0, 2),
    expiryYear: expiryYear.length === 2 ? `20${expiryYear}` : expiryYear,
    ccv,
  };
}

type ProfileCheckout = {
  full_name?: string | null;
  email?: string | null;
  cpf_cnpj?: string | null;
  whatsapp?: string | null;
  asaas_card_token?: string | null;
  asaas_subscription_id?: string | null;
  checkout_lock_until?: string | null;
};

/**
 * Impede 2ª assinatura: checa DB + claim atômico em checkout_lock_until.
 * Retorna NextResponse de erro ou null se ok para prosseguir.
 */
async function assertAndClaimCheckoutSlot(
  supabase: ReturnType<typeof getSupabaseAdmin>,
  userId: string,
  profile: ProfileCheckout | null,
): Promise<NextResponse | null> {
  if (profile?.asaas_subscription_id) {
    return NextResponse.json(
      {
        error:
          "Você já possui uma assinatura em andamento. Atualize a página.",
      },
      { status: 409 },
    );
  }

  const { data: openSubs } = await supabase
    .from("subscriptions")
    .select("id, status, asaas_subscription_id")
    .eq("user_id", userId)
    .eq("provider", "asaas")
    .not("asaas_subscription_id", "is", null)
    .in("status", ["pending", "past_due", "canceling"]);

  if (openSubs && openSubs.length > 0) {
    return NextResponse.json(
      {
        error:
          "Você já possui uma assinatura em andamento. Atualize a página.",
      },
      { status: 409 },
    );
  }

  const now = new Date();
  const lockUntil = new Date(now.getTime() + CHECKOUT_LOCK_MS).toISOString();
  const nowIso = now.toISOString();

  // Claim atômico: só um request ganha se lock expirado/null e sem assinatura.
  const { data: claimed, error: claimError } = await supabase
    .from("profiles")
    .update({ checkout_lock_until: lockUntil })
    .eq("id", userId)
    .is("asaas_subscription_id", null)
    .or(`checkout_lock_until.is.null,checkout_lock_until.lt."${nowIso}"`)
    .select("id")
    .maybeSingle();

  if (claimError?.message?.includes("checkout_lock_until")) {
    // Migration 0075 ainda não aplicada — segue só com memória + checks acima.
    console.warn(
      "[checkout] coluna checkout_lock_until ausente — aplique migration 0075",
    );
    return null;
  }

  if (claimError) {
    console.error("[checkout] falha no claim:", claimError.message);
    return NextResponse.json(
      { error: "Não foi possível iniciar o checkout. Tente novamente." },
      { status: 500 },
    );
  }

  if (!claimed) {
    return NextResponse.json(
      {
        error:
          "Já existe um checkout em andamento. Aguarde alguns segundos e atualize a página.",
      },
      { status: 409 },
    );
  }

  return null;
}

async function releaseCheckoutLock(
  supabase: ReturnType<typeof getSupabaseAdmin>,
  userId: string,
): Promise<void> {
  const { error } = await supabase
    .from("profiles")
    .update({ checkout_lock_until: null })
    .eq("id", userId);
  if (error?.message?.includes("checkout_lock_until")) return;
  if (error) console.warn("[checkout] falha ao liberar lock:", error.message);
}

/**
 * POST /api/subscriptions/checkout
 *
 * Cartão: formulário embutido — creditCard no payload Asaas (validação síncrona).
 *   Trial: nextDueDate = hoje+30; acesso só após cartão autorizado.
 * Pix/Boleto: fatura hospedada; acesso só após webhook de pagamento.
 */
export async function POST(req: Request) {
  let lockUserId: string | null = null;
  let supabase: ReturnType<typeof getSupabaseAdmin> | null = null;
  let claimedDbLock = false;

  try {
    const auth = await getAuthenticatedCoach(req);
    if ("error" in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    if (auth.role === "super_admin") {
      return NextResponse.json({
        success: true,
        message: "Super admin não requer assinatura",
      });
    }

    if (!tryAcquireMemoryLock(auth.userId)) {
      return NextResponse.json(
        {
          error:
            "Já existe um checkout em andamento. Aguarde alguns segundos.",
        },
        { status: 409 },
      );
    }
    lockUserId = auth.userId;

    const body = await req.json();
    const { planTier, billingPeriod, billingType, cpfCnpj, cartao, holder } = body;

    if (!billingType || !VALID_BILLING_TYPES.includes(billingType)) {
      return NextResponse.json({ error: "Forma de pagamento inválida" }, { status: 400 });
    }

    if (!planTier || !billingPeriod || !isValidPlanCombo(planTier, billingPeriod)) {
      return NextResponse.json({ error: "Plano ou periodicidade inválidos" }, { status: 400 });
    }

    const tier = planTier as PlanTier;
    const period = billingPeriod as BillingPeriod;
    const planOption = getPlanOption(tier, period);

    supabase = getSupabaseAdmin();

    const profileQuery = await supabase
      .from("profiles")
      .select(
        "full_name, email, cpf_cnpj, whatsapp, asaas_card_token, asaas_subscription_id, checkout_lock_until",
      )
      .eq("id", auth.userId)
      .maybeSingle();

    let profile = profileQuery.data as ProfileCheckout | null;

    if (
      profileQuery.error?.message?.includes("asaas_card_token") ||
      profileQuery.error?.message?.includes("checkout_lock_until") ||
      profileQuery.error?.message?.includes("asaas_subscription_id")
    ) {
      const fallback = await supabase
        .from("profiles")
        .select("full_name, email, cpf_cnpj, whatsapp, asaas_subscription_id")
        .eq("id", auth.userId)
        .maybeSingle();
      profile = fallback.data
        ? {
            ...fallback.data,
            asaas_card_token: null,
            checkout_lock_until: null,
          }
        : null;
    }

    const email = profile?.email || auth.email;
    if (!email) {
      return NextResponse.json({ error: "E-mail do coach é obrigatório" }, { status: 400 });
    }

    const finalCpfCnpj: string = String(cpfCnpj || profile?.cpf_cnpj || "").replace(/\D/g, "");
    if (!finalCpfCnpj || !isValidCpfCnpjLength(finalCpfCnpj)) {
      return NextResponse.json(
        { error: "CPF ou CNPJ é obrigatório para assinar", needsCpfCnpj: true },
        { status: 400 },
      );
    }

    if (!profile?.cpf_cnpj) {
      await supabase.from("profiles").update({ cpf_cnpj: finalCpfCnpj }).eq("id", auth.userId);
    }

    const { data: existing } = await supabase
      .from("subscriptions")
      .select("id, status")
      .eq("user_id", auth.userId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (existing?.status === "authorized") {
      const { data: accessProfile } = await supabase
        .from("profiles")
        .select("subscription_active, account_type, plan_tier")
        .eq("id", auth.userId)
        .maybeSingle();

      const stillActivePaid =
        accessProfile?.account_type === "teste" ||
        accessProfile?.account_type === "parceiro" ||
        (accessProfile?.subscription_active === true && Boolean(accessProfile?.plan_tier));

      if (stillActivePaid) {
        return NextResponse.json({ error: "Você já possui uma assinatura ativa" }, { status: 409 });
      }
    }

    const gate = await assertAndClaimCheckoutSlot(supabase, auth.userId, profile);
    if (gate) return gate;
    claimedDbLock = true;

    const useTrial =
      billingType === "CREDIT_CARD" && (await isAsaasTrialEligible(auth.userId));

    let creditCard: AsaasCreditCardInput | undefined;
    let creditCardHolderInfo: AsaasCreditCardHolderInfo | undefined;
    let creditCardToken: string | undefined;
    let remoteIp: string | undefined;

    if (billingType === "CREDIT_CARD") {
      remoteIp = clientIp(req);
      const useSavedCard = Boolean(body.useSavedCard);
      const savedToken = profile?.asaas_card_token?.trim() || "";

      if (useSavedCard && savedToken) {
        creditCardToken = savedToken;
      } else {
        const card = normalizeCard(cartao);
        if (!card) {
          return NextResponse.json(
            { error: "Dados do cartão incompletos ou inválidos" },
            { status: 400 },
          );
        }

        const h = holder && typeof holder === "object" ? (holder as Record<string, unknown>) : {};
        const postalCode = String(h.postalCode || h.cep || "").replace(/\D/g, "");
        const addressNumber = String(h.addressNumber || h.numeroEndereco || "").trim();
        const phone = String(h.phone || h.telefone || profile?.whatsapp || "").replace(/\D/g, "");
        const holderCpf = String(h.cpfCnpj || h.cpfTitular || finalCpfCnpj).replace(/\D/g, "");

        if (postalCode.length < 8 || !addressNumber || phone.length < 10) {
          return NextResponse.json(
            { error: "Informe CEP, número do endereço e telefone do titular" },
            { status: 400 },
          );
        }

        creditCard = card;
        creditCardHolderInfo = {
          name: card.holderName,
          email,
          cpfCnpj: holderCpf,
          postalCode,
          addressNumber,
          phone,
          mobilePhone: phone,
        };
      }
    }

    const customerId = await criarOuObterCustomer({
      id: auth.userId,
      nome: profile?.full_name || auth.fullName || "Coach",
      email,
      cpfCnpj: finalCpfCnpj,
    });

    // Rede de segurança: assinatura ACTIVE no Asaas com mesmo coach (externalReference)
    try {
      const ativas = await listarAssinaturasCustomer(customerId, "ACTIVE");
      const doCoach = ativas.filter((s) => s.externalReference === auth.userId);
      if (doCoach.length > 0) {
        return NextResponse.json(
          {
            error:
              "Você já possui uma assinatura em andamento. Atualize a página.",
            existingSubscriptionId: doCoach[0]?.id,
          },
          { status: 409 },
        );
      }
    } catch (err) {
      console.warn("[checkout] falha ao listar assinaturas Asaas (segue):", err);
    }

    let assinatura;
    try {
      assinatura = await criarAssinatura({
        coachId: auth.userId,
        customerId,
        plano: tier,
        ciclo: period,
        billingType: billingType as AsaasBillingType,
        trialDays: useTrial ? ASAAS_TRIAL_DAYS : 0,
        creditCard,
        creditCardHolderInfo,
        creditCardToken,
        remoteIp,
      });
    } catch (err: unknown) {
      if (err instanceof AsaasApiError) {
        console.error("[checkout] erro gateway:", {
          status: err.status,
          path: err.path,
          message: err.message,
        });
        const httpStatus = err.status >= 400 && err.status < 500 ? 400 : 502;
        return NextResponse.json({ error: err.message }, { status: httpStatus });
      }
      throw err;
    }

    // Espelha o id o quanto antes — reduz janela de duplicata se outro request passar
    await supabase
      .from("profiles")
      .update({
        asaas_subscription_id: assinatura.id,
        checkout_lock_until: null,
      })
      .eq("id", auth.userId);
    claimedDbLock = false;

    const trialEndsOn = assinatura.trialEndsOn ?? null;
    const periodEndIso = trialEndsOn
      ? new Date(`${trialEndsOn}T23:59:59`).toISOString()
      : null;

    const isCard = billingType === "CREDIT_CARD";
    const row = {
      user_id: auth.userId,
      provider: "asaas",
      asaas_subscription_id: assinatura.id,
      asaas_customer_id: customerId,
      status: isCard ? "authorized" : "pending",
      current_period_end: useTrial
        ? periodEndIso
        : isCard
          ? null
          : null,
      grace_period_end: null,
      plan_tier: tier,
      billing_period: period,
      student_limit: planOption.studentLimit,
      payment_failure_count: 0,
      card_last_four: assinatura.cardLastFour ?? null,
      updated_at: new Date().toISOString(),
    };

    if (existing?.id) {
      const { error: updateError } = await supabase.from("subscriptions").update(row).eq("id", existing.id);
      if (updateError) throw new Error(updateError.message);
    } else {
      const { error: insertError } = await supabase.from("subscriptions").insert(row);
      if (insertError) throw new Error(insertError.message);
    }

    const tokenToSave = assinatura.creditCardToken || creditCardToken || null;

    if (isCard && useTrial && trialEndsOn) {
      await confirmarCartaoTrial(auth.userId, {
        trialFim: trialEndsOn,
        planTier: tier,
        billingPeriod: period,
        studentLimit: planOption.studentLimit,
        asaasSubscriptionId: assinatura.id,
        periodEndIso,
        creditCardToken: tokenToSave,
        cardLastFour: assinatura.cardLastFour,
      });

      const { sendSubscriptionWelcomeEmail } = await import("@/lib/mercadopago/emails");
      sendSubscriptionWelcomeEmail(
        email,
        profile?.full_name || auth.fullName || "Coach",
        `AuronFit ${planOption.label}`,
        "",
      );
    } else if (isCard && !useTrial) {
      // Reativação / troca — cartão ou token já validados na criação
      const { setUserAccess } = await import("@/lib/access/setUserAccess");
      const { getBillingMonths } = await import("@/lib/subscriptions/plans");
      const months = getBillingMonths(period);
      const end = new Date();
      end.setMonth(end.getMonth() + months);
      const reactivationEnd = end.toISOString();

      await setUserAccess(
        auth.userId,
        "authorized",
        reactivationEnd,
        { planTier: tier, billingPeriod: period, studentLimit: planOption.studentLimit },
        null,
      );

      await supabase
        .from("subscriptions")
        .update({ current_period_end: reactivationEnd, status: "authorized" })
        .eq("user_id", auth.userId)
        .eq("asaas_subscription_id", assinatura.id);

      const profileUpdate: Record<string, unknown> = {
        asaas_subscription_id: assinatura.id,
        plan_tier: tier,
        billing_period: period,
        student_limit: planOption.studentLimit,
        trial_pendente_cartao: false,
        trial_ativo: false,
      };
      if (tokenToSave) profileUpdate.asaas_card_token = tokenToSave;

      await supabase.from("profiles").update(profileUpdate).eq("id", auth.userId);
    } else {
      await supabase
        .from("profiles")
        .update({
          asaas_subscription_id: assinatura.id,
          trial_pendente_cartao: false,
          trial_ativo: false,
        })
        .eq("id", auth.userId);
    }

    return NextResponse.json({
      success: true,
      status: isCard ? "authorized" : "pending",
      trial: useTrial,
      trialEndsOn,
      planTier: tier,
      billingPeriod: period,
      studentLimit: planOption.studentLimit,
      invoiceUrl: isCard ? null : assinatura.invoiceUrl || null,
      cardValidated: isCard,
      usedSavedCard: Boolean(creditCardToken),
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Erro interno";

    if (err instanceof AsaasApiError) {
      console.error("[checkout] erro gateway (catch):", err.message);
      const httpStatus = err.status >= 400 && err.status < 500 ? 400 : 502;
      return NextResponse.json({ error: err.message }, { status: httpStatus });
    }

    console.error("[checkout] erro:", err);
    return NextResponse.json({ error: message }, { status: 500 });
  } finally {
    if (lockUserId) releaseMemoryLock(lockUserId);
    if (claimedDbLock && supabase && lockUserId) {
      await releaseCheckoutLock(supabase, lockUserId);
    }
  }
}
