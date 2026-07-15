import "server-only";

import {

  type BillingPeriod,

  type PlanTier,

  getMpPlanEnvKey,

  getPlanOption,

} from "@/lib/subscriptions/plans";



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



  const body: MpPreapprovalCreateBody = {

    reason: option.reason,

    external_reference: params.userId,

    payer_email: params.email,

    card_token_id: params.cardTokenId,

    back_url: params.backUrl,

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

    const message =

      (data as { message?: string })?.message ||

      (data as { error?: string })?.error ||

      `Mercado Pago API error ${res.status}`;

    throw new Error(message);

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

