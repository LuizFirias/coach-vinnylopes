import "server-only";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { getPlanOption, type BillingPeriod, type PlanTier } from "@/lib/subscriptions/plans";
import { getSiteUrl } from "@/lib/subscriptions/siteUrl";

const ASAAS_API_BASE_SANDBOX = "https://api-sandbox.asaas.com/v3";
const ASAAS_API_BASE_PROD = "https://api.asaas.com/v3";

/** Dias de trial gratuito antes da 1ª cobrança (cartão). */
export const ASAAS_TRIAL_DAYS = 30;

export function getAsaasEnv(): "sandbox" | "production" {
  const env = String(process.env.ASAAS_ENV || "sandbox").trim().toLowerCase();
  return env === "production" ? "production" : "sandbox";
}

export function getAsaasApiBase(): string {
  return getAsaasEnv() === "production" ? ASAAS_API_BASE_PROD : ASAAS_API_BASE_SANDBOX;
}

/** URL absoluta para qualquer path da API Asaas — use em todas as chamadas. */
export function asaasUrl(path: string): string {
  const base = getAsaasApiBase();
  return `${base}${path.startsWith("/") ? path : `/${path}`}`;
}

export function getAsaasApiKey(): string {
  let key = String(process.env.ASAAS_API_KEY ?? "").trim();
  // .env com escape Next (\$) lido via dotenv pode trazer barra literal
  if (key.startsWith("\\$")) key = `$${key.slice(2)}`;
  if (!key) {
    throw new Error(
      "Asaas API key não configurada (ASAAS_API_KEY). No .env.local escape o $ inicial: ASAAS_API_KEY=\\$aact_hmlg_... e reinicie o npm run dev.",
    );
  }
  return key;
}

/** Headers padrão — access_token + JSON. */
export function asaasHeaders(): HeadersInit {
  return {
    "Content-Type": "application/json",
    access_token: getAsaasApiKey(),
    "User-Agent": "AuronFit/1.0",
  };
}

/**
 * Garante que ASAAS_ENV bate com o prefixo da API Key.
 * Sandbox: $aact_hmlg_ · Produção: $aact_prod_
 */
export function validarAmbienteAsaas(): void {
  const key = process.env.ASAAS_API_KEY ?? "";
  const env = getAsaasEnv();

  if (!key) return; // getAsaasApiKey() falha na 1ª chamada

  if (env === "production" && !key.startsWith("$aact_prod_")) {
    throw new Error("ASAAS_ENV=production mas a API Key não é de produção ($aact_prod_)");
  }
  if (env === "sandbox" && !key.startsWith("$aact_hmlg_")) {
    throw new Error("ASAAS_ENV=sandbox mas a API Key não é de sandbox ($aact_hmlg_)");
  }
}

let envValidated = false;
function ensureAsaasEnvValidated(): void {
  if (envValidated) return;
  validarAmbienteAsaas();
  envValidated = true;
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
  return first?.description || `Não foi possível processar o pagamento (${status})`;
}

export async function asaasFetch<T>(path: string, init?: RequestInit): Promise<T> {
  ensureAsaasEnvValidated();

  const res = await fetch(asaasUrl(path), {
    ...init,
    headers: {
      ...asaasHeaders(),
      ...init?.headers,
    },
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    const message = extractAsaasErrorMessage(data, res.status);
    const errors =
      data && typeof data === "object" && Array.isArray((data as { errors?: unknown }).errors)
        ? (data as { errors: unknown[] }).errors
        : null;
    console.error("[ASAAS-API] request failed", {
      path,
      method: init?.method || "GET",
      status: res.status,
      message,
      // JSON.stringify evita [Object] no terminal e mostra code/description
      errors: errors ? JSON.stringify(errors, null, 2) : undefined,
      body: JSON.stringify(data, null, 2),
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

/** Semestral (SEMIANNUALLY) removido — só mensal e anual em novas assinaturas. */
const CICLO_ASAAS: Record<"monthly" | "yearly", string> = {
  monthly: "MONTHLY",
  yearly: "YEARLY",
};

export type AsaasBillingType = "PIX" | "BOLETO" | "CREDIT_CARD" | "UNDEFINED";

export interface AsaasCreditCardInput {
  holderName: string;
  number: string;
  expiryMonth: string;
  expiryYear: string;
  ccv: string;
}

export interface AsaasCreditCardHolderInfo {
  name: string;
  email: string;
  cpfCnpj: string;
  postalCode: string;
  addressNumber: string;
  phone: string;
  addressComplement?: string | null;
  mobilePhone?: string | null;
}

export interface AsaasSubscription {
  id: string;
  status: string;
  customer: string;
  nextDueDate?: string;
  externalReference?: string | null;
  creditCard?: {
    creditCardNumber?: string;
    creditCardBrand?: string;
    creditCardToken?: string;
  };
}

export interface AsaasSubscriptionWithInvoice extends AsaasSubscription {
  /** Pix/Boleto: link da fatura. Cartão embutido: null (sem redirect). */
  invoiceUrl?: string | null;
  /** true quando nextDueDate foi agendado com trial (hoje + N dias). */
  trial?: boolean;
  trialEndsOn?: string | null;
  cardLastFour?: string | null;
  /** Token para cobranças futuras sem reenviar o cartão. */
  creditCardToken?: string | null;
}

/** Data YYYY-MM-DD em calendário local (evita shift UTC de toISOString). */
export function formatDateYmdLocal(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function addDaysYmd(days: number, from = new Date()): string {
  const d = new Date(from.getFullYear(), from.getMonth(), from.getDate());
  d.setDate(d.getDate() + days);
  return formatDateYmdLocal(d);
}

/** Tokeniza cartão no Asaas (Sandbox ok; produção exige habilitação). */
export async function tokenizarCartao(input: {
  customerId: string;
  creditCard: AsaasCreditCardInput;
  creditCardHolderInfo: AsaasCreditCardHolderInfo;
  remoteIp: string;
}): Promise<{ creditCardToken: string; creditCardNumber: string | null }> {
  const data = await asaasFetch<{
    creditCardToken?: string;
    creditCardNumber?: string;
  }>("/creditCard/tokenizeCreditCard", {
    method: "POST",
    body: JSON.stringify({
      customer: input.customerId,
      creditCard: input.creditCard,
      creditCardHolderInfo: input.creditCardHolderInfo,
      remoteIp: input.remoteIp,
    }),
  });

  if (!data.creditCardToken) {
    throw new Error("Token do cartão não retornado");
  }

  return {
    creditCardToken: data.creditCardToken,
    creditCardNumber: data.creditCardNumber ?? null,
  };
}

/** Cria a assinatura recorrente. Cartão: creditCard OU creditCardToken (Checkout Transparente). */
export async function criarAssinatura(input: {
  coachId: string;
  customerId: string;
  plano: PlanTier;
  ciclo: BillingPeriod;
  billingType: AsaasBillingType;
  /** Se > 0, agenda 1ª cobrança para hoje+N (trial). Exige CREDIT_CARD. */
  trialDays?: number;
  creditCard?: AsaasCreditCardInput;
  creditCardHolderInfo?: AsaasCreditCardHolderInfo;
  /** Token salvo — reativação / troca de plano sem novo formulário. */
  creditCardToken?: string;
  /** IP do cliente (não do servidor) — exigido pelo Asaas com cartão. */
  remoteIp?: string;
}): Promise<AsaasSubscriptionWithInvoice> {
  if (input.ciclo !== "monthly" && input.ciclo !== "yearly") {
    throw new Error("Ciclo inválido: use mensal ou anual");
  }

  const trialDays = input.trialDays && input.trialDays > 0 ? input.trialDays : 0;
  if (trialDays > 0 && input.billingType !== "CREDIT_CARD") {
    throw new Error("Trial gratuito exige cartão de crédito");
  }

  const withToken =
    input.billingType === "CREDIT_CARD" &&
    Boolean(input.creditCardToken && input.remoteIp);

  const withCard =
    input.billingType === "CREDIT_CARD" &&
    Boolean(input.creditCard && input.creditCardHolderInfo && input.remoteIp);

  if (input.billingType === "CREDIT_CARD" && !withToken && !withCard) {
    throw new Error("Dados do cartão são obrigatórios");
  }

  const option = getPlanOption(input.plano, input.ciclo);
  const nextDueDate = trialDays > 0 ? addDaysYmd(trialDays) : formatDateYmdLocal(new Date());

  const payload: Record<string, unknown> = {
    customer: input.customerId,
    billingType: input.billingType,
    cycle: CICLO_ASAAS[input.ciclo],
    value: option.price,
    description: option.reason,
    nextDueDate,
    externalReference: input.coachId,
  };

  if (withToken) {
    payload.creditCardToken = input.creditCardToken;
    payload.remoteIp = input.remoteIp;
  } else if (withCard) {
    payload.creditCard = input.creditCard;
    payload.creditCardHolderInfo = input.creditCardHolderInfo;
    payload.remoteIp = input.remoteIp;
  }

  const assinatura = await asaasFetch<AsaasSubscription>("/subscriptions", {
    method: "POST",
    body: JSON.stringify(payload),
  });

  // Pix/Boleto: link da fatura. Cartão embutido: sem redirect.
  let invoiceUrl: string | null = null;
  if (input.billingType !== "CREDIT_CARD") {
    try {
      const payments = await asaasFetch<{ data: Array<{ invoiceUrl?: string }> }>(
        `/payments?subscription=${assinatura.id}&limit=1`,
      );
      invoiceUrl = payments.data?.[0]?.invoiceUrl || null;
    } catch (err) {
      console.error("[ASAAS] falha ao buscar invoiceUrl da 1ª cobrança:", err);
    }
  }

  let creditCardToken =
    assinatura.creditCard?.creditCardToken || input.creditCardToken || null;

  // Se criou com dados brutos e a resposta não trouxe token, tenta tokenizar (best-effort).
  if (!creditCardToken && withCard && input.creditCard && input.creditCardHolderInfo && input.remoteIp) {
    try {
      const tok = await tokenizarCartao({
        customerId: input.customerId,
        creditCard: input.creditCard,
        creditCardHolderInfo: input.creditCardHolderInfo,
        remoteIp: input.remoteIp,
      });
      creditCardToken = tok.creditCardToken;
    } catch (err) {
      console.warn("[ASAAS] tokenização pós-assinatura indisponível:", err);
    }
  }

  const lastFour =
    assinatura.creditCard?.creditCardNumber?.replace(/\D/g, "").slice(-4) ||
    input.creditCard?.number?.replace(/\D/g, "").slice(-4) ||
    null;

  return {
    ...assinatura,
    invoiceUrl,
    trial: trialDays > 0,
    trialEndsOn: trialDays > 0 ? nextDueDate : null,
    cardLastFour: lastFour,
    creditCardToken,
  };
}

/** Cancela a assinatura recorrente no Asaas. */
export async function cancelarAssinatura(asaasSubscriptionId: string): Promise<void> {
  if (!asaasSubscriptionId) {
    throw new Error("asaas_subscription_id ausente");
  }
  await asaasFetch(`/subscriptions/${asaasSubscriptionId}`, { method: "DELETE" });
}

/** Lista assinaturas do customer (ACTIVE por padrão). */
export async function listarAssinaturasCustomer(
  customerId: string,
  status: "ACTIVE" | "INACTIVE" | "EXPIRED" = "ACTIVE",
): Promise<AsaasSubscription[]> {
  const qs = new URLSearchParams({
    customer: customerId,
    status,
    limit: "50",
  });
  const res = await asaasFetch<{ data?: AsaasSubscription[] }>(`/subscriptions?${qs}`);
  return Array.isArray(res.data) ? res.data : [];
}

/** URL de retorno usada em telas/e-mails — mesmo padrão do back_url do MP. */
export function getAsaasBackUrl(): string {
  return `${getSiteUrl()}/admin/assinatura?status=success`;
}
