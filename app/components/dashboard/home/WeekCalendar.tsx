'use client';

import { useCallback, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Barbell, CaretLeft, CaretRight } from '@phosphor-icons/react';
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

/** Tempo de long-press para entrar no modo edição (ms) */
const LONG_PRESS_MS = 1000;
/** Escala do card durante o hold */
const PRESS_SCALE = 1.2;

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
  /** Controla o modo edição de fora (ex.: fechar junto com o picker) */
  editModeExternal?: boolean;
  onEditModeChange?: (editing: boolean) => void;
  /** Só a grade de dias — sem header, footer ou margem (ex.: login marketing) */
  daysOnly?: boolean;
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
  daysOnly = false,
}: WeekCalendarProps) {
  const [editModeInternal, setEditModeInternal] = useState(false);
  const isEditing = editModeExternal ?? editModeInternal;

  const setEditing = useCallback(
    (next: boolean) => {
      if (editModeExternal === undefined) setEditModeInternal(next);
      onEditModeChange?.(next);
    },
    [editModeExternal, onEditModeChange],
  );

  const [pressingData, setPressingData] = useState<string | null>(null);
  const pressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longPressFiredRef = useRef(false);
  const pressStartPosRef = useRef<{ x: number; y: number } | null>(null);

  const clearPress = useCallback(() => {
    if (pressTimerRef.current != null) {
      clearTimeout(pressTimerRef.current);
      pressTimerRef.current = null;
    }
    setPressingData(null);
    pressStartPosRef.current = null;
  }, []);

  const startPress = useCallback(
    (dia: DiaSemana, clientX: number, clientY: number) => {
      longPressFiredRef.current = false;
      pressStartPosRef.current = { x: clientX, y: clientY };
      setPressingData(dia.data);

      pressTimerRef.current = setTimeout(() => {
        longPressFiredRef.current = true;
        pressTimerRef.current = null;
        setPressingData(null);
        pressStartPosRef.current = null;

        // Long-press: entra no modo edição (como o lápis antigo)
        onSelectDia(dia);
        setEditing(true);

        try {
          navigator.vibrate?.(10);
        } catch {
          /* ignore */
        }
      }, LONG_PRESS_MS);
    },
    [onSelectDia, setEditing],
  );

  return (
    <>
      {isEditing && !daysOnly && (
        <motion.button
          type="button"
          aria-label="Sair do modo edição"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-40 cursor-default border-0"
          style={{
            background: 'rgba(0, 0, 0, 0.55)',
            backdropFilter: 'blur(2px)',
            WebkitBackdropFilter: 'blur(2px)',
            touchAction: 'manipulation',
          }}
          onClick={() => setEditing(false)}
        />
      )}

      <motion.div
        initial={daysOnly ? false : { opacity: 0, y: 16 }}
        animate={{
          opacity: 1,
          y: 0,
          scale: isEditing ? 1.035 : 1,
        }}
        transition={{
          delay: isEditing || daysOnly ? 0 : 0.15,
          type: 'spring',
          stiffness: 280,
          damping: 22,
        }}
        className={cn(
          'relative origin-center',
          daysOnly ? 'mx-0' : 'mx-4',
          isEditing ? 'z-50' : 'z-10',
        )}
      >
      {!daysOnly && (
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

        <div className="flex flex-col items-center gap-0.5">
          <p className="text-[11px] font-medium dashboard-text-subtle">{weekLabel}</p>
          {isEditing && (
            <button
              type="button"
              onClick={() => setEditing(false)}
              className="text-[10px] font-medium text-brand"
              style={{ touchAction: 'manipulation' }}
            >
              Pronto
            </button>
          )}
        </div>

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
      )}

      <div className="grid grid-cols-7 gap-1.5">
        {diasSemana.map((dia) => {
          const status = getDayStatus(dia, today);
          const isSelected = selectedDia?.data === dia.data;
          const isPressing = pressingData === dia.data;

          return (
            <motion.button
              key={dia.data}
              type="button"
              onPointerDown={(e) => {
                if (e.button !== 0) return;
                // Só inicia long-press para entrar no modo (não para sair)
                if (!isEditing) startPress(dia, e.clientX, e.clientY);
              }}
              onPointerUp={clearPress}
              onPointerCancel={clearPress}
              onPointerLeave={clearPress}
              onPointerMove={(e) => {
                const start = pressStartPosRef.current;
                if (!start || pressTimerRef.current == null) return;
                const dx = Math.abs(e.clientX - start.x);
                const dy = Math.abs(e.clientY - start.y);
                if (dx > 10 || dy > 10) clearPress();
              }}
              onClick={() => {
                if (longPressFiredRef.current) {
                  longPressFiredRef.current = false;
                  return;
                }
                onSelectDia(dia);
                if (isEditing) {
                  const dateObj = new Date(`${dia.data}T12:00:00`);
                  onEditDay(dateObj.getDay());
                }
              }}
              animate={{
                scale: isPressing ? PRESS_SCALE : 1,
                zIndex: isPressing ? 8 : 0,
              }}
              transition={{
                scale: {
                  duration: isPressing ? LONG_PRESS_MS / 1000 : 0.18,
                  ease: isPressing ? 'easeOut' : 'easeInOut',
                },
                zIndex: { duration: 0 },
              }}
              className={cn(
                'relative flex flex-col items-center justify-between gap-1',
                'rounded-[12px] py-2 px-0.5',
                'cursor-pointer select-none',
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
                isPressing && 'shadow-[0_8px_24px_rgba(147,51,234,0.25)]',
              )}
              style={
                dia.isHoje
                  ? {
                      backgroundColor: 'var(--dash-today-bg)',
                      border: `1.5px solid ${dashboardColors.calToday}`,
                      touchAction: 'manipulation',
                      WebkitUserSelect: 'none',
                      userSelect: 'none',
                    }
                  : {
                      touchAction: 'manipulation',
                      WebkitUserSelect: 'none',
                      userSelect: 'none',
                    }
              }
              aria-current={dia.isHoje ? 'date' : undefined}
              aria-pressed={isSelected}
              aria-label={
                isEditing
                  ? `${dia.label} ${dia.numero}. Toque para configurar`
                  : `${dia.label} ${dia.numero}. Segure para editar a semana`
              }
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
            </motion.button>
          );
        })}
      </div>

      {!daysOnly && selectedDia && (
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
    </>
  );
}
