export type ActivityType =
  | "workout_completed"
  | "cardio_completed"
  | "meal_done"
  | "measurement_added"
  | "photo_sent";

export interface RawActivity {
  id: string;
  studentId: string;
  studentName: string;
  avatarUrl?: string | null;
  sexo?: string | null;
  type: ActivityType;
  workoutName?: string;
  description?: string;
  timestamp: Date;
  link: string;
}

export interface GroupedActivityEvent {
  type: ActivityType;
  count: number;
  label: string;
}

export interface GroupedActivity {
  studentId: string;
  studentName: string;
  avatarUrl?: string | null;
  sexo?: string | null;
  date: string;
  events: GroupedActivityEvent[];
  latestTimestamp: Date;
  link: string;
}

function toDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function formatRelativeDate(date: Date): string {
  const now = new Date();
  const todayKey = toDateKey(now);
  const dateKey = toDateKey(date);

  if (dateKey === todayKey) return "hoje";

  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  if (dateKey === toDateKey(yesterday)) return "ontem";

  return date.toLocaleDateString("pt-BR", { day: "numeric", month: "short" });
}

export function formatActivityLabel(
  type: ActivityType,
  count: number,
  workoutName?: string,
  description?: string
): string {
  switch (type) {
    case "workout_completed":
      return count > 1
        ? `${count} treinos concluídos`
        : `Concluiu o treino: ${workoutName || "Treino"}`;
    case "cardio_completed":
      return count > 1
        ? `${count} cardios concluídos`
        : description
          ? `Concluiu cardio: ${description}`
          : "Concluiu cardio";
    case "meal_done":
      return count > 1 ? `${count} refeições feitas` : "Refeição feita";
    case "measurement_added":
      return count > 1 ? `${count} medidas atualizadas` : "Medidas atualizadas";
    case "photo_sent":
      return count > 1 ? `${count} fotos enviadas` : "Foto enviada";
    default:
      return description || type;
  }
}

export function groupActivities(raw: RawActivity[]): GroupedActivity[] {
  const groups = new Map<string, RawActivity[]>();

  raw.forEach((item) => {
    const key = `${item.studentId}:${toDateKey(item.timestamp)}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(item);
  });

  const result: GroupedActivity[] = [];

  groups.forEach((items) => {
    const sorted = [...items].sort(
      (a, b) => b.timestamp.getTime() - a.timestamp.getTime()
    );
    const first = sorted[0];
    const counts = new Map<ActivityType, { count: number; sample: RawActivity }>();

    sorted.forEach((item) => {
      const existing = counts.get(item.type);
      if (existing) {
        existing.count += 1;
      } else {
        counts.set(item.type, { count: 1, sample: item });
      }
    });

    const events: GroupedActivityEvent[] = Array.from(counts.entries()).map(
      ([type, { count, sample }]) => ({
        type,
        count,
        label: formatActivityLabel(
          type,
          count,
          sample.workoutName,
          sample.description
        ),
      })
    );

    result.push({
      studentId: first.studentId,
      studentName: first.studentName,
      avatarUrl: first.avatarUrl,
      sexo: first.sexo,
      date: formatRelativeDate(first.timestamp),
      events,
      latestTimestamp: first.timestamp,
      link: first.link,
    });
  });

  return result.sort(
    (a, b) => b.latestTimestamp.getTime() - a.latestTimestamp.getTime()
  );
}
