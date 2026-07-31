/**
 * Escolhe qual refeição abrir automaticamente conforme o horário (America/Sao_Paulo).
 * Janelas = midpoints entre âncoras (time_suggestion / meal_type / preset por quantidade).
 * Se a do horário já estiver concluída, abre a próxima pendente do dia.
 */

export type MealExpandCandidate = {
  id: string;
  time?: string | null;
  meal_type?: string | null;
};

const TYPE_ANCHOR_MINUTES: Record<string, number> = {
  cafe_da_manha: 8 * 60,
  lanche_manha: 10 * 60 + 30,
  almoco: 12 * 60 + 30,
  pre_treino: 15 * 60,
  pos_treino: 17 * 60,
  lanche_tarde: 16 * 60,
  jantar: 20 * 60,
  ceia: 22 * 60,
  refeicao_livre: 14 * 60,
};

/** Âncoras padrão quando não há horário — escalonado pelo nº de refeições. */
function defaultAnchorsByCount(n: number): number[] {
  const presets: Record<number, number[]> = {
    1: [12 * 60],
    2: [8 * 60, 19 * 60],
    3: [8 * 60, 13 * 60, 20 * 60],
    // midpoints ≈ 11:00 / 15:30 / 18:30 → café até 10:59, almoço, lanche, jantar
    4: [8 * 60, 14 * 60, 17 * 60, 20 * 60],
    5: [8 * 60, 10 * 60 + 30, 13 * 60, 16 * 60, 20 * 60],
    6: [7 * 60 + 30, 10 * 60, 12 * 60 + 30, 15 * 60 + 30, 19 * 60, 21 * 60 + 30],
  };
  if (presets[n]) return presets[n];

  const start = 7 * 60;
  const end = 21 * 60;
  if (n <= 1) return [12 * 60];
  return Array.from({ length: n }, (_, i) =>
    Math.round(start + (i * (end - start)) / (n - 1)),
  );
}

export function parseMealTimeToMinutes(time: string | null | undefined): number | null {
  if (!time) return null;
  const match = String(time).trim().match(/^(\d{1,2}):(\d{2})/);
  if (!match) return null;
  const h = Number(match[1]);
  const m = Number(match[2]);
  if (!Number.isFinite(h) || !Number.isFinite(m) || h > 23 || m > 59) return null;
  return h * 60 + m;
}

/** Minutos desde 00:00 no fuso America/Sao_Paulo. */
export function getBrazilMinutesOfDay(now: Date = new Date()): number {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'America/Sao_Paulo',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(now);

  const hour = Number(parts.find((p) => p.type === 'hour')?.value ?? 0);
  const minute = Number(parts.find((p) => p.type === 'minute')?.value ?? 0);
  // en-GB pode devolver "24" à meia-noite em alguns engines
  const h = hour === 24 ? 0 : hour;
  return h * 60 + minute;
}

function resolveAnchors(meals: MealExpandCandidate[]): number[] {
  const fallbacks = defaultAnchorsByCount(meals.length);
  return meals.map((meal, i) => {
    const fromTime = parseMealTimeToMinutes(meal.time);
    if (fromTime != null) return fromTime;
    if (meal.meal_type && TYPE_ANCHOR_MINUTES[meal.meal_type] != null) {
      return TYPE_ANCHOR_MINUTES[meal.meal_type];
    }
    return fallbacks[i] ?? 12 * 60;
  });
}

function buildWindows(anchors: number[]): Array<{ start: number; end: number }> {
  const n = anchors.length;
  return anchors.map((_, i) => {
    const start = i === 0 ? 0 : Math.floor((anchors[i - 1] + anchors[i]) / 2);
    const end = i === n - 1 ? 24 * 60 : Math.floor((anchors[i] + anchors[i + 1]) / 2);
    return { start, end };
  });
}

/**
 * Retorna o id da refeição a expandir, ou null se a lista estiver vazia.
 */
export function pickMealIdToAutoExpand(
  meals: MealExpandCandidate[],
  isDone: (id: string) => boolean,
  now: Date = new Date(),
): string | null {
  if (!meals.length) return null;

  const nowMin = getBrazilMinutesOfDay(now);
  const windows = buildWindows(resolveAnchors(meals));

  let slotIdx = windows.findIndex((w) => nowMin >= w.start && nowMin < w.end);
  if (slotIdx < 0) slotIdx = meals.length - 1;

  // Preferir a do horário; se concluída, próxima pendente no restante do dia; senão qualquer pendente
  for (let i = slotIdx; i < meals.length; i++) {
    if (!isDone(meals[i].id)) return meals[i].id;
  }
  for (let i = 0; i < slotIdx; i++) {
    if (!isDone(meals[i].id)) return meals[i].id;
  }

  // Todas concluídas — ainda assim destaca a do horário (revisão)
  return meals[slotIdx]?.id ?? meals[0].id;
}

export function buildAutoExpandedMap(
  meals: MealExpandCandidate[],
  isDone: (id: string) => boolean,
  now?: Date,
): Record<string, boolean> {
  const id = pickMealIdToAutoExpand(meals, isDone, now);
  return id ? { [id]: true } : {};
}
