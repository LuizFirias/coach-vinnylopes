'use client';

import { useMemo, useState, type ReactNode } from 'react';
import { MuscleVolumeCard } from '@/app/components/workout/share/MuscleVolumeCard';
import { PrCard } from '@/app/components/workout/share/PrCard';
import { ReceiptCard } from '@/app/components/workout/share/ReceiptCard';
import { WorkoutExercisesCard } from '@/app/components/workout/share/WorkoutExercisesCard';
import { WorkoutMuscleListCard } from '@/app/components/workout/share/WorkoutMuscleListCard';
import { WorkoutPosterCard } from '@/app/components/workout/share/WorkoutPosterCard';
import { WorkoutSummaryCard } from '@/app/components/workout/share/WorkoutSummaryCard';
import { formatDuration } from '@/lib/utils/format';
import {
  SHARE_CARD,
  SHARE_THEME_LABELS,
  SHARE_TRANSPARENT_CHECKER,
  type ShareExerciseInput,
  type ShareTheme,
} from '@/lib/utils/workoutShare';
import { cn } from '@/lib/utils/cn';

const PREVIEW_WIDTH = 340;
const PREVIEW_SCALE = PREVIEW_WIDTH / SHARE_CARD.width;

const MOCK_WORKOUT_NAME = 'Treino A — Peito';
const MOCK_COACH = '@coach.demo';
const MOCK_DURATION_SECS = 4085; // 1:08:05
const MOCK_VOLUME = 5652;
const MOCK_SETS = 16;

const MOCK_EXERCICIOS: ShareExerciseInput[] = [
  {
    nome: 'Supino reto com barra',
    grupo_muscular: 'Peito Médio',
    series: [
      { completado: true, peso_atual: 80 },
      { completado: true, peso_atual: 90 },
      { completado: true, peso_atual: 100 },
      { completado: true, peso_atual: 110 },
    ],
  },
  {
    nome: 'Supino inclinado com halteres',
    grupo_muscular: 'Peito Superior',
    series: [
      { completado: true, peso_atual: 32 },
      { completado: true, peso_atual: 34 },
      { completado: true, peso_atual: 36 },
    ],
  },
  {
    nome: 'Crucifixo na máquina',
    grupo_muscular: 'Peito Médio',
    series: [
      { completado: true, peso_atual: 45 },
      { completado: true, peso_atual: 50 },
      { completado: true, peso_atual: 55 },
    ],
  },
  {
    nome: 'Tríceps testa com barra',
    grupo_muscular: 'Tríceps',
    series: [
      { completado: true, peso_atual: 30 },
      { completado: true, peso_atual: 35 },
      { completado: true, peso_atual: 35 },
    ],
  },
  {
    nome: 'Tríceps corda no pulley',
    grupo_muscular: 'Tríceps',
    series: [
      { completado: true, peso_atual: 25 },
      { completado: true, peso_atual: 30 },
      { completado: true, peso_atual: 30 },
    ],
  },
  {
    nome: 'Elevação lateral',
    grupo_muscular: 'Ombro Lateral',
    series: [
      { completado: true, peso_atual: 12 },
      { completado: true, peso_atual: 14 },
      { completado: false, peso_atual: 14 },
    ],
  },
];

const THEMES: ShareTheme[] = ['escuro', 'claro', 'transparente'];

function CardFrame({
  label,
  theme,
  children,
}: {
  label: string;
  theme: ShareTheme;
  children: ReactNode;
}) {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-sm font-semibold text-zinc-200 tracking-wide">{label}</h2>
      <div
        className="overflow-hidden rounded-2xl shadow-2xl ring-1 ring-white/10"
        style={{
          width: PREVIEW_WIDTH,
          height: PREVIEW_WIDTH,
          ...(theme === 'transparente' ? SHARE_TRANSPARENT_CHECKER : {}),
        }}
      >
        <div
          style={{
            width: SHARE_CARD.width,
            height: SHARE_CARD.height,
            transform: `scale(${PREVIEW_SCALE})`,
            transformOrigin: 'top left',
          }}
        >
          {children}
        </div>
      </div>
    </section>
  );
}

export function ShareCardsPreviewClient() {
  const [theme, setTheme] = useState<ShareTheme>('escuro');

  const durationFormatted = formatDuration(MOCK_DURATION_SECS);
  const workoutName = MOCK_WORKOUT_NAME.toUpperCase();

  const exerciseItems = useMemo(
    () =>
      MOCK_EXERCICIOS.map((ex) => ({
        name: ex.nome,
        sets: ex.series.filter((s) => s.completado).length || ex.series.length,
      })),
    [],
  );

  const receiptExercicios = useMemo(
    () =>
      MOCK_EXERCICIOS.filter((ex) => ex.series.some((s) => s.completado)).map((ex) => {
        const done = ex.series.filter((s) => s.completado);
        const pesos = done.map((s) => s.peso_atual ?? 0).filter((p) => p > 0);
        return {
          nome: ex.nome,
          series: done.length,
          cargaMax: pesos.length > 0 ? Math.max(...pesos) : 0,
        };
      }),
    [],
  );

  const gruposMusculares = useMemo(() => {
    const map: Record<string, number> = {};
    for (const ex of MOCK_EXERCICIOS) {
      if (!ex.grupo_muscular) continue;
      const n = ex.series.filter((s) => s.completado).length;
      if (n === 0) continue;
      map[ex.grupo_muscular] = (map[ex.grupo_muscular] ?? 0) + n;
    }
    return Object.entries(map)
      .map(([musculo, series]) => ({ musculo, series }))
      .sort((a, b) => b.series - a.series)
      .slice(0, 6);
  }, []);

  const shareProps = {
    workoutName,
    durationFormatted,
    volumeKg: MOCK_VOLUME,
    totalSets: MOCK_SETS,
    coachHandle: MOCK_COACH,
    theme,
    gender: 'male' as const,
  };

  const cards = [
    {
      id: 'pr',
      label: '1. PR — Recorde pessoal',
      render: () => (
        <PrCard
          exercicioNome="Supino Reto com Barra"
          cargaNova={110}
          cargaAnterior={105}
          prsCount={2}
          coachHandle={MOCK_COACH}
          theme={theme}
        />
      ),
    },
    {
      id: 'poster',
      label: '2. Anatomia',
      render: () => <WorkoutPosterCard {...shareProps} exercicios={MOCK_EXERCICIOS} />,
    },
    {
      id: 'pull',
      label: '3. Treino + anatomia',
      render: () => (
        <WorkoutMuscleListCard
          workoutName={workoutName}
          exercises={exerciseItems}
          exercicios={MOCK_EXERCICIOS}
          coachHandle={MOCK_COACH}
          theme={theme}
          gender="male"
        />
      ),
    },
    {
      id: 'metricas',
      label: '4. Métricas',
      render: () => <WorkoutSummaryCard {...shareProps} />,
    },
    {
      id: 'exercicios',
      label: '5. Exercícios',
      render: () => <WorkoutExercisesCard {...shareProps} exercises={exerciseItems} />,
    },
    {
      id: 'receipt',
      label: '6. Detalhes (receipt)',
      render: () => (
        <ReceiptCard
          workoutName={workoutName}
          exercicios={receiptExercicios}
          volumeTotal={MOCK_VOLUME}
          duracaoSegundos={MOCK_DURATION_SECS}
          coachHandle={MOCK_COACH}
          theme={theme}
        />
      ),
    },
    {
      id: 'muscles',
      label: '7. Volume por músculo',
      render: () => (
        <MuscleVolumeCard
          workoutName={workoutName}
          grupos={gruposMusculares}
          totalSeries={MOCK_SETS}
          duracaoSegundos={MOCK_DURATION_SECS}
          coachHandle={MOCK_COACH}
          theme={theme}
        />
      ),
    },
  ];

  return (
    <div className="min-h-screen bg-[#0a0f1e] text-white">
      <header className="sticky top-0 z-20 border-b border-white/10 bg-[#0a0f1e]/95 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-violet-400">
              Dev preview
            </p>
            <h1 className="text-lg font-bold tracking-tight">Cards compartilháveis</h1>
            <p className="mt-0.5 text-xs text-zinc-400">
              Dados fictícios · {MOCK_WORKOUT_NAME} · {MOCK_VOLUME.toLocaleString('pt-BR')} kg ·{' '}
              {durationFormatted} · {MOCK_SETS} séries · {MOCK_COACH}
            </p>
          </div>

          <div className="flex gap-2">
            {THEMES.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTheme(t)}
                className={cn(
                  'rounded-lg border px-3 py-2 text-xs font-semibold transition-colors',
                  theme === t
                    ? 'border-violet-500 bg-violet-500/15 text-violet-300'
                    : 'border-white/10 bg-white/5 text-zinc-400 hover:text-zinc-200',
                )}
              >
                {SHARE_THEME_LABELS[t]}
              </button>
            ))}
          </div>
        </div>
      </header>

      <main className="mx-auto grid max-w-6xl grid-cols-1 gap-10 px-4 py-8 sm:grid-cols-2 xl:grid-cols-3">
        {cards.map((card) => (
          <CardFrame key={card.id} label={card.label} theme={theme}>
            {card.render()}
          </CardFrame>
        ))}
      </main>

      <footer className="border-t border-white/10 px-4 py-6 text-center text-xs text-zinc-500">
        Rota apenas em desenvolvimento ·{' '}
        <a href="/api/auth/preview-email" className="text-violet-400 hover:underline">
          Preview de e-mails
        </a>
      </footer>
    </div>
  );
}
