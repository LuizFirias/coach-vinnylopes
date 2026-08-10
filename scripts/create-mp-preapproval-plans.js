/**
 * Cria planos de preapproval no Mercado Pago (tier + período).
 * Valores canônicos: lib/subscriptions/plans.ts
 *
 * USO: npm run mp:create-plans
 *
 * Nota: mudança de preço exige NOVOS plan_ids no MP (não editar os antigos).
 * Assinantes ativos no preço antigo permanecem até migração explícita.
 */

require('dotenv').config({ path: '.env.local' });

const MP_API = 'https://api.mercadopago.com/preapproval_plan';

/** @type {Array<{ envKey: string; reason: string; price: number; frequencyMonths: number }>} */
const PLANS = [
  { envKey: 'MP_PLAN_START_MONTHLY_ID', reason: 'AuronFit START — Mensal', price: 47.9, frequencyMonths: 1 },
  { envKey: 'MP_PLAN_START_YEARLY_ID', reason: 'AuronFit START — Anual', price: 479.0, frequencyMonths: 12 },
  { envKey: 'MP_PLAN_PRO_MONTHLY_ID', reason: 'AuronFit PRO — Mensal', price: 74.9, frequencyMonths: 1 },
  { envKey: 'MP_PLAN_PRO_YEARLY_ID', reason: 'AuronFit PRO — Anual', price: 749.0, frequencyMonths: 12 },
  { envKey: 'MP_PLAN_ELITE_MONTHLY_ID', reason: 'AuronFit ELITE — Mensal', price: 129.9, frequencyMonths: 1 },
  { envKey: 'MP_PLAN_ELITE_YEARLY_ID', reason: 'AuronFit ELITE — Anual', price: 1299.0, frequencyMonths: 12 },
];

function getAccessToken() {
  const token =
    process.env.MP_ACCESS_TOKEN_TEST || process.env.MP_ACCESS_TOKEN;
  if (!token || !String(token).trim()) {
    console.error('Token do Mercado Pago não encontrado.');
    console.error('Defina MP_ACCESS_TOKEN_TEST (recomendado em dev) ou MP_ACCESS_TOKEN em .env.local');
    process.exit(1);
  }
  return token.trim();
}

function getBackUrl() {
  const base = (process.env.NEXT_PUBLIC_SITE_URL || 'https://www.auronfit.com.br').replace(/\/$/, '');
  return `${base}/admin/assinatura`;
}

async function createPlan(token, plan) {
  const body = {
    reason: plan.reason,
    back_url: getBackUrl(),
    auto_recurring: {
      frequency: plan.frequencyMonths,
      frequency_type: 'months',
      transaction_amount: plan.price,
      currency_id: 'BRL',
    },
  };

  const res = await fetch(MP_API, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg =
      data.message ||
      data.error ||
      (Array.isArray(data.cause) && data.cause.map((c) => c.description || c.code).join('; ')) ||
      `HTTP ${res.status}`;
    throw new Error(`${plan.envKey}: ${msg}`);
  }

  const id = data.id;
  if (!id) {
    throw new Error(`${plan.envKey}: resposta sem id`);
  }
  return id;
}

async function main() {
  const token = getAccessToken();
  const backUrl = getBackUrl();
  console.log(`Mercado Pago: criando ${PLANS.length} preapproval_plan(s)...`);
  console.log(`back_url: ${backUrl}`);
  console.log('');

  const lines = [];
  for (const plan of PLANS) {
    process.stdout.write(`  ${plan.envKey} ... `);
    const id = await createPlan(token, plan);
    console.log(id);
    lines.push(`${plan.envKey}=${id}`);
  }

  console.log('');
  console.log('# Cole no .env.local / Vercel:');
  console.log(lines.join('\n'));
}

main().catch((err) => {
  console.error('');
  console.error('Erro:', err.message || err);
  process.exit(1);
});
