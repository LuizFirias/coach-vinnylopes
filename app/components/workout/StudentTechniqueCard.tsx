"use client";

import { useState } from "react";
import { CaretDown, Info } from "@phosphor-icons/react";
import { getExtraByValue, getTechniqueByValue } from "@/lib/constants/workout-techniques";
import { cn } from "@/lib/utils/cn";

interface StudentTechniqueCardProps {
  techniqueValue?: string | null;
  extraValue?: string | null;
  expanded?: boolean;
  onExpandedChange?: (expanded: boolean) => void;
  defaultExpanded?: boolean;
  className?: string;
}

export function StudentTechniqueCard({
  techniqueValue,
  extraValue,
  expanded: controlledExpanded,
  onExpandedChange,
  defaultExpanded = false,
  className,
}: StudentTechniqueCardProps) {
  const [internalExpanded, setInternalExpanded] = useState(defaultExpanded);
  const expanded = controlledExpanded ?? internalExpanded;

  const technique = getTechniqueByValue(techniqueValue);
  const extra = getExtraByValue(extraValue);

  const hasTechnique = Boolean(technique?.studentInstruction);
  const hasExtra = Boolean(extra?.studentInstruction);

  if (!hasTechnique && !hasExtra) return null;

  const toggle = () => {
    const next = !expanded;
    onExpandedChange?.(next);
    if (controlledExpanded === undefined) setInternalExpanded(next);
  };

  const summaryLabel = [technique?.shortLabel, extra?.label]
    .filter((v) => v && v !== "—")
    .join(" + ");

  return (
    <div
      className={cn(
        "rounded-[10px] border-l-2 border-brand overflow-hidden",
        "bg-[#0f1a2e]",
        className
      )}
    >
      <button
        type="button"
        onClick={toggle}
        className="w-full flex items-start gap-2.5 px-3.5 py-3 text-left transition-colors"
        aria-expanded={expanded}
      >
        <Info size={14} className="text-brand shrink-0 mt-0.5" aria-hidden />
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-brand leading-tight">
            Como executar esta série
          </p>
          {summaryLabel && (
            <p className="text-[11px] text-text-secondary mt-0.5">{summaryLabel}</p>
          )}
        </div>
        <CaretDown
          size={14}
          className={cn(
            "text-text-muted shrink-0 mt-0.5 transition-transform duration-200",
            expanded && "rotate-180"
          )}
          aria-hidden
        />
      </button>

      {expanded && (
        <div className="px-3.5 pb-3.5 space-y-3 border-t border-brand/20">
          {hasTechnique && (
            <div>
              <p className="text-xs font-semibold text-text-primary mb-1">{technique.name}</p>
              <p className="text-xs text-text-secondary leading-relaxed">
                {technique.studentInstruction}
              </p>
              {technique.example && (
                <p className="text-[11px] text-text-muted italic mt-1.5 leading-snug">
                  <span className="font-semibold not-italic text-text-secondary">Exemplo: </span>
                  {technique.example}
                </p>
              )}
            </div>
          )}

          {hasTechnique && hasExtra && <div className="h-px bg-brand/20" />}

          {hasExtra && (
            <div>
              <p className="text-xs font-semibold text-text-primary mb-1">{extra.name}</p>
              <p className="text-xs text-text-secondary leading-relaxed">
                {extra.studentInstruction}
              </p>
              {extra.example && (
                <p className="text-[11px] text-text-muted italic mt-1.5 leading-snug">
                  <span className="font-semibold not-italic text-text-secondary">Exemplo: </span>
                  {extra.example}
                </p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
