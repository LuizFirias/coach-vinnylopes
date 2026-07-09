"use client";

import { useState } from "react";
import { CaretDown, Info } from "@phosphor-icons/react";
import { getExtraByValue, getTechniqueByValue } from "@/lib/constants/workout-techniques";
import { cn } from "@/lib/utils/cn";

interface StudentTechniqueCardProps {
  techniqueValue?: string | null;
  extraValue?: string | null;
  /** Controlado externamente (ex.: botão "Técnica" no modal) */
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

  const summaryLabel = [technique?.shortLabel, extra?.label].filter((v) => v && v !== "—").join(" + ");

  return (
    <div
      className={cn(
        "rounded-xl border border-brand-border bg-brand-subtle overflow-hidden",
        className
      )}
    >
      <button
        type="button"
        onClick={toggle}
        className="w-full flex items-center gap-2 px-3 py-2.5 text-left hover:bg-brand/5 transition-colors"
        aria-expanded={expanded}
      >
        <Info size={15} className="text-brand shrink-0" aria-hidden />
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-brand leading-tight">
            Como executar esta série
          </p>
          {!expanded && summaryLabel && (
            <p className="text-[11px] text-text-secondary truncate mt-0.5">{summaryLabel}</p>
          )}
        </div>
        <CaretDown
          size={14}
          className={cn(
            "text-brand shrink-0 transition-transform duration-200",
            expanded && "rotate-180"
          )}
          aria-hidden
        />
      </button>

      {expanded && (
        <div className="px-3 pb-3 space-y-3 border-t border-brand-border/60">
          {hasTechnique && (
            <div>
              <p className="text-xs font-semibold text-text-primary mb-1">{technique.name}</p>
              <p className="text-[13px] text-text-secondary leading-relaxed">
                {technique.studentInstruction}
              </p>
              {technique.example && (
                <p className="text-[11px] text-text-tertiary italic mt-1.5 leading-snug">
                  <span className="font-semibold not-italic text-text-secondary">Exemplo: </span>
                  {technique.example}
                </p>
              )}
            </div>
          )}

          {hasTechnique && hasExtra && <div className="h-px bg-brand-border/60" />}

          {hasExtra && (
            <div>
              <p className="text-xs font-semibold text-text-primary mb-1">{extra.name}</p>
              <p className="text-[13px] text-text-secondary leading-relaxed">
                {extra.studentInstruction}
              </p>
              {extra.example && (
                <p className="text-[11px] text-text-tertiary italic mt-1.5 leading-snug">
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
