"use client";

import { cn } from "@/lib/utils/cn";
import { haptic } from "@/lib/utils/haptics";

interface RestTimerOverlayProps {
  remaining: number;
  total: number;
  expired: boolean;
  isDesktop?: boolean;
  title?: string;
  subtitle?: string;
  subtitleHighlight?: string;
  onAddSeconds: (seconds: number) => void;
  onSkip: () => void;
  onAdvance: () => void;
}

function formatRestTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

export function RestTimerOverlay({
  remaining,
  total,
  expired,
  isDesktop = false,
  title = "Descanso",
  subtitle,
  subtitleHighlight,
  onAddSeconds,
  onSkip,
  onAdvance,
}: RestTimerOverlayProps) {
  const size = isDesktop ? 240 : 192;
  const center = size / 2;
  const radius = isDesktop ? 96 : 96;
  const circumference = 2 * Math.PI * radius;
  const progress = total > 0 ? Math.max(0, Math.min(1, remaining / total)) : 0;
  const dashOffset = circumference * (1 - progress);

  const nextLabel = subtitle
    ? subtitle
    : remaining >= 60
      ? `Próxima série em ${Math.ceil(remaining / 60)}min`
      : remaining > 0
        ? `Próxima série em ${remaining}s`
        : "Série pronta";

  return (
    <div
      className={cn(
        "absolute inset-0 z-[60] flex items-end lg:items-center justify-center",
        "bg-black/70 backdrop-blur-sm"
      )}
      role="dialog"
      aria-label="Timer de descanso"
    >
      <div
        className={cn(
          "w-full bg-surface-1 rounded-t-2xl px-5 pt-6 pb-8",
          "lg:rounded-2xl lg:max-w-[400px] lg:p-10 lg:mx-4",
          "pb-[calc(2rem+env(safe-area-inset-bottom))]"
        )}
      >
        <p className="text-xs font-semibold uppercase tracking-[0.1em] text-text-secondary text-center mb-4">
          {title}
        </p>

        <div className="flex justify-center mb-6">
          <svg
            width={size}
            height={size}
            viewBox={`0 0 ${size} ${size}`}
            className="shrink-0"
            aria-hidden
          >
            <circle
              cx={center}
              cy={center}
              r={radius}
              fill="none"
              stroke="#1e1e1e"
              strokeWidth={6}
              strokeDasharray="8 6"
              strokeLinecap="round"
            />
            <circle
              cx={center}
              cy={center}
              r={radius}
              fill="none"
              stroke="#9333ea"
              strokeWidth={6}
              strokeDasharray={circumference}
              strokeDashoffset={expired ? 0 : dashOffset}
              strokeLinecap="round"
              transform={`rotate(-90 ${center} ${center})`}
              className="transition-[stroke-dashoffset] duration-300"
            />
            <text
              x={center}
              y={center + (isDesktop ? 14 : 10)}
              textAnchor="middle"
              className="fill-text-primary font-black"
              style={{
                fontSize: isDesktop ? 48 : 36,
                letterSpacing: "-1px",
              }}
            >
              {expired ? "0:00" : formatRestTime(remaining)}
            </text>
          </svg>
        </div>

        <div className="flex items-center justify-center gap-3 mb-4">
          <button
            type="button"
            onClick={() => {
              haptic("light");
              onAddSeconds(-30);
            }}
            className="min-h-11 px-4 rounded-lg bg-surface-1 border border-card text-xs font-semibold text-text-primary [@media(hover:hover)]:hover:bg-[#1a1a1a] transition-colors"
          >
            −30s
          </button>
          <button
            type="button"
            onClick={() => {
              haptic("light");
              onSkip();
            }}
            className="min-h-11 px-5 rounded-lg bg-surface-2 text-xs font-semibold text-text-secondary [@media(hover:hover)]:hover:bg-[#1a1a1a] transition-colors"
          >
            Pular
          </button>
          <button
            type="button"
            onClick={() => {
              haptic("light");
              onAddSeconds(30);
            }}
            className="min-h-11 px-4 rounded-lg bg-surface-1 border border-card text-xs font-semibold text-text-primary [@media(hover:hover)]:hover:bg-[#1a1a1a] transition-colors"
          >
            +30s
          </button>
        </div>

        {expired ? (
          <button
            type="button"
            onClick={() => {
              haptic("success");
              onAdvance();
            }}
            className="w-full min-h-12 rounded-xl bg-brand text-[15px] font-bold text-text-on-brand"
          >
            Série pronta →
          </button>
        ) : (
          <div className="text-center space-y-1">
            {subtitleHighlight && (
              <p className="text-[11px] text-success font-medium">{subtitleHighlight}</p>
            )}
            <p className="text-xs text-text-muted">{nextLabel}</p>
          </div>
        )}
      </div>
    </div>
  );
}
