"use client";

import { useState } from "react";
import {
  DotsSixVertical,
  DotsThree,
  ArrowDown,
  Trash,
  X,
  PencilSimple,
  CaretRight,
} from "@phosphor-icons/react";
import { RestBadge } from "./RestBadge";
import { SetRow, SetsTableHeader } from "./SetRow";
import { getColunasPorTipo, showPesoColumn } from "./exerciseColumns";
import { BodyPortal, useLockBodyScroll } from "@/app/components/ui/BodyPortal";
import type { BiSetGroupFicha } from "@/lib/utils/biset";
import { useBreakpoint } from "@/lib/hooks/useBreakpoint";
import { cn } from "@/lib/utils/cn";

interface BiSetGroupCardProps {
  group: BiSetGroupFicha;
  groupIndex: number;
  dragHandleProps?: {
    onPointerDown?: (e: React.PointerEvent) => void;
  };
  isDragging?: boolean;
  onUpdateDescanso: (descanso: string) => void;
  onUpdateHalf: (half: "a" | "b", patch: { nome?: string; observacoes?: string }) => void;
  onUpdateSerie: (half: "a" | "b", serieIndex: number, field: string, value: unknown) => void;
  onAddSerie: () => void;
  onRemoveSerie: (serieIndex: number) => void;
  onSwapPartner: () => void;
  onRequestPickPartner: () => void;
  onUndoBiSet: () => void;
  onDelete: () => void;
}

export function BiSetGroupCard({
  group,
  groupIndex,
  dragHandleProps,
  isDragging,
  onUpdateDescanso,
  onUpdateHalf,
  onUpdateSerie,
  onAddSerie,
  onRemoveSerie,
  onSwapPartner,
  onRequestPickPartner,
  onUndoBiSet,
  onDelete,
}: BiSetGroupCardProps) {
  const isMobile = useBreakpoint("mobile");
  const [menuAOpen, setMenuAOpen] = useState(false);
  const [menuBOpen, setMenuBOpen] = useState(false);
  const [showUndoModal, setShowUndoModal] = useState(false);
  const [showObsA, setShowObsA] = useState(Boolean(group.exercicioA.observacoes));
  const [showObsB, setShowObsB] = useState(Boolean(group.exercicioB?.observacoes));
  useLockBodyScroll(showUndoModal);
  const halfA = group.exercicioA;
  const halfB = group.exercicioB;
  const isComplete = halfB !== null;

  const renderHalfGrid = (half: "a" | "b") => {
    const data = half === "a" ? halfA : halfB!;
    const colunas = getColunasPorTipo(data.tipo_exercicio);
    const showPeso = showPesoColumn(data.tipo_exercicio);

    return (
      <>
        <SetsTableHeader colunas={colunas} showPeso={showPeso} showExtra={false} />
        {data.series.map((serie, sIndex) => (
          <SetRow
            key={`${half}-${sIndex}`}
            serie={serie}
            serieIndex={sIndex}
            colunas={colunas}
            showPeso={showPeso}
            showExtra={false}
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
          "bg-surface-1 border-0 rounded-[14px] overflow-hidden transition-opacity",
          isDragging && "opacity-95 ring-1 ring-brand/40 shadow-elev-3"
        )}
        style={{
          boxShadow: isDragging
            ? undefined
            : "0 0 0 1px rgba(147,51,234,0.3), 0 0 18px rgba(147,51,234,0.28)",
        }}
      >
        {/* Exercício A */}
        <div className="px-3.5 py-2.5">
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
              <span className="shrink-0 text-[8px] font-bold uppercase tracking-wider text-brand">
                BI-SET
              </span>
              <p
                className={cn(
                  "min-w-0 flex-1 font-semibold text-text-primary truncate",
                  isMobile ? "text-[11px] leading-snug whitespace-normal break-words" : "text-sm",
                )}
                title={halfA.nome}
              >
                {halfA.nome}
              </p>
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
                <div className="absolute right-0 top-full mt-1 z-30 min-w-[160px] bg-surface-1 border-0 rounded-lg shadow-elev-2 py-1">
                  <button
                    type="button"
                    onClick={() => { setShowUndoModal(true); setMenuAOpen(false); }}
                    className="w-full px-3 py-2 text-left text-xs text-text-primary hover:bg-surface-2"
                  >
                    Remover Bi-Set
                  </button>
                  <div className="h-px bg-border-divider my-1" />
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
              className="w-full mt-2 px-0 py-2 bg-transparent border-0 border-b border-border-divider text-xs text-text-secondary focus:outline-none resize-none min-h-[44px]"
              rows={2}
            />
          )}
        </div>

        {/* Exercício B ou CTA para biblioteca */}
        {!isComplete ? (
          <div className="px-3.5 pb-3.5">
            <button
              type="button"
              onClick={onRequestPickPartner}
              className="w-full mt-1 rounded-xl bg-brand/10 px-3.5 py-3 flex items-center justify-between gap-3 text-left hover:bg-brand/15 transition-colors"
            >
              <div className="min-w-0">
                <p className="text-xs font-semibold text-brand">
                  + Selecionar exercício B
                </p>
                <p className="text-[11px] text-text-tertiary mt-0.5">
                  Escolha na biblioteca ao lado
                </p>
              </div>
              <CaretRight size={16} className="text-brand shrink-0" />
            </button>
          </div>
        ) : (
          <div className="mx-3.5 mb-3.5 mt-1 rounded-[10px] bg-surface-2/60 border-0 p-3">
            <div className="flex items-center justify-between gap-1.5 mb-2">
              <div className="flex items-center gap-1.5 min-w-0 flex-1">
                <ArrowDown size={14} className="text-brand shrink-0" />
                <p
                  className={cn(
                    "min-w-0 flex-1 font-semibold text-text-primary truncate",
                    isMobile ? "text-[11px] leading-snug whitespace-normal break-words" : "text-sm",
                  )}
                  title={halfB!.nome}
                >
                  {halfB!.nome}
                </p>
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
                  <div className="absolute right-0 top-full mt-1 z-30 min-w-[160px] bg-surface-1 border-0 rounded-lg shadow-elev-2 py-1">
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
                className="w-full mt-2 px-0 py-2 bg-transparent border-0 border-b border-border-divider text-xs text-text-secondary focus:outline-none resize-none min-h-[44px]"
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
        <BodyPortal>
        <div className="fixed inset-0 z-[200] flex items-center justify-center px-4 bg-black/70 backdrop-blur-sm">
          <div className="w-full max-w-sm bg-surface-1 border-0 rounded-xl p-5">
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
                className="flex-1 h-10 rounded-lg bg-surface-2 border-0 text-xs font-semibold text-text-primary"
              >
                Desfazer Bi-Set
              </button>
            </div>
          </div>
        </div>
        </BodyPortal>
      )}
    </>
  );
}
