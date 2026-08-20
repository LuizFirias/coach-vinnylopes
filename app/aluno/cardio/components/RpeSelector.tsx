'use client';

import { RPE_LABELS } from '@/lib/constants/cardio';

interface RpeSelectorProps {
  value: number | null;
  onChange: (value: number) => void;
}

const LABEL_STYLE = {
  fontSize: 11,
  fontWeight: 500,
  textTransform: 'uppercase' as const,
  letterSpacing: '0.07em',
  color: '#aaa',
  marginBottom: 6,
  display: 'block' as const,
};

function corPorValor(v: number): string {
  if (v <= 3) return '#22c55e';
  if (v <= 7) return '#eab308';
  return '#ef4444';
}

export function RpeSelector({ value, onChange }: RpeSelectorProps) {
  const definido = value !== null;
  const atual = value ?? 5;
  const pct = ((atual - 1) / 9) * 100;
  const cor = definido ? corPorValor(atual) : '#ccc';

  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between">
        <p style={{ ...LABEL_STYLE, marginBottom: 0 }}>Percepção de esforço (RPE)</p>
        <span
          className="tabular-nums lining-nums"
          style={{ fontSize: 12, fontWeight: 700, color: definido ? '#1a1a1a' : '#bbb' }}
        >
          {definido ? `${atual}/10` : '—'}
        </span>
      </div>

      <div className="flex items-center gap-2">
        <span className="text-base leading-none">😌</span>
        <div className="relative flex-1">
          <div
            className="h-1.5 overflow-hidden rounded-full"
            style={{ background: 'var(--surface-2)' }}
          >
            <div
              className="h-full rounded-full transition-all"
              style={{ width: definido ? `${pct}%` : 0, background: cor }}
            />
          </div>
          <input
            type="range"
            min={1}
            max={10}
            value={atual}
            onChange={(e) => onChange(Number(e.target.value))}
            aria-label="Percepção de esforço (RPE)"
            className="absolute inset-0 -top-2.5 h-6 w-full cursor-pointer touch-manipulation opacity-0"
            style={{ touchAction: 'none' }}
          />
          <div
            className="pointer-events-none absolute top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full text-[11px] font-bold shadow-sm"
            style={{
              left: `calc(${pct}% - 12px)`,
              background: '#fff',
              border: `2px solid ${cor}`,
              color: cor,
            }}
          >
            {definido ? atual : ''}
          </div>
        </div>
        <span className="text-base leading-none">🔥</span>
      </div>

      {value !== null && (
        <p style={{ fontSize: 11, color: '#888', marginTop: 6 }}>{RPE_LABELS[value]}</p>
      )}
    </div>
  );
}
