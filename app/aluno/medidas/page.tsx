'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { supabaseClient } from '@/lib/supabaseClient';
import { getSafeSession } from '@/lib/authErrorHandler';
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip,
} from 'recharts';
import { ArrowLeft, Plus, TrendUp, TrendDown, Minus, Ruler, FloppyDisk, CircleNotch, Barbell, ChartBar } from '@phosphor-icons/react';
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

// ─── Helpers ─────────────────────────────────────────────────────────────────

const HARD_LIMITS: Record<string, number> = {
  peso: 300,
  peitoral: 200,
  cintura: 200,
  braco_esq: 80,
  braco_dir: 80,
  coxa_esq: 100,
  coxa_dir: 100,
  panturrilha: 70,
};

function outOfRange(key: string, val: number): boolean {
  const max = HARD_LIMITS[key] ?? 9999;
  return val > max;
}

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

function fmtDataLonga(d: string): string {
  return new Date(d).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });
}

function delta(current: number | null, prev: number | null): { val: string; dir: 'up' | 'down' | 'eq' } | null {
  if (current === null || prev === null) return null;
  const diff = current - prev;
  if (Math.abs(diff) < 0.05) return { val: '=', dir: 'eq' };
  return { val: (diff > 0 ? '+' : '') + diff.toFixed(1), dir: diff > 0 ? 'up' : 'down' };
}

function filterByJanela(medicoes: Medicao[], janela: Janela): Medicao[] {
  const now = Date.now();
  const ms = { '7d': 7, '30d': 30, '90d': 90, '1a': 365 }[janela] * 86400000;
  return medicoes.filter(m => now - new Date(m.data_medicao).getTime() <= ms);
}

// ─── Componente principal ─────────────────────────────────────────────────────

export default function MedidasPage() {
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [medicoes, setMedicoes] = useState<Medicao[]>([]);

  const [janela, setJanela] = useState<Janela>('30d');
  const [metricaSelecionada, setMetricaSelecionada] = useState<'peso' | 'volume' | 'duracao' | 'reps'>('peso');
  const [historicoTreinos, setHistoricoTreinos] = useState<any[]>([]);
  const [formOpen, setFormOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const [form, setForm] = useState<FormFields>({
    peso: '', peitoral: '', cintura: '',
    braco_esq: '', braco_dir: '',
    coxa_esq: '', coxa_dir: '',
    panturrilha: '',
  });

  const [fieldErrors, setFieldErrors] = useState<Partial<Record<keyof FormFields, string>>>({});
  const [outlierPending, setOutlierPending] = useState<OutlierPending | null>(null);

  // ── Carregar ────────────────────────────────────────────────────────────────

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

    // Buscar últimos treinos usando view v_historico_validos (já tem RLS)
    try {
      const { data: historico } = await supabaseClient
        .from('v_historico_validos')
        .select('data_conclusao, dados_sessao')
        .eq('aluno_id', user.id)
        .order('data_conclusao', { ascending: false })
        .limit(20);

      // Agrupar por data_conclusao (cada treino completo)
      const treinosAgrupados: any[] = [];
      const datasProcessadas = new Set<string>();

      for (const h of (historico || [])) {
        const dataKey = new Date(h.data_conclusao!).toISOString().slice(0, 19);
        if (datasProcessadas.has(dataKey)) continue;
        datasProcessadas.add(dataKey);

        const sessoesMesmoDia = (historico || []).filter(
          x => new Date(x.data_conclusao!).toISOString().slice(0, 19) === dataKey
        );

        const volumeTotal = sessoesMesmoDia.reduce((acc, s) => {
          const series = (s.dados_sessao as any)?.series || [];
          const vol = series.reduce((vAcc: number, serie: any) => {
            const peso = parseFloat(serie.peso_atual || 0);
            const reps = parseInt(serie.reps || 0);
            return vAcc + (peso * reps);
          }, 0);
          return acc + vol;
        }, 0);

        const nomeRotina = (sessoesMesmoDia[0]?.dados_sessao as any)?.nome_rotina || 'Treino';

        treinosAgrupados.push({
          id: dataKey,
          nome_rotina: nomeRotina,
          data_conclusao: h.data_conclusao,
          volume_kg: volumeTotal,
        });
      }

      setHistoricoTreinos(treinosAgrupados.slice(0, 10));
    } catch (err) {
      console.error('[Medidas] Erro ao buscar histórico de treinos:', err);
      setHistoricoTreinos([]);
    }

    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Pré-preencher form com última medida quando abre
  useEffect(() => {
    if (!formOpen || medicoes.length === 0) return;
    const last = medicoes[0];
    setForm({
      peso:       last.peso?.toString() ?? '',
      peitoral:   last.peitoral?.toString() ?? '',
      cintura:    last.cintura?.toString() ?? '',
      braco_esq:  last.braco_esquerdo?.toString() ?? '',
      braco_dir:  last.braco_direito?.toString() ?? '',
      coxa_esq:   last.coxa_esquerda?.toString() ?? '',
      coxa_dir:   last.coxa_direita?.toString() ?? '',
      panturrilha: last.panturrilha_direita?.toString() ?? '',
    });
  }, [formOpen]);

  // ── Validação ───────────────────────────────────────────────────────────────

  const getLastVal = (key: keyof FormFields): number | null => {
    if (medicoes.length === 0) return null;
    const m = medicoes[0];
    const map: Record<keyof FormFields, number | null> = {
      peso: m.peso,
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

  const handleFieldChange = (key: keyof FormFields, val: string) => {
    setForm(f => ({ ...f, [key]: val }));
    if (!val) {
      setFieldErrors(e => { const n = { ...e }; delete n[key]; return n; });
      return;
    }
    const num = parseFloat(val);
    if (isNaN(num) || outOfRange(key, num)) {
      const max = HARD_LIMITS[key];
      setFieldErrors(e => ({ ...e, [key]: `máx. ${max} ${key === 'peso' ? 'kg' : 'cm'}` }));
    } else {
      setFieldErrors(e => { const n = { ...e }; delete n[key]; return n; });
    }
  };

  // ── Submit ──────────────────────────────────────────────────────────────────

  const buildPayload = () => {
    const p = (k: string) => form[k as keyof FormFields] ? parseFloat(form[k as keyof FormFields]) : null;
    return {
      aluno_id: userId!,
      data_medicao: new Date().toISOString(),
      peso: p('peso'),
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
      const { error } = await supabaseClient.from('medidas_aluno').insert(buildPayload());
      if (error) throw error;
      await fetchData();
      setFormOpen(false);
      setSuccessMsg('Medidas salvas!');
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err: any) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (Object.keys(fieldErrors).length > 0) return;

    // Checar outliers nos campos preenchidos
    const keys = Object.keys(form) as (keyof FormFields)[];
    for (const key of keys) {
      if (!form[key]) continue;
      const val = parseFloat(form[key]);
      const last = getLastVal(key);
      if (last !== null && isOutlier(val, last)) {
        const unidade = key === 'peso' ? 'kg' : 'cm';
        const nomes: Record<keyof FormFields, string> = {
          peso: 'Peso', peitoral: 'Tórax', cintura: 'Cintura',
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

  // ── Derivações ───────────────────────────────────────────────────────────────

  const ultima = medicoes[0] ?? null;
  const penultima = medicoes[1] ?? null;

  const medicoesJanela = filterByJanela([...medicoes].reverse(), janela);
  const chartData = medicoesJanela
    .filter(m => m.peso !== null)
    .map(m => ({ label: fmtData(m.data_medicao, janela), peso: m.peso }));

  if (loading) {
    return (
      <div className="min-h-screen bg-surface-0 flex items-center justify-center">
        <DumbbellLoader text="Carregando medidas..." />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface-0 p-4 md:p-6 lg:p-10 lg:pl-28 pb-24">
      <div className="max-w-2xl mx-auto flex flex-col gap-6">

        {/* ── Header ── */}
        <div>
          <Link href="/aluno/dashboard" className="inline-flex items-center gap-1.5 text-brand text-2xs uppercase tracking-caps mb-4">
            <ArrowLeft className="w-3 h-3" /> Dashboard
          </Link>
          <h1 className="text-2xl font-bold text-text-primary tracking-tight">Medidas</h1>
          <p className="text-xs text-text-tertiary mt-0.5">Sua evolução em números</p>
        </div>

        {successMsg && (
          <div className="flex items-center gap-2 p-3 bg-success/10 border border-success/20 rounded-xl text-sm text-success font-medium">
            {successMsg}
          </div>
        )}

        {/* ── Toggle de métricas ── */}
        <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
          {[
            { id: 'peso' as const, label: 'Peso', disponivel: true },
            { id: 'volume' as const, label: 'Volume', disponivel: false },
            { id: 'duracao' as const, label: 'Duração', disponivel: false },
            { id: 'reps' as const, label: 'Reps', disponivel: false },
          ].map(m => (
            <button
              key={m.id}
              onClick={() => m.disponivel && setMetricaSelecionada(m.id)}
              disabled={!m.disponivel}
              className={cn(
                'px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-colors',
                metricaSelecionada === m.id
                  ? 'bg-brand text-text-on-brand'
                  : m.disponivel
                  ? 'bg-surface-2 text-text-secondary border border-border-subtle hover:border-border-default'
                  : 'bg-surface-2 text-text-disabled border border-border-subtle opacity-50 cursor-not-allowed'
              )}
            >
              {m.label} {!m.disponivel && '·'}
            </button>
          ))}
        </div>

        {/* ── Gráfico de peso ── */}
        {medicoes.length > 0 && (
          <div className="bg-surface-1 border border-border-subtle shadow-elev-1 rounded-2xl p-4">
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-2xs font-semibold text-text-tertiary uppercase tracking-caps mb-1">Peso</p>
                {ultima?.peso && (
                  <p className="text-xl font-bold text-text-primary mt-0.5">
                    {ultima.peso} kg
                    {delta(ultima.peso, penultima?.peso ?? null) && (() => {
                      const d = delta(ultima.peso, penultima?.peso ?? null)!;
                      return (
                        <span className={cn('ml-2 text-sm font-medium', d.dir === 'down' ? 'text-success' : d.dir === 'up' ? 'text-danger' : 'text-text-tertiary')}>
                          {d.val} kg
                        </span>
                      );
                    })()}
                  </p>
                )}
              </div>
              <div className="flex gap-1">
                {(['7d', '30d', '90d', '1a'] as Janela[]).map(j => (
                  <button
                    key={j}
                    onClick={() => setJanela(j)}
                    className={cn(
                      'px-2.5 py-1 text-2xs rounded-lg font-semibold transition-colors',
                      janela === j ? 'bg-brand text-text-on-brand' : 'bg-surface-3 text-text-tertiary hover:text-text-secondary'
                    )}
                  >
                    {j}
                  </button>
                ))}
              </div>
            </div>
            {chartData.length >= 3 ? (
              <ResponsiveContainer width="100%" height={120}>
                <AreaChart data={chartData} margin={{ top: 4, right: 4, left: -28, bottom: 0 }}>
                  <defs>
                    <linearGradient id="pesoGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--color-brand)" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="var(--color-brand)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="label" tick={{ fontSize: 10, fill: 'var(--color-text-tertiary)' }} axisLine={false} tickLine={false} />
                  <YAxis
                    domain={[
                      (dataMin: number) => Math.floor(dataMin - 1),
                      (dataMax: number) => Math.ceil(dataMax + 1),
                    ]}
                    tickCount={4}
                    tick={{ fontSize: 10, fill: 'var(--color-text-tertiary)' }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    contentStyle={{ background: 'var(--color-surface-2)', border: '1px solid var(--color-border-subtle)', borderRadius: 8, fontSize: 12 }}
                    labelStyle={{ color: 'var(--color-text-secondary)' }}
                    itemStyle={{ color: 'var(--color-brand)' }}
                  />
                  <Area type="monotone" dataKey="peso" stroke="var(--color-brand)" strokeWidth={2} fill="url(#pesoGrad)" dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex flex-col items-center justify-center gap-3 py-8 text-center">
                <ChartBar className="w-8 h-8 text-text-tertiary" />
                <p className="text-sm text-text-secondary">
                  Registre pelo menos 3 medidas para ver seu gráfico de evolução.
                </p>
                {medicoes.length > 0 && (
                  <p className="text-xs text-text-tertiary">
                    Você tem {medicoes.length} {medicoes.length === 1 ? 'registro' : 'registros'}.
                  </p>
                )}
              </div>
            )}
          </div>
        )}

        {/* ── Tabela última medida com delta ── */}
        {ultima && (
          <div className="bg-surface-2 border border-border-subtle rounded-2xl overflow-hidden">
            <div className="px-4 py-2.5 bg-surface-3 border-b border-border-subtle flex items-center justify-between">
              <span className="text-2xs font-semibold uppercase tracking-caps text-text-tertiary">
                Última medida · {fmtDataLonga(ultima.data_medicao)}
              </span>
            </div>
            <div className="divide-y divide-border-subtle/50">
              {[
                { label: 'Peso', val: ultima.peso, prev: penultima?.peso, unit: 'kg' },
                { label: 'Tórax', val: ultima.peitoral, prev: penultima?.peitoral, unit: 'cm' },
                { label: 'Cintura', val: ultima.cintura, prev: penultima?.cintura, unit: 'cm' },
                { label: 'Braço E', val: ultima.braco_esquerdo, prev: penultima?.braco_esquerdo, unit: 'cm' },
                { label: 'Braço D', val: ultima.braco_direito, prev: penultima?.braco_direito, unit: 'cm' },
                { label: 'Coxa E', val: ultima.coxa_esquerda, prev: penultima?.coxa_esquerda, unit: 'cm' },
                { label: 'Coxa D', val: ultima.coxa_direita, prev: penultima?.coxa_direita, unit: 'cm' },
                { label: 'Panturrilha', val: ultima.panturrilha_direita, prev: penultima?.panturrilha_direita, unit: 'cm' },
              ].filter(r => r.val !== null).map(row => {
                const d = delta(row.val!, row.prev ?? null);
                return (
                  <div key={row.label} className="flex items-center px-4 py-2.5 gap-2">
                    <span className="flex-1 text-sm text-text-secondary">{row.label}</span>
                    <span className="text-sm font-semibold text-text-primary">{row.val} {row.unit}</span>
                    {d && (
                      <span className={cn(
                        'flex items-center gap-0.5 text-xs font-medium w-16 justify-end',
                        d.dir === 'down' ? 'text-success' : d.dir === 'up' ? 'text-danger' : 'text-text-tertiary'
                      )}>
                        {d.dir === 'up' && <TrendUp className="w-3 h-3" />}
                        {d.dir === 'down' && <TrendDown className="w-3 h-3" />}
                        {d.dir === 'eq' && <Minus className="w-3 h-3" />}
                        {d.val} {row.unit}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── Botão abrir formulário / formulário ── */}
        {!formOpen ? (
          <button
            onClick={() => setFormOpen(true)}
            className="flex items-center justify-center gap-2 w-full py-3 rounded-2xl bg-brand text-text-on-brand text-sm font-semibold shadow-sm shadow-brand/30 hover:opacity-90 transition-opacity"
          >
            <Plus className="w-4 h-4" /> Registrar nova medida
          </button>
        ) : (
          <div className="bg-surface-1 border border-border-subtle shadow-elev-1 rounded-2xl overflow-hidden">
            <div className="px-4 py-2.5 bg-surface-2 border-b border-border-subtle flex items-center justify-between">
              <span className="text-2xs font-semibold uppercase tracking-caps text-text-tertiary">Nova medida</span>
              <button onClick={() => setFormOpen(false)} className="text-xs text-text-tertiary hover:text-text-secondary">Cancelar</button>
            </div>
            <form onSubmit={handleSubmit} className="p-4 space-y-4">
              <p className="text-xs text-text-tertiary">Todos os campos são opcionais. Salve apenas o que mudou.</p>

              {(
                [
                  { key: 'peso' as keyof FormFields, label: 'Peso', unit: 'kg', placeholder: '82.0' },
                  { key: 'peitoral' as keyof FormFields, label: 'Tórax', unit: 'cm', placeholder: '100' },
                  { key: 'cintura' as keyof FormFields, label: 'Cintura', unit: 'cm', placeholder: '84' },
                  { key: 'braco_esq' as keyof FormFields, label: 'Braço esq', unit: 'cm', placeholder: '36' },
                  { key: 'braco_dir' as keyof FormFields, label: 'Braço dir', unit: 'cm', placeholder: '36' },
                  { key: 'coxa_esq' as keyof FormFields, label: 'Coxa esq', unit: 'cm', placeholder: '58' },
                  { key: 'coxa_dir' as keyof FormFields, label: 'Coxa dir', unit: 'cm', placeholder: '58' },
                  { key: 'panturrilha' as keyof FormFields, label: 'Panturrilha', unit: 'cm', placeholder: '38' },
                ] as const
              ).map(({ key, label, unit, placeholder }) => (
                <div key={key} className="flex items-center gap-3">
                  <label className="w-28 text-sm text-text-secondary flex-shrink-0">{label}</label>
                  <div className="relative flex-1">
                    <input
                      type="number"
                      step="0.1"
                      inputMode="decimal"
                      placeholder={placeholder}
                      value={form[key]}
                      onChange={e => handleFieldChange(key, e.target.value)}
                      className={cn(
                        'w-full bg-surface-3 border rounded-xl px-3 py-2.5 text-sm text-text-primary placeholder:text-text-disabled focus:outline-none pr-10',
                        fieldErrors[key] ? 'border-danger focus:border-danger' : 'border-border-subtle focus:border-brand'
                      )}
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-text-tertiary">{unit}</span>
                  </div>
                  {fieldErrors[key] && (
                    <span className="text-2xs text-danger whitespace-nowrap">{fieldErrors[key]}</span>
                  )}
                </div>
              ))}

              <button
                type="submit"
                disabled={submitting || Object.keys(fieldErrors).length > 0}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-brand text-text-on-brand text-sm font-semibold disabled:opacity-40 shadow-sm shadow-brand/30 transition-opacity"
              >
                {submitting ? <CircleNotch className="w-4 h-4 animate-spin" /> : <FloppyDisk className="w-4 h-4" />}
                Salvar medidas
              </button>
            </form>
          </div>
        )}

        {/* ── Feed de últimos treinos ── */}
        {historicoTreinos.length > 0 && (
          <section>
            <h2 className="text-2xs font-semibold uppercase tracking-caps text-text-tertiary mb-3">Últimos treinos</h2>
            <div className="flex flex-col gap-2">
              {historicoTreinos.map(h => (
                <div key={h.id} className="bg-surface-1 border border-border-subtle rounded-2xl p-3 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-surface-3 flex items-center justify-center text-brand flex-shrink-0">
                    <Barbell className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-text-primary truncate">{h.nome_rotina}</p>
                    <p className="text-2xs text-text-tertiary">
                      {new Date(h.data_conclusao).toLocaleDateString('pt-BR')}
                      {h.volume_kg > 0 && <> · {(h.volume_kg / 1000).toFixed(1)}t</>}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ── Empty state ── */}
        {medicoes.length === 0 && !formOpen && (
          <div className="flex flex-col items-center py-16 gap-3 text-center">
            <div className="w-14 h-14 rounded-2xl bg-surface-2 border border-border-subtle flex items-center justify-center text-text-tertiary">
              <Ruler className="w-6 h-6" />
            </div>
            <p className="text-sm font-semibold text-text-primary">Nenhuma medida ainda</p>
            <p className="text-xs text-text-tertiary max-w-xs">Registre sua primeira medição para começar a acompanhar sua evolução.</p>
          </div>
        )}

      </div>

      {/* Outlier warning */}
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

      {/* FAB - Nova medida */}
      {!formOpen && (
        <button
          onClick={() => setFormOpen(true)}
          className="fixed bottom-24 right-4 w-14 h-14 bg-brand rounded-full shadow-elev-3 flex items-center justify-center text-text-on-brand z-30 active:scale-95 transition-transform"
          aria-label="Registrar nova medida"
        >
          <Plus className="w-6 h-6" />
        </button>
      )}
    </div>
  );
}
