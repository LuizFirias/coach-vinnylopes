'use client';

import { Info } from '@phosphor-icons/react';
import { BodyPortal, useLockBodyScroll } from '@/app/components/ui/BodyPortal';

const TECNICAS = [
  { sigla: 'FS', nome: 'Full Set', desc: 'Série completa sem pausa' },
  { sigla: 'CS', nome: 'Cluster Set', desc: 'Pausas curtas dentro da série' },
  { sigla: 'TS', nome: 'Top Set', desc: 'Série com carga máxima do dia' },
  { sigla: 'DS', nome: 'Drop Set', desc: 'Redução de carga ao falhar' },
] as const;

interface TecnicasTooltipModalProps {
  open: boolean;
  onClose: () => void;
}

export function TecnicasTooltipModal({ open, onClose }: TecnicasTooltipModalProps) {
  useLockBodyScroll(open);
  if (!open) return null;

  return (
    <BodyPortal>
      <div
        className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center bg-black/70 p-6"
        onClick={onClose}
      >
        <div
          className="w-full max-w-md rounded-[20px] border-0 bg-surface-1 p-6"
          onClick={(e) => e.stopPropagation()}
        >
          <h3 className="mb-4 text-base font-bold text-text-primary">Técnicas de execução</h3>
          <div className="flex flex-col gap-4">
            {TECNICAS.map((t) => (
              <div key={t.sigla} className="flex items-start gap-3">
                <span className="min-w-9 rounded-md bg-brand-subtle px-2 py-1 text-center text-xs font-bold text-brand">
                  {t.sigla}
                </span>
                <div>
                  <p className="text-sm font-semibold text-text-primary">{t.nome}</p>
                  <p className="text-xs text-text-tertiary">{t.desc}</p>
                </div>
              </div>
            ))}
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

export function TecnicasTooltipTrigger({
  onClick,
  className = '',
  compact = false,
}: {
  onClick: () => void;
  className?: string;
  compact?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      className={`inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wider text-text-muted hover:text-brand ${className}`}
      aria-label="Explicação das técnicas T1 e T2"
    >
      {!compact && 'T1/T2'}
      <Info className="h-3.5 w-3.5" weight="fill" />
    </button>
  );
}
