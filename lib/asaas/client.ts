import "server-only";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { getPlanOption, type BillingPeriod, type PlanTier } from "@/lib/subscriptions/plans";
import { getSiteUrl } from "@/lib/subscriptions/siteUrl";

const ASAAS_API_BASE_SANDBOX = "https://sandbox.asaas.com/api/v3";
const ASAAS_API_BASE_PROD = "https://api.asaas.com/v3";

export function getAsaasEnv(): "sandbox" | "production" {
  const env = String(process.env.ASAAS_ENV || "sandbox").trim().toLowerCase();
  return env === "production" ? "production" : "sandbox";
}

export function getAsaasApiBase(): string {
  return getAsaasEnv() === "production" ? ASAAS_API_BASE_PROD : ASAAS_API_BASE_SANDBOX;
}

export function getAsaasApiKey(): string {
  const key = process.env.ASAAS_API_KEY;
  if (!key) {
    throw new Error("Asaas API key não configurada (ASAAS_API_KEY)");
  }
  return key;
}

export class AsaasApiError extends Error {
  status: number;
  path: string;
  body: unknown;

  constructor(opts: { status: number; path: string; message: string; body: unknown }) {
    super(opts.message);
    this.name = "AsaasApiError";
    this.status = opts.status;
    this.path = opts.path;
    this.body = opts.body;
  }
}

function extractAsaasErrorMessage(data: unknown, status: number): string {
  const obj = (data && typeof data === "object" ? data : {}) as {
    errors?: Array<{ description?: string; code?: string }>;
  };
  const first = Array.isArray(obj.errors) ? obj.errors[0] : null;
  return first?.description || `Asaas API error ${status}`;
}

export async function asaasFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${getAsaasApiBase()}${path}`, {
    ...init,
    headers: {
      access_token: getAsaasApiKey(),
      "Content-Type": "application/json",
      ...init?.headers,
    },
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    const message = extractAsaasErrorMessage(data, res.status);
    console.error("[ASAAS-API] request failed", {
      path,
      method: init?.method || "GET",
      status: res.status,
      message,
      body: data,
    });
    throw new AsaasApiError({ status: res.status, path, message, body: data });
  }

  return data as T;
}

interface AsaasCustomer {
  id: string;
}

/** Cria (ou reaproveita) o customer Asaas do coach — 1 por coach, salvo em profiles. */
export async function criarOuObterCustomer(coach: {
  id: string;
  nome: string;
  email: string;
  cpfCnpj: string;
}): Promise<string> {
  const supabase = getSupabaseAdmin();

  const { data: profile } = await supabase
    .from("profiles")
    .select("asaas_customer_id")
    .eq("id", coach.id)
    .maybeSingle();

  if (profile?.asaas_customer_id) {
    return profile.asaas_customer_id;
  }

  const customer = await asaasFetch<AsaasCustomer>("/customers", {
    method: "POST",
    body: JSON.stringify({
      name: coach.nome,
      email: coach.email,
      cpfCnpj: coach.cpfCnpj,
      externalReference: coach.id,
    }),
  });

  await supabase.from("profiles").update({ asaas_customer_id: customer.id }).eq("id", coach.id);

  return customer.id;
}

const CICLO_ASAAS: Record<BillingPeriod, string> = {
  monthly: "MONTHLY",
  semester: "SEMIANNUALLY",
  yearly: "YEARLY",
};

export type AsaasBillingType = "PIX" | "BOLETO" | "CREDIT_CARD" | "UNDEFINED";

export interface AsaasSubscription {
  id: string;
  status: string;
  customer: string;
  nextDueDate?: string;
}

export interface AsaasSubscriptionWithInvoice extends AsaasSubscription {
  /** Primeira cobrança da assinatura — link hospedado pelo Asaas pra pagar Pix/Boleto/Cartão. */
  invoiceUrl?: string | null;
}

/** Cria a assinatura recorrente no Asaas e retorna também o link de pagamento da 1ª fatura. */
export async function criarAssinatura(input: {
  coachId: string;
  customerId: string;
  plano: PlanTier;
  ciclo: BillingPeriod;
  billingType: AsaasBillingType;
}): Promise<AsaasSubscriptionWithInvoice> {
  const option = getPlanOption(input.plano, input.ciclo);

  const assinatura = await asaasFetch<AsaasSubscription>("/subscriptions", {
    method: "POST",
    body: JSON.stringify({
      customer: input.customerId,
      billingType: input.billingType,
      cycle: CICLO_ASAAS[input.ciclo],
      value: option.price,
      description: option.reason,
      nextDueDate: new Date().toISOString().slice(0, 10),
      externalReference: input.coachId,
    }),
  });

  // Busca a primeira cobrança gerada pra pegar o invoiceUrl (link hospedado de pagamento).
  let invoiceUrl: string | null = null;
  try {
    const payments = await asaasFetch<{ data: Array<{ invoiceUrl?: string }> }>(
      `/payments?subscription=${assinatura.id}&limit=1`,
    );
    invoiceUrl = payments.data?.[0]?.invoiceUrl || null;
  } catch (err) {
    console.error("[ASAAS] falha ao buscar invoiceUrl da 1ª cobrança:", err);
  }

  return { ...assinatura, invoiceUrl };
}

/** Cancela a assinatura recorrente no Asaas. */
export async function cancelarAssinatura(asaasSubscriptionId: string): Promise<void> {
  if (!asaasSubscriptionId) {
    throw new Error("asaas_subscription_id ausente");
  }
  await asaasFetch(`/subscriptions/${asaasSubscriptionId}`, { method: "DELETE" });
}

/** URL de retorno usada em telas/e-mails — mesmo padrão do back_url do MP. */
export function getAsaasBackUrl(): string {
  return `${getSiteUrl()}/admin/assinatura?status=success`;
}
