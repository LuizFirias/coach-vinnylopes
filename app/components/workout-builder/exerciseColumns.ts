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
        { key: "distancia_sugerida", label: "Dist. (m)", type: "number", placeholder: "0" },
        { key: "tempo_sugerido", label: "Tempo", type: "text", timeInput: true },
      ];
    case "Peso e Distância":
      return [{ key: "distancia_sugerida", label: "Dist. (m)", type: "number", placeholder: "0" }];
    default:
      return [{ key: "reps_sugerido", label: "Reps", type: "text", placeholder: "12" }];
  }
}
