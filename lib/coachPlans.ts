import { supabaseClient } from "@/lib/supabaseClient";

/**
 * Planos de venda do coach.
 * Os 4 planos padrão são fixos do produto; os personalizados vivem em
 * `coach_planos` (RLS: cada coach enxerga apenas os seus).
 * `slug` é o valor gravado em profiles.tipo_plano.
 */
export interface CoachPlan {
  id?: string;
  slug: string;
  nome: string;
  duracao_meses: number;
  valor_sugerido?: number | null;
  custom: boolean;
}

export const DEFAULT_PLANS: CoachPlan[] = [
  { slug: "mensal", nome: "Mensal", duracao_meses: 1, custom: false },
  { slug: "trimestral", nome: "Trimestral", duracao_meses: 3, custom: false },
  { slug: "semestral", nome: "Semestral", duracao_meses: 6, custom: false },
  { slug: "anual", nome: "Anual", duracao_meses: 12, custom: false },
];

const RESERVED_SLUGS = new Set([
  ...DEFAULT_PLANS.map((p) => p.slug),
  "outros",
  "sem_plano",
]);

export function isReservedPlanSlug(slug: string): boolean {
  return RESERVED_SLUGS.has(slug);
}

/** "Mentoria 2 Meses" → "mentoria_2_meses" (mesmo formato aceito pelo CHECK do banco). */
export function slugifyPlanName(nome: string): string {
  return nome
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 40);
}

export async function fetchCoachCustomPlans(coachId: string): Promise<CoachPlan[]> {
  const { data, error } = await supabaseClient
    .from("coach_planos")
    .select("id, nome, slug, duracao_meses, valor_sugerido")
    .eq("coach_id", coachId)
    .eq("ativo", true)
    .order("duracao_meses", { ascending: true });
  if (error) throw error;
  return (data ?? []).map((r) => ({
    id: r.id,
    slug: r.slug,
    nome: r.nome,
    duracao_meses: r.duracao_meses,
    valor_sugerido: r.valor_sugerido,
    custom: true,
  }));
}

/** Padrão + personalizados, na ordem estável usada em selects e no donut. */
export function mergedPlans(customPlans: CoachPlan[]): CoachPlan[] {
  return [...DEFAULT_PLANS, ...customPlans];
}

/** slug → duração em meses (planos padrão + personalizados do coach). */
export function buildPlanDurationMap(customPlans: CoachPlan[]): Record<string, number> {
  const map: Record<string, number> = {};
  for (const p of mergedPlans(customPlans)) map[p.slug] = p.duracao_meses;
  return map;
}

/** Nome de exibição de um slug de plano; cai no slug capitalizado se não achar. */
export function planDisplayName(
  slug: string | null | undefined,
  customPlans: CoachPlan[] = []
): string {
  if (!slug) return "Mensal";
  const found = mergedPlans(customPlans).find((p) => p.slug === slug);
  if (found) return found.nome;
  return slug.charAt(0).toUpperCase() + slug.slice(1).replace(/_/g, " ");
}
