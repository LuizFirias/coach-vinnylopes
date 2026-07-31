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

export function RpeSelector({ value, onChange }: RpeSelectorProps) {
  return (
    <div>
      <p style={LABEL_STYLE}>Percepção de esforço (RPE)</p>
      <div className="flex flex-wrap gap-2">
        {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => {
          const ativo = value === n;
          return (
            <button
              key={n}
              type="button"
              onClick={() => onChange(n)}
              aria-label={`RPE ${n} — ${RPE_LABELS[n]}`}
              aria-pressed={ativo}
              className="tabular-nums lining-nums"
              style={{
                width: 36,
                height: 36,
                borderRadius: 8,
                border: 'none',
                background: ativo ? '#9333ea' : '#ebebf0',
                color: ativo ? '#fff' : '#555',
                fontSize: 13,
                fontWeight: ativo ? 700 : 400,
                cursor: 'pointer',
                touchAction: 'manipulation',
                transition: 'all 0.15s',
              }}
            >
              {n}
            </button>
          );
        })}
      </div>
      {value !== null && (
        <p style={{ fontSize: 11, color: '#888', marginTop: 4 }}>{RPE_LABELS[value]}</p>
      )}
    </div>
  );
}
