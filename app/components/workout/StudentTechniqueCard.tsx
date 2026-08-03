"use client";

import { Info, X } from "@phosphor-icons/react";
import { getExtraByValue, getTechniqueByValue } from "@/lib/constants/workout-techniques";
import { cn } from "@/lib/utils/cn";

interface StudentTechniqueCardProps {
  techniqueValue?: string | null;
  extraValue?: string | null;
  expanded?: boolean;
  onExpandedChange?: (expanded: boolean) => void;
  className?: string;
}

function TechniqueBlock({
  name,
  instruction,
  example,
}: {
  name: string;
  instruction: string;
  example?: string | null;
}) {
  return (
    <div>
      <p className="text-[11px] font-bold text-[#333] mb-1">{name}</p>
      <p
        className={cn(
          "text-[11px] text-[#555] leading-relaxed",
          example ? "mb-2" : undefined,
        )}
      >
        {instruction}
      </p>
      {example && (
        <p className="text-[10px] text-brand italic leading-snug">
          Ex: {example}
        </p>
      )}
    </div>
  );
}

/**
 * Card inline de técnica (padrão D: branco + accent bar roxa).
 * Oculto por padrão — o pai controla `expanded` via ⓘ do KPI TÉCNICA.
 */
export function StudentTechniqueCard({
  techniqueValue,
  extraValue,
  expanded = false,
  onExpandedChange,
  className,
}: StudentTechniqueCardProps) {
  const technique = getTechniqueByValue(techniqueValue);
  const extra = getExtraByValue(extraValue);

  const hasTechnique = Boolean(technique?.studentInstruction);
  const hasExtra = Boolean(extra?.studentInstruction);

  if (!expanded || (!hasTechnique && !hasExtra)) return null;

  const summaryLabel = [technique?.shortLabel, extra?.label]
    .filter((v) => v && v !== "—")
    .join(" + ");

  return (
    <div
      className={cn(
        "flex overflow-hidden rounded-[12px] animate-slide-down",
        className,
      )}
      style={{
        background: "var(--surface-1)",
        border: "1px solid rgba(0,0,0,0.08)",
        boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
      }}
      role="region"
      aria-label="Como executar esta série"
    >
      <div
        className="w-1 shrink-0"
        style={{
          background: "var(--btn-primary-bg)",
        }}
        aria-hidden
      />

      <div className="flex-1 px-3.5 py-3">
        <div className="flex items-center justify-between gap-2 mb-1.5">
          <div className="flex items-center gap-1.5 min-w-0">
            <Info size={14} className="text-brand shrink-0" aria-hidden />
            <p className="text-xs font-bold text-brand truncate">
              Como executar esta série
            </p>
          </div>
          <button
            type="button"
            onClick={() => onExpandedChange?.(false)}
            className="shrink-0 p-0.5 text-[#ccc] hover:text-[#888] transition-colors"
            aria-label="Fechar técnica"
          >
            <X size={16} weight="bold" />
          </button>
        </div>

        {summaryLabel && (
          <p className="text-[11px] text-[#888] mb-2.5">{summaryLabel}</p>
        )}

        <div className="space-y-2.5">
          {hasTechnique && (
            <TechniqueBlock
              name={technique.name!}
              instruction={technique.studentInstruction!}
              example={technique.example}
            />
          )}

          {hasTechnique && hasExtra && (
            <div className="h-px bg-black/6" />
          )}

          {hasExtra && (
            <TechniqueBlock
              name={extra.name!}
              instruction={extra.studentInstruction!}
              example={extra.example}
            />
          )}
        </div>
      </div>
    </div>
  );
}
