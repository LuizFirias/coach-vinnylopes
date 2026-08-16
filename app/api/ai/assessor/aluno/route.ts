import { NextResponse } from "next/server";
import { getAuthenticatedCoach } from "@/lib/auth/getAuthenticatedCoach";
import { checkAiDietAccess } from "@/lib/access/checkAiDietAccess";
import {
  assertCoachOwnsAluno,
  buildAlunoAssessorContext,
} from "@/lib/ai/buildAlunoAssessorContext";
import { ASSESSOR_COACH_SYSTEM_PROMPT } from "@/lib/ai/assessorPrompt";
import type { AssessorPeriodo } from "@/lib/ai/assessorPeriod";

export async function GET(req: Request) {
  const auth = await getAuthenticatedCoach(req);
  if ("error" in auth) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const allowed = await checkAiDietAccess(auth.userId);
  if (!allowed) {
    return NextResponse.json(
      { error: "IA assessora disponível apenas no plano PRO" },
      { status: 403 },
    );
  }

  const url = new URL(req.url);
  const alunoId = url.searchParams.get("alunoId") || "";
  const periodo = (url.searchParams.get("periodo") || "semanal") as AssessorPeriodo;
  if (!alunoId) {
    return NextResponse.json({ error: "alunoId obrigatório" }, { status: 400 });
  }
  if (!["diario", "semanal", "mensal"].includes(periodo)) {
    return NextResponse.json({ error: "periodo inválido" }, { status: 400 });
  }

  if (auth.role !== "super_admin") {
    const owns = await assertCoachOwnsAluno(auth.userId, alunoId);
    if (!owns) {
      return NextResponse.json({ error: "Aluno não vinculado a este coach" }, { status: 403 });
    }
  }

  const contexto = await buildAlunoAssessorContext(alunoId, periodo);
  return NextResponse.json({
    papel: "assessor_do_coach",
    instrucoes: ASSESSOR_COACH_SYSTEM_PROMPT,
    contexto,
  });
}
