import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@supabase/supabase-js";

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("id");

    if (!userId) {
      return NextResponse.json({ error: "ID do aluno é obrigatório" }, { status: 400 });
    }

    // ===== 1. AUTENTICAÇÃO DO COACH =====
    const cookieStore = cookies();
    const bearer = req.headers.get("authorization") || "";
    const token = (await cookieStore).get("sv-session")?.value || bearer.replace("Bearer ", "");

    if (!token) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    // ===== 2. INSTANCIAR CLIENTE ADMIN =====
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
      return NextResponse.json({ 
        error: "Configuração do servidor inválida" 
      }, { status: 500 });
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // Verificar autenticação do coach
    const { data: authData, error: authError } = await adminClient.auth.getUser(token);
    const coachId = authData?.user?.id;

    if (authError || !coachId) {
      return NextResponse.json({ error: "Sessão inválida" }, { status: 401 });
    }

    // Verificar role do coach
    const { data: profile, error: roleError } = await adminClient
      .from("profiles")
      .select("role")
      .eq("id", coachId)
      .single();

    if (roleError || profile?.role !== "coach") {
      return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
    }

    // ===== 3. ARQUIVAR USUÁRIO (Soft Delete) =====
    // Em vez de excluir do Auth e Profiles, marcamos como arquivado.
    // Isso preserva o histórico de faturamento e evolução.
    
    const { error: archiveError } = await adminClient
      .from("profiles")
      .update({ 
        arquivado: true,
        status_pagamento: "pendente" // Opcional: marca como pendente para parar de contar como "Ativo"
      })
      .eq("id", userId);

    if (archiveError) {
      console.error("[ARCHIVE STUDENT] Erro ao arquivar no banco:", archiveError);
      return NextResponse.json({ 
        error: "Falha ao arquivar aluno no banco de dados",
        details: archiveError.message 
      }, { status: 500 });
    }

    return NextResponse.json({ message: "Aluno arquivado com sucesso" });

  } catch (err: any) {
    console.error("[DELETE STUDENT] Erro inesperado:", err);
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 });
  }
}
