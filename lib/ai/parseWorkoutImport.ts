import "server-only";
import { getOpenAI } from "./openaiClient";

export interface ImportedSerie {
  reps?: string;
  peso?: number;
  tempo?: string;
}

export interface ImportedExercicio {
  nome: string;
  descanso?: string;
  observacoes?: string;
  series: ImportedSerie[];
}

const MODEL = "gpt-4o";
/** Limite de segurança — evita mandar um texto gigante (ex.: PDF de 40 páginas) pro modelo. */
const MAX_INPUT_CHARS = 24000;

const SYSTEM_PROMPT = `Você é um assistente que converte a descrição de um treino de musculação (texto digitado, colado de outro app/planilha, ou extraído de um PDF) em uma lista estruturada de exercícios.

Regras importantes:
- Extraia SOMENTE o que está explícito no texto. NUNCA invente exercícios, séries, repetições, cargas ou descanso que não estejam escritos ou claramente implícitos (ex.: "3x12" implica 3 séries de 12 reps).
- O "nome" do exercício deve ser copiado como está escrito no texto (não traduza, não corrija nomenclatura, não abrevie).
- Se o texto disser algo como "3x12" ou "3 séries de 12 repetições", gere 3 séries, cada uma com reps "12".
- Se mencionar carga (ex.: "20kg", "carga 20"), preencha "peso" em kg (número).
- Se mencionar tempo/duração em vez de reps (ex.: prancha 30s, bike 10min), preencha "tempo" (formato livre, como "30s" ou "10min") e deixe "reps" nulo.
- Se não houver nenhuma menção de séries pra um exercício, gere uma lista "series" vazia.
- Se o texto tiver instruções soltas sobre o exercício (ex.: "pegada supinada", "cadência lenta"), coloque em "observacoes".
- Se não conseguir identificar nenhum exercício no texto, responda com {"exercicios": []}.

Responda APENAS com um JSON válido, sem nenhum texto fora dele, exatamente neste formato:
{
  "exercicios": [
    {
      "nome": "string",
      "descanso": "string ou null",
      "observacoes": "string ou null",
      "series": [
        { "reps": "string ou null", "peso": number ou null, "tempo": "string ou null" }
      ]
    }
  ]
}`;

function toStringOrUndefined(v: unknown): string | undefined {
  if (v === null || v === undefined) return undefined;
  const s = String(v).trim();
  return s.length > 0 ? s : undefined;
}

function toNumberOrUndefined(v: unknown): number | undefined {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && v.trim()) {
    const n = Number(v.replace(",", "."));
    if (Number.isFinite(n)) return n;
  }
  return undefined;
}

/**
 * Manda o texto (já extraído do PDF, se for o caso) pra IA e devolve a
 * lista de exercícios reconhecidos. Não faz nenhum casamento com a
 * biblioteca de exercícios — isso é feito no client (ver ImportWorkoutModal),
 * que já tem o catálogo carregado.
 */
export async function parseWorkoutImport(texto: string): Promise<ImportedExercicio[]> {
  const textoLimitado = texto.slice(0, MAX_INPUT_CHARS);
  if (!textoLimitado.trim()) {
    throw new Error("Nenhum texto encontrado pra importar.");
  }

  const openai = getOpenAI();
  const completion = await openai.chat.completions.create({
    model: MODEL,
    temperature: 0,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: textoLimitado },
    ],
  });

  const raw = completion.choices[0]?.message?.content;
  if (!raw) {
    throw new Error("A IA não retornou nenhum conteúdo. Tente novamente.");
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error("A IA retornou um formato inesperado. Tente novamente ou reescreva o texto.");
  }

  const lista = (parsed as { exercicios?: unknown } | null)?.exercicios;
  if (!Array.isArray(lista)) {
    throw new Error("A IA não retornou nenhum exercício reconhecível.");
  }

  return lista
    .filter((e): e is Record<string, unknown> => !!e && typeof e === "object")
    .map((e): ImportedExercicio => ({
      nome: toStringOrUndefined(e.nome) || "",
      descanso: toStringOrUndefined(e.descanso),
      observacoes: toStringOrUndefined(e.observacoes),
      series: Array.isArray(e.series)
        ? e.series
            .filter((s): s is Record<string, unknown> => !!s && typeof s === "object")
            .map((s) => ({
              reps: toStringOrUndefined(s.reps),
              peso: toNumberOrUndefined(s.peso),
              tempo: toStringOrUndefined(s.tempo),
            }))
        : [],
    }))
    .filter((e) => e.nome.length > 0);
}
