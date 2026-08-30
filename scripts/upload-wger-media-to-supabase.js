/**
 * Copia as imagens (miniatura média) do wger local para o Supabase Storage e aponta
 * `gif_url`/`imagem_url` para a URL pública do Storage.
 *
 * POR QUÊ: hoje o `gif_url` aponta para http://localhost/media/... — funciona só na sua máquina.
 * Em produção (auronfit.com.br) o navegador do aluno NÃO acessa localhost. Copiando as imagens
 * para o bucket público `exercicios-gifs`, a demonstração passa a funcionar em produção
 * independentemente de o wger estar no ar.
 *
 * O que faz (idempotente):
 *   1. Lê da nossa instância wger (WGER_API_URL) as imagens is_main -> mapa uuid -> miniatura média
 *      (fallback small -> imagem cheia).
 *   2. Para cada exercício em `exercicios_biblioteca` com slug 'wger-<uuid>' (ou gif_url em localhost),
 *      baixa a miniatura do wger e faz upload no bucket 'exercicios-gifs' em 'wger/<uuid>.png'
 *      (upsert:true, contentType correto).
 *   3. Atualiza `gif_url` E `imagem_url` para a public URL do Storage.
 *
 * Uso:
 *   node scripts/upload-wger-media-to-supabase.js --dry-run   # só mostra o que faria
 *   npm run media:supabase                                    # executa
 *   node scripts/upload-wger-media-to-supabase.js --force     # reprocessa até os já migrados
 *
 * Env (.env.local): NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 *   WGER_API_URL (padrão http://localhost/api/v2)
 */

const { createClient } = require("@supabase/supabase-js");
require("dotenv").config({ path: ".env.local", quiet: true });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const WGER_API_URL = (process.env.WGER_API_URL || "http://localhost/api/v2").replace(/\/+$/, "");
const BUCKET = "exercicios-gifs";
const DRY_RUN = process.argv.includes("--dry-run");
const FORCE = process.argv.includes("--force");

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error("❌ Configure NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY no .env.local");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const STORAGE_MARKER = `/storage/v1/object/public/${BUCKET}/`;

// Prefere a miniatura média (400x400) do wger; cai para small e depois a imagem cheia.
function pickImageUrl(img) {
  if (!img) return null;
  return (img.thumbnails && (img.thumbnails.medium || img.thumbnails.small)) || img.image || null;
}

function extFromContentType(ct) {
  const t = String(ct || "").toLowerCase();
  if (t.includes("jpeg") || t.includes("jpg")) return "jpg";
  if (t.includes("gif")) return "gif";
  if (t.includes("webp")) return "webp";
  return "png";
}

async function fetchJson(url) {
  const res = await fetch(url, { headers: { Accept: "application/json" } });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText} em ${url}`);
  return res.json();
}

async function fetchAllWger(path) {
  const out = [];
  let url = `${WGER_API_URL}${path}${path.includes("?") ? "&" : "?"}limit=100`;
  while (url) {
    const page = await fetchJson(url);
    out.push(...(page.results || []));
    url = page.next;
  }
  return out;
}

async function selectAllLibrary() {
  const all = [];
  const size = 1000;
  let from = 0;
  for (;;) {
    const { data, error } = await supabase
      .from("exercicios_biblioteca")
      .select("id, slug, gif_url, imagem_url")
      .range(from, from + size - 1);
    if (error) throw new Error(`Supabase: ${error.message}`);
    all.push(...(data || []));
    if (!data || data.length < size) break;
    from += size;
  }
  return all;
}

async function run() {
  console.log(`🚀 Upload de mídia wger -> Supabase Storage (bucket '${BUCKET}')`);
  console.log(`   Fonte wger: ${WGER_API_URL}`);
  if (DRY_RUN) console.log("🧪 DRY-RUN: nada será baixado/enviado/atualizado.");
  if (FORCE) console.log("⚠️  --force: reprocessa inclusive os já migrados.");

  // 1. Mapa uuid -> miniatura média
  let infos;
  try {
    infos = await fetchAllWger("/exerciseinfo/");
  } catch (e) {
    console.error("❌ Não consegui acessar o wger. A stack está no ar? (cd infra/wger; docker compose up -d)");
    console.error("   Detalhe:", e.message);
    process.exit(1);
  }
  const uuidToImg = new Map();
  for (const info of infos) {
    const mainImg = Array.isArray(info.images) ? info.images.find((i) => i.is_main) || info.images[0] : null;
    const url = pickImageUrl(mainImg);
    if (info.uuid && url) uuidToImg.set(info.uuid, url);
  }
  console.log(`🗂️  ${uuidToImg.size} exercícios do wger têm imagem.`);

  // 2. Candidatos na nossa biblioteca
  const rows = await selectAllLibrary();
  const candidates = rows.filter(
    (r) => (r.slug && r.slug.startsWith("wger-")) || (r.gif_url && r.gif_url.includes("localhost"))
  );
  console.log(`📚 ${rows.length} exercícios na biblioteca | ${candidates.length} candidatos (wger-/localhost).`);

  let uploaded = 0;
  let updated = 0;
  let skippedNoImg = 0;
  let skippedDone = 0;
  let sampleUrl = null;

  for (const row of candidates) {
    const uuid = row.slug && row.slug.startsWith("wger-") ? row.slug.slice("wger-".length) : null;
    const srcUrl = (uuid && uuidToImg.get(uuid)) || (row.gif_url && row.gif_url.includes("localhost") ? row.gif_url : null);

    if (!srcUrl) {
      skippedNoImg += 1;
      continue;
    }
    if (!FORCE && row.gif_url && row.gif_url.includes(STORAGE_MARKER)) {
      skippedDone += 1;
      continue;
    }
    if (!uuid) {
      // sem uuid não temos caminho estável; pula (só ocorre se slug não for wger-)
      skippedNoImg += 1;
      continue;
    }

    if (DRY_RUN) {
      uploaded += 1; // contaria como "a enviar"
      if (!sampleUrl) sampleUrl = `${SUPABASE_URL}${STORAGE_MARKER}wger/${uuid}.png`;
      continue;
    }

    // Baixa a miniatura do wger
    let bytes, contentType;
    try {
      const res = await fetch(srcUrl);
      if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
      contentType = res.headers.get("content-type") || "image/png";
      bytes = Buffer.from(await res.arrayBuffer());
    } catch (e) {
      console.error(`   ⚠️  Falha ao baixar ${srcUrl}: ${e.message}`);
      continue;
    }

    const ext = extFromContentType(contentType);
    const path = `wger/${uuid}.${ext === "png" ? "png" : ext}`;

    const up = await supabase.storage.from(BUCKET).upload(path, bytes, { upsert: true, contentType });
    if (up.error) {
      console.error(`   ⚠️  Falha no upload de ${path}: ${up.error.message}`);
      continue;
    }
    uploaded += 1;

    const publicUrl = supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
    if (!sampleUrl) sampleUrl = publicUrl;

    const upd = await supabase
      .from("exercicios_biblioteca")
      .update({ gif_url: publicUrl, imagem_url: publicUrl })
      .eq("id", row.id);
    if (upd.error) {
      console.error(`   ⚠️  Falha ao atualizar ${row.slug}: ${upd.error.message}`);
      continue;
    }
    updated += 1;
    if (updated % 25 === 0) console.log(`   ✓ ${updated} atualizados...`);
  }

  console.log("\n📊 Resumo:");
  console.log(`   • Enviados/atualizados: ${DRY_RUN ? `${uploaded} (dry-run)` : `${uploaded} enviados, ${updated} atualizados`}`);
  console.log(`   • Já migrados (pulados): ${skippedDone}`);
  console.log(`   • Sem imagem no wger (pulados): ${skippedNoImg}`);
  if (sampleUrl) console.log(`   • Exemplo de gif_url novo: ${sampleUrl}`);
  if (DRY_RUN) console.log("\n🧪 DRY-RUN concluído. Rode sem --dry-run para aplicar.");
  else console.log("\n🎉 Concluído. As imagens agora vivem no Supabase Storage (funciona em produção).");
}

run().catch((e) => {
  console.error("❌ Falha inesperada:", e);
  process.exit(1);
});
