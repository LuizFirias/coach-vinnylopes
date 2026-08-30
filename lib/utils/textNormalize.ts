/** Remove acentos, espaços extras e coloca em minúsculas para comparação. */
export function normalizeText(value: string | null | undefined): string {
  if (!value) return "";
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

export function textEquals(
  a: string | null | undefined,
  b: string | null | undefined,
): boolean {
  return normalizeText(a) === normalizeText(b);
}

export function textIncludes(
  haystack: string | null | undefined,
  needle: string | null | undefined,
): boolean {
  const normalizedNeedle = normalizeText(needle);
  if (!normalizedNeedle) return true;
  return normalizeText(haystack).includes(normalizedNeedle);
}
