import { ZONAS_FC, type ZonaFC } from '@/lib/constants/cardio';

export function ZonaFcBadge({ zona }: { zona: ZonaFC | null }) {
  if (!zona) return null;

  const { nome, cor } = ZONAS_FC[zona];

  return (
    <span
      className="inline-flex items-center gap-1 rounded-[4px] px-1.5 py-0.5 text-[10px] font-semibold whitespace-nowrap"
      style={{
        backgroundColor: `${cor}18`,
        color: cor,
        border: `1px solid ${cor}40`,
      }}
    >
      {zona} · {nome}
    </span>
  );
}
