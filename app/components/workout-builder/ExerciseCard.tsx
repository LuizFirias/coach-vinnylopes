"use client";

import { useState } from "react";
import { DotsSixVertical, DotsThree, Trash, Copy, Play, Barbell } from "@phosphor-icons/react";
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
    onPointerDown?: (e: React.PointerEvent) => void;
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

  const hasVideo = Boolean(exercicio.video_url?.trim());

  return (
    <div
      className={cn(
        "bg-surface-1 border-0 rounded-xl overflow-hidden transition-opacity",
        isDragging && "opacity-95 ring-1 ring-brand/40"
      )}
    >
      <div className="flex items-center gap-2.5 px-4 py-3">
        <button
          type="button"
          className="shrink-0 p-0.5 cursor-grab active:cursor-grabbing text-text-muted touch-none select-none"
          title="Arrastar para reordenar"
          aria-label="Arrastar para reordenar"
          {...dragHandleProps}
        >
          <DotsSixVertical size={15} />
        </button>

        <span className="shrink-0 w-9 h-9 flex items-center justify-center">
          {hasVideo ? (
            <Play size={16} weight="fill" className="text-brand" />
          ) : (
            <Barbell size={16} className="text-brand" />
          )}
        </span>

        <div className="flex items-center min-w-0 flex-1">
          <p
            className={cn(
              "min-w-0 flex-1 font-semibold text-text-primary truncate",
              isMobile ? "text-[11px] leading-snug whitespace-normal break-words" : "text-sm",
            )}
            title={exercicio.nome}
          >
            {exercicio.nome}
          </p>
        </div>

        <div className="flex items-center gap-1 shrink-0 relative">
          <RestBadge
            descanso={exercicio.descanso}
            onChange={(d) => onUpdate(exIndex, { descanso: d })}
            compact={isMobile}
          />
          <button
            type="button"
            onClick={() => setMenuOpen((v) => !v)}
            className="w-7 h-7 flex items-center justify-center rounded-md text-text-muted hover:text-text-primary transition-colors"
            title="Opções"
          >
            <DotsThree size={16} weight="bold" />
          </button>
          {menuOpen && (
            <div className="absolute right-0 top-full mt-1 z-30 min-w-[170px] bg-surface-1 border-0 rounded-lg shadow-elev-2 py-1">
              <button
                type="button"
                onClick={() => { setShowObservation(true); setMenuOpen(false); }}
                className="w-full px-3 py-2 text-left text-sm text-text-primary hover:bg-surface-2"
              >
                Observação
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
              <div className="h-px bg-border-divider my-1" />
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

      {exercicio.imagem_url && (
        <div className="overflow-hidden">
          <img
            src={exercicio.imagem_url}
            alt={`Demonstração de ${exercicio.nome}`}
            className="w-full h-40 object-cover"
          />
        </div>
      )}

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
              className="w-full mt-2 px-0 py-2 bg-transparent border-0 border-b border-border-divider text-xs text-text-secondary focus:outline-none focus:border-brand/40 resize-none min-h-[52px]"
              rows={2}
            />
          )}
        </div>
      </div>
    </div>
  );
}
