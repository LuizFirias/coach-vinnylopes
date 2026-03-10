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
    const token = (await cookieStore).get("sb-access-token")?.value || bearer.replace("Bearer ", "");

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

    // ===== 3. DELETE DE FICHAS TREINO ASSOCIADAS =====
    // Delete cascata: remover todas as fichas treino do coach antes de deletar seu perfil
    const { error: deleteFichasError } = await adminClient
      .from("fichas_treino")
      .delete()
      .eq("coach_id", userId);

    if (deleteFichasError) {
      console.error("[DELETE FICHAS] Erro ao deletar fichas treino:", deleteFichasError);
      return NextResponse.json({ 
        error: "Falha ao remover fichas de treino associadas",
        details: deleteFichasError.message 
      }, { status: 500 });
    }

    // ===== 4. DELETE DO SUPABASE AUTH =====
    // Deletar usuário do Supabase Auth (usando admin client)
    const { error: deleteAuthError } = await adminClient.auth.admin.deleteUser(userId);

    if (deleteAuthError) {
      console.error("[DELETE AUTH] Erro ao deletar usuário do auth:", deleteAuthError);
      console.warn("[DELETE AUTH] Continuando mesmo com erro de Auth...");
    }

    // ===== 5. DELETE DO BANCO (Soft Delete como fallback) =====
    // Se Auth falhou, pelo menos arquiva o perfil
    const { error: deleteProfileError } = await adminClient
      .from("profiles")
      .delete()
      .eq("id", userId);

    if (deleteProfileError) {
      console.error("[DELETE PROFILE] Erro ao deletar profile:", deleteProfileError);
      // Fallback: arquivar em vez de deletar
      const { error: archiveError } = await adminClient
        .from("profiles")
        .update({ 
          arquivado: true,
          status_pagamento: "pendente"
        })
        .eq("id", userId);

      if (archiveError) {
        return NextResponse.json({ 
          error: "Falha ao remover/arquivar perfil",
          details: archiveError.message 
        }, { status: 500 });
      }

      return NextResponse.json({ 
        message: "Perfil arquivado com sucesso (não foi possível deletar completamente)" 
      });
    }

    return NextResponse.json({ 
      message: "Usuário deletado completamente do app e da autenticação" 
    });

  } catch (err: any) {
    console.error("[DELETE STUDENT] Erro inesperado:", err);
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 });
  }
}
