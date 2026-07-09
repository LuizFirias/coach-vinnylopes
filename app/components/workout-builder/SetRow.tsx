"use client";

import { Trash } from "@phosphor-icons/react";
import TimeInput from "@/app/components/TimeInput";
import { TechniqueSelectWithTooltip } from "./TechniqueSelectWithTooltip";
import type { ColunaSerie, SerieDefinicao } from "./types";
import { cn } from "@/lib/utils/cn";

interface SetRowProps {
  serie: SerieDefinicao;
  serieIndex: number;
  colunas: ColunaSerie[];
  isMobile?: boolean;
  onChange: (field: string, value: unknown) => void;
  onDelete: () => void;
  onOpenDetail?: () => void;
}

const inputCls =
  "w-full h-7 px-1 bg-surface-0 border border-border-subtle rounded-md text-xs text-text-primary focus:outline-none focus:border-brand/40 text-center";

function gridTemplate(colunas: ColunaSerie[], isMobile: boolean): string {
  const metricCols = colunas.map(() => "minmax(0,1fr)").join(" ");
  if (isMobile) {
    return `1.25rem ${metricCols} 2rem 1.25rem`;
  }
  return `1.5rem ${metricCols} 2.75rem minmax(0,1.3fr) 1.25rem`;
}

export function SetRow({
  serie,
  serieIndex,
  colunas,
  isMobile = false,
  onChange,
  onDelete,
  onOpenDetail,
}: SetRowProps) {
  return (
    <div
      className="grid gap-1.5 items-center bg-surface-2 border border-border-subtle/50 px-1.5 py-1 rounded-lg mb-1"
      style={{ gridTemplateColumns: gridTemplate(colunas, isMobile) }}
    >
      <div className="flex items-center justify-center text-xs font-bold text-text-muted">
        {serie.ordem ?? serieIndex + 1}
      </div>

      {colunas.map((col) =>
        col.timeInput ? (
          <TimeInput
            key={col.key}
            value={String((serie as unknown as Record<string, unknown>)[col.key] ?? "00:00")}
            onChange={(v) => onChange(col.key, v)}
            className={cn(inputCls, "text-center")}
          />
        ) : col.type === "number" ? (
          <input
            key={col.key}
            type="number"
            step={col.step}
            placeholder={col.placeholder}
            value={String((serie as unknown as Record<string, unknown>)[col.key] ?? "")}
            onChange={(e) => onChange(col.key, Number(e.target.value))}
            className={inputCls}
          />
        ) : (
          <input
            key={col.key}
            type="text"
            placeholder={col.placeholder}
            value={String((serie as unknown as Record<string, unknown>)[col.key] ?? "")}
            onChange={(e) => onChange(col.key, e.target.value)}
            className={inputCls}
          />
        )
      )}

      {isMobile ? (
        <button
          type="button"
          onClick={onOpenDetail}
          className="h-7 px-1 bg-surface-0 border border-border-subtle rounded-md text-[10px] text-text-secondary text-center"
        >
          {serie.tecnica || "—"}
        </button>
      ) : (
        <>
          <TechniqueSelectWithTooltip
            type="technique"
            value={serie.tecnica ?? ""}
            onChange={(v) => onChange("tecnica", v)}
            compactTechnique
            className={cn(inputCls, "text-text-secondary")}
          />
          <TechniqueSelectWithTooltip
            type="extra"
            value={serie.tecnica_extra ?? ""}
            onChange={(v) => onChange("tecnica_extra", v)}
            className={cn(inputCls, "text-text-secondary")}
          />
        </>
      )}

      <button
        type="button"
        onClick={onDelete}
        className="flex items-center justify-center text-text-tertiary hover:text-danger transition-colors min-h-[28px] min-w-[28px]"
        title="Remover série"
      >
        <Trash size={14} />
      </button>
    </div>
  );
}

export function SetsTableHeader({
  colunas,
  isMobile = false,
}: {
  colunas: ColunaSerie[];
  isMobile?: boolean;
}) {
  return (
    <div
      className="grid gap-1.5 px-1.5 mb-1"
      style={{ gridTemplateColumns: gridTemplate(colunas, isMobile) }}
    >
      <span className="text-[10px] font-medium text-text-muted uppercase">#</span>
      {colunas.map((col) => (
        <span key={col.key} className="text-[10px] font-medium text-text-muted uppercase truncate">
          {col.label}
        </span>
      ))}
      {isMobile ? (
        <span className="text-[10px] font-medium text-brand/70 uppercase">Téc</span>
      ) : (
        <>
          <span className="text-[10px] font-medium text-brand/70 uppercase">Téc</span>
          <span className="text-[10px] font-medium text-brand/70 uppercase">Extra</span>
        </>
      )}
      <span />
    </div>
  );
}
