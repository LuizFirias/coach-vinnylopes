/**
 * Script para fazer backfill da coluna `ultimo_checkin` na tabela `profiles`
 * baseado nas tabelas `historico_treinos` e `treinos_manuais`.
 * 
 * USO:
 * node scripts/backfill-checkins.js
 */

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error('❌ Variáveis de ambiente NEXT_PUBLIC_SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY não configuradas.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

async function run() {
  console.log('🔄 Iniciando backfill de ultimo_checkin para todos os alunos...');
  try {
    // 1. Buscar todos os alunos
    const { data: alunos, error: errorAlunos } = await supabase
      .from('profiles')
      .select('id, full_name, ultimo_checkin')
      .eq('role', 'aluno');

    if (errorAlunos) throw errorAlunos;

    console.log(`📊 Encontrados ${alunos.length} alunos para processamento.`);

    for (const aluno of alunos) {
      console.log(`\n👤 Processando aluno: ${aluno.full_name} (${aluno.id})`);
      
      // 2. Buscar último treino do histórico digital
      const { data: ultimoDigital, error: errDigital } = await supabase
        .from('historico_treinos')
        .select('data_conclusao')
        .eq('aluno_id', aluno.id)
        .order('data_conclusao', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (errDigital) {
        console.error(`   ❌ Erro ao buscar histórico digital:`, errDigital.message);
      }

      // 3. Buscar último treino manual
      const { data: ultimoManual, error: errManual } = await supabase
        .from('treinos_manuais')
        .select('data_treino')
        .eq('aluno_id', aluno.id)
        .eq('concluido', true)
        .order('data_treino', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (errManual) {
        console.error(`   ❌ Erro ao buscar treinos manuais:`, errManual.message);
      }

      // 4. Determinar data mais recente
      let ultimaData = null;

      if (ultimoDigital && ultimoDigital.data_conclusao) {
        ultimaData = new Date(ultimoDigital.data_conclusao);
      }

      if (ultimoManual && ultimoManual.data_treino) {
        const dataManual = new Date(ultimoManual.data_treino + 'T12:00:00Z'); // Meio dia UTC para garantir
        if (!ultimaData || dataManual > ultimaData) {
          ultimaData = dataManual;
        }
      }

      if (ultimaData) {
        const isoString = ultimaData.toISOString();
        console.log(`   📅 Última atividade detectada em: ${isoString}`);
        
        // 5. Atualizar perfil do aluno
        const { error: updateError } = await supabase
          .from('profiles')
          .update({ ultimo_checkin: isoString })
          .eq('id', aluno.id);

        if (updateError) {
          console.error(`   ❌ Erro ao atualizar perfil:`, updateError.message);
        } else {
          console.log(`   ✅ Perfil atualizado com sucesso!`);
        }
      } else {
        console.log(`   ℹ️ Nenhuma atividade de treino encontrada para este aluno.`);
      }
    }

    console.log('\n🏁 Backfill concluído com sucesso!');
  } catch (err) {
    console.error('💥 Ocorreu um erro geral durante o backfill:', err);
  }
}

run();
