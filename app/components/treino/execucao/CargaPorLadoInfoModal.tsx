'use client';

import { Info, X } from '@phosphor-icons/react';
import { BodyPortal, useLockBodyScroll } from '@/app/components/ui/BodyPortal';

type Props = {
  open: boolean;
  onClose: () => void;
};

export function CargaPorLadoInfoModal({ open, onClose }: Props) {
  useLockBodyScroll(open);
  if (!open) return null;

  return (
    <BodyPortal>
      <div
        className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center bg-black/70 p-6"
        onClick={onClose}
      >
        <div
          role="dialog"
          aria-modal
          aria-labelledby="carga-por-lado-title"
          className="w-full max-w-md rounded-[20px] border-0 bg-surface-1 p-6 shadow-elev-3"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="mb-4 flex items-start justify-between gap-3">
            <div className="flex items-center gap-2 min-w-0">
              <span
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full"
                style={{ background: 'var(--info-subtle)', color: 'var(--info)' }}
              >
                <Info size={16} weight="fill" />
              </span>
              <h3
                id="carga-por-lado-title"
                className="text-base font-bold text-text-primary leading-snug"
              >
                Como registrar a carga
              </h3>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-text-tertiary hover:text-text-primary shrink-0"
              aria-label="Fechar"
            >
              <X size={18} weight="bold" />
            </button>
          </div>

          <div className="flex flex-col gap-3 text-[13px] leading-relaxed text-text-secondary">
            <p>
              Em exercícios com <strong className="text-text-primary font-semibold">halteres</strong> ou{' '}
              <strong className="text-text-primary font-semibold">kettlebell</strong>, registre o peso de{' '}
              <strong className="text-text-primary font-semibold">um lado</strong> — não a soma dos dois.
            </p>
            <p>
              Exemplo: se você usa 12 kg em cada mão, anote <strong className="text-text-primary font-semibold">12 kg</strong>.
            </p>
            <p className="text-[12px] text-text-tertiary">
              Em barra, smith ou máquina, continue registrando a carga total do equipamento.
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="mt-5 w-full rounded-xl bg-brand py-3 text-sm font-bold text-text-on-brand"
          >
            Entendi
          </button>
        </div>
      </div>
    </BodyPortal>
  );
}

export function CargaPorLadoInfoButton({
  onClick,
  size = 16,
  className = '',
}: {
  onClick: () => void;
  size?: number;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      className={`inline-flex shrink-0 items-center justify-center p-0.5 active:opacity-70 ${className}`}
      style={{ color: 'var(--info)' }}
      aria-label="Como registrar a carga neste exercício"
    >
      <Info size={size} weight="fill" />
    </button>
  );
}
