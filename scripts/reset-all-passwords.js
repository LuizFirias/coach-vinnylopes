/**
 * Script para resetar todas as senhas dos usuários e enviar e-mail em massa
 * 
 * USO:
 * node scripts/reset-all-passwords.js
 * 
 * REQUISITOS:
 * - NEXT_PUBLIC_SUPABASE_URL configurado no .env
 * - SUPABASE_SERVICE_ROLE_KEY configurado no .env
 * - RESEND_API_KEY configurado no .env
 */

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const { Resend } = require('resend');

// Configurações
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const resendApiKey = process.env.RESEND_API_KEY;
const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.vinnylopescoach.site';

// Nova senha padrão
const NEW_PASSWORD = 'Mudar123!';

// Validações
if (!supabaseUrl || !serviceRoleKey || !resendApiKey) {
  console.error('❌ Variáveis de ambiente faltando:');
  if (!supabaseUrl) console.error('   - NEXT_PUBLIC_SUPABASE_URL');
  if (!serviceRoleKey) console.error('   - SUPABASE_SERVICE_ROLE_KEY');
  if (!resendApiKey) console.error('   - RESEND_API_KEY');
  process.exit(1);
}

// Inicializar clientes
const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

const resend = new Resend(resendApiKey);

// Template de e-mail
const getPasswordResetNotificationHtml = (fullName, email) => `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Senha Redefinida</title>
</head>
<body style="margin: 0; padding: 0; background-color: #000000; color: #FFFFFF; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #000000;">
    <tr>
      <td align="center" style="padding: 40px 10px;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width: 600px; border: 1px solid #D4AF37; border-radius: 12px; background-color: #000000; overflow: hidden;">
          <tr>
            <td align="center" style="padding: 40px 40px 20px 40px;">
              <h1 style="color: #D4AF37; margin: 0; font-size: 24px; font-weight: bold; text-transform: uppercase; letter-spacing: 3px;">
                SENHA REDEFINIDA
              </h1>
              <div style="height: 2px; width: 80px; background-color: #D4AF37; margin: 20px auto 0 auto;"></div>
            </td>
          </tr>
          <tr>
            <td style="padding: 20px 40px;">
              <p style="font-size: 18px; color: #FFFFFF; margin-bottom: 20px;">Olá, <strong style="color: #D4AF37;">${fullName}</strong>!</p>
              <p style="line-height: 1.6; color: #e0e0e0; font-size: 16px;">
                Por questões de segurança e manutenção do sistema, sua senha de acesso foi redefinida.
              </p>
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #111111; border: 1px solid #D4AF37; border-radius: 8px; margin: 30px 0;">
                <tr>
                  <td style="padding: 25px;">
                    <p style="margin: 0 0 15px 0; color: #D4AF37; font-weight: bold; text-transform: uppercase; font-size: 14px; letter-spacing: 1px;">Seus novos dados de acesso:</p>
                    <p style="margin: 5px 0; font-size: 16px; color: #FFFFFF;"><strong>E-mail:</strong> ${email}</p>
                    <p style="margin: 5px 0; font-size: 16px; color: #FFFFFF;"><strong>Nova Senha:</strong> <span style="background-color: #222; padding: 4px 8px; border-radius: 4px; color: #D4AF37; font-family: monospace;">Mudar123!</span></p>
                  </td>
                </tr>
              </table>
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #1a1a1a; border-left: 3px solid #D4AF37; border-radius: 4px; margin: 25px 0;">
                <tr>
                  <td style="padding: 20px;">
                    <p style="margin: 0; font-size: 14px; color: #e0e0e0; line-height: 1.6;">
                      <strong style="color: #D4AF37;">⚠️ IMPORTANTE:</strong><br/>
                      Por segurança, <strong>altere sua senha imediatamente</strong> após fazer login. Esta é uma senha temporária e deve ser modificada no seu primeiro acesso.
                    </p>
                  </td>
                </tr>
              </table>
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
          <tr>
            <td align="center" style="padding: 20px 40px 40px 40px; border-top: 1px solid #222;">
              <p style="font-size: 13px; color: #888; margin: 0; line-height: 1.5;">
                Se você tiver qualquer dúvida ou problema para acessar, entre em contato com o suporte.
              </p>
              <p style="font-size: 11px; color: #555; margin-top: 20px; text-transform: uppercase; letter-spacing: 1px;">
                © 2026 Auronfit - Consultoria de Profissional
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

// Função para delay (evitar rate limiting)
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function resetAllPasswords() {
  console.log('🚀 Iniciando reset de senhas em massa...\n');

  try {
    // 1. Buscar todos os usuários do Auth
    console.log('📋 Buscando usuários...');
    const { data: { users }, error: listError } = await supabase.auth.admin.listUsers();

    if (listError) {
      throw new Error(`Erro ao listar usuários: ${listError.message}`);
    }

    if (!users || users.length === 0) {
      console.log('⚠️  Nenhum usuário encontrado.');
      return;
    }

    console.log(`✓ Encontrados ${users.length} usuário(s)\n`);

    // 2. Buscar profiles para obter os nomes
    console.log('📋 Buscando perfis...');
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, email, full_name');

    if (profilesError) {
      console.warn('⚠️  Erro ao buscar profiles:', profilesError.message);
    }

    // Criar mapa de profiles por ID
    const profileMap = {};
    if (profiles) {
      profiles.forEach(profile => {
        profileMap[profile.id] = profile;
      });
    }

    // 3. Processar cada usuário
    let successCount = 0;
    let errorCount = 0;
    const errors = [];

    for (let i = 0; i < users.length; i++) {
      const user = users[i];
      const email = user.email;
      const userId = user.id;
      
      // Pular se não tiver e-mail
      if (!email) {
        console.log(`⏭️  [${i + 1}/${users.length}] Usuário sem e-mail (ID: ${userId}), pulando...`);
        continue;
      }

      // Obter nome do perfil ou usar e-mail
      const profile = profileMap[userId];
      const fullName = profile?.full_name || email.split('@')[0];

      console.log(`\n🔄 [${i + 1}/${users.length}] Processando: ${email}`);

      try {
        // Resetar senha
        console.log('   🔐 Resetando senha...');
        const { error: updateError } = await supabase.auth.admin.updateUserById(
          userId,
          { password: NEW_PASSWORD }
        );

        if (updateError) {
          throw new Error(`Erro ao resetar senha: ${updateError.message}`);
        }

        console.log('   ✓ Senha resetada com sucesso');

        // Enviar e-mail
        console.log('   📧 Enviando e-mail...');
        const { error: emailError } = await resend.emails.send({
          from: 'Auronfit <contato@vinnylopescoach.site>',
          to: email,
          subject: '🔐 SENHA REDEFINIDA - AÇÃO NECESSÁRIA',
          html: getPasswordResetNotificationHtml(fullName, email),
        });

        if (emailError) {
          console.warn(`   ⚠️  Erro ao enviar e-mail: ${emailError.message}`);
          errors.push({ email, error: `E-mail não enviado: ${emailError.message}` });
        } else {
          console.log('   ✓ E-mail enviado com sucesso');
          successCount++;
        }

        // Delay para evitar rate limiting (100ms entre cada usuário)
        await delay(100);

      } catch (err) {
        console.error(`   ❌ ERRO: ${err.message}`);
        errorCount++;
        errors.push({ email, error: err.message });
      }
    }

    // 4. Relatório final
    console.log('\n' + '='.repeat(60));
    console.log('📊 RELATÓRIO FINAL');
    console.log('='.repeat(60));
    console.log(`Total de usuários processados: ${users.length}`);
    console.log(`✅ Sucessos: ${successCount}`);
    console.log(`❌ Erros: ${errorCount}`);
    
    if (errors.length > 0) {
      console.log('\n⚠️  ERROS DETALHADOS:');
      errors.forEach(({ email, error }) => {
        console.log(`   • ${email}: ${error}`);
      });
    }

    console.log('\n✅ Script finalizado!\n');

  } catch (error) {
    console.error('\n❌ ERRO CRÍTICO:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Confirmação antes de executar
console.log('⚠️  ATENÇÃO: Este script vai resetar a senha de TODOS os usuários para "Mudar123!"');
console.log('   e enviar e-mails em massa.\n');

// Executar
resetAllPasswords();
