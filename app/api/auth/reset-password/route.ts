import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";
import { getPasswordResetEmailHtml } from "@/lib/emailTemplates";

const resend = new Resend(process.env.RESEND_API_KEY || "re_dummy_key");

export async function POST(req: Request) {
  try {
    const { email } = await req.json();
    if (!email) return NextResponse.json({ error: "Email obrigatório" }, { status: 400 });

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const resendApiKey = process.env.RESEND_API_KEY;
    const siteUrl = "https://vinnylopescoach.site";

    if (!supabaseUrl || !serviceRoleKey || !resendApiKey) {
      return NextResponse.json({ error: "Configuração do servidor incompleta" }, { status: 500 });
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Gerar link de recuperação com redirect para /reset-password
    const { data: linkData, error: linkError } = await adminClient.auth.admin.generateLink({
      type: "recovery",
      email,
      options: { redirectTo: `${siteUrl}/reset-password` },
    });

    // Sempre retorna sucesso para não revelar se o e-mail existe
    if (linkError || !linkData?.properties?.action_link) {
      return NextResponse.json({ success: true });
    }

    const resetLink = linkData.properties.action_link;

    // Buscar nome do usuário
    const { data: profile } = await adminClient
      .from("profiles")
      .select("full_name, coaching_reference")
      .eq("email", email.toLowerCase())
      .maybeSingle();

    const fullName = profile?.coaching_reference || profile?.full_name || "Atleta";

    // Enviar e-mail com template customizado (botão dourado visível)
    await resend.emails.send({
      from: "Auronfit <noreply@vinnylopescoach.site>",
      to: email,
      subject: "Redefinição de senha — Auronfit",
      html: getPasswordResetEmailHtml(fullName, resetLink),
    });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("[RESET-PASSWORD] Erro:", err);
    // Nunca revela erro real para o cliente (segurança)
    return NextResponse.json({ success: true });
  }
}
