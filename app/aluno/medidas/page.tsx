'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabaseClient } from '@/lib/supabaseClient';
import { getSafeSession } from '@/lib/authErrorHandler';
import {
  ResponsiveContainer, ComposedChart, Line, Area, Scatter, XAxis, YAxis, Tooltip, CartesianGrid
} from 'recharts';
import { ArrowLeft, Plus, Ruler, FloppyDisk, CircleNotch, ChartBar, Trash } from '@phosphor-icons/react';
import Link from 'next/link';
import { OutlierWarningDialog } from '@/components/medidas/OutlierWarningDialog';
import { cn } from '@/lib/utils/cn';
import DumbbellLoader from '@/app/components/DumbbellLoader';

// ─── Tipos ────────────────────────────────────────────────────────────────────

interface Medicao {
  id: string;
  aluno_id: string;
  data_medicao: string;
  peso: number | null;
  gordura_corporal: number | null;
  peitoral: number | null;
  cintura: number | null;
  braco_esquerdo: number | null;
  braco_direito: number | null;
  coxa_esquerda: number | null;
  coxa_direita: number | null;
  panturrilha_direita: number | null;
  panturrilha_esquerda: number | null;
}

type Janela = '7d' | '30d' | '90d' | '1a';

interface FormFields {
  peso: string;
  gordura_corporal: string;
  peitoral: string;
  cintura: string;
  braco_esq: string;
  braco_dir: string;
  coxa_esq: string;
  coxa_dir: string;
  panturrilha: string;
}

interface OutlierPending {
  campo: string;
  campoKey: keyof FormFields;
  novoValor: number;
  ultimoValor: number;
  unidade: string;
  onConfirmar: () => void;
}

// ─── Constantes & Helpers ─────────────────────────────────────────────────────

const METRICAS = [
  { id: 'peso' as const, label: 'Peso', unit: 'kg', key: 'peso' as keyof Medicao },
  { id: 'gordura_corporal' as const, label: '% Gordura', unit: '%', key: 'gordura_corporal' as keyof Medicao },
  { id: 'cintura' as const, label: 'Cintura', unit: 'cm', key: 'cintura' as keyof Medicao },
  { id: 'peitoral' as const, label: 'Tórax', unit: 'cm', key: 'peitoral' as keyof Medicao },
  { id: 'braco_esquerdo' as const, label: 'Braço E', unit: 'cm', key: 'braco_esquerdo' as keyof Medicao },
  { id: 'braco_direito' as const, label: 'Braço D', unit: 'cm', key: 'braco_direito' as keyof Medicao },
  { id: 'coxa_esquerda' as const, label: 'Coxa E', unit: 'cm', key: 'coxa_esquerda' as keyof Medicao },
  { id: 'coxa_direita' as const, label: 'Coxa D', unit: 'cm', key: 'coxa_direita' as keyof Medicao },
  { id: 'panturrilha_direita' as const, label: 'Panturrilha', unit: 'cm', key: 'panturrilha_direita' as keyof Medicao },
] as const;

const HARD_LIMITS: Record<keyof FormFields, number> = {
  peso: 300,
  gordura_corporal: 100,
  peitoral: 200,
  cintura: 200,
  braco_esq: 80,
  braco_dir: 80,
  coxa_esq: 100,
  coxa_dir: 100,
  panturrilha: 70,
};

function outOfRange(key: keyof FormFields, val: number): boolean {
  const max = HARD_LIMITS[key];
  return val > max || val <= 0;
}

// Retorna se o valor foge em mais de 25% do último registro
function isOutlier(val: number, last: number | null): boolean {
  if (!last || last === 0) return false;
  return Math.abs(val - last) / last > 0.25;
}

function fmtData(d: string, janela: Janela): string {
  const date = new Date(d);
  if (janela === '7d' || janela === '30d') {
    return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
  }
  return date.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' });
}

function delta(current: number | null, prev: number | null): { val: string; dir: 'up' | 'down' | 'eq' } | null {
  if (current === null || prev === null) return null;
  const diff = current - prev;
  if (Math.abs(diff) < 0.05) return { val: '=', dir: 'eq' };
  return { val: (diff > 0 ? '+' : '') + diff.toFixed(1), dir: diff > 0 ? 'up' : 'down' };
}

function filterByJanela(medicoes: Medicao[], janela: Janela): Medicao[] {
  const now = Date.now();
  const days = { '7d': 7, '30d': 30, '90d': 90, '1a': 365 }[janela];
  const ms = days * 86400000;
  return medicoes.filter(m => now - new Date(m.data_medicao).getTime() <= ms);
}

function calcularMediaMovel(data: { label: string; valor: number }[], k = 7): number[] {
  const valores = data.map(d => d.valor);
  const result: number[] = [];
  for (let i = 0; i < valores.length; i++) {
    const start = Math.max(0, i - k + 1);
    const subset = valores.slice(start, i + 1);
    const sum = subset.reduce((a, b) => a + b, 0);
    result.push(sum / subset.length);
  }
  return result;
}

function mapMetricaToFormKey(m: string): keyof FormFields {
  if (m === 'gordura_corporal') return 'gordura_corporal';
  if (m === 'braco_esquerdo') return 'braco_esq';
  if (m === 'braco_direito') return 'braco_dir';
  if (m === 'coxa_esquerda') return 'coxa_esq';
  if (m === 'coxa_direita') return 'coxa_dir';
  if (m === 'panturrilha_direita') return 'panturrilha';
  return m as keyof FormFields;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: any[];
  label?: string;
  unit: string;
}

const CustomTooltip = ({ active, payload, label, unit }: CustomTooltipProps) => {
  if (active && payload && payload.length) {
    const rawVal = payload.find(p => p.name === 'valorRaw')?.value;
    const trendVal = payload.find(p => p.name === 'valorTrend')?.value;
    
    return (
      <div className="bg-surface-2 border border-border-subtle rounded-md p-2 shadow-elev-2 text-2xs font-sans">
        <p className="text-text-tertiary font-mono mb-1">{label}</p>
        {rawVal !== undefined && (
          <p className="text-text-primary">
            Medido: <span className="font-semibold font-mono text-text-primary">{Number(rawVal).toFixed(1)} {unit}</span>
          </p>
        )}
        {trendVal !== undefined && (
          <p className="text-brand">
            Tendência: <span className="font-semibold font-mono text-brand">{Number(trendVal).toFixed(1)} {unit}</span>
          </p>
        )}
      </div>
    );
  }
  return null;
};

// ─── Componente principal ─────────────────────────────────────────────────────

export default function MedidasPage() {
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [medicoes, setMedicoes] = useState<Medicao[]>([]);

  const [janela, setJanela] = useState<Janela>('30d');
  const [metricaSelecionada, setMetricaSelecionada] = useState<'peso' | 'gordura_corporal' | 'cintura' | 'peitoral' | 'braco_esquerdo' | 'braco_direito' | 'coxa_esquerda' | 'coxa_direita' | 'panturrilha_direita'>('peso');
  
  const [showDetalhamento, setShowDetalhamento] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [dataRegistro, setDataRegistro] = useState(new Date().toISOString().slice(0, 10));

  const [form, setForm] = useState<FormFields>({
    peso: '',
    gordura_corporal: '',
    peitoral: '',
    cintura: '',
    braco_esq: '',
    braco_dir: '',
    coxa_esq: '',
    coxa_dir: '',
    panturrilha: '',
  });

  const [fieldErrors, setFieldErrors] = useState<Partial<Record<keyof FormFields, string>>>({});
  const [outlierPending, setOutlierPending] = useState<OutlierPending | null>(null);

  // ── Carregar Dados ─────────────────────────────────────────────────────────

  const fetchData = useCallback(async () => {
    const session = await getSafeSession();
    const user = session?.user;
    if (!user) { setLoading(false); return; }
    setUserId(user.id);

    const { data } = await supabaseClient
      .from('medidas_aluno')
      .select('*')
      .eq('aluno_id', user.id)
      .order('data_medicao', { ascending: false });

    setMedicoes(data || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // ── Helpers de Form ────────────────────────────────────────────────────────

  const getLastVal = (key: keyof FormFields): number | null => {
    if (medicoes.length === 0) return null;
    const m = medicoes[0];
    const map: Record<keyof FormFields, number | null> = {
      peso: m.peso,
      gordura_corporal: m.gordura_corporal,
      peitoral: m.peitoral,
      cintura: m.cintura,
      braco_esq: m.braco_esquerdo,
      braco_dir: m.braco_direito,
      coxa_esq: m.coxa_esquerda,
      coxa_dir: m.coxa_direita,
      panturrilha: m.panturrilha_direita,
    };
    return map[key];
  };

  const getLastValForInput = (key: keyof FormFields): string => {
    const val = getLastVal(key);
    return val !== null && val !== undefined ? String(val) : '';
  };

  const handleFieldChange = (key: keyof FormFields, val: string) => {
    setForm(f => ({ ...f, [key]: val }));
    if (!val) {
      setFieldErrors(e => { const n = { ...e }; delete n[key]; return n; });
      return;
    }
    const num = parseFloat(val);
    if (isNaN(num) || outOfRange(key, num)) {
      const max = HARD_LIMITS[key];
      setFieldErrors(e => ({ ...e, [key]: `máx. ${max}` }));
    } else {
      setFieldErrors(e => { const n = { ...e }; delete n[key]; return n; });
    }
  };

  // ── Submit ──────────────────────────────────────────────────────────────────

  const buildPayload = (dateVal: string) => {
    const p = (k: keyof FormFields) => form[k] ? parseFloat(form[k]) : null;
    return {
      aluno_id: userId!,
      data_medicao: dateVal ? new Date(dateVal + 'T12:00:00').toISOString() : new Date().toISOString(),
      peso: p('peso'),
      gordura_corporal: p('gordura_corporal'),
      peitoral: p('peitoral'),
      cintura: p('cintura'),
      braco_esquerdo: p('braco_esq'),
      braco_direito: p('braco_dir'),
      coxa_esquerda: p('coxa_esq'),
      coxa_direita: p('coxa_dir'),
      panturrilha_direita: p('panturrilha'),
      panturrilha_esquerda: p('panturrilha'),
    };
  };

  const doSave = async () => {
    setSubmitting(true);
    try {
      const payload = buildPayload(dataRegistro);
      const { error } = await supabaseClient.from('medidas_aluno').insert(payload);
      if (error) throw error;
      
      setForm({
        peso: '', gordura_corporal: '', peitoral: '', cintura: '',
        braco_esq: '', braco_dir: '', coxa_esq: '', coxa_dir: '', panturrilha: ''
      });
      
      await fetchData();
      setSuccessMsg('Medidas salvas!');
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err: any) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (Object.keys(fieldErrors).length > 0) return;

    // Verificar se há pelo menos um campo preenchido
    const hasValues = Object.values(form).some(val => val !== '');
    if (!hasValues) return;

    // Checar outliers nos campos preenchidos
    const keys = Object.keys(form) as (keyof FormFields)[];
    for (const key of keys) {
      if (!form[key]) continue;
      const val = parseFloat(form[key]);
      const last = getLastVal(key);
      if (last !== null && isOutlier(val, last)) {
        const unidade = key === 'peso' ? 'kg' : key === 'gordura_corporal' ? '%' : 'cm';
        const nomes: Record<keyof FormFields, string> = {
          peso: 'Peso', gordura_corporal: 'Gordura corporal', peitoral: 'Tórax', cintura: 'Cintura',
          braco_esq: 'Braço esq', braco_dir: 'Braço dir',
          coxa_esq: 'Coxa esq', coxa_dir: 'Coxa dir', panturrilha: 'Panturrilha',
        };
        setOutlierPending({
          campo: nomes[key],
          campoKey: key,
          novoValor: val,
          ultimoValor: last,
          unidade,
          onConfirmar: () => { setOutlierPending(null); doSave(); },
        });
        return;
      }
    }
    doSave();
  };

  const handleDeleteMedida = async (id: string) => {
    if (!confirm('Deseja realmente excluir este registro de medida?')) return;
    try {
      const { error } = await supabaseClient
        .from('medidas_aluno')
        .delete()
        .eq('id', id);
      if (error) throw error;
      await fetchData();
    } catch (err) {
      console.error('Erro ao excluir medida:', err);
    }
  };

  // ── Derivações do Gráfico & Estatísticas ────────────────────────────────────

  const metricaObj = METRICAS.find(m => m.id === metricaSelecionada) || METRICAS[0];
  const metricaKey = metricaObj.key;
  const metricaKeyForm = mapMetricaToFormKey(metricaObj.id);

  // Ordenar cronologicamente para o gráfico
  const medicoesCronologico = [...medicoes].reverse();
  const medicoesJanela = filterByJanela(medicoesCronologico, janela);

  const rawChartData = medicoesJanela
    .map(m => {
      const val = m[metricaKey];
      return {
        label: fmtData(m.data_medicao, janela),
        dataRaw: m.data_medicao,
        valor: val !== null && val !== undefined ? Number(val) : null
      };
    })
    .filter((d): d is { label: string; dataRaw: string; valor: number } => d.valor !== null);

  const svals = calcularMediaMovel(rawChartData, 7);
  const chartData = rawChartData.map((d, index) => ({
    label: d.label,
    dataRaw: d.dataRaw,
    valorRaw: d.valor,
    valorTrend: svals[index],
  }));

  // Estatísticas do topo
  const todosValores = medicoes
    .map(m => ({ data: m.data_medicao, valor: m[metricaKey] }))
    .filter((v): v is { data: string; valor: number } => v.valor !== null && v.valor !== undefined);

  const valorAtual = todosValores[0]?.valor ?? null;
  const valorAnterior = todosValores[1]?.valor ?? null;
  const deltaAnterior = valorAtual !== null && valorAnterior !== null ? valorAtual - valorAnterior : null;

  let delta30Dias = null;
  if (todosValores[0]) {
    const dataAtualMs = new Date(todosValores[0].data).getTime();
    const data30DiasMs = dataAtualMs - 30 * 86400000;
    let closestObj = null;
    let minDiff = Infinity;
    for (let i = 1; i < todosValores.length; i++) {
      const diff = Math.abs(new Date(todosValores[i].data).getTime() - data30DiasMs);
      if (diff < minDiff) {
        minDiff = diff;
        closestObj = todosValores[i];
      }
    }
    if (closestObj) {
      delta30Dias = todosValores[0].valor - closestObj.valor;
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-surface-0 flex items-center justify-center">
        <DumbbellLoader text="Carregando medidas..." />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface-0 p-4 md:p-6 lg:p-10 lg:pl-28 pb-24 text-text-primary">
      <div className="max-w-2xl mx-auto flex flex-col gap-5">

        {/* ── Header ── */}
        <div>
          <Link href="/aluno/dashboard" className="inline-flex items-center gap-1.5 text-brand text-xs font-semibold mb-4 hover:opacity-80 transition-opacity">
            <ArrowLeft className="w-3.5 h-3.5" /> Dashboard
          </Link>
          <h1 className="text-2xl font-bold text-text-primary tracking-tight">Medidas</h1>
          <p className="text-xs text-text-tertiary mt-0.5">Sua evolução em números</p>
        </div>

        {successMsg && (
          <div className="flex items-center gap-2 p-3 bg-success/10 border border-success/20 rounded-lg text-sm text-success font-medium animate-pop-spring">
            {successMsg}
          </div>
        )}

        {/* ── Toggle de métricas (Segmented Control Horizontal) ── */}
        <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1 border-b border-border-subtle">
          {METRICAS.map(m => (
            <button
              key={m.id}
              onClick={() => setMetricaSelecionada(m.id)}
              className={cn(
                'px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap border transition-all duration-150 cursor-pointer font-sans',
                metricaSelecionada === m.id
                  ? 'bg-brand text-text-primary border-brand shadow-sm'
                  : 'bg-surface-2 text-text-secondary border-border-subtle hover:border-border-default'
              )}
            >
              {m.label}
            </button>
          ))}
        </div>

        {/* ── Bloco do Gráfico de Tendência ── */}
        <div className="bg-surface-1 border border-border-subtle shadow-elev-1 rounded-xl p-4 md:p-5">
          {/* Bloco de estatísticas acima do gráfico */}
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-4">
            <div>
              <p className="text-2xs font-semibold text-text-tertiary mb-1">
                {metricaObj.label} Atual
              </p>
              {valorAtual !== null ? (
                <div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-bold text-text-primary font-mono tracking-tight">
                      {valorAtual.toFixed(1)}
                    </span>
                    <span className="text-xs text-text-tertiary font-mono">{metricaObj.unit}</span>
                  </div>
                  <p className="text-[11px] text-text-tertiary mt-1 font-mono">
                    Atualizado em {new Date(todosValores[0].data).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}
                  </p>
                </div>
              ) : (
                <p className="text-sm text-text-tertiary font-mono">Sem registros</p>
              )}
            </div>

            <div className="flex gap-3">
              {/* Delta vs anterior */}
              {deltaAnterior !== null && (
                <div className="bg-surface-2 border border-border-subtle rounded-lg px-3 py-1.5 flex flex-col justify-center min-w-[100px] transition-all duration-200">
                  <span className="text-[10px] text-text-tertiary font-semibold">vs. Anterior</span>
                  <span className="text-xs font-semibold text-text-secondary font-mono flex items-center mt-0.5">
                    {deltaAnterior > 0 ? (
                      <svg className="w-3.5 h-3.5 text-text-secondary mr-1 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 6.75L12 3m0 0l3.75 3.75M12 3v18" />
                      </svg>
                    ) : deltaAnterior < 0 ? (
                      <svg className="w-3.5 h-3.5 text-text-secondary mr-1 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 17.25L12 21m0 0l-3.75-3.75M12 21V3" />
                      </svg>
                    ) : (
                      <svg className="w-3 h-3 text-text-secondary mr-1 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 12h-15" />
                      </svg>
                    )}
                    {deltaAnterior > 0 ? '+' : ''}{deltaAnterior.toFixed(1)}
                  </span>
                </div>
              )}

              {/* Delta vs 30 dias */}
              {delta30Dias !== null && (
                <div className="bg-surface-2 border border-border-subtle rounded-lg px-3 py-1.5 flex flex-col justify-center min-w-[100px] transition-all duration-200">
                  <span className="text-[10px] text-text-tertiary font-semibold">vs. 30d atrás</span>
                  <span className="text-xs font-semibold text-text-secondary font-mono flex items-center mt-0.5">
                    {delta30Dias > 0 ? (
                      <svg className="w-3.5 h-3.5 text-text-secondary mr-1 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 6.75L12 3m0 0l3.75 3.75M12 3v18" />
                      </svg>
                    ) : delta30Dias < 0 ? (
                      <svg className="w-3.5 h-3.5 text-text-secondary mr-1 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 17.25L12 21m0 0l-3.75-3.75M12 21V3" />
                      </svg>
                    ) : (
                      <svg className="w-3 h-3 text-text-secondary mr-1 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 12h-15" />
                      </svg>
                    )}
                    {delta30Dias > 0 ? '+' : ''}{delta30Dias.toFixed(1)}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Janela selector */}
          <div className="flex justify-end gap-1.5 mb-3">
            {(['7d', '30d', '90d', '1a'] as Janela[]).map(j => (
              <button
                key={j}
                onClick={() => setJanela(j)}
                className={cn(
                  'px-2.5 py-1 text-2xs rounded-md font-semibold transition-all duration-150 cursor-pointer border font-mono',
                  janela === j
                    ? 'bg-brand border-brand text-text-primary shadow-sm'
                    : 'bg-surface-2 border-border-subtle text-text-tertiary hover:text-text-secondary hover:border-border-default'
                )}
              >
                {j}
              </button>
            ))}
          </div>

          {/* Gráfico */}
          {chartData.length >= 2 ? (
            <ResponsiveContainer width="100%" height={150}>
              <ComposedChart data={chartData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                <defs>
                  <linearGradient id="trendGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--color-brand)" stopOpacity={0.08} />
                    <stop offset="95%" stopColor="var(--color-brand)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="var(--color-border-subtle)" strokeDasharray="3 3" vertical={false} />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 10, fill: 'var(--color-text-tertiary)' }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  domain={[
                    (dataMin: number) => Math.floor(dataMin - 1),
                    (dataMax: number) => Math.ceil(dataMax + 1),
                  ]}
                  tickCount={4}
                  tick={{ fontSize: 10, fill: 'var(--color-text-secondary)', fontFamily: 'var(--font-mono)' }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip content={<CustomTooltip unit={metricaObj.unit} />} />
                <Area
                  name="valorTrendArea"
                  type="monotone"
                  dataKey="valorTrend"
                  stroke="none"
                  fill="url(#trendGrad)"
                />
                <Line
                  name="valorTrend"
                  type="monotone"
                  dataKey="valorTrend"
                  stroke="var(--color-brand)"
                  strokeWidth={2}
                  dot={false}
                />
                <Scatter
                  name="valorRaw"
                  dataKey="valorRaw"
                  fill="var(--color-text-tertiary)"
                  opacity={0.5}
                  r={3}
                />
              </ComposedChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex flex-col items-center justify-center gap-3 py-8 text-center bg-surface-2 border border-border-subtle rounded-lg">
              <ChartBar className="w-8 h-8 text-text-tertiary" />
              <p className="text-xs text-text-secondary max-w-sm px-4">
                Registre pelo menos 2 medidas de {metricaObj.label.toLowerCase()} para visualizar o gráfico de tendência.
              </p>
            </div>
          )}
        </div>

        {/* ── Card de Registro Rápido (Fase 3) ── */}
        <div className="bg-surface-1 border border-border-subtle rounded-xl p-4 md:p-5">
          <h3 className="text-xs font-semibold text-text-secondary mb-3">
            Registrar {metricaObj.label}
          </h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="relative flex-1">
                <input
                  type="number"
                  step="0.1"
                  inputMode="decimal"
                  placeholder={getLastValForInput(metricaKeyForm) || '0.0'}
                  value={form[metricaKeyForm]}
                  onChange={e => handleFieldChange(metricaKeyForm, e.target.value)}
                  className={cn(
                    'w-full bg-surface-2 border rounded-lg px-3 py-2.5 text-lg font-mono text-text-primary placeholder:text-text-disabled focus:outline-none pr-12 transition-all duration-200 focus:border-brand focus:ring-2 focus:ring-brand/20',
                    fieldErrors[metricaKeyForm] ? 'border-danger focus:border-danger' : 'border-border-subtle'
                  )}
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-text-tertiary font-mono">{metricaObj.unit}</span>
              </div>
              <button
                type="submit"
                disabled={submitting || !form[metricaKeyForm] || !!fieldErrors[metricaKeyForm]}
                className="h-[46px] px-4 rounded-lg bg-brand hover:bg-brand-hover text-text-primary flex items-center justify-center disabled:opacity-40 transition-colors cursor-pointer"
                title="Salvar registro"
              >
                {submitting ? <CircleNotch className="w-5 h-5 animate-spin" /> : <Plus className="w-5 h-5" />}
              </button>
            </div>
            
            {fieldErrors[metricaKeyForm] && (
              <p className="text-xs text-danger mt-1 font-mono">{fieldErrors[metricaKeyForm]}</p>
            )}

            {/* Accordion trigger & datepicker */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-t border-border-subtle/50 pt-3">
              <button
                type="button"
                onClick={() => setShowDetalhamento(!showDetalhamento)}
                className="w-full sm:w-auto px-4 py-2 text-xs font-semibold text-text-secondary bg-transparent border border-border-default rounded-lg hover:border-brand hover:text-text-primary flex items-center justify-center gap-1.5 transition-all duration-200 cursor-pointer self-start"
              >
                {showDetalhamento ? 'Ocultar outros campos' : 'Adicionar mais detalhes'}
                <svg
                  className={cn("w-4 h-4 transition-transform duration-200", showDetalhamento && "rotate-180")}
                  viewBox="0 0 16 16"
                  fill="none"
                >
                  <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                </svg>
              </button>
              
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-text-tertiary font-semibold">Data:</span>
                <input
                  type="date"
                  value={dataRegistro}
                  onChange={e => setDataRegistro(e.target.value)}
                  className="bg-surface-2 border border-border-subtle rounded-md px-2.5 py-1 text-xs text-text-primary focus:outline-none focus:border-brand font-mono transition-all duration-200 focus:ring-2 focus:ring-brand/20"
                />
              </div>
            </div>

            {/* Accordion expanded content */}
            {showDetalhamento && (
              <div className="mt-4 pt-4 border-t border-border-subtle/50 space-y-4">
                <p className="text-[11px] text-text-tertiary font-semibold">Preencher outras medidas</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {METRICAS.map(m => {
                    // Ignora a métrica atualmente selecionada no input principal
                    if (m.id === metricaSelecionada) return null;
                    const mKeyForm = mapMetricaToFormKey(m.id);
                    return (
                      <div key={m.id} className="flex items-center gap-3">
                        <label className="w-20 text-xs text-text-secondary flex-shrink-0 truncate">{m.label}</label>
                        <div className="relative flex-1">
                          <input
                            type="number"
                            step="0.1"
                            inputMode="decimal"
                            placeholder={getLastValForInput(mKeyForm) || '--'}
                            value={form[mKeyForm]}
                            onChange={e => handleFieldChange(mKeyForm, e.target.value)}
                            className={cn(
                              'w-full bg-surface-2 border rounded-md px-2.5 py-1.5 text-xs font-mono text-text-primary placeholder:text-text-disabled focus:outline-none pr-8 transition-all duration-200 focus:border-brand focus:ring-2 focus:ring-brand/20',
                              fieldErrors[mKeyForm] ? 'border-danger focus:border-danger' : 'border-border-subtle'
                            )}
                          />
                          <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-text-tertiary font-mono">{m.unit}</span>
                        </div>
                        {fieldErrors[mKeyForm] && (
                          <span className="text-[10px] text-danger font-mono">{fieldErrors[mKeyForm]}</span>
                        )}
                      </div>
                    );
                  })}
                </div>
                
                <button
                  type="submit"
                  disabled={submitting || Object.keys(fieldErrors).length > 0}
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg bg-brand hover:bg-brand-hover text-text-primary text-xs font-semibold disabled:opacity-40 transition-colors cursor-pointer"
                >
                  {submitting ? <CircleNotch className="w-4 h-4 animate-spin" /> : <FloppyDisk className="w-4 h-4" />}
                  Salvar todas as medidas
                </button>
              </div>
            )}
          </form>
        </div>

        {/* ── Histórico de Medições ── */}
        {medicoes.length > 0 && (
          <section>
            <h2 className="text-xs font-semibold text-text-tertiary mb-3">
              Histórico de Medições
            </h2>
            <div className="flex flex-col gap-2.5">
              {medicoes.map(m => (
                <div key={m.id} className="bg-surface-1 border border-border-subtle rounded-xl p-3 flex flex-col gap-2.5 shadow-elev-1">
                  <div className="flex items-center justify-between border-b border-border-subtle/50 pb-2">
                    <span className="text-xs font-semibold text-text-secondary font-mono">
                      {new Date(m.data_medicao).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleDeleteMedida(m.id)}
                      className="text-text-tertiary hover:text-danger p-1 rounded transition-colors cursor-pointer border-none bg-transparent"
                      title="Excluir medição"
                    >
                      <Trash className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 text-[10px] font-mono">
                    {m.peso !== null && m.peso !== undefined && (
                      <div className="bg-surface-2 border border-border-subtle/40 rounded p-1.5">
                        <span className="text-text-tertiary block text-[9px] font-semibold">Peso</span>
                        <span className="text-text-primary font-semibold block mt-0.5">{m.peso.toFixed(1)} kg</span>
                      </div>
                    )}
                    {m.gordura_corporal !== null && m.gordura_corporal !== undefined && (
                      <div className="bg-surface-2 border border-border-subtle/40 rounded p-1.5">
                        <span className="text-text-tertiary block text-[9px] font-semibold">% Gord.</span>
                        <span className="text-text-primary font-semibold block mt-0.5">{m.gordura_corporal.toFixed(1)}%</span>
                      </div>
                    )}
                    {m.cintura !== null && m.cintura !== undefined && (
                      <div className="bg-surface-2 border border-border-subtle/40 rounded p-1.5">
                        <span className="text-text-tertiary block text-[9px] font-semibold">Cintura</span>
                        <span className="text-text-primary font-semibold block mt-0.5">{m.cintura.toFixed(1)} cm</span>
                      </div>
                    )}
                    {m.peitoral !== null && m.peitoral !== undefined && (
                      <div className="bg-surface-2 border border-border-subtle/40 rounded p-1.5">
                        <span className="text-text-tertiary block text-[9px] font-semibold">Tórax</span>
                        <span className="text-text-primary font-semibold block mt-0.5">{m.peitoral.toFixed(1)} cm</span>
                      </div>
                    )}
                    {m.braco_esquerdo !== null && m.braco_esquerdo !== undefined && (
                      <div className="bg-surface-2 border border-border-subtle/40 rounded p-1.5">
                        <span className="text-text-tertiary block text-[9px] font-semibold">Braço E</span>
                        <span className="text-text-primary font-semibold block mt-0.5">{m.braco_esquerdo.toFixed(1)} cm</span>
                      </div>
                    )}
                    {m.braco_direito !== null && m.braco_direito !== undefined && (
                      <div className="bg-surface-2 border border-border-subtle/40 rounded p-1.5">
                        <span className="text-text-tertiary block text-[9px] font-semibold">Braço D</span>
                        <span className="text-text-primary font-semibold block mt-0.5">{m.braco_direito.toFixed(1)} cm</span>
                      </div>
                    )}
                    {m.coxa_esquerda !== null && m.coxa_esquerda !== undefined && (
                      <div className="bg-surface-2 border border-border-subtle/40 rounded p-1.5">
                        <span className="text-text-tertiary block text-[9px] font-semibold">Coxa E</span>
                        <span className="text-text-primary font-semibold block mt-0.5">{m.coxa_esquerda.toFixed(1)} cm</span>
                      </div>
                    )}
                    {m.coxa_direita !== null && m.coxa_direita !== undefined && (
                      <div className="bg-surface-2 border border-border-subtle/40 rounded p-1.5">
                        <span className="text-text-tertiary block text-[9px] font-semibold">Coxa D</span>
                        <span className="text-text-primary font-semibold block mt-0.5">{m.coxa_direita.toFixed(1)} cm</span>
                      </div>
                    )}
                    {m.panturrilha_direita !== null && m.panturrilha_direita !== undefined && (
                      <div className="bg-surface-2 border border-border-subtle/40 rounded p-1.5">
                        <span className="text-text-tertiary block text-[9px] font-semibold">Pant. D</span>
                        <span className="text-text-primary font-semibold block mt-0.5">{m.panturrilha_direita.toFixed(1)} cm</span>
                      </div>
                    )}
                    {m.panturrilha_esquerda !== null && m.panturrilha_esquerda !== undefined && (
                      <div className="bg-surface-2 border border-border-subtle/40 rounded p-1.5">
                        <span className="text-text-tertiary block text-[9px] font-semibold">Pant. E</span>
                        <span className="text-text-primary font-semibold block mt-0.5">{m.panturrilha_esquerda.toFixed(1)} cm</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ── Empty state geral ── */}
        {medicoes.length === 0 && (
          <div className="flex flex-col items-center py-10 gap-3 text-center bg-surface-1 border border-border-subtle rounded-xl shadow-elev-1">
            <div className="w-14 h-14 rounded-xl bg-surface-2 border border-border-subtle flex items-center justify-center text-text-tertiary">
              <Ruler className="w-6 h-6" />
            </div>
            <p className="text-sm font-semibold text-text-primary">Nenhuma medida registrada</p>
            <p className="text-xs text-text-tertiary max-w-xs px-4">
              Preencha o formulário acima para registrar sua primeira medição e começar a acompanhar sua evolução.
            </p>
          </div>
        )}

      </div>

      {/* Outlier warning dialog */}
      {outlierPending && (
        <OutlierWarningDialog
          campo={outlierPending.campo}
          novoValor={outlierPending.novoValor}
          ultimoValor={outlierPending.ultimoValor}
          unidade={outlierPending.unidade}
          onConfirmar={outlierPending.onConfirmar}
          onEditar={() => setOutlierPending(null)}
        />
      )}
    </div>
  );
}
