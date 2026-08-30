/**
 * Modalidade esportiva (o que o aluno pratica) + objetivo (o que ele quer
 * alcançar) — campos separados em profiles, ver migration 0091.
 * Fonte única — nunca hardcodar essas strings em outro lugar do código.
 */

export const MODALIDADES_ESPORTE = [
  { value: "musculacao", label: "Musculação" },
  { value: "corrida", label: "Corrida" },
  { value: "natacao", label: "Natação" },
  { value: "ciclismo", label: "Ciclismo" },
  { value: "crossfit", label: "CrossFit" },
  { value: "futevolei", label: "Futevôlei" },
  { value: "futebol", label: "Futebol" },
  { value: "tenis", label: "Tênis" },
  { value: "artes_marciais", label: "Artes Marciais" },
  { value: "funcional", label: "Funcional" },
  { value: "outro", label: "Outro" },
] as const;

export type ModalidadeEsporte = (typeof MODALIDADES_ESPORTE)[number]["value"];

/**
 * Substitui os valores antigos de `objetivo` (bulking/cutting/recomposicao/
 * manutencao — usados antes da migration 0091). Mapeamento de leitura pra
 * dado legado que por algum motivo não tenha sido migrado: ver
 * `legacyObjetivoLabel` mais abaixo.
 */
export const OBJETIVOS_ALUNO = [
  { value: "hipertrofia", label: "Hipertrofia" },
  { value: "emagrecimento", label: "Emagrecimento" },
  { value: "definicao", label: "Definição / Recomposição" },
  { value: "performance", label: "Performance Esportiva" },
  { value: "saude", label: "Saúde / Condicionamento" },
  { value: "reabilitacao", label: "Reabilitação" },
  { value: "outro", label: "Outro" },
] as const;

export type ObjetivoAluno = (typeof OBJETIVOS_ALUNO)[number]["value"];

/** Mapeia um valor legado (pré migration 0091) pro novo enum — mesmo mapeamento da migration. */
const LEGACY_OBJETIVO_MAP: Record<string, ObjetivoAluno> = {
  bulking: "hipertrofia",
  cutting: "emagrecimento",
  recomposicao: "definicao",
  manutencao: "saude",
};

/** Normaliza um objetivo (legado ou novo) pro enum atual — usar ao ler dados antigos em cache/local. */
export function normalizeObjetivoAluno(raw: string | null | undefined): ObjetivoAluno | null {
  if (!raw) return null;
  if (OBJETIVOS_ALUNO.some((o) => o.value === raw)) return raw as ObjetivoAluno;
  return LEGACY_OBJETIVO_MAP[raw] ?? null;
}
