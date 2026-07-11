import { normalizeText, textEquals } from "@/lib/utils/textNormalize";

export const CANONICAL_MUSCLE_GROUPS = [
  "Peito Superior",
  "Peito Médio",
  "Peito Inferior",
  "Dorsais",
  "Trapézio",
  "Lombar",
  "Ombro Anterior",
  "Ombro Lateral",
  "Ombro Posterior",
  "Bíceps",
  "Tríceps",
  "Antebraço",
  "Quadríceps",
  "Posterior (Isquiotibiais)",
  "Panturrilha",
  "Glúteos",
  "Abdômen",
  "Oblíquos",
  "Cardio",
] as const;

export type CanonicalMuscleGroup = (typeof CANONICAL_MUSCLE_GROUPS)[number];

/** Slugs comuns (ex.: importação wger) → nome canônico com acento. */
const MUSCLE_SLUG_ALIASES: Record<string, CanonicalMuscleGroup> = {
  biceps: "Bíceps",
  triceps: "Tríceps",
  quadriceps: "Quadríceps",
  hamstrings: "Posterior (Isquiotibiais)",
  glutes: "Glúteos",
  abs: "Abdômen",
  calves: "Panturrilha",
  forearms: "Antebraço",
  traps: "Trapézio",
  trapezius: "Trapézio",
  lats: "Dorsais",
  deltoids: "Ombro Lateral",
  chest: "Peito Médio",
  obliques: "Oblíquos",
};

const CANONICAL_BY_NORMALIZED = new Map<string, CanonicalMuscleGroup>(
  CANONICAL_MUSCLE_GROUPS.map((group) => [normalizeText(group), group]),
);

/** Unifica variantes como "biceps" / "Bíceps" / "BICEPS" para o nome canônico. */
export function canonicalizeMuscleGroup(raw: string | null | undefined): string {
  const trimmed = raw?.trim();
  if (!trimmed) return "Outro";

  const normalized = normalizeText(trimmed);
  const fromCanonical = CANONICAL_BY_NORMALIZED.get(normalized);
  if (fromCanonical) return fromCanonical;

  const fromSlug = MUSCLE_SLUG_ALIASES[normalized];
  if (fromSlug) return fromSlug;

  return trimmed;
}

export function resolveMuscleGroup(
  raw: string | null | undefined,
  fallback = "Outro",
): string {
  const trimmed = raw?.trim();
  if (!trimmed || textEquals(trimmed, fallback)) return fallback;
  return canonicalizeMuscleGroup(trimmed);
}
