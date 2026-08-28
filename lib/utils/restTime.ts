/** Converte "MM:SS" ou "M:SS" (ex: "01:00") para segundos. */
export function descansoToSeconds(descanso: string): number {
  if (!descanso) return 60;
  const parts = descanso.split(":").map((p) => parseInt(p, 10));
  if (parts.length === 2 && !Number.isNaN(parts[0]) && !Number.isNaN(parts[1])) {
    return parts[0] * 60 + parts[1];
  }
  const asNum = parseInt(descanso, 10);
  return Number.isNaN(asNum) ? 60 : asNum;
}

/** Converte segundos para "MM:SS" usado pelo TimeInput / persistência. */
export function secondsToDescanso(totalSeconds: number): string {
  const s = Math.max(0, Math.round(totalSeconds));
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
}

export function formatRestTime(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return s === 0 ? `${m}min` : `${m}:${String(s).padStart(2, "0")}`;
}
