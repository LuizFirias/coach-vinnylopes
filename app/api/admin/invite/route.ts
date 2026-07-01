import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";
import { getStudentWelcomeEmailHtml } from "@/lib/emailTemplates";

function generateRandomPassword(length = 12) {
  const lowercase = "abcdefghijklmnopqrstuvwxyz";
  const uppercase = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const digits = "0123456789";
  const specials = "!@#$%&*";
  const all = lowercase + uppercase + digits + specials;
  
  let password = "";
  password += lowercase.charAt(Math.floor(Math.random() * lowercase.length));
  password += uppercase.charAt(Math.floor(Math.random() * uppercase.length));
  password += digits.charAt(Math.floor(Math.random() * digits.length));
  password += specials.charAt(Math.floor(Math.random() * specials.length));
  
  for (let i = 4; i < length; i++) {
    password += all.charAt(Math.floor(Math.random() * all.length));
  }
  
  return password.split('').sort(() => 0.5 - Math.random()).join('');
}

const resend = new Resend(process.env.RESEND_API_KEY || "re_dummy_key");

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
    const dateOfBirth = body?.date_of_birth ? String(body.date_of_birth) : null;
    const objetivo = body?.objetivo ? String(body.objetivo) : null;
    const tipoPlano = body?.tipo_plano ? String(body.tipo_plano) : null;
    const dataExpiracao = body?.data_expiracao ? String(body.data_expiracao) : null;
    const whatsapp = body?.whatsapp ? String(body.whatsapp).trim() : null;

    console.log("[INVITE] 📨 Dados recebidos:", { email, fullName, dateOfBirth, objetivo, tipoPlano, dataExpiracao, whatsapp });

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

    // Verificar role do coach e obter seu nome/referência
    const { data: profile, error: roleError } = await adminClient
      .from("profiles")
      .select("role, full_name, coaching_reference")
      .eq("id", userId)
      .single();

    if (roleError || profile?.role !== "coach") {
      console.error("[INVITE] ❌ Acesso negado - role:", profile?.role || "null");
      return NextResponse.json({ error: "Acesso negado - Apenas coaches podem convidar alunos" }, { status: 403 });
    }

    const coachName = profile?.full_name || profile?.coaching_reference || "Seu Coach";

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
    
    const temporaryPassword = generateRandomPassword(12);

    const { data: createData, error: createError } = await adminClient.auth.admin.createUser({
      email: email,
      password: temporaryPassword,
      email_confirm: true, // Ativa a conta instantaneamente sem e-mail
      user_metadata: {
        full_name: fullName,
        phone: whatsapp
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
        coaching_reference: fullName,  // Coach's reference name (stored separately)
        full_name: null,  // Aluno deve definir na primeira vez (onboarding)
        email: email,
        role: "aluno",
        coach_id: userId,
        status_pagamento: "pago",
        arquivado: false,
        first_access_completed: false,  // Flag da primeira vez (onboarding)
        date_of_birth: dateOfBirth || null,
        objetivo: objetivo || null,
        tipo_plano: tipoPlano || null,
        data_expiracao: dataExpiracao || null,
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

    // ===== 6.5. VINCULAR ALUNO AO COACH (coach_alunos) =====
    console.log("[INVITE] 🔗 Vinculando aluno ao coach em coach_alunos...");

    // Primeiro verificar se o vínculo já existe
    const { data: existingLink } = await adminClient
      .from("coach_alunos")
      .select("id")
      .eq("coach_id", userId)
      .eq("aluno_id", newUserId)
      .maybeSingle();

    if (!existingLink) {
      // Vínculo não existe, criar novo
      const { error: linkError } = await adminClient
        .from("coach_alunos")
        .insert({
          coach_id: userId,
          aluno_id: newUserId,
        });

      if (linkError) {
        console.error("[INVITE] ❌❌ ERRO AO VINCULAR COACH-ALUNO:", {
          message: linkError.message,
          details: linkError.details,
          hint: linkError.hint,
          code: linkError.code,
          fullError: JSON.stringify(linkError, null, 2)
        });

        // Best-effort rollback: evita deixar usuário "solto" sem aparecer para o coach
        try {
          await adminClient.from("profiles").delete().eq("id", newUserId);
        } catch (e) {
          console.warn("[INVITE] ⚠️ Falha ao remover profile no rollback:", e);
        }
        try {
          await adminClient.auth.admin.deleteUser(newUserId);
        } catch (e) {
          console.warn("[INVITE] ⚠️ Falha ao remover auth user no rollback:", e);
        }

        return NextResponse.json({
          error: "Usuário criado, mas falhou ao vincular ao coach. Verifique a tabela coach_alunos e RLS.",
          details: linkError.message,
        }, { status: 400 });
      }
    } else {
      console.log("[INVITE] ℹ️ Vínculo coach-aluno já existe, reutilizando.");
    }

    console.log("[INVITE] ✓ Vínculo coach_alunos criado/confirmado.");

    // ===== 7. ENVIAR E-MAIL DE BOAS-VINDAS (RESEND) =====
    console.log("[INVITE] 📧 Enviando convite via Resend...");
    
    // HARDCODED URL para garantir que funcione independente da Vercel
    const siteUrl = "https://www.auronfit.com.br";
    
    try {
      const { data: emailData, error: emailError } = await resend.emails.send({
        from: 'Auronfit <contato@auronfit.com.br>',
        to: email,
        subject: 'BEM-VINDO AO TIME | ACESSO LIBERADO',
        html: getStudentWelcomeEmailHtml(fullName, email, temporaryPassword, coachName, siteUrl),
      });

      if (emailError) {
        console.error("[INVITE] ❌ Erro ao enviar e-mail via Resend:", emailError);
      } else {
        console.log("[INVITE] ✓ E-mail (Resend) enviado com sucesso! Resposta:", emailData);
      }
    } catch (err) {
      console.error("[INVITE] ❌ Erro inesperado no envio do e-mail:", err);
    }

    // ===== 8. GERAR LINK DE CONVITE/ATIVAÇÃO (RECOVERY LINK) =====
    let inviteLink = "";
    try {
      const { data: linkData, error: linkError } = await adminClient.auth.admin.generateLink({
        type: "recovery",
        email: email,
        options: {
          redirectTo: `${siteUrl}/login`
        }
      });
      if (!linkError && linkData?.properties?.action_link) {
        inviteLink = linkData.properties.action_link;
        console.log("[INVITE] ✓ Link de convite/senha gerado:", inviteLink);
      } else {
        console.warn("[INVITE] ⚠️ Erro ao gerar link de convite:", linkError?.message);
      }
    } catch (e) {
      console.warn("[INVITE] ⚠️ Erro inesperado ao gerar link de convite:", e);
    }

    console.log("[INVITE] 🎉 SUCESSO TOTAL! Aluno cadastrado:", { email, userId: newUserId });
    
    return NextResponse.json({ 
      success: true, 
      userId: newUserId,
      temporaryPassword: temporaryPassword,
      inviteLink: inviteLink || `${siteUrl}/login`,
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
