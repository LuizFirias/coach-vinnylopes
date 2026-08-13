/**
 * Reprocessa um pagamento Asaas no webhook local (sem depender da fila do painel).
 *
 * Uso:
 *   node scripts/replay-asaas-payment-webhook.js pay_xxxxx
 *   node scripts/replay-asaas-payment-webhook.js pay_xxxxx PAYMENT_RECEIVED
 */
require("dotenv").config({ path: ".env.local", quiet: true });

const paymentId = process.argv[2];
const event = (process.argv[3] || "PAYMENT_RECEIVED").toUpperCase();
const token = String(process.env.ASAAS_WEBHOOK_TOKEN || "").trim();
const base = process.env.WEBHOOK_REPLAY_URL || "http://127.0.0.1:3000";

if (!paymentId || !paymentId.startsWith("pay_")) {
  console.error("Uso: node scripts/replay-asaas-payment-webhook.js pay_xxxxx [PAYMENT_RECEIVED]");
  process.exit(1);
}
if (!token) {
  console.error("ASAAS_WEBHOOK_TOKEN ausente no .env.local");
  process.exit(1);
}

(async () => {
  const res = await fetch(`${base}/api/webhooks/asaas`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "asaas-access-token": token,
    },
    body: JSON.stringify({
      id: `evt_replay_${Date.now()}`,
      event,
      dateCreated: new Date().toISOString().replace("T", " ").slice(0, 19),
      payment: { id: paymentId },
    }),
  });
  const text = await res.text();
  console.log("status", res.status);
  console.log(text);
})().catch((e) => {
  console.error(String(e.message || e));
  process.exit(1);
});
