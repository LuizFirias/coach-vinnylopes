'use client';

import { useEffect, useState } from 'react';
import { CaretRight, Check, WarningCircle } from '@phosphor-icons/react';
import { cn } from '@/lib/utils/cn';
import {
  agruparAcoesPorAluno,
  type AlunoComAcoes,
  type PriorityAction,
} from '@/lib/utils/agruparAcoesPorAluno';
import { AcoesAlunoSheet } from './AcoesAlunoSheet';

export type { PriorityAction };

interface PriorityActionsCardProps {
  actions: PriorityAction[];
  className?: string;
}

const URGENCIA_DOT: Record<AlunoComAcoes['urgenciaMax'], string> = {
  alta: '#e05555',
  media: '#f59e0b',
};

/** Coluna do marcador (ícone / dot) — alinha header com linhas da lista */
const MARKER_COL = 'w-4 shrink-0 flex items-center justify-center';

export function PriorityActionsCard({ actions, className }: PriorityActionsCardProps) {
  const [alunoSelecionado, setAlunoSelecionado] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const grupos = agruparAcoesPorAluno(actions);
  const alunoAtivo = grupos.find((g) => g.alunoId === alunoSelecionado) ?? null;

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3200);
    return () => clearTimeout(t);
  }, [toast]);

  if (grupos.length === 0) {
    return (
      <div
        style={{ fontFamily: 'Nunito, var(--font-sans), sans-serif' }}
        className={cn(
          'relative w-full rounded-xl border-0 bg-surface-1 px-4 pb-4 pt-3 shadow-[0_8px_24px_rgba(0,0,0,0.28)]',
          className,
        )}
      >
        <span className="absolute top-2.5 left-4 text-[10px] font-bold uppercase tracking-wider text-danger inline-flex items-center gap-1.5 leading-none">
          <WarningCircle size={14} weight="bold" />
          Ação requerida
        </span>
        <p className="text-[11px] text-text-disabled pt-5">
          Nenhuma ação pendente — tudo em ordem.
        </p>
      </div>
    );
  }

  return (
    <>
      <div
        style={{ fontFamily: 'Nunito, var(--font-sans), sans-serif' }}
        className={cn(
          'relative w-full rounded-xl border-0 bg-surface-1 px-4 pb-3 pt-2.5 shadow-[0_8px_24px_rgba(0,0,0,0.28)]',
          className,
        )}
      >
        <span className="absolute top-2.5 left-4 z-10 text-[10px] font-bold uppercase tracking-wider text-danger inline-flex items-center gap-1.5 leading-none">
          <WarningCircle size={14} weight="bold" />
          Ação requerida
        </span>

        <div className="flex flex-col max-h-[24.5rem] md:max-h-[18rem] overflow-y-auto overscroll-contain pt-5">
          {grupos.map((grupo, i) => (
            <button
              key={grupo.alunoId}
              type="button"
              onClick={() => setAlunoSelecionado(grupo.alunoId)}
              style={{ touchAction: 'manipulation' }}
              className={cn(
                'flex items-center justify-between py-2 text-left transition-opacity active:opacity-70',
                i > 0 && 'border-t border-divider',
              )}
            >
              <div className="flex min-w-0 items-center gap-2.5">
                <div className={MARKER_COL}>
                  <span
                    className="w-1.5 h-1.5 rounded-full shrink-0"
                    style={{ backgroundColor: URGENCIA_DOT[grupo.urgenciaMax] }}
                  />
                </div>
                <span className="text-[13px] font-semibold text-text-primary truncate">
                  {grupo.alunoNome}
                </span>
              </div>

              <div className="flex items-center gap-1.5 shrink-0 ml-2">
                <span
                  className="text-[11px] font-semibold tabular-nums lining-nums"
                  style={{ color: URGENCIA_DOT[grupo.urgenciaMax] }}
                >
                  {grupo.acoes.length} {grupo.acoes.length === 1 ? 'ação' : 'ações'}
                </span>
                <CaretRight size={12} className="text-text-disabled" />
              </div>
            </button>
          ))}
        </div>
      </div>

      {alunoAtivo && (
        <AcoesAlunoSheet
          aluno={alunoAtivo}
          onClose={() => setAlunoSelecionado(null)}
          onCheckinSent={setToast}
        />
      )}

      {toast && (
        <div
          role="status"
          className="fixed left-1/2 bottom-[calc(5.5rem+env(safe-area-inset-bottom))] z-[70] flex max-w-[min(92vw,360px)] -translate-x-1/2 items-center gap-2 rounded-xl border border-border-subtle bg-surface-1 px-3.5 py-2.5 text-[12px] font-medium text-text-primary shadow-elev-2 animate-backdrop-in"
        >
          <Check size={16} weight="bold" className="shrink-0 text-success" />
          <span>{toast}</span>
        </div>
      )}
    </>
  );
}
