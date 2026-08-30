/**
 * Preenche a mídia (imagem de demonstração) dos exercícios que JÁ EXISTEM na nossa
 * biblioteca (`exercicios_biblioteca`) usando as imagens da NOSSA instância local do wger.
 *
 * O que faz:
 *   - Casa nossos exercícios com os do wger pelo NOME (normalizado, testando o nome em
 *     TODOS os idiomas + aliases do wger para maximizar acertos).
 *   - Quando acha, grava a imagem do wger em `gif_url` (o campo mostrado na ficha de treino
 *     quando aberta) e em `imagem_url`.
 *
 * NÃO destrutivo:
 *   - Nunca apaga nem insere exercícios — só faz UPDATE de mídia.
 *   - Por padrão só preenche campos VAZIOS (não sobrescreve mídia que o coach já colocou).
 *
 * Vídeos do wger: são arquivos .mp4 locais e NÃO são compatíveis com o campo `video_url`
 * (que hoje é só YouTube, tocado via iframe/YouTubePlayer). Por isso este script não mexe
 * em `video_url`. Ele apenas REPORTA quantos matches têm vídeo no wger (ver observação no fim).
 *
 * Uso:
 *   node scripts/backfill-wger-media.js --dry-run    # só mostra a cobertura, não grava
 *   node scripts/backfill-wger-media.js              # preenche gif_url/imagem_url vazios
 *   node scripts/backfill-wger-media.js --overwrite  # também sobrescreve mídia existente
 *
 * Env (.env.local): NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 *   WGER_API_URL (padrão http://localhost/api/v2)
 */

const { createClient } = require("@supabase/supabase-js");
require("dotenv").config({ path: ".env.local" });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const WGER_API_URL = (process.env.WGER_API_URL || "http://localhost/api/v2").replace(/\/+$/, "");

const DRY_RUN = process.argv.includes("--dry-run");
const OVERWRITE = process.argv.includes("--overwrite");

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error("❌ Configure NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY no .env.local");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

function norm(s) {
  return String(s || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

// Prefere a miniatura média (400x400) do wger; cai para small e depois a imagem cheia.
function pickImageUrl(img) {
  if (!img) return null;
  return (img.thumbnails && (img.thumbnails.medium || img.thumbnails.small)) || img.image || null;
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

// Constrói: nomeNormalizado -> { image, video, wgerName }
function buildLookup(infos) {
  const map = new Map();
  for (const info of infos) {
    const mainImg = Array.isArray(info.images)
      ? (info.images.find((i) => i.is_main) || info.images[0] || null)
      : null;
    const image = pickImageUrl(mainImg);
    const video = Array.isArray(info.videos) && info.videos[0] ? info.videos[0].video : null;
    if (!image && !video) continue;

    const names = [];
    for (const t of info.translations || []) {
      if (t.name) names.push(t.name);
      for (const a of t.aliases || []) if (a.alias) names.push(a.alias);
    }

    for (const name of names) {
      const key = norm(name);
      if (!key) continue;
      const existing = map.get(key);
      // Prefere manter uma entrada que tenha imagem sobre uma que só tenha vídeo.
      if (!existing || (!existing.image && image)) {
        map.set(key, { image, video, wgerName: name });
      }
    }
  }
  return map;
}

async function fetchAllExercises() {
  const all = [];
  const size = 1000;
  let from = 0;
  for (;;) {
    const { data, error } = await supabase
      .from("exercicios_biblioteca")
      .select("id, nome, gif_url, imagem_url")
      .range(from, from + size - 1);
    if (error) throw new Error(`Supabase: ${error.message}`);
    all.push(...(data || []));
    if (!data || data.length < size) break;
    from += size;
  }
  return all;
}

async function run() {
  console.log(`🚀 Backfill de mídia do wger local: ${WGER_API_URL}`);
  if (DRY_RUN) console.log("🧪 Modo --dry-run: nada será gravado.");
  if (OVERWRITE) console.log("⚠️  Modo --overwrite: mídia existente também será sobrescrita.");

  let infos;
  try {
    infos = await fetchAllWger("/exerciseinfo/");
  } catch (e) {
    console.error("❌ Não consegui acessar o wger. A stack está no ar? (docker compose up -d)");
    console.error("   Detalhe:", e.message);
    process.exit(1);
  }
  console.log(`📦 ${infos.length} exercícios no wger.`);

  const lookup = buildLookup(infos);
  console.log(`🗂️  ${lookup.size} nomes indexados (todos os idiomas + aliases).`);

  const nossos = await fetchAllExercises();
  console.log(`📚 ${nossos.length} exercícios na nossa biblioteca.`);

  const updates = [];
  const semMatch = [];
  let comVideo = 0;

  for (const ex of nossos) {
    const hit = lookup.get(norm(ex.nome));
    if (!hit || !hit.image) {
      if (!hit) semMatch.push(ex.nome);
      continue;
    }
    if (hit.video) comVideo += 1;

    const fields = {};
    if (OVERWRITE || !ex.gif_url) fields.gif_url = hit.image;
    if (OVERWRITE || !ex.imagem_url) fields.imagem_url = hit.image;
    if (Object.keys(fields).length > 0) {
      updates.push({ id: ex.id, nome: ex.nome, wgerName: hit.wgerName, fields });
    }
  }

  const matched = nossos.length - semMatch.length;
  console.log(`\n📊 Cobertura: ${matched}/${nossos.length} exercícios casaram com o wger (com imagem).`);
  console.log(`   • ${updates.length} receberão/atualizarão imagem.`);
  console.log(`   • ${matched - updates.length} já tinham a mídia preenchida (use --overwrite p/ refazer).`);
  console.log(`   • ${semMatch.length} sem correspondência de nome no wger.`);
  console.log(`   • ${comVideo} dos matches TÊM vídeo no wger (não aplicado — ver observação no fim).`);

  if (DRY_RUN) {
    console.log("\n🔎 Exemplos de matches:");
    updates.slice(0, 15).forEach((u) => console.log(`   ✓ "${u.nome}"  ⟵  wger:"${u.wgerName}"`));
    if (semMatch.length) {
      console.log("\n🚫 Exemplos SEM match (você pode mapear manualmente depois):");
      semMatch.slice(0, 20).forEach((n) => console.log(`   • ${n}`));
    }
    console.log("\n🧪 Dry-run: nada gravado. Rode sem --dry-run para aplicar.");
    return;
  }

  let done = 0;
  for (const u of updates) {
    const { error } = await supabase.from("exercicios_biblioteca").update(u.fields).eq("id", u.id);
    if (error) {
      console.error(`❌ Erro ao atualizar "${u.nome}":`, error.message);
      process.exit(1);
    }
    done += 1;
    if (done % 25 === 0 || done === updates.length) console.log(`   ✓ ${done}/${updates.length} atualizados`);
  }

  console.log(`\n🎉 Concluído: ${done} exercícios receberam imagem do wger. Nada foi apagado.`);
  if (comVideo > 0) {
    console.log(
      `\nℹ️  ${comVideo} exercícios têm vídeo (.mp4) no wger. O campo "video_url" da ficha hoje só` +
        ` toca YouTube, então os vídeos NÃO foram aplicados. Posso estender a ficha para tocar` +
        ` vídeos .mp4 do wger (<video>) se você quiser.`
    );
  }
}

run().catch((e) => {
  console.error("❌ Falha inesperada:", e);
  process.exit(1);
});
