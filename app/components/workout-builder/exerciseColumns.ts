import type { ColunaSerie } from "./types";

const TIPOS_EXERCICIO = [
  "Peso & Repetições",
  "Repetições",
  "Peso Corporal com Peso Acrescido",
  "Duração",
  "Duração e Peso",
  "Distância e Duração",
  "Peso e Distância",
];

export { TIPOS_EXERCICIO };

export function showPesoColumn(tipo: string): boolean {
  return [
    "Peso & Repetições",
    "Peso Corporal com Peso Acrescido",
    "Duração e Peso",
    "Peso e Distância",
  ].includes(tipo);
}

/**
 * Mostra o campo peso na execução do aluno? Fichas antigas sem `tipo_exercicio`
 * salvo continuam mostrando peso, como sempre (default "Peso & Repetições").
 */
export function exercicioMostraPeso(tipoExercicio?: string | null): boolean {
  return showPesoColumn(tipoExercicio || "Peso & Repetições");
}

/** Exercício prescrito por tempo (Duração / Duração e Peso) — usa tempo_sugerido, não reps_sugerido. */
export function exercicioEhPorTempo(tipoExercicio?: string | null): boolean {
  return tipoExercicio === "Duração" || tipoExercicio === "Duração e Peso";
}

export function getColunasPorTipo(tipo: string): ColunaSerie[] {
  switch (tipo) {
    case "Peso & Repetições":
    case "Repetições":
    case "Peso Corporal com Peso Acrescido":
      return [{ key: "reps_sugerido", label: "Reps", type: "text", placeholder: "12" }];
    case "Duração":
      return [{ key: "tempo_sugerido", label: "Tempo", type: "text", timeInput: true }];
    case "Duração e Peso":
      return [{ key: "tempo_sugerido", label: "Tempo", type: "text", timeInput: true }];
    case "Distância e Duração":
      return [
        { key: "distancia_sugerida", label: "Dist", type: "number", placeholder: "0" },
        { key: "tempo_sugerido", label: "Tempo", type: "text", timeInput: true },
      ];
    case "Peso e Distância":
      return [{ key: "distancia_sugerida", label: "Dist", type: "number", placeholder: "0" }];
    default:
      return [{ key: "reps_sugerido", label: "Reps", type: "text", placeholder: "12" }];
  }
}
