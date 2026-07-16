import "server-only";

import {

  type BillingPeriod,

  type PlanTier,

  getMpPlanEnvKey,

  getPlanOption,

} from "@/lib/subscriptions/plans";

import { getSiteUrl } from "@/lib/subscriptions/siteUrl";



const MP_API_BASE = "https://api.mercadopago.com";



export function getMpAccessToken(): string {

  const isProd = process.env.NODE_ENV === "production";

  const token = isProd

    ? process.env.MP_ACCESS_TOKEN

    : process.env.MP_ACCESS_TOKEN_TEST || process.env.MP_ACCESS_TOKEN;



  if (!token) {

    throw new Error("Mercado Pago access token não configurado");

  }

  return token;

}



/** Retorna preapproval_plan_id opcional da env para tier+periodo */

export function getMpPreapprovalPlanId(

  tier: PlanTier,

  period: BillingPeriod

): string | null {

  const envKey = getMpPlanEnvKey(tier, period);

  return process.env[envKey] || null;

}



export interface MpPreapprovalCreateBody {

  reason: string;

  external_reference: string;

  payer_email: string;

  card_token_id: string;

  back_url: string;

  status: "authorized";

  /** Webhook de Assinaturas — o painel MP "Assinaturas" não configura isso sozinho. */
  notification_url: string;

  preapproval_plan_id?: string;

  auto_recurring?: {

    frequency: number;

    frequency_type: "months";

    transaction_amount: number;

    currency_id: "BRL";

  };

}



/** Monta body do POST /preapproval — usa plan_id se configurado, senão auto_recurring dinâmico */

export function buildMpPreapprovalBody(

  tier: PlanTier,

  period: BillingPeriod,

  params: {

    userId: string;

    email: string;

    cardTokenId: string;

    backUrl: string;

  }

): MpPreapprovalCreateBody {

  const option = getPlanOption(tier, period);

  const planId = getMpPreapprovalPlanId(tier, period);

  const siteUrl = getSiteUrl();

  // source_news=webhooks: MP envia Webhooks (com x-signature), não IPN legado.
  const notificationUrl = `${siteUrl}/api/webhooks/mercadopago?source_news=webhooks`;

  console.log("[checkout] notification_url enviado:", notificationUrl, {
    siteUrl,
    NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL || null,
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL || null,
  });

  const body: MpPreapprovalCreateBody = {

    reason: option.reason,

    external_reference: params.userId,

    payer_email: params.email,

    card_token_id: params.cardTokenId,

    back_url: params.backUrl,

    notification_url: notificationUrl,

    status: "authorized",

  };



  if (planId) {

    body.preapproval_plan_id = planId;

  } else {

    body.auto_recurring = {

      frequency: option.mpFrequencyMonths,

      frequency_type: "months",

      transaction_amount: option.price,

      currency_id: "BRL",

    };

  }



  return body;

}



export class MpApiError extends Error {
  status: number;
  path: string;
  body: unknown;
  causeCode: string | null;

  constructor(opts: {
    status: number;
    path: string;
    message: string;
    body: unknown;
    causeCode?: string | null;
  }) {
    super(opts.message);
    this.name = "MpApiError";
    this.status = opts.status;
    this.path = opts.path;
    this.body = opts.body;
    this.causeCode = opts.causeCode ?? null;
  }
}

function extractMpErrorMessage(data: unknown, status: number): {
  message: string;
  causeCode: string | null;
} {
  const obj = (data && typeof data === "object" ? data : {}) as {
    message?: string;
    error?: string;
    cause?: Array<{ code?: string | number; description?: string; message?: string }>;
  };

  const firstCause = Array.isArray(obj.cause) ? obj.cause[0] : null;
  const causeCode =
    firstCause?.code != null ? String(firstCause.code) : null;
  const causeDesc =
    firstCause?.description || firstCause?.message || null;

  const message =
    causeDesc ||
    obj.message ||
    obj.error ||
    `Mercado Pago API error ${status}`;

  return { message, causeCode };
}

export async function mpFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const token = getMpAccessToken();
  const res = await fetch(`${MP_API_BASE}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...init?.headers,
    },
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    const { message, causeCode } = extractMpErrorMessage(data, res.status);
    console.error("[MP-API] request failed", {
      path,
      method: init?.method || "GET",
      status: res.status,
      causeCode,
      message,
      body: data,
    });
    throw new MpApiError({
      status: res.status,
      path,
      message,
      body: data,
      causeCode,
    });
  }

  return data as T;
}




/** Cancela preapproval no Mercado Pago (PUT status=cancelled). */
export async function cancelMPPreapproval(preapprovalId: string): Promise<void> {
  if (!preapprovalId) {
    throw new Error("mp_preapproval_id ausente");
  }

  await mpFetch(`/preapproval/${preapprovalId}`, {
    method: "PUT",
    body: JSON.stringify({ status: "cancelled" }),
  });
}

