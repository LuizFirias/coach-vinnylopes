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
}

function displayLabel(type: "technique" | "extra", value: string): string {
  if (!value) return "—";
  if (type === "technique") {
    return getTechniqueByValue(value).shortLabel || value;
  }
  const extra = getExtraByValue(value);
  return extra.shortLabel && extra.shortLabel !== "—" ? extra.shortLabel : extra.label;
}

export function TechniqueCell({ type, value, onChange, className }: TechniqueCellProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn(
          "w-full h-8 text-center text-xs font-semibold truncate transition-colors",
          value ? "text-brand" : "text-text-disabled",
          "hover:text-brand focus:outline-none focus-visible:text-brand",
          className
        )}
        aria-label={type === "technique" ? "Selecionar técnica" : "Selecionar método extra"}
      >
        {displayLabel(type, value)}
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
