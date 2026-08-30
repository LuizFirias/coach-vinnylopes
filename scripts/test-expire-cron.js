const fs = require("fs");
const path = require("path");
const { createClient } = require("@supabase/supabase-js");

function loadEnv(file) {
  const text = fs.readFileSync(file, "utf8");
  for (const line of text.split(/\r?\n/)) {
    if (!line || line.startsWith("#")) continue;
    const i = line.indexOf("=");
    if (i === -1) continue;
    const k = line.slice(0, i).trim();
    let v = line.slice(i + 1).trim();
    if (
      (v.startsWith('"') && v.endsWith('"')) ||
      (v.startsWith("'") && v.endsWith("'"))
    ) {
      v = v.slice(1, -1);
    }
    if (!process.env[k]) process.env[k] = v;
  }
}

loadEnv(path.join(process.cwd(), ".env.local"));

const url = (process.env.NEXT_PUBLIC_SUPABASE_URL || "")
  .replace(/\/rest\/v1\/?$/, "")
  .replace(/\/$/, "");
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
const cronSecret = process.env.CRON_SECRET;

if (!url || !key || !cronSecret) {
  console.error("Missing env vars");
  process.exit(1);
}

const sb = createClient(url, key, { auth: { persistSession: false } });

async function callCron() {
  const res = await fetch("http://localhost:3000/api/cron/expire-subscriptions", {
    headers: { Authorization: `Bearer ${cronSecret}` },
  });
  const body = await res.json().catch(() => ({}));
  console.log("CRON", res.status, JSON.stringify(body));
  return body;
}

async function ensureSub(userId) {
  const { data: existing } = await sb
    .from("subscriptions")
    .select("id, user_id, status, current_period_end, grace_period_end, plan_tier")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existing) return existing;

  const future = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
  const { data: created, error } = await sb
    .from("subscriptions")
    .insert({
      user_id: userId,
      status: "authorized",
      plan_tier: "start",
      billing_period: "monthly",
      student_limit: 30,
      current_period_end: future,
      grace_period_end: null,
      payment_failure_count: 0,
      mp_preapproval_id: `test-${userId.slice(0, 8)}-${Date.now()}`,
    })
    .select("id, user_id, status, current_period_end, grace_period_end, plan_tier")
    .single();

  if (error) throw error;
  console.log("Created test subscription row");
  return created;
}

async function show(userId) {
  const { data: sub } = await sb
    .from("subscriptions")
    .select("id, status, current_period_end, grace_period_end, plan_tier")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  const { data: profile } = await sb
    .from("profiles")
    .select("subscription_active, plan_tier, status_pagamento")
    .eq("id", userId)
    .single();
  console.log("SUB", JSON.stringify(sub));
  console.log("PROFILE", JSON.stringify(profile));
}

(async () => {
  const step = process.argv[2];
  const userId = process.argv[3];

  if (!step || !userId) {
    console.log(`Uso:
  node scripts/test-expire-cron.js past_due <USER_UUID>
  node scripts/test-expire-cron.js expire <USER_UUID>
  node scripts/test-expire-cron.js restore <USER_UUID>
  node scripts/test-expire-cron.js show <USER_UUID>`);
    process.exit(1);
  }

  const target = await ensureSub(userId);
  console.log("TARGET", target.id, target.status);

  if (step === "show") {
    await show(userId);
    return;
  }

  if (step === "past_due") {
    const past = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { error } = await sb
      .from("subscriptions")
      .update({
        status: "authorized",
        current_period_end: past,
        grace_period_end: null,
      })
      .eq("id", target.id);
    if (error) throw error;
    console.log("Set authorized + current_period_end = yesterday");
    await callCron();
    await show(userId);
  }

  if (step === "expire") {
    const pastGrace = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { error } = await sb
      .from("subscriptions")
      .update({
        status: "past_due",
        grace_period_end: pastGrace,
      })
      .eq("id", target.id);
    if (error) throw error;
    console.log("Set past_due + grace_period_end = 1h ago");
    await callCron();
    await show(userId);
  }

  if (step === "restore") {
    const future = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
    const { error } = await sb
      .from("subscriptions")
      .update({
        status: "authorized",
        current_period_end: future,
        grace_period_end: null,
        payment_failure_count: 0,
      })
      .eq("id", target.id);
    if (error) throw error;
    await sb
      .from("profiles")
      .update({
        subscription_active: true,
        plan_tier: "start",
        student_limit: 30,
        status_pagamento: "pago",
      })
      .eq("id", userId);
    console.log("Restored authorized + 30 days");
    await show(userId);
  }
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
