import { MEASUREMENT_COLORS } from '@/lib/measurements/types';

interface DeltaLineProps {
  delta: number | null;
  label: string;
  unit?: string;
}

export function DeltaLine({ delta, label, unit = '' }: DeltaLineProps) {
  const unitSuffix = unit ? ` ${unit}` : '';

  if (delta === null || delta === 0) {
    return (
      <p className="mt-1.5 text-[11px]" style={{ color: MEASUREMENT_COLORS.textSecondary }}>
        ↔ sem variação {label}
      </p>
    );
  }

  const isDown = delta < 0;
  const color = isDown ? MEASUREMENT_COLORS.deltaDown : MEASUREMENT_COLORS.deltaUp;
  const arrow = isDown ? '↓' : '↑';
  const sign = isDown ? '' : '+';

  return (
    <p className="mt-1.5 text-[11px] font-bold" style={{ color }}>
      {arrow} {sign}{delta.toFixed(1)}{unitSuffix} {label}
    </p>
  );
}

export function DeltaValue({ delta }: { delta: number | null }) {
  if (delta === null) {
    return (
      <span className="text-[13px] font-bold" style={{ color: MEASUREMENT_COLORS.textSecondary }}>
        —
      </span>
    );
  }

  if (delta === 0) {
    return (
      <span className="text-[13px] font-bold" style={{ color: MEASUREMENT_COLORS.textSecondary }}>
        0
      </span>
    );
  }

  const color = delta < 0 ? MEASUREMENT_COLORS.deltaDown : MEASUREMENT_COLORS.deltaUp;

  return (
    <span className="text-[13px] font-bold" style={{ color }}>
      {delta > 0 ? '+' : ''}{delta.toFixed(1)}
    </span>
  );
}
