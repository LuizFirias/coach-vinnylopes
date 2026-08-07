import { NextResponse } from "next/server";
import { getAuthenticatedCoach } from "@/lib/auth/getAuthenticatedCoach";
import {
  criarOuObterCustomer,
  criarAssinatura,
  AsaasApiError,
  type AsaasBillingType,
} from "@/lib/asaas/client";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { isValidPlanCombo, getPlanOption, type PlanTier, type BillingPeriod } from "@/lib/subscriptions/plans";

const VALID_BILLING_TYPES: AsaasBillingType[] = ["PIX", "BOLETO", "CREDIT_CARD"];

function isValidCpfCnpjLength(value: string): boolean {
  const digits = value.replace(/\D/g, "");
  return digits.length === 11 || digits.length === 14;
}

/**
 * POST /api/subscriptions/checkout
 * Cria (ou reaproveita) o customer Asaas do coach + a assinatura recorrente.
 * Retorna invoiceUrl — o coach paga na fatura hospedada pelo Asaas (Pix/Boleto/Cartão).
 * O acesso só é liberado quando o webhook confirmar o pagamento (ver lib/asaas/handlePaymentEvent.ts).
 */
export async function POST(req: Request) {
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

    const { planTier, billingPeriod, billingType, cpfCnpj } = await req.json();

    if (!billingType || !VALID_BILLING_TYPES.includes(billingType)) {
      return NextResponse.json({ error: "Forma de pagamento inválida" }, { status: 400 });
    }

    if (!planTier || !billingPeriod || !isValidPlanCombo(planTier, billingPeriod)) {
      return NextResponse.json({ error: "Plano ou periodicidade inválidos" }, { status: 400 });
    }

    const tier = planTier as PlanTier;
    const period = billingPeriod as BillingPeriod;
    const planOption = getPlanOption(tier, period);

    const supabase = getSupabaseAdmin();

    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name, email, cpf_cnpj")
      .eq("id", auth.userId)
      .maybeSingle();

    const email = profile?.email || auth.email;
    if (!email) {
      return NextResponse.json({ error: "E-mail do coach é obrigatório" }, { status: 400 });
    }

    const finalCpfCnpj: string = profile?.cpf_cnpj || cpfCnpj || "";
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
      return NextResponse.json({ error: "Você já possui uma assinatura ativa" }, { status: 409 });
    }

    const customerId = await criarOuObterCustomer({
      id: auth.userId,
      nome: profile?.full_name || auth.fullName || "Coach",
      email,
      cpfCnpj: finalCpfCnpj,
    });

    let assinatura;
    try {
      assinatura = await criarAssinatura({
        coachId: auth.userId,
        customerId,
        plano: tier,
        ciclo: period,
        billingType: billingType as AsaasBillingType,
      });
    } catch (err: unknown) {
      if (err instanceof AsaasApiError) {
        console.error("[checkout] erro Asaas:", { status: err.status, path: err.path, message: err.message, body: err.body });
        const httpStatus = err.status >= 400 && err.status < 500 ? 400 : 502;
        return NextResponse.json({ error: err.message, asaasStatus: err.status, asaasBody: err.body }, { status: httpStatus });
      }
      throw err;
    }

    const row = {
      user_id: auth.userId,
      provider: "asaas",
      asaas_subscription_id: assinatura.id,
      asaas_customer_id: customerId,
      status: "pending",
      current_period_end: null,
      grace_period_end: null,
      plan_tier: tier,
      billing_period: period,
      student_limit: planOption.studentLimit,
      payment_failure_count: 0,
      updated_at: new Date().toISOString(),
    };

    if (existing?.id) {
      const { error: updateError } = await supabase.from("subscriptions").update(row).eq("id", existing.id);
      if (updateError) throw new Error(updateError.message);
    } else {
      const { error: insertError } = await supabase.from("subscriptions").insert(row);
      if (insertError) throw new Error(insertError.message);
    }

    // Acesso só é liberado quando o webhook confirmar o pagamento da 1ª fatura
    // (ver lib/asaas/handlePaymentEvent.ts) — não concede aqui.

    return NextResponse.json({
      success: true,
      status: "pending",
      planTier: tier,
      billingPeriod: period,
      studentLimit: planOption.studentLimit,
      invoiceUrl: assinatura.invoiceUrl || null,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Erro interno";

    if (err instanceof AsaasApiError) {
      console.error("[checkout] erro Asaas (catch geral):", { status: err.status, path: err.path, message: err.message, body: err.body });
      const httpStatus = err.status >= 400 && err.status < 500 ? 400 : 502;
      return NextResponse.json({ error: err.message, asaasStatus: err.status, asaasBody: err.body }, { status: httpStatus });
    }

    console.error("[checkout] erro:", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
