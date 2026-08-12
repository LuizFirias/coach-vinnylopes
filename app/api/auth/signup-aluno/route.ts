import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY || "re_dummy_key");

export async function POST(req: Request) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
      return NextResponse.json({ error: "Configuração do servidor inválida" }, { status: 500 });
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { email, password, fullName, goal } = await req.json();

    if (!email || !password || !fullName) {
      return NextResponse.json({ error: "Dados obrigatórios ausentes" }, { status: 400 });
    }

    const cleanEmail = email.trim().toLowerCase();
    const cleanGoal = typeof goal === "string" && goal.trim() ? goal.trim() : null;

    console.log("[SIGNUP-ALUNO] 🚀 Iniciando cadastro de aluno para:", cleanEmail);

    // ── 1. Verificar se o e-mail já está cadastrado ──────────────────────
    const { data: existingProfile } = await adminClient
      .from("profiles")
      .select("id, role")
      .eq("email", cleanEmail)
      .maybeSingle();

    if (existingProfile) {
      const roleLabel = existingProfile.role === "coach" ? "Personal Trainer" : "Aluno";
      return NextResponse.json(
        { error: `Este e-mail já está cadastrado como ${roleLabel}.` },
        { status: 409 }
      );
    }

    // ── 2. Criar usuário via Admin API ────────────────────────────────────
    const { data: createData, error: createError } = await adminClient.auth.admin.createUser({
      email: cleanEmail,
      password,
      email_confirm: true, // Ativa conta imediatamente
      user_metadata: {
        full_name: fullName,
        role: "aluno",
        ...(cleanGoal ? { objetivo: cleanGoal } : {}),
      },
    });

    if (createError || !createData?.user) {
      console.error("[SIGNUP-ALUNO] ❌ Erro ao criar usuário:", createError?.message);

      if (createError?.message?.toLowerCase().includes("already registered") ||
          createError?.message?.toLowerCase().includes("already exists")) {
        return NextResponse.json({ error: "Este e-mail já possui uma conta." }, { status: 409 });
      }

      return NextResponse.json(
        { error: createError?.message || "Falha ao criar conta" },
        { status: 400 }
      );
    }

    const newUserId = createData.user.id;
    console.log("[SIGNUP-ALUNO] ✓ Usuário criado no Auth. ID:", newUserId);

    // ── 3. Salvar perfil com role='aluno' e objetivo ────────────────────────
    const { error: upsertError } = await adminClient
      .from("profiles")
      .upsert(
        {
          id: newUserId,
          email: cleanEmail,
          role: "aluno",
          full_name: fullName,
          objetivo: cleanGoal,
          status_pagamento: "pago",
          arquivado: false,
        },
        { onConflict: "id", ignoreDuplicates: false }
      );

    if (upsertError) {
      console.error("[SIGNUP-ALUNO] ❌ Erro ao salvar perfil:", upsertError.message);
      // Rollback: remover o usuário criado
      await adminClient.auth.admin.deleteUser(newUserId);
      return NextResponse.json(
        { error: "Erro ao salvar dados do perfil. Tente novamente." },
        { status: 500 }
      );
    }

    console.log("[SIGNUP-ALUNO] ✓ Perfil de aluno salvo.");

    // ── 4. Enviar e-mail de boas-vindas via Resend ────────────────────────
    try {
      const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://www.auronfit.com.br";
      const goalLabel =
        cleanGoal === "cutting" ? "Emagrecimento (Definição)" :
        cleanGoal === "bulking" ? "Ganho de Massa (Hipertrofia)" :
        cleanGoal === "manutencao" ? "Manutenção de Peso" :
        cleanGoal === "recomposicao" ? "Recomposição Corporal" :
        null;

      await resend.emails.send({
        from: "Auronfit <contato@auronfit.com.br>",
        to: cleanEmail,
        subject: "Bem-vindo ao Auronfit | Painel do Aluno",
        html: `
          <div style="background-color: #09090B; color: #FAFAFA; font-family: sans-serif; padding: 40px; border-radius: 12px; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #751BB4; font-size: 28px; margin-bottom: 16px;">Bem-vindo ao Auronfit, ${fullName}!</h1>
            <p style="font-size: 16px; line-height: 1.5; color: #A1A1AA;">Sua conta de aluno/atleta foi criada com sucesso.</p>
            ${
              goalLabel
                ? `<div style="background-color: #111113; padding: 20px; border: 1px solid #27272A; border-radius: 8px; margin: 24px 0;">
              <p style="margin: 0; font-size: 14px; color: #A1A1AA;"><strong>Objetivo Inicial:</strong> ${goalLabel}</p>
            </div>`
                : ""
            }
            <p style="font-size: 14px; color: #A1A1AA; line-height: 1.5;">Acesse seu painel para começar a registrar seus treinos, cargas e ver sua dieta.</p>
            
            <div style="margin-top: 32px;">
              <a href="${siteUrl}/login" target="_blank" style="background-color: #FAFAFA; color: #09090B; padding: 12px 24px; border-radius: 8px; font-weight: bold; text-decoration: none; display: inline-block;">Acessar Plataforma</a>
            </div>
          </div>
        `,
      });
      console.log("[SIGNUP-ALUNO] ✓ E-mail de boas-vindas enviado.");
    } catch (emailErr) {
      console.warn("[SIGNUP-ALUNO] ⚠️ Falha ao enviar e-mail de boas-vindas:", emailErr);
    }

    return NextResponse.json({ success: true, userId: newUserId });
  } catch (err: unknown) {
    const errMsg = err instanceof Error ? err.message : "Erro interno do servidor";
    console.error("[SIGNUP-ALUNO] ❌ Erro interno:", err);
    return NextResponse.json({ error: errMsg }, { status: 500 });
  }
}
