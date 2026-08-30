/**
 * Digitação de tempo "de trás pra frente" (padrão cronômetro/app de corrida):
 * o aluno digita só números, sem precisar do ":" — cada dígito empurra os
 * anteriores pra esquerda. Ex.: digitar "1", "3", "0" mostra 00:01 → 00:13 → 01:30.
 */

/** Extrai só dígitos do texto atual do campo, mantendo os últimos 4 (MMSS). */
export function digitsFromTempoInput(raw: string): string {
  return raw.replace(/\D/g, '').slice(-4);
}

/** Converte o buffer de dígitos (ex.: "130") em segundos (130 → 1min30s = 90s). */
export function digitsToSeconds(digits: string): number {
  if (!digits) return 0;
  const padded = digits.padStart(4, '0');
  const mm = parseInt(padded.slice(0, 2), 10) || 0;
  const ss = parseInt(padded.slice(2, 4), 10) || 0;
  return mm * 60 + ss;
}

/** Formata o buffer de dígitos (ex.: "130") como "01:30" pra exibição enquanto digita. */
export function digitsToMMSS(digits: string): string {
  if (!digits) return '';
  const padded = digits.padStart(4, '0');
  return `${padded.slice(0, 2)}:${padded.slice(2, 4)}`;
}
