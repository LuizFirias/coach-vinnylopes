'use client';

import { useState } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import {
  Barbell,
  CaretDown,
  Copy,
  DotsThree,
  Eye,
  PencilSimple,
  Plus,
  Trash,
} from '@phosphor-icons/react';
import { cn } from '@/lib/utils/cn';
import { isBiSetFichaItem, parseFichaItems } from '@/lib/utils/biset';
import {
  alunoTreinosReturnUrl,
  withReturnUrl,
} from '@/lib/utils/adminNav';

export type RotinaFichaItem = {
  id: string;
  nome_rotina: string;
  configuracao: { exercicios?: unknown[] } | null;
  ativo: boolean;
};

type Props = {
  fichas: RotinaFichaItem[];
  alunoId: string;
  currentFichaId?: string | null;
  onDeleteFicha: (fichaId: string) => void;
  onCloneFicha: (ficha: RotinaFichaItem) => void;
  onPreviewFicha: (ficha: RotinaFichaItem) => void;
  onAddExercise: (fichaId: string) => void;
};

function exerciseLine(ex: unknown): { title: string; detail: string } {
  if (isBiSetFichaItem(ex as never)) {
    const item = ex as {
      exercicioA?: { nome?: string; series?: { reps_sugerido?: string }[] };
      exercicioB?: { nome?: string };
    };
    const a = item.exercicioA?.nome || 'A';
    const b = item.exercicioB?.nome || '…';
    const sets = item.exercicioA?.series?.length || 0;
    const reps = item.exercicioA?.series?.[0]?.reps_sugerido;
    return {
      title: `${a} + ${b}`,
      detail: [`Bi-Set`, sets ? `${sets} séries` : null, reps ? `${reps} reps` : null]
        .filter(Boolean)
        .join(' · '),
    };
  }

  const item = ex as {
    nome?: string;
    grupo_muscular?: string;
    descanso?: string;
    series?: { reps_sugerido?: string; tempo_sugerido?: string }[];
  };
  const sets = item.series?.length || 0;
  const reps = item.series?.[0]?.reps_sugerido;
  const tempo = item.series?.[0]?.tempo_sugerido;
  const detail = [
    item.grupo_muscular,
    sets ? `${sets}×${reps || tempo || '—'}` : null,
    item.descanso ? `descanso ${item.descanso}` : null,
  ]
    .filter(Boolean)
    .join(' · ');

  return {
    title: item.nome || 'Exercício',
    detail: detail || 'Sem meta',
  };
}

export function RotinasExpandableCards({
  fichas,
  alunoId,
  currentFichaId = null,
  onDeleteFicha,
  onCloneFicha,
  onPreviewFicha,
  onAddExercise,
}: Props) {
  const router = useRouter();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [menuId, setMenuId] = useState<string | null>(null);
  const [menuPos, setMenuPos] = useState<{ top: number; left: number } | null>(null);

  const closeMenu = () => {
    setMenuId(null);
    setMenuPos(null);
  };

  const menuFicha = menuId ? fichas.find((f) => f.id === menuId) : null;

  if (fichas.length === 0) {
    return (
      <div className="rounded-xl border-0 bg-surface-1 px-4 py-5 text-center">
        <p className="text-sm font-semibold text-text-primary">Nenhuma rotina prescrita</p>
        <p className="mt-1 text-[11px] text-text-tertiary">
          Use o botão Nova Ficha no topo para criar a primeira.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {fichas.map((ficha) => {
        const items = parseFichaItems(ficha.configuracao?.exercicios || []);
        const open = expandedId === ficha.id;
        const menuOpen = menuId === ficha.id;
        const isAtual = currentFichaId === ficha.id;

        return (
          <div
            key={ficha.id}
            className="relative rounded-xl border-0 bg-surface-1 shadow-sm overflow-hidden"
          >
            <div className="flex items-start gap-3 px-4 py-3.5 pr-10">
              <button
                type="button"
                onClick={() => setExpandedId(open ? null : ficha.id)}
                className="flex min-w-0 flex-1 items-start gap-3 bg-transparent border-0 p-0 text-left"
                aria-expanded={open}
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center text-brand">
                  <Barbell size={18} weight="bold" />
                </div>
                <div className="min-w-0 flex-1 pt-0.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-bold text-text-primary truncate leading-tight">
                      {ficha.nome_rotina || 'Sem nome'}
                    </p>
                    {isAtual && (
                      <span className="rounded bg-success/15 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-success">
                        atual
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-[11px] text-text-tertiary">
                    {items.length} exercício{items.length === 1 ? '' : 's'}
                    {ficha.ativo ? ' · ativa' : ''}
                  </p>
                </div>
                <CaretDown
                  size={14}
                  weight="bold"
                  className={cn(
                    'mt-2.5 shrink-0 text-text-tertiary transition-transform',
                    open && 'rotate-180',
                  )}
                />
              </button>

              <div className="absolute top-2.5 right-2.5 z-10">
                <button
                  type="button"
                  aria-label={`Opções de ${ficha.nome_rotina}`}
                  aria-expanded={menuOpen}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (menuId === ficha.id) {
                      closeMenu();
                      return;
                    }
                    const rect = e.currentTarget.getBoundingClientRect();
                    const menuW = 148;
                    setMenuPos({
                      top: rect.bottom + 4,
                      left: Math.min(
                        Math.max(8, rect.right - menuW),
                        window.innerWidth - menuW - 8,
                      ),
                    });
                    setMenuId(ficha.id);
                  }}
                  className="flex h-7 w-7 items-center justify-center rounded-md text-text-tertiary hover:text-text-primary hover:bg-surface-2 transition-colors"
                >
                  <DotsThree size={18} weight="bold" />
                </button>
              </div>
            </div>

            {open && (
              <div className="border-t border-[color:var(--list-row-divider)] px-4 pb-3 pt-1">
                {items.length === 0 ? (
                  <p className="py-3 text-center text-[12px] text-text-tertiary">
                    Nenhum exercício nesta ficha.
                  </p>
                ) : (
                  <ol className="flex flex-col divide-y divide-[color:var(--list-row-divider)]">
                    {items.map((ex, idx) => {
                      const { title, detail } = exerciseLine(ex);
                      return (
                        <li key={`${ficha.id}-${idx}`} className="flex gap-2.5 py-2.5 first:pt-2">
                          <span className="w-5 shrink-0 pt-0.5 text-[11px] font-semibold tabular-nums lining-nums text-text-tertiary">
                            {idx + 1}.
                          </span>
                          <div className="min-w-0 flex-1">
                            <p className="text-[13px] font-medium text-text-primary leading-snug">
                              {title}
                            </p>
                            <p className="mt-0.5 text-[11px] text-text-tertiary leading-snug">
                              {detail}
                            </p>
                          </div>
                        </li>
                      );
                    })}
                  </ol>
                )}

                <button
                  type="button"
                  onClick={() => onAddExercise(ficha.id)}
                  className="mt-1 inline-flex items-center gap-1 bg-transparent border-0 px-0 py-1.5 text-[11px] font-semibold text-brand hover:text-brand-hover"
                >
                  <Plus size={12} weight="bold" />
                  Adicionar exercício
                </button>
              </div>
            )}
          </div>
        );
      })}

      {typeof document !== 'undefined' &&
        menuFicha &&
        menuPos &&
        createPortal(
          <>
            <div className="fixed inset-0 z-[80]" aria-hidden onClick={closeMenu} />
            <div
              role="menu"
              className="fixed z-[90] min-w-[148px] rounded-lg border border-border-subtle bg-surface-1 py-1 shadow-elev-2"
              style={{ top: menuPos.top, left: menuPos.left }}
            >
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  const fichaId = menuFicha.id;
                  closeMenu();
                  router.push(
                    withReturnUrl(
                      `/admin/aluno/${alunoId}/ficha/${fichaId}`,
                      alunoTreinosReturnUrl(alunoId),
                    ),
                  );
                }}
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-[12px] font-medium text-text-primary hover:bg-surface-2"
              >
                <PencilSimple size={14} />
                Editar
              </button>
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  closeMenu();
                  onPreviewFicha(menuFicha);
                }}
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-[12px] font-medium text-text-primary hover:bg-surface-2"
              >
                <Eye size={14} />
                Visualizar
              </button>
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  closeMenu();
                  onCloneFicha(menuFicha);
                }}
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-[12px] font-medium text-text-primary hover:bg-surface-2"
              >
                <Copy size={14} />
                Clonar
              </button>
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  const fichaId = menuFicha.id;
                  closeMenu();
                  onDeleteFicha(fichaId);
                }}
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-[12px] font-medium text-danger hover:bg-danger/5"
              >
                <Trash size={14} />
                Excluir
              </button>
            </div>
          </>,
          document.body,
        )}
    </div>
  );
}
