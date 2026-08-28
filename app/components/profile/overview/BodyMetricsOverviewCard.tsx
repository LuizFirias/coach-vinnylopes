'use client';

import { useEffect, useMemo, useState } from 'react';
import { LineChart, Line, ResponsiveContainer, XAxis, YAxis, Tooltip } from 'recharts';
import { Moon, ChartLineUp } from '@phosphor-icons/react';
import { supabaseClient } from '@/lib/supabaseClient';
import { Select } from '@/components/ui/Select';
import { OverviewPanel } from './OverviewPanel';

const MINI_CHART_H = 96;

/** Casca comum dos 4 quadrantes do 2×2 — cabeçalho cinza mais fino, corpo compacto. */
function MiniPanel({
  title,
  value,
  action,
  children,
}: {
  title: string;
  value?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-border-subtle bg-surface-1 overflow-hidden flex flex-col">
      <div className="flex items-center justify-between gap-2 px-3 py-2 bg-surface-2/50 border-b border-border-subtle">
        <p className="text-[10px] font-bold uppercase tracking-wide text-text-secondary truncate">{title}</p>
        {action}
      </div>
      <div className="px-3 pt-2 pb-3 flex-1 flex flex-col">
        {value && (
          <p className="text-lg font-black text-text-primary tabular-nums lining-nums leading-none mb-1">
            {value}
          </p>
        )}
        {children}
      </div>
    </div>
  );
}

// ── Peso (linha) ────────────────────────────────────────────────────────────
function WeightMiniChart({ medidas }: { medidas: { data_medicao: string; peso: number | null }[] }) {
  const data = useMemo(
    () =>
      medidas
        .filter((m) => m.peso != null)
        .slice(0, 12)
        .reverse()
        .map((m) => ({ data: m.data_medicao, peso: m.peso as number })),
    [medidas],
  );
  const ultimo = data[data.length - 1]?.peso;

  return (
    <MiniPanel title="Weight" value={ultimo != null ? `${ultimo.toLocaleString('pt-BR')} kg` : undefined}>
      {data.length >= 2 ? (
        <div style={{ height: MINI_CHART_H }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 4, right: 4, left: -28, bottom: 0 }}>
              <XAxis dataKey="data" hide />
              <YAxis domain={['dataMin - 1', 'dataMax + 1']} hide />
              <Tooltip
                formatter={(v: number) => [`${v} kg`, 'Peso']}
                labelFormatter={(l) => new Date(l).toLocaleDateString('pt-BR')}
                contentStyle={{ fontSize: 11, borderRadius: 8 }}
              />
              <Line type="monotone" dataKey="peso" stroke="#9333ea" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <p className="text-[11px] text-text-tertiary py-6 text-center">Poucas medições ainda.</p>
      )}
    </MiniPanel>
  );
}

// ── Sono (placeholder — sem fonte de dado ainda) ────────────────────────────
function SleepMiniCard() {
  return (
    <MiniPanel title="Sleep">
      <div className="flex flex-1 flex-col items-center justify-center gap-1.5 py-4 text-center">
        <Moon size={18} className="text-text-disabled" />
        <p className="text-[11px] text-text-tertiary">Nenhum registro ainda</p>
      </div>
    </MiniPanel>
  );
}

// ── Volume por exercício (mais executados primeiro, com seletor) ───────────
interface HistoricoRow {
  data_conclusao?: string | null;
  dados_sessao?: {
    nome_exercicio?: string;
    series?: { completado?: boolean; peso_atual?: number; reps?: number }[];
  } | null;
}

function VolumeByExerciseMiniCard({ historicoTreinos }: { historicoTreinos: HistoricoRow[] }) {
  const porExercicio = useMemo(() => {
    const map = new Map<string, { volume: number; sessoes: number }>();
    for (const h of historicoTreinos) {
      const nome = h.dados_sessao?.nome_exercicio;
      if (!nome) continue;
      const series = (h.dados_sessao?.series || []).filter((s) => s.completado);
      const volume = series.reduce((acc, s) => acc + (Number(s.peso_atual) || 0) * (Number(s.reps) || 0), 0);
      const cur = map.get(nome) || { volume: 0, sessoes: 0 };
      cur.volume += volume;
      cur.sessoes += 1;
      map.set(nome, cur);
    }
    return Array.from(map.entries())
      .map(([nome, v]) => ({ nome, ...v }))
      .sort((a, b) => b.sessoes - a.sessoes);
  }, [historicoTreinos]);

  const [selecionado, setSelecionado] = useState('');
  const atual = porExercicio.find((e) => e.nome === selecionado) ?? porExercicio[0];

  useEffect(() => {
    if (!selecionado && porExercicio[0]) setSelecionado(porExercicio[0].nome);
  }, [porExercicio, selecionado]);

  return (
    <MiniPanel
      title="Volume"
      value={atual ? `${(atual.volume / 1000).toLocaleString('pt-BR', { maximumFractionDigits: 1 })}k kg` : undefined}
    >
      {porExercicio.length > 0 ? (
        <>
          <Select
            value={selecionado}
            onChange={setSelecionado}
            options={porExercicio.map((e) => ({ value: e.nome, label: e.nome }))}
            size="sm"
            className="mb-1"
          />
          <p className="text-[10px] text-text-tertiary mt-1">
            {atual?.sessoes} sessão{atual?.sessoes === 1 ? '' : 'ões'} registrada{atual?.sessoes === 1 ? '' : 's'}
          </p>
        </>
      ) : (
        <div className="flex flex-1 flex-col items-center justify-center gap-1.5 py-4 text-center">
          <ChartLineUp size={18} className="text-text-disabled" />
          <p className="text-[11px] text-text-tertiary">Sem treinos registrados</p>
        </div>
      )}
    </MiniPanel>
  );
}

// ── Cardio (horas, 7/14/30 dias) ────────────────────────────────────────────
type CardioPeriodo = 7 | 14 | 30;

function CardioHoursMiniCard({ alunoId }: { alunoId: string }) {
  const [periodo, setPeriodo] = useState<CardioPeriodo>(7);
  const [sessoes, setSessoes] = useState<{ data: string; duracao_min: number }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      setLoading(true);
      const desde = new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);
      const { data, error } = await supabaseClient
        .from('cardio_sessoes')
        .select('data, duracao_min')
        .eq('aluno_id', alunoId)
        .gte('data', desde)
        .order('data', { ascending: true });
      if (!cancelled) {
        if (!error) setSessoes((data || []) as { data: string; duracao_min: number }[]);
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [alunoId]);

  const { chartData, totalHoras } = useMemo(() => {
    const corte = Date.now() - periodo * 86400000;
    const porDia = new Map<string, number>();
    let totalMin = 0;
    for (const s of sessoes) {
      if (new Date(s.data).getTime() < corte) continue;
      const dia = s.data.slice(5, 10);
      porDia.set(dia, (porDia.get(dia) || 0) + (s.duracao_min || 0));
      totalMin += s.duracao_min || 0;
    }
    const data = Array.from(porDia.entries()).map(([dia, min]) => ({ dia, min }));
    return { chartData: data, totalHoras: totalMin / 60 };
  }, [sessoes, periodo]);

  return (
    <MiniPanel
      title="Cardio"
      value={`${totalHoras.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}h`}
      action={
        <div className="flex gap-1">
          {([7, 14, 30] as CardioPeriodo[]).map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setPeriodo(p)}
              className={`text-[9px] font-bold px-1.5 py-0.5 rounded border-0 ${
                periodo === p ? 'bg-brand text-white' : 'bg-transparent text-text-tertiary hover:text-text-primary'
              }`}
            >
              {p}d
            </button>
          ))}
        </div>
      }
    >
      {loading ? (
        <p className="text-[11px] text-text-tertiary py-6 text-center">Carregando…</p>
      ) : chartData.length > 0 ? (
        <div className="flex items-end gap-1" style={{ height: MINI_CHART_H }}>
          {chartData.map((d) => (
            <div key={d.dia} className="flex-1 flex flex-col items-center justify-end gap-1 min-w-0">
              <div
                className="w-full rounded-t bg-brand/70"
                style={{ height: `${Math.max(6, (d.min / 60) * 40)}px` }}
                title={`${d.min} min`}
              />
              <span className="text-[8px] text-text-tertiary truncate w-full text-center">{d.dia}</span>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-[11px] text-text-tertiary py-6 text-center">Sem cardio registrado.</p>
      )}
    </MiniPanel>
  );
}

// ── Wrapper ──────────────────────────────────────────────────────────────────
interface BodyMetricsOverviewCardProps {
  alunoId: string;
  medidas: { data_medicao: string; peso: number | null }[];
  historicoTreinos: HistoricoRow[];
  onUpdateAll: () => void;
}

export function BodyMetricsOverviewCard({
  alunoId,
  medidas,
  historicoTreinos,
  onUpdateAll,
}: BodyMetricsOverviewCardProps) {
  return (
    <OverviewPanel
      title="Body Metrics Overview"
      action={
        <button
          type="button"
          onClick={onUpdateAll}
          className="text-[11px] font-semibold text-brand hover:text-brand-hover bg-transparent border-0"
        >
          Update all
        </button>
      }
      bodyClassName="grid grid-cols-2 gap-3"
    >
      <WeightMiniChart medidas={medidas} />
      <SleepMiniCard />
      <VolumeByExerciseMiniCard historicoTreinos={historicoTreinos} />
      <CardioHoursMiniCard alunoId={alunoId} />
    </OverviewPanel>
  );
}
