'use client';

import { motion } from 'framer-motion';
import { CaretLeft, CaretRight } from '@phosphor-icons/react';
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

function getDotColor(status: DayStatus): string | null {
  const map: Record<DayStatus, string | null> = {
    done: dashboardColors.calDone,
    missed: dashboardColors.calMissed,
    today: dashboardColors.calToday,
    rest: dashboardColors.calRest,
    upcoming: null,
    none: null,
  };
  return map[status];
}

function DayDot({ status }: { status: DayStatus }) {
  const color = getDotColor(status);
  if (!color) return <div className="mt-0.5 h-1.5" />;
  return (
    <span
      className="mt-0.5 block h-[5px] w-[5px] rounded-full"
      style={{ backgroundColor: color }}
    />
  );
}

function toTitleCase(str: string) {
  return str.replace(/\w\S*/g, (txt) => txt.charAt(0).toUpperCase() + txt.slice(1).toLowerCase());
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
}

export function WeekCalendar({
  diasSemana,
  weekLabel,
  today,
  selectedDia,
  onWeekChange,
  onSelectDia,
  onEditDay,
}: WeekCalendarProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.15, type: 'spring', stiffness: 260, damping: 24 }}
      className="dashboard-card mx-4 rounded-[20px] border p-4"
    >
      <div className="mb-3 flex items-center justify-between">
        <button
          id="btn-semana-anterior"
          type="button"
          onClick={() => onWeekChange(-1)}
          className="flex h-6 w-6 items-center justify-center"
          aria-label="Semana anterior"
        >
          <CaretLeft className="h-4 w-4 dashboard-text-subtle" />
        </button>
        <p className="text-[11px] font-medium dashboard-text-subtle">{weekLabel}</p>
        <button
          id="btn-proxima-semana"
          type="button"
          onClick={() => onWeekChange(1)}
          className="flex h-6 w-6 items-center justify-center"
          aria-label="Próxima semana"
        >
          <CaretRight className="h-4 w-4 dashboard-text-subtle" />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1">
        {diasSemana.map((dia) => {
          const status = getDayStatus(dia, today);
          const isSelected = selectedDia?.data === dia.data;

          return (
            <button
              key={dia.data}
              type="button"
              onClick={() => onSelectDia(dia)}
              className="flex flex-col items-center gap-1"
            >
              <p className="text-[9px] font-medium uppercase dashboard-text-subtle">{dia.label}</p>
              <div
                className={cn(
                  'flex h-9 w-8 flex-col items-center justify-center rounded-[10px] transition-colors',
                  dia.isHoje && 'border-[1.5px] font-bold',
                  !dia.isHoje && isSelected && 'bg-[var(--dash-selected-day-bg)]',
                )}
                style={
                  dia.isHoje
                    ? {
                        backgroundColor: 'var(--dash-today-bg)',
                        borderColor: dashboardColors.calToday,
                        color: 'var(--dash-text)',
                      }
                    : undefined
                }
              >
                <span className="text-[11px] font-semibold dashboard-text">{dia.numero}</span>
              </div>
              <DayDot status={status} />
            </button>
          );
        })}
      </div>

      {selectedDia && (
        <div className="mt-3 flex items-center justify-between border-t border-[var(--dash-card-border)] pt-3">
          <div className="min-w-0 pr-2">
            <p className="text-[11px] font-medium dashboard-text-subtle">
              {selectedDia.isOff ? (
                'Descanso'
              ) : selectedDia.nomeRotina ? (
                <>
                  {toTitleCase(selectedDia.nomeRotina)}
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
          <button
            type="button"
            onClick={() => {
              const dateObj = new Date(`${selectedDia.data}T12:00:00`);
              onEditDay(dateObj.getDay());
            }}
            className="shrink-0 text-[10px] font-bold uppercase tracking-wider dashboard-text-muted hover:opacity-80"
          >
            Alterar
          </button>
        </div>
      )}
    </motion.div>
  );
}
