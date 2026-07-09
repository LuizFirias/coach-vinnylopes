import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedCoach } from "@/lib/auth/getAuthenticatedCoach";
import {
  coachCanDeleteWorkoutPlan,
  deleteWorkoutPlan,
  type WorkoutPlanTipo,
} from "@/lib/admin/deleteWorkoutPlan";

export async function DELETE(request: NextRequest) {
  try {
    const auth = await getAuthenticatedCoach(request);
    if ("error" in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const body = await request.json().catch(() => null);
    const id = body?.id as string | undefined;
    const tipo = body?.tipo as WorkoutPlanTipo | undefined;
    const pdfUrl = (body?.pdf_url as string | undefined) ?? null;

    if (!id || (tipo !== "digital" && tipo !== "pdf")) {
      return NextResponse.json(
        { error: "Parâmetros inválidos: id e tipo (digital|pdf) são obrigatórios" },
        { status: 400 }
      );
    }

    const permission = await coachCanDeleteWorkoutPlan(
      auth.adminClient,
      auth.userId,
      auth.role,
      { id, tipo, pdfUrl }
    );

    if (!permission.allowed) {
      return NextResponse.json(
        { error: permission.error ?? "Sem permissão" },
        { status: 403 }
      );
    }

    const result = await deleteWorkoutPlan(auth.adminClient, { id, tipo, pdfUrl });

    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[DELETE /api/admin/treinos/plan]", err);
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 });
  }
}
