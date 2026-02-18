import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@supabase/supabase-js";

export async function POST(req: Request) {
  try {
    const { email, role, full_name } = await req.json();

    if (!email) {
      return NextResponse.json({ error: "E-mail é obrigatório" }, { status: 400 });
    }

    // ===== 1. AUTENTICAÇÃO DO SOLICITANTE =====
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
      return NextResponse.json({ error: "Configuração do servidor inválida" }, { status: 500 });
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // Verificar se quem está chamando é um super_admin
    const { data: authData, error: authError } = await adminClient.auth.getUser(token);
    if (authError || !authData.user) {
      return NextResponse.json({ error: "Sessão inválida" }, { status: 401 });
    }

    const { data: callerProfile, error: callerError } = await adminClient
      .from("profiles")
      .select("role")
      .eq("id", authData.user.id)
      .single();

    if (callerError || callerProfile?.role !== "super_admin") {
      return NextResponse.json({ error: "Apenas Super Admins podem realizar esta ação" }, { status: 403 });
    }

    // ===== 3. BUSCAR USUÁRIO (NO AUTH OU NO PROFILES) =====
    // Primeiro tentamos achar no Auth por e-mail
    // Usamos listUsers() - Nota: Em larga escala, isso precisaria de filtros ou RPC
    const { data: { users }, error: listError } = await adminClient.auth.admin.listUsers();
    const existingAuthUser = users.find(u => u.email?.toLowerCase() === email.toLowerCase());

    let targetId = existingAuthUser?.id;
    let isNewUser = false;

    if (!existingAuthUser) {
      isNewUser = true;
      // Tenta enviar convite por e-mail
      const { data: inviteData, error: inviteError } = await adminClient.auth.admin.inviteUserByEmail(email, {
        data: { full_name: full_name || "" }
      });

      if (inviteError) {
        // Se o envio de e-mail falhar (Erro 500 ou cota do Supabase), tentamos criar o usuário diretamente
        if (inviteError.status === 500 || inviteError.code === 'unexpected_failure' || inviteError.message?.includes("email")) {
          const { data: createdUser, error: createError } = await adminClient.auth.admin.createUser({
            email,
            email_confirm: true,
            user_metadata: { full_name: full_name || "" }
          });
          if (createError) throw createError;
          targetId = createdUser.user.id;
        } else {
          throw inviteError;
        }
      } else {
        targetId = inviteData.user.id;
      }
    }

    if (!targetId) {
      return NextResponse.json({ error: "Não foi possível determinar o ID do usuário" }, { status: 400 });
    }

    // Agora garantimos que o perfil existe ou atualizamos o existente
    const { data: profile, error: profileError } = await adminClient
      .from("profiles")
      .select("id")
      .eq("id", targetId)
      .single();

    if (profileError && profileError.code !== "PGRST116") {
      throw profileError;
    }

    if (!profile) {
      // Criar perfil se não existir
      const { error: insertError } = await adminClient
        .from("profiles")
        .insert({
          id: targetId,
          email: email.toLowerCase(),
          full_name: full_name || email.split('@')[0],
          role: role || "coach",
          status_pagamento: "pago",
          arquivado: false
        });

      if (insertError) throw insertError;
    } else {
      // Atualizar perfil existente
      const updateData: any = { role: role || "coach" };
      if (full_name) updateData.full_name = full_name;

      const { error: updateError } = await adminClient
        .from("profiles")
        .update(updateData)
        .eq("id", targetId);

      if (updateError) throw updateError;
    }

    return NextResponse.json({ 
      message: isNewUser 
        ? `Convite enviado para ${email}. Perfil pré-criado como ${role || "coach"}.` 
        : `Usuário ${email} atualizado para ${role || "coach"}` 
    });

  } catch (err: any) {
    console.error("[SUPER ADMIN] Erro:", err);
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 });
  }
}
