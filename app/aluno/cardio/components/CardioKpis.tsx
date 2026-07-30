'use client';

interface CardioKpisProps {
  kcalSemana: number;
  sessoesSemana: number;
  duracaoMediaMin: number;
  semMedidaReal: boolean;
}

const KPI_LABEL =
  'flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.1em] text-text-tertiary mb-2';
const KPI_VALUE =
  'text-4xl font-black leading-none tabular-nums lining-nums tracking-display text-text-primary';

export function CardioKpis({
  kcalSemana,
  sessoesSemana,
  duracaoMediaMin,
  semMedidaReal,
}: CardioKpisProps) {
  return (
    <div className="grid grid-cols-3 gap-3">
      <div className="rounded-[20px] border-0 bg-[var(--dash-card,#111827)] p-4">
        <p className={KPI_LABEL}>
          <span className="inline-block h-1.5 w-1.5 rounded-[3px] bg-[#e05555]" />
          Kcal
        </p>
        <p className={KPI_VALUE}>
          {kcalSemana.toLocaleString('pt-BR')}
          <span className="ml-1 text-sm font-bold text-brand">kcal</span>
        </p>
        {semMedidaReal && (
          <p className="mt-1 text-[10px] text-[#f59e0b]">
            Estimado — registre suas medidas para mais precisão
          </p>
        )}
      </div>

      <div className="rounded-[20px] border-0 bg-[var(--dash-card,#111827)] p-4">
        <p className={KPI_LABEL}>
          <span className="inline-block h-1.5 w-1.5 rounded-[3px] bg-[#9333ea]" />
          Sessões
        </p>
        <p className={KPI_VALUE}>
          {sessoesSemana}
          <span className="ml-1 text-sm font-bold text-brand">sess.</span>
        </p>
      </div>

      <div className="rounded-[20px] border-0 bg-[var(--dash-card,#111827)] p-4">
        <p className={KPI_LABEL}>
          <span className="inline-block h-1.5 w-1.5 rounded-[3px] bg-[#39c75a]" />
          Média
        </p>
        <p className={KPI_VALUE}>
          {duracaoMediaMin}
          <span className="ml-1 text-sm font-bold text-brand">min</span>
        </p>
      </div>
    </div>
  );
}
