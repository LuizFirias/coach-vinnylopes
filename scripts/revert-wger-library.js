/**
 * Reverte a integração wger: remove exercícios importados, limpa mídia no Storage
 * e (opcionalmente) restaura URLs de exercícios não-wger que apontavam para wger/.
 *
 * Segurança: mesma lógica de referências do rebuild-wger-library.js — nunca apaga
 * exercícios usados em fichas, histórico, logs ou recordes.
 *
 * Uso:
 *   node scripts/revert-wger-library.js            # dry-run
 *   node scripts/revert-wger-library.js --apply    # executa
 *
 * Depois rode: node scripts/seed-auron-exercises.js
 *
 * Env (.env.local): NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 */

const { createClient } = require("@supabase/supabase-js");
require("dotenv").config({ path: ".env.local" });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const BUCKET = "exercicios-gifs";
const STORAGE_MARKER = `/storage/v1/object/public/${BUCKET}/wger/`;
const APPLY = process.argv.includes("--apply");

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error("❌ Configure NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY no .env.local");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

function isWgerExercise(row) {
  return row.origem === "wger" || (row.slug && row.slug.startsWith("wger-"));
}

function hasWgerStorageUrl(row) {
  return (
    (row.gif_url && row.gif_url.includes(STORAGE_MARKER)) ||
    (row.imagem_url && row.imagem_url.includes(STORAGE_MARKER))
  );
}

async function selectAll(table, columns) {
  const all = [];
  const size = 1000;
  let from = 0;
  for (;;) {
    const { data, error } = await supabase.from(table).select(columns).range(from, from + size - 1);
    if (error) throw new Error(`Supabase (${table}): ${error.message}`);
    all.push(...(data || []));
    if (!data || data.length < size) break;
    from += size;
  }
  return all;
}

async function computeReferencedIds(existingIds) {
  const referenced = new Set();

  for (const table of ["historico_treinos", "logs_treino", "recordes_pessoais"]) {
    const rows = await selectAll(table, "exercicio_id");
    for (const r of rows) if (r.exercicio_id) referenced.add(r.exercicio_id);
  }

  const fichas = await selectAll("fichas_treino", "configuracao");
  const blob = fichas.map((f) => JSON.stringify(f.configuracao || "")).join("\n");
  for (const id of existingIds) {
    if (blob.includes(id)) referenced.add(id);
  }

  return referenced;
}

async function listWgerStorageFiles() {
  const files = [];
  const limit = 1000;
  let offset = 0;

  for (;;) {
    const { data, error } = await supabase.storage.from(BUCKET).list("wger", {
      limit,
      offset,
      sortBy: { column: "name", order: "asc" },
    });
    if (error) throw new Error(`Storage list: ${error.message}`);
    if (!data || data.length === 0) break;
    for (const item of data) {
      if (item.name) files.push(`wger/${item.name}`);
    }
    if (data.length < limit) break;
    offset += limit;
  }

  return files;
}

async function run() {
  console.log("🔄 Reverter integração wger → biblioteca AuronFit original");
  console.log(
    APPLY
      ? "⚙️  Modo --apply: vai APAGAR wger não referenciados, limpar Storage e resetar URLs."
      : "🧪 DRY-RUN: nada será alterado. Use --apply para executar."
  );

  const existing = await selectAll("exercicios_biblioteca", "id, nome, origem, slug, gif_url, imagem_url");
  const existingIds = existing.map((e) => e.id);
  console.log(`📚 ${existing.length} exercícios atuais na biblioteca.`);

  const referenced = await computeReferencedIds(existingIds);
  const wgerRows = existing.filter(isWgerExercise);
  const wgerToDelete = wgerRows.filter((e) => !referenced.has(e.id));
  const wgerBlocked = wgerRows.filter((e) => referenced.has(e.id));

  const nonWgerWithWgerUrls = existing.filter((e) => !isWgerExercise(e) && hasWgerStorageUrl(e));

  console.log(`🗑️  ${wgerToDelete.length} exercícios wger a remover (não referenciados).`);
  console.log(`🔒 ${wgerBlocked.length} exercícios wger bloqueados por referência.`);
  console.log(`🔗 ${nonWgerWithWgerUrls.length} exercícios não-wger com URL wger/ a resetar.`);

  if (wgerBlocked.length > 0) {
    console.log("\n⚠️  wger referenciados (NÃO serão apagados):");
    wgerBlocked.forEach((e) => console.log(`   🔒 ${e.nome} (${e.slug})`));
  }

  let storageFiles = [];
  try {
    storageFiles = await listWgerStorageFiles();
    console.log(`📦 ${storageFiles.length} arquivos em ${BUCKET}/wger/ no Storage.`);
  } catch (e) {
    console.warn(`⚠️  Não foi possível listar Storage: ${e.message}`);
  }

  if (!APPLY) {
    console.log("\n🧪 DRY-RUN concluído. Próximos passos com --apply:");
    console.log("   1. Apagar exercícios wger não referenciados");
    console.log("   2. Resetar gif_url/imagem_url de não-wger apontando para wger/");
    console.log("   3. Remover arquivos wger/ do Storage");
    console.log("   4. Rodar: node scripts/seed-auron-exercises.js");
    return;
  }

  // 1. Apagar wger não referenciados
  const CHUNK = 100;
  let deleted = 0;
  for (let i = 0; i < wgerToDelete.length; i += CHUNK) {
    const ids = wgerToDelete.slice(i, i + CHUNK).map((e) => e.id);
    const { error } = await supabase.from("exercicios_biblioteca").delete().in("id", ids);
    if (error) {
      console.error(`❌ Erro ao apagar lote ${i}:`, error.message);
      process.exit(1);
    }
    deleted += ids.length;
    console.log(`   🗑️  Apagados ${deleted}/${wgerToDelete.length}`);
  }

  // 2. Resetar URLs wger/ em exercícios que permanecem (biblioteca antiga)
  let urlsReset = 0;
  for (const row of nonWgerWithWgerUrls) {
    const { error } = await supabase
      .from("exercicios_biblioteca")
      .update({ gif_url: null, imagem_url: null })
      .eq("id", row.id);
    if (error) {
      console.error(`   ⚠️  Falha ao resetar URLs de ${row.slug}: ${error.message}`);
      continue;
    }
    urlsReset += 1;
  }
  if (urlsReset > 0) console.log(`   🔗 ${urlsReset} exercícios tiveram gif_url/imagem_url resetados.`);

  // 3. Limpar Storage wger/
  let storageDeleted = 0;
  for (let i = 0; i < storageFiles.length; i += CHUNK) {
    const batch = storageFiles.slice(i, i + CHUNK);
    const { error } = await supabase.storage.from(BUCKET).remove(batch);
    if (error) {
      console.error(`   ⚠️  Falha ao remover lote Storage: ${error.message}`);
      continue;
    }
    storageDeleted += batch.length;
    console.log(`   📦 Storage: removidos ${storageDeleted}/${storageFiles.length}`);
  }

  console.log("\n🎉 Reversão concluída:");
  console.log(`   • ${deleted} exercícios wger removidos`);
  console.log(`   • ${wgerBlocked.length} wger mantidos (referenciados)`);
  console.log(`   • ${urlsReset} URLs resetadas em exercícios não-wger`);
  console.log(`   • ${storageDeleted} arquivos removidos do Storage`);
  console.log("\n▶️  Agora rode: node scripts/seed-auron-exercises.js");
}

run().catch((e) => {
  console.error("❌ Falha inesperada:", e);
  process.exit(1);
});
