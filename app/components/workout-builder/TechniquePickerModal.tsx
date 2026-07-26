"use client";

import { useEffect, useState } from "react";
import { Lightbulb, X, Check } from "@phosphor-icons/react";
import {
  TECHNIQUE_OPTIONS,
  EXTRA_OPTIONS,
  getExtraByValue,
  getTechniqueByValue,
} from "@/lib/constants/workout-techniques";
import { cn } from "@/lib/utils/cn";

interface TechniquePickerModalProps {
  type: "technique" | "extra";
  value: string;
  open: boolean;
  onClose: () => void;
  onChange: (value: string) => void;
}

export function TechniquePickerModal({
  type,
  value,
  open,
  onClose,
  onChange,
}: TechniquePickerModalProps) {
  const options = type === "technique" ? TECHNIQUE_OPTIONS : EXTRA_OPTIONS;
  const [preview, setPreview] = useState(value);

  useEffect(() => {
    if (open) setPreview(value);
  }, [open, value]);

  if (!open) return null;

  const item =
    preview && type === "technique"
      ? getTechniqueByValue(preview)
      : preview
        ? getExtraByValue(preview)
        : null;

  const title = type === "technique" ? "Técnica de série" : "Método extra";

  const handleSelect = (next: string) => {
    onChange(next);
    setPreview(next);
  };

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div
        className="w-full max-w-sm bg-surface-1 border border-card rounded-2xl shadow-elev-3 overflow-hidden animate-slide-up max-h-[min(85vh,640px)] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-divider shrink-0">
          <h3 className="text-sm font-semibold text-text-primary">{title}</h3>
          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 flex items-center justify-center rounded-lg hover:bg-surface-2 text-text-secondary"
            aria-label="Fechar"
          >
            <X size={18} />
          </button>
        </div>

        <div className="overflow-y-auto flex-1 min-h-0 p-2">
          {options.map((opt) => {
            const selected = (preview || "") === (opt.value || "");
            const label =
              type === "technique" ? opt.shortLabel || "—" : opt.label;
            return (
              <button
                key={opt.value || "empty"}
                type="button"
                onClick={() => handleSelect(opt.value || "")}
                className={cn(
                  "w-full flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl text-left transition-colors",
                  selected
                    ? "bg-brand-subtle text-brand"
                    : "text-text-primary hover:bg-surface-2"
                )}
              >
                <div className="min-w-0">
                  <p className="text-sm font-semibold truncate">{label}</p>
                  {opt.name && opt.value && (
                    <p className="text-[11px] text-text-tertiary truncate mt-0.5">
                      {opt.name}
                    </p>
                  )}
                </div>
                {selected && <Check size={16} weight="bold" className="shrink-0" />}
              </button>
            );
          })}
        </div>

        {item?.description && (
          <div className="shrink-0 border-t border-divider px-4 py-3 space-y-2 bg-surface-2/40">
            <p className="text-xs text-text-secondary leading-relaxed">{item.description}</p>
            {item.coachTip && (
              <div className="flex gap-1.5 items-start rounded-lg bg-brand-subtle border border-brand-border px-2.5 py-2">
                <Lightbulb size={13} className="text-brand shrink-0 mt-0.5" aria-hidden />
                <p className="text-[11px] text-brand leading-relaxed">{item.coachTip}</p>
              </div>
            )}
          </div>
        )}

        <div className="shrink-0 p-3 border-t border-divider">
          <button
            type="button"
            onClick={onClose}
            className="w-full h-10 bg-brand text-text-on-brand rounded-xl text-xs font-semibold"
          >
            Aplicar
          </button>
        </div>
      </div>
    </div>
  );
}
