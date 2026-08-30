"use client";

import { useState } from "react";
import { getExtraByValue, getTechniqueByValue } from "@/lib/constants/workout-techniques";
import { TechniquePickerModal } from "./TechniquePickerModal";
import { cn } from "@/lib/utils/cn";

interface TechniqueCellProps {
  type: "technique" | "extra";
  value: string;
  onChange: (value: string) => void;
  className?: string;
  /** Exibido no lugar de "—" quando não há valor selecionado (ex.: número da série na coluna SET). */
  fallback?: string;
}

function displayLabel(type: "technique" | "extra", value: string, fallback: string): string {
  if (!value) return fallback;
  if (type === "technique") {
    return getTechniqueByValue(value).shortLabel || value;
  }
  const extra = getExtraByValue(value);
  return extra.shortLabel && extra.shortLabel !== "—" ? extra.shortLabel : extra.label;
}

export function TechniqueCell({ type, value, onChange, className, fallback = "—" }: TechniqueCellProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn(
          "w-full h-8 text-center text-xs font-semibold truncate transition-colors",
          value ? "text-brand" : "text-text-muted",
          "hover:text-brand focus:outline-none focus-visible:text-brand",
          className
        )}
        aria-label={type === "technique" ? "Selecionar técnica" : "Selecionar método extra"}
      >
        {displayLabel(type, value, fallback)}
      </button>

      <TechniquePickerModal
        type={type}
        value={value}
        open={open}
        onClose={() => setOpen(false)}
        onChange={onChange}
      />
    </>
  );
}
