'use client';

interface CardioKpisProps {
  kcalSemana: number;
  sessoesSemana: number;
  duracaoMediaMin: number;
  semMedidaReal: boolean;
}

const CARD_STYLE = {
  background: 'var(--mobile-card-bg)',
  border: '1px solid var(--mobile-card-border)',
  boxShadow: 'var(--mobile-card-shadow)',
} as const;

const KPIS = [
  { key: 'kcal', label: 'Kcal', unit: 'kcal', cor: '#e05555' },
  { key: 'sessoes', label: 'Sessões', unit: 'sess.', cor: '#751BB4' },
  { key: 'media', label: 'Média', unit: 'min', cor: '#39c75a' },
] as const;

export function CardioKpis({
  kcalSemana,
  sessoesSemana,
  duracaoMediaMin,
  semMedidaReal,
}: CardioKpisProps) {
  const values = {
    kcal: kcalSemana.toLocaleString('pt-BR'),
    sessoes: String(sessoesSemana),
    media: String(duracaoMediaMin),
  };

  return (
    <div className="grid grid-cols-3 gap-3">
      {KPIS.map((kpi) => (
        <div key={kpi.key} className="rounded-[16px] p-3" style={CARD_STYLE}>
          <div className="mb-1 flex items-center gap-1.5">
            <span
              className="inline-block h-1.5 w-1.5 rounded-full"
              style={{ background: kpi.cor }}
            />
            <span className="text-[9px] font-semibold uppercase tracking-wider text-text-tertiary">
              {kpi.label}
            </span>
          </div>
          <p className="text-[28px] font-black leading-none tracking-display text-text-primary tabular-nums lining-nums">
            {values[kpi.key]}
            <span className="ml-1 text-[13px] font-bold" style={{ color: kpi.cor }}>
              {kpi.unit}
            </span>
          </p>
          {kpi.key === 'kcal' && semMedidaReal && (
            <p className="mt-1 text-[10px] text-[#f59e0b]">
              Estimado — registre suas medidas para mais precisão
            </p>
          )}
        </div>
      ))}
    </div>
  );
}
