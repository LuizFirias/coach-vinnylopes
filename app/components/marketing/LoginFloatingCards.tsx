'use client';

import { useMemo, type ReactNode } from 'react';
import { motion } from 'framer-motion';
import { Barbell } from '@phosphor-icons/react';
import { cn } from '@/lib/utils/cn';
import { DashboardKpiRow } from '@/app/components/dashboard/coach/DashboardKpiRow';
import { MrrChartCard, type MrrChartDatum } from '@/app/components/dashboard/coach/MrrChartCard';
import { WorkoutCard } from '@/app/components/dashboard/home/WorkoutCard';
import type { DiaSemana } from '@/app/components/dashboard/home/WeekCalendar';
import { dashboardColors } from '@/lib/tokens/dashboardColors';
import { getTodayBrazil } from '@/lib/dateUtils';

interface LoginFloatingCardsProps {
  className?: string;
}

const DEMO_MRR_CHART: MrrChartDatum[] = [
  { mes: 'Jan', receita: 2100, futuro: false },
  { mes: 'Fev', receita: 2350, futuro: false },
  { mes: 'Mar', receita: 2480, futuro: false },
  { mes: 'Abr', receita: 2620, futuro: false },
  { mes: 'Mai', receita: 2790, futuro: false },
  { mes: 'Jun', receita: 2910, futuro: false },
  { mes: 'Jul', receita: 3047, futuro: false },
  { mes: 'Ago', receita: 3200, futuro: true },
  { mes: 'Set', receita: 3350, futuro: true },
];

type DayStatus = 'done' | 'missed' | 'today' | 'rest' | 'upcoming' | 'none';

function getDayStatus(dia: DiaSemana, today: string): DayStatus {
  if (dia.isOff) return 'rest';
  if (dia.isHoje) {
    if (dia.treinoConcluido) return 'done';
    return 'today';
  }
  if (dia.data > today) return dia.temTreino ? 'upcoming' : 'none';
  if (dia.treinoConcluido) return 'done';
  if (dia.temTreino) return 'missed';
  return 'none';
}

function buildDemoWeek(): { dias: DiaSemana[]; today: string } {
  const today = new Date();
  const dayOfWeek = today.getDay();
  const monday = new Date(today);
  monday.setDate(today.getDate() - ((dayOfWeek + 6) % 7));

  const labels = ['SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB', 'DOM'];
  const demoFlags = [
    { temTreino: true, treinoConcluido: true, isOff: false, nomeRotina: 'Upper A' },
    { temTreino: true, treinoConcluido: true, isOff: false, nomeRotina: 'Lower A' },
    { temTreino: false, treinoConcluido: false, isOff: true },
    { temTreino: true, treinoConcluido: false, isOff: false, nomeRotina: 'Push' },
    { temTreino: true, treinoConcluido: false, isOff: false, nomeRotina: 'Pull' },
    { temTreino: true, treinoConcluido: false, isOff: false, nomeRotina: 'Legs' },
    { temTreino: false, treinoConcluido: false, isOff: true },
  ];

  const tIso = getTodayBrazil();
  const dias: DiaSemana[] = [];

  for (let i = 0; i < 7; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const isoDate = `${year}-${month}-${day}`;
    const flags = demoFlags[i];

    dias.push({
      data: isoDate,
      label: labels[i],
      numero: d.getDate(),
      isHoje: isoDate === tIso,
      temTreino: flags.temTreino,
      treinoConcluido: flags.treinoConcluido,
      isOff: flags.isOff,
      nomeRotina: flags.nomeRotina,
      fichaId: flags.temTreino ? 'demo-ficha' : undefined,
    });
  }

  return { dias, today: tIso };
}

function DayGlyph({ status }: { status: DayStatus }) {
  if (status === 'none') return <div className="h-[14px]" />;
  if (status === 'rest') {
    return (
      <span
        className="block leading-none italic select-none"
        style={{
          fontSize: 9,
          fontWeight: 700,
          color: dashboardColors.calRest,
          letterSpacing: '-0.5px',
        }}
        aria-hidden
      >
        zzz
      </span>
    );
  }

  const color =
    status === 'done'
      ? dashboardColors.calDone
      : status === 'missed'
        ? dashboardColors.calMissed
        : status === 'today'
          ? dashboardColors.calToday
          : dashboardColors.calUpcoming;

  return <Barbell size={14} weight="bold" color={color} aria-hidden />;
}

/** Grade só com os campos dos dias — sem container branco entre eles */
function LoginWeekDays({ dias, today }: { dias: DiaSemana[]; today: string }) {
  return (
    <div className="flex items-stretch gap-1.5">
      {dias.map((dia) => {
        const status = getDayStatus(dia, today);
        return (
          <div
            key={dia.data}
            className={cn(
              'flex w-[44px] min-h-[64px] flex-col items-center justify-between gap-1 rounded-[12px] px-0.5 py-2',
              'shadow-[0_8px_20px_rgba(0,0,0,0.28)]',
            )}
            style={
              dia.isHoje
                ? {
                    backgroundColor: 'rgba(147, 51, 234, 0.18)',
                    border: `1.5px solid ${dashboardColors.calToday}`,
                  }
                : {
                    backgroundColor: '#111827',
                    border: '1px solid transparent',
                  }
            }
          >
            <span
              className="text-[9px] font-semibold uppercase tracking-wide leading-none"
              style={{ color: dia.isHoje ? 'rgba(255,255,255,0.7)' : '#6b7280' }}
            >
              {dia.label}
            </span>
            <span
              className="text-[13px] font-bold leading-none tabular-nums lining-nums"
              style={{
                color: dia.isHoje ? '#fff' : '#D8DCE6',
                letterSpacing: '-0.02em',
              }}
            >
              {dia.numero}
            </span>
            <DayGlyph status={status} />
          </div>
        );
      })}
    </div>
  );
}

function FloatSlot({
  children,
  className,
  delay = 0,
  duration = 5.5,
  amplitude = 10,
  scale = 0.58,
  origin = 'top left',
  /** Clip arredondado — evita “pontas” brancas no bounding box da sombra */
  clipClassName = 'rounded-2xl overflow-hidden',
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
  duration?: number;
  amplitude?: number;
  scale?: number;
  origin?: string;
  clipClassName?: string | false;
}) {
  return (
    <motion.div
      className={cn('absolute', className)}
      animate={{ y: [0, -amplitude, 0] }}
      transition={{
        duration,
        delay,
        repeat: Infinity,
        ease: 'easeInOut',
      }}
    >
      <div
        className={cn(clipClassName !== false && clipClassName)}
        style={{
          transform: `scale(${scale})`,
          transformOrigin: origin,
          filter: 'drop-shadow(0 18px 36px rgba(0,0,0,0.28))',
        }}
      >
        {children}
      </div>
    </motion.div>
  );
}

export function LoginFloatingCards({ className }: LoginFloatingCardsProps) {
  const { dias, today } = useMemo(() => buildDemoWeek(), []);

  return (
    <div
      className={cn(
        'relative w-full h-full min-h-[600px] select-none pointer-events-none overflow-hidden',
        className,
      )}
    >
      {/* Coach — Visão geral */}
      <FloatSlot
        className="top-[4%] left-[1%] -rotate-[2deg]"
        delay={0}
        duration={6}
        amplitude={9}
        scale={0.52}
        origin="top left"
        clipClassName="rounded-2xl overflow-hidden"
      >
        <div className="w-[420px] rounded-2xl bg-[#080c14] p-3">
          <DashboardKpiRow
            activeStudents={47}
            mrr={3047}
            studentsAtRisk={2}
            pendingCheckIns={5}
            activeStudentsSubtitle="+3 este mês"
            mrrDeltaPercent={12}
            compact
          />
        </div>
      </FloatSlot>

      {/* Calendário — apenas campos dos dias, separados */}
      <FloatSlot
        className="top-[12%] right-[1%] rotate-[2deg]"
        delay={0.8}
        duration={5.4}
        amplitude={11}
        scale={0.72}
        origin="top right"
        clipClassName={false}
      >
        <LoginWeekDays dias={dias} today={today} />
      </FloatSlot>

      {/* Treino de hoje */}
      <FloatSlot
        className="top-[52%] left-[2%] -rotate-[1.5deg]"
        delay={1.4}
        duration={5.8}
        amplitude={8}
        scale={0.56}
        origin="top left"
        clipClassName="rounded-[20px] overflow-hidden"
      >
        <div
          className="dashboard-aluno w-[340px] rounded-[20px] overflow-hidden [&_.dashboard-card]:mx-0 [&_.dashboard-card]:mt-0 [&_.dashboard-card]:rounded-[20px] [&_.dashboard-card]:border-0 [&_.dashboard-card]:shadow-none"
          style={{
            background: 'transparent',
            // inline no .dashboard-aluno vence o tema light do globals.css
            ['--dash-bg' as string]: 'transparent',
            ['--dash-hero-from' as string]: '#0a1628',
            ['--dash-hero-to' as string]: '#0f1f3d',
            ['--dash-card' as string]: '#111827',
            ['--dash-text' as string]: '#D8DCE6',
            ['--dash-text-muted' as string]: '#9ca3af',
            ['--dash-text-subtle' as string]: '#6b7280',
          }}
        >
          <WorkoutCard
            status="pendente"
            nome="Lower A"
            fichaId="demo-ficha"
            qtdExercicios={8}
          />
        </div>
      </FloatSlot>

      {/* Gráfico MRR */}
      <FloatSlot
        className="top-[54%] right-[0%] rotate-[1.5deg]"
        delay={2}
        duration={6.2}
        amplitude={10}
        scale={0.52}
        origin="top right"
        clipClassName="rounded-xl overflow-hidden"
      >
        <div className="w-[420px] rounded-xl overflow-hidden [&_.coach-mrr-card]:overflow-hidden [&_.coach-mrr-card]:border-0 [&_.coach-mrr-card]:shadow-none [&_.glass-panel-shine-line]:hidden">
          <MrrChartCard currentMrr={3047} chartData={DEMO_MRR_CHART} />
        </div>
      </FloatSlot>
    </div>
  );
}
