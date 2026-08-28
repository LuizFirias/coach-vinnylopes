import { normalizeText } from "@/lib/utils/textNormalize";

/** Lista oficial — alinhada ao CHECK de `exercicios_biblioteca.equipamento`. */
export const CANONICAL_EQUIPMENTS = [
  "Nenhum",
  "Banda de Resistência",
  "Banda de Suspensão",
  "Barra",
  "Disco de Peso",
  "Haltere",
  "Kettlebell",
  "Máquina",
  "Outro",
] as const;

export type CanonicalEquipment = (typeof CANONICAL_EQUIPMENTS)[number];

/**
 * Sinônimos / valores legados (seed, import EN, plurais) → canônico PT.
 * Chaves devem passar por `normalizeText` (sem acento, lower).
 */
const EQUIPMENT_ALIASES: Record<string, CanonicalEquipment> = {
  // Haltere
  haltere: "Haltere",
  halter: "Haltere",
  halteres: "Haltere",
  "halteres / dumbbells": "Haltere",
  "halteres/dumbbells": "Haltere",
  dumbbell: "Haltere",
  dumbbells: "Haltere",
  dumbell: "Haltere",
  dumbells: "Haltere",

  // Máquina / cabo
  maquina: "Máquina",
  "maquina / cabo / polia": "Máquina",
  "maquina/cabo/polia": "Máquina",
  "cabo/polia": "Máquina",
  cabo: "Máquina",
  polia: "Máquina",
  cable: "Máquina",
  smith: "Máquina",
  "maquina de cardio": "Máquina",
  "cardio machine": "Máquina",

  // Peso corporal → Nenhum (sem equipamento)
  "peso corporal": "Nenhum",
  bodyweight: "Nenhum",
  "body weight": "Nenhum",
  nenhum: "Nenhum",
  none: "Nenhum",

  // Barra
  barra: "Barra",
  barbell: "Barra",
  "barra olímpica": "Barra",
  "barra olimpica": "Barra",

  // Kettlebell
  kettlebell: "Kettlebell",
  kettlebells: "Kettlebell",
  "kettle bell": "Kettlebell",

  // Bandas
  "banda de resistencia": "Banda de Resistência",
  elastico: "Banda de Resistência",
  "resistance band": "Banda de Resistência",
  "banda elastica": "Banda de Resistência",
  "banda de suspensao": "Banda de Suspensão",
  trx: "Banda de Suspensão",
  "suspension trainer": "Banda de Suspensão",

  // Disco
  "disco de peso": "Disco de Peso",
  disco: "Disco de Peso",
  plate: "Disco de Peso",
  plates: "Disco de Peso",

  // Catch-all comuns
  outro: "Outro",
  other: "Outro",
  banco: "Outro",
  bench: "Outro",
};

const CANONICAL_BY_NORMALIZED = new Map<string, CanonicalEquipment>(
  CANONICAL_EQUIPMENTS.map((eq) => [normalizeText(eq), eq]),
);

/** Normaliza qualquer string de equipamento para o valor canônico do produto. */
export function canonicalizeEquipment(raw: string | null | undefined): CanonicalEquipment {
  const trimmed = raw?.trim();
  if (!trimmed) return "Nenhum";

  const normalized = normalizeText(trimmed);
  const direct = CANONICAL_BY_NORMALIZED.get(normalized);
  if (direct) return direct;

  const alias = EQUIPMENT_ALIASES[normalized];
  if (alias) return alias;

  return "Outro";
}

/** Equipamentos em que a carga registrada é de um lado (não a soma dos dois). */
export function isPerSideLoadEquipment(
  equipamento: string | null | undefined,
  exerciseName?: string | null,
): boolean {
  const eq = canonicalizeEquipment(equipamento);
  if (eq === 'Haltere' || eq === 'Kettlebell') return true;

  const name = normalizeText(exerciseName || '');
  if (!name) return false;
  return (
    name.includes('halter') ||
    name.includes('dumbbell') ||
    name.includes('dumbell') ||
    name.includes('kettlebell') ||
    name.includes('kettle bell')
  );
}

/** Opções do filtro/select (sempre a lista oficial). */
export function listCanonicalEquipments(): readonly CanonicalEquipment[] {
  return CANONICAL_EQUIPMENTS;
}
