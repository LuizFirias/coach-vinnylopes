'use client';

export type RefeicaoMiniItem = {
  id: string;
  nome: string;
  kcalTotal: number;
  temAlimentos: boolean;
};

export function RefeicoesMiniResumo({
  refeicoes,
}: {
  refeicoes: RefeicaoMiniItem[];
}) {
  const comAlimentos = refeicoes.filter((r) => r.temAlimentos);
  if (comAlimentos.length === 0) return null;

  return (
    <div className="w-full rounded-2xl border border-border-subtle bg-surface-1 p-4">
      <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.06em] text-text-tertiary">
        Por refeição
      </p>
      <div className="flex flex-col divide-y divide-[color:var(--border-divider)]">
        {comAlimentos.map((r) => (
          <div key={r.id} className="flex items-center justify-between py-2">
            <span className="min-w-0 truncate text-[12px] text-text-secondary">{r.nome}</span>
            <span className="shrink-0 text-[12px] font-semibold tabular-nums lining-nums text-text-primary">
              {Math.round(r.kcalTotal).toLocaleString('pt-BR')} kcal
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
