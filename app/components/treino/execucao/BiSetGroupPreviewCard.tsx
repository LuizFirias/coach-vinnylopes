"use client";

import { Check, Clock, Play, ArrowDown } from "@phosphor-icons/react";
import { cn } from "@/lib/utils/cn";
import type { WorkoutBlock } from "@/lib/utils/biset";
import { formatRestTime } from "@/lib/utils/restTime";

interface SeriePreview {
  ordem: number;
  peso_atual: number;
  reps: number | string;
  tecnica?: string;
  tecnica_extra?: string;
  completado: boolean;
  anterior?: string;
}

function toTitleCase(str: string) {
  return str.toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
}

function duasLetrasTenica(t?: string) {
  if (!t) return "";
  return t.length <= 3 ? t : t.slice(0, 2).toUpperCase();
}

interface HalfPreviewProps {
  nome: string;
  series: SeriePreview[];
  showAnteriorCol: boolean;
  gridCols: string;
  showSemDescanso?: boolean;
  videoUrl?: string;
  treinoIniciado: boolean;
  onPesoChange: (ordem: number, peso: number) => void;
  onCheck: (ordem: number) => void;
  onVideoOpen?: (url: string) => void;
}

function HalfPreview({
  nome,
  series,
  showAnteriorCol,
  gridCols,
  showSemDescanso,
  videoUrl,
  treinoIniciado,
  onPesoChange,
  onCheck,
  onVideoOpen,
}: HalfPreviewProps) {
  const all = series.every((s) => s.completado);
  return (
    <div>
      <div className="flex items-start gap-3 pb-3">
        <div className="flex-1 min-w-0">
          <h3 className="text-[15px] font-semibold text-text-primary leading-snug">{toTitleCase(nome)}</h3>
          {showSemDescanso && (
            <div className="flex items-center gap-1.5 mt-1.5">
              <Clock size={11} className="text-text-disabled shrink-0" />
              <p className="text-[11px] text-text-disabled">Sem descanso</p>
            </div>
          )}
        </div>
        {videoUrl && onVideoOpen && (
          <button
            type="button"
            onClick={() => onVideoOpen(videoUrl)}
            className="w-8 h-8 rounded-lg bg-surface-2 flex items-center justify-center text-text-secondary hover:text-brand shrink-0"
          >
            <Play size={18} weight="fill" />
          </button>
        )}
        {all && treinoIniciado && (
          <div className="w-6 h-6 rounded-full bg-success flex items-center justify-center shrink-0">
            <Check className="w-3.5 h-3.5 text-white" weight="bold" />
          </div>
        )}
      </div>
      <div className="border-t border-divider/50 pt-2">
        <div className="grid items-center py-2 mb-0.5" style={{ gridTemplateColumns: gridCols }}>
          <span className="text-[10px] font-semibold uppercase text-text-muted text-center">Set</span>
          {showAnteriorCol && <span className="text-[10px] font-semibold uppercase text-text-muted pl-2">Ant.</span>}
          <span className="text-[10px] font-semibold uppercase text-text-muted text-right pr-2">Peso</span>
          <span className="text-[10px] font-semibold uppercase text-text-muted text-center">Reps</span>
          <span className="text-[10px] font-semibold uppercase text-text-muted text-center">T1</span>
          <span className="text-[10px] font-semibold uppercase text-text-muted text-center">T2</span>
          <span className="text-[10px] text-text-muted text-center">✓</span>
        </div>
        {series.map((serie, idx) => (
          <div
            key={serie.ordem}
            className="grid items-center py-2 border-b border-divider/30 last:border-0"
            style={{ gridTemplateColumns: gridCols }}
          >
            <span className="text-center text-xs font-bold text-text-muted">{idx + 1}</span>
            {showAnteriorCol && <span className="text-[11px] text-text-muted pl-2 truncate">{serie.anterior || "—"}</span>}
            <input
              type="number"
              value={serie.peso_atual || ""}
              onChange={(e) => onPesoChange(serie.ordem, parseFloat(e.target.value) || 0)}
              className="text-right text-sm font-bold bg-transparent border-none focus:outline-none tabular-nums lining-nums"
              disabled={!treinoIniciado}
            />
            <span className="text-center text-sm font-semibold text-accent tabular-nums lining-nums">{serie.reps}</span>
            <span className="text-center text-[11px] text-text-secondary">{duasLetrasTenica(serie.tecnica) || "—"}</span>
            <span className="text-center text-[11px] text-accent">{serie.tecnica_extra || "—"}</span>
            <button
              type="button"
              onClick={() => onCheck(serie.ordem)}
              disabled={!treinoIniciado}
              className={cn(
                "mx-auto w-7 h-7 rounded-md border flex items-center justify-center transition-colors",
                serie.completado ? "bg-success border-success text-white" : "border-card bg-surface-2"
              )}
            >
              {serie.completado && <Check size={14} weight="bold" />}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

interface BiSetGroupPreviewCardProps {
  block: Extract<WorkoutBlock, { kind: "biset" }>;
  blockIdx: number;
  treinoIniciado: boolean;
  showAnteriorCol: boolean;
  gridCols: string;
  onPesoChangeA: (ordem: number, peso: number) => void;
  onPesoChangeB: (ordem: number, peso: number) => void;
  onCheckA: (ordem: number) => void;
  onCheckB: (ordem: number) => void;
  onVideoOpen?: (url: string) => void;
}

export function BiSetGroupPreviewCard({
  block,
  treinoIniciado,
  showAnteriorCol,
  gridCols,
  onPesoChangeA,
  onPesoChangeB,
  onCheckA,
  onCheckB,
  onVideoOpen,
}: BiSetGroupPreviewCardProps) {
  return (
    <div className="rounded-[14px] border border-[#1a2d4a] bg-[#141414] px-4 py-3.5">
      <span className="inline-block text-[9px] font-bold uppercase tracking-wider text-brand bg-[#1a2d4a] rounded px-1.5 py-0.5 mb-3">
        BI-SET
      </span>

      <HalfPreview
        nome={block.exercicioA.nome}
        series={block.exercicioA.series}
        showAnteriorCol={showAnteriorCol}
        gridCols={gridCols}
        showSemDescanso
        videoUrl={block.exercicioA.video_url}
        treinoIniciado={treinoIniciado}
        onPesoChange={onPesoChangeA}
        onCheck={onCheckA}
        onVideoOpen={onVideoOpen}
      />

      <div className="flex items-center justify-center gap-1.5 py-2 my-1">
        <ArrowDown size={12} className="text-brand" />
        <span className="text-[11px] text-text-disabled">↓ imediatamente</span>
      </div>

      <HalfPreview
        nome={block.exercicioB.nome}
        series={block.exercicioB.series}
        showAnteriorCol={showAnteriorCol}
        gridCols={gridCols}
        videoUrl={block.exercicioB.video_url}
        treinoIniciado={treinoIniciado}
        onPesoChange={onPesoChangeB}
        onCheck={onCheckB}
        onVideoOpen={onVideoOpen}
      />

      <div className="flex items-center gap-1.5 mt-3 pt-3 border-t border-divider/50">
        <Clock size={12} className="text-brand shrink-0" />
        <p className="text-xs text-brand font-medium">
          Descanso após o par: {formatRestTime(block.descanso)}
        </p>
      </div>
    </div>
  );
}
