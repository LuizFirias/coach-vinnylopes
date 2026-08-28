// Design System de E-mails — Coach Vinny (compacto, dark, mobile-first)

const BRAND = "#D4A843";
const BG_OUTER = "#0d0d0d";
const BG_CARD = "#141414";
const BORDER = "#222222";
const TEXT_PRIMARY = "#ffffff";
const TEXT_BODY = "#777777";
const TEXT_MUTED = "#555555";
const TEXT_ACCENT = "#bbbbbb";
const FONT =
  "-apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif";

const DEFAULT_SITE_URL = "https://www.vinnylopescoach.site";

function firstName(fullName: string): string {
  return fullName.trim().split(/\s+/)[0] || fullName;
}

function normalizeSiteUrl(siteUrl?: string): string {
  return (siteUrl || DEFAULT_SITE_URL).replace(/\/$/, "");
}

function logoUrl(siteUrl?: string): string {
  return `${normalizeSiteUrl(siteUrl)}/images/logo.png`;
}

function emailEyebrow(text: string): string {
  return `
  <p style="margin:0 0 6px; font-size:11px; font-weight:500; color:${TEXT_MUTED}; letter-spacing:1.5px; text-transform:uppercase; font-family:${FONT};">
    ${text}
  </p>`;
}

function emailTitle(text: string): string {
  return `
  <h1 class="h1" style="margin:0 0 10px; font-size:28px; font-weight:800; color:${TEXT_PRIMARY}; line-height:1.15; letter-spacing:-0.5px; font-family:${FONT};">
    ${text}
  </h1>`;
}

function emailBody(html: string, marginBottom = "28px"): string {
  return `
  <p style="margin:0 0 ${marginBottom}; font-size:15px; color:${TEXT_BODY}; line-height:1.65; font-family:${FONT};">
    ${html}
  </p>`;
}

function emailNote(text: string): string {
  return `
  <p style="margin:0; font-size:13px; color:${TEXT_MUTED}; line-height:1.6; font-family:${FONT};">
    ${text}
  </p>`;
}

function emailCta(href: string, label: string, marginBottom = "28px"): string {
  return `
  <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom:${marginBottom};">
    <tr>
      <td>
        <a href="${href}" target="_blank" style="display:block; background-color:${BRAND}; border-radius:10px; padding:14px 24px; text-align:center; text-decoration:none; font-size:15px; font-weight:700; color:#ffffff; font-family:${FONT}; letter-spacing:0.2px;">
          ${label}
        </a>
      </td>
    </tr>
  </table>`;
}

function emailKeyValueTable(
  rows: { label: string; value: string; mono?: boolean; highlight?: boolean }[]
): string {
  const rowHtml = rows
    .map(
      (row) => `
    <tr>
      <td style="padding:10px 0; font-size:12px; color:${TEXT_MUTED}; font-family:${FONT}; border-bottom:1px solid ${BORDER};">
        ${row.label}
      </td>
      <td align="right" style="padding:10px 0; font-size:12px; font-family:${FONT}; border-bottom:1px solid ${BORDER};">
        ${
          row.mono
            ? `<span style="background-color:#1e1e1e; border:1px solid #333333; border-radius:4px; padding:3px 8px; font-size:12px; color:#cccccc; font-family:'Courier New',Courier,monospace; letter-spacing:0.5px; white-space:nowrap;">${row.value}</span>`
            : `<span style="color:${row.highlight !== false ? BRAND : TEXT_ACCENT}; font-weight:600;">${row.value}</span>`
        }
      </td>
    </tr>`
    )
    .join("");

  return `
  <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom:28px;">
    <tr>
      <td colspan="2" style="border-top:1px solid ${BORDER}; font-size:0; line-height:0;">&nbsp;</td>
    </tr>
    ${rowHtml}
  </table>`;
}

function emailFooter(_siteUrl?: string, unsubUrl?: string): string {
  const year = new Date().getFullYear();
  return `
  <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
    <tr>
      <td style="border-top:1px solid ${BORDER}; padding-top:20px;">
        <p style="margin:0; font-size:11px; color:#444444; line-height:1.7; font-family:${FONT};">
          © ${year} Coach Vinny · Este é um e-mail automático enviado pela plataforma.
          ${unsubUrl ? `<br><a href="${unsubUrl}" style="color:#444444; text-decoration:underline;">Descadastrar e-mails</a>` : ""}
        </p>
      </td>
    </tr>
  </table>`;
}

function wrapEmailTemplate(
  content: string,
  options?: { preheader?: string; siteUrl?: string; unsubUrl?: string; title?: string }
): string {
  const site = normalizeSiteUrl(options?.siteUrl);
  const preheader = options?.preheader ?? "";
  const title = options?.title ?? "Coach Vinny";

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta http-equiv="X-UA-Compatible" content="IE=edge" />
  <title>${title}</title>
  <!--[if mso]>
  <noscript>
    <xml><o:OfficeDocumentSettings>
      <o:PixelsPerInch>96</o:PixelsPerInch>
    </o:OfficeDocumentSettings></xml>
  </noscript>
  <![endif]-->
  <style>
    body, table, td, a { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
    table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
    img { -ms-interpolation-mode: bicubic; border: 0; height: auto; line-height: 100%; outline: none; text-decoration: none; }
    table { border-collapse: collapse !important; }
    body { height: 100% !important; margin: 0 !important; padding: 0 !important; width: 100% !important; background-color: ${BG_OUTER}; font-family: ${FONT}; }
    @media only screen and (max-width: 480px) {
      .email-container { width: 100% !important; }
      .inner-pad { padding: 24px 20px 20px !important; }
      .h1 { font-size: 24px !important; }
      .email-logo { width: 112px !important; max-width: 112px !important; }
    }
  </style>
</head>
<body style="margin:0; padding:0; background-color:${BG_OUTER};">
  ${preheader ? `<span style="display:none; max-height:0; overflow:hidden; mso-hide:all;">${preheader}</span>` : ""}
  <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
    <tr>
      <td align="center" style="padding:24px 16px;">
        <table class="email-container" role="presentation" border="0" cellpadding="0" cellspacing="0" width="480" style="background-color:${BG_CARD}; border-radius:16px; overflow:hidden; max-width:480px; width:100%;">
          <tr>
            <td class="inner-pad" style="padding:28px 32px 24px;">
              <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td style="padding-bottom:14px;">
                    <img class="email-logo" src="${logoUrl(site)}" alt="Coach Vinny" width="128" style="display:block; border:0; outline:none; max-width:128px; width:128px; height:auto;" />
                  </td>
                </tr>
              </table>
              ${content}
              ${emailFooter(site, options?.unsubUrl)}
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

// 1. Boas-vindas ao Personal (Administrador)
export const getPersonalWelcomeEmailHtml = (fullName: string, siteUrl: string) => {
  const name = firstName(fullName);
  const content = `
  ${emailEyebrow("Plataforma ativada")}
  ${emailTitle(`Bem-vindo, ${name}.`)}
  ${emailBody(
    "Tudo pronto. Agora você tem uma plataforma completa para gerenciar alunos, montar treinos e acompanhar a evolução da sua consultoria."
  )}
  ${emailCta(`${siteUrl}/login`, "Entrar no painel")}
  ${emailNote("Próximo passo: entre no painel e cadastre seu primeiro aluno. Leva menos de 2 minutos.")}`;

  return wrapEmailTemplate(content, {
    preheader: "Sua conta de coach foi criada. Acesse o painel agora.",
    siteUrl,
    title: "Bem-vindo ao Coach Vinny",
  });
};

// 2. Boas-vindas ao Aluno
export const getStudentWelcomeEmailHtml = (
  fullName: string,
  email: string,
  temporaryPassword: string,
  coachName: string,
  siteUrl: string
) => {
  const name = firstName(fullName);
  const content = `
  ${emailEyebrow("Treinamento iniciado")}
  ${emailTitle(`Olá, ${name}.`)}
  ${emailBody(
    `Seu treinador <strong style="color:${TEXT_ACCENT}; font-weight:600;">${coachName}</strong> criou sua conta. Você já pode acessar seus treinos e acompanhar sua evolução.`
  )}
  ${emailKeyValueTable([
    { label: "E-mail", value: email },
    { label: "Senha temporária", value: temporaryPassword, mono: true },
  ])}
  ${emailCta(`${siteUrl}/login`, "Começar agora", "0")}`;

  return wrapEmailTemplate(content, {
    preheader: "Seu treinador criou sua conta. Acesse agora.",
    siteUrl,
    title: "Bem-vindo ao Coach Vinny",
  });
};

// 3. Recuperação de Senha - Personal
export const getPersonalPasswordResetEmailHtml = (fullName: string, resetLink: string) => {
  const name = firstName(fullName);
  const content = `
  ${emailEyebrow("Segurança da conta")}
  ${emailTitle("Redefinição de senha")}
  ${emailBody(
    `Olá Coach ${name}, você solicitou redefinir a senha do seu painel profissional. Clique no botão abaixo para criar uma nova senha.`
  )}
  ${emailCta(resetLink, "Redefinir senha")}
  ${emailNote("Esse link expira em 60 minutos. Se você não fez essa solicitação, ignore este e-mail.")}`;

  return wrapEmailTemplate(content, {
    preheader: "Redefina a senha do seu painel profissional.",
    title: "Recuperação de senha",
  });
};

// 3b. Recuperação de Senha - Aluno
export const getStudentPasswordResetEmailHtml = (fullName: string, resetLink: string) => {
  const name = firstName(fullName);
  const content = `
  ${emailEyebrow("Segurança da conta")}
  ${emailTitle("Redefinição de senha")}
  ${emailBody(
    `Olá ${name}, você solicitou redefinir a senha do seu aplicativo de treinos. Clique no botão abaixo para continuar.`
  )}
  ${emailCta(resetLink, "Redefinir senha")}
  ${emailNote("Esse link expira em 60 minutos. Se você não fez essa solicitação, ignore este e-mail.")}`;

  return wrapEmailTemplate(content, {
    preheader: "Redefina a senha da sua conta de treinos.",
    title: "Recuperação de senha",
  });
};

// 4. Confirmação de Cadastro (Email Confirmation)
export const getEmailConfirmationHtml = (email: string, confirmLink: string) => {
  const content = `
  ${emailEyebrow("Confirmação de e-mail")}
  ${emailTitle("Conta criada")}
  ${emailBody(
    `Clique no botão abaixo para confirmar seu e-mail <strong style="color:${TEXT_ACCENT}; font-weight:600;">${email}</strong> e ativar sua conta.`
  )}
  ${emailCta(confirmLink, "Confirmar e-mail", "0")}`;

  return wrapEmailTemplate(content, {
    preheader: "Confirme seu e-mail para ativar sua conta.",
    title: "Confirme seu e-mail",
  });
};

// 5. Convite enviado pelo Personal
export const getStudentInviteEmailHtml = (
  fullName: string,
  coachName: string,
  actionLink: string
) => {
  const name = firstName(fullName);
  const content = `
  ${emailEyebrow("Convite recebido")}
  ${emailTitle("Convite de treino")}
  ${emailBody(
    `<strong style="color:${TEXT_ACCENT}; font-weight:600;">${coachName}</strong> convidou você, ${name}, para treinar no time de consultoria. Aceite o convite para acessar treinos, evolução e hábitos.`
  )}
  ${emailCta(actionLink, "Aceitar convite", "0")}`;

  return wrapEmailTemplate(content, {
    preheader: `${coachName} convidou você para treinar.`,
    title: "Convite de treino",
  });
};

// 6. Alteração de senha confirmada
export const getPasswordChangedHtml = (fullName: string, siteUrl: string) => {
  const name = firstName(fullName);
  const content = `
  ${emailEyebrow("Segurança da conta")}
  ${emailTitle("Senha alterada")}
  ${emailBody(
    `Olá ${name}, sua senha da plataforma Coach Vinny foi redefinida com sucesso. Se foi você quem realizou essa alteração, nenhuma ação adicional é necessária.`,
    "24px"
  )}
  ${emailNote("Caso contrário, entre em contato imediatamente com o suporte.")}
  ${emailCta(`${siteUrl}/login`, "Ir para a plataforma", "0")}`;

  return wrapEmailTemplate(content, {
    preheader: "Sua senha foi alterada com sucesso.",
    siteUrl,
    title: "Senha alterada",
  });
};

// 7. Assinatura ou pagamento confirmado
export const getSubscriptionConfirmedHtml = (
  fullName: string,
  planName: string,
  price: string,
  siteUrl: string
) => {
  const name = firstName(fullName);
  const content = `
  ${emailEyebrow("Assinatura ativa")}
  ${emailTitle("Pagamento confirmado!")}
  ${emailBody(
    `Olá Coach ${name}, o pagamento da sua assinatura foi processado com sucesso. Seu acesso ao painel está liberado.`
  )}
  ${emailKeyValueTable([
    { label: "Plano", value: planName, highlight: false },
    { label: "Valor", value: price, highlight: false },
    { label: "Status", value: "Ativo" },
  ])}
  ${emailCta(`${siteUrl}/admin/dashboard`, "Entrar no dashboard", "0")}`;

  return wrapEmailTemplate(content, {
    preheader: "Seu pagamento foi confirmado. Acesse o painel.",
    siteUrl,
    title: "Assinatura confirmada",
  });
};

// 8. Primeiro treino concluído (Celebração do Aluno)
export const getFirstWorkoutCompletedHtml = (
  fullName: string,
  workoutName: string,
  siteUrl: string
) => {
  const name = firstName(fullName);
  const content = `
  ${emailEyebrow("Conquista de treino")}
  ${emailTitle("Primeiro treino feito!")}
  ${emailBody(
    `Parabéns ${name}, você concluiu sua primeira rotina prescrita: <strong style="color:${TEXT_ACCENT}; font-weight:600;">${workoutName}</strong>. Continue assim — consistência é o que gera resultados.`
  )}
  ${emailCta(`${siteUrl}/aluno/dashboard`, "Ver meu histórico", "0")}`;

  return wrapEmailTemplate(content, {
    preheader: "Parabéns pelo primeiro treino concluído!",
    siteUrl,
    title: "Primeiro treino concluído",
  });
};

// 9. Primeiro aluno cadastrado (Celebração do Coach)
export const getFirstStudentRegisteredHtml = (
  coachName: string,
  studentName: string,
  siteUrl: string
) => {
  const coach = firstName(coachName);
  const content = `
  ${emailEyebrow("Conquista de negócio")}
  ${emailTitle("Seu primeiro aluno!")}
  ${emailBody(
    `Parabéns Coach ${coach}, você acaba de cadastrar seu primeiro atleta: <strong style="color:${TEXT_ACCENT}; font-weight:600;">${studentName}</strong>. Agora é hora de prescrever o primeiro treino.`
  )}
  ${emailCta(`${siteUrl}/admin/dashboard`, "Prescrever treino", "0")}`;

  return wrapEmailTemplate(content, {
    preheader: "Parabéns pelo primeiro aluno cadastrado!",
    siteUrl,
    title: "Primeiro aluno cadastrado",
  });
};

// Assinatura coach — pagamento recusado
export const getSubscriptionPaymentFailedHtml = (fullName: string, updateUrl: string) => {
  const name = firstName(fullName);
  const content = `
  ${emailEyebrow("Assinatura")}
  ${emailTitle("Pagamento não aprovado")}
  ${emailBody(
    `Olá ${name}, não conseguimos processar a cobrança da sua assinatura. Atualize seus dados de pagamento para manter o acesso ao painel.`
  )}
  ${emailCta(updateUrl, "Atualizar pagamento", "0")}`;

  return wrapEmailTemplate(content, {
    preheader: "Atualize seus dados de pagamento.",
    title: "Pagamento não aprovado",
  });
};

// Assinatura coach — cancelamento
export const getSubscriptionCancelledHtml = (
  fullName: string,
  accessUntil: string | null,
  siteUrl: string
) => {
  const name = firstName(fullName);
  const untilText = accessUntil
    ? new Date(accessUntil).toLocaleDateString("pt-BR")
    : "o fim do período já pago";
  const content = `
  ${emailEyebrow("Assinatura")}
  ${emailTitle("Assinatura cancelada")}
  ${emailBody(
    `Olá ${name}, sua assinatura foi cancelada. Seu acesso permanece válido até <strong style="color:${TEXT_ACCENT}; font-weight:600;">${untilText}</strong>.`
  )}
  ${emailCta(`${siteUrl}/admin/assinatura`, "Reativar assinatura", "0")}`;

  return wrapEmailTemplate(content, {
    preheader: "Sua assinatura foi cancelada.",
    siteUrl,
    title: "Assinatura cancelada",
  });
};

// Assinatura coach — pausada
export const getSubscriptionPausedHtml = (fullName: string, updateUrl: string) => {
  const name = firstName(fullName);
  const content = `
  ${emailEyebrow("Assinatura")}
  ${emailTitle("Assinatura pausada")}
  ${emailBody(
    `Olá ${name}, sua assinatura está pausada. Regularize o pagamento para evitar a interrupção do acesso ao painel.`
  )}
  ${emailCta(updateUrl, "Regularizar assinatura", "0")}`;

  return wrapEmailTemplate(content, {
    preheader: "Regularize sua assinatura.",
    title: "Assinatura pausada",
  });
};

// Fallback aliases para retrocompatibilidade
export const getWelcomeEmailHtml = (
  fullName: string,
  email: string,
  temporaryPassword: string,
  siteUrl: string
) => getStudentWelcomeEmailHtml(fullName, email, temporaryPassword, "Seu Coach", siteUrl);

export const getPasswordResetEmailHtml = (fullName: string, resetLink: string) =>
  getStudentPasswordResetEmailHtml(fullName, resetLink);

export const getPasswordResetNotificationHtml = (fullName: string, siteUrl?: string) => {
  const name = firstName(fullName);
  const content = `
  ${emailEyebrow("Segurança da conta")}
  ${emailTitle("Senha redefinida")}
  ${emailBody(`Olá ${name}, sua senha do Coach Vinny foi alterada com sucesso.`, "16px")}
  ${emailNote("Se você realizou essa alteração, nenhuma ação é necessária. Caso contrário, entre em contato imediatamente com o suporte.")}`;

  return wrapEmailTemplate(content, {
    preheader: "Sua senha foi alterada.",
    siteUrl,
    title: "Senha redefinida",
  });
};
