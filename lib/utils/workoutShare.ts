import { canonicalizeMuscleGroup } from "@/lib/constants/muscle-groups";

/** Tokens e helpers para cards Instagram de treino concluído */
export const SHARE_CARD = {
  width: 1080,
  height: 1080,
  radius: 24,
} as const;

export type ShareTheme = 'escuro' | 'claro' | 'transparente';

export interface ShareThemeTokens {
  bg: string;
  text: string;
  textSecondary: string;
  textTertiary: string;
  textExercise: string;
  accent: string;
  success: string;
  divider: string;
  muscleInactive: string;
  muscleStroke: string;
  /** null = PNG transparente na exportação */
  exportBackground: string | null;
}

export const SHARE_THEME_TOKENS: Record<ShareTheme, ShareThemeTokens> = {
  escuro: {
    bg: '#0a0f1e',
    text: '#ffffff',
    textSecondary: '#7a8aab',
    textTertiary: '#52525B',
    textExercise: '#d4dce8',
    accent: '#D4A843',
    success: '#39c75a',
    divider: '#1a1a2e',
    muscleInactive: '#1a2540',
    muscleStroke: '#2a3a60',
    exportBackground: '#0a0f1e',
  },
  claro: {
    bg: '#ffffff',
    text: '#0f172a',
    textSecondary: '#64748b',
    textTertiary: '#A1A1AA',
    textExercise: '#334155',
    accent: '#D4A843',
    success: '#39c75a',
    divider: '#e5e7eb',
    muscleInactive: '#e2e8f0',
    muscleStroke: '#cbd5e1',
    exportBackground: '#ffffff',
  },
  transparente: {
    bg: 'transparent',
    text: '#ffffff',
    textSecondary: '#d4dce8',
    textTertiary: '#9aa3b5',
    textExercise: '#f0f4fa',
    accent: '#D4A843',
    success: '#39c75a',
    divider: 'rgba(255,255,255,0.18)',
    muscleInactive: '#2a3348',
    muscleStroke: '#3d4a66',
    exportBackground: null,
  },
};

export const SHARE_THEME_LABELS: Record<ShareTheme, string> = {
  escuro: 'Escuro',
  claro: 'Claro',
  transparente: 'Transparente',
};

export function getShareThemeTokens(theme: ShareTheme): ShareThemeTokens {
  return SHARE_THEME_TOKENS[theme];
}

export const MUSCLE_HIGHLIGHTER_MAP: Record<string, string[]> = {
  chest: ['Peito Superior', 'Peito Médio', 'Peito Inferior'],
  'upper-back': ['Dorsais'],
  trapezius: ['Trapézio'],
  'lower-back': ['Lombar'],
  deltoids: ['Ombro Anterior', 'Ombro Lateral', 'Ombro Posterior'],
  biceps: ['Bíceps'],
  triceps: ['Tríceps'],
  forearm: ['Antebraço'],
  quadriceps: ['Quadríceps'],
  hamstring: ['Posterior (Isquiotibiais)'],
  calves: ['Panturrilha'],
  gluteal: ['Glúteos'],
  abs: ['Abdômen'],
  obliques: ['Oblíquos'],
};

export interface ShareExerciseInput {
  nome: string;
  grupo_muscular?: string;
  series: Array<{ completado: boolean; peso_atual?: number }>;
}

/** Formato mínimo de uma linha crua de `historico_treinos` (uma por exercício). */
export interface HistoricoTreinoRowLike {
  exercicio_id: string | null;
  dados_sessao: Record<string, unknown> | null;
}

/**
 * Reconstrói o `ShareExerciseInput[]` de uma sessão passada a partir das linhas cruas
 * de `historico_treinos` — mesmo shape que `flattenExercicios(blocks)` produz ao vivo
 * na tela de execução, usado pra reabrir os cards de compartilhamento de um treino antigo.
 */
export function buildShareExerciseInputs(
  rows: HistoricoTreinoRowLike[],
  gruposPorExercicio: Map<string, string>,
): ShareExerciseInput[] {
  return rows.map((row) => {
    const ds = (row.dados_sessao ?? {}) as Record<string, unknown>;
    const series = Array.isArray(ds.series) ? (ds.series as Array<Record<string, unknown>>) : [];
    return {
      nome: (ds.nome_exercicio as string | undefined) || 'Exercício',
      grupo_muscular: row.exercicio_id ? gruposPorExercicio.get(row.exercicio_id) : undefined,
      series: series.map((s) => ({
        completado: !!s.completado,
        peso_atual:
          typeof s.peso_atual === 'number' ? s.peso_atual : Number(s.peso_atual) || undefined,
      })),
    };
  });
}

/** Volume sempre em kg com separador pt-BR — nunca em ton */
export function formatShareVolume(kg: number): string {
  const rounded = Math.round(kg);
  if (rounded >= 1000) {
    return `${rounded.toLocaleString('pt-BR')} kg`;
  }
  return `${rounded} kg`;
}

export function formatCoachHandle(handle: string): string {
  const clean = handle.replace('@', '').trim();
  return clean ? `@${clean}` : '@coach-vinny';
}

/**
 * @ do Instagram do coach nos cards de compartilhamento.
 * Prioridade: handle do perfil → URL do Instagram → @coach-vinny.
 * Não usa nome de exibição — só @ ou fallback.
 */
export function resolveCoachShareHandle(
  handle?: string | null,
  instagramUrl?: string | null,
): string {
  const fromHandle = (handle || '').replace(/^@+/, '').trim();
  if (fromHandle && !fromHandle.includes('/') && !fromHandle.includes('http')) {
    return `@${fromHandle}`;
  }

  const insta = (instagramUrl || '').trim();
  if (insta) {
    const fromUrl = insta.match(/instagram\.com\/([a-zA-Z0-9._]+)/i)?.[1];
    const user = (fromUrl || insta.replace(/^@+/, '')).replace(/\/+$/, '').trim();
    if (user && !user.includes('/') && !user.includes('http')) {
      return `@${user}`;
    }
  }

  return '@coach-vinny';
}

export function toShareTitleCase(str: string): string {
  return str.replace(/\w\S*/g, (txt) =>
    txt.charAt(0).toUpperCase() + txt.slice(1).toLowerCase(),
  );
}

export function buildMuscleHighlightData(
  exercicios: ShareExerciseInput[],
  activeColor = SHARE_THEME_TOKENS.escuro.accent,
): Array<{ slug: string; color: string }> {
  const muscleCount: Record<string, number> = {};

  for (const ex of exercicios) {
    if (!ex.grupo_muscular) continue;
    const feitas = ex.series.filter((s) => s.completado).length || ex.series.length;
    if (feitas === 0) continue;
    const grupo = canonicalizeMuscleGroup(ex.grupo_muscular.trim());
    muscleCount[grupo] = (muscleCount[grupo] || 0) + feitas;
  }

  const max = Math.max(...Object.values(muscleCount), 1);
  const list: Array<{ slug: string; color: string }> = [];

  Object.entries(MUSCLE_HIGHLIGHTER_MAP).forEach(([slug, groups]) => {
    const intensidade = Math.max(0, ...groups.map((g) => muscleCount[g] || 0));
    if (intensidade > 0) {
      const opacity = 0.45 + (intensidade / max) * 0.55;
      const r = parseInt(activeColor.slice(1, 3), 16);
      const g = parseInt(activeColor.slice(3, 5), 16);
      const b = parseInt(activeColor.slice(5, 7), 16);
      list.push({
        slug,
        color: `rgba(${r}, ${g}, ${b}, ${opacity.toFixed(2)})`,
      });
    }
  });

  return list;
}

export function getShareExportOptions(theme: ShareTheme) {
  const tokens = getShareThemeTokens(theme);
  const base = {
    pixelRatio: 1,
    cacheBust: true,
    width: SHARE_CARD.width,
    height: SHARE_CARD.height,
  };
  // Sem backgroundColor = PNG transparente (html-to-image)
  if (tokens.exportBackground === null) return base;
  return { ...base, backgroundColor: tokens.exportBackground };
}

/** Padrão quadriculado estilo PNG (preview do tema transparente). */
export const SHARE_TRANSPARENT_CHECKER: {
  backgroundColor: string;
  backgroundImage: string;
  backgroundSize: string;
  backgroundPosition: string;
} = {
  backgroundColor: '#e8e8e8',
  backgroundImage: [
    'linear-gradient(45deg, #cfcfcf 25%, transparent 25%)',
    'linear-gradient(-45deg, #cfcfcf 25%, transparent 25%)',
    'linear-gradient(45deg, transparent 75%, #cfcfcf 75%)',
    'linear-gradient(-45deg, transparent 75%, #cfcfcf 75%)',
  ].join(', '),
  backgroundSize: '20px 20px',
  backgroundPosition: '0 0, 0 10px, 10px -10px, -10px 0',
};

