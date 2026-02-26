export const EMAIL_LAYOUT = {
  colors: {
    black: "#000000",
    white: "#FFFFFF",
    gold: "#D4AF37",
    darkGray: "#111111",
    lightGray: "#e0e0e0",
    gray: "#888888",
  },
  styles: {
    container: "background-color: #000000; color: #ffffff; padding: 40px; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 20px auto; border: 1px solid #D4AF37; border-radius: 12px;",
    button: "background-color: #D4AF37; color: #000000; padding: 16px 32px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block; font-size: 16px;",
    card: "background-color: #111111; padding: 25px; border-radius: 8px; margin: 30px 0; border: 1px solid #D4AF37;",
  }
};

export const getWelcomeEmailHtml = (fullName: string, email: string, temporaryPassword: string, siteUrl: string) => `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Bem-vindo ao Time</title>
</head>
<body style="margin: 0; padding: 0; background-color: #000000; color: #FFFFFF; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #000000;">
    <tr>
      <td align="center" style="padding: 40px 10px;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width: 600px; border: 1px solid #D4AF37; border-radius: 12px; background-color: #000000; overflow: hidden;">
          <!-- Header -->
          <tr>
            <td align="center" style="padding: 40px 40px 20px 40px;">
              <h1 style="color: #D4AF37; margin: 0; font-size: 24px; font-weight: bold; text-transform: uppercase; letter-spacing: 3px; text-align: center;">
                A JORNADA COMEÇA AGORA
              </h1>
              <div style="height: 2px; width: 80px; background-color: #D4AF37; margin: 20px auto 0 auto;"></div>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 20px 40px;">
              <p style="font-size: 18px; color: #FFFFFF; margin-bottom: 20px;">Olá, <strong style="color: #D4AF37;">${fullName}</strong>!</p>
              <p style="line-height: 1.6; color: #e0e0e0; font-size: 16px;">
                Seu acesso ao nosso ecossistema de treinamento exclusivo foi liberado. Estamos prontos para levar seus resultados ao próximo nível.
              </p>
              
              <!-- Credentials Card -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #111111; border: 1px solid #D4AF37; border-radius: 8px; margin: 30px 0;">
                <tr>
                  <td style="padding: 25px;">
                    <p style="margin: 0 0 15px 0; color: #D4AF37; font-weight: bold; text-transform: uppercase; font-size: 14px; letter-spacing: 1px;">Seus dados de acesso:</p>
                    <p style="margin: 5px 0; font-size: 16px; color: #FFFFFF;"><strong>E-mail:</strong> ${email}</p>
                    <p style="margin: 5px 0; font-size: 16px; color: #FFFFFF;"><strong>Senha Temporária:</strong> <span style="background-color: #222; padding: 4px 8px; border-radius: 4px; color: #D4AF37; font-family: monospace;">${temporaryPassword}</span></p>
                  </td>
                </tr>
              </table>
              
              <!-- CTA Button -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                <tr>
                  <td align="center" style="padding: 20px 0;">
                    <a href="${siteUrl}/login" target="_blank" style="background-color: #D4AF37; color: #000000; padding: 18px 36px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block; font-size: 16px; text-transform: uppercase; letter-spacing: 1px;">
                      ACESSAR PLATAFORMA
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td align="center" style="padding: 20px 40px 40px 40px; border-top: 1px solid #222;">
              <p style="font-size: 13px; color: #888; margin: 0; line-height: 1.5;">
                Recomendamos que você altere sua senha após o primeiro login para sua total segurança.
              </p>
              <p style="font-size: 11px; color: #555; margin-top: 20px; text-transform: uppercase; letter-spacing: 1px;">
                © 2026 Coach Vinny - Consultoria de Elite
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;

export const getPasswordResetEmailHtml = (fullName: string, resetLink: string) => `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Recuperação de Acesso</title>
</head>
<body style="margin: 0; padding: 0; background-color: #000000; color: #FFFFFF; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #000000;">
    <tr>
      <td align="center" style="padding: 40px 10px;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width: 600px; border: 1px solid #D4AF37; border-radius: 12px; background-color: #000000; overflow: hidden;">
          <!-- Header -->
          <tr>
            <td align="center" style="padding: 40px 40px 20px 40px;">
              <h1 style="color: #D4AF37; margin: 0; font-size: 24px; font-weight: bold; text-transform: uppercase; letter-spacing: 3px; text-align: center;">
                RECUPERAÇÃO DE ACESSO
              </h1>
              <div style="height: 2px; width: 80px; background-color: #D4AF37; margin: 20px auto 0 auto;"></div>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 20px 40px;">
              <p style="font-size: 18px; color: #FFFFFF; margin-bottom: 20px;">Olá, <strong style="color: #D4AF37;">${fullName}</strong>.</p>
              <p style="line-height: 1.6; color: #e0e0e0; font-size: 16px;">
                Recebemos uma solicitação para redefinir a senha da sua conta no Coach Vinny. Clique no botão abaixo para escolher uma nova senha:
              </p>
              
              <!-- CTA Button -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                <tr>
                  <td align="center" style="padding: 30px 0;">
                    <a href="${resetLink}" target="_blank" style="background-color: #D4AF37; color: #000000; padding: 18px 36px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block; font-size: 16px; text-transform: uppercase; letter-spacing: 1px;">
                      REDEFINIR MINHA SENHA
                    </a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td align="center" style="padding: 20px 40px 40px 40px; border-top: 1px solid #222;">
              <p style="font-size: 13px; color: #888; margin: 0; line-height: 1.5;">
                Se você não solicitou esta alteração, ignore este e-mail. Seu acesso continuará seguro com sua senha atual.
              </p>
              <p style="font-size: 11px; color: #555; margin-top: 20px; text-transform: uppercase; letter-spacing: 1px;">
                © 2026 Coach Vinny - Consultoria de Elite
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;
