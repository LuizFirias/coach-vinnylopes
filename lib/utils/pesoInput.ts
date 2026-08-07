/**
 * Parsing/formatação de peso em campos de texto que aceitam vírgula (padrão BR).
 * Usar sempre `type="text" inputMode="decimal"` com esses helpers — `type="number"`
 * bloqueia a vírgula em vários navegadores/mobile antes mesmo do onChange disparar.
 */

/** Aceita "," ou "." como separador decimal — trata os dois do mesmo jeito (ex.: "7,5" ou "7.5"). */
export function parsePesoInput(raw: string): number {
  const normalized = raw.replace(',', '.').replace(/[^0-9.]/g, '');
  const num = parseFloat(normalized);
  return isNaN(num) ? 0 : num;
}

/** Formata um peso numérico para exibição com vírgula (padrão brasileiro). */
export function formatPesoDisplay(value: number): string {
  if (!value) return '';
  return String(value).replace('.', ',');
}
