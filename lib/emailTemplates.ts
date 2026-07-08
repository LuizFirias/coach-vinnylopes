// Design System de E-mails Premium - Auronfit
// Identidade Visual: Apple + Notion + Linear + Framer (Layout minimalista, fundo escuro correspondente à tela de login)

const BRAND_COLOR = "#2563EB"; // Azul refinado da marca
const BG_BASE = "#09090B"; // Fundo da tela de login (surface-0)
const BG_SURFACE = "#111113"; // Card/Surface secundário (surface-1)
const TEXT_PRIMARY = "#FAFAFA"; // Texto principal claro
const TEXT_SECONDARY = "#A1A1AA"; // Texto de apoio/muted
const BORDER_COLOR = "#27272A"; // Borda sutil

const COMPANY_HEADER = `
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="text-align: center;">
    <tr>
      <td align="center" style="padding-top: 48px; padding-bottom: 36px;">
        <img src="https://www.auronfit.com.br/logo.png" alt="Auronfit" width="160" style="display: block; margin: 0 auto; border: none; outline: none; text-decoration: none;" />
      </td>
    </tr>
  </table>
`;

const COMPANY_FOOTER = (unsubUrl?: string) => `
  <!-- Linha Divisória de 48px -->
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin-top: 48px; margin-bottom: 48px;">
    <tr>
      <td style="border-top: 1px solid ${BORDER_COLOR}; height: 1px;"></td>
    </tr>
  </table>

  <!-- Bloco de Ajuda / Suporte -->
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin-bottom: 40px; text-align: left;">
    <tr>
      <td>
        <p style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 15px; font-weight: 600; color: ${TEXT_PRIMARY}; margin: 0 0 6px 0;">
          Precisa de ajuda?
        </p>
        <p style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 14px; color: ${TEXT_SECONDARY}; margin: 0 0 12px 0; line-height: 1.4;">
          Nossa equipe está pronta para ajudar a qualquer momento.
        </p>
        <a href="https://www.auronfit.com.br/ajuda" style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 14px; font-weight: bold; color: ${BRAND_COLOR}; text-decoration: none; border-bottom: 1px solid ${BRAND_COLOR}; padding-bottom: 1px;">
          Central de ajuda &rarr;
        </a>
      </td>
    </tr>
  </table>

  <!-- Divisor e Copyright -->
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="border-top: 1px solid ${BORDER_COLOR}; padding-top: 24px; text-align: left;">
    <tr>
      <td>
        <p style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 11px; color: ${TEXT_SECONDARY}; line-height: 1.6; margin: 0;">
          © 2026 AuronFit.
        </p>
        <p style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 10px; color: #71717A; line-height: 1.6; margin: 4px 0 0 0;">
          Este é um e-mail automático enviado pela plataforma Auronfit.
          ${unsubUrl ? `<br/><a href="${unsubUrl}" style="color: #71717A; text-decoration: underline;">Descadastrar e-mails</a>` : ""}
        </p>
      </td>
    </tr>
  </table>
`;

// Wrapper base para e-mails responsivos, limpos e com fundo dark premium
function wrapEmailTemplate(content: string, unsubUrl?: string): string {
  return `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Auronfit</title>
</head>
<body style="margin: 0; padding: 0; background-color: ${BG_BASE}; color: ${TEXT_PRIMARY}; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; -webkit-font-smoothing: antialiased;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: ${BG_BASE};">
    <tr>
      <td align="center" style="padding: 0 24px;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width: 560px; background-color: ${BG_BASE}; text-align: left;">
          <tr>
            <td>
              ${COMPANY_HEADER}
              ${content}
              ${COMPANY_FOOTER(unsubUrl)}
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;
}

// 1. Boas-vindas ao Personal (Administrador)
export const getPersonalWelcomeEmailHtml = (fullName: string, siteUrl: string) => {
  const content = `
  <!-- Small Badge -->
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin-bottom: 20px;">
    <tr>
      <td style="background-color: ${BG_SURFACE}; border: 1px solid ${BORDER_COLOR}; border-radius: 999px; padding: 6px 12px;">
        <span style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 10px; font-weight: 600; color: ${TEXT_SECONDARY}; text-transform: uppercase; letter-spacing: 1px;">
          PLATAFORMA ATIVADA
        </span>
      </td>
    </tr>
  </table>

  <!-- Headline -->
  <h1 style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 36px; font-weight: 700; color: ${TEXT_PRIMARY}; letter-spacing: -0.5px; margin: 0 0 12px 0; line-height: 1.2;">
    Bem-vindo ao Auron.
  </h1>
  <!-- Subheadline -->
  <p style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 20px; font-weight: 400; color: ${TEXT_SECONDARY}; margin: 0 0 40px 0; line-height: 1.5;">
    Tudo pronto. Agora você possui uma plataforma completa para gerenciar seus alunos e evoluir sua consultoria.
  </p>

  <!-- Hero Mockup Placeholder -->
  <div style="background-color: ${BG_SURFACE}; border: 1px solid ${BORDER_COLOR}; border-radius: 20px; padding: 120px 20px; text-align: center; margin: 30px 0; box-shadow: 0 4px 20px rgba(0,0,0,0.02);">
    <div style="display: inline-block; border: 1px dashed ${BRAND_COLOR}; border-radius: 8px; padding: 12px 24px; background-color: ${BG_BASE};">
      <span style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 11px; font-weight: bold; color: ${BRAND_COLOR}; letter-spacing: 2px; text-transform: uppercase;">
        [ Mockup MacBook + iPhone - Dashboard Coach ]
      </span>
    </div>
  </div>

  <!-- Botão Principal Premium -->
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin: 40px 0;">
    <tr>
      <td align="left">
        <a href="${siteUrl}/login" target="_blank" style="background-color: ${TEXT_PRIMARY}; color: ${BG_BASE}; height: 52px; line-height: 52px; min-width: 220px; text-decoration: none; border-radius: 14px; font-weight: bold; display: inline-block; font-size: 14px; text-align: center; letter-spacing: 0.5px; box-shadow: 0 4px 12px rgba(0,0,0,0.08);">
          Entrar no Painel
        </a>
      </td>
    </tr>
  </table>

  <!-- Benefícios como Retângulos Limpos (Sem Emojis, Ícones SVG) -->
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin-top: 40px; margin-bottom: 20px;">
    <tr>
      <td style="padding-bottom: 16px;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: ${BG_SURFACE}; border: 1px solid ${BORDER_COLOR}; border-radius: 16px; padding: 20px;">
          <tr>
            <td width="48" valign="top" style="padding-top: 2px;">
              <!-- Users Icon -->
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="${BRAND_COLOR}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
            </td>
            <td>
              <h4 style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; font-size: 18px; font-weight: 600; color: ${TEXT_PRIMARY}; margin: 0 0 4px 0;">Cadastre alunos</h4>
              <p style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; font-size: 15px; color: ${TEXT_SECONDARY}; margin: 0; line-height: 1.4;">Gerencie toda sua base em um único lugar.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
    <tr>
      <td style="padding-bottom: 16px;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: ${BG_SURFACE}; border: 1px solid ${BORDER_COLOR}; border-radius: 16px; padding: 20px;">
          <tr>
            <td width="48" valign="top" style="padding-top: 2px;">
              <!-- Dumbbell Icon -->
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="${BRAND_COLOR}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m6.5 6.5 11 11M21 21l-3-3M3 3l3 3M18.5 5.5l3 3-3-3ZM5.5 18.5l-3 3 3-3ZM15 4.5l4.5 4.5M4.5 15l4.5 4.5"/></svg>
            </td>
            <td>
              <h4 style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; font-size: 18px; font-weight: 600; color: ${TEXT_PRIMARY}; margin: 0 0 4px 0;">Monte treinos</h4>
              <p style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; font-size: 15px; color: ${TEXT_SECONDARY}; margin: 0; line-height: 1.4;">Crie protocolos completos em poucos minutos.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
    <tr>
      <td>
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: ${BG_SURFACE}; border: 1px solid ${BORDER_COLOR}; border-radius: 16px; padding: 20px;">
          <tr>
            <td width="48" valign="top" style="padding-top: 2px;">
              <!-- Chart Icon -->
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="${BRAND_COLOR}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 3v18h18"/><path d="m19 9-5 5-4-4-3 3"/></svg>
            </td>
            <td>
              <h4 style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; font-size: 18px; font-weight: 600; color: ${TEXT_PRIMARY}; margin: 0 0 4px 0;">Acompanhe evolução</h4>
              <p style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; font-size: 15px; color: ${TEXT_SECONDARY}; margin: 0; line-height: 1.4;">Peso, medidas e desempenho em tempo real.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>

  <!-- Próximo Passo Bloco Estruturado -->
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: ${BG_SURFACE}; border: 1px solid ${BORDER_COLOR}; border-radius: 16px; padding: 24px; margin-top: 32px; text-align: left;">
    <tr>
      <td>
        <h5 style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; font-size: 15px; font-weight: 600; color: ${TEXT_PRIMARY}; margin: 0 0 6px 0;">Próximo passo</h5>
        <p style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; font-size: 14px; color: ${TEXT_SECONDARY}; margin: 0 0 16px 0; line-height: 1.4;">Entre no painel e cadastre seu primeiro aluno. Leva menos de 2 minutos.</p>
        <a href="${siteUrl}/login" style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; font-size: 14px; font-weight: bold; color: ${BRAND_COLOR}; text-decoration: none;">
          Entrar no Dashboard &rarr;
        </a>
      </td>
    </tr>
  </table>
  `;
  return wrapEmailTemplate(content);
};

// 2. Boas-vindas ao Aluno
export const getStudentWelcomeEmailHtml = (fullName: string, email: string, temporaryPassword: string, coachName: string, siteUrl: string) => {
  const content = `
  <!-- Small Badge -->
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin-bottom: 20px;">
    <tr>
      <td style="background-color: ${BG_SURFACE}; border: 1px solid ${BORDER_COLOR}; border-radius: 999px; padding: 6px 12px;">
        <span style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 10px; font-weight: 600; color: ${TEXT_SECONDARY}; text-transform: uppercase; letter-spacing: 1px;">
          TREINAMENTO INICIADO
        </span>
      </td>
    </tr>
  </table>

  <!-- Headline -->
  <h1 style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 36px; font-weight: 700; color: ${TEXT_PRIMARY}; letter-spacing: -0.5px; margin: 0 0 12px 0; line-height: 1.2;">
    Olá, ${fullName}.
  </h1>
  <!-- Subheadline -->
  <p style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 20px; font-weight: 400; color: ${TEXT_SECONDARY}; margin: 0 0 40px 0; line-height: 1.5;">
    Seu treinador <strong>${coachName}</strong> acabou de criar sua conta no Auron.
  </p>

  <!-- Hero Mockup Placeholder -->
  <div style="background-color: ${BG_SURFACE}; border: 1px solid ${BORDER_COLOR}; border-radius: 20px; padding: 120px 20px; text-align: center; margin: 30px 0; box-shadow: 0 4px 20px rgba(0,0,0,0.02);">
    <div style="display: inline-block; border: 1px dashed ${BRAND_COLOR}; border-radius: 8px; padding: 12px 24px; background-color: ${BG_BASE};">
      <span style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 11px; font-weight: bold; color: ${BRAND_COLOR}; letter-spacing: 2px; text-transform: uppercase;">
        [ Mockup iPhone Floating - Tela Aluno ]
      </span>
    </div>
  </div>

  <!-- Credentials Card -->
  <div style="background-color: ${BG_SURFACE}; border: 1px solid ${BORDER_COLOR}; border-radius: 16px; padding: 20px; margin: 30px 0;">
    <p style="margin: 0 0 10px 0; font-size: 11px; color: ${TEXT_SECONDARY}; font-weight: bold; text-transform: uppercase; letter-spacing: 1px;">Dados de Acesso:</p>
    <p style="margin: 4px 0; font-size: 14px; color: ${TEXT_PRIMARY}; font-family: -apple-system, BlinkMacSystemFont, sans-serif;"><strong>E-mail:</strong> ${email}</p>
    <p style="margin: 4px 0; font-size: 14px; color: ${TEXT_PRIMARY}; font-family: -apple-system, BlinkMacSystemFont, sans-serif;"><strong>Senha Temporária:</strong> <span style="background-color: ${BG_BASE}; border: 1px solid ${BORDER_COLOR}; padding: 2px 6px; border-radius: 4px; color: ${BRAND_COLOR}; font-family: monospace; font-size: 13px; font-weight: bold;">${temporaryPassword}</span></p>
  </div>

  <!-- Button CTA -->
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin: 30px 0;">
    <tr>
      <td align="left">
        <a href="${siteUrl}/login" target="_blank" style="background-color: ${TEXT_PRIMARY}; color: ${BG_BASE}; height: 52px; line-height: 52px; min-width: 220px; text-decoration: none; border-radius: 14px; font-weight: bold; display: inline-block; font-size: 14px; text-align: center; letter-spacing: 0.5px;">
          Começar Agora
        </a>
      </td>
    </tr>
  </table>

  <!-- Divider -->
  <hr style="border: 0; border-top: 1px solid ${BORDER_COLOR}; margin: 30px 0;" />

  <h4 style="font-family: -apple-system, BlinkMacSystemFont, sans-serif; font-size: 16px; font-weight: 700; color: ${TEXT_PRIMARY}; margin: 0 0 16px 0;">Você terá acesso a:</h4>
  <!-- Cards de Recursos -->
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin: 20px 0;">
    <tr>
      <td style="padding-bottom: 12px;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: ${BG_SURFACE}; border: 1px solid ${BORDER_COLOR}; border-radius: 16px; padding: 18px;">
          <tr>
            <td width="40" valign="top">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="${BRAND_COLOR}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m6.5 6.5 11 11M21 21l-3-3M3 3l3 3M18.5 5.5l3 3-3-3ZM5.5 18.5l-3 3 3-3ZM15 4.5l4.5 4.5M4.5 15l4.5 4.5"/></svg>
            </td>
            <td>
              <h5 style="font-family: -apple-system, BlinkMacSystemFont, sans-serif; font-size: 15px; font-weight: 600; color: ${TEXT_PRIMARY}; margin: 0 0 2px 0;">Treinos</h5>
              <p style="font-family: -apple-system, BlinkMacSystemFont, sans-serif; font-size: 13px; color: ${TEXT_SECONDARY}; margin: 0;">Fichas dinâmicas com vídeos e cronômetro.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
    <tr>
      <td style="padding-bottom: 12px;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: ${BG_SURFACE}; border: 1px solid ${BORDER_COLOR}; border-radius: 16px; padding: 18px;">
          <tr>
            <td width="40" valign="top">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="${BRAND_COLOR}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 3v18h18"/><path d="m19 9-5 5-4-4-3 3"/></svg>
            </td>
            <td>
              <h5 style="font-family: -apple-system, BlinkMacSystemFont, sans-serif; font-size: 15px; font-weight: 600; color: ${TEXT_PRIMARY}; margin: 0 0 2px 0;">Evolução</h5>
              <p style="font-family: -apple-system, BlinkMacSystemFont, sans-serif; font-size: 13px; color: ${TEXT_SECONDARY}; margin: 0;">Gráficos de progresso físico, fotos e medidas.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
    <tr>
      <td>
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: ${BG_SURFACE}; border: 1px solid ${BORDER_COLOR}; border-radius: 16px; padding: 18px;">
          <tr>
            <td width="40" valign="top">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="${BRAND_COLOR}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
            </td>
            <td>
              <h5 style="font-family: -apple-system, BlinkMacSystemFont, sans-serif; font-size: 15px; font-weight: 600; color: ${TEXT_PRIMARY}; margin: 0 0 2px 0;">Hábitos</h5>
              <p style="font-family: -apple-system, BlinkMacSystemFont, sans-serif; font-size: 13px; color: ${TEXT_SECONDARY}; margin: 0;">Checklists diários e streaks de consistência.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
  `;
  return wrapEmailTemplate(content);
};

// 3. Recuperação de Senha - Personal
export const getPersonalPasswordResetEmailHtml = (fullName: string, resetLink: string) => {
  const content = `
  <!-- Small Badge -->
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin-bottom: 20px;">
    <tr>
      <td style="background-color: ${BG_SURFACE}; border: 1px solid ${BORDER_COLOR}; border-radius: 999px; padding: 6px 12px;">
        <span style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 10px; font-weight: 600; color: ${TEXT_SECONDARY}; text-transform: uppercase; letter-spacing: 1px;">
          SEGURANÇA DA CONTA
        </span>
      </td>
    </tr>
  </table>

  <!-- Headline -->
  <h1 style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 36px; font-weight: 700; color: ${TEXT_PRIMARY}; letter-spacing: -0.5px; margin: 0 0 12px 0; line-height: 1.2;">
    Redefinição de senha
  </h1>
  <!-- Subheadline -->
  <p style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 20px; font-weight: 400; color: ${TEXT_SECONDARY}; margin: 0 0 40px 0; line-height: 1.5;">
    Olá Coach ${fullName}, você solicitou redefinir a senha do seu painel profissional no Auron.
  </p>

  <!-- Illustration Cadeado -->
  <div style="background-color: ${BG_SURFACE}; border: 1px solid ${BORDER_COLOR}; border-radius: 20px; padding: 60px 20px; text-align: center; margin: 30px 0;">
    <div style="display: inline-block; border: 1px dashed ${BORDER_COLOR}; border-radius: 50%; width: 64px; height: 64px; line-height: 64px; background-color: ${BG_BASE}; text-align: center; box-shadow: 0 4px 12px rgba(0,0,0,0.01);">
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="${BRAND_COLOR}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display: inline-block; vertical-align: middle; margin-top: -3px;"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
    </div>
  </div>

  <!-- CTA Button -->
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin: 30px 0;">
    <tr>
      <td align="left">
        <a href="${resetLink}" target="_blank" style="background-color: ${TEXT_PRIMARY}; color: ${BG_BASE}; height: 52px; line-height: 52px; min-width: 220px; text-decoration: none; border-radius: 14px; font-weight: bold; display: inline-block; font-size: 14px; text-align: center; letter-spacing: 0.5px;">
          Redefinir senha
        </a>
      </td>
    </tr>
  </table>

  <!-- Expiry message -->
  <p style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 13px; color: ${TEXT_SECONDARY}; margin: 30px 0 0 0; line-height: 1.5;">
    Esse link expira em 60 minutos. Se você não fez essa solicitação, ignore este e-mail.
  </p>
  `;
  return wrapEmailTemplate(content);
};

// 3b. Recuperação de Senha - Aluno
export const getStudentPasswordResetEmailHtml = (fullName: string, resetLink: string) => {
  const content = `
  <!-- Small Badge -->
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin-bottom: 20px;">
    <tr>
      <td style="background-color: ${BG_SURFACE}; border: 1px solid ${BORDER_COLOR}; border-radius: 999px; padding: 6px 12px;">
        <span style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 10px; font-weight: 600; color: ${TEXT_SECONDARY}; text-transform: uppercase; letter-spacing: 1px;">
          SEGURANÇA DA CONTA
        </span>
      </td>
    </tr>
  </table>

  <!-- Headline -->
  <h1 style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 36px; font-weight: 700; color: ${TEXT_PRIMARY}; letter-spacing: -0.5px; margin: 0 0 12px 0; line-height: 1.2;">
    Redefinição de senha
  </h1>
  <!-- Subheadline -->
  <p style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 20px; font-weight: 400; color: ${TEXT_SECONDARY}; margin: 0 0 40px 0; line-height: 1.5;">
    Olá ${fullName}, você solicitou redefinir a senha do seu aplicativo de treinos no Auron.
  </p>

  <!-- Illustration Cadeado -->
  <div style="background-color: ${BG_SURFACE}; border: 1px solid ${BORDER_COLOR}; border-radius: 20px; padding: 60px 20px; text-align: center; margin: 30px 0;">
    <div style="display: inline-block; border: 1px dashed ${BORDER_COLOR}; border-radius: 50%; width: 64px; height: 64px; line-height: 64px; background-color: ${BG_BASE}; text-align: center; box-shadow: 0 4px 12px rgba(0,0,0,0.01);">
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="${BRAND_COLOR}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display: inline-block; vertical-align: middle; margin-top: -3px;"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
    </div>
  </div>

  <!-- CTA Button -->
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin: 30px 0;">
    <tr>
      <td align="left">
        <a href="${resetLink}" target="_blank" style="background-color: ${TEXT_PRIMARY}; color: ${BG_BASE}; height: 52px; line-height: 52px; min-width: 220px; text-decoration: none; border-radius: 14px; font-weight: bold; display: inline-block; font-size: 14px; text-align: center; letter-spacing: 0.5px;">
          Redefinir senha
        </a>
      </td>
    </tr>
  </table>

  <!-- Expiry message -->
  <p style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 13px; color: ${TEXT_SECONDARY}; margin: 30px 0 0 0; line-height: 1.5;">
    Esse link expira em 60 minutos. Se você não fez essa solicitação, ignore este e-mail.
  </p>
  `;
  return wrapEmailTemplate(content);
};

// 4. Confirmação de Cadastro (Email Confirmation)
export const getEmailConfirmationHtml = (email: string, confirmLink: string) => {
  const content = `
  <!-- Small Badge -->
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin-bottom: 20px;">
    <tr>
      <td style="background-color: ${BG_SURFACE}; border: 1px solid ${BORDER_COLOR}; border-radius: 999px; padding: 6px 12px;">
        <span style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 10px; font-weight: 600; color: ${TEXT_SECONDARY}; text-transform: uppercase; letter-spacing: 1px;">
          CONFIRMAÇÃO DE E-MAIL
        </span>
      </td>
    </tr>
  </table>

  <!-- Headline -->
  <h1 style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 36px; font-weight: 700; color: ${TEXT_PRIMARY}; letter-spacing: -0.5px; margin: 0 0 12px 0; line-height: 1.2;">
    Conta criada
  </h1>
  <!-- Subheadline -->
  <p style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 20px; font-weight: 400; color: ${TEXT_SECONDARY}; margin: 0 0 40px 0; line-height: 1.5;">
    Tudo pronto. Clique abaixo para confirmar seu email <strong>${email}</strong> e ativar sua conta.
  </p>

  <!-- Login Mockup Placeholder -->
  <div style="background-color: ${BG_SURFACE}; border: 1px solid ${BORDER_COLOR}; border-radius: 20px; padding: 80px 20px; text-align: center; margin: 30px 0; box-shadow: 0 4px 20px rgba(0,0,0,0.01);">
    <div style="display: inline-block; border: 1px dashed ${BORDER_COLOR}; border-radius: 8px; padding: 12px 24px; background-color: ${BG_BASE};">
      <span style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 11px; font-weight: bold; color: ${TEXT_SECONDARY}; letter-spacing: 2px; text-transform: uppercase;">
        [ Mockup Tela de Login ]
      </span>
    </div>
  </div>

  <!-- CTA Button -->
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin: 30px 0;">
    <tr>
      <td align="left">
        <a href="${confirmLink}" target="_blank" style="background-color: ${TEXT_PRIMARY}; color: ${BG_BASE}; height: 52px; line-height: 52px; min-width: 220px; text-decoration: none; border-radius: 14px; font-weight: bold; display: inline-block; font-size: 14px; text-align: center; letter-spacing: 0.5px;">
          Confirmar e-mail
        </a>
      </td>
    </tr>
  </table>
  `;
  return wrapEmailTemplate(content);
};

// 5. Convite enviado pelo Personal
export const getStudentInviteEmailHtml = (fullName: string, coachName: string, actionLink: string) => {
  const content = `
  <!-- Small Badge -->
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin-bottom: 20px;">
    <tr>
      <td style="background-color: ${BG_SURFACE}; border: 1px solid ${BORDER_COLOR}; border-radius: 999px; padding: 6px 12px;">
        <span style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 10px; font-weight: 600; color: ${TEXT_SECONDARY}; text-transform: uppercase; letter-spacing: 1px;">
          CONVITE RECEBIDO
        </span>
      </td>
    </tr>
  </table>

  <!-- Headline -->
  <h1 style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 36px; font-weight: 700; color: ${TEXT_PRIMARY}; letter-spacing: -0.5px; margin: 0 0 12px 0; line-height: 1.2;">
    Convite de treino
  </h1>
  <!-- Subheadline -->
  <p style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 20px; font-weight: 400; color: ${TEXT_SECONDARY}; margin: 0 0 40px 0; line-height: 1.5;">
    <strong>${coachName}</strong> convidou você, ${fullName}, para treinar no time de consultoria do Auron.
  </p>

  <!-- Mockup Placeholder -->
  <div style="background-color: ${BG_SURFACE}; border: 1px solid ${BORDER_COLOR}; border-radius: 20px; padding: 100px 20px; text-align: center; margin: 30px 0; box-shadow: 0 4px 20px rgba(0,0,0,0.02);">
    <div style="display: inline-block; border: 1px dashed ${BRAND_COLOR}; border-radius: 8px; padding: 12px 24px; background-color: ${BG_BASE};">
      <span style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 11px; font-weight: bold; color: ${BRAND_COLOR}; letter-spacing: 2px; text-transform: uppercase;">
        [ Mockup iPhone - Convite de ${coachName} ]
      </span>
    </div>
  </div>

  <p style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 15px; font-weight: 600; color: ${TEXT_PRIMARY}; margin: 24px 0 12px 0;">
    Sua consultoria premium inclui:
  </p>
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin: 15px 0;">
    <tr>
      <td style="padding-bottom: 12px;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: ${BG_SURFACE}; border: 1px solid ${BORDER_COLOR}; border-radius: 16px; padding: 18px;">
          <tr>
            <td width="40" valign="top">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="${BRAND_COLOR}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m6.5 6.5 11 11M21 21l-3-3M3 3l3 3M18.5 5.5l3 3-3-3ZM5.5 18.5l-3 3 3-3ZM15 4.5l4.5 4.5M4.5 15l4.5 4.5"/></svg>
            </td>
            <td>
              <h5 style="font-family: -apple-system, BlinkMacSystemFont, sans-serif; font-size: 15px; font-weight: 600; color: ${TEXT_PRIMARY}; margin: 0 0 2px 0;">Treinos personalizados</h5>
              <p style="font-family: -apple-system, BlinkMacSystemFont, sans-serif; font-size: 13px; color: ${TEXT_SECONDARY}; margin: 0;">Protocolos de treinamento específicos para sua meta.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
    <tr>
      <td style="padding-bottom: 12px;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: ${BG_SURFACE}; border: 1px solid ${BORDER_COLOR}; border-radius: 16px; padding: 18px;">
          <tr>
            <td width="40" valign="top">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="${BRAND_COLOR}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 3v18h18"/><path d="m19 9-5 5-4-4-3 3"/></svg>
            </td>
            <td>
              <h5 style="font-family: -apple-system, BlinkMacSystemFont, sans-serif; font-size: 15px; font-weight: 600; color: ${TEXT_PRIMARY}; margin: 0 0 2px 0;">Metas e hábitos</h5>
              <p style="font-family: -apple-system, BlinkMacSystemFont, sans-serif; font-size: 13px; color: ${TEXT_SECONDARY}; margin: 0;">Checklist diário e monitoramento de consistência.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
    <tr>
      <td>
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: ${BG_SURFACE}; border: 1px solid ${BORDER_COLOR}; border-radius: 16px; padding: 18px;">
          <tr>
            <td width="40" valign="top">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="${BRAND_COLOR}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
            </td>
            <td>
              <h5 style="font-family: -apple-system, BlinkMacSystemFont, sans-serif; font-size: 15px; font-weight: 600; color: ${TEXT_PRIMARY}; margin: 0 0 2px 0;">Avaliações e agenda</h5>
              <p style="font-family: -apple-system, BlinkMacSystemFont, sans-serif; font-size: 13px; color: ${TEXT_SECONDARY}; margin: 0;">Histórico completo de avaliações físicas e calendário.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>

  <!-- CTA Button -->
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin: 30px 0;">
    <tr>
      <td align="left">
        <a href="${actionLink}" target="_blank" style="background-color: ${TEXT_PRIMARY}; color: ${BG_BASE}; height: 52px; line-height: 52px; min-width: 220px; text-decoration: none; border-radius: 14px; font-weight: bold; display: inline-block; font-size: 14px; text-align: center; letter-spacing: 0.5px;">
          Aceitar convite
        </a>
      </td>
    </tr>
  </table>
  `;
  return wrapEmailTemplate(content);
};

// 6. Alteração de senha confirmada
export const getPasswordChangedHtml = (fullName: string, siteUrl: string) => {
  const content = `
  <!-- Small Badge -->
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin-bottom: 20px;">
    <tr>
      <td style="background-color: ${BG_SURFACE}; border: 1px solid ${BORDER_COLOR}; border-radius: 999px; padding: 6px 12px;">
        <span style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 10px; font-weight: 600; color: ${TEXT_SECONDARY}; text-transform: uppercase; letter-spacing: 1px;">
          SEGURANÇA DA CONTA
        </span>
      </td>
    </tr>
  </table>

  <!-- Headline -->
  <h1 style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 36px; font-weight: 700; color: ${TEXT_PRIMARY}; letter-spacing: -0.5px; margin: 0 0 12px 0; line-height: 1.2;">
    Senha alterada
  </h1>
  <!-- Subheadline -->
  <p style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 20px; font-weight: 400; color: ${TEXT_SECONDARY}; margin: 0 0 40px 0; line-height: 1.5;">
    Olá ${fullName}, sua senha da plataforma Auronfit foi redefinida com sucesso.
  </p>

  <div style="background-color: ${BG_SURFACE}; border: 1px solid ${BORDER_COLOR}; border-radius: 16px; padding: 20px; margin: 30px 0; text-align: left;">
    <p style="margin: 0; font-size: 14px; color: ${TEXT_SECONDARY}; line-height: 1.6; font-family: -apple-system, sans-serif;">
      Se foi você quem realizou essa redefinição, nenhuma ação adicional é necessária. Caso contrário, entre em contato imediatamente com o suporte.
    </p>
  </div>

  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin: 30px 0;">
    <tr>
      <td align="left">
        <a href="${siteUrl}/login" target="_blank" style="background-color: ${TEXT_PRIMARY}; color: ${BG_BASE}; height: 52px; line-height: 52px; min-width: 220px; text-decoration: none; border-radius: 14px; font-weight: bold; display: inline-block; font-size: 14px; text-align: center; letter-spacing: 0.5px;">
          Ir para a Plataforma
        </a>
      </td>
    </tr>
  </table>
  `;
  return wrapEmailTemplate(content);
};

// 7. Assinatura ou pagamento confirmado
export const getSubscriptionConfirmedHtml = (fullName: string, planName: string, price: string, siteUrl: string) => {
  const content = `
  <!-- Small Badge -->
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin-bottom: 20px;">
    <tr>
      <td style="background-color: ${BG_SURFACE}; border: 1px solid ${BORDER_COLOR}; border-radius: 999px; padding: 6px 12px;">
        <span style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 10px; font-weight: 600; color: ${TEXT_SECONDARY}; text-transform: uppercase; letter-spacing: 1px;">
          ASSINATURA ATIVA
        </span>
      </td>
    </tr>
  </table>

  <!-- Headline -->
  <h1 style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 36px; font-weight: 700; color: ${TEXT_PRIMARY}; letter-spacing: -0.5px; margin: 0 0 12px 0; line-height: 1.2;">
    Pagamento confirmado!
  </h1>
  <!-- Subheadline -->
  <p style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 20px; font-weight: 400; color: ${TEXT_SECONDARY}; margin: 0 0 40px 0; line-height: 1.5;">
    Olá Coach ${fullName}, o pagamento da sua consultoria profissional Auronfit foi processado com sucesso.
  </p>

  <!-- Summary Card -->
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: ${BG_SURFACE}; border: 1px solid ${BORDER_COLOR}; border-radius: 16px; margin: 30px 0;">
    <tr>
      <td style="padding: 24px;">
        <p style="margin: 0 0 12px 0; color: ${BRAND_COLOR}; font-weight: bold; text-transform: uppercase; font-size: 11px; letter-spacing: 1px;">Resumo da Assinatura:</p>
        <p style="margin: 4px 0; font-size: 14px; color: ${TEXT_PRIMARY}; font-family: -apple-system, sans-serif;"><strong>Plano:</strong> ${planName}</p>
        <p style="margin: 4px 0; font-size: 14px; color: ${TEXT_PRIMARY}; font-family: -apple-system, sans-serif;"><strong>Valor:</strong> ${price}</p>
        <p style="margin: 4px 0; font-size: 14px; color: ${TEXT_PRIMARY}; font-family: -apple-system, sans-serif;"><strong>Status:</strong> Ativo</p>
      </td>
    </tr>
  </table>

  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin: 30px 0;">
    <tr>
      <td align="left">
        <a href="${siteUrl}/admin/dashboard" target="_blank" style="background-color: ${TEXT_PRIMARY}; color: ${BG_BASE}; height: 52px; line-height: 52px; min-width: 220px; text-decoration: none; border-radius: 14px; font-weight: bold; display: inline-block; font-size: 14px; text-align: center; letter-spacing: 0.5px;">
          Entrar no Dashboard
        </a>
      </td>
    </tr>
  </table>
  `;
  return wrapEmailTemplate(content);
};

// 8. Primeiro treino concluído (Celebração do Aluno)
export const getFirstWorkoutCompletedHtml = (fullName: string, workoutName: string, siteUrl: string) => {
  const content = `
  <!-- Small Badge -->
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin-bottom: 20px;">
    <tr>
      <td style="background-color: ${BG_SURFACE}; border: 1px solid ${BORDER_COLOR}; border-radius: 999px; padding: 6px 12px;">
        <span style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 10px; font-weight: 600; color: ${TEXT_SECONDARY}; text-transform: uppercase; letter-spacing: 1px;">
          CONQUISTA DE TREINO
        </span>
      </td>
    </tr>
  </table>

  <!-- Headline -->
  <h1 style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 36px; font-weight: 700; color: ${TEXT_PRIMARY}; letter-spacing: -0.5px; margin: 0 0 12px 0; line-height: 1.2;">
    Primeiro treino feito! 🔥
  </h1>
  <!-- Subheadline -->
  <p style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 20px; font-weight: 400; color: ${TEXT_SECONDARY}; margin: 0 0 40px 0; line-height: 1.5;">
    Parabéns ${fullName}, você concluiu sua primeira rotina prescrita: <strong>${workoutName}</strong>.
  </p>

  <!-- Celebration Mockup Placeholder -->
  <div style="background-color: ${BG_SURFACE}; border: 1px solid ${BORDER_COLOR}; border-radius: 20px; padding: 100px 20px; text-align: center; margin: 30px 0; box-shadow: 0 4px 20px rgba(0,0,0,0.02);">
    <div style="display: inline-block; border: 1px dashed ${BRAND_COLOR}; border-radius: 8px; padding: 12px 24px; background-color: ${BG_BASE};">
      <span style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 11px; font-weight: bold; color: ${BRAND_COLOR}; letter-spacing: 2px; text-transform: uppercase;">
        [ Mockup Share Card - Evolução & Treino ]
      </span>
    </div>
  </div>

  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin: 30px 0;">
    <tr>
      <td align="left">
        <a href="${siteUrl}/aluno/dashboard" target="_blank" style="background-color: ${TEXT_PRIMARY}; color: ${BG_BASE}; height: 52px; line-height: 52px; min-width: 220px; text-decoration: none; border-radius: 14px; font-weight: bold; display: inline-block; font-size: 14px; text-align: center; letter-spacing: 0.5px;">
          Ver Meu Histórico
        </a>
      </td>
    </tr>
  </table>
  `;
  return wrapEmailTemplate(content);
};

// 9. Primeiro aluno cadastrado (Celebração do Coach)
export const getFirstStudentRegisteredHtml = (coachName: string, studentName: string, siteUrl: string) => {
  const content = `
  <!-- Small Badge -->
  <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin-bottom: 20px;">
    <tr>
      <td style="background-color: ${BG_SURFACE}; border: 1px solid ${BORDER_COLOR}; border-radius: 999px; padding: 6px 12px;">
        <span style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 10px; font-weight: 600; color: ${TEXT_SECONDARY}; text-transform: uppercase; letter-spacing: 1px;">
          CONQUISTA DE NEGÓCIO
        </span>
      </td>
    </tr>
  </table>

  <!-- Headline -->
  <h1 style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 36px; font-weight: 700; color: ${TEXT_PRIMARY}; letter-spacing: -0.5px; margin: 0 0 12px 0; line-height: 1.2;">
    Seu primeiro aluno! 🚀
  </h1>
  <!-- Subheadline -->
  <p style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 20px; font-weight: 400; color: ${TEXT_SECONDARY}; margin: 0 0 40px 0; line-height: 1.5;">
    Parabéns Coach ${coachName}, você acaba de cadastrar seu primeiro atleta na plataforma: <strong>${studentName}</strong>.
  </p>

  <!-- Coach metrics mockup placeholder -->
  <div style="background-color: ${BG_SURFACE}; border: 1px solid ${BORDER_COLOR}; border-radius: 20px; padding: 100px 20px; text-align: center; margin: 30px 0; box-shadow: 0 4px 20px rgba(0,0,0,0.02);">
    <div style="display: inline-block; border: 1px dashed ${BRAND_COLOR}; border-radius: 8px; padding: 12px 24px; background-color: ${BG_BASE};">
      <span style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 11px; font-weight: bold; color: ${BRAND_COLOR}; letter-spacing: 2px; text-transform: uppercase;">
        [ Mockup Painel - 1 Aluno Ativo / Gráficos ]
      </span>
    </div>
  </div>

  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin: 30px 0;">
    <tr>
      <td align="left">
        <a href="${siteUrl}/admin/dashboard" target="_blank" style="background-color: ${TEXT_PRIMARY}; color: ${BG_BASE}; height: 52px; line-height: 52px; min-width: 220px; text-decoration: none; border-radius: 14px; font-weight: bold; display: inline-block; font-size: 14px; text-align: center; letter-spacing: 0.5px;">
          Prescrever Treino
        </a>
      </td>
    </tr>
  </table>
  `;
  return wrapEmailTemplate(content);
};

// Assinatura coach — pagamento recusado
export const getSubscriptionPaymentFailedHtml = (fullName: string, updateUrl: string) => {
  const content = `
  <h1 style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 28px; font-weight: 700; color: ${TEXT_PRIMARY}; margin: 0 0 12px 0;">
    Pagamento não aprovado
  </h1>
  <p style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 16px; color: ${TEXT_SECONDARY}; margin: 0 0 32px 0; line-height: 1.5;">
    Olá ${fullName}, não conseguimos processar a cobrança da sua assinatura AuronFit. Atualize seus dados de pagamento para manter o acesso ao painel.
  </p>
  <a href="${updateUrl}" target="_blank" style="background-color: ${BRAND_COLOR}; color: #FFFFFF; height: 48px; line-height: 48px; padding: 0 24px; text-decoration: none; border-radius: 12px; font-weight: bold; display: inline-block; font-size: 14px;">
    Atualizar pagamento
  </a>
  `;
  return wrapEmailTemplate(content);
};

// Assinatura coach — cancelamento
export const getSubscriptionCancelledHtml = (
  fullName: string,
  accessUntil: string | null,
  siteUrl: string
) => {
  const untilText = accessUntil
    ? new Date(accessUntil).toLocaleDateString("pt-BR")
    : "o fim do período já pago";
  const content = `
  <h1 style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 28px; font-weight: 700; color: ${TEXT_PRIMARY}; margin: 0 0 12px 0;">
    Assinatura cancelada
  </h1>
  <p style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 16px; color: ${TEXT_SECONDARY}; margin: 0 0 32px 0; line-height: 1.5;">
    Olá ${fullName}, sua assinatura foi cancelada. Seu acesso permanece válido até <strong>${untilText}</strong>.
  </p>
  <a href="${siteUrl}/admin/assinatura" target="_blank" style="background-color: ${TEXT_PRIMARY}; color: ${BG_BASE}; height: 48px; line-height: 48px; padding: 0 24px; text-decoration: none; border-radius: 12px; font-weight: bold; display: inline-block; font-size: 14px;">
    Reativar assinatura
  </a>
  `;
  return wrapEmailTemplate(content);
};

// Assinatura coach — pausada
export const getSubscriptionPausedHtml = (fullName: string, updateUrl: string) => {
  const content = `
  <h1 style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 28px; font-weight: 700; color: ${TEXT_PRIMARY}; margin: 0 0 12px 0;">
    Assinatura pausada
  </h1>
  <p style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 16px; color: ${TEXT_SECONDARY}; margin: 0 0 32px 0; line-height: 1.5;">
    Olá ${fullName}, sua assinatura está pausada. Regularize o pagamento para evitar a interrupção do acesso ao painel.
  </p>
  <a href="${updateUrl}" target="_blank" style="background-color: ${BRAND_COLOR}; color: #FFFFFF; height: 48px; line-height: 48px; padding: 0 24px; text-decoration: none; border-radius: 12px; font-weight: bold; display: inline-block; font-size: 14px;">
    Regularizar assinatura
  </a>
  `;
  return wrapEmailTemplate(content);
};

// Fallback aliases para retrocompatibilidade
export const getWelcomeEmailHtml = (fullName: string, email: string, temporaryPassword: string, siteUrl: string) => 
  getStudentWelcomeEmailHtml(fullName, email, temporaryPassword, "Seu Coach", siteUrl);

export const getPasswordResetEmailHtml = (fullName: string, resetLink: string) => 
  getStudentPasswordResetEmailHtml(fullName, resetLink);

export const getPasswordResetNotificationHtml = (fullName: string) => `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Senha Redefinida</title>
</head>
<body style="margin: 0; padding: 0; background-color: ${BG_BASE}; color: ${TEXT_PRIMARY}; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="padding: 40px 20px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width: 560px; text-align: left;">
          <tr>
            <td>
              ${COMPANY_HEADER}
              <h1 style="font-size: 24px; font-weight: 800; color: ${TEXT_PRIMARY};">Senha Redefinida</h1>
              <p style="font-size: 15px; color: ${TEXT_SECONDARY}; line-height: 1.6;">
                Olá ${fullName}, sua senha do Auronfit foi alterada com sucesso.
              </p>
              <p style="font-size: 13px; color: #888888; line-height: 1.6;">
                Se você realizou essa alteração, nenhuma ação é necessária. Caso contrário, entre em contato imediatamente.
              </p>
              ${COMPANY_FOOTER()}
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;
