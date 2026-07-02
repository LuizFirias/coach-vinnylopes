import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";
import { getPersonalWelcomeEmailHtml } from "@/lib/emailTemplates";

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

    const { email, password, fullName, gender, instagram, phone } = await req.json();

    if (!email || !password || !fullName) {
      return NextResponse.json({ error: "Dados obrigatórios ausentes" }, { status: 400 });
    }

    const cleanEmail = email.trim().toLowerCase();
    const cleanInsta = (instagram || "").replace("@", "").trim();

    console.log("[SIGNUP-COACH] 🚀 Iniciando cadastro de coach para:", cleanEmail);

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

    // ── 2. Criar usuário via Admin API (bypassa confirmação de e-mail) ────
    // email_confirm: true → conta ativada imediatamente, sem link do Supabase
    const { data: createData, error: createError } = await adminClient.auth.admin.createUser({
      email: cleanEmail,
      password,
      email_confirm: true, // Ativa conta imediatamente — sem e-mail de confirmação genérico
      user_metadata: {
        full_name: fullName,
        role: "coach",
        phone: phone || "",
        sexo: gender || "",
        instagram: cleanInsta,
      },
    });

    if (createError || !createData?.user) {
      console.error("[SIGNUP-COACH] ❌ Erro ao criar usuário:", createError?.message);

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
    console.log("[SIGNUP-COACH] ✓ Usuário criado no Auth. ID:", newUserId);

    // ── 3. Salvar perfil com role='coach' via Admin (bypassa RLS e trigger) ──
    const { error: upsertError } = await adminClient
      .from("profiles")
      .upsert(
        {
          id: newUserId,
          email: cleanEmail,
          role: "coach",          // ← definido com segurança no servidor
          full_name: fullName,
          sexo: gender || null,
          coaching_reference: cleanInsta || null,
          atualizado_em: new Date().toISOString(),
        },
        { onConflict: "id", ignoreDuplicates: false }
      );

    if (upsertError) {
      console.error("[SIGNUP-COACH] ❌ Erro ao salvar perfil:", upsertError.message);
      // Rollback: remover o usuário criado para não deixar conta sem perfil
      await adminClient.auth.admin.deleteUser(newUserId);
      return NextResponse.json(
        { error: "Erro ao salvar dados do perfil. Tente novamente." },
        { status: 500 }
      );
    }

    console.log("[SIGNUP-COACH] ✓ Perfil de coach salvo com role='coach'.");

    // ── 4. Enviar e-mail de boas-vindas via Resend ────────────────────────
    try {
      const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://www.auronfit.com.br";
      await resend.emails.send({
        from: "Auronfit <contato@auronfit.com.br>",
        to: cleanEmail,
        subject: "Bem-vindo ao Auronfit | Painel do Personal",
        html: getPersonalWelcomeEmailHtml(fullName, siteUrl),
      });
      console.log("[SIGNUP-COACH] ✓ E-mail de boas-vindas enviado.");
    } catch (emailErr) {
      // Não bloqueia o fluxo se o e-mail falhar
      console.warn("[SIGNUP-COACH] ⚠️ Falha ao enviar e-mail de boas-vindas:", emailErr);
    }

    return NextResponse.json({ success: true, userId: newUserId });
  } catch (err: unknown) {
    const errMsg = err instanceof Error ? err.message : "Erro interno do servidor";
    console.error("[SIGNUP-COACH] ❌ Erro interno:", err);
    return NextResponse.json({ error: errMsg }, { status: 500 });
  }
}
