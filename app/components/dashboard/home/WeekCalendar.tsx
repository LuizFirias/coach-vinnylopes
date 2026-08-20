'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Barbell, Heartbeat, PencilSimple } from '@phosphor-icons/react';
import { cn } from '@/lib/utils/cn';
import { dashboardColors } from '@/lib/tokens/dashboardColors';

export type DayStatus = 'done' | 'missed' | 'today' | 'rest' | 'upcoming';

export interface DiaSemana {
  data: string;
  label: string;
  /** Mês abreviado (ex.: "AGO") — usado no badge estilo Gympass */
  mesLabel?: string;
  numero: number;
  isHoje: boolean;
  treinoConcluido: boolean;
  temTreino: boolean;
  isOff?: boolean;
  /** Dia marcado como cardio (sem ficha vinculada) */
  isCardio?: boolean;
  nomeRotina?: string;
  fichaId?: string;
  treinoPdfId?: string;
}

/**
 * Dias sem treino nem cardio atribuído (explicitamente "isOff" ou simplesmente
 * sem plano) são tratados como descanso — não há "vazio" no calendário.
 */
function getDayStatus(dia: DiaSemana, today: string): DayStatus {
  if (!dia.temTreino && !dia.isCardio) return 'rest';
  if (dia.isHoje) {
    return dia.treinoConcluido ? 'done' : 'today';
  }
  if (dia.data > today) return 'upcoming';
  if (dia.treinoConcluido) return 'done';
  return 'missed';
}

const badgeColor: Record<DayStatus, string> = {
  done: dashboardColors.calDone,
  missed: dashboardColors.calMissed,
  today: dashboardColors.calToday,
  upcoming: dashboardColors.calUpcoming,
  rest: dashboardColors.calRest,
};

function statusLabel(status: DayStatus) {
  if (status === 'done') return { text: 'Concluído', className: 'text-emerald-500' };
  if (status === 'today') return { text: 'Hoje', className: 'text-blue-500' };
  if (status === 'missed') return { text: 'Não realizado', className: 'text-orange-500' };
  if (status === 'upcoming') return { text: 'Programado', className: 'dashboard-text-subtle' };
  return { text: '', className: 'dashboard-text-subtle' };
}

interface WeekCalendarProps {
  diasSemana: DiaSemana[];
  today: string;
  selectedDia: DiaSemana | null;
  onSelectDia: (dia: DiaSemana) => void;
  onEditDay: (jsDay: number) => void;
  /** Controla o modo edição de fora (ex.: fechar junto com o picker) */
  editModeExternal?: boolean;
  onEditModeChange?: (editing: boolean) => void;
}

export function WeekCalendar({
  diasSemana,
  today,
  selectedDia,
  onSelectDia,
  onEditDay,
  editModeExternal,
  onEditModeChange,
}: WeekCalendarProps) {
  const [editModeInternal, setEditModeInternal] = useState(false);
  const isEditing = editModeExternal ?? editModeInternal;
  const scrollRef = useRef<HTMLDivElement>(null);

  const setEditing = useCallback(
    (next: boolean) => {
      if (editModeExternal === undefined) setEditModeInternal(next);
      onEditModeChange?.(next);
    },
    [editModeExternal, onEditModeChange],
  );

  // Sempre volta pro início da lista ao montar — evita que o navegador restaure
  // uma posição de scroll antiga ao sair e voltar pro app (bfcache).
  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollLeft = 0;
  }, []);

  return (
    <>
      {isEditing && (
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
        className={cn('relative origin-center mx-4', isEditing ? 'z-50' : 'z-10')}
      >
        <div className="mb-2 flex items-center justify-between">
          <p className="text-[11px] font-semibold uppercase tracking-wide dashboard-text-subtle">
            Agenda
          </p>
          {isEditing ? (
            <button
              type="button"
              onClick={() => setEditing(false)}
              className="text-[11px] font-semibold text-brand"
              style={{ touchAction: 'manipulation' }}
            >
              Pronto
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setEditing(true)}
              aria-label="Editar agenda"
              className="flex h-6 w-6 items-center justify-center"
              style={{ touchAction: 'manipulation' }}
            >
              <PencilSimple size={14} weight="bold" className="dashboard-text-subtle" />
            </button>
          )}
        </div>

        <div ref={scrollRef} className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
          {diasSemana.map((dia) => {
            const status = getDayStatus(dia, today);
            const isSelected = selectedDia?.data === dia.data;
            // Só treino ou cardio estendem o card — descanso (explícito ou "sem plano") fica compacto
            const hasContent = dia.temTreino || dia.isCardio;

            const commonProps = {
              type: 'button' as const,
              onClick: () => {
                onSelectDia(dia);
                if (isEditing) {
                  const dateObj = new Date(`${dia.data}T12:00:00`);
                  onEditDay(dateObj.getDay());
                }
              },
              'aria-current': dia.isHoje ? ('date' as const) : undefined,
              'aria-pressed': isSelected,
              'aria-label': isEditing
                ? `${dia.label} ${dia.numero}. Toque para configurar`
                : `${dia.label} ${dia.numero}`,
              style: {
                touchAction: 'manipulation' as const,
                WebkitUserSelect: 'none' as const,
                userSelect: 'none' as const,
              },
            };

            if (!hasContent) {
              // Dia sem treino: tom neutro do card (claro no tema light), só "zzz" discreto.
              // Só o dia atual sem nada agendado ganha um pequeno destaque roxo.
              return (
                <motion.button
                  key={dia.data}
                  {...commonProps}
                  className={cn(
                    'relative flex min-h-[70px] w-[60px] shrink-0 flex-col items-center justify-center gap-0.5 rounded-[14px] py-2',
                    'cursor-pointer select-none bg-[var(--dash-day-card-bg,var(--dash-card))]',
                    dia.isHoje ? 'border border-brand/40' : 'border border-[var(--dash-card-border)]',
                    isEditing && isSelected && 'ring-1 ring-brand/50',
                  )}
                >
                  {dia.mesLabel && (
                    <span className="text-[8px] font-semibold uppercase leading-none tracking-wide dashboard-text-subtle">
                      {dia.mesLabel}
                    </span>
                  )}
                  <span
                    className="text-[16px] font-extrabold leading-none tabular-nums lining-nums dashboard-text"
                    style={{ letterSpacing: 'var(--tracking-display, -0.02em)' }}
                  >
                    {dia.numero}
                  </span>
                  <span className="text-[8px] font-semibold uppercase leading-none tracking-wide dashboard-text-subtle">
                    {dia.label}
                  </span>
                  <span
                    className="mt-0.5 text-[7px] font-bold italic leading-none dashboard-text-subtle"
                    style={{ letterSpacing: '-0.5px' }}
                    aria-hidden="true"
                  >
                    zzz
                  </span>
                </motion.button>
              );
            }

            const color = badgeColor[status];
            const info = statusLabel(status);

            return (
              <motion.button
                key={dia.data}
                {...commonProps}
                className={cn(
                  'relative flex min-h-[70px] min-w-[168px] shrink-0 items-stretch overflow-hidden rounded-[14px]',
                  'cursor-pointer select-none border border-[var(--dash-card-border)]',
                  isEditing && isSelected && 'ring-1 ring-brand/50',
                )}
              >
                <div
                  className="flex w-[52px] shrink-0 flex-col items-center justify-center gap-0.5 rounded-l-[14px] py-2"
                  style={{ backgroundColor: color, color: '#fff' }}
                >
                  {dia.mesLabel && (
                    <span className="text-[8px] font-bold uppercase tracking-wide leading-none opacity-80">
                      {dia.mesLabel}
                    </span>
                  )}
                  <span
                    className="text-[16px] font-extrabold leading-none tabular-nums lining-nums"
                    style={{ letterSpacing: 'var(--tracking-display, -0.02em)' }}
                  >
                    {dia.numero}
                  </span>
                  <span className="text-[8px] font-semibold uppercase tracking-wide leading-none opacity-80">
                    {dia.label}
                  </span>
                </div>

                <div className="flex min-w-0 flex-1 flex-col justify-center gap-0.5 rounded-r-[14px] bg-[var(--dash-day-card-bg,var(--dash-card))] px-2.5 py-2">
                  <p className="truncate text-[11px] font-semibold uppercase leading-tight dashboard-text">
                    {dia.temTreino ? dia.nomeRotina || '—' : 'Cardio'}
                  </p>
                  {info.text && (
                    <p className={cn('flex items-center gap-1 text-[9px] font-medium leading-none', info.className)}>
                      {dia.temTreino ? (
                        <Barbell size={9} weight="bold" />
                      ) : (
                        <Heartbeat size={9} weight="bold" />
                      )}
                      {info.text}
                    </p>
                  )}
                </div>
              </motion.button>
            );
          })}
        </div>
      </motion.div>
    </>
  );
}
