'use client';

import { useEffect, useRef } from 'react';
import { BodyChart, ViewSide } from 'body-muscles';

interface ExerciseWithMuscles {
  nome: string;
  grupo_muscular?: string;
  series: Array<{ completado: boolean }>;
}

interface MuscleChartProps {
  exercicios: ExerciseWithMuscles[];
}

// Mapeamento: Grupos Musculares (PT) → IDs da biblioteca body-muscles
const MUSCLE_MAP: Record<string, string[]> = {
  'Peito Superior': ['chest-upper'],
  'Peito Médio': ['chest-middle'],
  'Peito Inferior': ['chest-lower'],
  'Dorsais': ['lats-left', 'lats-right'],
  'Trapézio': ['trapezius'],
  'Lombar': ['lower-back'],
  'Ombro Anterior': ['shoulders-front'],
  'Ombro Lateral': ['shoulders-middle'],
  'Ombro Posterior': ['shoulders-back'],
  'Bíceps': ['biceps-left', 'biceps-right'],
  'Tríceps': ['triceps-left', 'triceps-right'],
  'Antebraço': ['forearms-left', 'forearms-right'],
  'Quadríceps': ['quads-left', 'quads-right'],
  'Posterior (Isquiotibiais)': ['hamstrings-left', 'hamstrings-right'],
  'Panturrilha': ['calves-left', 'calves-right'],
  'Glúteos': ['glutes'],
  'Abdômen': ['abs'],
  'Oblíquos': ['obliques-left', 'obliques-right'],
  'Cardio': [],
};

function calculateMuscleIntensity(exercicios: ExerciseWithMuscles[]): Record<string, number> {
  const muscleCount: Record<string, number> = {};

  for (const exercicio of exercicios) {
    if (!exercicio.grupo_muscular) continue;

    // Contar séries completadas
    const seriesCompletas = exercicio.series.filter(s => s.completado).length;
    if (seriesCompletas === 0) continue;

    // Incrementar contador para este grupo muscular
    const grupo = exercicio.grupo_muscular.trim();
    muscleCount[grupo] = (muscleCount[grupo] || 0) + seriesCompletas;
  }

  // Encontrar máximo
  const maxCount = Math.max(...Object.values(muscleCount), 1);

  // Normalizar para 0-10 (escala de intensidade)
  const normalized: Record<string, number> = {};
  for (const [muscle, count] of Object.entries(muscleCount)) {
    normalized[muscle] = Math.round((count / maxCount) * 10);
  }

  return normalized;
}

export default function MuscleChart({ exercicios }: MuscleChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<BodyChart | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    // Calcular intensidade por músculo
    const muscleIntensity = calculateMuscleIntensity(exercicios);

    // Montar bodyState com todos os músculos da biblioteca
    const bodyState: Record<string, { intensity: number; selected: boolean }> = {};
    for (const [muscleGroup, ids] of Object.entries(MUSCLE_MAP)) {
      const intensity = muscleIntensity[muscleGroup] || 0;

      for (const id of ids) {
        bodyState[id] = { intensity, selected: false };
      }
    }

    // Criar chart
    try {
      chartRef.current = new BodyChart(containerRef.current, {
        view: ViewSide.FRONT,
        bodyState,
        className: 'muscle-chart-container',
        showViewLabel: false,
        enableTransitions: true,
      });
    } catch (error) {
      console.error('Erro ao criar BodyChart:', error);
    }

    return () => {
      if (chartRef.current) {
        chartRef.current.destroy();
        chartRef.current = null;
      }
    };
  }, [exercicios]);

  return (
    <div
      ref={containerRef}
      style={{
        width: '100%',
        height: '400px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'transparent',
      }}
    />
  );
}
