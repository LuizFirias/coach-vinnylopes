import { NextResponse } from "next/server";
import * as templates from "@/lib/emailTemplates";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const template = searchParams.get("template");

    if (!template) {
      return new NextResponse(
        `
        <html>
          <head>
            <title>Auronfit Email Previews</title>
            <style>
              body { font-family: -apple-system, sans-serif; background-color: #F8F8F8; padding: 40px; }
              .container { max-width: 600px; margin: 0 auto; background: white; padding: 30px; border-radius: 12px; border: 1px solid #ECECEC; }
              h1 { font-size: 20px; font-weight: 800; color: #111; margin-bottom: 20px; }
              ul { list-style: none; padding: 0; }
              li { margin: 12px 0; }
              a { color: #D4AF37; text-decoration: none; font-weight: bold; }
              a:hover { text-decoration: underline; }
            </style>
          </head>
          <body>
            <div class="container">
              <h1>Selecione um e-mail para visualizar:</h1>
              <ul>
                <li><a href="/api/auth/preview-email?template=personal-welcome">1. Boas-vindas ao Personal</a></li>
                <li><a href="/api/auth/preview-email?template=student-welcome">2. Boas-vindas ao Aluno</a></li>
                <li><a href="/api/auth/preview-email?template=reset-personal">3. Recuperação de Senha - Personal</a></li>
                <li><a href="/api/auth/preview-email?template=reset-student">4. Recuperação de Senha - Aluno</a></li>
                <li><a href="/api/auth/preview-email?template=confirm-email">5. Confirmação de Cadastro</a></li>
                <li><a href="/api/auth/preview-email?template=student-invite">6. Convite Enviado pelo Personal</a></li>
                <li><a href="/api/auth/preview-email?template=password-changed">7. Alteração de Senha Confirmada</a></li>
                <li><a href="/api/auth/preview-email?template=subscription-confirmed">8. Assinatura Confirmada</a></li>
                <li><a href="/api/auth/preview-email?template=first-workout">9. Primeiro Treino Concluído</a></li>
                <li><a href="/api/auth/preview-email?template=first-student">10. Primeiro Aluno Cadastrado</a></li>
              </ul>
            </div>
          </body>
        </html>
        `,
        { headers: { "Content-Type": "text/html; charset=utf-8" } }
      );
    }

    let html = "";
    const siteUrl = "http://localhost:3000";

    switch (template) {
      case "personal-welcome":
        html = templates.getPersonalWelcomeEmailHtml("Luiz Firias", siteUrl);
        break;
      case "student-welcome":
        html = templates.getStudentWelcomeEmailHtml("Pedro Silva", "pedro.silva@email.com", "Mudar123!", "Luiz Firias", siteUrl);
        break;
      case "reset-personal":
        html = templates.getPersonalPasswordResetEmailHtml("Luiz Firias", "#");
        break;
      case "reset-student":
        html = templates.getStudentPasswordResetEmailHtml("Pedro Silva", "#");
        break;
      case "confirm-email":
        html = templates.getEmailConfirmationHtml("pedro.silva@email.com", "#");
        break;
      case "student-invite":
        html = templates.getStudentInviteEmailHtml("Pedro Silva", "Luiz Firias", "#");
        break;
      case "password-changed":
        html = templates.getPasswordChangedHtml("Luiz Firias", siteUrl);
        break;
      case "subscription-confirmed":
        html = templates.getSubscriptionConfirmedHtml("Luiz Firias", "Plano Pro Anual", "R$ 99,00/mês", siteUrl);
        break;
      case "first-workout":
        html = templates.getFirstWorkoutCompletedHtml("Pedro Silva", "Treino A - Hipertrofia Peitoral", siteUrl);
        break;
      case "first-student":
        html = templates.getFirstStudentRegisteredHtml("Luiz Firias", "Pedro Silva", siteUrl);
        break;
      default:
        return new NextResponse("Template não encontrado", { status: 404 });
    }

    return new NextResponse(html, {
      headers: { "Content-Type": "text/html; charset=utf-8" }
    });
  } catch (err: any) {
    return new NextResponse(err.message, { status: 500 });
  }
}
