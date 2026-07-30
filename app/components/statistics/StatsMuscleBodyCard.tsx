"use client";

import { useMemo } from "react";
import { MuscleBodyFigure } from "@/app/components/MuscleBodyFigure";
import { MUSCLE_HIGHLIGHTER_MAP } from "@/lib/utils/workoutShare";
import type { BodyGender } from "@/lib/utils/bodyGender";
import { cn } from "@/lib/utils/cn";

function setsToOpacity(sets: number): number {
  if (sets <= 3) return 0.4;
  if (sets <= 6) return 0.65;
  return 1;
}

function buildVolumeHighlightData(countSets: Record<string, number>) {
  const list: Array<{ slug: string; color: string }> = [];

  Object.entries(MUSCLE_HIGHLIGHTER_MAP).forEach(([slug, muscleGroups]) => {
    const totalSets = muscleGroups.reduce((sum, group) => sum + (countSets[group] || 0), 0);
    if (totalSets > 0) {
      list.push({
        slug,
        color: `rgba(147, 51, 234, ${setsToOpacity(totalSets)})`,
      });
    }
  });

  return list;
}

interface StatsMuscleBodyCardProps {
  countSets: Record<string, number>;
  gender: BodyGender;
  emptyHint?: string;
  className?: string;
  isDesktop?: boolean;
}

function MuscleSide({
  data,
  side,
  gender,
  height,
}: {
  data: Array<{ slug: string; color: string }>;
  side: "front" | "back";
  gender: BodyGender;
  height: number;
}) {
  return (
    <div className="flex-1 flex items-center justify-center overflow-hidden" style={{ height }}>
      <MuscleBodyFigure
        data={data}
        side={side}
        gender={gender}
        scale={0.85}
        defaultFill="#1e1e1e"
        defaultStroke="#282828"
        defaultStrokeWidth={1}
        style={{ minHeight: height - 16, maxHeight: height }}
      />
    </div>
  );
}

export function StatsMuscleBodyCard({
  countSets,
  gender,
  emptyHint = "Nenhum treino registrado no período selecionado",
  className,
  isDesktop = false,
}: StatsMuscleBodyCardProps) {
  const hasData = Object.values(countSets).some((count) => count > 0);
  const highlightData = useMemo(
    () => (hasData ? buildVolumeHighlightData(countSets) : []),
    [countSets, hasData]
  );

  const bodyHeight = isDesktop ? 340 : 300;

  return (
    <div className={className}>
      <div className={cn("flex items-center justify-center gap-2", isDesktop && "gap-4")}>
        <MuscleSide data={highlightData} side="front" gender={gender} height={bodyHeight} />
        <MuscleSide data={highlightData} side="back" gender={gender} height={bodyHeight} />
      </div>
      {!hasData && (
        <p className="mt-2 text-[11px] text-text-muted text-center">{emptyHint}</p>
      )}
    </div>
  );
}
