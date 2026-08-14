export const MASCOTE_MASCULINO = "/images/Mascote-masculino.png";
export const MASCOTE_FEMININO = "/images/Mascote-feminino.png";

/** Sem foto: feminino usa a mascote feminina; demais casos, a masculina. */
export function mascoteSrc(sexo?: string | null): string {
  return sexo === "feminino" ? MASCOTE_FEMININO : MASCOTE_MASCULINO;
}
