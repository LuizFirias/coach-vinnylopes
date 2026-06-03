import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("id");

    if (!userId) {
      return NextResponse.json({ error: "ID do aluno é obrigatório" }, { status: 400 });
    }

    const bearer = req.headers.get("authorization") || "";
    const token = bearer.replace("Bearer ", "").trim();

    if (!token) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
      return NextResponse.json({ error: "Configuração do servidor inválida" }, { status: 500 });
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data: authData, error: authError } = await adminClient.auth.getUser(token);
    const coachId = authData?.user?.id;

    if (authError || !coachId) {
      return NextResponse.json({ error: "Sessão inválida" }, { status: 401 });
    }

    const { data: profile, error: roleError } = await adminClient
      .from("profiles")
      .select("role")
      .eq("id", coachId)
      .single();

    if (roleError || (profile?.role !== "coach" && profile?.role !== "super_admin")) {
      return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
    }

    // Verificar que o coach é dono deste aluno (super_admin pode desativar qualquer um)
    if (profile?.role === "coach") {
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
