'use client';

interface CircularProgressProps {
  /** 0–100 */
  value: number;
  size?: number;
  strokeWidth?: number;
  /** color of the arc — defaults to brand gold */
  color?: string;
  /** small label below the main value */
  label?: string;
  /** display string inside the ring (overrides auto-formatted value) */
  display?: string;
  /** unit shown beside the number */
  unit?: string;
  /** whether to draw a gradient arc */
  gradient?: boolean;
}

export default function CircularProgress({
  value,
  size = 88,
  strokeWidth = 7,
  color = 'var(--color-brand)',
  label,
  display,
  unit,
  gradient = true,
}: CircularProgressProps) {
  const clampedValue = Math.max(0, Math.min(100, value));
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (clampedValue / 100) * circumference;
  const cx = size / 2;
  const cy = size / 2;
  const gradientId = `ring-grad-${Math.random().toString(36).slice(2, 7)}`;

  return (
    <div className="flex flex-col items-center gap-1.5">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
          {gradient && (
            <defs>
              <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="var(--gold-300, #F5D061)" />
                <stop offset="50%" stopColor="var(--gold-500, #E8B339)" />
                <stop offset="100%" stopColor="var(--gold-600, #C9941F)" />
              </linearGradient>
            </defs>
          )}
          {/* Track */}
          <circle
            cx={cx}
            cy={cy}
            r={radius}
            fill="none"
            stroke="var(--color-surface-3, #2A2A32)"
            strokeWidth={strokeWidth}
          />
          {/* Progress arc */}
          {clampedValue > 0 && (
            <circle
              cx={cx}
              cy={cy}
              r={radius}
              fill="none"
              stroke={gradient ? `url(#${gradientId})` : color}
              strokeWidth={strokeWidth}
              strokeDasharray={circumference}
              strokeDashoffset={offset}
              strokeLinecap="round"
              style={{ transition: 'stroke-dashoffset 0.6s cubic-bezier(0.16,1,0.3,1)' }}
            />
          )}
        </svg>
        {/* Center content */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="font-bold tabular-nums leading-none text-text-primary" style={{ fontSize: size * 0.27 }}>
            {display ?? clampedValue}
          </span>
          {unit && (
            <span className="text-text-tertiary leading-none mt-0.5" style={{ fontSize: size * 0.12 }}>
              {unit}
            </span>
          )}
        </div>
      </div>
      {label && (
        <span className="text-2xs font-semibold uppercase tracking-caps text-text-tertiary text-center">
          {label}
        </span>
      )}
    </div>
  );
}
