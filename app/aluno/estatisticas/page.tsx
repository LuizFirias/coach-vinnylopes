'use client';

import { useState, useEffect, useMemo } from 'react';
import { supabaseClient } from '@/lib/supabaseClient';
import { getSafeSession } from '@/lib/authErrorHandler';
import {
  ResponsiveContainer,
  BarChart, Bar,
  XAxis, YAxis,
  Tooltip as ChartTooltip,
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar,
} from 'recharts';
import {
  ArrowLeft,
  ChartBar,
  ChartPolar,
  PersonSimpleRun,
  CalendarBlank,
  CaretRight,
  Fire,
  Trophy,
} from '@phosphor-icons/react';
import DumbbellLoader from '@/app/components/DumbbellLoader';
import { MuscleBodyFigure } from '@/app/components/MuscleBodyFigure';
import { StatsPageHeader } from '@/app/components/statistics/StatsPageHeader';
import { StatsPeriodSelector } from '@/app/components/statistics/StatsPeriodSelector';
import { StatsWeekCalendar } from '@/app/components/statistics/StatsWeekCalendar';
import { StatsMuscleBodyCard } from '@/app/components/statistics/StatsMuscleBodyCard';
import { StatsNavCards } from '@/app/components/statistics/StatsNavCards';
import { MuscleDistributionRadar } from '@/app/components/statistics/MuscleDistributionRadar';
import { StatsInlineKpis } from '@/app/components/statistics/StatsInlineKpis';
import { MuscleGroupSetsTable } from '@/app/components/statistics/MuscleGroupSetsTable';
import { useAlunoBodyGender } from '@/app/contexts/AlunoBodyGenderContext';
import { buildIntensityHighlightData } from '@/lib/utils/muscleBody';
import type { BodyGender } from '@/lib/utils/bodyGender';
import { cn } from '@/lib/utils/cn';
import { resolveMuscleGroup } from '@/lib/constants/muscle-groups';

// ─── Muscle mapping ──────────────────────────────────────────────────────────
const MUSCLE_MAP: Record<string, string[]> = {
  'Peito Superior': ['chest-upper'],
  'Peito Médio': ['chest-middle'],
  'Peito Inferior': ['chest-lower'],
  'Dorsais': ['lats-left', 'lats-right'],
  'Trapézio': ['trapezius'],
  'Lombar': ['lower-back'],
  'Ombro Anterior': ['shoulders-front'],
  'Ombro Lateral': ['shoulders-middle'],
  'Ombro Posterior': ['shoulders-back'],
  'Bíceps': ['biceps-left', 'biceps-right'],
  'Tríceps': ['triceps-left', 'triceps-right'],
  'Antebraço': ['forearms-left', 'forearms-right'],
  'Quadríceps': ['quads-left', 'quads-right'],
  'Posterior (Isquiotibiais)': ['hamstrings-left', 'hamstrings-right'],
  'Panturrilha': ['calves-left', 'calves-right'],
  'Glúteos': ['glutes'],
  'Abdômen': ['abs'],
  'Oblíquos': ['obliques-left', 'obliques-right'],
};

// Simplified muscle groups for radar (like Hevy: Back, Chest, Core, Arms, Shoulders, Legs)
const RADAR_GROUPS: Record<string, string[]> = {
  'Costas': ['Dorsais', 'Trapézio', 'Lombar'],
  'Peito': ['Peito Superior', 'Peito Médio', 'Peito Inferior'],
  'Core': ['Abdômen', 'Oblíquos'],
  'Braços': ['Bíceps', 'Tríceps', 'Antebraço'],
  'Ombros': ['Ombro Anterior', 'Ombro Lateral', 'Ombro Posterior'],
  'Pernas': ['Quadríceps', 'Posterior (Isquiotibiais)', 'Panturrilha', 'Glúteos'],
};

type Screen = 'main' | 'set-count' | 'muscle-chart' | 'body-distribution' | 'main-exercises' | 'monthly-report';

// ─── Helpers ─────────────────────────────────────────────────────────────────
function toISODate(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function getWeekDays(referenceDate: Date) {
  const day = referenceDate.getDay(); // 0=Sun
  const diff = day === 0 ? -6 : 1 - day; // start on Monday
  const monday = new Date(referenceDate);
  monday.setDate(referenceDate.getDate() + diff);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return d;
  });
}

const DAY_LABELS = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];
const MONTHS_PT = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
const MONTHS_FULL = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

const MAIN_PERIOD_OPTIONS = [
  { value: 'today', label: 'Hoje' },
  { value: 'week', label: 'Esta semana' },
  { value: '30d', label: 'Últ. 30 dias' },
  { value: 'all', label: 'Sempre' },
];

const RADAR_PERIOD_OPTIONS = [
  { value: '7d', label: 'Últimos 7 dias' },
  { value: '30d', label: 'Últimos 30 dias' },
  { value: '90d', label: 'Últimos 90 dias' },
  { value: 'all', label: 'Sempre' },
];

const SET_COUNT_PERIOD_OPTIONS = [
  { value: '7d', label: 'Últ. 7 dias' },
  { value: '30d', label: 'Últ. 30 dias' },
  { value: '90d', label: 'Últ. 90 dias' },
  { value: 'all', label: 'Sempre' },
];

function filterHistoricoByPeriod(historico: any[], period: string) {
  const now = Date.now();
  const today = toISODate(new Date());
  return historico.filter((h) => {
    if (!h.data_conclusao) return false;
    const date = new Date(h.data_conclusao);
    switch (period) {
      case 'today':
        return toISODate(date) === today;
      case 'week':
      case '7d':
        return now - date.getTime() <= 7 * 86400000;
      case '30d':
        return now - date.getTime() <= 30 * 86400000;
      case '90d':
        return now - date.getTime() <= 90 * 86400000;
      case 'all':
        return true;
      default:
        return true;
    }
  });
}

function countSetsByMuscle(
  rows: any[],
  exerciciosBiblioteca: Record<string, string>,
): Record<string, number> {
  const countSets: Record<string, number> = {};
  rows.forEach((row) => {
    const grupo = resolveMuscleGroup(
      exerciciosBiblioteca[row.exercicio_id] || row.dados_sessao?.grupo_muscular,
    );
    const series = (row.dados_sessao?.series || []).filter((s: any) => s.completado);
    if (series.length) countSets[grupo] = (countSets[grupo] || 0) + series.length;
  });
  return countSets;
}

// ─── BodyChart component ──────────────────────────────────────────────────────
function MuscleBodyChart({
  muscleIntensity,
  side,
  gender,
}: {
  muscleIntensity: Record<string, number>;
  side: 'front' | 'back';
  gender: BodyGender;
}) {
  const data = useMemo(
    () => buildIntensityHighlightData(muscleIntensity),
    [muscleIntensity],
  );

  return (
    <MuscleBodyFigure
      data={data}
      side={side}
      gender={gender}
      scale={0.85}
      defaultFill="#27272a"
      defaultStroke="#3f3f46"
      defaultStrokeWidth={1}
      style={{ minHeight: 260, maxHeight: 300 }}
    />
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function EstatisticasPage() {
  const bodyGender = useAlunoBodyGender();
  const [loading, setLoading] = useState(true);
  const [screen, setScreen] = useState<Screen>('main');
  const [weekOffset, setWeekOffset] = useState(0); // 0 = current week
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [setCountScreenPeriod, setSetCountScreenPeriod] = useState('7d');
  const [mainStatsPeriod, setMainStatsPeriod] = useState('week');
  const [radarPeriod, setRadarPeriod] = useState('30d');
  const [isDesktop, setIsDesktop] = useState(false);

  // Data
  const [historico, setHistorico] = useState<any[]>([]);
  const [exerciciosBiblioteca, setExerciciosBiblioteca] = useState<Record<string, string>>({});

  // ── Load data ──────────────────────────────────────────────────────────────
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 1024px)');
    const update = () => setIsDesktop(mq.matches);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const session = await getSafeSession();
        if (!session?.user) return;
        const uid = session.user.id;

        const { data: bibData } = await supabaseClient
          .from('exercicios_biblioteca')
          .select('id, grupo_muscular');
        const bibMap: Record<string, string> = {};
        bibData?.forEach((item) => {
          if (item.grupo_muscular) {
            bibMap[item.id] = resolveMuscleGroup(item.grupo_muscular);
          }
        });
        setExerciciosBiblioteca(bibMap);

        const { data: histData } = await supabaseClient
          .from('historico_treinos')
          .select('id, data_conclusao, dados_sessao, exercicio_id')
          .eq('aluno_id', uid)
          .order('data_conclusao', { ascending: false });
        setHistorico(histData || []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  // ── Computed data ──────────────────────────────────────────────────────────
  const weekDays = useMemo(() => {
    const ref = new Date();
    ref.setDate(ref.getDate() + weekOffset * 7);
    return getWeekDays(ref);
  }, [weekOffset]);

  const workoutDates = useMemo(() => {
    const set = new Set<string>();
    historico.forEach(h => { if (h.data_conclusao) set.add(toISODate(new Date(h.data_conclusao))); });
    return set;
  }, [historico]);

  // Radar data (muscle distribution)
  const radarData = useMemo(() => {
    const filtered = filterHistoricoByPeriod(historico, radarPeriod);
    const countSets = countSetsByMuscle(filtered, exerciciosBiblioteca);
    return Object.entries(RADAR_GROUPS).map(([group, muscles]) => ({
      subject: group,
      value: muscles.reduce((sum, m) => sum + (countSets[m] || 0), 0),
      fullMark: 100,
    }));
  }, [historico, exerciciosBiblioteca, radarPeriod]);

  const radarHasData = radarData.some((item) => item.value > 0);

  const radarPeriodStats = useMemo(() => {
    const filtered = filterHistoricoByPeriod(historico, radarPeriod);
    const workoutCount = new Set(
      filtered.map((h) => (h.data_conclusao ? toISODate(new Date(h.data_conclusao)) : '')),
    ).size;
    const totalSets = filtered.reduce(
      (acc, row) => acc + (row.dados_sessao?.series || []).filter((s: any) => s.completado).length,
      0,
    );
    const totalMinutes = totalSets * 4 + workoutCount * 10;
    const durationLabel =
      workoutCount === 0 ? '—' : `${Math.floor(totalMinutes / 60)}h ${totalMinutes % 60}min`;
    return { workoutCount, durationLabel };
  }, [historico, radarPeriod]);

  const mainMuscleCountSets = useMemo(() => {
    const filtered = filterHistoricoByPeriod(historico, mainStatsPeriod);
    return countSetsByMuscle(filtered, exerciciosBiblioteca);
  }, [historico, exerciciosBiblioteca, mainStatsPeriod]);

  const setCountScopedHistorico = useMemo(() => {
    const filtered = filterHistoricoByPeriod(historico, setCountScreenPeriod);
    if (weekOffset === 0) return filtered;
    const weekDateStrings = weekDays.map((d) => toISODate(d));
    return filtered.filter(
      (h) => h.data_conclusao && weekDateStrings.includes(toISODate(new Date(h.data_conclusao))),
    );
  }, [historico, setCountScreenPeriod, weekDays, weekOffset]);

  const setCountMuscleCountSets = useMemo(
    () => countSetsByMuscle(setCountScopedHistorico, exerciciosBiblioteca),
    [setCountScopedHistorico, exerciciosBiblioteca],
  );

  const setCountGroupedRows = useMemo(() => {
    const countSets = countSetsByMuscle(
      filterHistoricoByPeriod(historico, setCountScreenPeriod),
      exerciciosBiblioteca,
    );
    return Object.entries(RADAR_GROUPS)
      .map(([name, muscles]) => ({
        name,
        sets: muscles.reduce((sum, m) => sum + (countSets[m] || 0), 0),
      }))
      .filter((row) => row.sets > 0)
      .sort((a, b) => b.sets - a.sets);
  }, [historico, setCountScreenPeriod, exerciciosBiblioteca]);

  const setCountTotal = useMemo(
    () => setCountGroupedRows.reduce((acc, row) => acc + row.sets, 0),
    [setCountGroupedRows],
  );

  // Main exercises
  const mainExercises = useMemo(() => {
    const now = Date.now();
    const msLimit = 30 * 86400000;
    const filtered = historico.filter(h => now - new Date(h.data_conclusao).getTime() <= msLimit);
    const freq: Record<string, number> = {};
    filtered.forEach(row => {
      const nome = row.dados_sessao?.nome_exercicio || 'Exercício';
      freq[nome] = (freq[nome] || 0) + 1;
    });
    return Object.entries(freq).map(([nome, count]) => ({ nome, count })).sort((a, b) => b.count - a.count);
  }, [historico]);

  // Monthly report data
  const monthlyData = useMemo(() => {
    const firstDay = new Date(selectedYear, selectedMonth, 1);
    const lastDay = new Date(selectedYear, selectedMonth + 1, 0);

    const monthHist = historico.filter(h => {
      const d = new Date(h.data_conclusao);
      return d >= firstDay && d <= lastDay;
    });

    // Workout days (calendar)
    const workoutDaysInMonth = new Set<number>();
    monthHist.forEach(h => workoutDaysInMonth.add(new Date(h.data_conclusao).getDate()));

    // Stats
    const sessions = new Map<string, any[]>();
    monthHist.forEach(h => {
      const key = h.data_conclusao ? toISODate(new Date(h.data_conclusao)) : '';
      if (!sessions.has(key)) sessions.set(key, []);
      sessions.get(key)!.push(h);
    });
    const totalWorkouts = sessions.size;
    let totalSets = 0, totalVolume = 0;
    monthHist.forEach(row => {
      const series = (row.dados_sessao?.series || []).filter((s: any) => s.completado);
      totalSets += series.length;
      series.forEach((s: any) => { totalVolume += (Number(s.peso_atual) || 0) * (Number(s.reps) || 0); });
    });
    const totalMinutes = totalSets * 4 + totalWorkouts * 10;

    // Muscle groups for the month
    const countSets: Record<string, number> = {};
    monthHist.forEach(row => {
      const grupo = resolveMuscleGroup(
      exerciciosBiblioteca[row.exercicio_id] || row.dados_sessao?.grupo_muscular,
    );
      const series = (row.dados_sessao?.series || []).filter((s: any) => s.completado);
      if (series.length) countSets[grupo] = (countSets[grupo] || 0) + series.length;
    });
    const muscleGroups = Object.entries(countSets).sort((a, b) => b[1] - a[1]).slice(0, 8);
    const maxGroupSets = muscleGroups[0]?.[1] || 1;

    // Radar for month (simplified groups)
    const monthRadarData = Object.entries(RADAR_GROUPS).map(([group, muscles]) => ({
      subject: group,
      value: muscles.reduce((sum, m) => sum + (countSets[m] || 0), 0),
      fullMark: 100,
    }));

    // Top exercises
    const freq: Record<string, number> = {};
    monthHist.forEach(row => {
      const nome = row.dados_sessao?.nome_exercicio || 'Exercício';
      freq[nome] = (freq[nome] || 0) + 1;
    });
    const topExercises = Object.entries(freq).map(([nome, count]) => ({ nome, count })).sort((a, b) => b.count - a.count).slice(0, 5);

    // Calendar grid
    const calendarRows: (number | null)[][] = [];
    const firstDow = firstDay.getDay(); // 0=Sun
    const startOffset = firstDow === 0 ? 6 : firstDow - 1; // Mon=0
    let cells: (number | null)[] = Array(startOffset).fill(null);
    for (let d = 1; d <= lastDay.getDate(); d++) {
      cells.push(d);
      if (cells.length === 7) { calendarRows.push(cells); cells = []; }
    }
    while (cells.length > 0 && cells.length < 7) cells.push(null);
    if (cells.length) calendarRows.push(cells);

    return { totalWorkouts, totalSets, totalVolume, totalMinutes, muscleGroups, maxGroupSets, monthRadarData, topExercises, calendarRows, workoutDaysInMonth };
  }, [historico, exerciciosBiblioteca, selectedMonth, selectedYear]);

  // Bar chart data for monthly report (last 12 months)
  const monthlyBarData = useMemo(() => {
    const now = new Date();
    return Array.from({ length: 12 }, (_, i) => {
      const m = (now.getMonth() - 11 + i + 12) % 12;
      const y = now.getFullYear() + Math.floor((now.getMonth() - 11 + i) / 12);
      const count = new Set(
        historico
          .filter(h => { const d = new Date(h.data_conclusao); return d.getMonth() === m && d.getFullYear() === y; })
          .map(h => h.data_conclusao ? toISODate(new Date(h.data_conclusao)) : '')
      ).size;
      const isCurrentSelected = m === selectedMonth && y === selectedYear;
      return { label: MONTHS_PT[m], value: count, active: isCurrentSelected, month: m, year: y };
    });
  }, [historico, selectedMonth, selectedYear]);

  if (loading) {
    return (
      <div
        className="min-h-screen flex items-center justify-center mobile-page-bg"
      >
        <DumbbellLoader text="Carregando estatísticas..." />
      </div>
    );
  }

  // ── SUB-SCREENS ────────────────────────────────────────────────────────────

  // Set Count Per Muscle screen
  if (screen === 'set-count') {
    return (
      <div className="min-h-screen mobile-page-bg text-text-primary pb-[calc(5rem+env(safe-area-inset-bottom))]">
        <div className={cn("mx-auto w-full", isDesktop ? "max-w-[960px] px-6 py-8" : "max-w-lg")}>
          <StatsPageHeader
            title="Séries por grupo"
            onBack={() => setScreen('main')}
            periodSelector={
              <StatsPeriodSelector
                value={setCountScreenPeriod}
                options={SET_COUNT_PERIOD_OPTIONS}
                onChange={setSetCountScreenPeriod}
              />
            }
          />

          <div
            className={cn(
              "px-4 pt-4 flex flex-col gap-5",
              isDesktop && "px-0 grid grid-cols-2 gap-6 items-start"
            )}
          >
            <StatsMuscleBodyCard
              countSets={setCountMuscleCountSets}
              gender={bodyGender}
              isDesktop={isDesktop}
              className={isDesktop ? "sticky top-24 min-w-0" : undefined}
            />

            <div className="flex flex-col gap-5 min-w-0">
              <StatsWeekCalendar
                variant="card"
                weekDays={weekDays}
                workoutDates={workoutDates}
                weekOffset={weekOffset}
                onPrevWeek={() => setWeekOffset((o) => o - 1)}
                onNextWeek={() => setWeekOffset((o) => Math.min(0, o + 1))}
                toISODate={toISODate}
              />

              <MuscleGroupSetsTable
                rows={setCountGroupedRows}
                total={setCountTotal}
                isDesktop={isDesktop}
              />
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Muscle Distribution Chart screen (Radar)
  if (screen === 'muscle-chart') {
    return (
      <div className="min-h-screen mobile-page-bg text-text-primary pb-[calc(5rem+env(safe-area-inset-bottom))]">
        <div className={cn("mx-auto w-full", isDesktop ? "max-w-[600px] px-6 py-8" : "max-w-lg")}>
          <StatsPageHeader
            title="Distribuição muscular"
            onBack={() => setScreen('main')}
            periodSelector={
              <StatsPeriodSelector
                value={radarPeriod}
                options={RADAR_PERIOD_OPTIONS}
                onChange={setRadarPeriod}
              />
            }
          />

          <div className={cn("px-4 flex flex-col gap-4", isDesktop && "px-0 gap-6")}>
            <MuscleDistributionRadar
              data={radarData}
              hasData={radarHasData}
              isDesktop={isDesktop}
            />
            <StatsInlineKpis
              workouts={radarPeriodStats.workoutCount}
              durationLabel={radarPeriodStats.durationLabel}
              isDesktop={isDesktop}
            />
          </div>
        </div>
      </div>
    );
  }

  // Body Distribution screen
  if (screen === 'body-distribution') {
    const muscleSetsByGroup: Record<string, number> = {};
    const now = Date.now();
    historico.filter(h => now - new Date(h.data_conclusao).getTime() <= 7 * 86400000).forEach(row => {
      const grupo = resolveMuscleGroup(
      exerciciosBiblioteca[row.exercicio_id] || row.dados_sessao?.grupo_muscular,
    );
      const series = (row.dados_sessao?.series || []).filter((s: any) => s.completado);
      if (series.length) muscleSetsByGroup[grupo] = (muscleSetsByGroup[grupo] || 0) + series.length;
    });
    const maxSets = Math.max(...Object.values(muscleSetsByGroup), 1);
    const intensity: Record<string, number> = {};
    Object.entries(muscleSetsByGroup).forEach(([g, c]) => { intensity[g] = Math.round((c / maxSets) * 10); });

    const allMuscleSets: Record<string, number> = {};
    historico.filter(h => now - new Date(h.data_conclusao).getTime() <= 30 * 86400000).forEach(row => {
      const grupo = resolveMuscleGroup(
      exerciciosBiblioteca[row.exercicio_id] || row.dados_sessao?.grupo_muscular,
    );
      const series = (row.dados_sessao?.series || []).filter((s: any) => s.completado);
      if (series.length) allMuscleSets[grupo] = (allMuscleSets[grupo] || 0) + series.length;
    });
    const totalSets = Object.values(allMuscleSets).reduce((a, b) => a + b, 0);

    return (
      <div
        className="min-h-screen pb-32 text-text-primary mobile-page-bg"
      >
        <div className="max-w-lg mx-auto">
          <div className="flex items-center justify-between p-4 border-b" style={{ borderColor: 'rgba(41,48,61,0.8)' }}>
            <button
              onClick={() => setScreen('main')}
              className="w-9 h-9 rounded-full border flex items-center justify-center text-text-secondary hover:text-text-primary transition-colors"
              style={{ background: 'var(--mobile-card-bg)', borderColor: 'var(--mobile-card-border)' }}
            >
              <ArrowLeft size={18} />
            </button>
            <h1 className="text-sm font-semibold text-text-primary">Distribuição corporal</h1>
            <div className="w-9" />
          </div>
          <div className="p-4 flex flex-col gap-5">
            {/* Week selector */}
            <div className="flex items-center justify-between">
              <button onClick={() => setWeekOffset(o => o - 1)} className="text-brand text-xl px-2">‹</button>
              <span className="text-sm font-semibold text-text-primary">
                {weekDays[0].getDate()}-{weekDays[6].getDate()} {MONTHS_FULL[weekDays[0].getMonth()]} {weekDays[0].getFullYear()}
              </span>
              <button onClick={() => setWeekOffset(o => Math.min(0, o + 1))} className="text-brand text-xl px-2 disabled:opacity-30" disabled={weekOffset >= 0}>›</button>
            </div>
            {/* Week days strip */}
            <div className="grid grid-cols-7 gap-1">
              {weekDays.map((day, i) => {
                const ds = toISODate(day);
                const hasWorkout = workoutDates.has(ds);
                const isToday = ds === toISODate(new Date());
                return (
                  <div key={i} className="flex flex-col items-center gap-1">
                    <span className="text-[10px] text-text-tertiary">{DAY_LABELS[i]}</span>
                    <div className={cn(
                      'w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all',
                      hasWorkout ? 'bg-brand text-white' : isToday ? 'border-2 border-brand text-brand' : 'text-text-secondary'
                    )}>
                      {day.getDate()}
                    </div>
                  </div>
                );
              })}
            </div>
            {/* Body charts FRONT + BACK side by side */}
            <div
              className="flex justify-around items-center border py-4 px-2 rounded-2xl"
              style={{ background: 'rgba(11,19,32,0.5)', borderColor: 'rgba(41,48,61,0.3)' }}
            >
              <div className="w-[46%] h-[300px] flex items-center justify-center overflow-hidden">
                <MuscleBodyChart muscleIntensity={intensity} side="front" gender={bodyGender} />
              </div>
              <div className="w-[46%] h-[300px] flex items-center justify-center overflow-hidden">
                <MuscleBodyChart muscleIntensity={intensity} side="back" gender={bodyGender} />
              </div>
            </div>
            {/* Muscle table */}
            <div
              className="border rounded-2xl overflow-hidden"
              style={{ background: 'var(--mobile-card-bg)', borderColor: 'var(--mobile-card-border)' }}
            >
              <div
                className="flex justify-between items-center px-4 py-3 border-b"
                style={{ background: '#0D1829', borderColor: 'rgba(41,48,61,0.8)' }}
              >
                <span className="text-xs font-semibold text-text-tertiary">Músculo</span>
                <span className="text-xs font-semibold text-text-tertiary">Séries</span>
              </div>
              <div className="flex flex-col">
                <div className="flex justify-between px-4 py-3 border-b border-divider/50">
                  <span className="text-sm font-bold text-text-primary">Total</span>
                  <span className="text-sm font-bold text-text-primary">{totalSets}</span>
                </div>
                {Object.entries(allMuscleSets).sort((a, b) => b[1] - a[1]).map(([muscle, sets]) => (
                  <div key={muscle} className="flex justify-between px-4 py-3 border-b border-divider/30 last:border-b-0">
                    <span className="text-sm text-text-primary">{muscle}</span>
                    <span className="text-sm text-text-primary">{sets}</span>
                  </div>
                ))}
                {Object.keys(allMuscleSets).length === 0 && (
                  <div className="py-8 text-center text-sm text-text-tertiary">Nenhum dado no período.</div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Main Exercises screen
  if (screen === 'main-exercises') {
    return (
      <div
        className="min-h-screen pb-32 text-text-primary mobile-page-bg"
      >
        <div className="max-w-lg mx-auto">
          <div className="flex items-center justify-between p-4 border-b" style={{ borderColor: 'rgba(41,48,61,0.8)' }}>
            <button
              onClick={() => setScreen('main')}
              className="w-9 h-9 rounded-full border flex items-center justify-center text-text-secondary hover:text-text-primary transition-colors"
              style={{ background: 'var(--mobile-card-bg)', borderColor: 'var(--mobile-card-border)' }}
            >
              <ArrowLeft size={18} />
            </button>
            <h1 className="text-sm font-semibold text-text-primary">Exercícios principais</h1>
            <div className="w-9" />
          </div>
          <div className="p-4 flex flex-col gap-4">
            <button
              className="flex items-center gap-1.5 px-3 py-2 border rounded-xl text-xs font-semibold text-text-primary self-start"
              style={{ background: 'var(--mobile-card-bg)', borderColor: 'var(--mobile-card-border)' }}
            >
              Últimos 30 dias <CaretRight size={12} className="rotate-90 opacity-60" />
            </button>
            {mainExercises.map((item, idx) => (
              <div key={idx} className="flex items-center gap-4 py-3 border-b border-divider/50 last:border-b-0">
                <div
                  className="w-12 h-12 rounded-full border flex items-center justify-center flex-shrink-0"
                  style={{ background: '#0D1829', borderColor: 'rgba(41,48,61,0.8)' }}
                >
                  <span className="text-lg">🏋️</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-text-primary truncate">{item.nome}</p>
                  <p className="text-xs text-text-tertiary">{item.count} {item.count === 1 ? 'vez' : 'vezes'}</p>
                </div>
                <CaretRight size={16} className="text-text-tertiary flex-shrink-0" />
              </div>
            ))}
            {mainExercises.length === 0 && (
              <div className="py-16 text-center text-sm text-text-tertiary">Nenhum exercício registrado no período.</div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Monthly Report screen
  if (screen === 'monthly-report') {
    const { totalWorkouts, totalSets, totalVolume, totalMinutes, muscleGroups, maxGroupSets, monthRadarData, topExercises, calendarRows, workoutDaysInMonth } = monthlyData;
    const prevMonth = () => {
      if (selectedMonth === 0) { setSelectedMonth(11); setSelectedYear(y => y - 1); }
      else setSelectedMonth(m => m - 1);
    };
    const nextMonth = () => {
      const now = new Date();
      if (selectedYear < now.getFullYear() || (selectedYear === now.getFullYear() && selectedMonth < now.getMonth())) {
        if (selectedMonth === 11) { setSelectedMonth(0); setSelectedYear(y => y + 1); }
        else setSelectedMonth(m => m + 1);
      }
    };

    return (
      <div
        className="min-h-screen pb-32 text-text-primary mobile-page-bg"
      >
        <div className="max-w-lg mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b" style={{ borderColor: 'rgba(41,48,61,0.8)' }}>
            <button
              onClick={() => setScreen('main')}
              className="w-9 h-9 rounded-full border flex items-center justify-center text-text-secondary hover:text-text-primary transition-colors"
              style={{ background: 'var(--mobile-card-bg)', borderColor: 'var(--mobile-card-border)' }}
            >
              <ArrowLeft size={18} />
            </button>
            <h1 className="text-sm font-semibold text-text-primary">Relatório de {MONTHS_FULL[selectedMonth]}</h1>
            <div className="w-9" />
          </div>

          <div className="p-4 flex flex-col gap-6">
            {/* Month title + total workouts */}
            <div>
              <h2 className="text-3xl font-black text-text-primary">{MONTHS_FULL[selectedMonth]} {selectedYear}</h2>
              <p className="text-2xl font-bold text-text-primary mt-1">
                {totalWorkouts} <span className="text-lg font-normal text-text-tertiary">treinos</span>
              </p>
            </div>

            {/* Bar chart — last 12 months */}
            <div className="w-full h-40">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyBarData} margin={{ top: 5, right: 0, left: -30, bottom: 5 }}>
                  <XAxis dataKey="label" stroke="var(--color-text-tertiary)" fontSize={9} tickLine={false} axisLine={false} />
                  <YAxis stroke="var(--color-text-tertiary)" fontSize={9} tickLine={false} axisLine={false} />
                  <Bar
                    dataKey="value"
                    radius={[4, 4, 0, 0]}
                    fill="var(--color-surface-3)"
                    onClick={(data) => { setSelectedMonth(data.month); setSelectedYear(data.year); }}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Filter pills */}
            <div className="flex gap-2 flex-wrap">
              {['Treinos', 'Duração', 'Volume', 'Séries'].map((label, i) => (
                <button
                  key={label}
                  className={cn('px-3 py-1.5 rounded-full text-xs font-semibold transition-all', i === 0 ? 'bg-brand text-white' : 'border text-text-secondary hover:text-text-primary')}
                  style={i === 0 ? undefined : { background: 'var(--mobile-card-bg)', borderColor: 'var(--mobile-card-border)' }}
                >
                  {label}
                </button>
              ))}
            </div>

            {/* Summary stats 2x2 */}
            <div>
              <p className="text-xs font-semibold text-text-tertiary mb-3">Resumo</p>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: 'Treinos', value: totalWorkouts.toString() },
                  { label: 'Duração estim.', value: `${Math.floor(totalMinutes / 60)}h ${totalMinutes % 60}min` },
                  { label: 'Volume', value: totalVolume > 0 ? `${(totalVolume / 1000).toFixed(1)}k kg` : `${totalSets} séries` },
                  { label: 'Séries', value: totalSets.toString() },
                ].map(stat => (
                  <div
                    key={stat.label}
                    className="border rounded-2xl p-4"
                    style={{ background: 'var(--mobile-card-bg)', borderColor: 'var(--mobile-card-border)' }}
                  >
                    <p className="text-xs text-text-tertiary mb-1">{stat.label}</p>
                    <p className="text-xl font-bold text-text-primary">{stat.value}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Workout Days Log (calendar heatmap) */}
            <div>
              <p className="text-xs font-semibold text-text-tertiary mb-3">Dias de Treino</p>
              <div className="flex items-center justify-center gap-3 mb-4">
                <Fire size={32} className="text-orange-500" weight="fill" />
                <div>
                  <p className="text-lg font-black text-text-primary">{totalWorkouts} {totalWorkouts === 1 ? 'treino' : 'treinos'} em {MONTHS_FULL[selectedMonth]}</p>
                </div>
              </div>

              <div
                className="border rounded-2xl p-4"
                style={{ background: 'var(--mobile-card-bg)', borderColor: 'var(--mobile-card-border)' }}
              >
                {/* Calendar header */}
                <div className="flex justify-between items-center mb-3">
                  <button onClick={prevMonth} className="text-brand text-lg px-1">‹</button>
                  <span className="text-sm font-semibold text-text-primary">{MONTHS_FULL[selectedMonth]} {selectedYear}</span>
                  <button onClick={nextMonth} className="text-brand text-lg px-1 disabled:opacity-30" disabled={selectedYear >= new Date().getFullYear() && selectedMonth >= new Date().getMonth()}>›</button>
                </div>

                {/* Day headers */}
                <div className="grid grid-cols-7 mb-2">
                  {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(d => (
                    <div key={d} className="text-center text-[10px] text-text-tertiary font-semibold py-1">{d}</div>
                  ))}
                </div>

                {/* Calendar cells */}
                {calendarRows.map((row, ri) => (
                  <div key={ri} className="grid grid-cols-7">
                    {row.map((day, di) => {
                      const hasWorkout = day !== null && workoutDaysInMonth.has(day);
                      return (
                        <div key={di} className="flex items-center justify-center py-1">
                          {day !== null ? (
                            <div className={cn(
                              'w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold transition-all',
                              hasWorkout ? 'bg-brand text-white' : 'text-text-secondary'
                            )}>
                              {day}
                            </div>
                          ) : <div className="w-8 h-8" />}
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>

            {/* Muscle Distribution (Radar) */}
            <div>
              <p className="text-xs font-semibold text-text-tertiary mb-3">Distribuição Muscular</p>
              <div className="w-full h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart cx="50%" cy="50%" outerRadius="75%" data={monthRadarData}>
                    <PolarGrid stroke="var(--color-border-subtle)" />
                    <PolarAngleAxis dataKey="subject" stroke="var(--color-text-secondary)" fontSize={10} />
                    <PolarRadiusAxis stroke="transparent" tick={false} />
                    <Radar name="Mês atual" dataKey="value" stroke="var(--color-brand)" fill="var(--color-brand)" fillOpacity={0.3} />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
              <div className="flex justify-center gap-4 text-xs text-text-tertiary mt-2">
                <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-brand inline-block" /> {MONTHS_FULL[selectedMonth]} {selectedYear}</span>
              </div>
            </div>

            {/* Main Muscle Groups (horizontal bars) */}
            {muscleGroups.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-text-tertiary mb-3">Principais Grupos Musculares</p>
                <div className="flex justify-between text-xs text-text-tertiary mb-2">
                  <span>Músculo</span>
                  <span>Séries</span>
                </div>
                <div className="flex flex-col gap-3">
                  {muscleGroups.map(([muscle, sets]) => (
                    <div key={muscle}>
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-sm text-text-primary">{muscle}</span>
                        <span className="text-sm font-bold text-text-primary">{sets}</span>
                      </div>
                      <div className="h-1.5 rounded-full overflow-hidden" style={{ background: '#0D1829' }}>
                        <div className="h-full bg-brand rounded-full transition-all" style={{ width: `${Math.round((sets / maxGroupSets) * 100)}%` }} />
                      </div>
                    </div>
                  ))}
                  {muscleGroups.length > 6 && (
                    <p className="text-xs text-text-tertiary text-center">Ver mais {muscleGroups.length - 6} grupos</p>
                  )}
                </div>
              </div>
            )}

            {/* Top Exercises */}
            {topExercises.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-text-tertiary mb-3">Exercícios em Destaque</p>
                {topExercises.map((item, idx) => (
                  <div key={idx} className="flex items-center gap-4 py-3 border-b border-divider/50 last:border-b-0">
                    <div
                      className="w-12 h-12 rounded-full border flex items-center justify-center flex-shrink-0"
                      style={{ background: '#0D1829', borderColor: 'rgba(41,48,61,0.8)' }}
                    >
                      <span className="text-lg">🏋️</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-text-primary truncate">{item.nome}</p>
                      <p className="text-xs text-text-tertiary">{item.count} {item.count === 1 ? 'vez' : 'vezes'}</p>
                    </div>
                    <CaretRight size={16} className="text-text-tertiary flex-shrink-0" />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ── MAIN STATISTICS SCREEN ────────────────────────────────────────────────
  const navItems = [
    {
      icon: ChartBar,
      title: 'Séries por grupo muscular',
      subtitle: 'Número de séries por grupo',
      onClick: () => setScreen('set-count'),
    },
    {
      icon: ChartPolar,
      title: 'Distribuição muscular',
      subtitle: 'Compare períodos anteriores',
      onClick: () => setScreen('muscle-chart'),
    },
    {
      icon: PersonSimpleRun,
      title: 'Distribuição muscular (Corpo)',
      subtitle: 'Mapa de calor semanal dos músculos trabalhados',
      onClick: () => setScreen('body-distribution'),
    },
    {
      icon: Trophy,
      title: 'Exercícios principais',
      subtitle: 'Seus melhores desempenhos',
      onClick: () => setScreen('main-exercises'),
    },
    {
      icon: CalendarBlank,
      title: 'Relatório mensal',
      subtitle: 'Resumo completo do seu mês de treino',
      onClick: () => setScreen('monthly-report'),
    },
  ];

  return (
    <div className="min-h-screen mobile-page-bg text-text-primary pb-[calc(5rem+env(safe-area-inset-bottom))]">
      <div className={cn("mx-auto w-full", isDesktop ? "max-w-[960px] px-6 py-8" : "max-w-lg")}>
        <StatsPageHeader
          title="Estatísticas"
          backHref="/aluno/perfil"
          periodSelector={
            <StatsPeriodSelector
              value={mainStatsPeriod}
              options={MAIN_PERIOD_OPTIONS}
              onChange={setMainStatsPeriod}
            />
          }
        />

        <div
          className={cn(
            "px-4 pt-4 flex flex-col gap-5",
            isDesktop && "px-0 grid grid-cols-[1fr_1.2fr] gap-6 items-start"
          )}
        >
          <StatsMuscleBodyCard
            countSets={mainMuscleCountSets}
            gender={bodyGender}
            isDesktop={isDesktop}
            className={isDesktop ? "min-w-0" : undefined}
          />

          <div className="flex flex-col gap-5 min-w-0">
            <StatsWeekCalendar
              weekDays={weekDays}
              workoutDates={workoutDates}
              weekOffset={weekOffset}
              onPrevWeek={() => setWeekOffset((o) => o - 1)}
              onNextWeek={() => setWeekOffset((o) => Math.min(0, o + 1))}
              toISODate={toISODate}
            />

            <StatsNavCards items={navItems} />
          </div>
        </div>
      </div>
    </div>
  );
}
