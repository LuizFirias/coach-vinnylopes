const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error("❌ Erro: Variáveis ambientais Supabase não configuradas no .env.local");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function testSearch(query, category) {
  console.log(`\n🔍 Testando busca por: "${query || ''}" | Categoria: "${category || ''}"`);
  
  let selectQuery = supabase
    .from('nutrition_foods')
    .select('id, name, category, default_state, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, portions:nutrition_food_portions(id, label, grams)')
    .eq('is_active', true);

  if (category) {
    selectQuery = selectQuery.eq('category', category);
  }

  if (query) {
    selectQuery = selectQuery.ilike('name', `%${query}%`);
  }

  const { data, error } = await selectQuery;

  if (error) {
    console.error("❌ Erro:", error);
    return;
  }

  console.log(`✅ Resultados encontrados: ${data.length}`);
  data.slice(0, 3).forEach(food => {
    console.log(`   - [${food.category}] ${food.name} (${food.calories_per_100g} kcal)`);
    console.log(`     Macros: P: ${food.protein_per_100g}g | C: ${food.carbs_per_100g}g | G: ${food.fat_per_100g}g`);
    console.log(`     Porções (${food.portions ? food.portions.length : 0}):`);
    if (food.portions) {
      food.portions.forEach(p => {
        console.log(`       * ${p.label}: ${p.grams}g`);
      });
    }
  });
}

async function run() {
  await testSearch('arroz');
  await testSearch('frango');
  await testSearch('ovo');
  await testSearch(null, 'carboidrato');
  await testSearch(null, 'proteina');
}

run();
