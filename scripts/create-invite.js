require("dotenv").config({ path: ".env.local" });
const { createClient } = require("@supabase/supabase-js");

const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error(
    "Defina NEXT_PUBLIC_SUPABASE_URL (ou SUPABASE_URL) e SUPABASE_SERVICE_ROLE_KEY em .env.local"
  );
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function main() {
  const args = process.argv.slice(2).reduce((acc, arg) => {
    const [key, value] = arg.replace(/^--/, "").split("=");
    acc[key] = value;
    return acc;
  }, {});

  const { tipo, nome, usos = "1", limite } = args;

  if (!tipo || !["teste", "parceiro"].includes(tipo)) {
    console.error(
      'Uso: npm run create-invite -- --tipo=teste|parceiro --nome="Nome" [--usos=1] [--limite=15]'
    );
    process.exit(1);
  }

  const code = `${tipo.toUpperCase()}-${(nome || "convite")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]/g, "")
    .toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;

  const { data, error } = await supabase
    .from("partner_invites")
    .insert({
      code,
      account_type: tipo,
      student_limit: limite ? parseInt(limite, 10) : tipo === "teste" ? 15 : null,
      max_uses: parseInt(usos, 10),
      notes: nome || null,
    })
    .select()
    .single();

  if (error) {
    console.error("Erro ao criar convite:", error.message);
    process.exit(1);
  }

  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL || "https://www.auronfit.com.br";

  console.log("Convite criado com sucesso:");
  console.log(`Código: ${data.code}`);
  console.log(`Link: ${siteUrl}/cadastro?convite=${data.code}`);
}

main();
