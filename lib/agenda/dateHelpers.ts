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

export type PeriodoFiltro = "hoje" | "semana" | "mes" | "3meses";

/** Janela [start, end) pra cada opção de período — sempre relativa a agora
 *  (não à navegação do calendário principal, que é independente). */
export function rangeForPeriodo(periodo: PeriodoFiltro): { start: Date; end: Date } {
  const now = new Date();
  if (periodo === "hoje") {
    const start = new Date(now);
    start.setHours(0, 0, 0, 0);
    return { start, end: addDays(start, 1) };
  }
  if (periodo === "semana") {
    const start = getMonday(now);
    return { start, end: addDays(start, 7) };
  }
  if (periodo === "mes") {
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    return { start, end: new Date(now.getFullYear(), now.getMonth() + 1, 1) };
  }
  // 3meses — mês atual + 2 anteriores
  const start = new Date(now.getFullYear(), now.getMonth() - 2, 1);
  return { start, end: new Date(now.getFullYear(), now.getMonth() + 1, 1) };
}

/** Divide [start, end) em categorias pro gráfico — granularidade automática:
 *  ≤10 dias vira dia a dia, ≤45 dias vira semana a semana, mais que isso vira mês a mês. */
export function bucketRange(start: Date, end: Date): { categoria: string; from: Date; to: Date }[] {
  const capitalizar = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
  const spanDays = Math.max(1, (end.getTime() - start.getTime()) / 86_400_000);

  if (spanDays <= 10) {
    const dias = Math.round(spanDays);
    return Array.from({ length: dias }, (_, i) => {
      const from = addDays(start, i);
      const label = capitalizar(from.toLocaleDateString("pt-BR", { weekday: "short" }).replace(".", ""));
      return { categoria: label, from, to: addDays(from, 1) };
    });
  }

  if (spanDays <= 45) {
    const semanas = Math.ceil(spanDays / 7);
    return Array.from({ length: semanas }, (_, i) => {
      const from = addDays(start, i * 7);
      const to = addDays(from, 7);
      return { categoria: `S${i + 1}`, from, to };
    });
  }

  const meses: { categoria: string; from: Date; to: Date }[] = [];
  let cursor = new Date(start.getFullYear(), start.getMonth(), 1);
  while (cursor < end) {
    const proximo = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1);
    const label = capitalizar(cursor.toLocaleDateString("pt-BR", { month: "short" }).replace(".", ""));
    meses.push({ categoria: label, from: cursor, to: proximo });
    cursor = proximo;
  }
  return meses;
}
