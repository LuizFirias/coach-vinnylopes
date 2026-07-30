import type { WorkoutGroup, WorkoutPlan } from "@/app/components/admin/workouts/types";

const AVATAR_COLORS = [
  "from-amber-500/50 to-amber-700/30",
  "from-orange-500/50 to-orange-700/30",
  "from-yellow-500/50 to-yellow-700/30",
  "from-brand/50 to-brand/20",
];

function avatarGrad(studentId: string): string {
  const code = studentId.charCodeAt(0) + (studentId.charCodeAt(studentId.length - 1) ?? 0);
  return AVATAR_COLORS[code % AVATAR_COLORS.length];
}

export function groupWorkoutsByStudent(plans: WorkoutPlan[]): WorkoutGroup[] {
  const map = new Map<string, WorkoutGroup>();

  plans.forEach((plan) => {
    if (!map.has(plan.aluno_id)) {
      map.set(plan.aluno_id, {
        studentId: plan.aluno_id,
        studentName: plan.aluno_nome,
        studentEmail: plan.aluno_email ?? null,
        avatarUrl: plan.aluno_avatar_url ?? null,
        avatarColor: avatarGrad(plan.aluno_id),
        plans: [],
      });
    }
    map.get(plan.aluno_id)!.plans.push(plan);
  });

  return Array.from(map.values());
}
