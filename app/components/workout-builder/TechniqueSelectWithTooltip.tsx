"use client";

import { useState } from "react";
import { TECHNIQUE_OPTIONS, EXTRA_OPTIONS } from "@/lib/constants/workout-techniques";
import { TechniqueTooltip } from "./TechniqueTooltip";
import { cn } from "@/lib/utils/cn";

interface TechniqueSelectWithTooltipProps {
  type: "technique" | "extra";
  value: string;
  onChange: (value: string) => void;
  className?: string;
  /** Desktop Téc: mostra sigla (WS, FS…). Extra: mostra label completo */
  compactTechnique?: boolean;
}

export function TechniqueSelectWithTooltip({
  type,
  value,
  onChange,
  className,
  compactTechnique = false,
}: TechniqueSelectWithTooltipProps) {
  const [tooltipValue, setTooltipValue] = useState<string | null>(null);
  const options = type === "technique" ? TECHNIQUE_OPTIONS : EXTRA_OPTIONS;

  const handleChange = (next: string) => {
    onChange(next);
    setTooltipValue(next || null);
  };

  return (
    <div className="relative min-w-0">
      <select
        value={value}
        onChange={(e) => handleChange(e.target.value)}
        className={cn(className)}
      >
        {options.map((opt) => (
          <option key={opt.value || "empty"} value={opt.value}>
            {type === "technique" && compactTechnique
              ? opt.shortLabel || "—"
              : opt.label}
          </option>
        ))}
      </select>

      <TechniqueTooltip
        type={type}
        value={tooltipValue}
        visible={!!tooltipValue}
        onClose={() => setTooltipValue(null)}
      />
    </div>
  );
}
