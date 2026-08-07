"use client";

import { Trash } from "@phosphor-icons/react";
import TimeInput from "@/app/components/TimeInput";
import { TechniqueCell } from "./TechniqueCell";
import { RepsField } from "./RepsField";
import { isIsometria } from "@/lib/constants/workout-techniques";
import type { ColunaSerie, SerieDefinicao } from "./types";
import { cn } from "@/lib/utils/cn";

interface SetRowProps {
  serie: SerieDefinicao;
  serieIndex: number;
  colunas: ColunaSerie[];
  showPeso?: boolean;
  /** Bi-set já é uma técnica em si — some com a coluna Téc (tecnica_extra) para não misturar. */
  showExtra?: boolean;
  onChange: (field: string, value: unknown) => void;
  onDelete: () => void;
}

const cellInputCls =
  "serie-metric-input w-full h-8 bg-transparent border-0 text-center text-sm font-medium text-text-primary placeholder:text-text-disabled focus:outline-none focus:text-brand tabular-nums lining-nums shadow-none";

function gridTemplate(colunas: ColunaSerie[], showPeso: boolean, showExtra: boolean): string {
  const metricCols = colunas.map(() => "minmax(0,1fr)").join(" ");
  const parts = ["1.5rem", metricCols];
  if (showPeso) parts.push("minmax(2.5rem,1fr)");
  if (showExtra) {
    // Espaço ~10% antes de Téc (empurra a coluna para a direita)
    parts.push("10%", "minmax(2.5rem,1.1fr)");
  }
  parts.push("1.25rem");
  return parts.join(" ");
}

export function SetRow({
  serie,
  serieIndex,
  colunas,
  showPeso = false,
  showExtra = true,
  onChange,
  onDelete,
}: SetRowProps) {
  const serieRecord = serie as unknown as Record<string, unknown>;

  return (
    <div
      className="grid gap-1 items-center py-1 border-b border-border-divider/40 last:border-0"
      style={{ gridTemplateColumns: gridTemplate(colunas, showPeso, showExtra) }}
    >
      <TechniqueCell
        type="technique"
        value={serie.tecnica ?? ""}
        onChange={(v) => onChange("tecnica", v)}
        fallback={String(serie.ordem ?? serieIndex + 1)}
        className="tabular-nums lining-nums"
      />

      {colunas.map((col) =>
        col.key === "reps_sugerido" && isIsometria(serie) ? (
          // Isometria é por série — só essa linha vira Tempo, sem afetar as outras do exercício
          <TimeInput
            key={col.key}
            value={String(serieRecord["tempo_sugerido"] ?? "00:00")}
            onChange={(v) => onChange("tempo_sugerido", v)}
            className={cn(cellInputCls, "text-center")}
          />
        ) : col.key === "reps_sugerido" ? (
          <RepsField key={col.key} serie={serie} placeholder={col.placeholder} onChange={onChange} />
        ) : col.timeInput ? (
          <TimeInput
            key={col.key}
            value={String(serieRecord[col.key] ?? "00:00")}
            onChange={(v) => onChange(col.key, v)}
            className={cn(cellInputCls, "text-center")}
          />
        ) : col.type === "number" ? (
          <input
            key={col.key}
            type="number"
            step={col.step}
            placeholder={col.placeholder}
            value={serieRecord[col.key] != null && serieRecord[col.key] !== "" ? String(serieRecord[col.key]) : ""}
            onChange={(e) => onChange(col.key, e.target.value === "" ? null : Number(e.target.value))}
            className={cellInputCls}
          />
        ) : (
          <input
            key={col.key}
            type="text"
            inputMode={col.key === "reps_sugerido" ? "numeric" : "text"}
            placeholder={col.placeholder}
            value={String(serieRecord[col.key] ?? "")}
            onChange={(e) => onChange(col.key, e.target.value)}
            className={cellInputCls}
          />
        )
      )}

      {showPeso && (
        <input
          type="number"
          step="0.5"
          placeholder="—"
          value={serie.peso_sugerido != null && serie.peso_sugerido > 0 ? String(serie.peso_sugerido) : ""}
          onChange={(e) => {
            const raw = e.target.value;
            onChange("peso_sugerido", raw === "" ? null : Number(raw));
          }}
          className={cellInputCls}
          aria-label="Peso sugerido (kg)"
        />
      )}

      {showExtra && (
        <>
          <span aria-hidden className="block" />

          <TechniqueCell
            type="extra"
            value={serie.tecnica_extra ?? ""}
            onChange={(v) => onChange("tecnica_extra", v)}
          />
        </>
      )}

      <button
        type="button"
        onClick={onDelete}
        className="flex items-center justify-center text-text-tertiary hover:text-danger transition-colors min-h-[32px] min-w-[32px]"
        title="Remover série"
        aria-label="Remover série"
      >
        <Trash size={14} />
      </button>
    </div>
  );
}

export function SetsTableHeader({
  colunas,
  showPeso = false,
  showExtra = true,
}: {
  colunas: ColunaSerie[];
  showPeso?: boolean;
  showExtra?: boolean;
}) {
  return (
    <div
      className="grid gap-1 px-0 pb-1 border-b border-border-divider/50"
      style={{ gridTemplateColumns: gridTemplate(colunas, showPeso, showExtra) }}
    >
      <span className="text-[10px] font-semibold text-text-muted uppercase text-center">Set</span>
      {colunas.map((col) => (
        <span
          key={col.key}
          className="text-[10px] font-semibold text-text-muted uppercase text-center truncate"
        >
          {col.label}
        </span>
      ))}
      {showPeso && (
        <span className="text-[10px] font-semibold text-text-muted uppercase text-center">kg</span>
      )}
      {showExtra && (
        <>
          <span aria-hidden className="block" />
          <span className="text-[10px] font-semibold text-brand/80 uppercase text-center">Téc</span>
        </>
      )}
      <span />
    </div>
  );
}
