'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { supabaseClient } from '@/lib/supabaseClient';
import { cn } from '@/lib/utils/cn';
import { FilePdf, ChartBar, Barbell, Clock, CalendarBlank, CaretDown, CaretLeft, CaretRight, Lightning, Repeat, Trophy } from '@phosphor-icons/react';
import { PeriodSelect } from '@/app/components/ui/PeriodSelect';
import { selectListboxClassName, selectOptionClassName } from '@/components/ui/Select';
import { exercicioMostraPeso } from '@/app/components/workout-builder/exerciseColumns';
import { CANONICAL_MUSCLE_GROUPS } from '@/lib/constants/muscle-groups';
import { formatRestTime } from '@/lib/utils/restTime';
import { toBrazilDateString } from '@/lib/dateUtils';
import { createKeyedCache } from '@/lib/utils/keyedCache';

// ─── Types ───────────────────────────────────────────────────────────────────

type PeriodPreset = 'this_month' | 'last_month' | '3m' | '6m' | 'custom';

interface ExercicioInfo {
  id: string;
  nome: string;
  grupo_muscular: string;
}

interface SerieSessao {
  completado?: boolean;
  reps?: number | string;
  peso_atual?: number;
}

interface DadosSessao {
  series?: SerieSessao[];
  data_sessao?: string;
  nome_rotina?: string;
  nome_exercicio?: string;
  duracao_segundos?: number;
  duracao?: number;
  tipo_exercicio?: string;
}

interface HistoricoRow {
  id: string;
  data_conclusao: string;
  dados_sessao: DadosSessao | null;
  exercicio_id: string | null;
}

export interface WorkoutLoadReportProps {
  alunoId: string;
  profileName: string;
}

type LoadReportData = { rows: HistoricoRow[]; exerciciosMap: Map<string, ExercicioInfo> };

// Evita recarregar (e mostrar loading de novo) toda vez que o relatório
// remonta ao trocar de aba e voltar pra Treinos.
const loadReportCache = createKeyedCache<LoadReportData>(60_000);

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getPeriodRange(
  preset: PeriodPreset,
  customStart: string,
  customEnd: string,
): { start: string; end: string } {
  const now = new Date();

  if (preset === 'this_month') {
    const y = now.getFullYear(), m = now.getMonth();
    return {
      start: new Date(y, m, 1).toISOString().slice(0, 10),
      end: new Date(y, m + 1, 0).toISOString().slice(0, 10),
    };
  }
  if (preset === 'last_month') {
    const d = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const y = d.getFullYear(), m = d.getMonth();
    return {
      start: new Date(y, m, 1).toISOString().slice(0, 10),
      end: new Date(y, m + 1, 0).toISOString().slice(0, 10),
    };
  }
  if (preset === '3m') {
    const from = new Date(now);
    from.setMonth(from.getMonth() - 3);
    return { start: from.toISOString().slice(0, 10), end: now.toISOString().slice(0, 10) };
  }
  if (preset === '6m') {
    const from = new Date(now);
    from.setMonth(from.getMonth() - 6);
    return { start: from.toISOString().slice(0, 10), end: now.toISOString().slice(0, 10) };
  }
  return {
    start: customStart || now.toISOString().slice(0, 10),
    end: customEnd || now.toISOString().slice(0, 10),
  };
}

function fmtVol(kg: number): string {
  if (kg >= 1000) return `${(kg / 1000).toFixed(1).replace('.', ',')} ton`;
  return `${kg.toLocaleString('pt-BR')} kg`;
}

function fmtDur(secs: number): string {
  if (secs < 60) return `${secs}s`;
  const m = Math.floor(secs / 60);
  const h = Math.floor(m / 60);
  if (h > 0) return `${h}h ${m % 60}min`;
  return `${m}min`;
}

const PRESET_OPTIONS: { value: PeriodPreset; label: string }[] = [
  { value: 'this_month', label: 'Este mês' },
  { value: 'last_month', label: 'Mês passado' },
  { value: '3m', label: 'Últimos 3 meses' },
  { value: '6m', label: 'Últimos 6 meses' },
  { value: 'custom', label: 'Personalizado' },
];

// Filtro próprio de "Músculos menos trabalhados" — sem "Personalizado" (evita duplicar o date-range picker)
const MUSCLE_PERIOD_OPTIONS = PRESET_OPTIONS.filter(o => o.value !== 'custom');

// RGB equivalents for jsPDF chart drawing
const GRUPO_COLORS_RGB: Record<string, [number, number, number]> = {
  'Quadríceps': [59, 130, 246],
  'Posterior (Isquiotibiais)': [236, 72, 153],
  'Glúteos': [249, 115, 22],
  'Dorsais': [57, 199, 90],
  'Peito Superior': [224, 85, 85],
  'Peito Médio': [224, 85, 85],
  'Peito Inferior': [224, 85, 85],
  'Ombro Anterior': [245, 158, 11],
  'Ombro Lateral': [245, 158, 11],
  'Ombro Posterior': [245, 158, 11],
  'Bíceps': [147, 51, 234],
  'Tríceps': [117, 27, 180],
  'Panturrilha': [20, 184, 166],
  'Abdômen': [6, 182, 212],
  'Oblíquos': [6, 182, 212],
  'Trapézio': [132, 204, 22],
  'Lombar': [161, 98, 7],
  'Antebraço': [120, 113, 108],
  'Cardio': [122, 138, 171],
};

const GRUPO_COLORS: Record<string, string> = {
  'Quadríceps': '#3b82f6',
  'Posterior (Isquiotibiais)': '#ec4899',
  'Glúteos': '#f97316',
  'Dorsais': '#39c75a',
  'Peito Superior': '#e05555',
  'Peito Médio': '#e05555',
  'Peito Inferior': '#e05555',
  'Ombro Anterior': '#f59e0b',
  'Ombro Lateral': '#f59e0b',
  'Ombro Posterior': '#f59e0b',
  'Bíceps': '#D4A843',
  'Tríceps': '#D4A843',
  'Panturrilha': '#14b8a6',
  'Abdômen': '#06b6d4',
  'Oblíquos': '#06b6d4',
  'Trapézio': '#84cc16',
  'Lombar': '#a16207',
  'Antebraço': '#78716c',
  'Cardio': '#7a8aab',
};

function grupoColor(g: string) {
  return GRUPO_COLORS[g] ?? '#7a8aab';
}

/**
 * Exercícios sem carga (ex.: Barra fixa = "Repetições", Prancha = "Duração") não têm o que
 * progredir em kg — a progressão passa a ser medida na métrica certa para cada tipo.
 */
function progressionMeta(tipo?: string | null): { unit: string; maxLabel: string; isTime: boolean } {
  if (exercicioMostraPeso(tipo)) return { unit: 'kg', maxLabel: 'Carga máxima', isTime: false };
  if (tipo === 'Duração' || tipo === 'Distância e Duração') {
    return { unit: 's', maxLabel: 'Tempo máximo', isTime: true };
  }
  return { unit: 'reps', maxLabel: 'Repetições máximas', isTime: false };
}

// ─── DatePickerPopover ───────────────────────────────────────────────────────

const WEEK_DAYS_SHORT = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'];

function buildCalendarCells(year: number, month: number): (Date | null)[] {
  const first = new Date(year, month, 1);
  const last = new Date(year, month + 1, 0);
  const startDow = first.getDay(); // 0=sun
  const cells: (Date | null)[] = Array(startDow).fill(null);
  for (let d = 1; d <= last.getDate(); d++) {
    cells.push(new Date(year, month, d));
  }
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

function toISO(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function fmtPtBR(iso: string): string {
  if (!iso) return '—';
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

interface DatePickerPopoverProps {
  value: string;
  onChange: (iso: string) => void;
  placeholder?: string;
  maxDate?: string;
  minDate?: string;
}

function DatePickerPopover({ value, onChange, placeholder = 'Selecionar', maxDate, minDate }: DatePickerPopoverProps) {
  const today = new Date();
  const initialDate = value ? new Date(value + 'T12:00:00') : today;
  const [open, setOpen] = useState(false);
  const [viewYear, setViewYear] = useState(initialDate.getFullYear());
  const [viewMonth, setViewMonth] = useState(initialDate.getMonth());
  const ref = useRef<HTMLDivElement>(null);

  // Sync view when value changes externally
  useEffect(() => {
    if (value) {
      const d = new Date(value + 'T12:00:00');
      setViewYear(d.getFullYear());
      setViewMonth(d.getMonth());
    }
  }, [value]);

  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  const monthLabel = new Date(viewYear, viewMonth, 1).toLocaleDateString('pt-BR', {
    month: 'long',
    year: 'numeric',
  });

  const cells = buildCalendarCells(viewYear, viewMonth);
  const todayISO = toISO(today);

  const prevMonth = () => {
    if (viewMonth === 0) { setViewYear(y => y - 1); setViewMonth(11); }
    else setViewMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (viewMonth === 11) { setViewYear(y => y + 1); setViewMonth(0); }
    else setViewMonth(m => m + 1);
  };

  const handleDay = (iso: string) => {
    if (minDate && iso < minDate) return;
    if (maxDate && iso > maxDate) return;
    onChange(iso);
    setOpen(false);
  };

  return (
    <div ref={ref} className="relative inline-flex">
      {/* Trigger */}
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-1.5 rounded-lg border border-border-input bg-transparent px-3 py-1.5 transition-colors hover:border-brand focus:outline-none focus:border-brand"
      >
        <CalendarBlank size={12} style={{ color: '#D4A843' }} />
        <span
          className="text-[12px] font-medium tabular-nums lining-nums"
          style={{ color: value ? '#D4A843' : '#7a8aab' }}
        >
          {value ? fmtPtBR(value) : placeholder}
        </span>
      </button>

      {/* Popover */}
      {open && (
        <div
          className="absolute top-full mt-2 z-50 rounded-xl border border-border-default bg-surface-1 p-3 shadow-xl"
          style={{ minWidth: 264, left: 0 }}
        >
          {/* Month nav */}
          <div className="mb-2 flex items-center justify-between">
            <span className="text-[13px] font-semibold capitalize text-text-primary">{monthLabel}</span>
            <div className="flex gap-0.5">
              <button
                type="button"
                onClick={prevMonth}
                className="flex h-7 w-7 items-center justify-center rounded-lg bg-surface-2 text-text-secondary transition-colors hover:text-text-primary"
                aria-label="Mês anterior"
              >
                <CaretLeft size={13} />
              </button>
              <button
                type="button"
                onClick={nextMonth}
                className="flex h-7 w-7 items-center justify-center rounded-lg bg-surface-2 text-text-secondary transition-colors hover:text-text-primary"
                aria-label="Próximo mês"
              >
                <CaretRight size={13} />
              </button>
            </div>
          </div>

          {/* Day headers */}
          <div className="mb-1 grid grid-cols-7 text-center">
            {WEEK_DAYS_SHORT.map(d => (
              <span key={d} className="py-0.5 text-[9px] font-semibold uppercase tracking-wider text-text-muted">
                {d}
              </span>
            ))}
          </div>

          {/* Days grid */}
          <div className="grid grid-cols-7 gap-0.5">
            {cells.map((cell, idx) => {
              if (!cell) return <div key={`e-${idx}`} className="h-8" />;
              const iso = toISO(cell);
              const isSelected = iso === value;
              const isToday = iso === todayISO;
              const disabled =
                (!!minDate && iso < minDate) || (!!maxDate && iso > maxDate);

              return (
                <button
                  key={iso}
                  type="button"
                  disabled={disabled}
                  onClick={() => handleDay(iso)}
                  className={cn(
                    'flex h-8 w-full items-center justify-center rounded-full text-[12px] font-medium transition-colors',
                    disabled && 'cursor-not-allowed opacity-25',
                    !disabled && !isSelected && !isToday &&
                      'text-text-secondary hover:bg-surface-2 hover:text-text-primary',
                    isToday && !isSelected &&
                      'border border-brand text-brand',
                    isSelected &&
                      'bg-brand font-semibold text-white',
                  )}
                >
                  {cell.getDate()}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function KpiCard({
  label,
  value,
  sub,
  color,
  icon: Icon,
}: {
  label: string;
  value: string;
  sub?: string;
  color: string;
  icon: React.ElementType;
}) {
  return (
    <div className="rounded-xl bg-surface-1 p-4 flex flex-col gap-2">
      <div className="flex items-center gap-1.5">
        <span
          className="inline-block h-1.5 w-1.5 rounded-full shrink-0"
          style={{ background: color }}
        />
        <span className="text-[10px] font-semibold uppercase tracking-widest text-text-secondary">
          {label}
        </span>
      </div>
      <div className="flex items-end gap-1.5">
        <span
          className="tabular-nums lining-nums font-black leading-none text-text-primary"
          style={{ fontSize: 26, letterSpacing: '-0.02em' }}
        >
          {value}
        </span>
      </div>
      {sub && <span className="text-[11px] text-text-secondary">{sub}</span>}
    </div>
  );
}

function HorizontalBar({
  label,
  value,
  maxValue,
  formattedValue,
  color,
}: {
  label: string;
  value: number;
  maxValue: number;
  formattedValue: string;
  color: string;
}) {
  const pct = maxValue > 0 ? Math.max(4, Math.round((value / maxValue) * 100)) : 4;
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[12px] font-medium text-text-primary truncate max-w-[60%]">{label}</span>
        <span
          className="text-[12px] font-bold tabular-nums lining-nums shrink-0"
          style={{ color }}
        >
          {formattedValue}
        </span>
      </div>
      <div
        className="h-1.5 rounded-full overflow-hidden"
        style={{ background: 'rgba(255,255,255,0.06)' }}
      >
        <div
          className="h-1.5 rounded-full transition-all duration-500"
          style={{ width: `${pct}%`, background: color }}
        />
      </div>
    </div>
  );
}

function TopExerciseBar({
  nome,
  count,
  pct,
  color,
}: {
  nome: string;
  count: number;
  pct: number;
  color: string;
}) {
  return (
    <div className="flex items-center gap-2">
      <div className="h-8 flex-1 overflow-hidden rounded-lg" style={{ background: 'rgba(255,255,255,0.06)' }}>
        <div
          className="flex h-full items-center px-3 transition-all duration-500"
          style={{ width: `${pct}%`, minWidth: '46%', background: color, borderRadius: 8 }}
        >
          <span className="truncate text-[12px] font-semibold text-white">{nome}</span>
        </div>
      </div>
      <span
        className="shrink-0 text-[12px] font-bold tabular-nums lining-nums"
        style={{ color }}
      >
        {count}×
      </span>
    </div>
  );
}

interface ExercicioFilterOption {
  id: string;
  nome: string;
}

/** Campo sem preenchimento (flat) + lista no padrão AURON — mesmo do Select. */
function ExercicioFilterDropdown({
  value,
  options,
  onChange,
}: {
  value: string;
  options: ExercicioFilterOption[];
  onChange: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const selected = options.find(o => o.id === value);
  // Lista sempre em ordem alfabética — a seleção padrão continua sendo o mais feito
  const sortedOptions = useMemo(
    () => [...options].sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR')),
    [options],
  );

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: MouseEvent | TouchEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('touchstart', onPointerDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('touchstart', onPointerDown);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="relative shrink-0">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="flex max-w-45 items-center gap-1 bg-transparent border-0 p-0 cursor-pointer touch-manipulation"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label="Selecionar exercício"
      >
        <span className="truncate text-[11px] font-semibold text-brand">
          {selected?.nome ?? 'Selecionar'}
        </span>
        <CaretDown
          size={10}
          weight="bold"
          className={cn('shrink-0 text-brand transition-transform', open && 'rotate-180')}
        />
      </button>

      {open && (
        <div role="listbox" className={cn(selectListboxClassName, 'right-0 w-52')}>
          {sortedOptions.map(opt => {
            const active = opt.id === value;
            return (
              <button
                key={opt.id}
                type="button"
                role="option"
                aria-selected={active}
                onClick={() => { onChange(opt.id); setOpen(false); }}
                className={selectOptionClassName(active)}
              >
                <span className="flex-1 min-w-0 truncate">{opt.nome}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function ProgressionChart({
  data,
  unit = 'kg',
}: {
  data: Array<{ date: string; value: number }>;
  unit?: string;
}) {
  const chartH = 100;
  const chartW = 400;
  const pad = { top: 8, bottom: 4 };

  if (data.length === 0) {
    return (
      <p className="text-center text-xs text-text-disabled py-6">
        Nenhum dado de carga para este exercício no período
      </p>
    );
  }

  if (data.length === 1) {
    return (
      <div className="flex flex-col items-center justify-center py-4 gap-1">
        <span className="text-[28px] font-black tabular-nums lining-nums" style={{ color: '#D4A843' }}>
          {data[0].value} {unit}
        </span>
        <span className="text-[11px] text-text-secondary">{data[0].date}</span>
        <span className="text-[10px] text-text-disabled mt-1">Adicione mais sessões para ver a evolução</span>
      </div>
    );
  }

  const minV = Math.min(...data.map(d => d.value));
  const maxV = Math.max(...data.map(d => d.value));
  const range = maxV - minV || 1;

  const toX = (i: number) =>
    data.length <= 1 ? chartW / 2 : (i / (data.length - 1)) * chartW;
  const toY = (v: number) =>
    pad.top + (chartH - pad.top - pad.bottom) - ((v - minV) / range) * (chartH - pad.top - pad.bottom);

  const points = data.map((d, i) => `${toX(i).toFixed(1)},${toY(d.value).toFixed(1)}`).join(' ');
  const lastPt = data[data.length - 1];

  return (
    <div className="flex flex-col gap-1">
      <svg
        width="100%"
        height={chartH}
        viewBox={`0 0 ${chartW} ${chartH}`}
        preserveAspectRatio="none"
        aria-hidden
      >
        <line x1={0} y1={chartH - 2} x2={chartW} y2={chartH - 2} stroke="rgba(255,255,255,0.05)" strokeWidth={1} />
        <polyline
          points={points}
          fill="none"
          stroke="#D4A843"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity={0.85}
        />
        {lastPt && (
          <circle
            cx={toX(data.length - 1)}
            cy={toY(lastPt.value)}
            r={3.5}
            fill="#D4A843"
          />
        )}
      </svg>
      <div className="flex justify-between mt-0.5">
        <span className="text-[8px] text-text-disabled">{data[0].date}</span>
        {data.length > 2 && (
          <span className="text-[8px] text-text-disabled">{data[Math.floor(data.length / 2)].date}</span>
        )}
        <span className="text-[8px] text-text-disabled">{lastPt.date}</span>
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function WorkoutLoadReport({ alunoId, profileName }: WorkoutLoadReportProps) {
  const cached = loadReportCache.peek(alunoId);
  const [loading, setLoading] = useState(cached === undefined);
  const [rows, setRows] = useState<HistoricoRow[]>(cached?.rows ?? []);
  const [exerciciosMap, setExerciciosMap] = useState<Map<string, ExercicioInfo>>(
    cached?.exerciciosMap ?? new Map(),
  );
  const [preset, setPreset] = useState<PeriodPreset>('this_month');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [selectedExercicio, setSelectedExercicio] = useState('');
  const [muscleFilterPreset, setMuscleFilterPreset] = useState<PeriodPreset>('this_month');
  const [exportingPdf, setExportingPdf] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const result = await loadReportCache.get(alunoId, async () => {
          const { data: histData } = await supabaseClient
            .from('historico_treinos')
            .select('id, data_conclusao, dados_sessao, exercicio_id')
            .eq('aluno_id', alunoId)
            .order('data_conclusao', { ascending: false });

          const allRows = (histData ?? []) as HistoricoRow[];

          const ids = [
            ...new Set(allRows.map(r => r.exercicio_id).filter(Boolean) as string[]),
          ];
          const map = new Map<string, ExercicioInfo>();
          if (ids.length > 0) {
            const { data: exData } = await supabaseClient
              .from('exercicios_biblioteca')
              .select('id, nome, grupo_muscular')
              .in('id', ids);
            (exData ?? []).forEach((e: ExercicioInfo) => map.set(e.id, e));
          }
          return { rows: allRows, exerciciosMap: map };
        });
        if (cancelled) return;
        setRows(result.rows);
        setExerciciosMap(result.exerciciosMap);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [alunoId]);

  const { start, end } = useMemo(
    () => getPeriodRange(preset, customStart, customEnd),
    [preset, customStart, customEnd],
  );

  const filteredRows = useMemo(
    () =>
      rows.filter(r => {
        const day = r.data_conclusao ? toBrazilDateString(r.data_conclusao) : '';
        return day >= start && day <= end;
      }),
    [rows, start, end],
  );

  // KPIs
  const kpis = useMemo(() => {
    let volume = 0;
    const sessions = new Set<string>();
    const sessionDurs = new Map<string, number>();

    for (const row of filteredRows) {
      const ds = row.dados_sessao;
      if (!ds) continue;
      const sessionKey = ds.data_sessao || row.data_conclusao?.slice(0, 16) || row.id;
      sessions.add(sessionKey);

      for (const s of ds.series ?? []) {
        if (!s.completado) continue;
        volume += (parseFloat(String(s.reps)) || 0) * (Number(s.peso_atual) || 0);
      }

      const dur = Number(ds.duracao_segundos ?? ds.duracao) || 0;
      if (dur > 0) {
        const prev = sessionDurs.get(sessionKey) || 0;
        if (dur > prev) sessionDurs.set(sessionKey, dur);
      }
    }

    let totalDurSecs = 0;
    sessionDurs.forEach(v => { totalDurSecs += v; });

    const sessCount = sessions.size;
    const avgDur = sessCount > 0 ? Math.round(totalDurSecs / sessCount) : 0;

    const startDate = new Date(start + 'T00:00:00');
    const endDate = new Date(end + 'T23:59:59');
    const daysDiff = Math.max(1, (endDate.getTime() - startDate.getTime()) / 86_400_000);
    const perWeek = Math.round((sessCount / (daysDiff / 7)) * 10) / 10;

    return { volume: Math.round(volume), sessions: sessCount, avgDur, perWeek };
  }, [filteredRows, start, end]);

  // Top exercises
  const topExercicios = useMemo(() => {
    const map = new Map<string, { nome: string; count: number; maxPeso: number; totalSeries: number }>();

    for (const row of filteredRows) {
      const exId = row.exercicio_id;
      if (!exId) continue;
      const ex = exerciciosMap.get(exId);
      const nome = ex?.nome || row.dados_sessao?.nome_exercicio || 'Desconhecido';

      const series = (row.dados_sessao?.series ?? []).filter(s => s.completado);
      const maxPeso = series.reduce((m, s) => Math.max(m, Number(s.peso_atual) || 0), 0);
      const prev = map.get(exId) ?? { nome, count: 0, maxPeso: 0, totalSeries: 0 };

      map.set(exId, {
        nome,
        count: prev.count + 1,
        maxPeso: Math.max(prev.maxPeso, maxPeso),
        totalSeries: prev.totalSeries + series.length,
      });
    }

    return [...map.entries()]
      .map(([id, v]) => ({ id, ...v }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);
  }, [filteredRows, exerciciosMap]);

  // Muscle groups
  const gruposMusculares = useMemo(() => {
    const map = new Map<string, number>();

    for (const row of filteredRows) {
      const exId = row.exercicio_id;
      if (!exId) continue;
      const ex = exerciciosMap.get(exId);
      const grupo = ex?.grupo_muscular || 'Outro';
      const series = (row.dados_sessao?.series ?? []).filter(s => s.completado).length;
      map.set(grupo, (map.get(grupo) || 0) + series);
    }

    return [...map.entries()]
      .map(([grupo, series]) => ({ grupo, series }))
      .sort((a, b) => b.series - a.series)
      .slice(0, 10);
  }, [filteredRows, exerciciosMap]);

  // Músculos menos trabalhados — período próprio, independente do filtro principal
  const muscleFilterRange = useMemo(
    () => getPeriodRange(muscleFilterPreset, '', ''),
    [muscleFilterPreset],
  );

  const muscleFilteredRows = useMemo(
    () =>
      rows.filter(r => {
        const day = r.data_conclusao ? toBrazilDateString(r.data_conclusao) : '';
        return day >= muscleFilterRange.start && day <= muscleFilterRange.end;
      }),
    [rows, muscleFilterRange],
  );

  const gruposMenosTrabalhados = useMemo(() => {
    // Começa com todos os grupos musculares disponíveis no app zerados — assim um grupo que
    // o aluno nunca treinou aparece como "menos trabalhado", não só os que já têm registro.
    const map = new Map<string, number>(CANONICAL_MUSCLE_GROUPS.map(g => [g, 0]));

    for (const row of muscleFilteredRows) {
      const exId = row.exercicio_id;
      if (!exId) continue;
      const ex = exerciciosMap.get(exId);
      const grupo = ex?.grupo_muscular || 'Outro';
      const series = (row.dados_sessao?.series ?? []).filter(s => s.completado).length;
      map.set(grupo, (map.get(grupo) || 0) + series);
    }

    return [...map.entries()]
      .map(([grupo, series]) => ({ grupo, series }))
      .sort((a, b) => a.series - b.series)
      .slice(0, 5);
  }, [muscleFilteredRows, exerciciosMap]);

  // Tipo do exercício selecionado (vem do que foi salvo na sessão; fichas antigas sem esse
  // dado assumem "Peso & Repetições", mantendo o comportamento de sempre).
  const selectedTipoExercicio = useMemo(() => {
    const row = filteredRows.find(r => r.exercicio_id === selectedExercicio && r.dados_sessao?.tipo_exercicio);
    return row?.dados_sessao?.tipo_exercicio;
  }, [filteredRows, selectedExercicio]);

  const progMeta = useMemo(() => progressionMeta(selectedTipoExercicio), [selectedTipoExercicio]);

  // Progression for selected exercise — carga (kg) para exercícios com peso,
  // repetições ou tempo para os que não têm (barra fixa, prancha, etc.)
  const progressao = useMemo(() => {
    if (!selectedExercicio) return [];

    const byDate = new Map<string, number>();
    for (const row of filteredRows) {
      if (row.exercicio_id !== selectedExercicio) continue;
      const day = row.data_conclusao ? toBrazilDateString(row.data_conclusao) : '';
      const series = (row.dados_sessao?.series ?? []).filter(s => s.completado);
      const maxVal = series.reduce((m, s) => {
        const v = progMeta.isTime || progMeta.unit === 'reps'
          ? parseFloat(String(s.reps)) || 0
          : Number(s.peso_atual) || 0;
        return Math.max(m, v);
      }, 0);
      if (maxVal > 0) byDate.set(day, Math.max(byDate.get(day) || 0, maxVal));
    }

    return [...byDate.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, value]) => ({
        date: new Date(date + 'T12:00:00').toLocaleDateString('pt-BR', {
          day: '2-digit',
          month: '2-digit',
        }),
        value,
      }));
  }, [filteredRows, selectedExercicio, progMeta]);

  // Weekly volume (for PDF chart)
  const volumeSemanal = useMemo(() => {
    const weekMap = new Map<string, { label: string; volume: number }>();

    for (const row of filteredRows) {
      const ds = row.dados_sessao;
      if (!ds) continue;
      const day = row.data_conclusao ? toBrazilDateString(row.data_conclusao) : '';
      if (!day) continue;

      const date = new Date(day + 'T12:00:00');
      const dow = date.getDay();
      const monday = new Date(date);
      monday.setDate(date.getDate() - (dow === 0 ? 6 : dow - 1));
      const weekKey = monday.toISOString().slice(0, 10);
      const weekLabel = monday.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });

      let vol = weekMap.get(weekKey)?.volume ?? 0;
      for (const s of ds.series ?? []) {
        if (!s.completado) continue;
        vol += (parseFloat(String(s.reps)) || 0) * (Number(s.peso_atual) || 0);
      }
      weekMap.set(weekKey, { label: weekLabel, volume: Math.round(vol) });
    }

    return [...weekMap.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([, v]) => v);
  }, [filteredRows]);

  // Default selected exercise
  useEffect(() => {
    if (topExercicios.length > 0 && !selectedExercicio) {
      setSelectedExercicio(topExercicios[0].id);
    }
  }, [topExercicios, selectedExercicio]);

  // PDF export
  const handleExportPdf = async () => {
    if (exportingPdf || kpis.sessions === 0) return;
    setExportingPdf(true);
    try {
      const [{ default: jsPDF }, { default: autoTable }] = await Promise.all([
        import('jspdf'),
        import('jspdf-autotable'),
      ]);

      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const L = 15, R = 195, W = 180; // margins

      const periodLabel =
        preset === 'custom'
          ? `${start} a ${end}`
          : PRESET_OPTIONS.find(o => o.value === preset)?.label ?? '';

      // ── Convert SVG logo to PNG for jsPDF ──────────────────────────────
      let logoDataUrl: string | null = null;
      try {
        const svgText = await fetch('/logo.png').then(r => r.text());
        const blob = new Blob([svgText], { type: 'image/svg+xml' });
        const blobUrl = URL.createObjectURL(blob);
        logoDataUrl = await new Promise<string>((resolve, reject) => {
          const img = new Image();
          img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = 728; canvas.height = 78; // 2× for sharpness
            const ctx = canvas.getContext('2d')!;
            ctx.drawImage(img, 0, 0, 728, 78);
            URL.revokeObjectURL(blobUrl);
            resolve(canvas.toDataURL('image/png'));
          };
          img.onerror = reject;
          img.src = blobUrl;
        });
      } catch {
        // fallback to text if logo fails to load
      }

      // ── Helpers ──────────────────────────────────────────────────────────

      const addHeader = (subtitle: string) => {
        const HEADER_H = 30;
        doc.setFillColor(147, 51, 234);
        doc.rect(0, 0, 210, HEADER_H, 'F');

        if (logoDataUrl) {
          // Logo centered — original ratio: 364×39 → 364/39 ≈ 9.33
          const logoW = 62;
          const logoH = logoW * (39 / 364);
          doc.addImage(logoDataUrl, 'PNG', (210 - logoW) / 2, (HEADER_H - logoH) / 2 - 1, logoW, logoH);
        } else {
          doc.setTextColor(255, 255, 255);
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(15);
          doc.text('COACH VINNY', 105, 13, { align: 'center' });
        }

        // Meta info: left + right, bottom of header
        doc.setTextColor(255, 255, 255);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7.5);
        doc.text('RELATÓRIO DE DINÂMICA DE CARGA', L, HEADER_H - 5);
        doc.text(`${subtitle}  ·  Emitido em: ${new Date().toLocaleDateString('pt-BR')}`, R, HEADER_H - 5, { align: 'right' });
      };

      const sectionTitle = (label: string, y: number) => {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(10);
        doc.setTextColor(31, 31, 35);
        doc.text(label, L, y);
        doc.setDrawColor(220, 220, 220);
        doc.setLineWidth(0.3);
        doc.line(L, y + 1.5, R, y + 1.5);
      };

      // ── Chart 1: Volume semanal (vertical bars) ───────────────────────────
      const drawVolumeChart = (startY: number, chartH = 38) => {
        const data = volumeSemanal;
        if (data.length === 0) return startY;

        const labelTopMm = 5;   // reserved mm above tallest bar for value label
        const barZoneH = chartH - 8; // 8mm for x-axis labels
        const maxBarH = barZoneH - labelTopMm; // max bar height, leaves room for label
        const maxVol = Math.max(...data.map(d => d.volume), 1);
        const n = data.length;
        const gap = 2;
        const barW = Math.min(12, (W - gap * (n - 1)) / n);
        const totalBarZone = n * barW + (n - 1) * gap;
        const offsetX = L + (W - totalBarZone) / 2;

        // Background
        doc.setFillColor(248, 248, 252);
        doc.rect(L, startY, W, chartH, 'F');

        // Baseline
        doc.setDrawColor(220, 220, 220);
        doc.setLineWidth(0.3);
        doc.line(L, startY + barZoneH, R, startY + barZoneH);

        data.forEach((d, i) => {
          const barH = Math.max(1, (d.volume / maxVol) * maxBarH);
          const x = offsetX + i * (barW + gap);
          const y = startY + barZoneH - barH;

          // Bar
          doc.setFillColor(147, 51, 234);
          doc.rect(x, y, barW, barH, 'F');

          // Volume label on top of bar (always safe — barH ≤ maxBarH guarantees space)
          doc.setTextColor(147, 51, 234);
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(5.5);
          const volLabel = d.volume >= 1000 ? `${(d.volume / 1000).toFixed(1)}t` : `${d.volume}`;
          doc.text(volLabel, x + barW / 2, y - 0.8, { align: 'center' });

          // X-axis date label
          doc.setTextColor(120, 120, 120);
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(5.5);
          doc.text(d.label, x + barW / 2, startY + chartH - 1.5, { align: 'center' });
        });

        return startY + chartH + 2;
      };

      // ── Chart 2: Grupos musculares (horizontal bars) ──────────────────────
      const drawMuscleChart = (startY: number) => {
        const data = gruposMusculares;
        const totalSer = data.reduce((s, g) => s + g.series, 0) || 1;
        const maxSer = Math.max(...data.map(g => g.series), 1);
        const rowH = 7;
        const rowGap = 1;
        const labelW = 52;
        const barMaxW = 100;
        const valueW = 28;

        data.forEach((g, i) => {
          const y = startY + i * (rowH + rowGap);
          const barW = (g.series / maxSer) * barMaxW;
          const pct = Math.round((g.series / totalSer) * 100);
          const rgb = GRUPO_COLORS_RGB[g.grupo] ?? [122, 138, 171];

          // Row bg
          if (i % 2 === 0) {
            doc.setFillColor(249, 249, 251);
            doc.rect(L, y, W, rowH, 'F');
          }

          // Label
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(8);
          doc.setTextColor(50, 50, 50);
          doc.text(g.grupo, L + 2, y + rowH - 2);

          // Bar background
          doc.setFillColor(237, 233, 254);
          doc.rect(L + labelW, y + 1.5, barMaxW, rowH - 3, 'F');

          // Bar fill
          doc.setFillColor(...rgb);
          if (barW > 0) doc.rect(L + labelW, y + 1.5, barW, rowH - 3, 'F');

          // Series count
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(7.5);
          doc.setTextColor(60, 60, 60);
          doc.text(`${g.series}`, L + labelW + barMaxW + 3, y + rowH - 2);

          // Pct
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(7);
          doc.setTextColor(110, 110, 110);
          doc.text(`${pct}%`, L + labelW + barMaxW + 3 + 10, y + rowH - 2);
        });

        return startY + data.length * (rowH + rowGap) + 2;
      };

      // ── Chart 3: Progressão de carga (line chart) ─────────────────────────
      const drawProgressionChart = (startY: number, chartH = 52) => {
        const data = progressao;
        if (data.length < 2) return startY;

        const padT = 10, padB = 10, padL = 18, padR = 8;
        const cW = W - padL - padR;
        const cH = chartH - padT - padB;
        const minV = Math.min(...data.map(d => d.value));
        const maxV = Math.max(...data.map(d => d.value));
        const rng = maxV - minV || 1;

        const toX = (i: number) =>
          L + padL + (data.length <= 1 ? cW / 2 : (i / (data.length - 1)) * cW);
        const toY = (v: number) =>
          startY + padT + cH - ((v - minV) / rng) * cH;

        // Background
        doc.setFillColor(248, 248, 252);
        doc.rect(L, startY, W, chartH, 'F');

        // Horizontal grid + Y labels
        doc.setLineWidth(0.2);
        [0, 0.5, 1].forEach(pct => {
          const gy = startY + padT + cH * (1 - pct);
          const val = minV + rng * pct;
          doc.setDrawColor(220, 220, 220);
          doc.line(L + padL, gy, R - padR, gy);
          doc.setTextColor(140, 140, 140);
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(6);
          doc.text(`${val.toFixed(0)}`, L + padL - 2, gy + 1, { align: 'right' });
        });

        // Line
        doc.setDrawColor(147, 51, 234);
        doc.setLineWidth(0.9);
        for (let i = 0; i < data.length - 1; i++) {
          doc.line(toX(i), toY(data[i].value), toX(i + 1), toY(data[i + 1].value));
        }

        // Dots + X labels
        const step = data.length <= 9 ? 1 : Math.ceil(data.length / 9);
        data.forEach((d, i) => {
          // Dot
          doc.setFillColor(147, 51, 234);
          doc.circle(toX(i), toY(d.value), 1.1, 'F');

          // X label (skip crowded)
          if (i % step === 0 || i === data.length - 1) {
            doc.setTextColor(120, 120, 120);
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(6);
            doc.text(d.date, toX(i), startY + chartH - 2, { align: 'center' });
          }
        });

        // Last value label
        const last = data[data.length - 1];
        const lastLabel = progMeta.isTime ? formatRestTime(Math.round(last.value)) : `${last.value} ${progMeta.unit}`;
        doc.setTextColor(147, 51, 234);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(7.5);
        doc.text(lastLabel, toX(data.length - 1), toY(last.value) - 2.5, { align: 'center' });

        // Delta annotation (first → last)
        const delta = last.value - data[0].value;
        if (delta !== 0) {
          const sign = delta > 0 ? '+' : '';
          const r = delta > 0 ? 57 : 224, g2 = delta > 0 ? 199 : 85, b2 = delta > 0 ? 90 : 85;
          const deltaLabel = progMeta.isTime
            ? `${sign}${formatRestTime(Math.abs(Math.round(delta)))} no período`
            : `${sign}${progMeta.unit === 'kg' ? delta.toFixed(1) : Math.round(delta)} ${progMeta.unit} no período`;
          doc.setTextColor(r, g2, b2);
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(8);
          doc.text(deltaLabel, L + padL, startY + 7, { align: 'left' });
        }

        return startY + chartH + 2;
      };

      // ── Page 1 ────────────────────────────────────────────────────────────
      addHeader(periodLabel);

      // Aluno info (header now 30mm tall → content starts at 39)
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.setTextColor(31, 31, 35);
      doc.text('ALUNO', L, 39);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(80, 80, 80);
      doc.text(profileName, L, 45);
      doc.text(`Período: ${start} a ${end}`, L, 51);

      // KPIs summary table
      sectionTitle('RESUMO DO PERÍODO', 60);
      autoTable(doc, {
        startY: 63,
        head: [['Métrica', 'Resultado']],
        body: [
          ['Volume Total Levantado', fmtVol(kpis.volume)],
          ['Treinos Realizados', `${kpis.sessions} sessões`],
          ['Duração Média por Treino', kpis.avgDur > 0 ? fmtDur(kpis.avgDur) : '—'],
          ['Frequência Semanal Média', `${kpis.perWeek.toFixed(1)} treinos/semana`],
        ],
        theme: 'striped',
        headStyles: { fillColor: [147, 51, 234], textColor: [255, 255, 255], fontSize: 8.5, fontStyle: 'bold' },
        bodyStyles: { fontSize: 8.5, textColor: [31, 31, 35] },
        columnStyles: {
          0: { cellWidth: 115 },
          1: { cellWidth: 65, halign: 'right' as const, fontStyle: 'bold' as const },
        },
      });

      let cursor = ((doc as any).lastAutoTable?.finalY ?? 88) + 7;

      // Chart 1 — Volume semanal
      if (volumeSemanal.length >= 2) {
        sectionTitle('VOLUME SEMANAL', cursor);
        cursor = drawVolumeChart(cursor + 4, 42);
        cursor += 5;
      }

      // Top exercises table
      sectionTitle('TOP EXERCÍCIOS', cursor);
      autoTable(doc, {
        startY: cursor + 3,
        head: [['Exercício', 'Sessões', 'Séries', 'Carga Máx.']],
        body: topExercicios.map(ex => [
          ex.nome,
          `${ex.count}×`,
          `${ex.totalSeries}`,
          ex.maxPeso > 0 ? `${ex.maxPeso} kg` : '—',
        ]),
        theme: 'striped',
        headStyles: { fillColor: [147, 51, 234], textColor: [255, 255, 255], fontSize: 8.5, fontStyle: 'bold' },
        bodyStyles: { fontSize: 8, textColor: [31, 31, 35] },
        columnStyles: {
          0: { cellWidth: 92 },
          1: { cellWidth: 26, halign: 'center' as const },
          2: { cellWidth: 26, halign: 'center' as const },
          3: { cellWidth: 46, halign: 'right' as const, fontStyle: 'bold' as const },
        },
      });

      // ── Page 2 ────────────────────────────────────────────────────────────
      doc.addPage();
      addHeader(periodLabel);

      let cursor2 = 37;

      // Chart 2 — Grupos musculares (horizontal bars)
      sectionTitle('VOLUME POR GRUPO MUSCULAR', cursor2);
      cursor2 += 4;
      cursor2 = drawMuscleChart(cursor2);
      cursor2 += 8;

      // Chart 3 — Progressão de carga (line chart)
      if (progressao.length >= 2 && selectedExercicio) {
        const selExNome = exerciciosMap.get(selectedExercicio)?.nome ?? 'Exercício';
        sectionTitle(`PROGRESSÃO DE CARGA — ${selExNome.toUpperCase()}`, cursor2);
        cursor2 += 4;
        drawProgressionChart(cursor2, 55);
      }

      // ── Página 3 — Músculos menos trabalhados ──────────────────────────────
      if (gruposMenosTrabalhados.length > 0) {
        doc.addPage();
        const muscleLabel = MUSCLE_PERIOD_OPTIONS.find(o => o.value === muscleFilterPreset)?.label ?? '';
        addHeader(periodLabel);

        sectionTitle(`MÚSCULOS MENOS TRABALHADOS — ${muscleLabel.toUpperCase()}`, 39);
        autoTable(doc, {
          startY: 42,
          head: [['Grupo muscular', 'Séries completadas no período']],
          body: gruposMenosTrabalhados.map(g => [g.grupo, `${g.series}`]),
          theme: 'striped',
          headStyles: { fillColor: [147, 51, 234], textColor: [255, 255, 255], fontSize: 8.5, fontStyle: 'bold' },
          bodyStyles: { fontSize: 8.5, textColor: [31, 31, 35] },
          columnStyles: {
            0: { cellWidth: 120 },
            1: { cellWidth: 60, halign: 'right' as const, fontStyle: 'bold' as const },
          },
        });
      }

      // ── Footers ───────────────────────────────────────────────────────────
      const totalPages = (doc as any).internal.getNumberOfPages();
      for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7.5);
        doc.setTextColor(130, 130, 130);
        doc.text('COACH VINNY — Relatório de Dinâmica de Carga', L, 289);
        doc.text(`Página ${i} de ${totalPages}`, R, 289, { align: 'right' });
      }

      const safeName = profileName.replace(/[^a-zA-Z0-9]/g, '_');
      doc.save(`coach-vinny_carga_${safeName}_${start}_${end}.pdf`);
    } finally {
      setExportingPdf(false);
    }
  };

  const selectedExNome = exerciciosMap.get(selectedExercicio)?.nome ?? '';

  return (
    <div className="flex flex-col gap-4">
      {/* ── Header toolbar ── */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-1.5 mr-1">
          <ChartBar size={14} className="text-brand shrink-0" />
          <span className="text-[11px] font-semibold uppercase tracking-widest text-text-secondary">
            Dinâmica de Carga
          </span>
        </div>

        {/* Preset selector — colapsado, mesmo padrão da aba Evolução */}
        <PeriodSelect
          value={preset}
          options={PRESET_OPTIONS}
          onChange={(v) => setPreset(v as PeriodPreset)}
          align="left"
          aria-label="Selecionar período"
        />

        {/* Export button */}
        <button
          type="button"
          onClick={() => void handleExportPdf()}
          disabled={exportingPdf || kpis.sessions === 0}
          className={cn(
            'ml-auto flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[11px] font-semibold transition-all',
            kpis.sessions > 0
              ? 'bg-brand text-white hover:opacity-90'
              : 'bg-surface-2 text-text-disabled cursor-not-allowed',
          )}
        >
          <FilePdf size={13} />
          {exportingPdf ? 'Gerando…' : 'Exportar PDF'}
        </button>
      </div>

      {/* Custom date range */}
      {preset === 'custom' && (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[11px] text-text-secondary">De</span>
          <DatePickerPopover
            value={customStart}
            onChange={setCustomStart}
            placeholder="início"
            maxDate={customEnd || undefined}
          />
          <span className="text-[11px] text-text-secondary">até</span>
          <DatePickerPopover
            value={customEnd}
            onChange={setCustomEnd}
            placeholder="fim"
            minDate={customStart || undefined}
          />
        </div>
      )}

      {/* ── Loading ── */}
      {loading && (
        <div className="flex flex-col gap-3">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[0, 1, 2, 3].map(i => (
              <div key={i} className="h-20 animate-pulse rounded-xl bg-surface-2" />
            ))}
          </div>
          <div className="h-48 animate-pulse rounded-xl bg-surface-2" />
        </div>
      )}

      {/* ── Empty state ── */}
      {!loading && filteredRows.length === 0 && (
        <div className="rounded-xl bg-surface-1 px-6 py-10 text-center">
          <p className="text-[13px] text-text-secondary">
            Nenhum treino registrado no período selecionado
          </p>
          <p className="mt-1 text-[11px] text-text-disabled">
            {rows.length === 0
              ? 'O aluno ainda não realizou treinos pelo app'
              : 'Tente outro período'}
          </p>
        </div>
      )}

      {/* ── Content ── */}
      {!loading && filteredRows.length > 0 && (
        <>
          {/* KPIs */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <KpiCard
              label="Volume Total"
              value={fmtVol(kpis.volume)}
              color="#D4A843"
              icon={Lightning}
            />
            <KpiCard
              label="Treinos"
              value={`${kpis.sessions}`}
              sub="sessões"
              color="#39c75a"
              icon={Barbell}
            />
            <KpiCard
              label="Duração Média"
              value={kpis.avgDur > 0 ? fmtDur(kpis.avgDur) : '—'}
              sub="por treino"
              color="#f59e0b"
              icon={Clock}
            />
            <KpiCard
              label="Freq. Semanal"
              value={kpis.perWeek > 0 ? `${kpis.perWeek}×` : '—'}
              sub="treinos/semana"
              color="#D4A843"
              icon={Repeat}
            />
          </div>

          {/* Top exercises + muscle groups side by side on desktop */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Top exercises */}
            <div className="rounded-xl bg-surface-1 p-4 flex flex-col gap-3">
              <div className="flex items-center gap-1.5 mb-1">
                <Trophy size={13} className="text-brand shrink-0" />
                <span className="text-[11px] font-semibold uppercase tracking-widest text-text-secondary">
                  Top Exercícios
                </span>
              </div>
              {topExercicios.length === 0 ? (
                <p className="text-[12px] text-text-disabled text-center py-4">Sem dados</p>
              ) : (
                <div className="flex flex-col gap-2">
                  {topExercicios.map((ex, i) => (
                    <TopExerciseBar
                      key={ex.id}
                      nome={ex.nome}
                      count={ex.count}
                      pct={Math.round((ex.count / topExercicios[0].count) * 100)}
                      color={i === 0 ? '#D4A843' : i === 1 ? '#D4A843' : '#7a8aab'}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Muscle groups */}
            <div className="rounded-xl bg-surface-1 p-4 flex flex-col gap-3">
              <div className="flex items-center gap-1.5 mb-1">
                <Barbell size={13} className="text-brand shrink-0" />
                <span className="text-[11px] font-semibold uppercase tracking-widest text-text-secondary">
                  Grupos Musculares
                </span>
              </div>
              {gruposMusculares.length === 0 ? (
                <p className="text-[12px] text-text-disabled text-center py-4">Sem dados</p>
              ) : (
                <div className="flex flex-col gap-3">
                  {gruposMusculares.map(g => (
                    <HorizontalBar
                      key={g.grupo}
                      label={g.grupo}
                      value={g.series}
                      maxValue={gruposMusculares[0].series}
                      formattedValue={`${g.series} séries`}
                      color={grupoColor(g.grupo)}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Progression */}
          {topExercicios.length > 0 && (
            <div className="rounded-xl bg-surface-1 p-4 flex flex-col gap-3">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5">
                  <Lightning size={13} className="text-brand shrink-0" />
                  <span className="text-[11px] font-semibold uppercase tracking-widest text-text-secondary">
                    Progressão de Carga
                  </span>
                </div>

                {/* Exercise selector — campo flat + lista no padrão AURON */}
                <ExercicioFilterDropdown
                  value={selectedExercicio}
                  options={topExercicios.map(ex => ({ id: ex.id, nome: ex.nome }))}
                  onChange={setSelectedExercicio}
                />
              </div>

              {/* Valor máximo por sessão — kg, repetições ou tempo, conforme o tipo do exercício */}
              {progressao.length > 0 && (() => {
                const last = progressao[progressao.length - 1].value;
                const delta = progressao.length >= 2 ? last - progressao[0].value : null;
                const displayValue = progMeta.isTime
                  ? formatRestTime(Math.round(last))
                  : progMeta.unit === 'kg'
                    ? String(Math.round(last * 10) / 10)
                    : String(Math.round(last));
                const deltaLabel = delta === null
                  ? ''
                  : progMeta.isTime
                    ? `${delta > 0 ? '+' : delta < 0 ? '-' : ''}${formatRestTime(Math.abs(Math.round(delta)))} no período`
                    : `${delta > 0 ? '+' : ''}${progMeta.unit === 'kg' ? delta.toFixed(1) : Math.round(delta)} ${progMeta.unit} no período`;
                return (
                  <div className="w-full flex flex-col items-center gap-1 py-1">
                    {delta !== null && (
                      <span
                        className={cn(
                          'text-[12px] font-semibold tabular-nums lining-nums',
                          delta > 0 ? 'text-[#39c75a]' : delta < 0 ? 'text-[#e05555]' : 'text-text-secondary',
                        )}
                      >
                        {deltaLabel}
                      </span>
                    )}
                    <div className="flex items-end gap-1">
                      <span
                        className="tabular-nums lining-nums font-black leading-none"
                        style={{ fontSize: 40, color: '#D4A843', letterSpacing: '-0.02em' }}
                      >
                        {displayValue}
                      </span>
                      {!progMeta.isTime && (
                        <span className="mb-1 text-[18px] font-bold text-text-secondary">{progMeta.unit}</span>
                      )}
                    </div>
                  </div>
                );
              })()}

              <ProgressionChart data={progressao} unit={progMeta.unit} />

              {progressao.length > 0 && selectedExNome && (
                <p className="text-[10px] text-text-disabled">
                  {progMeta.maxLabel} por sessão — {selectedExNome}
                </p>
              )}
            </div>
          )}

          {/* Músculos menos trabalhados */}
          <div className="rounded-xl bg-surface-1 p-4 flex flex-col gap-3">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5">
                <Barbell size={13} className="text-brand shrink-0" />
                <span className="text-[11px] font-semibold uppercase tracking-widest text-text-secondary">
                  Músculos Menos Trabalhados
                </span>
              </div>
              <PeriodSelect
                value={muscleFilterPreset}
                options={MUSCLE_PERIOD_OPTIONS}
                onChange={(v) => setMuscleFilterPreset(v as PeriodPreset)}
                aria-label="Período — músculos menos trabalhados"
              />
            </div>

            {gruposMenosTrabalhados.length === 0 ? (
              <p className="text-[12px] text-text-disabled text-center py-4">
                Nenhuma série registrada nesse período
              </p>
            ) : (
              <div className="flex flex-col gap-3">
                {gruposMenosTrabalhados.map(g => (
                  <HorizontalBar
                    key={g.grupo}
                    label={g.grupo}
                    value={g.series}
                    maxValue={Math.max(...gruposMenosTrabalhados.map(x => x.series), 1)}
                    formattedValue={`${g.series} séries`}
                    color={grupoColor(g.grupo)}
                  />
                ))}
              </div>
            )}
            <p className="text-[10px] text-text-disabled">
              Grupos com menos séries completadas no período selecionado
            </p>
          </div>
        </>
      )}
    </div>
  );
}
