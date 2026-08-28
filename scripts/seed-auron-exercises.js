const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error("❌ Erro: Variáveis ambientais Supabase não configuradas no .env.local");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function run() {
  console.log("🚀 Iniciando carga de exercícios globais AURON...");

  // 1. Carregar arquivo JSON
  const seedPath = path.join(__dirname, '../docs/refatoração-exercicios/AURON_EXERCICIOS_GLOBAIS_SEED.json');
  if (!fs.existsSync(seedPath)) {
    console.error("❌ Erro: Arquivo AURON_EXERCICIOS_GLOBAIS_SEED.json não encontrado!");
    process.exit(1);
  }

  const rawData = fs.readFileSync(seedPath, 'utf8');
  const exercises = JSON.parse(rawData);

  console.log(`📦 Encontrados ${exercises.length} exercícios no seed.`);

  // 2. Mapear dados para o banco
  const mapped = exercises.map(ex => ({
    slug: ex.slug,
    nome: ex.nome,
    grupo_muscular: ex.membro_alvo, // membro_alvo maps to grupo_muscular
    video_url: null, // Keep null as requested
    descricao: ex.observacoes || '',
    equipamento: ex.equipamento,
    musculos_secundarios: Array.isArray(ex.membros_secundarios) ? ex.membros_secundarios.join(', ') : '',
    tipo_exercicio: mapTipoMetrica(ex.tipo_metrica),
    origem: 'auron_global',
    coach_id: null, // Global
    ativo: true,
    membro_alvo_slug: ex.membro_alvo_slug,
    categoria_equipamento: ex.categoria_equipamento
  }));

  // 3. Obter slugs existentes para evitar duplicidade
  console.log("🔍 Verificando exercícios já cadastrados...");
  const { data: existing, error: fetchError } = await supabase
    .from('exercicios_biblioteca')
    .select('slug')
    .eq('origem', 'auron_global');

  if (fetchError) {
    console.error("❌ Erro ao buscar duplicados:", fetchError);
    process.exit(1);
  }

  const existingSlugs = new Set((existing || []).map(e => e.slug).filter(Boolean));
  console.log(`ℹ️ ${existingSlugs.size} exercícios globais já existem no banco.`);

  // Filtrar apenas os que não existem
  const toInsert = mapped.filter(ex => !existingSlugs.has(ex.slug));

  if (toInsert.length === 0) {
    console.log("✅ Todos os exercícios já estão cadastrados! Nada a inserir.");
    return;
  }

  console.log(`📥 Inserindo ${toInsert.length} novos exercícios globais em lotes...`);

  // 4. Inserir em lotes de 50 para estabilidade
  const chunkSize = 50;
  let inserted = 0;

  for (let i = 0; i < toInsert.length; i += chunkSize) {
    const chunk = toInsert.slice(i, i + chunkSize);
    const { error: insertError } = await supabase
      .from('exercicios_biblioteca')
      .insert(chunk);

    if (insertError) {
      console.error(`❌ Erro ao inserir lote de ${i} a ${i + chunkSize}:`, insertError);
      process.exit(1);
    }

    inserted += chunk.length;
    console.log(`   ✓ Lote inserido (${inserted}/${toInsert.length})`);
  }

  console.log(`\n🎉 Sucesso! Carga concluída: ${inserted} inseridos, ${existingSlugs.size} ignorados por duplicidade.`);
}

function mapTipoMetrica(tipoMetrica) {
  // Map JSON types to database allowed strings
  switch (tipoMetrica) {
    case 'reps_tempo':
      return 'Repetições';
    case 'peso_reps':
      return 'Peso & Repetições';
    case 'tempo':
      return 'Duração';
    case 'peso_tempo':
      return 'Duração e Peso';
    case 'distancia_tempo':
      return 'Distância e Duração';
    case 'peso_distancia':
      return 'Peso e Distância';
    default:
      return 'Peso & Repetições';
  }
}

run();
