import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@supabase/supabase-js";

export async function POST(req: Request) {
  try {
    // ===== 1. VALIDAÇÃO DO PAYLOAD =====
    const body = await req.json();
    const email = String(body?.email || "").trim().toLowerCase();
    const fullName = String(body?.full_name || "").trim();

    console.log("[INVITE] 📨 Requisição recebida:", { email, fullName });

    if (!email || !fullName) {
      console.error("[INVITE] ❌ Payload inválido:", { email, fullName });
      return NextResponse.json({ 
        error: "Nome e e-mail são obrigatórios" 
      }, { status: 400 });
    }

    // Validar formato de e-mail
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      console.error("[INVITE] ❌ E-mail inválido:", email);
      return NextResponse.json({ 
        error: "Formato de e-mail inválido" 
      }, { status: 400 });
    }

    // ===== 2. AUTENTICAÇÃO DO COACH =====
    const cookieStore = cookies();
    const bearer = req.headers.get("authorization") || "";
    const token = (await cookieStore).get("sv-session")?.value || bearer.replace("Bearer ", "");

    if (!token) {
      console.error("[INVITE] ❌ Token não encontrado");
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    // ===== 3. INSTANCIAR CLIENTE ADMIN =====
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
      console.error("[INVITE] ❌ Variáveis de ambiente não configuradas");
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
    const userId = authData?.user?.id;

    if (authError || !userId) {
      console.error("[INVITE] ❌ Erro de autenticação:", authError?.message);
      return NextResponse.json({ error: "Sessão inválida" }, { status: 401 });
    }

    console.log("[INVITE] ✓ Coach autenticado:", userId);

    // Verificar role do coach
    const { data: profile, error: roleError } = await adminClient
      .from("profiles")
      .select("role")
      .eq("id", userId)
      .single();

    if (roleError || profile?.role !== "coach") {
      console.error("[INVITE] ❌ Acesso negado - role:", profile?.role);
      return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
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

    console.log("[INVITE] 🎉 SUCESSO TOTAL! Aluno cadastrado:", { email, userId: newUserId });
    
    return NextResponse.json({ 
      success: true, 
      userId: newUserId,
      temporaryPassword: temporaryPassword,
      message: `Aluno ${fullName} cadastrado com sucesso! Senha temporária: ${temporaryPassword}`
    });
    
  } catch (error: any) {
    console.error("[INVITE] ❌❌❌ ERRO INESPERADO (CATCH GERAL):", {
      message: error?.message,
      name: error?.name,
      stack: error?.stack,
      fullError: JSON.stringify(error, null, 2)
    });
    
    return NextResponse.json({ 
      error: error?.message || "Erro inesperado ao processar convite",
      details: error?.message 
    }, { status: 400 });
  }
}
