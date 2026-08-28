'use client';

interface MetaProgressCardProps {
  proteinaPrescrita: number;
  carboPrescrito: number;
  gorduraPrescrita: number;
  proteinaMeta: number;
  carboMeta: number;
  gorduraMeta: number;
}

function formatGrams(value: number): string {
  const n = Math.max(0, Number(value) || 0);
  return Math.round(n * 10) % 10 === 0
    ? String(Math.round(n))
    : n.toLocaleString('pt-BR', { maximumFractionDigits: 1 });
}

export function MetaProgressCard({
  proteinaPrescrita,
  carboPrescrito,
  gorduraPrescrita,
  proteinaMeta,
  carboMeta,
  gorduraMeta,
}: MetaProgressCardProps) {
  const temMeta = proteinaMeta > 0 || carboMeta > 0 || gorduraMeta > 0;
  if (!temMeta) return null;

  const dados = [
    {
      label: 'Proteína',
      prescrito: proteinaPrescrita,
      meta: proteinaMeta,
      cor: 'var(--mc-protein-color)',
    },
    {
      label: 'Carbo',
      prescrito: carboPrescrito,
      meta: carboMeta,
      cor: 'var(--mc-carbo-color)',
    },
    {
      label: 'Gordura',
      prescrito: gorduraPrescrita,
      meta: gorduraMeta,
      cor: 'var(--mc-fat-color)',
    },
  ];

  return (
    <div
      className="flex w-full flex-col gap-3 rounded-2xl border border-border-subtle bg-surface-1 p-4"
    >
      <p className="text-[10px] font-semibold uppercase tracking-[0.06em] text-text-tertiary">
        Prescrito vs meta
      </p>

      {dados.map(({ label, prescrito, meta, cor }) => {
        const pct = meta > 0 ? Math.min((prescrito / meta) * 100, 100) : 0;
        const excedeu = prescrito > meta && meta > 0;

        return (
          <div key={label} className="flex flex-col gap-1.5">
            <div className="flex items-baseline justify-between">
              <span className="text-[11px] text-text-secondary">{label}</span>
              <span
                className="text-[11px] tabular-nums lining-nums"
                style={{ color: excedeu ? 'var(--danger)' : 'var(--text-tertiary)' }}
              >
                {formatGrams(prescrito)}g
                <span className="text-text-disabled"> / {formatGrams(meta)}g</span>
              </span>
            </div>
            <div className="h-1.5 w-full rounded-full bg-surface-2">
              <div
                className="h-1.5 rounded-full transition-all duration-300"
                style={{
                  width: `${pct}%`,
                  background: excedeu ? 'var(--danger)' : cor,
                }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
