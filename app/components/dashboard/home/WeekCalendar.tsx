'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Barbell, CaretLeft, CaretRight, PencilSimple } from '@phosphor-icons/react';
import { cn } from '@/lib/utils/cn';
import { dashboardColors } from '@/lib/tokens/dashboardColors';

export type DayStatus = 'done' | 'missed' | 'today' | 'rest' | 'upcoming' | 'none';

export interface DiaSemana {
  data: string;
  label: string;
  numero: number;
  isHoje: boolean;
  treinoConcluido: boolean;
  temTreino: boolean;
  isOff?: boolean;
  nomeRotina?: string;
  fichaId?: string;
  treinoPdfId?: string;
}

function getDayStatus(dia: DiaSemana, today: string): DayStatus {
  if (dia.isOff) return 'rest';
  if (dia.isHoje) {
    if (dia.treinoConcluido) return 'done';
    return 'today';
  }
  if (dia.data > today) {
    return dia.temTreino ? 'upcoming' : 'none';
  }
  if (dia.treinoConcluido) return 'done';
  if (dia.temTreino) return 'missed';
  return 'none';
}

/** Cor do CONTORNO do ícone de treino, por status */
const workoutIconStroke: Record<DayStatus, string | null> = {
  done: dashboardColors.calDone,
  missed: dashboardColors.calMissed,
  today: dashboardColors.calToday,
  upcoming: dashboardColors.calUpcoming,
  rest: null,
  none: null,
};

function DayIcon({ status }: { status: DayStatus }) {
  if (status === 'none') {
    return <div className="h-[14px]" />;
  }

  if (status === 'rest') {
    return (
      <span
        className="block leading-none"
        style={{
          fontSize: 9,
          fontWeight: 700,
          color: dashboardColors.calRest,
          letterSpacing: '-0.5px',
          fontStyle: 'italic',
          userSelect: 'none',
        }}
        aria-hidden="true"
      >
        zzz
      </span>
    );
  }

  const strokeColor = workoutIconStroke[status] ?? dashboardColors.calUpcoming;

  return (
    <Barbell
      size={14}
      weight="bold"
      color={strokeColor}
      aria-hidden="true"
    />
  );
}

interface WeekCalendarProps {
  diasSemana: DiaSemana[];
  weekOffset: number;
  weekLabel: string;
  today: string;
  selectedDia: DiaSemana | null;
  onWeekChange: (delta: number) => void;
  onSelectDia: (dia: DiaSemana) => void;
  onEditDay: (jsDay: number) => void;
  /** Sai do modo edição quando o picker fecha (opcional) */
  editModeExternal?: boolean;
  onEditModeChange?: (editing: boolean) => void;
}

export function WeekCalendar({
  diasSemana,
  weekLabel,
  today,
  selectedDia,
  onWeekChange,
  onSelectDia,
  onEditDay,
  editModeExternal,
  onEditModeChange,
}: WeekCalendarProps) {
  const [editModeInternal, setEditModeInternal] = useState(false);
  const isEditing = editModeExternal ?? editModeInternal;

  const setEditing = (next: boolean) => {
    if (editModeExternal === undefined) setEditModeInternal(next);
    onEditModeChange?.(next);
  };

  const toggleEditMode = () => setEditing(!isEditing);

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{
        opacity: 1,
        y: 0,
        scale: isEditing ? 1.035 : 1,
      }}
      transition={{
        delay: isEditing ? 0 : 0.15,
        type: 'spring',
        stiffness: 280,
        damping: 22,
      }}
      className="relative z-10 mx-4 origin-center"
    >
      <div className="mb-2 flex items-center justify-between">
        <button
          id="btn-semana-anterior"
          type="button"
          onClick={() => onWeekChange(-1)}
          className="flex h-6 w-6 items-center justify-center"
          style={{ touchAction: 'manipulation' }}
          aria-label="Semana anterior"
        >
          <CaretLeft className="h-4 w-4 dashboard-text-subtle" />
        </button>
        <p className="text-[11px] font-medium dashboard-text-subtle">{weekLabel}</p>
        <div className="flex items-center gap-0.5">
          <button
            type="button"
            onClick={toggleEditMode}
            className={cn(
              'flex h-6 w-6 items-center justify-center rounded-md transition-colors',
              isEditing ? 'text-brand bg-brand/10' : 'dashboard-text-subtle',
            )}
            style={{ touchAction: 'manipulation' }}
            aria-label={isEditing ? 'Sair do modo edição' : 'Editar agenda'}
            aria-pressed={isEditing}
          >
            <PencilSimple className="h-3.5 w-3.5" weight={isEditing ? 'fill' : 'regular'} />
          </button>
          <button
            id="btn-proxima-semana"
            type="button"
            onClick={() => onWeekChange(1)}
            className="flex h-6 w-6 items-center justify-center"
            style={{ touchAction: 'manipulation' }}
            aria-label="Próxima semana"
          >
            <CaretRight className="h-4 w-4 dashboard-text-subtle" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-1.5">
        {diasSemana.map((dia) => {
          const status = getDayStatus(dia, today);
          const isSelected = selectedDia?.data === dia.data;

          return (
            <button
              key={dia.data}
              type="button"
              onClick={() => {
                onSelectDia(dia);
                if (isEditing) {
                  const dateObj = new Date(`${dia.data}T12:00:00`);
                  onEditDay(dateObj.getDay());
                }
              }}
              className={cn(
                'flex flex-col items-center justify-between gap-1',
                'rounded-[12px] py-2 px-0.5',
                'transition-all duration-[var(--duration-fast)] cursor-pointer',
                'min-h-[64px]',
                !dia.isHoje && !isSelected && [
                  'bg-[var(--dash-day-card-bg,var(--dash-card))]',
                  'border border-transparent',
                ],
                !dia.isHoje && isSelected && [
                  'bg-[var(--dash-selected-day-bg)]',
                  'border border-[rgba(147, 51, 234,0.2)]',
                ],
                isEditing && isSelected && 'ring-1 ring-brand/50',
              )}
              style={
                dia.isHoje
                  ? {
                      backgroundColor: 'var(--dash-today-bg)',
                      border: `1.5px solid ${dashboardColors.calToday}`,
                      touchAction: 'manipulation',
                    }
                  : { touchAction: 'manipulation' }
              }
              aria-current={dia.isHoje ? 'date' : undefined}
              aria-pressed={isSelected}
            >
              <span
                className={cn(
                  'text-[9px] font-semibold uppercase tracking-wide leading-none',
                  dia.isHoje ? 'text-white/70' : 'dashboard-text-subtle',
                )}
              >
                {dia.label}
              </span>

              <span
                className={cn(
                  'text-[13px] font-bold leading-none tabular-nums lining-nums',
                  dia.isHoje ? 'text-white' : 'dashboard-text',
                  isSelected && !dia.isHoje && 'text-brand',
                )}
                style={{ letterSpacing: 'var(--tracking-display, -0.02em)' }}
              >
                {dia.numero}
              </span>

              <DayIcon status={status} />
            </button>
          );
        })}
      </div>

      {selectedDia && (
        <div className="mt-0.2 border-t border-[var(--dash-card-border)] pt-1.5">
          <p className="text-[9px] font-medium leading-tight dashboard-text-subtle">
            {selectedDia.isOff ? (
              'Descanso'
            ) : selectedDia.nomeRotina ? (
              <>
                <span className="uppercase">{selectedDia.nomeRotina}</span>
                {selectedDia.treinoConcluido ? (
                  <span className="font-semibold text-emerald-500"> · Concluído</span>
                ) : selectedDia.isHoje ? (
                  <span className="font-semibold text-blue-500"> · Hoje</span>
                ) : selectedDia.data > today ? (
                  <span> · Programado</span>
                ) : (
                  <span className="font-semibold text-orange-500"> · Não realizado</span>
                )}
              </>
            ) : (
              'Sem treino programado'
            )}
          </p>
        </div>
      )}
    </motion.div>
  );
}
