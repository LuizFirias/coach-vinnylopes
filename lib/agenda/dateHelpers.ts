/** Segunda-feira da semana que contém `date` (semana começa na segunda, termina no domingo). */
export function getMonday(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay(); // 0=domingo..6=sábado
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

export function addMonths(date: Date, months: number): Date {
  const d = new Date(date);
  d.setMonth(d.getMonth() + months);
  return d;
}

export function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

/** Segunda→domingo, 7 datas. */
export function getWeekDays(anchor: Date): Date[] {
  const monday = getMonday(anchor);
  return Array.from({ length: 7 }, (_, i) => addDays(monday, i));
}

export function formatWeekRangeLabel(anchor: Date): string {
  const days = getWeekDays(anchor);
  const start = days[0];
  const end = days[6];
  const sameMonth = start.getMonth() === end.getMonth();
  const startStr = start.toLocaleDateString("pt-BR", { day: "2-digit" });
  const endStr = sameMonth
    ? end.toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" })
    : end.toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" });
  const startMonthStr = sameMonth
    ? ""
    : start.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" }) + " – ";
  return sameMonth
    ? `${startStr} – ${endStr}`
    : `${startMonthStr}${endStr}`;
}

export function formatDayLabel(date: Date): string {
  return date.toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" });
}

export function formatMonthLabel(date: Date): string {
  const label = date.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
  return label.charAt(0).toUpperCase() + label.slice(1);
}

/** Grade de 6 semanas (42 dias) começando na segunda, cobrindo o mês de `anchor`. */
export function getMonthGridDays(anchor: Date): Date[] {
  const firstOfMonth = new Date(anchor.getFullYear(), anchor.getMonth(), 1);
  const start = getMonday(firstOfMonth);
  return Array.from({ length: 42 }, (_, i) => addDays(start, i));
}

export const WEEKDAY_LABELS_SHORT = ["seg.", "ter.", "qua.", "qui.", "sex.", "sáb.", "dom."];
