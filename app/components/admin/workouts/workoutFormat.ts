import { isBiSetFichaItem, type ExercicioFichaItem } from "@/lib/utils/biset";
import type { WorkoutPlan } from "./types";

export function formatLastExecution(dateStr: string | null | undefined): string {
  if (!dateStr) return "Nunca";
  const formatted = timeAgo(dateStr);
  return formatted ?? "Nunca";
}

/** Nomes dos exercícios a partir de configuracao.exercicios (inclui bi-set). */
export function extractExerciseNames(
  configuracao: { exercicios?: unknown[] } | null | undefined,
): string[] {
  const items = configuracao?.exercicios;
  if (!Array.isArray(items)) return [];

  return items
    .map((raw) => {
      const ex = raw as ExercicioFichaItem;
      if (isBiSetFichaItem(ex)) {
        const a = ex.exercicioA?.nome?.trim();
        const b = ex.exercicioB?.nome?.trim();
        if (a && b) return `${a} + ${b}`;
        return a || b || "";
      }
      const nome = ex.nome?.trim();
      return nome || "";
    })
    .filter(Boolean);
}

/** Linha estilo Hevy: "Agachamento, Leg press, Extensora..." */
export function formatExerciseNamesLine(plan: WorkoutPlan): string {
  if (plan.tipo === "pdf") return "Plano em PDF";
  const names = plan.exercicio_nomes?.filter(Boolean) ?? [];
  if (names.length > 0) return names.join(", ");
  if (plan.exercicios_count > 0) {
    return `${plan.exercicios_count} ${plan.exercicios_count === 1 ? "exercício" : "exercícios"}`;
  }
  return "Sem exercícios";
}

export function timeAgo(dateStr: string | null | undefined): string | null {
  if (!dateStr) return null;
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (diff < 60) return "agora";
  if (diff < 3600) return `${Math.floor(diff / 60)}min atrás`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h atrás`;
  const days = Math.floor(diff / 86400);
  if (days === 1) return "ontem";
  if (days < 30) return `${days} dias atrás`;
  return new Date(dateStr).toLocaleDateString("pt-BR", { day: "numeric", month: "short" });
}
