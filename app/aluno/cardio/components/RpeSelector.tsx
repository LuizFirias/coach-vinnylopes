'use client';

import { RPE_LABELS } from '@/lib/constants/cardio';

interface RpeSelectorProps {
  value: number | null;
  onChange: (value: number) => void;
}

export function RpeSelector({ value, onChange }: RpeSelectorProps) {
  return (
    <div className="space-y-2">
      <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-text-tertiary">
        Percepção de esforço (RPE)
      </p>
      <div className="flex flex-wrap gap-1.5">
        {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => {
          const ativo = value === n;
          return (
            <button
              key={n}
              type="button"
              onClick={() => onChange(n)}
              aria-label={`RPE ${n} — ${RPE_LABELS[n]}`}
              aria-pressed={ativo}
              className="flex h-11 w-11 items-center justify-center rounded-[8px] text-sm font-bold tabular-nums lining-nums transition-colors touch-manipulation"
              style={{
                background: ativo ? '#9333ea' : 'var(--surface-2)',
                color: ativo ? '#ffffff' : 'var(--text-secondary)',
                border: `1px solid ${ativo ? '#9333ea' : 'var(--border-input)'}`,
              }}
            >
              {n}
            </button>
          );
        })}
      </div>
      {value !== null && (
        <p className="text-[11px] text-text-secondary">{RPE_LABELS[value]}</p>
      )}
    </div>
  );
}
