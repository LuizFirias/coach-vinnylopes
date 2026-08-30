import { supabaseClient } from '@/lib/supabaseClient';
import { toBrazilDateString } from '@/lib/dateUtils';

export type HistoricoPeriodo = '3m' | '1a' | 'all';
export type HistoricoMetrica = 'volume' | 'reps' | 'duracao';

export interface HistoricoPonto {
  data: string;
  volume: number;
  reps: number;
  duracao: number;
}

const DIAS_MAP: Record<Exclude<HistoricoPeriodo, 'all'>, number> = {
  '3m': 90,
  '1a': 365,
};

type SerieSessao = {
  completado?: boolean;
  reps?: number | string;
  peso_atual?: number;
};

type DadosSessao = {
  series?: SerieSessao[];
  data_sessao?: string;
  duracao_segundos?: number;
  duracao?: number;
};

function seriesVolume(series: SerieSessao[]): number {
  return series.reduce((acc, s) => {
    if (!s.completado) return acc;
    const reps = parseFloat(String(s.reps)) || 0;
    const peso = Number(s.peso_atual) || 0;
    return acc + reps * peso;
  }, 0);
}

function seriesReps(series: SerieSessao[]): number {
  return series.reduce((acc, s) => {
    if (!s.completado) return acc;
    return acc + (parseFloat(String(s.reps)) || 0);
  }, 0);
}

function sessionDurationSecs(sessao: DadosSessao | null | undefined): number {
  if (!sessao) return 0;
  const raw = sessao.duracao_segundos ?? sessao.duracao;
  const n = Number(raw);
  return Number.isFinite(n) && n > 0 ? Math.round(n) : 0;
}

/** Volume / reps / duração agregados por dia para uma ficha. */
export async function getVolumeByFicha(
  fichaId: string,
  alunoId: string,
  periodo: HistoricoPeriodo,
): Promise<HistoricoPonto[]> {
  let query = supabaseClient
    .from('historico_treinos')
    .select('data_conclusao, dados_sessao')
    .eq('ficha_id', fichaId)
    .eq('aluno_id', alunoId)
    .order('data_conclusao', { ascending: true });

  if (periodo !== 'all') {
    const desde = new Date();
    desde.setDate(desde.getDate() - DIAS_MAP[periodo]);
    query = query.gte('data_conclusao', desde.toISOString());
  }

  const { data, error } = await query;

  if (error || !data) return [];

  type Acc = {
    volume: number;
    reps: number;
    /** duração por data_sessao (evita somar N vezes o mesmo treino) */
    duracaoPorSessao: Map<string, number>;
  };

  const porData = new Map<string, Acc>();

  for (const row of data) {
    // Fuso de Brasília — evita treino tarde da noite "vazar" pro dia seguinte
    const dia = row.data_conclusao ? toBrazilDateString(row.data_conclusao) : '';
    if (!dia) continue;

    const sessao = row.dados_sessao as DadosSessao | null;
    const series = sessao?.series || [];
    const sessaoKey = sessao?.data_sessao || row.data_conclusao || dia;

    let acc = porData.get(dia);
    if (!acc) {
      acc = { volume: 0, reps: 0, duracaoPorSessao: new Map() };
      porData.set(dia, acc);
    }

    acc.volume += seriesVolume(series);
    acc.reps += seriesReps(series);

    const dur = sessionDurationSecs(sessao);
    if (dur > 0) {
      const prev = acc.duracaoPorSessao.get(sessaoKey) || 0;
      if (dur > prev) acc.duracaoPorSessao.set(sessaoKey, dur);
    }
  }

  return [...porData.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([dataKey, acc]) => ({
      data: dataKey,
      volume: Math.round(acc.volume),
      reps: Math.round(acc.reps),
      duracao: [...acc.duracaoPorSessao.values()].reduce((s, v) => s + v, 0),
    }));
}
