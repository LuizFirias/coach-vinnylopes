import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";
import { getWelcomeEmailHtml } from "@/lib/emailTemplates";

const resend = new Resend(process.env.RESEND_API_KEY || "re_dummy_key");

export async function POST(req: Request) {
  try {
    const { email, role, full_name } = await req.json();

    if (!email) {
      return NextResponse.json({ error: "E-mail é obrigatório" }, { status: 400 });
    }

    // ===== 1. AUTENTICAÇÃO DO SOLICITANTE =====
    const bearer = req.headers.get("authorization") || "";
    const token = bearer.replace("Bearer ", "").trim();

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
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Verificar se quem está chamando é um super_admin
    const { data: authData, error: authError } = await adminClient.auth.getUser(token);
    if (authError || !authData.user) {
      return NextResponse.json({ error: "Sessão inválida" }, { status: 401 });
    }

    const { data: callerProfile } = await adminClient
      .from("profiles")
      .select("role")
      .eq("id", authData.user.id)
      .single();

    if (callerProfile?.role !== "super_admin") {
      return NextResponse.json({ error: "Apenas Super Admins podem realizar esta ação" }, { status: 403 });
    }

    // ===== 3. VERIFICAR SE USUÁRIO JÁ EXISTE =====
    const { data: { users } } = await adminClient.auth.admin.listUsers();
    const existingUser = users.find(u => u.email?.toLowerCase() === email.toLowerCase());

    let targetId: string;
    let isNewUser = false;
    const temporaryPassword = `Coach${Math.random().toString(36).slice(2, 8).toUpperCase()}!`;
    const siteUrl = "https://vinnylopescoach.site";

    if (existingUser) {
      // Usuário já existe — apenas atualizar role
      targetId = existingUser.id;
    } else {
      // Criar novo usuário com senha temporária
      isNewUser = true;
      const { data: createdUser, error: createError } = await adminClient.auth.admin.createUser({
        email,
        password: temporaryPassword,
        email_confirm: true,
        user_metadata: { full_name: full_name || "" },
      });
      if (createError) throw createError;
      targetId = createdUser.user.id;
    }

    // ===== 4. CRIAR OU ATUALIZAR PERFIL =====
    const { data: existingProfile } = await adminClient
      .from("profiles")
      .select("id")
      .eq("id", targetId)
      .maybeSingle();

    if (!existingProfile) {
      const { error: insertError } = await adminClient.from("profiles").insert({
        id: targetId,
        email: email.toLowerCase(),
        full_name: full_name || email.split("@")[0],
        role: role || "coach",
        status_pagamento: "pago",
        arquivado: false,
      });
      if (insertError) throw insertError;
    } else {
      const updateData: Record<string, string> = { role: role || "coach" };
      if (full_name) updateData.full_name = full_name;
      const { error: updateError } = await adminClient
        .from("profiles")
        .update(updateData)
        .eq("id", targetId);
      if (updateError) throw updateError;
    }

    // ===== 5. ENVIAR E-MAIL VIA RESEND (apenas para novos usuários) =====
    if (isNewUser) {
      const displayName = full_name || email.split("@")[0];
      const { error: emailError } = await resend.emails.send({
        from: "Auronfit <noreply@vinnylopescoach.site>",
        to: email,
        subject: "Acesso liberado — Auronfit",
        html: getWelcomeEmailHtml(displayName, email, temporaryPassword, siteUrl),
      });

      if (emailError) {
        console.error("[SET-ROLE] Erro ao enviar e-mail:", emailError);
        // Não falha a operação — usuário foi criado, apenas o e-mail não foi enviado
      } else {
        console.log("[SET-ROLE] E-mail enviado para:", email);
      }
    }

    return NextResponse.json({
      message: isNewUser
        ? `Acesso criado e e-mail enviado para ${email}`
        : `Usuário ${email} atualizado para ${role || "coach"}`,
    });

  } catch (err: any) {
    console.error("[SUPER ADMIN] Erro:", err);
    return NextResponse.json({ error: err.message || "Erro interno do servidor" }, { status: 500 });
  }
}
