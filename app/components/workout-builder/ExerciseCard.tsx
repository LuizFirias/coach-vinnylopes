"use client";

import { useState } from "react";
import { DotsSixVertical, PencilSimple, Trash, LinkSimple } from "@phosphor-icons/react";
import { RestBadge } from "./RestBadge";
import { SetRow, SetsTableHeader } from "./SetRow";
import { SetDetailSheet } from "./SetDetailSheet";
import { getColunasPorTipo } from "./exerciseColumns";
import type { ExercicioFicha } from "./types";
import { cn } from "@/lib/utils/cn";

interface ExerciseCardProps {
  exercicio: ExercicioFicha;
  exIndex: number;
  isMobile: boolean;
  allExercises: ExercicioFicha[];
  dragHandleProps?: {
    draggable?: boolean;
    onDragStart?: () => void;
    onDragEnd?: () => void;
  };
  isDragging?: boolean;
  onUpdate: (index: number, patch: Partial<ExercicioFicha>) => void;
  onDelete: (index: number) => void;
  onAddSet: (index: number) => void;
  onUpdateSerie: (exIndex: number, serieIndex: number, field: string, value: unknown) => void;
  onDeleteSerie: (exIndex: number, serieIndex: number) => void;
}

export function ExerciseCard({
  exercicio,
  exIndex,
  isMobile,
  allExercises,
  dragHandleProps,
  isDragging,
  onUpdate,
  onDelete,
  onAddSet,
  onUpdateSerie,
  onDeleteSerie,
}: ExerciseCardProps) {
  const [showObservation, setShowObservation] = useState(Boolean(exercicio.observacoes));
  const [detailSerieIndex, setDetailSerieIndex] = useState<number | null>(null);

  const baseCols = getColunasPorTipo(exercicio.tipo_exercicio);
  const temIsometria = exercicio.series.some((s) => s.tecnica_extra === "Isometria");
  const colunas = temIsometria
    ? baseCols.map((c) =>
        c.key === "reps_sugerido"
          ? { key: "tempo_sugerido", label: "Tempo", type: "text" as const, timeInput: true }
          : c
      )
    : baseCols;

  return (
    <>
      <div
        className={cn(
          "bg-surface-1 border border-border-subtle shadow-sm rounded-xl overflow-hidden transition-opacity",
          isDragging && "opacity-60"
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between gap-2 px-3.5 py-2.5 bg-surface-2/40 border-b border-border-subtle">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <button
              type="button"
              className="shrink-0 p-1 cursor-grab active:cursor-grabbing text-text-muted touch-none"
              title="Arrastar para reordenar"
              {...dragHandleProps}
            >
              <DotsSixVertical size={16} />
            </button>
            <input
              type="text"
              value={exercicio.nome}
              onChange={(e) => onUpdate(exIndex, { nome: e.target.value })}
              className="flex-1 min-w-0 text-sm font-semibold text-text-primary bg-transparent border-none p-0 focus:outline-none focus:ring-0"
            />
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <RestBadge
              descanso={exercicio.descanso}
              onChange={(d) => onUpdate(exIndex, { descanso: d })}
            />
            <button
              type="button"
              onClick={() => setShowObservation((v) => !v)}
              className="w-8 h-8 flex items-center justify-center rounded-md text-text-muted hover:text-brand hover:bg-brand/5 transition-colors"
              title="Observação para o aluno"
            >
              <PencilSimple size={15} />
            </button>
            <button
              type="button"
              onClick={() => onDelete(exIndex)}
              className="w-8 h-8 flex items-center justify-center rounded-md text-text-muted hover:text-danger hover:bg-danger/10 transition-colors"
              title="Excluir exercício"
            >
              <Trash size={15} />
            </button>
          </div>
        </div>

        <div className="p-3.5 space-y-2">
          {exercicio.series.some((s) => s.tecnica_extra === "Bi-Set") && (
            <div className="flex flex-col gap-1.5 pb-2 border-b border-border-subtle/50">
              <label className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-brand">
                <LinkSimple size={14} weight="bold" /> Parceiro Bi-Set
              </label>
              <select
                value={exercicio.biset_parceiro_id || ""}
                onChange={(e) =>
                  onUpdate(exIndex, { biset_parceiro_id: e.target.value || undefined })
                }
                className="w-full h-9 px-2.5 bg-surface-0 border border-brand/30 rounded-md text-xs text-text-primary focus:outline-none"
              >
                <option value="">— Selecionar exercício parceiro —</option>
                {allExercises
                  .filter((ex) => ex.instanceId !== exercicio.instanceId)
                  .map((partnerEx) => (
                    <option key={partnerEx.instanceId} value={partnerEx.id}>
                      {partnerEx.nome}
                    </option>
                  ))}
              </select>
            </div>
          )}

          <SetsTableHeader colunas={colunas} isMobile={isMobile} />

          {exercicio.series.map((serie, sIndex) => (
            <SetRow
              key={sIndex}
              serie={serie}
              serieIndex={sIndex}
              colunas={colunas}
              isMobile={isMobile}
              onChange={(field, value) => onUpdateSerie(exIndex, sIndex, field, value)}
              onDelete={() => onDeleteSerie(exIndex, sIndex)}
              onOpenDetail={isMobile ? () => setDetailSerieIndex(sIndex) : undefined}
            />
          ))}

          <button
            type="button"
            onClick={() => onAddSet(exIndex)}
            className="text-xs font-medium text-brand hover:underline pt-1"
          >
            + adicionar série
          </button>

          {showObservation && (
            <textarea
              value={exercicio.observacoes}
              onChange={(e) => onUpdate(exIndex, { observacoes: e.target.value })}
              placeholder="Observação para o aluno..."
              className="w-full mt-2 px-3 py-2 bg-surface-2 border border-border-subtle rounded-lg text-xs text-text-secondary focus:outline-none focus:border-brand/40 resize-none min-h-[52px]"
              rows={2}
            />
          )}
        </div>
      </div>

      {detailSerieIndex !== null && (
        <SetDetailSheet
          serie={exercicio.series[detailSerieIndex]}
          onChange={(patch) => {
            Object.entries(patch).forEach(([field, value]) => {
              onUpdateSerie(exIndex, detailSerieIndex, field, value);
            });
          }}
          onClose={() => setDetailSerieIndex(null)}
        />
      )}
    </>
  );
}
