"use client";

import { useId } from "react";
import { Check, Clock, ArrowDown } from "@phosphor-icons/react";
import { cn } from "@/lib/utils/cn";
import type { WorkoutBlock } from "@/lib/utils/biset";
import { formatRestTime } from "@/lib/utils/restTime";
import { isPerSideLoadEquipment } from "@/lib/constants/equipment";
import { CargaPorLadoInfoButton } from "@/app/components/treino/execucao/CargaPorLadoInfoModal";

interface SeriePreview {
  ordem: number;
  peso_atual: number;
  reps: number | string;
  reps_executadas?: number | string;
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

function resolveRepsPreview(serie: SeriePreview): { abaixo: boolean } {
  const exec = serie.reps_executadas;
  const presc = serie.reps;
  if (exec === undefined || exec === null || exec === "") {
    return { abaixo: false };
  }
  const execNum = typeof exec === "string" ? parseFloat(exec) : exec;
  const prescNum = typeof presc === "string" ? parseFloat(String(presc)) : presc;
  return {
    abaixo: !isNaN(execNum) && !isNaN(prescNum) && execNum < prescNum,
  };
}

function GradientPlayIcon({ size = 22 }: { size?: number }) {
  const gradId = useId().replace(/:/g, "");
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
      <defs>
        <linearGradient id={gradId} x1="4" y1="2" x2="20" y2="22" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#9B4DD4" />
          <stop offset="55%" stopColor="#751BB4" />
          <stop offset="100%" stopColor="#7e22ce" />
        </linearGradient>
      </defs>
      <path
        d="M8.2 5.1a1 1 0 0 1 1.55-.83l9.1 5.9a1 1 0 0 1 0 1.66l-9.1 5.9A1 1 0 0 1 8 16.9V7.1a1 1 0 0 1 .2-.99Z"
        fill={`url(#${gradId})`}
      />
    </svg>
  );
}

interface HalfPreviewProps {
  nome: string;
  equipamento?: string;
  series: SeriePreview[];
  showAnteriorCol: boolean;
  gridCols: string;
  showSemDescanso?: boolean;
  videoUrl?: string;
  treinoIniciado: boolean;
  onPesoChange: (ordem: number, peso: number) => void;
  onRepsChange: (ordem: number, reps: number | string) => void;
  onCheck: (ordem: number) => void;
  onVideoOpen?: (url: string) => void;
  onCargaInfo?: () => void;
}

function HalfPreview({
  nome,
  equipamento,
  series,
  showAnteriorCol,
  gridCols,
  showSemDescanso,
  videoUrl,
  treinoIniciado,
  onPesoChange,
  onRepsChange,
  onCheck,
  onVideoOpen,
  onCargaInfo,
}: HalfPreviewProps) {
  const all = series.every((s) => s.completado);
  const showCargaInfo = isPerSideLoadEquipment(equipamento, nome);
  return (
    <div>
      <div className="flex items-start gap-3 pb-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 min-w-0">
            <h3
              className="text-[14px] font-bold leading-snug truncate min-w-0"
              style={{ color: "var(--text-primary)" }}
            >
              {toTitleCase(nome)}
            </h3>
            {showCargaInfo && onCargaInfo && (
              <CargaPorLadoInfoButton onClick={onCargaInfo} size={14} />
            )}
          </div>
          {showSemDescanso && (
            <div className="flex items-center gap-1.5 mt-1">
              <Clock size={11} className="shrink-0" style={{ color: "var(--text-disabled)" }} />
              <p className="text-[11px]" style={{ color: "var(--text-disabled)" }}>Sem descanso</p>
            </div>
          )}
        </div>
        {videoUrl && onVideoOpen && (
          <button
            type="button"
            onClick={() => onVideoOpen(videoUrl)}
            className="flex items-center justify-center shrink-0 p-1 active:opacity-70 transition-opacity"
            aria-label="Ver vídeo do exercício"
          >
            <GradientPlayIcon size={22} />
          </button>
        )}
        {all && treinoIniciado && (
          <div className="w-6 h-6 rounded-full bg-success flex items-center justify-center shrink-0">
            <Check className="w-3.5 h-3.5 text-white" weight="bold" />
          </div>
        )}
      </div>
      <div className="pt-2" style={{ borderTop: "1px solid rgba(0,0,0,0.06)" }}>
        <div className="grid items-center py-2 mb-0.5" style={{ gridTemplateColumns: gridCols, columnGap: "10px" }}>
          <span className="text-[10px] font-semibold uppercase text-left" style={{ color: "var(--text-disabled)" }}>Set</span>
          {showAnteriorCol && (
            <span className="text-[10px] font-semibold uppercase" style={{ color: "var(--text-disabled)", paddingLeft: 4 }}>Ant.</span>
          )}
          <span className="text-[10px] font-semibold uppercase text-center" style={{ color: "var(--text-disabled)" }}>Peso</span>
          <span className="text-[10px] font-semibold uppercase text-center" style={{ color: "var(--text-disabled)" }}>Reps</span>
          <span className="text-[10px] font-semibold uppercase text-center" style={{ color: "var(--text-disabled)" }}>T1</span>
          <span className="text-[10px] font-semibold uppercase text-center" style={{ color: "var(--text-disabled)" }}>T2</span>
          <span className="text-[10px] text-center" style={{ color: "var(--text-disabled)" }}>✓</span>
        </div>
        {series.map((serie, idx) => (
          <div
            key={serie.ordem}
            className="grid items-center py-2"
            style={{
              gridTemplateColumns: gridCols,
              columnGap: "10px",
              borderBottom: "1px solid rgba(0,0,0,0.06)",
            }}
          >
            <span className="text-center text-xs font-bold font-sans" style={{ color: "var(--text-tertiary)" }}>{idx + 1}</span>
            {showAnteriorCol && (
              <span className="text-[11px] font-sans truncate" style={{ color: "var(--text-tertiary)", paddingLeft: 14 }}>
                {serie.anterior || "—"}
              </span>
            )}
            <input
              type="number"
              inputMode="decimal"
              value={serie.peso_atual || ""}
              onChange={(e) => onPesoChange(serie.ordem, parseFloat(e.target.value) || 0)}
              className="w-full max-w-[40px] mx-auto bg-transparent border-0 text-center font-sans tabular-nums lining-nums focus:outline-none disabled:opacity-50"
              style={{
                height: 28,
                fontSize: "15px",
                color: "var(--text-secondary)",
                fontFamily: 'var(--font-sans), "DM Sans", system-ui, sans-serif',
                fontVariantNumeric: "tabular-nums lining-nums",
                fontWeight: 400,
                borderBottom: "1.5px solid transparent",
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderBottomColor = "rgba(117, 27, 180,0.45)";
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderBottomColor = "transparent";
              }}
              disabled={!treinoIniciado}
            />
            {(() => {
              const { abaixo } = resolveRepsPreview(serie);
              return (
                <input
                  type="number"
                  inputMode="numeric"
                  value={
                    serie.reps_executadas !== undefined && serie.reps_executadas !== ""
                      ? serie.reps_executadas
                      : ""
                  }
                  placeholder={String(serie.reps)}
                  onChange={(e) => {
                    const raw = e.target.value;
                    onRepsChange(serie.ordem, raw === "" ? "" : parseFloat(raw) || 0);
                  }}
                  disabled={!treinoIniciado}
                  aria-label={`Reps da série ${serie.ordem}. Prescrito: ${serie.reps}`}
                  className={cn(
                    "w-full max-w-[36px] mx-auto bg-transparent border-0 text-center font-sans",
                    "tabular-nums lining-nums focus:outline-none disabled:opacity-50",
                    "placeholder:text-text-secondary",
                  )}
                  style={{
                    height: 28,
                    fontSize: "14px",
                    fontWeight: 600,
                    fontFamily: 'var(--font-sans), "DM Sans", system-ui, sans-serif',
                    fontVariantNumeric: "tabular-nums lining-nums",
                    color: serie.completado
                      ? "#39c75a"
                      : abaixo
                        ? "var(--warning)"
                        : "var(--text-primary)",
                    borderBottom: "1.5px solid transparent",
                  }}
                  onFocus={(e) => {
                    e.currentTarget.style.borderBottomColor = "rgba(117,27,180,0.45)";
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderBottomColor = "transparent";
                  }}
                />
              );
            })()}
            <span className="text-center text-[11px]" style={{ color: "var(--text-tertiary)" }}>
              {duasLetrasTenica(serie.tecnica) || "—"}
            </span>
            <span className="text-center text-[11px] text-accent">{serie.tecnica_extra || "—"}</span>
            <button
              type="button"
              onClick={() => onCheck(serie.ordem)}
              disabled={!treinoIniciado}
              className="mx-auto w-5 h-5 rounded-[4px] flex items-center justify-center transition-colors disabled:opacity-30"
              style={
                serie.completado
                  ? { background: "#751BB4", border: "1.5px solid #751BB4", color: "#fff" }
                  : { background: "transparent", border: "1.5px solid var(--border-default)" }
              }
            >
              {serie.completado && <Check size={12} weight="bold" color="#fff" />}
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
  onRepsChangeA: (ordem: number, reps: number | string) => void;
  onRepsChangeB: (ordem: number, reps: number | string) => void;
  onCheckA: (ordem: number) => void;
  onCheckB: (ordem: number) => void;
  onVideoOpen?: (url: string) => void;
  onCargaInfo?: () => void;
}

export function BiSetGroupPreviewCard({
  block,
  treinoIniciado,
  showAnteriorCol,
  gridCols,
  onPesoChangeA,
  onPesoChangeB,
  onRepsChangeA,
  onRepsChangeB,
  onCheckA,
  onCheckB,
  onVideoOpen,
  onCargaInfo,
}: BiSetGroupPreviewCardProps) {
  return (
    <div
      className="rounded-[14px] px-4 py-3.5"
      style={{
        background: "var(--surface-1)",
        border: "1px solid var(--border-subtle)",
        boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
      }}
    >
      <span className="inline-block text-[9px] font-bold uppercase tracking-wider text-brand bg-brand/10 rounded px-1.5 py-0.5 mb-3">
        BI-SET
      </span>

      <HalfPreview
        nome={block.exercicioA.nome}
        equipamento={block.exercicioA.equipamento}
        series={block.exercicioA.series}
        showAnteriorCol={showAnteriorCol}
        gridCols={gridCols}
        showSemDescanso
        videoUrl={block.exercicioA.video_url}
        treinoIniciado={treinoIniciado}
        onPesoChange={onPesoChangeA}
        onRepsChange={onRepsChangeA}
        onCheck={onCheckA}
        onVideoOpen={onVideoOpen}
        onCargaInfo={onCargaInfo}
      />

      <div className="flex items-center justify-center gap-1.5 py-2 my-1">
        <ArrowDown size={12} className="text-brand" />
        <span className="text-[11px]" style={{ color: "var(--text-disabled)" }}>↓ imediatamente</span>
      </div>

      <HalfPreview
        nome={block.exercicioB.nome}
        equipamento={block.exercicioB.equipamento}
        series={block.exercicioB.series}
        showAnteriorCol={showAnteriorCol}
        gridCols={gridCols}
        videoUrl={block.exercicioB.video_url}
        treinoIniciado={treinoIniciado}
        onPesoChange={onPesoChangeB}
        onRepsChange={onRepsChangeB}
        onCheck={onCheckB}
        onVideoOpen={onVideoOpen}
        onCargaInfo={onCargaInfo}
      />

      <div
        className="flex items-center gap-1.5 mt-3 pt-3"
        style={{ borderTop: "1px solid rgba(0,0,0,0.06)" }}
      >
        <Clock size={12} className="shrink-0" style={{ color: "var(--text-disabled)" }} />
        <p className="text-[11px] font-medium" style={{ color: "var(--text-disabled)" }}>
          Descanso após o par: {formatRestTime(block.descanso)}
        </p>
      </div>
    </div>
  );
}
