// Descrições completas das técnicas e métodos — coach (tooltip) e aluno (card)

export interface TechniqueOption {
  value: string;
  label: string;
  shortLabel: string;
  name: string | null;
  description: string | null;
  coachTip: string | null;
  studentInstruction: string | null;
  example?: string | null;
}

export const TECHNIQUE_OPTIONS: TechniqueOption[] = [
  {
    value: "",
    label: "—",
    shortLabel: "—",
    name: null,
    description: null,
    coachTip: null,
    studentInstruction: null,
  },
  {
    value: "WS",
    label: "WS — Warm Set",
    shortLabel: "WS",
    name: "Warm Set — Série de aquecimento",
    description:
      "Série realizada com carga reduzida (geralmente 40–60% da carga de trabalho) antes das séries principais. Objetivo: aquecer a musculatura, lubrificar as articulações e preparar o sistema nervoso para o esforço máximo.",
    coachTip:
      "Use 1–2 Warm Sets antes de séries pesadas. Não vá à falha — o objetivo é preparação, não fadiga.",
    studentInstruction:
      "Esta é uma série de aquecimento. Use um peso LEVE — cerca da metade do peso que você usará nas séries seguintes. Foque na execução e não force o esforço máximo.",
    example: "Supino: séries de trabalho com 80kg → WS com 40kg × 10 reps",
  },
  {
    value: "FS",
    label: "FS — Feeder Set",
    shortLabel: "FS",
    name: "Feeder Set — Série de aproximação",
    description:
      "Série de transição entre o aquecimento e a carga máxima de trabalho. Realizada com carga intermediária (60–80% da carga alvo), serve para calibrar a sensação do peso e refinar a técnica antes do esforço principal.",
    coachTip:
      "Use 1–2 Feeder Sets quando o salto de carga for grande. Evita lesões por ativação inadequada e melhora a qualidade das séries principais.",
    studentInstruction:
      "Esta é uma série de aproximação. Use um peso moderado — entre o aquecimento e o peso principal. Execute com atenção à técnica, mas sem ir ao limite.",
    example: "Agachamento com 100kg → FS com 70kg × 5 reps antes das séries de trabalho",
  },
  {
    value: "TS",
    label: "TS — Top Set",
    shortLabel: "TS",
    name: "Top Set — Série principal",
    description:
      "A série de maior intensidade do exercício — representa o esforço máximo prescrito para aquela sessão. É a série que define o desempenho do dia e serve como referência de progressão.",
    coachTip:
      "O Top Set é o pico de intensidade. Pode ser uma série única ao limite, ou a série mais pesada antes das Back Sets. Registre sempre o peso e as reps para acompanhar a progressão.",
    studentInstruction:
      "Esta é a sua série principal — a mais importante do exercício. Dê o seu melhor aqui. Use o peso prescrito e execute com máxima concentração. Esta série define sua progressão.",
    example: "Top Set de Remada: 1 × 8 reps com o maior peso possível para aquela faixa",
  },
  {
    value: "BS",
    label: "BS — Back Set",
    shortLabel: "BS",
    name: "Back Set — Série de volume pós-top",
    description:
      "Séries realizadas após o Top Set com carga reduzida (geralmente 80–90% do Top Set). Objetivo: acumular volume de treino sem comprometer a recuperação entre sessões.",
    coachTip:
      "Back Sets são ideais para hipertrofia — permitem volume total elevado com intensidade controlada. Reduza 10–20% da carga do Top Set e mantenha o RIR (reps in reserve) entre 1–2.",
    studentInstruction:
      "Esta série vem após a principal. Reduza um pouco o peso (cerca de 10–15%) e execute o número de repetições prescrito. O foco aqui é volume com boa execução — não precisa ir ao limite.",
    example: "Top Set 100kg × 5 → Back Sets 85kg × 3 × 8",
  },
  {
    value: "PR",
    label: "PR — Personal Record",
    shortLabel: "PR",
    name: "PR — Tentativa de recorde pessoal",
    description:
      "Série com o objetivo explícito de superar o melhor desempenho anterior — seja em carga, em repetições, ou em ambos. Exige preparação adequada (aquecimento completo, dia favorável) e registro rigoroso do resultado.",
    coachTip:
      "Programe tentativas de PR com baixa frequência (a cada 4–8 semanas). Certifique-se de que o aluno está recuperado e motivado. Sempre registre o resultado para usar como base da próxima progressão.",
    studentInstruction:
      "Esta é uma tentativa de RECORDE PESSOAL! Dê tudo o que tem. Certifique-se de estar bem aquecido. Após a série, registre o peso e as reps — isso define sua próxima meta.",
    example: "PR no Supino: melhor anterior foi 90kg × 5 → tentar 92.5kg × 5 ou 90kg × 6",
  },
];

export const EXTRA_OPTIONS: TechniqueOption[] = [
  {
    value: "",
    label: "—",
    shortLabel: "—",
    name: null,
    description: null,
    coachTip: null,
    studentInstruction: null,
  },
  {
    value: "Cluster Set",
    label: "Cluster Set",
    shortLabel: "CS",
    name: "Cluster Set",
    description:
      "Técnica que divide uma série em mini-blocos com pausas curtas (10–20 segundos) entre eles. Permite usar cargas mais altas ou completar mais repetições totais do que seria possível numa série contínua.",
    coachTip:
      "Útil para força e hipertrofia com cargas elevadas. Prescreva como \"4+4+4 com 15s de pausa\" ou similar. Ótimo para superar pontos de estagnação.",
    studentInstruction:
      "Execute as repetições em blocos com uma pausa curta entre eles. Por exemplo: faça 4 reps, descanse 15 segundos com o peso no suporte, faça mais 4 reps, pause novamente, e termine as últimas 4. NÃO é descanso completo — é uma pausa rápida para recuperar parcialmente.",
    example: "Agachamento 100kg: 4 reps + 15s pausa + 4 reps + 15s pausa + 4 reps = 12 reps totais",
  },
  {
    value: "Drop Set",
    label: "Drop Set",
    shortLabel: "DS",
    name: "Drop Set",
    description:
      "Ao atingir a falha (ou o número prescrito de reps), a carga é reduzida imediatamente (sem descanso) e a execução continua. Pode ter uma ou mais reduções de carga.",
    coachTip:
      "Use no final do treino ou no último exercício de um grupo muscular. Reduções típicas de 20–30% da carga. Gera alto estresse metabólico — use com parcimônia para evitar excesso de fadiga.",
    studentInstruction:
      "Ao terminar as repetições principais (ou atingir a falha), IMEDIATAMENTE reduza o peso (sem descansar) e continue executando. Não pare para descansar entre as reduções. O objetivo é levar o músculo ao limite com menos carga.",
    example: "Rosca: 12 reps com 20kg → drop para 15kg → drop para 10kg, sem pausa",
  },
  {
    value: "Rest Pause",
    label: "Rest Pause",
    shortLabel: "RP",
    name: "Rest Pause",
    description:
      "Após atingir a falha ou o número prescrito de reps, o aluno descansa de 10 a 20 segundos e retoma a execução com o mesmo peso até atingir a falha novamente. Repete o ciclo 2–3 vezes.",
    coachTip:
      "Excelente para maximizar volume de trabalho com uma única carga. Mais agressivo que o Cluster Set pois leva à falha real. Use em exercícios de baixo risco de lesão (máquinas, cabos).",
    studentInstruction:
      "Execute as repetições até a falha (ou até o número prescrito). Depois descanse APENAS 10–15 segundos (contar mentalmente) e continue com o mesmo peso até a falha novamente. Repita mais uma vez se o coach prescreveu. É intenso — mantenha a técnica.",
    example: "Cadeira extensora: 10 reps até falha → 15s pausa → 5 reps → 15s pausa → 3 reps",
  },
  {
    value: "Giant Set",
    label: "Giant Set",
    shortLabel: "GS",
    name: "Giant Set",
    description:
      "Quatro ou mais exercícios executados em sequência sem descanso entre eles, todos para o mesmo grupo muscular (ou para músculos diferentes). Gera altíssima densidade de treino e estresse metabólico.",
    coachTip:
      "Usado para finalizadores, trabalho de resistência muscular ou quando o tempo é limitado. Planeje a sequência de exercícios para minimizar deslocamento na academia. O descanso fica apenas ao final de todos os exercícios.",
    studentInstruction:
      "Execute TODOS os exercícios indicados um após o outro SEM parar para descansar. Só descanse ao terminar o último exercício do bloco. Organize os equipamentos antes de começar para não perder tempo entre os movimentos.",
    example: "Ombro: Desenvolvimento → Elevação lateral → Elevação frontal → Face Pull — tudo sem pausa",
  },
  {
    value: "Myo Reps",
    label: "Myo Reps",
    shortLabel: "MR",
    name: "Myo Reps",
    description:
      "Método de acumulação de volume de alta eficiência. Uma série de ativação (até próximo da falha) é seguida por múltiplas mini-séries de 3–5 reps com pausas de 3–5 respirações. Maximiza o número de reps próximas da falha (as mais produtivas para hipertrofia) em menos tempo.",
    coachTip:
      "Protocolo típico: série de ativação de 12–20 reps (deixar 1–2 reps na reserva) → 3–5 respirações → 5 reps → 3–5 respirações → 5 reps → repetir até não conseguir mais 5 reps. Muito eficiente em tempo — equivale a várias séries normais.",
    studentInstruction:
      "Faça a primeira série até quase a falha (deixe 1–2 repetições \"sobrando\"). Depois descanse APENAS o tempo de 3 a 5 respirações profundas, e faça mini-séries de 5 repetições, sempre com a mesma pausa curta. Continue até não conseguir completar as 5 reps. Parece fácil no começo — mas acumula muito trabalho.",
    example: "Cadeira extensora: 15 reps → 3 resp → 5 reps → 3 resp → 5 reps → 3 resp → 4 reps (fim)",
  },
  {
    value: "Bi-Set",
    label: "Bi-Set",
    shortLabel: "BS",
    name: "Bi-Set",
    description:
      "Dois exercícios executados em sequência sem descanso entre eles. Podem ser para o mesmo grupo muscular (maior fadiga localizada) ou para grupos antagonistas (maior recuperação entre movimentos).",
    coachTip:
      "Bi-set agonista (ex: rosca direta + rosca martelo): maior fadiga, mais hipertrofia localizada. Bi-set antagonista (ex: rosca + tríceps): um músculo descansa enquanto o outro trabalha — permite cargas mais altas e menor tempo total de treino.",
    studentInstruction:
      "Execute os dois exercícios UM APÓS O OUTRO sem descansar entre eles. Só descanse ao terminar os dois. Prepare os equipamentos antes para não perder tempo.",
    example: "Rosca direta 10 reps → imediatamente Rosca martelo 10 reps → descanso 90s → repetir",
  },
  {
    value: "Super Set",
    label: "Super Set",
    shortLabel: "SS",
    name: "Super Set",
    description:
      "Dois exercícios para grupos musculares DIFERENTES executados em sequência sem descanso. O objetivo é economizar tempo de treino — enquanto um músculo trabalha, o outro descansa.",
    coachTip:
      "Diferente do Bi-Set (que pode ser para o mesmo músculo), o Super Set é especificamente para músculos diferentes. Combinações clássicas: peito + costas, bíceps + tríceps, quadríceps + isquiotibiais.",
    studentInstruction:
      "Faça o primeiro exercício e vá DIRETO para o segundo, sem pausar. Os dois exercícios trabalham músculos diferentes, então você consegue manter a qualidade. Só descanse após terminar os dois movimentos.",
    example: "Supino reto 10 reps → imediatamente Remada curvada 10 reps → descanso → repetir",
  },
  {
    value: "Repetições Parciais",
    label: "Repetições Parciais",
    shortLabel: "RP",
    name: "Repetições Parciais",
    description:
      "Após atingir a falha com amplitude total, continua-se executando repetições com amplitude reduzida (geralmente o trecho inicial do movimento, onde a musculatura ainda tem capacidade). Aumenta o volume de trabalho além da falha.",
    coachTip:
      "Use após a falha para extrair mais estímulo sem risco elevado de lesão. Indique claramente qual trecho do movimento deve ser usado (ex: \"apenas metade do movimento no início\"). Funciona bem em máquinas e cabos.",
    studentInstruction:
      "Quando não conseguir mais fazer repetições completas, continue fazendo movimentos PARCIAIS — a metade ou um terço do movimento normal, no trecho onde ainda sente a musculatura trabalhando. Não é \"fazer errado\" — é uma técnica para aproveitar mais cada série.",
    example: "Rosca: 12 reps completas até a falha → mais 6 reps da metade inferior do movimento",
  },
  {
    value: "Isometria",
    label: "Isometria",
    shortLabel: "ISO",
    name: "Isometria",
    description:
      "Contração muscular sem movimento articular — o músculo produz força mas o comprimento não muda. Pode ser usada como método isolado (segurar o peso em determinada posição) ou como técnica complementar ao fim de uma série.",
    coachTip:
      "Prescreva com tempo de sustentação (ex: \"segurar 30s no ponto de máxima contração\"). Muito eficaz para pontos fracos em ângulos específicos, reabilitação, e fortalecimento articular. Indique sempre o ângulo ou posição a ser sustentada.",
    studentInstruction:
      "Segure o peso PARADO na posição indicada pelo seu coach — sem mover. Respire normalmente e mantenha a contração pelo tempo prescrito. Você vai sentir o músculo queimar — é normal. Foque em manter a posição correta até o fim.",
    example: "Agachamento: descer até 90° e segurar por 30 segundos sem subir",
  },
];

/** Aliases legados (snake_case ou variações) → value canônico */
const EXTRA_ALIASES: Record<string, string> = {
  cluster_set: "Cluster Set",
  drop_set: "Drop Set",
  rest_pause: "Rest Pause",
  giant_set: "Giant Set",
  myo_reps: "Myo Reps",
  bi_set: "Bi-Set",
  super_set: "Super Set",
  repeticoes_parciais: "Repetições Parciais",
  isometria: "Isometria",
};

function normalizeValue(value: string | null | undefined): string {
  if (!value?.trim()) return "";
  return value.trim();
}

function findByValue<T extends TechniqueOption>(options: T[], raw: string): T {
  const value = normalizeValue(raw);
  const byValue = options.find((o) => o.value === value);
  if (byValue) return byValue;

  const lower = value.toLowerCase();
  const byLabel = options.find(
    (o) => o.label.toLowerCase() === lower || o.name?.toLowerCase() === lower
  );
  if (byLabel) return byLabel;

  return options[0];
}

export function getTechniqueByValue(value: string | null | undefined): TechniqueOption {
  return findByValue(TECHNIQUE_OPTIONS, normalizeValue(value));
}

export function getExtraByValue(value: string | null | undefined): TechniqueOption {
  const normalized = normalizeValue(value);
  const canonical = EXTRA_ALIASES[normalized.toLowerCase()] ?? normalized;
  return findByValue(EXTRA_OPTIONS, canonical);
}

export function getTechniqueInfo(value: string | null | undefined): TechniqueOption | null {
  const item = getTechniqueByValue(value);
  return item.studentInstruction ? item : null;
}

export function getExtraInfo(value: string | null | undefined): TechniqueOption | null {
  const item = getExtraByValue(value);
  return item.studentInstruction ? item : null;
}

/** A série usa Cluster Set (em qualquer um dos dois campos de técnica)? */
export function isClusterSet(serie: { tecnica?: string | null; tecnica_extra?: string | null }): boolean {
  return serie.tecnica === "Cluster Set" || serie.tecnica_extra === "Cluster Set";
}

/** Formata a lista de blocos do cluster pra exibição/retrocompat: [6,4,2] → "6×4×2" */
export function formatClusterReps(blocos: number[]): string {
  return blocos.map((n) => n || 0).join("×");
}

/**
 * A série usa Isometria (em qualquer um dos dois campos de técnica)?
 * Efeito: só a linha daquela série vira campo de Tempo em vez de Reps — não afeta as outras séries do exercício.
 */
export function isIsometria(serie: { tecnica?: string | null; tecnica_extra?: string | null }): boolean {
  return serie.tecnica === "Isometria" || serie.tecnica_extra === "Isometria";
}

/** A série usa Myo Reps (em qualquer um dos dois campos de técnica)? */
export function isMyoReps(serie: { tecnica?: string | null; tecnica_extra?: string | null }): boolean {
  return serie.tecnica === "Myo Reps" || serie.tecnica_extra === "Myo Reps";
}

/** Formata ativação + mini-séries pra exibição/retrocompat: 15, [5,5,4] → "15→5×5×4" */
export function formatMyoReps(ativacao: number, miniSeries: number[]): string {
  return `${ativacao || 0}→${miniSeries.map((n) => n || 0).join("×")}`;
}

/** Quantos "blocos" de reps uma série precisa mostrar lado a lado (Cluster Set
 *  e Myo Reps têm largura variável; o resto é sempre 1 campo único) — usado
 *  pra larguear a coluna de reps o bastante pra caber em todas as linhas. */
export function contarBlocosReps(serie: {
  tecnica?: string | null;
  tecnica_extra?: string | null;
  cluster_reps_list?: number[] | null;
  cluster_qtd?: number | null;
  myo_reps_list?: number[] | null;
}): number {
  if (isClusterSet(serie)) {
    return serie.cluster_reps_list?.length ?? Math.max(2, serie.cluster_qtd ?? 2);
  }
  if (isMyoReps(serie)) {
    // +1 pro bloco de ativação, que sempre aparece junto dos mini-blocos.
    return 1 + (serie.myo_reps_list?.length ?? 4);
  }
  return 1;
}
