# 🔧 Configuração do Supabase - Coach Vinny

## 📧 Configuração de E-mail (Auth)

### Passos para configurar o envio de convites:

1. **Acessar o Painel do Supabase**
   - Vá para: https://app.supabase.com/project/SEU_PROJETO_ID/auth/templates
   
2. **Configurar Email Templates**
   - Navegue: `Authentication` → `Email Templates`
   - Personalize o template de **"Invite user"** com sua identidade visual

3. **Configuração de Email Provider**
   
   #### Opção A - Usar o Supabase (Limite de 3 emails/hora no plano gratuito)
   ```
   Authentication → Settings → SMTP Settings
   ✓ Enable custom SMTP: OFF (usa email do Supabase)
   ```
   
   #### Opção B - Configurar SMTP Próprio (Recomendado para produção)
   ```
   Authentication → Settings → SMTP Settings
   ✓ Enable custom SMTP: ON
   
   Configurações exemplo (Gmail):
   Host: smtp.gmail.com
   Port: 587
   Username: seu-email@gmail.com
   Password: sua-senha-app (não use senha normal!)
   Sender: Coach Vinny <noreply@coachvinny.com>
   ```

4. **Configurar Email Confirmation**
   
   **Para TESTES (desenvolvimento):**
   ```
   Authentication → Settings → Email Auth
   ✓ Enable email confirmations: OFF
   ```
   ⚠️ Com esta opção, alunos podem fazer login imediatamente após receber o convite.
   
   **Para PRODUÇÃO:**
   ```
   Authentication → Settings → Email Auth
   ✓ Enable email confirmations: ON
   ✓ Double confirm email changes: ON (opcional, mais seguro)
   ```
   📌 Com confirmação ativada, alunos precisam clicar no link do e-mail antes de fazer login.

5. **Configurar Redirect URLs**
   ```
   Authentication → URL Configuration
   
   Site URL: https://seu-dominio.com
   
   Redirect URLs (adicione estas):
   - http://localhost:3000/login
   - https://seu-dominio.com/login
   - https://seu-dominio.vercel.app/login
   ```

---

## 🔐 Políticas RLS (Row Level Security)

Certifique-se de que a tabela `profiles` tem as políticas corretas:

### Política 1: Admin pode inserir perfis
```sql
CREATE POLICY "Coach pode criar perfis de alunos"
ON profiles FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() IN (
    SELECT id FROM profiles WHERE role = 'coach'
  )
);
```

### Política 2: Usuário pode ver seu próprio perfil
```sql
CREATE POLICY "Usuários podem ver próprio perfil"
ON profiles FOR SELECT
TO authenticated
USING (auth.uid() = id);
```

### Política 3: Coach pode ver todos os perfis
```sql
CREATE POLICY "Coach pode ver todos os perfis"
ON profiles FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() AND role = 'coach'
  )
);
```

---

## 🔍 Troubleshooting - Convite de Alunos

### Erro: "Email rate limit exceeded"
**Causa:** Atingiu o limite de 3 emails/hora do plano gratuito do Supabase.

**Soluções:**
1. Aguarde 1 hora para resetar o limite
2. Configure SMTP próprio (ver seção acima)
3. Desative email confirmation para testes (menos seguro)

### Erro: "User already registered"
**Causa:** O e-mail já está cadastrado no sistema.

**Solução:** 
- O sistema agora verifica automaticamente se o e-mail existe antes de enviar o convite
- Você verá a mensagem: *"Este e-mail já está cadastrado como Aluno. Use outro e-mail ou gerencie o perfil existente."*

### Erro: "Invalid email"
**Causa:** Formato de e-mail inválido.

**Solução:** Verifique se o e-mail está no formato correto: `nome@dominio.com`

### Logs Detalhados
O endpoint `/api/admin/invite` agora gera logs detalhados no console do servidor:

```bash
# Para ver os logs no terminal durante desenvolvimento:
npm run dev

# Os logs aparecem com o prefixo [INVITE]:
[INVITE] Iniciando convite para: { email: 'aluno@email.com', fullName: 'João Silva' }
[INVITE] Verificando se e-mail já existe: aluno@email.com
[INVITE] E-mail não existe, enviando convite...
[INVITE] Convite enviado com sucesso. User ID: abc-123-def
[INVITE] ✓ Aluno cadastrado com sucesso
```

---

## ⚙️ Variáveis de Ambiente

Certifique-se de ter estas variáveis configuradas no `.env.local`:

```bash
# URL do seu site
NEXT_PUBLIC_SITE_URL=http://localhost:3000

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://seu-projeto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sua-anon-key...
SUPABASE_SERVICE_ROLE_KEY=sua-service-role-key...
```

---

## 📝 Notas Importantes

1. **Service Role Key**: NUNCA exponha a `SUPABASE_SERVICE_ROLE_KEY` no frontend. Ela só é usada no servidor (`/api/admin/invite/route.ts`).

2. **Email Confirmation**: 
   - ✓ **Desativada** = Alunos podem fazer login imediatamente (bom para testes)
   - ✓ **Ativada** = Alunos precisam confirmar e-mail primeiro (recomendado para produção)

3. **Duplicate Check**: O sistema agora verifica automaticamente se o e-mail já existe antes de tentar enviar o convite, evitando erros e fornecendo mensagens claras ao Coach.

4. **Status do Aluno**: Por padrão, novos alunos são criados com:
   ```typescript
   role: "aluno"
   status: "ativo"
   status_pagamento: "pago"
   ```

---

## 🎯 Checklist de Configuração

- [ ] SMTP configurado (ou ciente do limite de 3 emails/hora)
- [ ] Email confirmation configurado conforme ambiente (Dev/Prod)
- [ ] Redirect URLs adicionados
- [ ] Políticas RLS ativas na tabela `profiles`
- [ ] Variáveis de ambiente configuradas
- [ ] Testado envio de convite com sucesso
- [ ] Testado tratamento de e-mail duplicado
- [ ] Logs do servidor funcionando

---

**Documentação atualizada:** Fevereiro 2026  
**Última revisão:** Sistema de convite com verificação de duplicidade e logs detalhados implementados.
