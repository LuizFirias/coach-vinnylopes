'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { X } from '@phosphor-icons/react';
import { GlassPanel } from '@/components/ui/GlassPanel';
import { cn } from '@/lib/utils/cn';
import type { AlunoComAcoes, PriorityAction } from '@/lib/utils/agruparAcoesPorAluno';

const DOT: Record<PriorityAction['tipo'], string> = {
  danger: '#e05555',
  warning: '#f59e0b',
  info: '#38BDF8',
  success: '#39c75a',
};

type Props = {
  aluno: AlunoComAcoes;
  onClose: () => void;
};

export function AcoesAlunoSheet({ aluno, onClose }: Props) {
  const router = useRouter();

  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  return (
    <>
      <div
        className="fixed inset-0 z-50 bg-black/50 backdrop-blur-[2px] animate-backdrop-in"
        onClick={onClose}
        aria-hidden
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="acoes-sheet-title"
        className={cn(
          'fixed bottom-0 left-0 right-0 z-50 px-4 animate-sheet-up',
          'pb-[calc(16px+env(safe-area-inset-bottom))]',
        )}
      >
        <GlassPanel
          variant="brand-1"
          className="relative mx-auto w-full max-w-lg"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-start justify-between gap-3 px-4 pt-4 pb-3 border-b border-white/10">
            <div className="min-w-0">
              <p
                id="acoes-sheet-title"
                className="text-[10px] font-semibold uppercase tracking-wider text-white/75"
              >
                Ações prioritárias
              </p>
              <p className="text-[16px] font-bold text-white mt-1 truncate">
                {aluno.alunoNome}
              </p>
              <p className="text-[12px] text-white/70 mt-0.5">
                {aluno.acoes.length}{' '}
                {aluno.acoes.length === 1 ? 'ação pendente' : 'ações pendentes'}
              </p>
            </div>

            <button
              type="button"
              onClick={onClose}
              aria-label="Fechar"
              className="shrink-0 flex h-8 w-8 items-center justify-center rounded-full text-white/70 transition-colors hover:text-white hover:bg-white/10 active:scale-95"
            >
              <X size={16} weight="bold" />
            </button>
          </div>

          <div className="px-4 py-1 max-h-[min(60vh,420px)] overflow-y-auto overscroll-contain">
            {aluno.acoes.map((acao, i) => (
              <div
                key={acao.id}
                className={cn(
                  'flex items-center justify-between py-3.5 gap-3',
                  i < aluno.acoes.length - 1 && 'border-b border-white/10',
                )}
              >
                <div className="flex items-start gap-2.5 min-w-0 flex-1">
                  <span
                    className="w-1.5 h-1.5 rounded-full mt-1.5 shrink-0"
                    style={{ backgroundColor: DOT[acao.tipo] }}
                  />
                  <p className="text-[13px] text-white/88 leading-snug">{acao.descricao}</p>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    router.push(acao.link);
                  }}
                  style={{ touchAction: 'manipulation' }}
                  className="text-[12px] font-semibold text-white ml-1 shrink-0 transition-opacity active:opacity-70"
                >
                  {acao.acao} →
                </button>
              </div>
            ))}
          </div>
        </GlassPanel>
      </div>
    </>
  );
}
