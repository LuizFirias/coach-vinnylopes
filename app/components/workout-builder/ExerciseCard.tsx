"use client";

import { useState } from "react";
import { DotsSixVertical, Trash, Play, Barbell, Timer, ChatCircle } from "@phosphor-icons/react";
import { RestBadge } from "./RestBadge";
import { SetRow, SetsTableHeader } from "./SetRow";
import { getColunasPorTipo, showPesoColumn } from "./exerciseColumns";
import { isClusterSet, isMyoReps, contarBlocosReps } from "@/lib/constants/workout-techniques";
import { clusterInputCls } from "./RepsField";
import type { ExercicioFicha } from "./types";
import { useBreakpoint } from "@/lib/hooks/useBreakpoint";
import { cn } from "@/lib/utils/cn";

/** Mesmo desenho do ícone de "Feedbacks" do sidebar (balão de chat + "!") —
 *  usado aqui pra abrir a observação do exercício. */
function ObservacaoIcon({
  size = 16,
  weight = "regular",
  className,
}: {
  size?: number;
  weight?: "fill" | "regular";
  className?: string;
}) {
  return (
    <span className={cn("relative inline-flex items-center justify-center", className)} style={{ width: size, height: size }} aria-hidden>
      <ChatCircle size={size} weight={weight} className="absolute inset-0" />
      <span className="relative z-[1] font-bold leading-none" style={{ fontSize: Math.max(8, Math.round(size * 0.42)), marginTop: -1 }}>
        !
      </span>
    </span>
  );
}

interface ExerciseCardProps {
  exercicio: ExercicioFicha;
  exIndex: number;
  dragHandleProps?: {
    onPointerDown?: (e: React.PointerEvent) => void;
  };
  isDragging?: boolean;
  onUpdate: (index: number, patch: Partial<ExercicioFicha>) => void;
  onDelete: (index: number) => void;
  onAddSet: (index: number) => void;
  onUpdateSerie: (exIndex: number, serieIndex: number, field: string, value: unknown) => void;
  onDeleteSerie: (exIndex: number, serieIndex: number) => void;
  onUpdateClusterDescanso?: (exIndex: number, segundos: number) => void;
  onUpdateMyoDescanso?: (exIndex: number, segundos: number) => void;
}

export function ExerciseCard({
  exercicio,
  exIndex,
  dragHandleProps,
  isDragging,
  onUpdate,
  onDelete,
  onAddSet,
  onUpdateSerie,
  onDeleteSerie,
  onUpdateClusterDescanso,
  onUpdateMyoDescanso,
}: ExerciseCardProps) {
  const isMobile = useBreakpoint("mobile");
  const [showObservation, setShowObservation] = useState(Boolean(exercicio.observacoes));

  const colunas = getColunasPorTipo(exercicio.tipo_exercicio);
  const showPeso = showPesoColumn(exercicio.tipo_exercicio);
  const temClusterSet = exercicio.series.some((s) => isClusterSet(s));
  const temMyoReps = exercicio.series.some((s) => isMyoReps(s));
  // Maior nº de blocos entre as séries em Cluster Set/Myo Reps — larga a
  // coluna de reps o bastante pra caber em todas as linhas, mantendo tudo alinhado.
  const maxClusterBlocos = exercicio.series.reduce((max, s) => Math.max(max, contarBlocosReps(s)), 1);

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

        <span className="shrink-0 w-9 h-9 flex items-center justify-center overflow-hidden rounded-lg">
          {exercicio.imagem_url || exercicio.gif_url ? (
            <img
              src={exercicio.imagem_url || exercicio.gif_url}
              alt=""
              aria-hidden
              className="w-full h-full object-cover"
            />
          ) : (
            <Barbell size={16} className="text-brand" />
          )}
        </span>

        <div className="flex items-center min-w-0 flex-1">
          <p
            className={cn(
              "min-w-0 flex-1 font-semibold text-text-primary truncate",
              isMobile ? "text-[11px] leading-snug" : "text-sm",
            )}
            title={exercicio.nome}
          >
            {exercicio.nome}
          </p>
        </div>

        {hasVideo && (
          <span className="shrink-0 w-6 h-6 flex items-center justify-center ml-1">
            <Play size={16} weight="fill" className="text-brand" />
          </span>
        )}

        <div className="flex items-center gap-1 shrink-0 relative">
          <RestBadge
            descanso={exercicio.descanso}
            onChange={(d) => onUpdate(exIndex, { descanso: d })}
            compact={isMobile}
          />
          <button
            type="button"
            onClick={() => setShowObservation((v) => !v)}
            className="w-7 h-7 flex items-center justify-center rounded-md text-text-muted hover:text-text-primary transition-colors"
            title="Observação do exercício"
            aria-label="Observação do exercício"
          >
            <ObservacaoIcon size={16} weight={showObservation ? "fill" : "regular"} className={showObservation ? "text-brand" : undefined} />
          </button>
          <button
            type="button"
            onClick={() => onDelete(exIndex)}
            className="w-7 h-7 flex items-center justify-center rounded-md text-text-muted hover:text-danger transition-colors"
            title="Remover exercício"
            aria-label="Remover exercício"
          >
            <Trash size={16} />
          </button>
        </div>
      </div>

      <div className="px-3 py-2.5 space-y-0.5 overflow-x-auto">
        <div className="min-w-[min(100%,340px)]">
          <SetsTableHeader colunas={colunas} showPeso={showPeso} maxClusterBlocos={maxClusterBlocos} />

          {exercicio.series.map((serie, sIndex) => (
            <SetRow
              key={sIndex}
              serie={serie}
              serieIndex={sIndex}
              colunas={colunas}
              showPeso={showPeso}
              maxClusterBlocos={maxClusterBlocos}
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

          {temClusterSet && onUpdateClusterDescanso && (
            <div className="mt-2 flex items-center gap-2 border-t border-border-divider pt-2">
              <Timer size={13} weight="bold" className="text-brand shrink-0" />
              <span className="text-xs text-text-tertiary">Descanso entre clusters</span>
              <input
                type="number"
                inputMode="numeric"
                value={exercicio.series.find((s) => isClusterSet(s))?.cluster_descanso_seg ?? ""}
                onChange={(e) => onUpdateClusterDescanso(exIndex, parseInt(e.target.value, 10) || 0)}
                placeholder="15"
                className={clusterInputCls}
                aria-label="Descanso entre clusters em segundos"
              />
              <span className="text-xs text-text-tertiary">s</span>
            </div>
          )}

          {temMyoReps && onUpdateMyoDescanso && (
            <div className="mt-2 flex items-center gap-2 border-t border-border-divider pt-2">
              <Timer size={13} weight="bold" className="text-brand shrink-0" />
              <span className="text-xs text-text-tertiary">Descanso entre mini-séries</span>
              <input
                type="number"
                inputMode="numeric"
                value={exercicio.series.find((s) => isMyoReps(s))?.myo_descanso_seg ?? ""}
                onChange={(e) => onUpdateMyoDescanso(exIndex, parseInt(e.target.value, 10) || 0)}
                placeholder="15"
                className={clusterInputCls}
                aria-label="Descanso entre mini-séries de Myo Reps em segundos"
              />
              <span className="text-xs text-text-tertiary">s</span>
            </div>
          )}

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
