/**
 * Lista (e opcionalmente cancela) assinaturas Asaas duplicadas do coach de teste.
 * Uso:
 *   node scripts/cleanup-asaas-duplicate-subs.js
 *   node scripts/cleanup-asaas-duplicate-subs.js --cancel
 */
require("dotenv").config({ path: ".env.local", quiet: true });

let key = String(process.env.ASAAS_API_KEY || "");
if (key.startsWith("\\$")) key = `$${key.slice(2)}`;

const base =
  String(process.env.ASAAS_ENV || "sandbox").toLowerCase() === "production"
    ? "https://api.asaas.com/v3"
    : "https://api-sandbox.asaas.com/v3";

const coachId = "f6840635-58ef-4416-a662-27649f88e8a5";
const shouldCancel = process.argv.includes("--cancel");
const headers = {
  access_token: key,
  "Content-Type": "application/json",
  "User-Agent": "AuronFit/1.0",
};

async function main() {
  if (!key.startsWith("$aact_")) {
    console.error("ASAAS_API_KEY inválida ou não carregada");
    process.exit(1);
  }

  const cust = await (
    await fetch(
      `${base}/customers?externalReference=${encodeURIComponent(coachId)}&limit=5`,
      { headers },
    )
  ).json();

  if (cust.errors) {
    console.error("customer_error", cust.errors[0]?.code || "unknown");
    process.exit(1);
  }

  const customerId = cust.data?.[0]?.id;
  if (!customerId) {
    console.error("no_customer");
    process.exit(1);
  }

  const subs = await (
    await fetch(`${base}/subscriptions?customer=${customerId}&limit=50`, { headers })
  ).json();

  const rows = [];
  for (const s of subs.data || []) {
    const pays = await (
      await fetch(`${base}/payments?subscription=${s.id}&limit=5`, { headers })
    ).json();
    const payments = (pays.data || []).map((p) => ({
      id: p.id,
      invoiceNumber: String(p.invoiceNumber || ""),
      status: p.status,
      hasCard: Boolean(
        p.creditCard && (p.creditCard.creditCardNumber || p.creditCard.creditCardBrand),
      ),
      brand: p.creditCard?.creditCardBrand || null,
      last4: p.creditCard?.creditCardNumber || null,
      dueDate: p.dueDate,
    }));
    rows.push({
      id: s.id,
      status: s.status,
      value: s.value,
      nextDueDate: s.nextDueDate,
      hasCardOnSub: Boolean(s.creditCard && s.creditCard.creditCardNumber),
      payments,
    });
  }

  console.log(JSON.stringify(rows, null, 2));

  const active = rows.filter((r) => r.status === "ACTIVE");
  if (active.length <= 1) {
    console.log("Nada a cancelar (0 ou 1 ACTIVE).");
    return;
  }

  // Mantém a que tem cartão (VISA/4444); cancela as sem cartão
  const withCard = active.filter(
    (r) => r.hasCardOnSub || r.payments.some((p) => p.hasCard),
  );
  const keep =
    withCard[0] ||
    active.find((r) =>
      r.payments.some((p) => String(p.invoiceNumber) === "16508542"),
    ) ||
    active[active.length - 1];

  const toCancel = active.filter((r) => r.id !== keep.id);
  console.log("Manter:", keep.id, "Cancelar:", toCancel.map((r) => r.id));

  if (!shouldCancel) {
    console.log("Dry-run. Passe --cancel para executar.");
    return;
  }

  for (const r of toCancel) {
    const res = await fetch(`${base}/subscriptions/${r.id}`, {
      method: "DELETE",
      headers,
    });
    const body = await res.json().catch(() => ({}));
    console.log("cancel", r.id, res.status, body?.deleted ? "deleted" : body);
  }
}

main().catch((e) => {
  console.error(String(e.message || e));
  process.exit(1);
});
