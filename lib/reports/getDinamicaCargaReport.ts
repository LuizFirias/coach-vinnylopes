import { supabaseClient } from '@/lib/supabaseClient';
import { getPublicStorageUrl } from '@/lib/storageUrls';

export interface ExercicioReportData {
  nome: string;
  grupo_muscular?: string;
  sessoes: Array<{
    data: string; // Formato DD/MM
    dataCompleta: string; // ISO
    volumeTotal: number;
    cargaMaxima: number;
    seriesCompletadas: number;
    seriesPrescritas: number;
  }>;
  prAbsoluto: { valor: number; data: string };
  volumeTotalPeriodo: number;
  variacaoVolumePercent: number;
  taxaAdesao: number;
}

export interface DinamicaCargaReportData {
  aluno: { nome: string; avatarUrl?: string; email?: string };
  coach: { nome: string };
  periodo: { tipo: 'semanal' | 'mensal'; dataInicio: string; dataFim: string };
  nomeFicha: string;
  exercicios: ExercicioReportData[];
  resumoGeral: {
    volumeTotalPeriodo: number;
    sessoesPeriodo: number;
    taxaAdesaoMedia: number;
    exercicioComMaiorEvolucao: string;
    evolucaoDestaquePercent: number;
  };
}

export async function getDinamicaCargaReport(
  alunoId: string,
  tipoPeriodo: 'semanal' | 'mensal'
): Promise<DinamicaCargaReportData> {
  const agora = new Date();
  const daysOffset = tipoPeriodo === 'semanal' ? 7 : 30;
  const dataInicio = new Date();
  dataInicio.setDate(agora.getDate() - daysOffset);
  dataInicio.setHours(0, 0, 0, 0);

  // 1. Buscar perfil do aluno
  const { data: alunoProfile, error: alunoErr } = await supabaseClient
    .from('profiles')
    .select('full_name, coaching_reference, email, avatar_url, coach_id')
    .eq('id', alunoId)
    .single();

  if (alunoErr || !alunoProfile) {
    throw new Error('Aluno não encontrado: ' + (alunoErr?.message || ''));
  }

  // 2. Buscar perfil do coach
  let coachName = 'Coach';
  if (alunoProfile.coach_id) {
    const { data: coachProfile } = await supabaseClient
      .from('profiles')
      .select('full_name')
      .eq('id', alunoProfile.coach_id)
      .single();
    if (coachProfile?.full_name) {
      coachName = coachProfile.full_name;
    }
  }

  // 3. Buscar Ficha Ativa
  const { data: activeFicha } = await supabaseClient
    .from('fichas_treino')
    .select('nome_rotina')
    .eq('aluno_id', alunoId)
    .eq('ativo', true)
    .order('criado_em', { ascending: false })
    .limit(1)
    .maybeSingle();

  const nomeFicha = activeFicha?.nome_rotina || 'Ficha Ativa';

  // 4. Buscar histórico de treinos
  const { data: historicoRows, error: histErr } = await supabaseClient
    .from('historico_treinos')
    .select('id, data_conclusao, dados_sessao')
    .eq('aluno_id', alunoId)
    .gte('data_conclusao', dataInicio.toISOString())
    .order('data_conclusao', { ascending: true });

  if (histErr) {
    throw new Error('Erro ao buscar histórico de treinos: ' + histErr.message);
  }

  const exerciciosMap = new Map<string, ExercicioReportData>();

  // Processar histórico
  (historicoRows || []).forEach((row: any) => {
    const ds = row.dados_sessao;
    if (!ds) return;

    const nomeExercicio = ds.nome_exercicio || 'Exercício';
    const series = ds.series || [];
    const dateObj = new Date(row.data_conclusao);
    const dateFormatted = dateObj.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });

    let volumeTotal = 0;
    let cargaMaxima = 0;
    let seriesCompletadas = 0;

    series.forEach((s: any) => {
      // Garantir cast de número para string/number
      const peso = Number(s.peso_atual || s.peso || 0);
      const reps = Number(s.reps || 0);
      const completado = !!(s.completado || s.done);

      if (completado) {
        seriesCompletadas++;
        volumeTotal += peso * reps;
        if (peso > cargaMaxima) {
          cargaMaxima = peso;
        }
      }
    });

    // Se nenhuma série foi completada, não contabilizar no progresso
    if (seriesCompletadas === 0) return;

    if (!exerciciosMap.has(nomeExercicio)) {
      exerciciosMap.set(nomeExercicio, {
        nome: nomeExercicio,
        grupo_muscular: ds.grupo_muscular || 'Geral',
        sessoes: [],
        prAbsoluto: { valor: 0, data: '' },
        volumeTotalPeriodo: 0,
        variacaoVolumePercent: 0,
        taxaAdesao: 0,
      });
    }

    const exData = exerciciosMap.get(nomeExercicio)!;
    exData.sessoes.push({
      data: dateFormatted,
      dataCompleta: row.data_conclusao,
      volumeTotal,
      cargaMaxima,
      seriesCompletadas,
      seriesPrescritas: series.length || 4,
    });
  });

  // Pós-processamento dos exercícios
  let maxEvolucaoNome = 'Nenhum';
  let maxEvolucaoPct = 0;
  let totalVolumeGeral = 0;
  let sessoesGeralSet = new Set<string>();
  let totalSeriesCompletasGeral = 0;
  let totalSeriesPrescritasGeral = 0;

  exerciciosMap.forEach((ex) => {
    // Ordenar sessões por data
    ex.sessoes.sort((a, b) => new Date(a.dataCompleta).getTime() - new Date(b.dataCompleta).getTime());

    // PR absoluto
    let maxVal = 0;
    let maxData = '';
    ex.sessoes.forEach((s) => {
      if (s.cargaMaxima > maxVal) {
        maxVal = s.cargaMaxima;
        maxData = s.data;
      }
      totalVolumeGeral += s.volumeTotal;
      sessoesGeralSet.add(s.dataCompleta.slice(0, 10));
      totalSeriesCompletasGeral += s.seriesCompletadas;
      totalSeriesPrescritasGeral += s.seriesPrescritas;
    });

    ex.prAbsoluto = { valor: maxVal, data: maxData };

    // Volume total por exercício
    ex.volumeTotalPeriodo = ex.sessoes.reduce((acc, cur) => acc + cur.volumeTotal, 0);

    // Variação de volume
    if (ex.sessoes.length >= 2) {
      const volPrimeiro = ex.sessoes[0].volumeTotal;
      const volUltimo = ex.sessoes[ex.sessoes.length - 1].volumeTotal;
      ex.variacaoVolumePercent = volPrimeiro > 0 ? Math.round(((volUltimo - volPrimeiro) / volPrimeiro) * 100) : 0;
    } else {
      ex.variacaoVolumePercent = 0;
    }

    // Adesão do exercício
    const totalSCompletas = ex.sessoes.reduce((acc, cur) => acc + cur.seriesCompletadas, 0);
    const totalSPrescritas = ex.sessoes.reduce((acc, cur) => acc + cur.seriesPrescritas, 0);
    ex.taxaAdesao = totalSPrescritas > 0 ? Math.round((totalSCompletas / totalSPrescritas) * 100) : 100;

    // Achar o exercício com maior evolução de carga (baseado em PR ou variação de volume)
    if (ex.sessoes.length >= 2) {
      const prPrimeiro = ex.sessoes[0].cargaMaxima;
      const prUltimo = ex.sessoes[ex.sessoes.length - 1].cargaMaxima;
      const variacaoCarga = prPrimeiro > 0 ? ((prUltimo - prPrimeiro) / prPrimeiro) * 100 : 0;
      if (variacaoCarga > maxEvolucaoPct) {
        maxEvolucaoPct = Math.round(variacaoCarga);
        maxEvolucaoNome = ex.nome;
      }
    }
  });

  const exercicios = Array.from(exerciciosMap.values());

  const avatarUrl = alunoProfile.avatar_url
    ? (getPublicStorageUrl('avatars', alunoProfile.avatar_url) || undefined)
    : undefined;

  return {
    aluno: {
      nome: alunoProfile.coaching_reference || alunoProfile.full_name || 'Aluno',
      avatarUrl,
      email: alunoProfile.email || undefined,
    },
    coach: {
      nome: coachName,
    },
    periodo: {
      tipo: tipoPeriodo,
      dataInicio: dataInicio.toLocaleDateString('pt-BR'),
      dataFim: agora.toLocaleDateString('pt-BR'),
    },
    nomeFicha,
    exercicios,
    resumoGeral: {
      volumeTotalPeriodo: totalVolumeGeral,
      sessoesPeriodo: sessoesGeralSet.size,
      taxaAdesaoMedia: totalSeriesPrescritasGeral > 0
        ? Math.round((totalSeriesCompletasGeral / totalSeriesPrescritasGeral) * 100)
        : 100,
      exercicioComMaiorEvolucao: maxEvolucaoNome,
      evolucaoDestaquePercent: maxEvolucaoPct,
    },
  };
}
