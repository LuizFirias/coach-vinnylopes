import type {
  BiSetGroupPrescricao,
  BiSetHalfPrescricao,
  ExercicioPrescricao,
  ExercicioSimplesPrescricao,
  SeriePrescricao,
} from "@/lib/types/workout";
import { isBiSetPrescricao as isBiSetPrescricaoType } from "@/lib/types/workout";
import type { ExercicioFicha, SerieDefinicao } from "@/app/components/workout-builder/types";
import { descansoToSeconds, secondsToDescanso } from "@/lib/utils/restTime";

export type BiSetHalfFicha = {
  exercicio_id: string;
  nome: string;
  tipo_exercicio: string;
  video_url: string;
  observacoes: string;
  series: SerieDefinicao[];
};

export type BiSetGroupFicha = {
  id: string;
  tipo: "biset";
  descanso: string;
  exercicioA: BiSetHalfFicha;
  exercicioB: BiSetHalfFicha | null;
};

export type ExercicioFichaItem =
  | (ExercicioFicha & { tipo?: "simples" })
  | BiSetGroupFicha;

export function isBiSetFichaItem(item: ExercicioFichaItem): item is BiSetGroupFicha {
  return (item as BiSetGroupFicha).tipo === "biset";
}

export function isBiSetComplete(group: BiSetGroupFicha): group is BiSetGroupFicha & { exercicioB: BiSetHalfFicha } {
  return group.exercicioB !== null;
}

export function validateBiSetGroup(group: BiSetGroupFicha): string | null {
  if (!group.exercicioB) return "Selecione o exercício B do Bi-Set";
  if (group.exercicioA.series.length !== group.exercicioB.series.length) {
    return "Bi-Set exige o mesmo número de séries em A e B";
  }
  if (group.exercicioA.series.length === 0) return "Adicione pelo menos uma série ao Bi-Set";
  return null;
}

export function simpleToBiSetGroup(ex: ExercicioFicha): BiSetGroupFicha {
  return {
    id: crypto.randomUUID(),
    tipo: "biset",
    descanso: ex.descanso,
    exercicioA: {
      exercicio_id: ex.id,
      nome: ex.nome,
      tipo_exercicio: ex.tipo_exercicio,
      video_url: ex.video_url,
      observacoes: ex.observacoes,
      series: ex.series.map((s) => ({
        ...s,
        tecnica_extra: s.tecnica_extra === "Bi-Set" ? "" : s.tecnica_extra,
      })),
    },
    exercicioB: null,
  };
}

export function bisetGroupToSimples(group: BiSetGroupFicha): ExercicioFicha[] {
  const a: ExercicioFicha = {
    instanceId: crypto.randomUUID(),
    id: group.exercicioA.exercicio_id,
    nome: group.exercicioA.nome,
    tipo_exercicio: group.exercicioA.tipo_exercicio,
    descanso: group.descanso,
    video_url: group.exercicioA.video_url,
    observacoes: group.exercicioA.observacoes,
    series: group.exercicioA.series.map((s) => ({ ...s })),
  };
  if (!group.exercicioB) return [a];
  const b: ExercicioFicha = {
    instanceId: crypto.randomUUID(),
    id: group.exercicioB.exercicio_id,
    nome: group.exercicioB.nome,
    tipo_exercicio: group.exercicioB.tipo_exercicio,
    descanso: group.descanso,
    video_url: group.exercicioB.video_url,
    observacoes: group.exercicioB.observacoes,
    series: group.exercicioB.series.map((s) => ({ ...s })),
  };
  return [a, b];
}

export function halfFromCatalog(ex: {
  id: string;
  nome: string;
  tipo_exercicio?: string;
  video_url?: string;
}, series: SerieDefinicao[]): BiSetHalfFicha {
  return {
    exercicio_id: ex.id,
    nome: ex.nome,
    tipo_exercicio: ex.tipo_exercicio || "Peso & Repetições",
    video_url: ex.video_url || "",
    observacoes: "",
    series: series.map((s) => ({ ...s })),
  };
}

function mapSerieToDb(s: SerieDefinicao) {
  return {
    ordem: s.ordem,
    peso: s.peso_sugerido ?? null,
    peso_sugerido: s.peso_sugerido ?? null,
    reps: s.reps_sugerido ?? null,
    reps_sugerido: s.reps_sugerido ?? null,
    tempo: s.tempo_sugerido ?? null,
    tempo_sugerido: s.tempo_sugerido ?? null,
    distancia: s.distancia_sugerida ?? null,
    distancia_sugerida: s.distancia_sugerida ?? null,
    tecnica: s.tecnica || null,
    tecnica_extra: s.tecnica_extra || null,
  };
}

function mapHalfToDb(half: BiSetHalfFicha) {
  return {
    exercicio_id: half.exercicio_id,
    nome: half.nome,
    tipo_exercicio: half.tipo_exercicio,
    video_url: half.video_url,
    observacoes: half.observacoes,
    series: half.series.map(mapSerieToDb),
  };
}

export function serializeFichaItems(items: ExercicioFichaItem[]): ExercicioPrescricao[] {
  const result: ExercicioPrescricao[] = [];
  for (const item of items) {
    if (isBiSetFichaItem(item)) {
      if (!isBiSetComplete(item)) continue;
      const secs = descansoToSeconds(item.descanso);
      result.push({
        id: item.id,
        tipo: "biset",
        descanso: item.descanso,
        descanso_segundos: secs,
        exercicioA: mapHalfToDb(item.exercicioA),
        exercicioB: mapHalfToDb(item.exercicioB),
      });
    } else {
      result.push({
        id: item.id,
        tipo: "simples",
        nome: item.nome,
        tipo_exercicio: item.tipo_exercicio,
        descanso: item.descanso,
        descanso_segundos: descansoToSeconds(item.descanso),
        video_url: item.video_url,
        observacoes: item.observacoes,
        series: item.series.map(mapSerieToDb),
      });
    }
  }
  return result;
}

function serieFromRaw(s: SeriePrescricao, idx: number): SerieDefinicao {
  return {
    ordem: s.ordem ?? idx + 1,
    reps_sugerido: s.reps_sugerido ?? s.reps ?? "12",
    tempo_sugerido: s.tempo_sugerido ?? s.tempo ?? undefined,
    distancia_sugerida: s.distancia_sugerida ?? s.distancia ?? undefined,
    peso_sugerido: s.peso_sugerido ?? s.peso ?? null,
    tecnica: s.tecnica || "",
    tecnica_extra: s.tecnica_extra || s.tecnica2 || "",
  };
}

function halfFromRaw(half: BiSetHalfPrescricao): BiSetHalfFicha {
  return {
    exercicio_id: half.exercicio_id,
    nome: half.nome,
    tipo_exercicio: half.tipo_exercicio || "Peso & Repetições",
    video_url: half.video_url || "",
    observacoes: half.observacoes || "",
    series: (half.series || []).map(serieFromRaw),
  };
}

function simpleFromRaw(ex: ExercicioSimplesPrescricao): ExercicioFicha {
  const descanso = ex.descanso || (ex.descanso_segundos != null ? secondsToDescanso(ex.descanso_segundos) : "01:00");
  return {
    instanceId: crypto.randomUUID(),
    id: ex.id,
    nome: ex.nome,
    tipo_exercicio: ex.tipo_exercicio || "Peso & Repetições",
    descanso,
    video_url: ex.video_url || "",
    observacoes: ex.observacoes || "",
    series: (ex.series || []).map(serieFromRaw),
    biset_parceiro_id: ex.biset_parceiro_id,
  };
}

function bisetFromRaw(ex: BiSetGroupPrescricao): BiSetGroupFicha {
  const descanso = ex.descanso || (ex.descanso_segundos != null ? secondsToDescanso(ex.descanso_segundos) : "01:30");
  return {
    id: ex.id,
    tipo: "biset",
    descanso,
    exercicioA: halfFromRaw(ex.exercicioA),
    exercicioB: halfFromRaw(ex.exercicioB),
  };
}

/** Converte lista legada (biset_parceiro_id) em pares Bi-Set */
function migrateLegacyFlatList(raw: ExercicioSimplesPrescricao[]): ExercicioFichaItem[] {
  const consumed = new Set<string>();
  const result: ExercicioFichaItem[] = [];

  for (const ex of raw) {
    if (consumed.has(ex.id)) continue;

    if (ex.biset_parceiro_id) {
      const partner = raw.find((e) => e.id === ex.biset_parceiro_id);
      if (partner && !consumed.has(partner.id)) {
        consumed.add(partner.id);
        const descanso = ex.descanso || partner.descanso || "01:30";
        const aSimple = simpleFromRaw(ex);
        const bSimple = simpleFromRaw(partner);
        const len = Math.max(aSimple.series.length, bSimple.series.length);
        while (aSimple.series.length < len) {
          const m = aSimple.series[aSimple.series.length - 1];
          aSimple.series.push({ ...m, ordem: aSimple.series.length + 1 });
        }
        while (bSimple.series.length < len) {
          const m = bSimple.series[bSimple.series.length - 1];
          bSimple.series.push({ ...m, ordem: bSimple.series.length + 1 });
        }
        result.push({
          id: crypto.randomUUID(),
          tipo: "biset",
          descanso,
          exercicioA: {
            exercicio_id: aSimple.id,
            nome: aSimple.nome,
            tipo_exercicio: aSimple.tipo_exercicio,
            video_url: aSimple.video_url,
            observacoes: aSimple.observacoes,
            series: aSimple.series,
          },
          exercicioB: {
            exercicio_id: bSimple.id,
            nome: bSimple.nome,
            tipo_exercicio: bSimple.tipo_exercicio,
            video_url: bSimple.video_url,
            observacoes: bSimple.observacoes,
            series: bSimple.series,
          },
        });
        continue;
      }
    }

    result.push(simpleFromRaw(ex));
  }

  return result;
}

export function parseFichaItems(raw: unknown[]): ExercicioFichaItem[] {
  if (!Array.isArray(raw) || raw.length === 0) return [];

  const hasNewFormat = raw.some((item) => (item as ExercicioPrescricao).tipo === "biset");
  if (hasNewFormat) {
    return raw.map((item) => {
      const ex = item as ExercicioPrescricao;
      if (ex.tipo === "biset") return bisetFromRaw(ex as BiSetGroupPrescricao);
      return simpleFromRaw(ex as ExercicioSimplesPrescricao);
    });
  }

  return migrateLegacyFlatList(raw as ExercicioSimplesPrescricao[]);
}

/** Bloco de execução do aluno */
export interface ExercicioExecucao {
  id: string;
  nome: string;
  descanso: number;
  video_url?: string;
  gif_url?: string;
  observacoes?: string;
  grupo_muscular?: string;
  equipamento?: string;
  /** "Repetições", "Duração", "Peso & Repetições" etc — define se o campo peso aparece */
  tipo_exercicio?: string;
  series: Array<{
    ordem: number;
    peso_atual: number;
    reps: number | string;
    reps_executadas?: number | string;
    tecnica?: string;
    tecnica_extra?: string;
    completado: boolean;
    anterior?: string;
  }>;
}

export type WorkoutBlock =
  | { kind: "simples"; exercise: ExercicioExecucao }
  | {
      kind: "biset";
      id: string;
      descanso: number;
      exercicioA: ExercicioExecucao;
      exercicioB: ExercicioExecucao;
    };

export function flattenExercicios(blocks: WorkoutBlock[]): ExercicioExecucao[] {
  return blocks.flatMap((b) =>
    b.kind === "simples" ? [b.exercise] : [b.exercicioA, b.exercicioB]
  );
}

export function countWorkoutBlocks(blocks: WorkoutBlock[]): number {
  return blocks.length;
}

export function buildRodadaHistory(block: Extract<WorkoutBlock, { kind: "biset" }>, rodadaIdx: number) {
  const aSerie = block.exercicioA.series[rodadaIdx];
  const bSerie = block.exercicioB.series[rodadaIdx];
  if (!aSerie || !bSerie) return null;
  return { rodada: rodadaIdx + 1, aSerie, bSerie, aNome: block.exercicioA.nome, bNome: block.exercicioB.nome };
}

type PrevSerieSessao = {
  ordem?: number;
  peso_atual?: number;
  reps?: number | string;
  reps_executadas?: number | string;
  completado?: boolean;
};

type BibMeta = {
  gruposMusculares: Record<string, string>;
  gifs: Record<string, string>;
  videos: Record<string, string>;
  equipamentos: Record<string, string>;
  ultimoPorExercicio: Record<string, { dados_sessao?: { series?: PrevSerieSessao[] } }>;
};

/** Última série válida da sessão anterior (completada com carga), por ordem. */
function findPrevSerie(
  prevSeries: PrevSerieSessao[],
  ordem: number,
  idx: number
): PrevSerieSessao | undefined {
  const byOrdem = prevSeries.find(
    (p) =>
      (p.ordem ?? 0) === ordem &&
      p.completado === true &&
      (p.peso_atual ?? 0) > 0
  );
  if (byOrdem) return byOrdem;

  // Fallback por índice (sessões antigas sem ordem / séries reordenadas)
  const byIdx = prevSeries[idx];
  if (byIdx && byIdx.completado === true && (byIdx.peso_atual ?? 0) > 0) {
    return byIdx;
  }
  return undefined;
}

function buildSerieExecucao(
  s: SeriePrescricao,
  idx: number,
  prevSeries: PrevSerieSessao[]
) {
  const ordem = s.ordem ?? idx + 1;
  const prev = findPrevSerie(prevSeries, ordem, idx);
  const prevReps = prev?.reps_executadas ?? prev?.reps ?? 0;
  const anterior = prev ? `${prev.peso_atual}kg × ${prevReps}` : "—";
  return {
    ordem,
    peso_atual: prev?.peso_atual ?? 0,
    reps: s.reps_sugerido ?? s.reps ?? "12",
    tecnica: s.tecnica ?? undefined,
    tecnica_extra: s.tecnica_extra ?? undefined,
    completado: false,
    anterior,
  };
}

function buildHalfExecucao(
  half: BiSetHalfPrescricao,
  meta: BibMeta
): ExercicioExecucao {
  const eid = half.exercicio_id;
  const ultimo = meta.ultimoPorExercicio[eid];
  const prevSeries = (ultimo?.dados_sessao?.series || []) as PrevSerieSessao[];
  return {
    id: eid,
    nome: half.nome,
    descanso: 0,
    video_url: meta.videos[eid] || half.video_url || undefined,
    gif_url: meta.gifs[eid] || "",
    observacoes: half.observacoes,
    grupo_muscular: meta.gruposMusculares[eid] || "",
    equipamento: meta.equipamentos[eid] || "",
    tipo_exercicio: half.tipo_exercicio,
    series: (half.series || []).map((s, idx) => buildSerieExecucao(s, idx, prevSeries)),
  };
}

function buildSimpleExecucao(ex: ExercicioSimplesPrescricao, meta: BibMeta): ExercicioExecucao {
  const eid = ex.id;
  const ultimo = meta.ultimoPorExercicio[eid];
  const prevSeries = (ultimo?.dados_sessao?.series || []) as PrevSerieSessao[];
  const descanso = ex.descanso_segundos ?? descansoToSeconds(ex.descanso || "01:00");
  return {
    id: eid,
    nome: ex.nome,
    descanso,
    video_url: meta.videos[eid] || ex.video_url || undefined,
    gif_url: meta.gifs[eid] || "",
    observacoes: ex.observacoes,
    grupo_muscular: meta.gruposMusculares[eid] || "",
    equipamento: meta.equipamentos[eid] || "",
    tipo_exercicio: ex.tipo_exercicio,
    series: (ex.series || []).map((s, idx) => buildSerieExecucao(s, idx, prevSeries)),
  };
}

/** Monta blocos de execução a partir do JSONB da ficha (inclui migração legado). */
export function buildWorkoutBlocksFromConfig(raw: unknown[], meta: BibMeta): WorkoutBlock[] {
  if (!Array.isArray(raw) || raw.length === 0) return [];

  const hasNewFormat = raw.some((item) => (item as ExercicioPrescricao).tipo === "biset");
  const blocks: WorkoutBlock[] = [];

  if (hasNewFormat) {
    for (const item of raw as ExercicioPrescricao[]) {
      if (isBiSetPrescricaoType(item)) {
        const descanso = item.descanso_segundos ?? descansoToSeconds(item.descanso || "01:30");
        blocks.push({
          kind: "biset",
          id: item.id,
          descanso,
          exercicioA: buildHalfExecucao(item.exercicioA, meta),
          exercicioB: buildHalfExecucao(item.exercicioB, meta),
        });
      } else {
        blocks.push({ kind: "simples", exercise: buildSimpleExecucao(item, meta) });
      }
    }
    return blocks;
  }

  const consumed = new Set<string>();
  for (const ex of raw as ExercicioSimplesPrescricao[]) {
    if (consumed.has(ex.id)) continue;

    if (ex.biset_parceiro_id) {
      const partner = (raw as ExercicioSimplesPrescricao[]).find((e) => e.id === ex.biset_parceiro_id);
      if (partner && !consumed.has(partner.id)) {
        consumed.add(partner.id);
        const descanso = descansoToSeconds(ex.descanso || partner.descanso || "01:30");
        const aHalf: BiSetHalfPrescricao = {
          exercicio_id: ex.id,
          nome: ex.nome,
          video_url: ex.video_url,
          observacoes: ex.observacoes,
          series: ex.series || [],
        };
        const bHalf: BiSetHalfPrescricao = {
          exercicio_id: partner.id,
          nome: partner.nome,
          video_url: partner.video_url,
          observacoes: partner.observacoes,
          series: partner.series || [],
        };
        blocks.push({
          kind: "biset",
          id: crypto.randomUUID(),
          descanso,
          exercicioA: buildHalfExecucao(aHalf, meta),
          exercicioB: buildHalfExecucao(bHalf, meta),
        });
        continue;
      }
    }

    blocks.push({ kind: "simples", exercise: buildSimpleExecucao(ex, meta) });
  }

  return blocks;
}

export function collectBibliotecaIds(raw: unknown[]): string[] {
  const ids = new Set<string>();
  if (!Array.isArray(raw)) return [];
  for (const item of raw) {
    const ex = item as ExercicioPrescricao;
    if (ex.tipo === "biset") {
      const g = ex as BiSetGroupPrescricao;
      ids.add(g.exercicioA.exercicio_id);
      ids.add(g.exercicioB.exercicio_id);
    } else {
      ids.add((ex as ExercicioSimplesPrescricao).id);
      const leg = ex as ExercicioSimplesPrescricao;
      if (leg.biset_parceiro_id) ids.add(leg.biset_parceiro_id);
    }
  }
  return [...ids].filter(Boolean);
}

export function calcTotalSetsFromBlocks(blocks: WorkoutBlock[]): number {
  return blocks.reduce((acc, b) => {
    if (b.kind === "simples") return acc + b.exercise.series.length;
    return acc + b.exercicioA.series.length;
  }, 0);
}

export function calcSetsCompletosFromBlocks(blocks: WorkoutBlock[]): number {
  return blocks.reduce((acc, b) => {
    if (b.kind === "simples") {
      return acc + b.exercise.series.filter((s) => s.completado).length;
    }
    const rodadas = b.exercicioA.series.length;
    let count = 0;
    for (let i = 0; i < rodadas; i++) {
      if (b.exercicioA.series[i]?.completado && b.exercicioB.series[i]?.completado) count++;
    }
    return acc + count * 2;
  }, 0);
}

export function calcVolumeFromBlocks(blocks: WorkoutBlock[]): number {
  return flattenExercicios(blocks).reduce(
    (acc, ex) =>
      acc +
      ex.series.reduce((sAcc, s) => {
        if (!s.completado) return sAcc;
        const repsValor = s.reps_executadas ?? s.reps;
        const r = parseFloat(String(repsValor)) || 0;
        return sAcc + (s.peso_atual || 0) * r;
      }, 0),
    0
  );
}

export function isBlockComplete(block: WorkoutBlock): boolean {
  if (block.kind === "simples") return block.exercise.series.every((s) => s.completado);
  const n = block.exercicioA.series.length;
  for (let i = 0; i < n; i++) {
    if (!block.exercicioA.series[i]?.completado || !block.exercicioB.series[i]?.completado) return false;
  }
  return true;
}

export function firstIncompleteRodada(block: Extract<WorkoutBlock, { kind: "biset" }>): number {
  for (let i = 0; i < block.exercicioA.series.length; i++) {
    if (!block.exercicioA.series[i]?.completado || !block.exercicioB.series[i]?.completado) return i;
  }
  return Math.max(0, block.exercicioA.series.length - 1);
}

/** Onde retomar o modal: 1ª incompleta, ou último exercício/série se tudo concluído na lista. */
export function resolveResumePosition(blocks: WorkoutBlock[]): {
  blockIdx: number;
  rodadaIdx: number;
  fase: "a" | "b" | null;
} {
  if (blocks.length === 0) {
    return { blockIdx: 0, rodadaIdx: 0, fase: null };
  }

  const incompleteIdx = blocks.findIndex((b) => !isBlockComplete(b));
  const allDone = incompleteIdx < 0;
  const blockIdx = allDone ? blocks.length - 1 : incompleteIdx;
  const block = blocks[blockIdx];

  if (block.kind === "simples") {
    if (allDone) {
      return {
        blockIdx,
        rodadaIdx: Math.max(0, block.exercise.series.length - 1),
        fase: null,
      };
    }
    const prox = block.exercise.series.findIndex((s) => !s.completado);
    return {
      blockIdx,
      rodadaIdx: prox >= 0 ? prox : Math.max(0, block.exercise.series.length - 1),
      fase: null,
    };
  }

  if (allDone) {
    return {
      blockIdx,
      rodadaIdx: Math.max(0, block.exercicioA.series.length - 1),
      fase: "b",
    };
  }

  const rodadaIdx = firstIncompleteRodada(block);
  const aDone = !!block.exercicioA.series[rodadaIdx]?.completado;
  return { blockIdx, rodadaIdx, fase: aDone ? "b" : "a" };
}
