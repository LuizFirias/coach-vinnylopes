import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { Resend } from "resend";
import { getPasswordResetEmailHtml } from "@/lib/emailTemplates";

const resend = new Resend(process.env.RESEND_API_KEY || "re_dummy_key");

export async function POST(req: Request) {
  try {
    const { email } = await req.json();
    if (!email) return NextResponse.json({ error: "Email obrigatório" }, { status: 400 });

    const rawUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
    const supabaseUrl = rawUrl.replace(/\/rest\/v1\/?$/, '').replace(/\/$/, '');
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const resendApiKey = process.env.RESEND_API_KEY;

    // Detect site URL dynamically from origin header
    const origin = req.headers.get("origin") || "";
    const siteUrl = origin || "https://www.auronfit.com.br";

    if (!supabaseUrl || !serviceRoleKey) {
      return NextResponse.json({ error: "Configuração do servidor incompleta" }, { status: 500 });
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    let resetLink = '';
    const hasResend = resendApiKey && resendApiKey !== "re_dummy_key";

    if (hasResend) {
      try {
        // Gerar link de recuperação com redirect para /reset-password
        const { data: linkData, error: linkError } = await adminClient.auth.admin.generateLink({
          type: "recovery",
          email,
          options: { redirectTo: `${siteUrl}/reset-password` },
        });

        if (!linkError && linkData?.properties?.action_link) {
          resetLink = linkData.properties.action_link;
        }
      } catch (err) {
        console.warn("[RESET-PASSWORD] Falha ao gerar link para Resend:", err);
      }
    }

    // Se temos link de recuperação e Resend configurado, envia e-mail customizado
    if (resetLink && hasResend) {
      try {
        // Buscar nome do usuário
        const { data: profile } = await adminClient
          .from("profiles")
          .select("full_name, coaching_reference")
          .eq("email", email.toLowerCase())
          .maybeSingle();

        const fullName = profile?.coaching_reference || profile?.full_name || "Atleta";

        // Enviar e-mail com template customizado (botão dourado visível)
        await resend.emails.send({
          from: "Auronfit <contato@auronfit.com.br>",
          to: email,
          subject: "Redefinição de senha — Auronfit",
          html: getPasswordResetEmailHtml(fullName, resetLink),
        });
      } catch (emailErr) {
        console.error("[RESET-PASSWORD] Erro ao enviar por Resend, acionando fallback nativo:", emailErr);
        resetLink = ''; // Força acionamento do fallback nativo
      }
    }

    // Fallback: se Resend falhou ou não está configurado, usa o e-mail padrão do Supabase
    if (!resetLink) {
      const { error: nativeResetError } = await adminClient.auth.resetPasswordForEmail(email, {
        redirectTo: `${siteUrl}/reset-password`,
      });
      if (nativeResetError) {
        console.error("[RESET-PASSWORD] Erro no fallback nativo do Supabase:", nativeResetError);
      }
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("[RESET-PASSWORD] Erro geral:", err);
    // Sempre retorna sucesso por motivos de segurança (não vazar existência de e-mail)
    return NextResponse.json({ success: true });
  }
}
