/**
 * RECONSTRUÇÃO SEGURA da biblioteca de exercícios a partir da NOSSA instância local do wger.
 *
 * Estratégia "replace-safe":
 *   1. Descobre quais exercícios estão REFERENCIADOS (não podem ser apagados sem perder dados):
 *        - historico_treinos.exercicio_id, logs_treino.exercicio_id, recordes_pessoais.exercicio_id (FKs)
 *        - fichas_treino.configuracao (ids embutidos no JSON da ficha)
 *   2. Apaga apenas os exercícios NÃO referenciados (não quebra fichas nem histórico).
 *   3. Importa todos os exercícios do wger como novos (origem='wger'), com a imagem em gif_url.
 *
 * SEGURANÇA:
 *   - Roda em DRY-RUN por padrão (só mostra o que faria). Use --apply para executar de verdade.
 *   - Nunca apaga exercícios referenciados. Nunca apaga histórico/fichas.
 *   - video_url fica null (o player da ficha é YouTube; você adiciona o link depois).
 *
 * Uso:
 *   node scripts/rebuild-wger-library.js            # dry-run (recomendado primeiro)
 *   node scripts/rebuild-wger-library.js --apply    # executa (apaga não referenciados + importa)
 *
 * Env (.env.local): NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 *   WGER_API_URL (padrão http://localhost/api/v2), WGER_LANGS (padrão pt-br,pt,en)
 */

const { createClient } = require("@supabase/supabase-js");
require("dotenv").config({ path: ".env.local" });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const WGER_API_URL = (process.env.WGER_API_URL || "http://localhost/api/v2").replace(/\/+$/, "");
const LANG_PREF = (process.env.WGER_LANGS || "pt-br,pt,en").split(",").map((s) => s.trim().toLowerCase());
const APPLY = process.argv.includes("--apply");

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error("❌ Configure NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY no .env.local");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

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
  if (!tr || !tr.name) return null;

  const categoryName = (info.category && info.category.name ? info.category.name : "").toLowerCase();
  const grupoMuscular = CATEGORY_MAP[categoryName] || (info.category && info.category.name) || null;

  const firstEquip =
    Array.isArray(info.equipment) && info.equipment[0] ? String(info.equipment[0].name).toLowerCase() : null;
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
    gif_url: image,
    imagem_url: image,
    video_url: null,
    origem: "wger",
    coach_id: null,
    ativo: true,
  };
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

  // 1. FKs diretas
  for (const table of ["historico_treinos", "logs_treino", "recordes_pessoais"]) {
    const rows = await selectAll(table, "exercicio_id");
    for (const r of rows) if (r.exercicio_id) referenced.add(r.exercicio_id);
  }

  // 2. IDs embutidos no JSON das fichas (procura o UUID no config serializado)
  const fichas = await selectAll("fichas_treino", "configuracao");
  const blob = fichas.map((f) => JSON.stringify(f.configuracao || "")).join("\n");
  for (const id of existingIds) {
    if (blob.includes(id)) referenced.add(id);
  }

  return referenced;
}

async function run() {
  console.log(`🚀 Rebuild seguro da biblioteca a partir do wger: ${WGER_API_URL}`);
  console.log(APPLY ? "⚙️  Modo --apply: vai APAGAR não referenciados e IMPORTAR do wger." : "🧪 DRY-RUN: nada será alterado. Use --apply para executar.");

  // A. Exercícios atuais
  const existing = await selectAll("exercicios_biblioteca", "id, nome, origem");
  const existingIds = existing.map((e) => e.id);
  console.log(`📚 ${existing.length} exercícios atuais na biblioteca.`);

  // B. Referenciados (não podem ser apagados)
  const referenced = await computeReferencedIds(existingIds);
  const toDelete = existing.filter((e) => !referenced.has(e.id));
  const kept = existing.filter((e) => referenced.has(e.id));
  console.log(`🔒 ${kept.length} referenciados (serão MANTIDOS) | 🗑️  ${toDelete.length} não referenciados (serão apagados).`);

  // C. wger
  let langIdToShort = {};
  let infos;
  try {
    const langs = await fetchAllWger("/language/");
    langIdToShort = Object.fromEntries(langs.map((l) => [l.id, l.short_name]));
    infos = await fetchAllWger("/exerciseinfo/");
  } catch (e) {
    console.error("❌ Não consegui acessar o wger. A stack está no ar? (docker compose up -d)");
    console.error("   Detalhe:", e.message);
    process.exit(1);
  }
  const mapped = infos.map((i) => mapExercise(i, langIdToShort)).filter(Boolean);

  // Evita duplicar slugs wger que já existam entre os MANTIDOS
  const { data: keptWger } = await supabase.from("exercicios_biblioteca").select("slug").eq("origem", "wger");
  const existingSlugs = new Set((keptWger || []).map((e) => e.slug).filter(Boolean));
  const toInsert = mapped.filter((m) => !existingSlugs.has(m.slug));

  console.log(`📦 wger: ${infos.length} exercícios | ${mapped.length} mapeáveis | ${toInsert.length} a inserir.`);

  if (!APPLY) {
    console.log("\n🔎 Exemplos que seriam APAGADOS (não referenciados):");
    toDelete.slice(0, 15).forEach((e) => console.log(`   🗑️  ${e.nome}`));
    console.log("\n🔎 Exemplos que seriam MANTIDOS (referenciados por ficha/histórico):");
    kept.slice(0, 15).forEach((e) => console.log(`   🔒 ${e.nome}`));
    console.log("\n🧪 DRY-RUN concluído. Rode com --apply para executar.");
    return;
  }

  // D. Apagar não referenciados (em lotes)
  const CHUNK = 100;
  let deleted = 0;
  for (let i = 0; i < toDelete.length; i += CHUNK) {
    const ids = toDelete.slice(i, i + CHUNK).map((e) => e.id);
    const { error } = await supabase.from("exercicios_biblioteca").delete().in("id", ids);
    if (error) {
      console.error(`❌ Erro ao apagar lote ${i}:`, error.message);
      process.exit(1);
    }
    deleted += ids.length;
    console.log(`   🗑️  Apagados ${deleted}/${toDelete.length}`);
  }

  // E. Importar do wger (em lotes)
  let inserted = 0;
  for (let i = 0; i < toInsert.length; i += 50) {
    const chunk = toInsert.slice(i, i + 50);
    const { error } = await supabase.from("exercicios_biblioteca").insert(chunk);
    if (error) {
      console.error(`❌ Erro ao inserir lote ${i}:`, error.message);
      process.exit(1);
    }
    inserted += chunk.length;
    console.log(`   📥 Inseridos ${inserted}/${toInsert.length}`);
  }

  console.log(`\n🎉 Concluído: ${deleted} apagados, ${inserted} importados do wger, ${kept.length} mantidos (referenciados).`);
  console.log("ℹ️  video_url ficou null nos importados — adicione os links do YouTube depois.");
}

run().catch((e) => {
  console.error("❌ Falha inesperada:", e);
  process.exit(1);
});
