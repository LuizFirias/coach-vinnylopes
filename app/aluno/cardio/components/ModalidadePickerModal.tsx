'use client';

import { Check, X } from '@phosphor-icons/react';
import { MODALIDADES_CARDIO } from '@/lib/constants/cardio';
import { cn } from '@/lib/utils/cn';

interface ModalidadePickerModalProps {
  open: boolean;
  value: string;
  onClose: () => void;
  onChange: (value: string) => void;
}

export function ModalidadePickerModal({
  open,
  value,
  onClose,
  onChange,
}: ModalidadePickerModalProps) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[70] flex items-end justify-center bg-black/60 p-0 backdrop-blur-sm sm:items-center sm:p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Selecionar modalidade"
    >
      <div
        className="flex max-h-[min(85vh,640px)] w-full max-w-sm flex-col overflow-hidden rounded-t-2xl bg-surface-1 shadow-elev-3 sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex shrink-0 items-center justify-between border-b border-border-divider px-4 py-3">
          <h3 className="text-[15px] font-semibold text-text-primary">Modalidade</h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="flex h-8 w-8 items-center justify-center rounded-lg bg-surface-2 text-text-tertiary border-0 touch-manipulation"
          >
            <X size={15} />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-2 py-2">
          {MODALIDADES_CARDIO.map((grupo, gi) => (
            <div key={grupo.grupo}>
              {gi > 0 && (
                <div className="mx-3 my-2 h-px bg-brand/20" aria-hidden />
              )}

              <p className="px-3 pb-1.5 pt-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-brand">
                {grupo.grupo}
              </p>

              <div className="flex flex-col">
                {grupo.itens.map((item) => {
                  const selected = value === item;
                  return (
                    <button
                      key={item}
                      type="button"
                      onClick={() => {
                        onChange(item);
                        onClose();
                      }}
                      className={cn(
                        'flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-left transition-colors touch-manipulation border-0',
                        selected
                          ? 'bg-brand/10 text-brand'
                          : 'bg-transparent text-text-primary hover:bg-surface-2',
                      )}
                    >
                      <span
                        className={cn(
                          'text-[14px]',
                          selected ? 'font-semibold' : 'font-normal',
                        )}
                      >
                        {item}
                      </span>
                      {selected && (
                        <Check size={16} weight="bold" className="shrink-0 text-brand" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
