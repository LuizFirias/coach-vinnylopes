'use client';

import { useEffect, useRef, useState } from 'react';
import { Check, WarningCircle } from '@phosphor-icons/react';
import { cn } from '@/lib/utils/cn';
import {
  agruparAcoesPorAluno,
  type AlunoComAcoes,
  type PriorityAction,
} from '@/lib/utils/agruparAcoesPorAluno';
import { StudentAvatar } from '@/app/components/profile/StudentAvatar';
import { AcoesAlunoSheet } from './AcoesAlunoSheet';

export type { PriorityAction };

interface PriorityActionsCardProps {
  actions: PriorityAction[];
  className?: string;
}

// Retangular (não circular, não quadrada) — cabe pelo menos 4 inteiras mesmo
// no celular mais estreito comum (~360px de largura útil de conteúdo).
const PHOTO_W = 52;
const PHOTO_H = 64;
// Foto + respiro + nome (até 2 linhas) + padding vertical do card.
const CARD_H = 118;

export function PriorityActionsCard({ actions, className }: PriorityActionsCardProps) {
  const [alunoSelecionado, setAlunoSelecionado] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const grupos = agruparAcoesPorAluno(actions);
  const alunoAtivo = grupos.find((g) => g.alunoId === alunoSelecionado) ?? null;

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3200);
    return () => clearTimeout(t);
  }, [toast]);

  // Sempre volta pro início quando a lista de ações muda (ex.: refetch do dashboard).
  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollLeft = 0;
  }, [actions.length]);

  return (
    <>
      <div className={cn('flex min-w-0 flex-col', className)}>
        <h2 className="mb-2.5 flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-text-tertiary">
          <WarningCircle size={12} weight="bold" className="text-danger" />
          Ações requeridas
        </h2>

        <div
          className="w-full rounded-2xl border border-card bg-surface-1 px-3 py-3"
          style={{ height: CARD_H, boxShadow: '0 3px 10px rgba(0,0,0,0.06)' }}
        >
          {grupos.length === 0 ? (
            <div className="flex h-full items-center justify-center">
              <p className="text-[11px] text-text-disabled">
                Nenhuma ação pendente — tudo em ordem.
              </p>
            </div>
          ) : (
            <div
              ref={scrollRef}
              className="scrollbar-none flex h-full items-start gap-2.5 overflow-x-auto"
              style={{ scrollSnapType: 'x proximity' }}
            >
              {grupos.map((grupo) => (
                <button
                  key={grupo.alunoId}
                  type="button"
                  onClick={() => setAlunoSelecionado(grupo.alunoId)}
                  style={{ touchAction: 'manipulation', scrollSnapAlign: 'start', width: PHOTO_W }}
                  className="flex shrink-0 cursor-pointer flex-col items-center gap-1.5 border-0 bg-transparent p-0 transition-transform active:scale-95"
                  aria-label={`${grupo.alunoNome} — ${grupo.acoes.length} ${
                    grupo.acoes.length === 1 ? 'ação pendente' : 'ações pendentes'
                  }`}
                >
                  <span
                    className="relative block shrink-0 overflow-hidden rounded-lg"
                    style={{ width: PHOTO_W, height: PHOTO_H }}
                  >
                    <StudentAvatar
                      name={grupo.alunoNome}
                      avatarUrl={grupo.avatarUrl}
                      sexo={grupo.sexo}
                      sizeClassName="w-full h-full"
                      className="rounded-lg border-0"
                    />
                    <span
                      className="absolute inset-x-0 bottom-0 flex items-center justify-center"
                      style={{ height: 18, background: 'rgba(0,0,0,0.5)' }}
                    >
                      <span className="text-[11px] font-bold tabular-nums lining-nums text-danger">
                        {grupo.acoes.length}
                      </span>
                    </span>
                  </span>
                  <span className="line-clamp-2 text-center text-[10px] font-medium leading-tight text-text-secondary">
                    {grupo.alunoNome}
                  </span>
                </button>
              ))}
            </div>
          )}
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
          className="fixed left-1/2 bottom-[calc(5.5rem+env(safe-area-inset-bottom))] z-70 flex max-w-[min(92vw,360px)] -translate-x-1/2 items-center gap-2 rounded-xl border border-border-subtle bg-surface-1 px-3.5 py-2.5 text-[12px] font-medium text-text-primary shadow-elev-2 animate-backdrop-in"
        >
          <Check size={16} weight="bold" className="shrink-0 text-success" />
          <span>{toast}</span>
        </div>
      )}
    </>
  );
}
