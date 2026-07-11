import { normalizeText } from "@/lib/utils/textNormalize";

const MUSCLE_SHORT: Record<string, string> = {
  peito: "Peito",
  costas: "Costas",
  pernas: "Pernas",
  gluteos: "Glúteos",
  glúteos: "Glúteos",
  ombros: "Ombros",
  bracos: "Braços",
  braços: "Braços",
  abdomen: "Abdômen",
  abdômen: "Abdômen",
  core: "Core",
};

function shortenMuscleGroup(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return "";
  const key = normalizeText(trimmed);
  for (const [match, label] of Object.entries(MUSCLE_SHORT)) {
    if (key.includes(normalizeText(match))) return label;
  }
  const first = trimmed.split(/[\s,/]+/)[0];
  return first.charAt(0).toUpperCase() + first.slice(1).toLowerCase();
}
export function getRoutineMuscleSummary(
  exercicios: Array<{ nome?: string; grupo_muscular?: string }>
): string {
  const groups = [
    ...new Set(
      exercicios
        .map((ex) => ex.grupo_muscular?.trim())
        .filter((g): g is string => Boolean(g))
        .map(shortenMuscleGroup)
    ),
  ];

  if (groups.length > 0) {
    return groups.slice(0, 4).join(" · ");
  }

  const names = exercicios.map((ex) => ex.nome?.trim()).filter((n): n is string => Boolean(n));
  if (names.length === 0) return "";

  const preview = names.slice(0, 2).join(", ");
  const suffix = names.length > 2 ? "..." : "";
  return `${names.length} exercício${names.length !== 1 ? "s" : ""} · ${preview}${suffix}`;
}
