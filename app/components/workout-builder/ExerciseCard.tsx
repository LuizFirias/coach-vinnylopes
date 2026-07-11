"use client";

import { useState } from "react";
import { DotsSixVertical, DotsThree, PencilSimple, Trash, Copy } from "@phosphor-icons/react";
import { RestBadge } from "./RestBadge";
import { SetRow, SetsTableHeader } from "./SetRow";
import { getColunasPorTipo, showPesoColumn } from "./exerciseColumns";
import type { ExercicioFicha } from "./types";
import { useBreakpoint } from "@/lib/hooks/useBreakpoint";
import { cn } from "@/lib/utils/cn";

interface ExerciseCardProps {
  exercicio: ExercicioFicha;
  exIndex: number;
  dragHandleProps?: {
    draggable?: boolean;
    onDragStart?: () => void;
    onDragEnd?: () => void;
  };
  isDragging?: boolean;
  onUpdate: (index: number, patch: Partial<ExercicioFicha>) => void;
  onDelete: (index: number) => void;
  onDuplicate?: (index: number) => void;
  onAddSet: (index: number) => void;
  onUpdateSerie: (exIndex: number, serieIndex: number, field: string, value: unknown) => void;
  onDeleteSerie: (exIndex: number, serieIndex: number) => void;
}

export function ExerciseCard({
  exercicio,
  exIndex,
  dragHandleProps,
  isDragging,
  onUpdate,
  onDelete,
  onDuplicate,
  onAddSet,
  onUpdateSerie,
  onDeleteSerie,
}: ExerciseCardProps) {
  const isMobile = useBreakpoint("mobile");
  const [showObservation, setShowObservation] = useState(Boolean(exercicio.observacoes));
  const [menuOpen, setMenuOpen] = useState(false);

  const baseCols = getColunasPorTipo(exercicio.tipo_exercicio);
  const temIsometria = exercicio.series.some((s) => s.tecnica_extra === "Isometria");
  const colunas = temIsometria
    ? baseCols.map((c) =>
        c.key === "reps_sugerido"
          ? { key: "tempo_sugerido", label: "Tempo", type: "text" as const, timeInput: true }
          : c
      )
    : baseCols;
  const showPeso = showPesoColumn(exercicio.tipo_exercicio);

  return (
    <div
      className={cn(
        "bg-surface-1 border border-border-subtle shadow-sm rounded-xl overflow-hidden transition-opacity",
        isDragging && "opacity-60"
      )}
    >
      <div className="flex items-center justify-between gap-1.5 px-3 py-2 bg-surface-2/40 border-b border-border-subtle">
        <div className="flex items-center gap-1 min-w-0 flex-1">
          <button
            type="button"
            className="shrink-0 p-0.5 cursor-grab active:cursor-grabbing text-text-muted touch-none"
            title="Arrastar para reordenar"
            {...dragHandleProps}
          >
            <DotsSixVertical size={15} />
          </button>
          {isMobile ? (
            <textarea
              value={exercicio.nome}
              onChange={(e) => onUpdate(exIndex, { nome: e.target.value })}
              rows={2}
              className="flex-1 min-w-0 h-7 max-h-7 text-[11px] font-semibold text-text-primary bg-transparent border-none p-0 focus:outline-none focus:ring-0 resize-none leading-[14px] whitespace-normal break-words overflow-y-auto"
            />
          ) : (
            <input
              type="text"
              value={exercicio.nome}
              onChange={(e) => onUpdate(exIndex, { nome: e.target.value })}
              className="flex-1 min-w-0 text-sm font-semibold text-text-primary bg-transparent border-none p-0 focus:outline-none focus:ring-0"
            />
          )}
        </div>
        <div className="flex items-center gap-1 shrink-0 relative">
          <RestBadge
            descanso={exercicio.descanso}
            onChange={(d) => onUpdate(exIndex, { descanso: d })}
            compact={isMobile}
          />
          <button
            type="button"
            onClick={() => setShowObservation((v) => !v)}
            className="w-7 h-7 flex items-center justify-center rounded-md text-text-muted hover:text-brand hover:bg-brand/5 transition-colors"
            title="Observação para o aluno"
          >
            <PencilSimple size={14} />
          </button>
          <button
            type="button"
            onClick={() => setMenuOpen((v) => !v)}
            className="w-7 h-7 flex items-center justify-center rounded-md text-text-muted hover:text-text-primary transition-colors"
            title="Opções"
          >
            <DotsThree size={16} weight="bold" />
          </button>
          {menuOpen && (
            <div className="absolute right-0 top-full mt-1 z-30 min-w-[170px] bg-surface-1 border border-border-subtle rounded-lg shadow-elev-2 py-1">
              <button
                type="button"
                onClick={() => { setShowObservation(true); setMenuOpen(false); }}
                className="w-full px-3 py-2 text-left text-sm text-text-primary hover:bg-surface-2"
              >
                Editar
              </button>
              {onDuplicate && (
                <button
                  type="button"
                  onClick={() => { onDuplicate(exIndex); setMenuOpen(false); }}
                  className="w-full px-3 py-2 text-left text-sm text-text-primary hover:bg-surface-2 flex items-center gap-2"
                >
                  <Copy size={14} /> Duplicar
                </button>
              )}
              <div className="h-px bg-[#222222] my-1" />
              <button
                type="button"
                onClick={() => { onDelete(exIndex); setMenuOpen(false); }}
                className="w-full px-3 py-2 text-left text-sm text-danger hover:bg-danger/10 flex items-center gap-2"
              >
                <Trash size={14} /> Remover
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="px-3 py-2.5 space-y-0.5 overflow-x-auto">
        <div className="min-w-[min(100%,340px)]">
          <SetsTableHeader colunas={colunas} showPeso={showPeso} />

          {exercicio.series.map((serie, sIndex) => (
            <SetRow
              key={sIndex}
              serie={serie}
              serieIndex={sIndex}
              colunas={colunas}
              showPeso={showPeso}
              onChange={(field, value) => onUpdateSerie(exIndex, sIndex, field, value)}
              onDelete={() => onDeleteSerie(exIndex, sIndex)}
            />
          ))}

          <button
            type="button"
            onClick={() => onAddSet(exIndex)}
            className="text-xs font-medium text-brand hover:underline pt-2"
          >
            + adicionar série
          </button>

          {showObservation && (
            <textarea
              value={exercicio.observacoes}
              onChange={(e) => onUpdate(exIndex, { observacoes: e.target.value })}
              placeholder="Observação para o aluno..."
              className="w-full mt-2 px-0 py-2 bg-transparent border-b border-border-subtle text-xs text-text-secondary focus:outline-none focus:border-brand/40 resize-none min-h-[52px]"
              rows={2}
            />
          )}
        </div>
      </div>
    </div>
  );
}
