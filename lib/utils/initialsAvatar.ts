/**
 * Sem foto: mostra as iniciais do nome (primeiro + segundo nome; só a
 * primeira letra se houver apenas um nome) sobre um fundo colorido —
 * a cor varia por pessoa (mesmo nome sempre cai na mesma cor).
 */

/** Paleta de fundos — variada, mas nenhuma delas é o dourado da marca
 *  (evita confundir com botões/estados de ação). */
const PALETTE = [
  "#3b82f6", // azul
  "#10b981", // verde
  "#f97316", // laranja
  "#ec4899", // rosa
  "#8b5cf6", // roxo
  "#06b6d4", // ciano
  "#ef4444", // vermelho
  "#84cc16", // lima
  "#6366f1", // índigo
  "#14b8a6", // teal
];

export function getInitials(name?: string | null): string {
  const parts = (name ?? "").trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0][0]!.toUpperCase();
  return (parts[0][0]! + parts[1][0]!).toUpperCase();
}

/** Hash simples e estável (não precisa ser criptográfico, só distribuir bem). */
function hashString(value: string): number {
  let hash = 0;
  for (let i = 0; i < value.length; i++) {
    hash = (hash << 5) - hash + value.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

export function getAvatarColor(name?: string | null): string {
  const key = (name ?? "").trim() || "?";
  return PALETTE[hashString(key) % PALETTE.length];
}
