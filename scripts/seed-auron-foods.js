const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error("❌ Erro: Variáveis ambientais Supabase não configuradas no .env.local");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey);

// Lista inicial de Alimentos Globais da AURON com Macros por 100g e Porções Caseiras
const foodsSeed = [
  // 1. Carboidratos
  {
    name: 'Arroz branco cozido',
    slug: 'arroz-branco-cozido',
    category: 'carboidrato',
    default_state: 'cozido',
    description: 'Arroz branco tradicional cozido',
    base_unit: 'g',
    base_quantity: 100,
    calories_per_100g: 128,
    protein_per_100g: 2.5,
    carbs_per_100g: 28.1,
    fat_per_100g: 0.2,
    fiber_per_100g: 1.6,
    source_name: 'TBCA',
    source_reference: 'Tabela Brasileira de Composição de Alimentos',
    origin: 'auron_global',
    is_active: true,
    portions: [
      { label: 'Colher de sopa cheia', grams: 25 },
      { label: 'Escumadeira média', grams: 80 },
      { label: '100g', grams: 100, is_default: true }
    ]
  },
  {
    name: 'Arroz integral cozido',
    slug: 'arroz-integral-cozido',
    category: 'carboidrato',
    default_state: 'cozido',
    description: 'Arroz integral cozido',
    base_unit: 'g',
    base_quantity: 100,
    calories_per_100g: 124,
    protein_per_100g: 2.6,
    carbs_per_100g: 25.8,
    fat_per_100g: 1.0,
    fiber_per_100g: 2.7,
    source_name: 'TBCA',
    source_reference: 'Tabela Brasileira de Composição de Alimentos',
    origin: 'auron_global',
    is_active: true,
    portions: [
      { label: 'Colher de sopa cheia', grams: 25 },
      { label: 'Escumadeira média', grams: 80 },
      { label: '100g', grams: 100, is_default: true }
    ]
  },
  {
    name: 'Macarrão cozido',
    slug: 'macarrao-cozido',
    category: 'carboidrato',
    default_state: 'cozido',
    description: 'Macarrão de sêmola de trigo cozido',
    base_unit: 'g',
    base_quantity: 100,
    calories_per_100g: 140,
    protein_per_100g: 4.6,
    carbs_per_100g: 28.5,
    fat_per_100g: 0.6,
    fiber_per_100g: 1.8,
    source_name: 'TBCA',
    source_reference: 'Valor médio',
    origin: 'auron_global',
    is_active: true,
    portions: [
      { label: 'Pegador médio', grams: 70 },
      { label: 'Prato raso cheio', grams: 200 },
      { label: '100g', grams: 100, is_default: true }
    ]
  },
  {
    name: 'Batata doce cozida',
    slug: 'batata-doce-cozida',
    category: 'carboidrato',
    default_state: 'cozido',
    description: 'Batata doce cozida sem sal',
    base_unit: 'g',
    base_quantity: 100,
    calories_per_100g: 86,
    protein_per_100g: 1.6,
    carbs_per_100g: 20.1,
    fat_per_100g: 0.1,
    fiber_per_100g: 3.0,
    source_name: 'TACO',
    source_reference: 'UNICAMP',
    origin: 'auron_global',
    is_active: true,
    portions: [
      { label: 'Rodela média', grams: 20 },
      { label: 'Batata média inteira', grams: 150 },
      { label: '100g', grams: 100, is_default: true }
    ]
  },
  {
    name: 'Batata inglesa cozida',
    slug: 'batata-inglesa-cozida',
    category: 'carboidrato',
    default_state: 'cozido',
    description: 'Batata inglesa cozida sem sal',
    base_unit: 'g',
    base_quantity: 100,
    calories_per_100g: 52,
    protein_per_100g: 1.2,
    carbs_per_100g: 11.9,
    fat_per_100g: 0.0,
    fiber_per_100g: 1.3,
    source_name: 'TACO',
    source_reference: 'UNICAMP',
    origin: 'auron_global',
    is_active: true,
    portions: [
      { label: 'Colher de sopa cheia', grams: 30 },
      { label: 'Unidade média', grams: 120 },
      { label: '100g', grams: 100, is_default: true }
    ]
  },
  {
    name: 'Mandioca cozida',
    slug: 'mandioca-cozida',
    category: 'carboidrato',
    default_state: 'cozido',
    description: 'Mandioca / Aipim cozido',
    base_unit: 'g',
    base_quantity: 100,
    calories_per_100g: 125,
    protein_per_100g: 0.6,
    carbs_per_100g: 30.0,
    fat_per_100g: 0.3,
    fiber_per_100g: 1.6,
    source_name: 'TACO',
    source_reference: 'UNICAMP',
    origin: 'auron_global',
    is_active: true,
    portions: [
      { label: 'Pedaço pequeno', grams: 50 },
      { label: 'Pedaço médio', grams: 100, is_default: true }
    ]
  },
  {
    name: 'Cuscuz de milho cozido',
    slug: 'cuscuz-de-milho-cozido',
    category: 'carboidrato',
    default_state: 'cozido',
    description: 'Cuscuz de milho cozido sem manteiga',
    base_unit: 'g',
    base_quantity: 100,
    calories_per_100g: 113,
    protein_per_100g: 2.2,
    carbs_per_100g: 25.4,
    fat_per_100g: 0.6,
    fiber_per_100g: 2.1,
    source_name: 'TBCA',
    source_reference: 'Valor médio',
    origin: 'auron_global',
    is_active: true,
    portions: [
      { label: 'Colher de sopa cheia', grams: 25 },
      { label: 'Copo americano cheio', grams: 120 },
      { label: '100g', grams: 100, is_default: true }
    ]
  },
  {
    name: 'Tapioca preparada',
    slug: 'tapioca-preparada',
    category: 'carboidrato',
    default_state: 'cozido',
    description: 'Goma de tapioca hidratada e grelhada',
    base_unit: 'g',
    base_quantity: 100,
    calories_per_100g: 242,
    protein_per_100g: 0.2,
    carbs_per_100g: 60.0,
    fat_per_100g: 0.0,
    fiber_per_100g: 0.5,
    source_name: 'TBCA',
    source_reference: 'Valor médio',
    origin: 'auron_global',
    is_active: true,
    portions: [
      { label: 'Colher de sopa cheia de goma', grams: 15 },
      { label: 'Unidade média (4 colheres)', grams: 60, is_default: true }
    ]
  },
  {
    name: 'Aveia em flocos',
    slug: 'aveia-em-flocos',
    category: 'carboidrato',
    default_state: 'em_flocos',
    description: 'Aveia em flocos finos ou grossos',
    base_unit: 'g',
    base_quantity: 100,
    calories_per_100g: 389,
    protein_per_100g: 16.9,
    carbs_per_100g: 66.0,
    fat_per_100g: 6.9,
    fiber_per_100g: 10.6,
    source_name: 'TACO',
    source_reference: 'UNICAMP',
    origin: 'auron_global',
    is_active: true,
    portions: [
      { label: 'Colher de sopa rasa', grams: 10 },
      { label: 'Colher de sopa cheia', grams: 15 },
      { label: '30g', grams: 30, is_default: true }
    ]
  },
  {
    name: 'Pão francês',
    slug: 'pao-frances',
    category: 'carboidrato',
    default_state: 'natural',
    description: 'Pão francês tradicional',
    base_unit: 'g',
    base_quantity: 100,
    calories_per_100g: 300,
    protein_per_100g: 8.0,
    carbs_per_100g: 58.5,
    fat_per_100g: 3.0,
    fiber_per_100g: 2.3,
    source_name: 'TACO',
    source_reference: 'UNICAMP',
    origin: 'auron_global',
    is_active: true,
    portions: [
      { label: '1 unidade inteira', grams: 50, is_default: true },
      { label: 'Metade do pão', grams: 25 }
    ]
  },
  {
    name: 'Pão de forma integral',
    slug: 'pao-de-forma-integral',
    category: 'carboidrato',
    default_state: 'natural',
    description: 'Pão de forma integral genérico',
    base_unit: 'g',
    base_quantity: 100,
    calories_per_100g: 253,
    protein_per_100g: 9.4,
    carbs_per_100g: 48.7,
    fat_per_100g: 2.5,
    fiber_per_100g: 6.9,
    source_name: 'TBCA',
    source_reference: 'Valor médio',
    origin: 'auron_global',
    is_active: true,
    portions: [
      { label: '1 fatia', grams: 25 },
      { label: '2 fatias', grams: 50, is_default: true }
    ]
  },
  {
    name: 'Granola tradicional',
    slug: 'granola-tradicional',
    category: 'carboidrato',
    default_state: 'em_flocos',
    description: 'Granola de aveia e mel sem castanhas complexas',
    base_unit: 'g',
    base_quantity: 100,
    calories_per_100g: 418,
    protein_per_100g: 10.0,
    carbs_per_100g: 72.0,
    fat_per_100g: 9.0,
    fiber_per_100g: 6.0,
    source_name: 'TBCA',
    source_reference: 'Valor médio',
    origin: 'auron_global',
    is_active: true,
    portions: [
      { label: 'Colher de sopa cheia', grams: 15 },
      { label: 'Xícara de chá (1/2)', grams: 40, is_default: true }
    ]
  },

  // 2. Leguminosas
  {
    name: 'Feijão carioca cozido',
    slug: 'feijao-carioca-cozido',
    category: 'leguminosa',
    default_state: 'cozido',
    description: 'Feijão carioca cozido com caldo',
    base_unit: 'g',
    base_quantity: 100,
    calories_per_100g: 76,
    protein_per_100g: 4.8,
    carbs_per_100g: 13.6,
    fat_per_100g: 0.5,
    fiber_per_100g: 8.5,
    source_name: 'TACO',
    source_reference: 'UNICAMP',
    origin: 'auron_global',
    is_active: true,
    portions: [
      { label: 'Colher de sopa cheia', grams: 20 },
      { label: 'Concha pequena', grams: 85 },
      { label: 'Concha média', grams: 130, is_default: true }
    ]
  },
  {
    name: 'Feijão preto cozido',
    slug: 'feijao-preto-cozido',
    category: 'leguminosa',
    default_state: 'cozido',
    description: 'Feijão preto cozido com caldo',
    base_unit: 'g',
    base_quantity: 100,
    calories_per_100g: 77,
    protein_per_100g: 4.5,
    carbs_per_100g: 14.0,
    fat_per_100g: 0.5,
    fiber_per_100g: 8.4,
    source_name: 'TACO',
    source_reference: 'UNICAMP',
    origin: 'auron_global',
    is_active: true,
    portions: [
      { label: 'Colher de sopa cheia', grams: 20 },
      { label: 'Concha média', grams: 130, is_default: true }
    ]
  },
  {
    name: 'Lentilha cozida',
    slug: 'lentilha-cozida',
    category: 'leguminosa',
    default_state: 'cozido',
    description: 'Lentilha cozida com caldo simples',
    base_unit: 'g',
    base_quantity: 100,
    calories_per_100g: 93,
    protein_per_100g: 6.3,
    carbs_per_100g: 16.3,
    fat_per_100g: 0.5,
    fiber_per_100g: 7.9,
    source_name: 'TBCA',
    source_reference: 'Valor médio',
    origin: 'auron_global',
    is_active: true,
    portions: [
      { label: 'Colher de sopa cheia', grams: 25 },
      { label: 'Concha média', grams: 130, is_default: true }
    ]
  },
  {
    name: 'Grão-de-bico cozido',
    slug: 'grao-de-bico-cozido',
    category: 'leguminosa',
    default_state: 'cozido',
    description: 'Grão-de-bico cozido sem óleo',
    base_unit: 'g',
    base_quantity: 100,
    calories_per_100g: 139,
    protein_per_100g: 7.0,
    carbs_per_100g: 22.5,
    fat_per_100g: 2.5,
    fiber_per_100g: 6.4,
    source_name: 'TBCA',
    source_reference: 'Valor médio',
    origin: 'auron_global',
    is_active: true,
    portions: [
      { label: 'Colher de sopa cheia', grams: 25 },
      { label: 'Escumadeira média', grams: 80, is_default: true }
    ]
  },

  // 3. Proteínas
  {
    name: 'Peito de frango grelhado',
    slug: 'peito-de-frango-grelhado',
    category: 'proteina',
    default_state: 'grelhado',
    description: 'Peito de frango limpo sem pele grelhado',
    base_unit: 'g',
    base_quantity: 100,
    calories_per_100g: 159,
    protein_per_100g: 32.0,
    carbs_per_100g: 0.0,
    fat_per_100g: 2.5,
    fiber_per_100g: 0.0,
    source_name: 'TACO',
    source_reference: 'UNICAMP',
    origin: 'auron_global',
    is_active: true,
    portions: [
      { label: 'Filé pequeno', grams: 100 },
      { label: 'Filé médio', grams: 150, is_default: true },
      { label: '1 colher de sopa de desfiado', grams: 20 }
    ]
  },
  {
    name: 'Patinho moído cozido',
    slug: 'patinho-moido-cozido',
    category: 'proteina',
    default_state: 'cozido',
    description: 'Patinho moído cozido sem óleo',
    base_unit: 'g',
    base_quantity: 100,
    calories_per_100g: 219,
    protein_per_100g: 35.9,
    carbs_per_100g: 0.0,
    fat_per_100g: 7.3,
    fiber_per_100g: 0.0,
    source_name: 'TACO',
    source_reference: 'UNICAMP',
    origin: 'auron_global',
    is_active: true,
    portions: [
      { label: 'Colher de sopa cheia', grams: 25 },
      { label: '100g', grams: 100, is_default: true },
      { label: 'Pegador médio', grams: 120 }
    ]
  },
  {
    name: 'Tilápia grelhada',
    slug: 'tilapia-grelhada',
    category: 'proteina',
    default_state: 'grelhado',
    description: 'Filé de tilápia grelhado sem azeite',
    base_unit: 'g',
    base_quantity: 100,
    calories_per_100g: 111,
    protein_per_100g: 23.0,
    carbs_per_100g: 0.0,
    fat_per_100g: 1.7,
    fiber_per_100g: 0.0,
    source_name: 'USDA',
    source_reference: 'FDC',
    origin: 'auron_global',
    is_active: true,
    portions: [
      { label: 'Filé pequeno', grams: 100 },
      { label: 'Filé médio', grams: 150, is_default: true }
    ]
  },
  {
    name: 'Ovo inteiro cozido',
    slug: 'ovo-inteiro-cozido',
    category: 'proteina',
    default_state: 'cozido',
    description: 'Ovo de galinha inteiro cozido',
    base_unit: 'g',
    base_quantity: 100,
    calories_per_100g: 155,
    protein_per_100g: 13.0,
    carbs_per_100g: 1.1,
    fat_per_100g: 11.0,
    fiber_per_100g: 0.0,
    source_name: 'TACO',
    source_reference: 'UNICAMP',
    origin: 'auron_global',
    is_active: true,
    portions: [
      { label: 'Unidade média', grams: 50, is_default: true },
      { label: '100g', grams: 100 }
    ]
  },
  {
    name: 'Ovo inteiro cru ou mexido',
    slug: 'ovo-inteiro-cru-mexido',
    category: 'proteina',
    default_state: 'cru',
    description: 'Ovo de galinha inteiro cru ou mexido (sem óleo)',
    base_unit: 'g',
    base_quantity: 100,
    calories_per_100g: 143,
    protein_per_100g: 13.0,
    carbs_per_100g: 0.8,
    fat_per_100g: 9.5,
    fiber_per_100g: 0.0,
    source_name: 'TACO',
    source_reference: 'UNICAMP',
    origin: 'auron_global',
    is_active: true,
    portions: [
      { label: 'Unidade média', grams: 50, is_default: true },
      { label: '100g', grams: 100 }
    ]
  },
  {
    name: 'Clara de ovo cozida',
    slug: 'clara-de-ovo-cozida',
    category: 'proteina',
    default_state: 'cozido',
    description: 'Clara de ovo de galinha cozida',
    base_unit: 'g',
    base_quantity: 100,
    calories_per_100g: 52,
    protein_per_100g: 11.0,
    carbs_per_100g: 0.7,
    fat_per_100g: 0.2,
    fiber_per_100g: 0.0,
    source_name: 'USDA',
    source_reference: 'FDC',
    origin: 'auron_global',
    is_active: true,
    portions: [
      { label: 'Clara média', grams: 33, is_default: true },
      { label: '100g', grams: 100 }
    ]
  },
  {
    name: 'Whey protein genérico',
    slug: 'whey-protein-generico',
    category: 'suplemento',
    default_state: 'em_po',
    description: 'Suplemento de proteína de soro de leite concentrado 80%',
    base_unit: 'g',
    base_quantity: 100,
    calories_per_100g: 400,
    protein_per_100g: 80.0,
    carbs_per_100g: 6.7,
    fat_per_100g: 6.0,
    fiber_per_100g: 0.0,
    source_name: 'Média de mercado',
    source_reference: 'Valor médio aproximado',
    origin: 'auron_global',
    is_active: true,
    portions: [
      { label: '1 scoop / dosador', grams: 30, is_default: true },
      { label: '1/2 scoop / dosador', grams: 15 }
    ]
  },

  // 4. Laticínios
  {
    name: 'Leite desnatado',
    slug: 'leite-desnatado',
    category: 'laticinio',
    default_state: 'liquido',
    description: 'Leite UHT desnatado líquido',
    base_unit: 'ml',
    base_quantity: 100,
    calories_per_100g: 35,
    protein_per_100g: 3.2,
    carbs_per_100g: 4.7,
    fat_per_100g: 0.1,
    fiber_per_100g: 0.0,
    source_name: 'TACO',
    source_reference: 'UNICAMP',
    origin: 'auron_global',
    is_active: true,
    portions: [
      { label: 'Copo americano (150ml)', grams: 150 },
      { label: 'Copo duplo / Caneca', grams: 200, is_default: true }
    ]
  },
  {
    name: 'Queijo cottage',
    slug: 'queijo-cottage',
    category: 'laticinio',
    default_state: 'natural',
    description: 'Queijo cottage tradicional',
    base_unit: 'g',
    base_quantity: 100,
    calories_per_100g: 98,
    protein_per_100g: 11.0,
    carbs_per_100g: 3.4,
    fat_per_100g: 4.3,
    fiber_per_100g: 0.0,
    source_name: 'USDA',
    source_reference: 'FDC',
    origin: 'auron_global',
    is_active: true,
    portions: [
      { label: 'Colher de sopa cheia', grams: 30, is_default: true },
      { label: 'Pote pequeno (150g)', grams: 150 }
    ]
  },

  // 5. Gorduras e Oleaginosas
  {
    name: 'Farinha de arroz enriquecida',
    slug: 'farinha-de-arroz-enriquecida',
    category: 'carboidrato',
    default_state: 'em_po',
    description: 'Farinha de arroz enriquecida — comum em dietas off/cutting',
    base_unit: 'g',
    base_quantity: 100,
    calories_per_100g: 363,
    protein_per_100g: 1.3,
    carbs_per_100g: 85.5,
    fat_per_100g: 0.3,
    fiber_per_100g: 0.6,
    source_name: 'TACO',
    source_reference: 'UNICAMP',
    origin: 'auron_global',
    is_active: true,
    portions: [
      { label: 'Colher de sopa cheia', grams: 10 },
      { label: 'Colher de chá', grams: 3 },
      { label: '30g', grams: 30, is_default: true }
    ]
  },
  {
    name: 'Farinha de arroz integral',
    slug: 'farinha-de-arroz-integral',
    category: 'carboidrato',
    default_state: 'em_po',
    description: 'Farinha de arroz integral',
    base_unit: 'g',
    base_quantity: 100,
    calories_per_100g: 363,
    protein_per_100g: 7.0,
    carbs_per_100g: 76.0,
    fat_per_100g: 2.2,
    fiber_per_100g: 4.0,
    source_name: 'TBCA',
    source_reference: 'Valor médio',
    origin: 'auron_global',
    is_active: true,
    portions: [
      { label: 'Colher de sopa cheia', grams: 10 },
      { label: 'Colher de chá', grams: 3 },
      { label: '30g', grams: 30, is_default: true }
    ]
  },
  {
    name: 'Azeite de oliva',
    slug: 'azeite-de-oliva',
    category: 'gordura',
    default_state: 'liquido',
    description: 'Azeite de oliva extra virgem',
    base_unit: 'ml',
    base_quantity: 100,
    calories_per_100g: 884,
    protein_per_100g: 0.0,
    carbs_per_100g: 0.0,
    fat_per_100g: 100.0,
    fiber_per_100g: 0.0,
    source_name: 'TACO',
    source_reference: 'UNICAMP',
    origin: 'auron_global',
    is_active: true,
    portions: [
      { label: 'Colher de chá', grams: 5 },
      { label: 'Colher de sopa', grams: 13, is_default: true }
    ]
  },
  {
    name: 'Pasta de amendoim',
    slug: 'pasta-de-amendoim',
    category: 'gordura',
    default_state: 'natural',
    description: 'Pasta de amendoim integral sem açúcar',
    base_unit: 'g',
    base_quantity: 100,
    calories_per_100g: 588,
    protein_per_100g: 25.0,
    carbs_per_100g: 20.0,
    fat_per_100g: 50.0,
    fiber_per_100g: 6.0,
    source_name: 'TBCA',
    source_reference: 'Valor médio',
    origin: 'auron_global',
    is_active: true,
    portions: [
      { label: 'Colher de chá cheia', grams: 7 },
      { label: 'Colher de sopa cheia', grams: 20, is_default: true }
    ]
  },

  // 6. Frutas
  {
    name: 'Banana prata',
    slug: 'banana-prata',
    category: 'fruta',
    default_state: 'natural',
    description: 'Banana prata crua',
    base_unit: 'g',
    base_quantity: 100,
    calories_per_100g: 89,
    protein_per_100g: 1.1,
    carbs_per_100g: 22.8,
    fat_per_100g: 0.3,
    fiber_per_100g: 2.6,
    source_name: 'TACO',
    source_reference: 'UNICAMP',
    origin: 'auron_global',
    is_active: true,
    portions: [
      { label: 'Unidade pequena', grams: 50 },
      { label: 'Unidade média', grams: 65, is_default: true },
      { label: 'Unidade grande', grams: 90 }
    ]
  },
  {
    name: 'Maçã',
    slug: 'maca',
    category: 'fruta',
    default_state: 'natural',
    description: 'Maçã nacional crua com casca',
    base_unit: 'g',
    base_quantity: 100,
    calories_per_100g: 56,
    protein_per_100g: 0.3,
    carbs_per_100g: 15.2,
    fat_per_100g: 0.0,
    fiber_per_100g: 1.3,
    source_name: 'TACO',
    source_reference: 'UNICAMP',
    origin: 'auron_global',
    is_active: true,
    portions: [
      { label: 'Unidade pequena', grams: 90 },
      { label: 'Unidade média', grams: 130, is_default: true }
    ]
  },
  {
    name: 'Mamão papaia',
    slug: 'mamao-papaia',
    category: 'fruta',
    default_state: 'natural',
    description: 'Mamão papaia cru',
    base_unit: 'g',
    base_quantity: 100,
    calories_per_100g: 40,
    protein_per_100g: 0.5,
    carbs_per_100g: 10.4,
    fat_per_100g: 0.1,
    fiber_per_100g: 1.0,
    source_name: 'TACO',
    source_reference: 'UNICAMP',
    origin: 'auron_global',
    is_active: true,
    portions: [
      { label: 'Metade do mamão', grams: 150, is_default: true },
      { label: 'Mamão inteiro médio', grams: 300 }
    ]
  },

  // 7. Vegetais e Legumes
  {
    name: 'Brócolis cozido',
    slug: 'brocolis-cozido',
    category: 'vegetal',
    default_state: 'cozido',
    description: 'Brócolis cozido no vapor sem sal',
    base_unit: 'g',
    base_quantity: 100,
    calories_per_100g: 25,
    protein_per_100g: 2.1,
    carbs_per_100g: 4.4,
    fat_per_100g: 0.5,
    fiber_per_100g: 3.4,
    source_name: 'TACO',
    source_reference: 'UNICAMP',
    origin: 'auron_global',
    is_active: true,
    portions: [
      { label: 'Ramo médio', grams: 30 },
      { label: 'Copa / Pegador cheio', grams: 80, is_default: true }
    ]
  },
  {
    name: 'Tomate italiano cru',
    slug: 'tomate-italiano-cru',
    category: 'vegetal',
    default_state: 'natural',
    description: 'Tomate italiano cru com pele e semente',
    base_unit: 'g',
    base_quantity: 100,
    calories_per_100g: 15,
    protein_per_100g: 0.8,
    carbs_per_100g: 3.1,
    fat_per_100g: 0.2,
    fiber_per_100g: 1.2,
    source_name: 'TACO',
    source_reference: 'UNICAMP',
    origin: 'auron_global',
    is_active: true,
    portions: [
      { label: 'Rodela fina', grams: 10 },
      { label: 'Rodela grossa', grams: 25 },
      { label: 'Unidade média', grams: 80, is_default: true }
    ]
  },

  // 8. Bebidas
  {
    name: 'Água',
    slug: 'agua',
    category: 'bebida',
    default_state: 'liquido',
    description: 'Água potável tradicional',
    base_unit: 'ml',
    base_quantity: 100,
    calories_per_100g: 0,
    protein_per_100g: 0,
    carbs_per_100g: 0,
    fat_per_100g: 0,
    fiber_per_100g: 0,
    source_name: 'TACO',
    source_reference: 'UNICAMP',
    origin: 'auron_global',
    is_active: true,
    portions: [
      { label: 'Copo americano (150ml)', grams: 150 },
      { label: 'Copo de requeijão (200ml)', grams: 200, is_default: true },
      { label: 'Garrafa pequena (500ml)', grams: 500 }
    ]
  },

  // 9. Temperos e Complementos
  {
    name: 'Mel de abelha',
    slug: 'mel-de-abelha',
    category: 'tempero',
    default_state: 'natural',
    description: 'Mel de abelha silvestre',
    base_unit: 'g',
    base_quantity: 100,
    calories_per_100g: 309,
    protein_per_100g: 0.4,
    carbs_per_100g: 82.4,
    fat_per_100g: 0.0,
    fiber_per_100g: 0.0,
    source_name: 'TACO',
    source_reference: 'UNICAMP',
    origin: 'auron_global',
    is_active: true,
    portions: [
      { label: 'Colher de chá', grams: 5 },
      { label: 'Colher de sopa', grams: 15, is_default: true }
    ]
  }
];

async function run() {
  console.log("🚀 Iniciando seed técnico de alimentos globais AURON (Fase 02)...");

  let insertedFoodsCount = 0;
  let updatedFoodsCount = 0;
  let insertedPortionsCount = 0;

  for (const item of foodsSeed) {
    // 1. Validação básica de macros antes de inserir
    if (!item.name || !item.category) {
      console.warn(`⚠️ Alimento ignorado por falta de nome/categoria:`, item);
      continue;
    }
    if (item.calories_per_100g < 0 || item.protein_per_100g < 0 || item.carbs_per_100g < 0 || item.fat_per_100g < 0) {
      console.warn(`⚠️ Alimento '${item.name}' ignorado por conter macros negativos.`);
      continue;
    }

    const { portions, ...foodFields } = item;

    // 2. Busca por slug para saber se insere ou atualiza (idempotência)
    const { data: existingFood, error: findError } = await supabase
      .from('nutrition_foods')
      .select('id')
      .eq('slug', item.slug)
      .maybeSingle();

    if (findError) {
      console.error(`❌ Erro ao verificar alimento '${item.slug}':`, findError);
      process.exit(1);
    }

    let foodId;

    if (existingFood) {
      // Atualizar alimento existente
      const { data: updatedFood, error: updateError } = await supabase
        .from('nutrition_foods')
        .update({
          ...foodFields,
          updated_at: new Date().toISOString()
        })
        .eq('id', existingFood.id)
        .select('id')
        .single();

      if (updateError) {
        console.error(`❌ Erro ao atualizar alimento '${item.slug}':`, updateError);
        process.exit(1);
      }

      foodId = updatedFood.id;
      updatedFoodsCount++;
    } else {
      // Inserir novo alimento
      const { data: insertedFood, error: insertError } = await supabase
        .from('nutrition_foods')
        .insert({
          ...foodFields,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select('id')
        .single();

      if (insertError) {
        console.error(`❌ Erro ao inserir alimento '${item.slug}':`, insertError);
        process.exit(1);
      }

      foodId = insertedFood.id;
      insertedFoodsCount++;
    }

    // 3. Atualizar porções associadas a este foodId
    // Apaga as antigas porções antes de inserir para evitar duplicações de porções caseiras
    const { error: deletePortionsError } = await supabase
      .from('nutrition_food_portions')
      .delete()
      .eq('food_id', foodId);

    if (deletePortionsError) {
      console.error(`❌ Erro ao limpar porções antigas do alimento '${item.slug}':`, deletePortionsError);
      process.exit(1);
    }

    // Insere as novas porções se houverem
    if (portions && portions.length > 0) {
      const portionsToInsert = portions
        .filter(p => p.grams > 0)
        .map(p => ({
          food_id: foodId,
          label: p.label,
          grams: p.grams,
          is_default: p.is_default || false,
          created_at: new Date().toISOString()
        }));

      if (portionsToInsert.length > 0) {
        const { error: insertPortionsError } = await supabase
          .from('nutrition_food_portions')
          .insert(portionsToInsert);

        if (insertPortionsError) {
          console.error(`❌ Erro ao inserir porções do alimento '${item.slug}':`, insertPortionsError);
          process.exit(1);
        }

        insertedPortionsCount += portionsToInsert.length;
      }
    }
  }

  console.log(`\n🎉 Sucesso! Execução do seed concluída:`);
  console.log(`   - Alimentos Inseridos: ${insertedFoodsCount}`);
  console.log(`   - Alimentos Atualizados: ${updatedFoodsCount}`);
  console.log(`   - Porções Registradas: ${insertedPortionsCount}`);
}

run();
