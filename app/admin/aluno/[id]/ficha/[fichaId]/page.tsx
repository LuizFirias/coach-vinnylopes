"use client";

import { use } from "react";
import { WorkoutBuilderScreen } from "@/app/components/workout-builder/WorkoutBuilderScreen";

export default function EditarFichaPage({
  params,
}: {
  params: Promise<{ id: string; fichaId: string }>;
}) {
  const { id, fichaId } = use(params);

  return (
    <WorkoutBuilderScreen
      mode="edit"
      alunoId={id}
      fichaId={fichaId}
    />
  );
}
