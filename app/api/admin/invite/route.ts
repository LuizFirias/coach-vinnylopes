import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(req: Request) {
  console.log("[INVITE] 🚀 Iniciando rota de convite...");
  
  try {
    // ===== 1. VARIÁVEIS DE AMBIENTE =====
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const resendApiKey = process.env.RESEND_API_KEY;

    if (!supabaseUrl || !serviceRoleKey || !resendApiKey) {
      const missing = [];
      if (!supabaseUrl) missing.push("NEXT_PUBLIC_SUPABASE_URL ou SUPABASE_URL");
      if (!serviceRoleKey) missing.push("SUPABASE_SERVICE_ROLE_KEY");
      if (!resendApiKey) missing.push("RESEND_API_KEY");
      
      console.error("[INVITE] ❌ Variáveis faltando:", missing.join(", "));
      return NextResponse.json({ 
        error: "Configuração do servidor incompleta",
        missingVariables: missing
      }, { status: 500 });
    }

    // ===== 2. VALIDAÇÃO DO PAYLOAD =====
    let body;
    try {
      body = await req.json();
    } catch (e) {
      console.error("[INVITE] ❌ Erro ao ler JSON do corpo:", e);
      return NextResponse.json({ error: "Corpo da requisição inválido (JSON esperado)" }, { status: 400 });
    }

    const email = String(body?.email || "").trim().toLowerCase();
    const fullName = String(body?.full_name || "").trim();

    console.log("[INVITE] 📨 Dados recebidos:", { email, fullName });

    if (!email || !fullName) {
      return NextResponse.json({ error: "Nome e e-mail são obrigatórios" }, { status: 400 });
    }

    // ===== 3. AUTENTICAÇÃO DO COACH =====
    let token = "";
    try {
      const cookieStore = await cookies();
      token = cookieStore.get("sb-access-token")?.value || "";
    } catch (e) {
      console.warn("[INVITE] ⚠️ Erro ao acessar cookies:", e);
    }
    
    if (!token) {
      const bearer = req.headers.get("authorization") || "";
      token = bearer.replace("Bearer ", "");
    }

    if (!token) {
      console.error("[INVITE] ❌ Token de autenticação não encontrado");
      return NextResponse.json({ error: "Não autorizado - Sessão não encontrada" }, { status: 401 });
    }

    // ===== 4. INSTANCIAR CLIENTE ADMIN =====
    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // Verificar autenticação do coach
    const { data: authData, error: authError } = await adminClient.auth.getUser(token);
    
    if (authError || !authData?.user) {
      console.error("[INVITE] ❌ Erro de autenticação Supabase:", authError?.message);
      return NextResponse.json({ error: "Sessão inválida ou expirada" }, { status: 401 });
    }

    const userId = authData.user.id;
    console.log("[INVITE] ✓ Coach autenticado:", userId);

    // Verificar role do coach
    const { data: profile, error: roleError } = await adminClient
      .from("profiles")
      .select("role")
      .eq("id", userId)
      .single();

    if (roleError || profile?.role !== "coach") {
      console.error("[INVITE] ❌ Acesso negado - role:", profile?.role || "null");
      return NextResponse.json({ error: "Acesso negado - Apenas coaches podem convidar alunos" }, { status: 403 });
    }

    console.log("[INVITE] ✓ Permissão verificada: Coach");

    // ===== 4. VERIFICAÇÃO DE DUPLICIDADE =====
    console.log("[INVITE] 🔍 Verificando se e-mail já existe:", email);
    
    const { data: existingProfile, error: checkError } = await adminClient
      .from("profiles")
      .select("id, email, full_name, role")
      .eq("email", email)
      .maybeSingle();

    if (checkError) {
      console.error("[INVITE] ❌ Erro ao verificar duplicidade:", {
        message: checkError.message,
        code: checkError.code,
        details: checkError.details
      });
      return NextResponse.json({ 
        error: "Erro ao verificar e-mail no banco de dados",
        details: checkError.message
      }, { status: 500 });
    }

    if (existingProfile) {
      console.warn("[INVITE] ⚠️  E-mail duplicado:", {
        email,
        existingUserId: existingProfile.id,
        name: existingProfile.full_name,
        role: existingProfile.role
      });
      
      const roleLabel = existingProfile.role === 'coach' ? 'Coach' : 'Aluno';
      return NextResponse.json({ 
        error: `Este e-mail já está cadastrado como ${roleLabel}. Use outro e-mail ou gerencie o perfil existente.` 
      }, { status: 409 });
    }

    console.log("[INVITE] ✓ E-mail disponível");

    // ===== 5. CRIAR USUÁRIO COM SENHA TEMPORÁRIA (SEM SMTP) =====
    console.log("[INVITE] 👤 Criando usuário com senha temporária...");
    
    const temporaryPassword = "Mudar@123";

    const { data: createData, error: createError } = await adminClient.auth.admin.createUser({
      email: email,
      password: temporaryPassword,
      email_confirm: true, // Ativa a conta instantaneamente sem e-mail
      user_metadata: {
        full_name: fullName
      }
    });
    
    if (createError || !createData?.user) {
      console.error("[INVITE] ❌❌ ERRO AO CRIAR USUÁRIO:", {
        message: createError?.message,
        status: createError?.status,
        name: createError?.name,
        code: createError?.code,
        fullError: JSON.stringify(createError, null, 2)
      });

      // Mensagens amigáveis baseadas no tipo de erro
      let friendlyMessage = "Falha ao criar usuário";
      let statusCode = 400;
      
      if (createError?.message?.toLowerCase().includes("rate limit")) {
        friendlyMessage = "Limite de criação atingido. Aguarde alguns minutos e tente novamente.";
        statusCode = 429;
      } else if (createError?.message?.toLowerCase().includes("invalid email")) {
        friendlyMessage = "E-mail inválido. Verifique o endereço e tente novamente.";
      } else if (createError?.message?.toLowerCase().includes("already registered") || createError?.message?.toLowerCase().includes("already exists")) {
        friendlyMessage = "Este e-mail já possui uma conta. Use outro e-mail.";
        statusCode = 409;
      } else if (createError?.status === 429) {
        friendlyMessage = "Muitas tentativas. Aguarde um momento e tente novamente.";
        statusCode = 429;
      }

      return NextResponse.json({ 
        error: friendlyMessage,
        details: createError?.message 
      }, { status: statusCode });
    }

    const newUserId = createData.user.id;
    console.log("[INVITE] ✓ Usuário criado com sucesso. User ID:", newUserId);

    // ===== 6. UPSERT NA TABELA PROFILES (evita conflito se trigger já criou) =====
    console.log("[INVITE] 💾 Salvando/Atualizando perfil na tabela profiles...");
    
    const { error: upsertError } = await adminClient
      .from("profiles")
      .upsert({
        id: newUserId,
        full_name: fullName,
        email: email,
        role: "aluno",
        status_pagamento: "pago",
        arquivado: false,
      }, {
        onConflict: "id", // Se o ID já existir, atualiza em vez de falhar
        ignoreDuplicates: false // Força atualização dos campos
      });

    if (upsertError) {
      console.error("[INVITE] ❌❌ ERRO AO SALVAR PERFIL:", {
        message: upsertError.message,
        details: upsertError.details,
        hint: upsertError.hint,
        code: upsertError.code,
        fullError: JSON.stringify(upsertError, null, 2)
      });
      
      return NextResponse.json({ 
        error: "Usuário criado, mas erro ao salvar perfil. Contate o suporte.",
        details: upsertError.message
      }, { status: 400 });
    }

    console.log("[INVITE] ✓ Perfil salvo com sucesso.");

    // ===== 7. ENVIAR E-MAIL DE BOAS-VINDAS (RESEND) =====
    console.log("[INVITE] 📧 Enviando convite via Resend...");
    
    // HARDCODED URL para garantir que funcione independente da Vercel
    const siteUrl = "https://www.vinnylopescoach.site";
    
    try {
      const { data: emailData, error: emailError } = await resend.emails.send({
        from: 'Vinny Lopes <contato@vinnylopescoach.site>',
        to: email,
        subject: 'BEM-VINDO AO TIME | ACESSO LIBERADO',
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
                <h1>A Jornada Começa Agora</h1>
                <p>Seu acesso ao ecossistema de treinamento exclusivo foi liberado. Utilize as credenciais abaixo para entrar na plataforma.</p>
                
                <div class="credentials">
                  <div class="label">E-mail de Acesso</div>
                  <div class="value">${email}</div>
                  <div class="label">Senha Temporária</div>
                  <div class="value">${temporaryPassword}</div>
                </div>

                <a href="${siteUrl}" class="button">Acessar Plataforma</a>
                
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
        console.error("[INVITE] ❌ Erro ao enviar e-mail via Resend:", emailError);
      } else {
        console.log("[INVITE] ✓ E-mail (Resend) enviado com sucesso! Resposta:", emailData);
      }
    } catch (err) {
      console.error("[INVITE] ❌ Erro inesperado no envio do e-mail:", err);
    }

    console.log("[INVITE] 🎉 SUCESSO TOTAL! Aluno cadastrado:", { email, userId: newUserId });
    
    return NextResponse.json({ 
      success: true, 
      userId: newUserId,
      temporaryPassword: temporaryPassword,
      message: `Aluno ${fullName} cadastrado com sucesso! Senha temporária: ${temporaryPassword}`
    });
    
  } catch (error: any) {
    console.error("[INVITE] ❌❌❌ ERRO CRÍTICO NO SERVIDOR:", {
      message: error?.message,
      name: error?.name,
      stack: error?.stack
    });
    
    return NextResponse.json({ 
      error: "Ocorreu um erro interno ao processar o convite.",
      message: error?.message,
      stack: process.env.NODE_ENV === 'development' ? error?.stack : undefined
    }, { status: 500 });
  }
}
