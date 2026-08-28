/** Normaliza um nome de exercício pra comparação: sem acento, minúsculo, sem parênteses. */
export function normalizeExercicioNome(nome: string): string {
  return nome
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/\([^)]*\)/g, " ")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tokenOverlapScore(a: string, b: string): number {
  const ta = new Set(a.split(" ").filter(Boolean));
  const tb = new Set(b.split(" ").filter(Boolean));
  if (ta.size === 0 || tb.size === 0) return 0;
  let inter = 0;
  ta.forEach((t) => {
    if (tb.has(t)) inter++;
  });
  return inter / Math.max(ta.size, tb.size);
}

/**
 * Casa um nome de exercício (ex.: vindo da IA) contra o catálogo já
 * carregado (exercicios_biblioteca) — exato > substring > sobreposição de
 * palavras (score mínimo 0.6). Retorna null quando não achar nada confiável
 * o bastante (o coach resolve manualmente na tela).
 */
export function matchExercicioNome<T extends { nome: string }>(
  nomeAlvo: string,
  catalogo: T[],
): T | null {
  const alvo = normalizeExercicioNome(nomeAlvo);
  if (!alvo || catalogo.length === 0) return null;

  const exact = catalogo.find((c) => normalizeExercicioNome(c.nome) === alvo);
  if (exact) return exact;

  const substr = catalogo.find((c) => {
    const n = normalizeExercicioNome(c.nome);
    return n.length > 0 && (n.includes(alvo) || alvo.includes(n));
  });
  if (substr) return substr;

  let melhor: T | null = null;
  let melhorScore = 0;
  for (const c of catalogo) {
    const score = tokenOverlapScore(alvo, normalizeExercicioNome(c.nome));
    if (score > melhorScore) {
      melhorScore = score;
      melhor = c;
    }
  }
  return melhorScore >= 0.6 ? melhor : null;
}
