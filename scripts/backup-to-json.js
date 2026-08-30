#!/usr/bin/env node
/**
 * Backup manual do banco em JSON — pro plano free do Supabase, que não
 * tem backup automático.
 *
 * Descobre todas as tabelas do schema "public" e exporta cada uma inteira
 * pra um arquivo .json, usando a service role key (ignora RLS, pega tudo).
 *
 * Uso:
 *   node scripts/backup-to-json.js
 *
 * Gera uma pasta backups/AAAA-MM-DD_HH-mm-ss/ com um .json por tabela
 * mais um _resumo.json com contagem de linhas de cada uma.
 */

const fs = require("fs");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "..", ".env.local") });

const { createClient } = require("@supabase/supabase-js");

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error(
    "Faltam NEXT_PUBLIC_SUPABASE_URL e/ou SUPABASE_SERVICE_ROLE_KEY no .env.local",
  );
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const PAGE_SIZE = 1000;

async function listPublicTables() {
  // information_schema não dá pra consultar direto via REST; usamos uma
  // função SQL ad-hoc via rpc não existe por padrão, então caímos pro
  // catálogo via pg_catalog exposto por uma query crua com .rpc não é
  // possível sem função — solução: usar o endpoint de introspecção do
  // PostgREST (Supabase expõe em /rest/v1/ com Accept: application/openapi+json).
  const res = await fetch(`${SUPABASE_URL}/rest/v1/`, {
    headers: {
      apikey: SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
      Accept: "application/openapi+json",
    },
  });
  if (!res.ok) {
    throw new Error(`Falha ao listar tabelas via PostgREST: ${res.status}`);
  }
  const spec = await res.json();
  const paths = Object.keys(spec.paths || {});
  return paths
    .map((p) => p.replace(/^\//, ""))
    .filter((name) => name && !name.startsWith("rpc/"));
}

async function dumpTable(tableName) {
  let all = [];
  let from = 0;
  for (;;) {
    const { data, error } = await supabase
      .from(tableName)
      .select("*")
      .range(from, from + PAGE_SIZE - 1);

    if (error) {
      // Tabela sem SELECT liberado pra service role (raro) ou view sem PK —
      // registra o erro e segue pras outras, não trava o backup inteiro.
      return { error: error.message };
    }
    if (!data || data.length === 0) break;
    all = all.concat(data);
    if (data.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }
  return { rows: all };
}

async function main() {
  const stamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
  const outDir = path.join(__dirname, "..", "backups", stamp);
  fs.mkdirSync(outDir, { recursive: true });

  console.log("Descobrindo tabelas...");
  const tables = await listPublicTables();
  console.log(`${tables.length} tabelas encontradas.\n`);

  const resumo = {};

  for (const table of tables) {
    process.stdout.write(`  ${table} ... `);
    const result = await dumpTable(table);

    if (result.error) {
      console.log(`ERRO: ${result.error}`);
      resumo[table] = { erro: result.error };
      continue;
    }

    const filePath = path.join(outDir, `${table}.json`);
    fs.writeFileSync(filePath, JSON.stringify(result.rows, null, 2), "utf8");
    console.log(`${result.rows.length} linhas`);
    resumo[table] = { linhas: result.rows.length };
  }

  fs.writeFileSync(
    path.join(outDir, "_resumo.json"),
    JSON.stringify({ geradoEm: new Date().toISOString(), tabelas: resumo }, null, 2),
    "utf8",
  );

  console.log(`\nBackup salvo em: ${outDir}`);
}

main().catch((err) => {
  console.error("Falha no backup:", err);
  process.exit(1);
});
