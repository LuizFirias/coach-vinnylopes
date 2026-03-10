import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(req: Request) {
  try {
    const { email, role, full_name } = await req.json();

    if (!email) {
      return NextResponse.json({ error: "E-mail é obrigatório" }, { status: 400 });
    }

    // ===== 1. AUTENTICAÇÃO DO SOLICITANTE =====
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
          const temporaryPassword = "Mudar@123";
          
          const { data: createdUser, error: createError } = await adminClient.auth.admin.createUser({
            email,
            password: temporaryPassword,
            email_confirm: true,
            user_metadata: { full_name: full_name || "" }
          });
          if (createError) throw createError;
          targetId = createdUser.user.id;

          // ===== ENVIAR E-MAIL COM RESEND =====
          try {
            const siteUrl = "https://www.vinnylopescoach.site";
            
            const { data: emailData, error: emailError } = await resend.emails.send({
              from: 'Vinny Lopes <contato@vinnylopescoach.site>',
              to: email,
              subject: 'ACESSO LIBERADO | COACH | ALTO DESEMPENHO',
              html: `
                <!DOCTYPE html>
                <html>
                <head>
                  <style>
                    body { background-color: #000000; font-family: sans-serif; margin: 0; padding: 0; }
                    .container { max-width: 600px; margin: 0 auto; padding: 40px 20px; text-align: center; }
                    .card { background-color: #0a0a0a; border: 1px solid #D4AF37; border-radius: 16px; padding: 40px; text-align: center; }
                    h1 { color: #D4AF37; font-size: 20px; letter-spacing: 3px; font-weight: 900; margin-bottom: 24px; text-transform: uppercase; }
                    p { color: #ffffff; font-size: 14px; line-height: 1.6; margin-bottom: 20px; opacity: 0.8; }
                    .credentials { background-color: rgba(212, 175, 55, 0.05); border: 1px dashed #D4AF37; border-radius: 8px; padding: 20px; margin: 24px 0; }
                    .label { color: #D4AF37; font-size: 10px; font-weight: bold; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 4px; }
                    .value { color: #ffffff; font-size: 16px; font-weight: bold; margin-bottom: 12px; }
                    .button { background: linear-gradient(to right, #B8860B, #FFD700, #B8860B); color: #000000; padding: 18px 36px; text-decoration: none; border-radius: 8px; font-weight: 900; font-size: 12px; letter-spacing: 2px; display: inline-block; text-transform: uppercase; margin-top: 20px; }
                    .footer { color: #444444; font-size: 10px; margin-top: 32px; letter-spacing: 1px; text-transform: uppercase; }
                  </style>
                </head>
                <body>
                  <div class="container">
                    <div class="card">
                      <h1>Acesso de Coach Liberado</h1>
                      <p>Bem-vindo ao painel de gerenciamento! Utilize as credenciais abaixo para acessar o sistema de alto desempenho.</p>
                      
                      <div class="credentials">
                        <div class="label">E-mail de Acesso</div>
                        <div class="value">${email}</div>
                        <div class="label">Senha Temporária</div>
                        <div class="value">${temporaryPassword}</div>
                      </div>

                      <a href="${siteUrl}" class="button">Acessar Painel</a>
                      
                      <p style="font-size: 11px; margin-top: 30px;">* Recomendamos alterar sua senha no primeiro acesso.</p>
                    </div>
                    <div class="footer">
                      Ecossistema de Treinamento High Performance
                    </div>
                  </div>
                </body>
                </html>
              `
            });

            if (emailError) {
              console.error("[SET-ROLE] ⚠️ Erro ao enviar e-mail Resend:", emailError);
            } else {
              console.log("[SET-ROLE] ✓ E-mail enviado com Resend:", emailData);
            }
          } catch (emailErr) {
            console.error("[SET-ROLE] ⚠️ Erro inesperado no envio do e-mail:", emailErr);
          }
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
