# 🔐 Guia: Reset de Senhas em Massa

## 📋 Visão Geral

Este guia explica como resetar as senhas de todos os usuários do sistema para `Mudar123!` e enviar e-mails automáticos notificando sobre a mudança.

## ⚙️ Pré-requisitos

### 1. Variáveis de Ambiente

Certifique-se de que o arquivo `.env.local` contém:

```env
NEXT_PUBLIC_SUPABASE_URL=https://seu-projeto.supabase.co
SUPABASE_SERVICE_ROLE_KEY=sua-chave-service-role
RESEND_API_KEY=re_sua-chave-resend
NEXT_PUBLIC_SITE_URL=https://www.vinnylopescoach.site
```

### 2. Dependências Node.js

```bash
npm install @supabase/supabase-js resend dotenv
```

## 🚀 Como Usar

### Opção 1: Executar o Script Diretamente

```bash
node scripts/reset-all-passwords.js
```

### Opção 2: Adicionar ao package.json

Adicione em `package.json`:

```json
{
  "scripts": {
    "reset-passwords": "node scripts/reset-all-passwords.js"
  }
}
```

Execute:

```bash
npm run reset-passwords
```

## 📊 O que o Script Faz

1. ✅ **Busca todos os usuários** do Supabase Auth
2. ✅ **Busca perfis** para obter os nomes completos
3. ✅ **Reseta a senha** de cada usuário para `Mudar123!`
4. ✅ **Envia e-mail** personalizado via Resend
5. ✅ **Gera relatório** de sucessos e erros

## 📧 Template de E-mail

O e-mail enviado inclui:

- ✉️ Assunto: **🔐 SENHA REDEFINIDA - AÇÃO NECESSÁRIA**
- 📝 Corpo formatado com design da marca (dourado/preto)
- 🔑 Credenciais de acesso (e-mail + senha `Mudar123!`)
- ⚠️ Aviso de segurança para trocar a senha
- 🔗 Botão para acessar a plataforma

## 🛡️ Segurança

### Rate Limiting
- O script inclui delay de 100ms entre cada usuário
- Evita bloqueio por rate limiting do Resend (limite: 100 e-mails/dia no plano gratuito)

### Tratamento de Erros
- Se a senha for resetada mas o e-mail falhar, o erro é registrado
- O script continua processando os próximos usuários
- Relatório final mostra todos os erros

## 📝 Exemplo de Saída

```
🚀 Iniciando reset de senhas em massa...

📋 Buscando usuários...
✓ Encontrados 15 usuário(s)

📋 Buscando perfis...

🔄 [1/15] Processando: joao@email.com
   🔐 Resetando senha...
   ✓ Senha resetada com sucesso
   📧 Enviando e-mail...
   ✓ E-mail enviado com sucesso

🔄 [2/15] Processando: maria@email.com
   🔐 Resetando senha...
   ✓ Senha resetada com sucesso
   📧 Enviando e-mail...
   ✓ E-mail enviado com sucesso

...

============================================================
📊 RELATÓRIO FINAL
============================================================
Total de usuários processados: 15
✅ Sucessos: 14
❌ Erros: 1

⚠️  ERROS DETALHADOS:
   • usuario@email.com: E-mail não enviado: Invalid email

✅ Script finalizado!
```

## ⚠️ Atenções Importantes

### Antes de Executar

1. **BACKUP**: Faça backup do banco de dados
2. **TESTE**: Execute primeiro em ambiente de desenvolvimento
3. **COMUNICAÇÃO**: Avise os usuários previamente sobre a mudança
4. **HORÁRIO**: Execute fora do horário de pico

### Limitações

- **Resend Free Plan**: Máximo 100 e-mails/dia
- **Rate Limiting**: O script tem delay, mas monitore os limites
- **E-mails inválidos**: Usuários sem e-mail válido serão pulados

## 🔧 Personalização

### Modificar a Senha Padrão

Edite em `scripts/reset-all-passwords.js`:

```javascript
const NEW_PASSWORD = 'SuaNovaSenha123!';
```

### Modificar o Template do E-mail

Edite a função `getPasswordResetNotificationHtml()` em:
- `lib/emailTemplates.ts` (para usar em outros lugares)
- `scripts/reset-all-passwords.js` (template inline)

### Filtrar Usuários Específicos

Adicione filtro após buscar usuários:

```javascript
// Filtrar apenas coaches
const coaches = users.filter(user => {
  const profile = profileMap[user.id];
  return profile?.role === 'coach';
});
```

## 🐛 Troubleshooting

### Erro: "RESEND_API_KEY não configurada"
**Solução**: Adicione a chave no `.env.local`

### Erro: "Rate limit exceeded"
**Solução**: 
- Aguarde 24h (plano gratuito Resend)
- Upgrade para plano pago
- Execute em lotes menores

### E-mails não chegam
**Verificar**:
- Pasta de spam
- Domínio verificado no Resend
- Logs do Resend Dashboard

### Senha resetada mas e-mail não enviado
**Solução**: O script registra esses casos. Você pode:
- Reenviar manualmente pelo Resend
- Executar script de reenvio apenas para os que falharam

## 📚 Recursos Adicionais

- [Documentação Supabase Auth Admin](https://supabase.com/docs/reference/javascript/auth-admin-api)
- [Documentação Resend](https://resend.com/docs)
- Template original: `lib/emailTemplates.ts`

## ✅ Checklist Pré-execução

- [ ] Backup do banco de dados realizado
- [ ] Variáveis de ambiente configuradas
- [ ] Teste executado em desenvolvimento
- [ ] Usuários comunicados previamente
- [ ] Horário de baixo tráfego confirmado
- [ ] Limite de e-mails Resend verificado
- [ ] Script revisado e entendido

---

**Última atualização**: Março 2026  
**Autor**: Auronfit Team
