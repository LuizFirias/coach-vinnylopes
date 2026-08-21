// Upload em lote dos GIFs de exercício pro Cloudflare R2 + geração automática
// da miniatura estática (1º frame) + atualização de exercicios_biblioteca.
//
// Roda uma pasta por vez (cada pasta = um equipamento, pra restringir o
// casamento nome-do-arquivo → exercício só àquele grupo, evitando confusão
// entre exercícios parecidos de categorias diferentes).
//
// Uso (dry-run — não grava nada, só mostra o que seria feito):
//   node scripts/upload-exercicios-gifs.mjs ./gifs/barra --equipamento Barra
//
// Depois de conferir a lista, roda de novo com --commit pra gravar de verdade:
//   node scripts/upload-exercicios-gifs.mjs ./gifs/barra --equipamento Barra --commit
//
// Pra GIFs femininos, adiciona --genero feminino.
//
// ── Modo mapeamento manual (recomendado quando o nome do arquivo não bate
//    com o nome do exercício — ex.: arquivos em inglês, nomes do banco em
//    português) — usa um JSON { "Nome do exercício": "nome-do-arquivo.gif" }
//    conferido à mão em vez do casamento automático por nome normalizado:
//   node scripts/upload-exercicios-gifs.mjs ./gifs/barra --mapping scripts/gif-mapping/barra-masculino.json --equipamento Barra

import { readdirSync, readFileSync } from 'node:fs';
import { extname, basename, join } from 'node:path';
import { randomUUID } from 'node:crypto';
import dotenv from 'dotenv';
import sharp from 'sharp';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { createClient } from '@supabase/supabase-js';

dotenv.config({ path: new URL('../.env.local', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1') });

// ── Args ─────────────────────────────────────────────────────────────────────
const args = process.argv.slice(2);
const folder = args.find((a) => !a.startsWith('--'));
const flag = (name, fallback) => {
  const idx = args.indexOf(`--${name}`);
  return idx >= 0 ? args[idx + 1] : fallback;
};
const equipamento = flag('equipamento', null);
const genero = flag('genero', 'padrao'); // 'padrao' | 'feminino'
const commit = args.includes('--commit');
const mappingPath = flag('mapping', null);

if (!folder) {
  console.error('Uso: node scripts/upload-exercicios-gifs.mjs <pasta> --equipamento <Equip> [--genero feminino] [--commit]');
  process.exit(1);
}
if (!['padrao', 'feminino'].includes(genero)) {
  console.error("--genero deve ser 'padrao' ou 'feminino'");
  process.exit(1);
}

// ── Clientes ─────────────────────────────────────────────────────────────────
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false } },
);

const r2 = new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  },
});

async function uploadToR2(key, body, contentType) {
  await r2.send(new PutObjectCommand({
    Bucket: process.env.R2_BUCKET_NAME,
    Key: key,
    Body: body,
    ContentType: contentType,
    CacheControl: 'public, max-age=31536000, immutable',
  }));
}

// ── Normalização de nome (arquivo <-> exercício) ────────────────────────────
function normalize(str) {
  return str
    .normalize('NFD').replace(/[̀-ͯ]/g, '') // remove acentos
    .toLowerCase()
    .replace(/\([^)]*\)/g, '') // remove "(Machine)" etc
    .replace(/[_-]+/g, ' ')
    .replace(/[^a-z0-9 ]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

// ── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  // Recursivo — aponta pra pasta do equipamento (ex.: "EXERCÍCIOS COM BARRAS")
  // e ele já pega os arquivos dentro de todas as subpastas de músculo.
  const files = readdirSync(folder, { recursive: true })
    .filter((f) => ['.gif', '.webp'].includes(extname(f).toLowerCase()));
  if (files.length === 0) {
    console.log('Nenhum .gif/.webp encontrado em', folder, '(nem nas subpastas)');
    return;
  }

  let query = supabase.from('exercicios_biblioteca').select('id, nome, equipamento');
  if (equipamento) query = query.eq('equipamento', equipamento);
  const { data: exercicios, error } = await query;
  if (error) throw error;

  const matches = [];
  const semMatch = [];

  if (mappingPath) {
    // ── Modo mapeamento manual: JSON { "Nome do exercício": "arquivo.gif" } ──
    const mapping = JSON.parse(readFileSync(mappingPath, 'utf-8'));
    const porBasename = new Map(files.map((f) => [basename(f), f]));
    const porNomeExato = new Map(exercicios.map((ex) => [ex.nome, ex]));

    for (const [nomeExercicio, nomeArquivo] of Object.entries(mapping)) {
      const ex = porNomeExato.get(nomeExercicio);
      const file = porBasename.get(nomeArquivo);
      if (!ex) {
        semMatch.push(`${nomeArquivo}  (exercício "${nomeExercicio}" não encontrado no banco${equipamento ? ` com equipamento=${equipamento}` : ''})`);
        continue;
      }
      if (!file) {
        semMatch.push(`${nomeArquivo}  (arquivo não encontrado na pasta, esperado pra "${nomeExercicio}")`);
        continue;
      }
      matches.push({ file, ex });
    }
  } else {
    // ── Modo automático: casamento por nome normalizado (arquivo === nome) ──
    const porNome = new Map(exercicios.map((ex) => [normalize(ex.nome), ex]));

    for (const file of files) {
      const nomeArquivo = normalize(basename(file, extname(file)));
      const ex = porNome.get(nomeArquivo);
      if (ex) matches.push({ file, ex });
      else semMatch.push(file);
    }
  }

  console.log(`\nPasta: ${folder}  |  equipamento: ${equipamento ?? '(todos)'}  |  gênero: ${genero}  |  modo: ${commit ? 'COMMIT' : 'dry-run'}${mappingPath ? `  |  mapeamento: ${mappingPath}` : ''}\n`);
  console.log(`Exercícios candidatos no banco: ${exercicios.length}`);
  console.log(`Arquivos na pasta: ${files.length}`);
  console.log(`\n✅ Matches (${matches.length}):`);
  for (const m of matches) console.log(`   ${m.file}  →  ${m.ex.nome}`);
  console.log(`\n⚠️  Sem correspondência (${semMatch.length}) — não vão ser processados:`);
  for (const f of semMatch) console.log(`   ${f}`);

  if (!commit) {
    console.log('\nModo dry-run — nada foi gravado. Rode com --commit pra confirmar.');
    return;
  }

  console.log('\nSubindo...\n');
  const gifField = genero === 'feminino' ? 'gif_url_feminino' : 'gif_url';
  const imgField = genero === 'feminino' ? 'imagem_url_feminino' : 'imagem_url';

  for (const { file, ex } of matches) {
    const buffer = readFileSync(join(folder, file));
    const ext = extname(file).slice(1).toLowerCase();
    const contentType = ext === 'gif' ? 'image/gif' : 'image/webp';
    const id = randomUUID();
    const gifKey = `exercicios/${id}.${ext}`;
    const posterKey = `exercicios/${id}-poster.webp`;

    let posterBuffer = null;
    try {
      posterBuffer = await sharp(buffer).resize(400, 400, { fit: 'inside' }).webp().toBuffer();
    } catch (err) {
      console.warn(`   ⚠️  ${file}: falha ao gerar miniatura (${err.message}) — seguindo sem imagem estática`);
    }

    await uploadToR2(gifKey, buffer, contentType);
    if (posterBuffer) await uploadToR2(posterKey, posterBuffer, 'image/webp');

    const { error: updateError } = await supabase
      .from('exercicios_biblioteca')
      .update({ [gifField]: gifKey, ...(posterBuffer ? { [imgField]: posterKey } : {}) })
      .eq('id', ex.id);

    if (updateError) {
      console.error(`   ❌ ${ex.nome}: erro ao atualizar banco —`, updateError.message);
    } else {
      console.log(`   ✅ ${ex.nome} → ${gifKey}`);
    }
  }

  console.log('\nConcluído.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
