'use client';

import { useState } from 'react';
import { CheckCircle, NotePencil, X } from '@phosphor-icons/react';
import type { AlunoObservacao } from '@/lib/observacoes/queries';
import { BodyPortal, useLockBodyScroll } from '@/app/components/ui/BodyPortal';

type Props = {
  observacao: AlunoObservacao | null;
  onClose: () => void;
  onConcluir: (id: string) => Promise<void>;
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export function AlunoObservacaoModal({ observacao, onClose, onConcluir }: Props) {
  const [concluindo, setConcluindo] = useState(false);
  useLockBodyScroll(Boolean(observacao));

  if (!observacao) return null;

  async function handleConcluir() {
    if (!observacao || concluindo) return;
    setConcluindo(true);
    try {
      await onConcluir(observacao.id);
    } finally {
      setConcluindo(false);
    }
  }

  return (
    <BodyPortal>
      <div
        className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center bg-black/70 p-6"
        onClick={onClose}
      >
        <div
          role="dialog"
          aria-modal
          aria-labelledby="observacao-modal-title"
          className="w-full max-w-md rounded-[20px] border-0 bg-surface-1 p-6 shadow-elev-3"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="mb-4 flex items-start justify-between gap-3">
            <div className="flex items-center gap-2 min-w-0">
              <span
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full"
                style={{ background: 'var(--brand-subtle)', color: 'var(--brand-primary)' }}
              >
                <NotePencil size={16} weight="fill" />
              </span>
              <h3
                id="observacao-modal-title"
                className="text-base font-bold text-text-primary leading-snug"
              >
                Nota do personal
              </h3>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-text-tertiary hover:text-text-primary shrink-0 bg-transparent border-0"
              aria-label="Fechar"
            >
              <X size={18} weight="bold" />
            </button>
          </div>

          <div className="flex flex-col gap-2">
            <p className="text-[13px] leading-relaxed text-text-secondary whitespace-pre-wrap">
              {observacao.conteudo}
            </p>
            <p className="text-[11px] text-text-tertiary">{formatDate(observacao.criada_em)}</p>
          </div>

          <button
            type="button"
            onClick={() => void handleConcluir()}
            disabled={concluindo}
            className="mt-5 inline-flex w-full items-center justify-center gap-1.5 rounded-xl bg-brand py-3 text-sm font-bold text-text-on-brand disabled:opacity-60"
          >
            <CheckCircle size={16} weight="bold" />
            {concluindo ? 'Concluindo…' : 'Concluir'}
          </button>
        </div>
      </div>
    </BodyPortal>
  );
}
