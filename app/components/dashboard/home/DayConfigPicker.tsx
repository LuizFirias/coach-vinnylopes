'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Check, Heartbeat, Moon, X } from '@phosphor-icons/react';
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
  | { kind: 'cardio'; label: string }
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
  onSelectCardio: () => void;
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

const CARD_STYLE = {
  background: 'var(--mobile-card-bg, #ffffff)',
  border: '1px solid var(--mobile-card-border, rgba(0,0,0,0.08))',
  boxShadow: 'var(--mobile-card-shadow, 0 8px 24px rgba(0,0,0,0.12))',
} as const;

export function DayConfigPicker({
  open,
  jsDay,
  dia,
  today,
  workouts,
  saving = false,
  onClose,
  onSelectRest,
  onSelectCardio,
  onSelectWorkout,
  onSelectStatus,
}: DayConfigPickerProps) {
  const listRef = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);

  // Confirmação manual de "treino realizado" só existe para o dia anterior — se o
  // aluno esquecer de marcar em qualquer outro dia, o treino já conta como não realizado.
  const yesterday = useMemo(() => {
    const d = new Date(`${today}T12:00:00`);
    d.setDate(d.getDate() - 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }, [today]);

  const canChangeStatus = Boolean(
    dia &&
      !dia.isOff &&
      (dia.temTreino || dia.isCardio) &&
      dia.data === yesterday &&
      onSelectStatus,
  );

  const items = useMemo<PickerItem[]>(() => {
    const list: PickerItem[] = [];
    if (canChangeStatus) {
      list.push({ kind: 'status', value: 'done', label: 'Treino realizado' });
    }
    list.push({ kind: 'rest', label: 'Descanso' });
    list.push({ kind: 'cardio', label: 'Cardio' });
    for (const w of workouts) {
      list.push({ kind: 'workout', option: w, label: w.name });
    }
    return list;
  }, [canChangeStatus, workouts]);

  // Só recalcula/reposiciona quando o picker ABRE — nunca em resposta ao
  // próprio `index` mudando. Antes, um 2º efeito ficava de olho em `index` e
  // chamava scrollTo() de novo a cada item cruzado durante o arraste do
  // usuário — brigando com o scroll nativo (inércia) e travando o gesto.
  // Clicar num item já reposiciona sozinho (abaixo); arrastar já reposiciona
  // sozinho (é scroll nativo) — não precisa de mais ninguém "ajudando".
  useEffect(() => {
    if (!open) return;
    const start = canChangeStatus ? 1 : 0;
    let initial = 0;
    if (dia?.fichaId || dia?.treinoPdfId) {
      const idx = items.findIndex(
        (it) =>
          it.kind === 'workout' &&
          ((dia.fichaId && it.option.id === dia.fichaId) ||
            (dia.treinoPdfId && it.option.id === dia.treinoPdfId)),
      );
      initial = idx >= 0 ? idx : start;
    } else if (dia?.isCardio) {
      initial = start + 1;
    } else if (dia?.isOff) {
      initial = start;
    } else if (canChangeStatus && dia) {
      initial = dia.treinoConcluido ? 0 : start;
    }
    const clamped = Math.max(0, Math.min(initial, items.length - 1));
    setIndex(clamped);
    // Sem behavior:'smooth' aqui — é o picker abrindo, não um gesto do
    // usuário; salta direto pra posição certa.
    listRef.current?.scrollTo({ top: clamped * ITEM_H });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

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
    if (item.kind === 'cardio') {
      onSelectCardio();
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
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-6 backdrop-blur-sm"
      onClick={saving ? undefined : onClose}
      role="presentation"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="day-config-title"
        className="w-full max-w-[280px] overflow-hidden rounded-[16px]"
        style={CARD_STYLE}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-2 px-4 pb-2 pt-4">
          <div className="min-w-0">
            <p
              id="day-config-title"
              className="text-[14px] font-semibold text-text-primary"
            >
              {DAY_NAMES[jsDay]}
            </p>
            {subtitle && (
              <p className="mt-0.5 text-[11px] capitalize text-text-tertiary">
                {subtitle}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            aria-label="Fechar"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg disabled:opacity-50"
            style={{
              background: 'var(--filter-bg, #ebebf0)',
              border: 'none',
              color: '#888',
              touchAction: 'manipulation',
            }}
          >
            <X size={14} />
          </button>
        </div>

        {/* Drum roll */}
        <div
          className="relative mx-3 my-2 h-[132px] overflow-hidden rounded-[12px]"
          style={{ background: 'var(--filter-bg, #ebebf0)' }}
        >
          <div
            className="pointer-events-none absolute inset-x-0 top-1/2 z-10 h-[44px] -translate-y-1/2 rounded-[10px] border border-brand/40 bg-brand/10"
            aria-hidden
          />
          <div
            className="pointer-events-none absolute inset-x-0 top-0 z-20 h-8"
            style={{
              background:
                'linear-gradient(to bottom, var(--filter-bg, #ebebf0), transparent)',
            }}
            aria-hidden
          />
          <div
            className="pointer-events-none absolute inset-x-0 bottom-0 z-20 h-8"
            style={{
              background:
                'linear-gradient(to top, var(--filter-bg, #ebebf0), transparent)',
            }}
            aria-hidden
          />

          <div
            ref={listRef}
            onScroll={handleScroll}
            className="scrollbar-none h-full snap-y snap-mandatory overflow-y-auto overscroll-contain"
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
                  key={`${item.kind}-${item.kind === 'workout' ? item.option.id : item.kind === 'status' ? item.value : item.kind}`}
                  type="button"
                  onClick={() => {
                    setIndex(i);
                    listRef.current?.scrollTo({ top: i * ITEM_H, behavior: 'smooth' });
                  }}
                  className={cn(
                    'flex w-full snap-center items-center justify-center gap-1.5 px-3 text-center transition-all',
                    active
                      ? 'text-[15px] font-semibold text-text-primary'
                      : 'text-[13px] font-normal text-text-tertiary',
                  )}
                  style={{ height: ITEM_H, touchAction: 'manipulation' }}
                >
                  {item.kind === 'rest' && (
                    <Moon size={14} weight={active ? 'fill' : 'regular'} />
                  )}
                  {item.kind === 'cardio' && (
                    <Heartbeat
                      size={14}
                      weight={active ? 'fill' : 'regular'}
                      className={active ? 'text-danger' : undefined}
                    />
                  )}
                  {item.kind === 'status' && item.value === 'done' && (
                    <Check
                      size={14}
                      weight="bold"
                      className={active ? 'text-[#39c75a]' : undefined}
                    />
                  )}
                  <span className={cn('truncate', item.kind === 'workout' && 'uppercase')}>
                    {item.label}
                  </span>
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
            className="h-10 flex-1 rounded-[10px] text-[13px] font-semibold text-text-tertiary disabled:opacity-50"
            style={{
              background: 'var(--filter-bg, #ebebf0)',
              border: 'none',
              touchAction: 'manipulation',
            }}
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={confirm}
            disabled={saving || items.length === 0}
            className="h-10 flex-1 rounded-[10px] text-[13px] font-semibold text-white disabled:opacity-50"
            style={{
              background:
                'linear-gradient(135deg, #c084fc 0%, #751BB4 55%, #7e22ce 100%)',
              boxShadow: '0 3px 10px rgba(117, 27, 180,0.30)',
              border: 'none',
              touchAction: 'manipulation',
            }}
          >
            {saving ? 'Salvando…' : 'Confirmar'}
          </button>
        </div>
      </div>
    </div>
  );
}
