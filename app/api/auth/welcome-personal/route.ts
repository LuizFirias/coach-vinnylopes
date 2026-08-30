import { NextResponse } from "next/server";
import { Resend } from "resend";
import { getPersonalWelcomeEmailHtml } from "@/lib/emailTemplates";

const resend = new Resend(process.env.RESEND_API_KEY || "re_dummy_key");

export async function POST(req: Request) {
  try {
    const { email, fullName } = await req.json();
    if (!email || !fullName) {
      return NextResponse.json({ error: "E-mail e nome são obrigatórios" }, { status: 400 });
    }

    const siteUrl = "https://www.vinnylopescoach.site";

    const { data, error } = await resend.emails.send({
      from: "Coach Vinny <contato@vinnylopescoach.site>",
      to: email,
      subject: "Bem-vindo ao Coach Vinny | Painel do Personal",
      html: getPersonalWelcomeEmailHtml(fullName, siteUrl),
    });

    if (error) {
      console.error("[WELCOME-PERSONAL] Erro ao enviar por Resend:", error);
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("[WELCOME-PERSONAL] Erro geral ao enviar e-mail:", err);
    return NextResponse.json({ error: err?.message || "Erro interno" }, { status: 500 });
  }
}
