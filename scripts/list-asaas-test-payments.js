/**
 * Lista cobranças da assinatura do coach de teste no Sandbox.
 * Uso: node scripts/list-asaas-test-payments.js
 */
require("dotenv").config({ path: ".env.local", quiet: true });

let key = String(process.env.ASAAS_API_KEY || "");
if (key.startsWith("\\$")) key = `$${key.slice(2)}`;

const base =
  String(process.env.ASAAS_ENV || "sandbox").toLowerCase() === "production"
    ? "https://api.asaas.com/v3"
    : "https://api-sandbox.asaas.com/v3";

const coachId = "f6840635-58ef-4416-a662-27649f88e8a5";
const headers = {
  access_token: key,
  "Content-Type": "application/json",
  "User-Agent": "AuronFit/1.0",
};

(async () => {
  const cust = await (
    await fetch(`${base}/customers?externalReference=${encodeURIComponent(coachId)}&limit=5`, {
      headers,
    })
  ).json();
  if (cust.errors) {
    console.error(cust.errors[0]?.code || "customer_error");
    process.exit(1);
  }
  const customerId = cust.data?.[0]?.id;
  if (!customerId) {
    console.error("no_customer");
    process.exit(1);
  }

  const subs = await (
    await fetch(`${base}/subscriptions?customer=${customerId}&limit=20`, { headers })
  ).json();

  for (const s of subs.data || []) {
    const pays = await (
      await fetch(`${base}/payments?subscription=${s.id}&limit=10`, { headers })
    ).json();
    for (const p of pays.data || []) {
      console.log(
        JSON.stringify({
          subscription: s.id,
          subStatus: s.status,
          payment: p.id,
          status: p.status,
          invoiceNumber: p.invoiceNumber,
          value: p.value,
          dueDate: p.dueDate,
          billingType: p.billingType,
        }),
      );
    }
  }
})().catch((e) => {
  console.error(String(e.message || e));
  process.exit(1);
});
