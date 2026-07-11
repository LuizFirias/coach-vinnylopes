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
  textExercise: string;
  accent: string;
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
    textExercise: '#d4dce8',
    accent: '#2b7fff',
    divider: '#1a2540',
    muscleInactive: '#1a2540',
    muscleStroke: '#2a3a60',
    exportBackground: '#0a0f1e',
  },
  claro: {
    bg: '#ffffff',
    text: '#0f172a',
    textSecondary: '#64748b',
    textExercise: '#334155',
    accent: '#2563eb',
    divider: '#e2e8f0',
    muscleInactive: '#e2e8f0',
    muscleStroke: '#cbd5e1',
    exportBackground: '#ffffff',
  },
  transparente: {
    bg: 'transparent',
    text: '#ffffff',
    textSecondary: '#b8c4d9',
    textExercise: '#e8edf5',
    accent: '#4d9fff',
    divider: 'rgba(255,255,255,0.18)',
    muscleInactive: '#1a2540',
    muscleStroke: '#2a3a60',
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
  series: Array<{ completado: boolean }>;
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
  return clean ? `@${clean}` : '@auronfit';
}

/** @ do Instagram do coach, ou nome completo se não tiver usuário cadastrado. */
export function resolveCoachShareHandle(
  instagramOrReference?: string | null,
  fullName?: string | null,
): string {
  const insta = (instagramOrReference || '').replace('@', '').trim();
  if (insta) return `@${insta}`;
  const name = (fullName || '').trim();
  if (name) return name;
  return '@auronfit';
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
  return {
    pixelRatio: 1,
    cacheBust: true,
    width: SHARE_CARD.width,
    height: SHARE_CARD.height,
    ...(tokens.exportBackground === null
      ? { backgroundColor: undefined as undefined }
      : { backgroundColor: tokens.exportBackground }),
  };
}

