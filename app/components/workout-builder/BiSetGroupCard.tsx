"use client";

import { useState } from "react";
import {
  DotsSixVertical,
  DotsThree,
  ArrowDown,
  Trash,
  X,
  PencilSimple,
} from "@phosphor-icons/react";
import { RestBadge } from "./RestBadge";
import { SetRow, SetsTableHeader } from "./SetRow";
import { BiSetPartnerPicker } from "./BiSetPartnerPicker";
import { getColunasPorTipo, showPesoColumn } from "./exerciseColumns";
import type { BiSetGroupFicha } from "@/lib/utils/biset";
import { useBreakpoint } from "@/lib/hooks/useBreakpoint";
import { cn } from "@/lib/utils/cn";

interface CatalogExercise {
  id: string;
  nome: string;
  grupo_muscular: string;
  tipo_exercicio?: string;
  video_url?: string;
}

interface BiSetGroupCardProps {
  group: BiSetGroupFicha;
  groupIndex: number;
  catalog: CatalogExercise[];
  dragHandleProps?: {
    onPointerDown?: (e: React.PointerEvent) => void;
  };
  isDragging?: boolean;
  onUpdateDescanso: (descanso: string) => void;
  onUpdateHalf: (half: "a" | "b", patch: { nome?: string; observacoes?: string }) => void;
  onUpdateSerie: (half: "a" | "b", serieIndex: number, field: string, value: unknown) => void;
  onAddSerie: () => void;
  onRemoveSerie: (serieIndex: number) => void;
  onSelectPartner: (ex: CatalogExercise) => void;
  onSwapPartner: () => void;
  onUndoBiSet: () => void;
  onDelete: () => void;
}

export function BiSetGroupCard({
  group,
  groupIndex,
  catalog,
  dragHandleProps,
  isDragging,
  onUpdateDescanso,
  onUpdateHalf,
  onUpdateSerie,
  onAddSerie,
  onRemoveSerie,
  onSelectPartner,
  onSwapPartner,
  onUndoBiSet,
  onDelete,
}: BiSetGroupCardProps) {
  const isMobile = useBreakpoint("mobile");
  const [menuAOpen, setMenuAOpen] = useState(false);
  const [menuBOpen, setMenuBOpen] = useState(false);
  const [showUndoModal, setShowUndoModal] = useState(false);
  const [showObsA, setShowObsA] = useState(Boolean(group.exercicioA.observacoes));
  const [showObsB, setShowObsB] = useState(Boolean(group.exercicioB?.observacoes));

  const halfA = group.exercicioA;
  const halfB = group.exercicioB;
  const isComplete = halfB !== null;

  const renderHalfGrid = (half: "a" | "b") => {
    const data = half === "a" ? halfA : halfB!;
    const baseCols = getColunasPorTipo(data.tipo_exercicio);
    const temIsometria = data.series.some((s) => s.tecnica_extra === "Isometria");
    const colunas = temIsometria
      ? baseCols.map((c) =>
          c.key === "reps_sugerido"
            ? { key: "tempo_sugerido", label: "Tempo", type: "text" as const, timeInput: true }
            : c
        )
      : baseCols;
    const showPeso = showPesoColumn(data.tipo_exercicio);

    return (
      <>
        <SetsTableHeader colunas={colunas} showPeso={showPeso} />
        {data.series.map((serie, sIndex) => (
          <SetRow
            key={`${half}-${sIndex}`}
            serie={serie}
            serieIndex={sIndex}
            colunas={colunas}
            showPeso={showPeso}
            onChange={(field, value) => onUpdateSerie(half, sIndex, field, value)}
            onDelete={() => onRemoveSerie(sIndex)}
          />
        ))}
      </>
    );
  };

  return (
    <>
      <div
        className={cn(
          "bg-[#141414] border border-brand rounded-[14px] overflow-hidden transition-opacity",
          isDragging && "opacity-95 shadow-elev-3"
        )}
      >
        {/* Exercício A */}
        <div className="px-3.5 py-2.5 border-b border-divider/50">
          <div className="flex items-center justify-between gap-1.5 mb-2">
            <div className="flex items-center gap-1.5 min-w-0 flex-1">
              <button
                type="button"
                className="shrink-0 p-0.5 cursor-grab active:cursor-grabbing text-text-muted touch-none select-none"
                title="Arrastar grupo Bi-Set"
                aria-label="Arrastar grupo Bi-Set"
                {...dragHandleProps}
              >
                <DotsSixVertical size={15} />
              </button>
              <span className="shrink-0 text-[8px] font-bold uppercase tracking-wider text-brand bg-[#1a2d4a] rounded px-1.5 py-0.5">
                BI-SET
              </span>
              {isMobile ? (
                <textarea
                  value={halfA.nome}
                  onChange={(e) => onUpdateHalf("a", { nome: e.target.value })}
                  rows={2}
                  className="flex-1 min-w-0 text-[11px] font-semibold text-text-primary bg-transparent border-none p-0 focus:outline-none resize-none leading-[14px]"
                />
              ) : (
                <input
                  type="text"
                  value={halfA.nome}
                  onChange={(e) => onUpdateHalf("a", { nome: e.target.value })}
                  className="flex-1 min-w-0 text-sm font-semibold text-text-primary bg-transparent border-none p-0 focus:outline-none"
                />
              )}
            </div>
            <div className="flex items-center gap-0.5 shrink-0 relative">
              <button
                type="button"
                onClick={() => setShowObsA((v) => !v)}
                className="w-7 h-7 flex items-center justify-center rounded-md text-text-muted hover:text-brand"
                title="Observação A"
              >
                <PencilSimple size={14} />
              </button>
              <button
                type="button"
                onClick={() => setMenuAOpen((v) => !v)}
                className="w-7 h-7 flex items-center justify-center rounded-md text-text-muted hover:text-text-primary"
              >
                <DotsThree size={16} weight="bold" />
              </button>
              {menuAOpen && (
                <div className="absolute right-0 top-full mt-1 z-30 min-w-[160px] bg-surface-1 border border-card rounded-lg shadow-elev-2 py-1">
                  <button
                    type="button"
                    onClick={() => { setShowUndoModal(true); setMenuAOpen(false); }}
                    className="w-full px-3 py-2 text-left text-xs text-text-primary hover:bg-surface-2"
                  >
                    Remover Bi-Set
                  </button>
                  <div className="h-px bg-[#222222] my-1" />
                  <button
                    type="button"
                    onClick={() => { onDelete(); setMenuAOpen(false); }}
                    className="w-full px-3 py-2 text-left text-xs text-danger hover:bg-danger/10"
                  >
                    Excluir grupo
                  </button>
                </div>
              )}
              {!isComplete && (
                <button
                  type="button"
                  onClick={onUndoBiSet}
                  className="w-7 h-7 flex items-center justify-center rounded-md text-text-muted hover:text-danger"
                  title="Desfazer Bi-Set"
                >
                  <X size={14} />
                </button>
              )}
            </div>
          </div>

          <div className="overflow-x-auto min-w-[min(100%,340px)]">{renderHalfGrid("a")}</div>

          {showObsA && (
            <textarea
              value={halfA.observacoes}
              onChange={(e) => onUpdateHalf("a", { observacoes: e.target.value })}
              placeholder="Observação para o aluno (A)..."
              className="w-full mt-2 px-0 py-2 bg-transparent border-b border-divider text-xs text-text-secondary focus:outline-none resize-none min-h-[44px]"
              rows={2}
            />
          )}
        </div>

        {/* Exercício B ou picker */}
        {!isComplete ? (
          <div className="px-3.5 pb-3.5">
            <BiSetPartnerPicker
              catalog={catalog}
              excludeIds={[halfA.exercicio_id]}
              onSelect={onSelectPartner}
            />
          </div>
        ) : (
          <div className="mx-3.5 mb-3.5 mt-1 rounded-[10px] bg-[#0f0f0f] border border-card p-3">
            <div className="flex items-center justify-between gap-1.5 mb-2">
              <div className="flex items-center gap-1.5 min-w-0 flex-1">
                <ArrowDown size={14} className="text-brand shrink-0" />
                {isMobile ? (
                  <textarea
                    value={halfB!.nome}
                    onChange={(e) => onUpdateHalf("b", { nome: e.target.value })}
                    rows={2}
                    className="flex-1 min-w-0 text-[11px] font-semibold text-text-primary bg-transparent border-none p-0 focus:outline-none resize-none leading-[14px]"
                  />
                ) : (
                  <input
                    type="text"
                    value={halfB!.nome}
                    onChange={(e) => onUpdateHalf("b", { nome: e.target.value })}
                    className="flex-1 min-w-0 text-sm font-semibold text-text-primary bg-transparent border-none p-0 focus:outline-none"
                  />
                )}
              </div>
              <div className="flex items-center gap-0.5 shrink-0 relative">
                <button
                  type="button"
                  onClick={() => setShowObsB((v) => !v)}
                  className="w-7 h-7 flex items-center justify-center rounded-md text-text-muted hover:text-brand"
                >
                  <PencilSimple size={14} />
                </button>
                <button
                  type="button"
                  onClick={() => setMenuBOpen((v) => !v)}
                  className="w-7 h-7 flex items-center justify-center rounded-md text-text-muted hover:text-text-primary"
                >
                  <DotsThree size={16} weight="bold" />
                </button>
                {menuBOpen && (
                  <div className="absolute right-0 top-full mt-1 z-30 min-w-[160px] bg-surface-1 border border-card rounded-lg shadow-elev-2 py-1">
                    <button
                      type="button"
                      onClick={() => { onSwapPartner(); setMenuBOpen(false); }}
                      className="w-full px-3 py-2 text-left text-xs text-text-primary hover:bg-surface-2"
                    >
                      Trocar exercício B
                    </button>
                    <button
                      type="button"
                      onClick={() => { setShowUndoModal(true); setMenuBOpen(false); }}
                      className="w-full px-3 py-2 text-left text-xs text-text-primary hover:bg-surface-2"
                    >
                      Remover Bi-Set
                    </button>
                  </div>
                )}
              </div>
            </div>
            <div className="overflow-x-auto min-w-[min(100%,340px)]">{renderHalfGrid("b")}</div>
            {showObsB && (
              <textarea
                value={halfB!.observacoes}
                onChange={(e) => onUpdateHalf("b", { observacoes: e.target.value })}
                placeholder="Observação para o aluno (B)..."
                className="w-full mt-2 px-0 py-2 bg-transparent border-b border-divider text-xs text-text-secondary focus:outline-none resize-none min-h-[44px]"
                rows={2}
              />
            )}
          </div>
        )}

        {isComplete && (
          <div className="px-3.5 pb-3 flex items-center gap-2">
            <RestBadge
              descanso={group.descanso}
              onChange={onUpdateDescanso}
              compact={isMobile}
              label="Descanso após o par"
            />
          </div>
        )}

        {isComplete && (
          <div className="px-3.5 pb-3">
            <button
              type="button"
              onClick={onAddSerie}
              className="text-xs font-medium text-brand hover:underline"
            >
              + adicionar série (A e B)
            </button>
          </div>
        )}
      </div>

      {showUndoModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-black/70 backdrop-blur-sm">
          <div className="w-full max-w-sm bg-surface-1 border border-card rounded-xl p-5">
            <h3 className="text-sm font-bold text-text-primary mb-2">Desfazer Bi-Set?</h3>
            <p className="text-xs text-text-secondary mb-4 leading-relaxed">
              Os exercícios voltarão a ser independentes. Nenhum exercício será deletado.
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setShowUndoModal(false)}
                className="flex-1 h-10 rounded-lg bg-surface-3 text-xs font-semibold text-text-secondary"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => { setShowUndoModal(false); onUndoBiSet(); }}
                className="flex-1 h-10 rounded-lg bg-[#1e1e1e] border border-[#444444] text-xs font-semibold text-text-primary"
              >
                Desfazer Bi-Set
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
