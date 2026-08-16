export type AssessorPeriodo = "diario" | "semanal" | "mensal";

export function assessorDateRange(
  periodo: AssessorPeriodo,
  now = new Date(),
): { start: Date; end: Date; startIso: string; endIso: string; dias: number } {
  const end = new Date(now);
  end.setHours(23, 59, 59, 999);
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  if (periodo === "semanal") start.setDate(start.getDate() - 6);
  if (periodo === "mensal") start.setDate(start.getDate() - 29);
  const dias =
    periodo === "diario" ? 1 : periodo === "semanal" ? 7 : 30;
  return {
    start,
    end,
    startIso: start.toISOString(),
    endIso: end.toISOString(),
    dias,
  };
}

export function toDateKey(value: string | Date): string {
  const d = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(d.getTime())) return String(value).slice(0, 10);
  return d.toISOString().slice(0, 10);
}
