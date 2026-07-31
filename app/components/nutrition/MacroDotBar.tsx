"use client";

import { cn } from "@/lib/utils/cn";

interface MacroProgressBarProps {
  current: number;
  target: number;
  unit?: string;
  color: string;
  className?: string;
}

export function MacroProgressBar({
  current,
  target,
  unit = "",
  color,
  className,
}: MacroProgressBarProps) {
  const pct = target > 0 ? Math.round((current / target) * 100) : 0;
  const filled = Math.min(pct, 100);
  const hasProgress = pct > 0;

  return (
    <div className={cn(className)}>
      <div
        className="mt-2 overflow-hidden rounded-full"
        style={{ height: 4, background: "var(--filter-bg, #ebebf0)" }}
      >
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${filled}%`, background: color }}
        />
      </div>
      <p
        className="tabular-nums lining-nums"
        style={{
          fontSize: 9,
          color: hasProgress ? color : "#bbb",
          marginTop: 3,
          fontWeight: hasProgress ? 600 : 400,
        }}
      >
        {Math.round(current).toLocaleString("pt-BR")} /{" "}
        {Math.round(target).toLocaleString("pt-BR")}
        {unit ? ` ${unit}` : ""}
      </p>
    </div>
  );
}

/** @deprecated use MacroProgressBar */
export { MacroProgressBar as MacroDotBar };
