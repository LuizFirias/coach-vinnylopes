/**
 * Importa exercícios da NOSSA instância local do wger para a tabela
 * `exercicios_biblioteca` do Supabase (biblioteca de exercícios do AuronFit).
 *
 * - Lê de http://localhost/api/v2/exerciseinfo (a nossa instância, não a API pública).
 * - Idempotente: usa `slug = wger-<uuid>` + `origem = 'wger'` para não duplicar.
 * - Respeita as CHECK constraints de `equipamento` e `tipo_exercicio`.
 *
 * Uso:
 *   node scripts/import-wger-exercises.js            # insere apenas os novos
 *   node scripts/import-wger-exercises.js --update   # atualiza também os já existentes
 *   node scripts/import-wger-exercises.js --dry-run  # não grava nada, só mostra o que faria
 *
 * Variáveis de ambiente (.env.local):
 *   NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY  (obrigatórias)
 *   WGER_API_URL   (opcional, padrão http://localhost/api/v2)
 *   WGER_LANGS     (opcional, padrão "pt-br,pt,en") — ordem de preferência de idioma
 */

const { createClient } = require("@supabase/supabase-js");
require("dotenv").config({ path: ".env.local" });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const WGER_API_URL = (process.env.WGER_API_URL || "http://localhost/api/v2").replace(/\/+$/, "");
const LANG_PREF = (process.env.WGER_LANGS || "pt-br,pt,en").split(",").map((s) => s.trim().toLowerCase());

const UPDATE = process.argv.includes("--update");
const DRY_RUN = process.argv.includes("--dry-run");

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error("❌ Configure NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY no .env.local");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// wger equipment name -> valor permitido em exercicios_biblioteca.equipamento
const EQUIP_MAP = {
  barbell: "Barra",
  "sz-bar": "Barra",
  dumbbell: "Haltere",
  kettlebell: "Kettlebell",
  "none (bodyweight exercise)": "Nenhum",
  "resistance band": "Banda de Resistência",
  cable: "Máquina",
  "pull-up bar": "Outro",
  bench: "Outro",
  "incline bench": "Outro",
  "gym mat": "Outro",
  "swiss ball": "Outro",
};

// wger category name -> grupo_muscular (texto livre) em pt
const CATEGORY_MAP = {
  abs: "Abdômen",
  arms: "Braços",
  back: "Costas",
  calves: "Panturrilhas",
  cardio: "Cardio",
  chest: "Peito",
  legs: "Pernas",
  shoulders: "Ombros",
};

function stripHtml(html) {
  if (!html) return "";
  return String(html)
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|li)>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
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

async function fetchAll(path) {
  const out = [];
  let url = `${WGER_API_URL}${path}${path.includes("?") ? "&" : "?"}limit=100`;
  while (url) {
    const page = await fetchJson(url);
    out.push(...(page.results || []));
    url = page.next;
  }
  return out;
}

function pickTranslation(translations, langIdToShort) {
  if (!Array.isArray(translations) || translations.length === 0) return null;
  for (const pref of LANG_PREF) {
    const found = translations.find((t) => (langIdToShort[t.language] || "").toLowerCase() === pref && t.name);
    if (found) return found;
  }
  return translations.find((t) => t.name) || null;
}

function mapExercise(info, langIdToShort) {
  const tr = pickTranslation(info.translations, langIdToShort);
  if (!tr || !tr.name) return null; // sem nome utilizável, pula

  const categoryName = (info.category && info.category.name ? info.category.name : "").toLowerCase();
  const grupoMuscular = CATEGORY_MAP[categoryName] || (info.category && info.category.name) || null;

  const firstEquip = Array.isArray(info.equipment) && info.equipment[0] ? String(info.equipment[0].name).toLowerCase() : null;
  const equipamento = firstEquip ? EQUIP_MAP[firstEquip] || "Outro" : null;

  const tipoExercicio = equipamento === "Nenhum" ? "Repetições" : "Peso & Repetições";

  const musculosSecundarios = Array.isArray(info.muscles_secondary)
    ? info.muscles_secondary.map((m) => m.name_en || m.name).filter(Boolean).join(", ")
    : "";

  const mainImage = Array.isArray(info.images) ? info.images.find((i) => i.is_main) || info.images[0] : null;
  const image = pickImageUrl(mainImage);

  return {
    slug: `wger-${info.uuid}`,
    nome: tr.name.trim(),
    grupo_muscular: grupoMuscular,
    descricao: stripHtml(tr.description) || null,
    equipamento,
    musculos_secundarios: musculosSecundarios || null,
    tipo_exercicio: tipoExercicio,
    // A imagem do wger vai para gif_url (o campo mostrado na ficha ao abrir) e imagem_url.
    gif_url: image,
    imagem_url: image,
    // video_url fica null de propósito: o player da ficha é YouTube (leve) e o vídeo do wger
    // é um .mp4 local (incompatível com o player). O link do YouTube é adicionado manualmente depois.
    video_url: null,
    origem: "wger",
    coach_id: null,
    ativo: true,
  };
}

async function run() {
  console.log(`🚀 Importando exercícios do wger local: ${WGER_API_URL}`);
  if (DRY_RUN) console.log("🧪 Modo --dry-run: nada será gravado.");

  // 1. Mapa de idiomas (id -> short_name)
  let langIdToShort = {};
  try {
    const langs = await fetchAll("/language/");
    langIdToShort = Object.fromEntries(langs.map((l) => [l.id, l.short_name]));
  } catch (e) {
    console.error("❌ Não consegui acessar o wger. A stack Docker está no ar? (docker compose up -d)");
    console.error("   Detalhe:", e.message);
    process.exit(1);
  }

  // 2. Buscar todos os exercícios (com imagens, vídeos, músculos, traduções)
  console.log("📡 Baixando exerciseinfo...");
  const infos = await fetchAll("/exerciseinfo/");
  console.log(`📦 ${infos.length} exercícios retornados pelo wger.`);

  const mapped = infos.map((i) => mapExercise(i, langIdToShort)).filter(Boolean);
  console.log(`🗺️  ${mapped.length} exercícios com nome utilizável (idioma preferido: ${LANG_PREF.join(" > ")}).`);

  // 3. Existentes (origem = 'wger') -> slug -> id
  const { data: existing, error: fetchErr } = await supabase
    .from("exercicios_biblioteca")
    .select("id, slug")
    .eq("origem", "wger");
  if (fetchErr) {
    console.error("❌ Erro ao consultar exercícios existentes:", fetchErr.message);
    process.exit(1);
  }
  const slugToId = new Map((existing || []).map((e) => [e.slug, e.id]));
  console.log(`ℹ️  ${slugToId.size} exercícios wger já existem no Supabase.`);

  const toInsert = mapped.filter((m) => !slugToId.has(m.slug));
  const toUpdate = UPDATE ? mapped.filter((m) => slugToId.has(m.slug)) : [];

  console.log(`📥 A inserir: ${toInsert.length} | 🔄 A atualizar: ${toUpdate.length}${UPDATE ? "" : " (use --update p/ atualizar)"}`);

  if (DRY_RUN) {
    console.log("🧪 Exemplo do primeiro item a inserir:", JSON.stringify(toInsert[0] || toUpdate[0] || {}, null, 2));
    return;
  }

  // 4. Inserir em lotes
  const CHUNK = 50;
  let inserted = 0;
  for (let i = 0; i < toInsert.length; i += CHUNK) {
    const chunk = toInsert.slice(i, i + CHUNK);
    const { error } = await supabase.from("exercicios_biblioteca").insert(chunk);
    if (error) {
      console.error(`❌ Erro ao inserir lote ${i}-${i + CHUNK}:`, error.message);
      process.exit(1);
    }
    inserted += chunk.length;
    console.log(`   ✓ Inseridos ${inserted}/${toInsert.length}`);
  }

  // 5. Atualizar existentes (opcional)
  let updated = 0;
  for (const row of toUpdate) {
    const id = slugToId.get(row.slug);
    const { slug, ...fields } = row; // slug não muda
    const { error } = await supabase.from("exercicios_biblioteca").update(fields).eq("id", id);
    if (error) {
      console.error(`❌ Erro ao atualizar ${slug}:`, error.message);
      process.exit(1);
    }
    updated += 1;
    if (updated % 50 === 0) console.log(`   ✓ Atualizados ${updated}/${toUpdate.length}`);
  }

  console.log(`\n🎉 Concluído: ${inserted} inseridos, ${updated} atualizados, ${slugToId.size - updated} ignorados.`);
}

run().catch((e) => {
  console.error("❌ Falha inesperada:", e);
  process.exit(1);
});
