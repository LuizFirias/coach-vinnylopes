'use client';

import { useEffect, useMemo, useRef } from 'react';
import { BodyChart, INTENSITY_COLORS, ViewSide } from 'body-muscles';

interface ExerciseWithMuscles {
  nome: string;
  grupo_muscular?: string;
  series: Array<{ completado: boolean }>;
}

interface MuscleChartProps {
  exercicios: ExerciseWithMuscles[];
  dualView?: boolean;
  forExport?: boolean; // desabilita transições e filtros para html2canvas capturar corretamente
}

type Category =
  | 'chest'
  | 'back'
  | 'shoulders'
  | 'biceps'
  | 'triceps'
  | 'forearms'
  | 'quads'
  | 'hamstrings'
  | 'calves'
  | 'glutes'
  | 'abs'
  | 'obliques';

const CATEGORY_TO_IDS: Record<Category, string[]> = {
  chest: ['chest-upper-left', 'chest-upper-right', 'chest-lower-left', 'chest-lower-right'],
  back: [
    'traps-upper-left', 'traps-mid-left', 'traps-lower-left',
    'traps-upper-right', 'traps-mid-right', 'traps-lower-right',
    'lats-upper-left', 'lats-mid-left', 'lats-lower-left',
    'lats-upper-right', 'lats-mid-right', 'lats-lower-right',
    'lower-back-erectors-left', 'lower-back-ql-left',
    'lower-back-erectors-right', 'lower-back-ql-right', 'spine',
  ],
  shoulders: [
    'shoulder-front-left', 'shoulder-side-left', 'deltoid-rear-left',
    'shoulder-front-right', 'shoulder-side-right', 'deltoid-rear-right',
  ],
  biceps: ['biceps-left', 'biceps-right'],
  triceps: ['triceps-long-left', 'triceps-lateral-left', 'triceps-long-right', 'triceps-lateral-right'],
  forearms: ['forearm-left', 'forearm-right', 'forearm-flexors-left', 'forearm-extensors-left', 'forearm-flexors-right', 'forearm-extensors-right'],
  quads: ['quads-left', 'quads-right', 'adductors-left', 'adductors-right'],
  hamstrings: ['hamstrings-medial-left', 'hamstrings-lateral-left', 'hamstrings-medial-right', 'hamstrings-lateral-right'],
  calves: [
    'calves-gastroc-medial-left', 'calves-gastroc-lateral-left', 'calves-soleus-left',
    'calves-gastroc-medial-right', 'calves-gastroc-lateral-right', 'calves-soleus-right',
    'tibialis-anterior-left', 'tibialis-anterior-right',
  ],
  glutes: ['gluteus-medius-left', 'gluteus-maximus-left', 'gluteus-medius-right', 'gluteus-maximus-right'],
  abs: ['abs-upper-left', 'abs-lower-left', 'abs-upper-right', 'abs-lower-right'],
  obliques: ['obliques-left', 'obliques-right'],
};

// Configura cores de intensidade customizadas
Object.assign(INTENSITY_COLORS, {
  0: 'rgba(148, 163, 184, 0.35)',
  1: 'rgba(253, 224, 71, 0.45)',
  2: 'rgba(250, 204, 21, 0.5)',
  3: 'rgba(234, 179, 8, 0.58)',
  4: 'rgba(251, 146, 60, 0.56)',
  5: 'rgba(249, 115, 22, 0.62)',
  6: 'rgba(234, 88, 12, 0.7)',
  7: 'rgba(239, 68, 68, 0.68)',
  8: 'rgba(220, 38, 38, 0.76)',
  9: 'rgba(185, 28, 28, 0.84)',
  10: 'rgba(127, 29, 29, 0.9)',
});

function buildBodyState(exercicios: ExerciseWithMuscles[]) {
  const categoryVolume: Partial<Record<Category, number>> = {};

  const normalize = (str: string) => {
    return str
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim();
  };

  const NORM_LABEL_TO_CATEGORY: Record<string, Category | null> = {
    'peito superior': 'chest',
    'peito medio': 'chest',
    'peito inferior': 'chest',
    'peito': 'chest',
    'dorsais': 'back',
    'costas': 'back',
    'trapezio': 'back',
    'lombar': 'back',
    'ombro anterior': 'shoulders',
    'ombro lateral': 'shoulders',
    'ombro posterior': 'shoulders',
    'ombros': 'shoulders',
    'biceps': 'biceps',
    'triceps': 'triceps',
    'antebraco': 'forearms',
    'quadriceps': 'quads',
    'coxa': 'quads',
    'posterior (isquiotibiais)': 'hamstrings',
    'posterior': 'hamstrings',
    'panturrilha': 'calves',
    'gluteos': 'glutes',
    'abdomen': 'abs',
    'obliquos': 'obliques',
    'cardio': null,
  };

  for (const exercicio of exercicios) {
    const rawGroup = exercicio.grupo_muscular || '';
    const normGroup = normalize(rawGroup);
    
    // Tentar achar correspondência exata ou parcial para robustez contra banco de dados
    let category: Category | null = null;
    if (normGroup) {
      if (normGroup in NORM_LABEL_TO_CATEGORY) {
        category = NORM_LABEL_TO_CATEGORY[normGroup];
      } else {
        // Busca parcial para strings complexas
        const foundKey = Object.keys(NORM_LABEL_TO_CATEGORY).find(key => 
          normGroup.includes(key) || key.includes(normGroup)
        );
        if (foundKey) {
          category = NORM_LABEL_TO_CATEGORY[foundKey];
        }
      }
    }

    if (!category) continue;

    const completedSets = exercicio.series ? exercicio.series.filter((s) => s.completado).length : 0;
    const totalSets = exercicio.series ? exercicio.series.length : 0;
    const contribution = completedSets > 0 ? completedSets : totalSets;

    if (contribution <= 0) continue;
    categoryVolume[category] = (categoryVolume[category] || 0) + contribution;
  }

  const maxVolume = Math.max(...Object.values(categoryVolume), 1);
  const bodyState: Record<string, { intensity: number; selected: boolean }> = {};

  const toIntensity = (count: number) => {
    const ratio = count / maxVolume;
    if (ratio >= 0.75) return 8;
    if (ratio >= 0.4) return 5;
    return 3;
  };

  for (const [category, ids] of Object.entries(CATEGORY_TO_IDS) as Array<[Category, string[]]>) {
    const intensity = categoryVolume[category] ? toIntensity(categoryVolume[category] as number) : 0;
    for (const id of ids) {
      bodyState[id] = { intensity, selected: false };
    }
  }

  return bodyState;
}

export default function MuscleChart({ exercicios, dualView = false, forExport = false }: MuscleChartProps) {
  const frontContainerRef = useRef<HTMLDivElement>(null);
  const backContainerRef = useRef<HTMLDivElement>(null);
  const frontChartRef = useRef<BodyChart | null>(null);
  const backChartRef = useRef<BodyChart | null>(null);
  const bodyState = useMemo(() => buildBodyState(exercicios), [exercicios]);

  useEffect(() => {
    if (!frontContainerRef.current) return;

    try {
      frontChartRef.current = new BodyChart(frontContainerRef.current, {
        view: ViewSide.FRONT,
        bodyState,
        className: 'muscle-chart-container muscle-chart-front',
        showViewLabel: false,
        enableTransitions: !forExport,
      });

      if (dualView && backContainerRef.current) {
        backChartRef.current = new BodyChart(backContainerRef.current, {
          view: ViewSide.BACK,
          bodyState,
          className: 'muscle-chart-container muscle-chart-back',
          showViewLabel: false,
          enableTransitions: !forExport,
        });
      }

      // IMPORTANTE: html2canvas renderiza filtros de sombra (drop-shadow) do SVG como retângulos
      // brancos e opacos. Removemos os filtros e transições do SVG se for exportar para PNG.
      if (forExport) {
        const containers = [frontContainerRef.current, backContainerRef.current].filter(Boolean);
        setTimeout(() => {
          containers.forEach(container => {
            const svg = container!.querySelector('svg');
            if (svg) {
              svg.style.filter = 'none';
              svg.style.transition = 'none';
              
              // Remove sombras internas do wrapper
              const wrapper = container!.querySelector('.body-chart-container');
              if (wrapper) {
                (wrapper as HTMLElement).style.boxShadow = 'none';
                (wrapper as HTMLElement).style.background = 'transparent';
                (wrapper as HTMLElement).style.backgroundColor = 'transparent';
              }
            }
          });
        }, 50);
      }
    } catch (error) {
      console.error('Erro ao criar BodyChart:', error);
    }

    return () => {
      if (frontChartRef.current) {
        frontChartRef.current.destroy();
        frontChartRef.current = null;
      }
      if (backChartRef.current) {
        backChartRef.current.destroy();
        backChartRef.current = null;
      }
    };
  }, [bodyState, dualView, forExport]);

  if (!dualView) {
    return (
      <div
        ref={frontContainerRef}
        style={{
          width: '132px',
          height: '100%',
          margin: '0 auto',
          display: 'block',
          backgroundColor: 'transparent',
        }}
      />
    );
  }

  // Substituímos o CSS Grid por display: inline-block para compatibilidade perfeita no html2canvas
  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        textAlign: 'center',
        backgroundColor: 'transparent',
      }}
    >
      <div
        ref={frontContainerRef}
        style={{
          width: '132px',
          height: '100%',
          display: 'inline-block',
          verticalAlign: 'top',
          marginRight: '20px',
          backgroundColor: 'transparent',
        }}
      />
      <div
        ref={backContainerRef}
        style={{
          width: '132px',
          height: '100%',
          display: 'inline-block',
          verticalAlign: 'top',
          marginLeft: '20px',
          backgroundColor: 'transparent',
        }}
      />
    </div>
  );
}
