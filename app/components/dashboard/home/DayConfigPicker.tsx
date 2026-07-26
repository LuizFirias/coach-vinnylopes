'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Check, Moon, X } from '@phosphor-icons/react';
import { cn } from '@/lib/utils/cn';
import type { DiaSemana } from './WeekCalendar';

export interface DayConfigWorkoutOption {
  id: string;
  name: string;
  type: 'ficha' | 'pdf' | 'manual';
}

type PickerItem =
  | { kind: 'status'; value: 'done' | 'missed'; label: string }
  | { kind: 'rest'; label: string }
  | { kind: 'workout'; option: DayConfigWorkoutOption; label: string };

interface DayConfigPickerProps {
  open: boolean;
  jsDay: number;
  dia: DiaSemana | null;
  today: string;
  workouts: DayConfigWorkoutOption[];
  saving?: boolean;
  onClose: () => void;
  onSelectRest: () => void;
  onSelectWorkout: (option: DayConfigWorkoutOption) => void;
  onSelectStatus?: (status: 'done' | 'missed') => void;
}

const DAY_NAMES = [
  'Domingo',
  'Segunda-feira',
  'Terça-feira',
  'Quarta-feira',
  'Quinta-feira',
  'Sexta-feira',
  'Sábado',
];

const ITEM_H = 44;

export function DayConfigPicker({
  open,
  jsDay,
  dia,
  today,
  workouts,
  saving = false,
  onClose,
  onSelectRest,
  onSelectWorkout,
  onSelectStatus,
}: DayConfigPickerProps) {
  const listRef = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);

  const canChangeStatus = Boolean(
    dia &&
      !dia.isOff &&
      dia.temTreino &&
      dia.data <= today &&
      onSelectStatus,
  );

  const items = useMemo<PickerItem[]>(() => {
    const list: PickerItem[] = [];
    if (canChangeStatus) {
      list.push(
        { kind: 'status', value: 'done', label: 'Treino realizado' },
        { kind: 'status', value: 'missed', label: 'Não realizado' },
      );
    }
    list.push({ kind: 'rest', label: 'Descanso' });
    for (const w of workouts) {
      list.push({ kind: 'workout', option: w, label: w.name });
    }
    return list;
  }, [canChangeStatus, workouts]);

  useEffect(() => {
    if (!open) return;
    let initial = 0;
    if (canChangeStatus && dia) {
      initial = dia.treinoConcluido ? 0 : 1;
    } else if (dia?.isOff) {
      initial = canChangeStatus ? 2 : 0;
    } else if (dia?.fichaId || dia?.treinoPdfId) {
      const start = canChangeStatus ? 2 : 0;
      const idx = items.findIndex(
        (it) =>
          it.kind === 'workout' &&
          ((dia.fichaId && it.option.id === dia.fichaId) ||
            (dia.treinoPdfId && it.option.id === dia.treinoPdfId)),
      );
      initial = idx >= 0 ? idx : start;
    }
    setIndex(Math.max(0, Math.min(initial, items.length - 1)));
  }, [open, canChangeStatus, dia, items]);

  useEffect(() => {
    if (!open || !listRef.current) return;
    listRef.current.scrollTo({ top: index * ITEM_H, behavior: 'smooth' });
  }, [open, index]);

  if (!open) return null;

  const handleScroll = () => {
    const el = listRef.current;
    if (!el) return;
    const next = Math.round(el.scrollTop / ITEM_H);
    setIndex(Math.max(0, Math.min(next, items.length - 1)));
  };

  const confirm = () => {
    const item = items[index];
    if (!item || saving) return;
    if (item.kind === 'status') {
      onSelectStatus?.(item.value);
      return;
    }
    if (item.kind === 'rest') {
      onSelectRest();
      return;
    }
    onSelectWorkout(item.option);
  };

  const subtitle = dia
    ? new Date(`${dia.data}T12:00:00`).toLocaleDateString('pt-BR', {
        day: 'numeric',
        month: 'short',
      })
    : null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-6"
      onClick={saving ? undefined : onClose}
      role="presentation"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="day-config-title"
        className="w-full max-w-[280px] overflow-hidden rounded-[16px] border border-[var(--dash-card-border,#222)] bg-[var(--dash-card-bg,#141414)] shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-2 px-4 pt-4 pb-2">
          <div className="min-w-0">
            <p id="day-config-title" className="text-[14px] font-bold dashboard-text">
              {DAY_NAMES[jsDay]}
            </p>
            {subtitle && (
              <p className="mt-0.5 text-[11px] dashboard-text-subtle capitalize">{subtitle}</p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            aria-label="Fechar"
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[var(--dash-input-bg,#1e1e1e)] disabled:opacity-50"
            style={{ touchAction: 'manipulation' }}
          >
            <X size={14} className="dashboard-text-subtle" />
          </button>
        </div>

        {/* Drum roll */}
        <div className="relative mx-3 my-2 h-[132px] overflow-hidden rounded-[12px] bg-[#0d0d0d]">
          {/* selection band */}
          <div
            className="pointer-events-none absolute inset-x-0 top-1/2 z-10 h-[44px] -translate-y-1/2 rounded-[10px] border border-brand/40 bg-brand/10"
            aria-hidden
          />
          {/* fade top/bottom */}
          <div
            className="pointer-events-none absolute inset-x-0 top-0 z-20 h-8 bg-gradient-to-b from-[#0d0d0d] to-transparent"
            aria-hidden
          />
          <div
            className="pointer-events-none absolute inset-x-0 bottom-0 z-20 h-8 bg-gradient-to-t from-[#0d0d0d] to-transparent"
            aria-hidden
          />

          <div
            ref={listRef}
            onScroll={handleScroll}
            className="h-full overflow-y-auto overscroll-contain snap-y snap-mandatory scrollbar-none"
            style={{
              scrollSnapType: 'y mandatory',
              paddingTop: ITEM_H,
              paddingBottom: ITEM_H,
              WebkitOverflowScrolling: 'touch',
            }}
          >
            {items.map((item, i) => {
              const active = i === index;
              return (
                <button
                  key={`${item.kind}-${item.kind === 'workout' ? item.option.id : item.kind === 'status' ? item.value : 'rest'}`}
                  type="button"
                  onClick={() => {
                    setIndex(i);
                    listRef.current?.scrollTo({ top: i * ITEM_H, behavior: 'smooth' });
                  }}
                  className={cn(
                    'flex w-full snap-center items-center justify-center gap-1.5 px-3 text-center transition-all',
                    active
                      ? 'text-[15px] font-semibold text-white'
                      : 'text-[13px] font-medium text-[#555]',
                  )}
                  style={{ height: ITEM_H, touchAction: 'manipulation' }}
                >
                  {item.kind === 'rest' && <Moon size={14} weight={active ? 'fill' : 'regular'} />}
                  {item.kind === 'status' && item.value === 'done' && (
                    <Check size={14} weight="bold" className={active ? 'text-[#39c75a]' : undefined} />
                  )}
                  <span className={cn('truncate', item.kind === 'workout' && 'uppercase')}>{item.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex gap-2 px-3 pb-3 pt-1">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="h-10 flex-1 rounded-[10px] text-[13px] font-semibold dashboard-text-subtle disabled:opacity-50"
            style={{
              backgroundColor: 'var(--dash-input-bg, #1e1e1e)',
              touchAction: 'manipulation',
            }}
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={confirm}
            disabled={saving || items.length === 0}
            className="h-10 flex-1 rounded-[10px] bg-brand text-[13px] font-bold text-white disabled:opacity-50"
            style={{ touchAction: 'manipulation' }}
          >
            {saving ? 'Salvando…' : 'Confirmar'}
          </button>
        </div>
      </div>
    </div>
  );
}
