"use client";

import { useCallback, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  DotsSixVertical,
  Eye,
  PencilSimple,
  Copy,
  Trash,
  Plus,
} from "@phosphor-icons/react";
import { cn } from "@/lib/utils/cn";
import { isBiSetFichaItem } from "@/lib/utils/biset";
import {
  alunoTreinosReturnUrl,
  withReturnUrl,
} from "@/lib/utils/adminNav";

export interface FichaKanbanItem {
  id: string;
  nome_rotina: string;
  configuracao: { exercicios?: unknown[] } | null;
  ativo: boolean;
  criado_em: string;
}

interface FichasKanbanProps {
  fichas: FichaKanbanItem[];
  alunoId: string;
  /** Só esta coluna recebe badge "atual" — demais ficam sem badge */
  currentFichaId?: string | null;
  onReorderFichas: (orderedIds: string[]) => void;
  onUpdateFichaExercicios: (
    fichaId: string,
    exercicios: unknown[],
  ) => Promise<void>;
  onDeleteFicha: (fichaId: string) => void;
  onCloneFicha: (ficha: FichaKanbanItem) => void;
  onPreviewFicha: (ficha: FichaKanbanItem) => void;
  /** Abre builder inline no perfil do aluno */
  onCreateTreino: () => void;
  /** Adicionar exercício na coluna sem sair da tela */
  onAddExercise: (fichaId: string) => void;
}

function exerciseLabel(ex: any): { nome: string; meta: string } {
  if (isBiSetFichaItem(ex)) {
    const a = ex.exercicioA?.nome || "A";
    const b = ex.exercicioB?.nome || "…";
    const sets = ex.exercicioA?.series?.length || 0;
    return {
      nome: `${a} + ${b}`,
      meta: `Bi-Set · ${sets} séries`,
    };
  }
  const nome = ex.nome || "Exercício";
  const grupo = ex.grupo_muscular || "";
  const sets = ex.series?.length || 0;
  const reps = ex.series?.[0]?.reps_sugerido || "";
  const metaParts = [
    grupo,
    sets ? `${sets}×${reps || "—"}` : null,
  ].filter(Boolean);
  return { nome, meta: metaParts.join(" · ") || "Sem meta" };
}

export function FichasKanban({
  fichas,
  alunoId,
  currentFichaId = null,
  onReorderFichas,
  onUpdateFichaExercicios,
  onDeleteFicha,
  onCloneFicha,
  onPreviewFicha,
  onCreateTreino,
  onAddExercise,
}: FichasKanbanProps) {
  const router = useRouter();
  const [dragEx, setDragEx] = useState<{
    fichaId: string;
    index: number;
  } | null>(null);
  const [overCol, setOverCol] = useState<string | null>(null);
  const [overEx, setOverEx] = useState<{ fichaId: string; index: number } | null>(
    null,
  );
  const [dragColId, setDragColId] = useState<string | null>(null);
  const savingRef = useRef(false);

  const persistMove = useCallback(
    async (
      fromFichaId: string,
      fromIndex: number,
      toFichaId: string,
      toIndex: number,
    ) => {
      if (savingRef.current) return;
      const fromFicha = fichas.find((f) => f.id === fromFichaId);
      const toFicha = fichas.find((f) => f.id === toFichaId);
      if (!fromFicha || !toFicha) return;

      const fromList = [...(fromFicha.configuracao?.exercicios || [])];
      const toList =
        fromFichaId === toFichaId
          ? fromList
          : [...(toFicha.configuracao?.exercicios || [])];

      if (fromIndex < 0 || fromIndex >= fromList.length) return;

      const [moved] = fromList.splice(fromIndex, 1);
      if (!moved) return;

      let insertAt = toIndex;
      if (fromFichaId === toFichaId) {
        if (fromIndex < toIndex) insertAt = toIndex - 1;
        fromList.splice(Math.max(0, insertAt), 0, moved);
        savingRef.current = true;
        try {
          await onUpdateFichaExercicios(fromFichaId, fromList);
        } finally {
          savingRef.current = false;
        }
        return;
      }

      insertAt = Math.max(0, Math.min(insertAt, toList.length));
      toList.splice(insertAt, 0, moved);
      savingRef.current = true;
      try {
        await onUpdateFichaExercicios(fromFichaId, fromList);
        await onUpdateFichaExercicios(toFichaId, toList);
      } finally {
        savingRef.current = false;
      }
    },
    [fichas, onUpdateFichaExercicios],
  );

  const handleDropOnColumn = async (toFichaId: string, toIndex?: number) => {
    if (!dragEx) return;
    const targetIndex =
      toIndex ??
      (fichas.find((f) => f.id === toFichaId)?.configuracao?.exercicios
        ?.length || 0);
    await persistMove(dragEx.fichaId, dragEx.index, toFichaId, targetIndex);
    setDragEx(null);
    setOverCol(null);
    setOverEx(null);
  };

  const handleColumnReorder = (targetId: string) => {
    if (!dragColId || dragColId === targetId) {
      setDragColId(null);
      return;
    }
    const ids = fichas.map((f) => f.id);
    const from = ids.indexOf(dragColId);
    const to = ids.indexOf(targetId);
    if (from < 0 || to < 0) {
      setDragColId(null);
      return;
    }
    const next = [...ids];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    onReorderFichas(next);
    setDragColId(null);
  };

  return (
    <div className="grid w-full grid-cols-[repeat(auto-fill,minmax(260px,1fr))] gap-3 items-start">
      {fichas.map((ficha) => {
        const exercises = ficha.configuracao?.exercicios || [];
        const isColOver = overCol === ficha.id && dragEx?.fichaId !== ficha.id;

        return (
          <div
            key={ficha.id}
            className={cn(
              "flex flex-col rounded-xl border bg-[#111827] transition-colors",
              isColOver ? "border-[#2b7fff]/50" : "border-card",
              dragColId === ficha.id && "opacity-60",
            )}
            onDragOver={(e) => {
              e.preventDefault();
              if (dragEx) setOverCol(ficha.id);
            }}
            onDragLeave={() => setOverCol((c) => (c === ficha.id ? null : c))}
            onDrop={(e) => {
              e.preventDefault();
              if (dragEx) void handleDropOnColumn(ficha.id);
              if (dragColId) handleColumnReorder(ficha.id);
            }}
          >
            {/* Column header */}
            <div className="flex items-start justify-between gap-2 px-3 py-2.5 border-b border-divider">
              <div className="flex items-start gap-1.5 min-w-0 flex-1">
                <button
                  type="button"
                  draggable
                  onDragStart={() => setDragColId(ficha.id)}
                  onDragEnd={() => setDragColId(null)}
                  className="mt-0.5 shrink-0 p-0.5 cursor-grab active:cursor-grabbing text-[#555555] touch-none"
                  title="Reordenar treino"
                  aria-label="Reordenar treino"
                >
                  <DotsSixVertical size={14} />
                </button>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <h4 className="text-[13px] font-semibold text-white truncate">
                      {ficha.nome_rotina}
                    </h4>
                    {currentFichaId === ficha.id && (
                      <span className="text-[9px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded bg-[rgba(57,199,90,0.12)] text-[#39c75a]">
                        atual
                      </span>
                    )}
                  </div>
                  <p className="text-[10px] text-[#555555] mt-0.5">
                    {exercises.length} exercício
                    {exercises.length === 1 ? "" : "s"}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-0.5 shrink-0">
                <button
                  type="button"
                  onClick={() => onPreviewFicha(ficha)}
                  className="w-7 h-7 rounded-md text-[#7a8aab] hover:text-white hover:bg-[#1e1e1e] flex items-center justify-center"
                  title="Visualizar"
                >
                  <Eye size={13} />
                </button>
                <button
                  type="button"
                  onClick={() =>
                    router.push(
                      withReturnUrl(
                        `/admin/aluno/${alunoId}/ficha/${ficha.id}`,
                        alunoTreinosReturnUrl(alunoId),
                      ),
                    )
                  }
                  className="w-7 h-7 rounded-md text-[#7a8aab] hover:text-white hover:bg-[#1e1e1e] flex items-center justify-center"
                  title="Editar"
                >
                  <PencilSimple size={13} />
                </button>
                <button
                  type="button"
                  onClick={() => onCloneFicha(ficha)}
                  className="w-7 h-7 rounded-md text-[#7a8aab] hover:text-white hover:bg-[#1e1e1e] flex items-center justify-center"
                  title="Clonar"
                >
                  <Copy size={13} />
                </button>
                <button
                  type="button"
                  onClick={() => onDeleteFicha(ficha.id)}
                  className="w-7 h-7 rounded-md text-[#7a8aab] hover:text-[#e05555] hover:bg-[#1e1e1e] flex items-center justify-center"
                  title="Desativar"
                >
                  <Trash size={13} />
                </button>
              </div>
            </div>

            {/* Exercise cards */}
            <div className="flex flex-col gap-1.5 p-2">
              {exercises.map((ex, idx) => {
                const { nome, meta } = exerciseLabel(ex);
                const thumb =
                  (ex as any)?.imagem_url ||
                  (ex as any)?.exercicioA?.imagem_url ||
                  null;
                const isDragging =
                  dragEx?.fichaId === ficha.id && dragEx.index === idx;
                const isOverHere =
                  overEx?.fichaId === ficha.id && overEx.index === idx;

                return (
                  <div
                    key={`${ficha.id}-${idx}`}
                    draggable
                    onDragStart={() => setDragEx({ fichaId: ficha.id, index: idx })}
                    onDragEnd={() => {
                      setDragEx(null);
                      setOverCol(null);
                      setOverEx(null);
                    }}
                    onDragOver={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setOverEx({ fichaId: ficha.id, index: idx });
                      setOverCol(ficha.id);
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      if (dragEx) void handleDropOnColumn(ficha.id, idx);
                    }}
                    className={cn(
                      "flex items-center gap-2 px-2.5 py-2 rounded-lg bg-[#191919] cursor-grab active:cursor-grabbing",
                      isDragging && "opacity-40",
                      isOverHere && "ring-1 ring-[#2b7fff]/40",
                    )}
                  >
                    <DotsSixVertical
                      size={12}
                      className="shrink-0 text-[#555555]"
                    />
                    <div className="w-7 h-7 rounded-md bg-[#232323] shrink-0 overflow-hidden">
                      {thumb ? (
                        <img
                          src={thumb}
                          alt=""
                          className="w-full h-full object-cover"
                        />
                      ) : null}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[11px] font-medium text-white truncate">
                        {nome}
                      </p>
                      <p className="text-[9px] text-[#7a8aab] truncate">{meta}</p>
                    </div>
                  </div>
                );
              })}

              {exercises.length === 0 && (
                <p className="text-[11px] text-[#555555] text-center py-6">
                  Nenhum exercício
                </p>
              )}
            </div>

            <button
              type="button"
              onClick={() => onAddExercise(ficha.id)}
              className="mx-3 mb-3 text-left text-[11px] font-medium text-[#39c75a] hover:opacity-80 py-2"
            >
              + adicionar exercício
            </button>
          </div>
        );
      })}

      {/* New column CTA */}
      <button
        type="button"
        onClick={onCreateTreino}
        className="min-h-28 rounded-xl border border-dashed border-card bg-transparent text-[11px] font-medium text-[#39c75a] hover:border-[#39c75a]/40 hover:bg-[#39c75a]/5 transition-colors flex flex-col items-center justify-center gap-2"
      >
        <Plus size={18} />
        + adicionar novo treino
      </button>
    </div>
  );
}
