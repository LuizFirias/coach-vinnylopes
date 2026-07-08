import { NextResponse } from "next/server";
import { getAuthenticatedCoach } from "@/lib/auth/getAuthenticatedCoach";

export async function DELETE(req: Request) {
  try {
    const auth = await getAuthenticatedCoach(req);
    if ("error" in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("id");

    if (!userId) {
      return NextResponse.json({ error: "ID do aluno é obrigatório" }, { status: 400 });
    }

    const { userId: coachId, role, adminClient } = auth;

    // Verificar que o coach é dono deste aluno (super_admin pode desativar qualquer um)
    if (role === "coach") {
      const { data: ownership } = await adminClient
        .from("coach_alunos")
        .select("aluno_id")
        .eq("coach_id", coachId)
        .eq("aluno_id", userId)
        .maybeSingle();

      if (!ownership) {
        return NextResponse.json({ error: "Este aluno não pertence ao seu perfil" }, { status: 403 });
      }
    }

    // Soft-delete: arquiva o aluno sem remover dados ou acesso auth
    const { error: archiveError } = await adminClient
      .from("profiles")
      .update({
        arquivado: true,
        status_pagamento: "pendente",
      })
      .eq("id", userId);

    if (archiveError) {
      return NextResponse.json({ error: "Falha ao arquivar aluno", details: archiveError.message }, { status: 500 });
    }

    return NextResponse.json({ message: "Aluno desativado com sucesso" });
  } catch (err: any) {
    console.error("[DEACTIVATE STUDENT] Erro inesperado:", err);
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 });
  }
}
