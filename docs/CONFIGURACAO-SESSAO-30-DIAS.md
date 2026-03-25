# 🔐 Guia de Configuração de Sessão Prolongada - Supabase

## 🎯 Objetivo
Evitar logouts automáticos no app PWA através de renovação agressiva de tokens.

## ⚠️ IMPORTANTE: Limitação do Plano Gratuito

As configurações de **Time-box user sessions** e **Inactivity timeout** estão disponíveis apenas no **Pro Plan** do Supabase.

**MAS NÃO SE PREOCUPE!** ✅ A implementação do `SessionManager` já resolve o problema renovando tokens automaticamente.

---

## 📋 O Que Já Está Funcionando (Sem Custos)

### 1. ✅ SessionManager Implementado

O componente `SessionManager` já está ativo no seu app e faz:

- 🔄 **Renovação a cada 6 horas** (automática)
- 🚀 **Renovação ao abrir o app** (se faltar < 3 dias)
- 👁️ **Renovação ao voltar à aba** (quando app volta ao foco)
- ⏰ **Renovação preventiva** (se token próximo de expirar)

### 2. ✅ Configuração Atual do Supabase

Deixe como está em **Authentication → Sessions**:
- **Refresh token reuse interval**: 10 seconds ✅ (já OK)
- **Time-box user sessions**: 0 (never) ✅ (bloqueado no plano gratuito)
- **Inactivity timeout**: 0 (never) ✅ (bloqueado no plano gratuito)

### 3. Como Funciona na Prática

**Cenário típico:**
1. Usuário faz login → Recebe refresh token (validade: 7 dias padrão Supabase)
2. Após 4 dias → `SessionManager` detecta < 3 dias e renova automaticamente
3. Novo refresh token válido por mais 7 dias
4. Ciclo se repete infinitamente enquanto app for usado

**Resultado**: Usuário **NUNCA** é deslogado, desde que use o app pelo menos 1x a cada 7 dias!

---

### 4. Testar a Configuração

1. Faça logout do app
2. Faça login novamente
3. Abra o **Console do Navegador** (F12)
4. Execute:

```javascript
// No console do navegador
const session = await supabase.auth.getSession();
console.log('Token expira em:', new Date(session.data.session.expires_at * 1000));
```

5. Verifique se a data de expiração está ~30 dias no futuro

---

## 🔍 Verificação Após Deploy

Após aplicar as configurações, teste:

### Teste 1: Expiração do Token
```javascript
// Execute no navegador após login
const { data } = await supabase.auth.getSession();
const expiresAt = new Date(data.session.expires_at * 1000);
const now = new Date();
const daysUntilExpiry = (expiresAt - now) / (1000 * 60 * 60 * 24);
console.log(`Sessão expira em ${daysUntilExpiry.toFixed(1)} dias`);
```

**Resultado esperado**: ~30 dias

### Teste 2: Renovação Automática
1. Entre no app
2. Abra o console do navegador (F12)
3. Procure por logs: `[SessionManager] Sessão expira em X horas`
4. Se aparecer `Renovando sessão preventivamente...` → ✅ Funcionando

### Teste 3: Persistência após Fechar App
1. Faça login no app
2. Feche completamente o navegador/PWA
3. Reabra após alguns minutos
4. Verifique se continua logado → ✅ Deve permanecer logado

---

## 📊 Comparativo: Antes vs Depois

| Configuração | Antes | Depois |
|--------------|-------|--------|
| Access Token Expiry | 1 hora | 1 hora (mantido) |
| Refresh Token Lifetime | 7 dias | **30 dias** ⬆️ |
| Auto Refresh | Manual | **Automático** ⬆️ |
| Renovação Proativa | Não | **Sim** ⬆️ (ao abrir app) |
| Verificação Periódica | Não | **Sim** ⬆️ (a cada 15 min) |
| Renovação ao voltar à aba | Não | **Sim** ⬆️ (visibilitychange) |

---

## ⚠️ Considerações de Segurança

### Por que não 90 ou 365 dias?

**Balanceamento de segurança vs conveniência:**

- ✅ **30 dias**: Bom equilíbrio para app de fitness (uso esperado: diário/semanal)
- ⚠️ **90 dias**: Aumenta risco se dispositivo for perdido/roubado
- ❌ **365 dias**: Viola práticas de segurança recomendadas (OWASP)

### Proteções Implementadas:

1. **Auto-refresh ativo**: Renova antes de expirar
2. **Verificação periódica**: Detecta problemas cedo
3. **Cooldown entre tentativas**: Evita loops infinitos
4. **Logout automático em falha**: Se renovação falhar após token expirado

---

## 🐛 Troubleshooting

### Problema: Usuário ainda sendo deslogado após 7 dias

**Solução:**
1. Verifique se as configurações foram salvas no Supabase
2. Force um novo login para obter novo refresh token com 30 dias
3. Tokens antigos mantêm a expiração original de 7 dias

### Problema: Erro "Refresh token is invalid"

**Solução:**
1. Limpe o localStorage: `localStorage.clear()`
2. Faça novo login
3. Verifique se `Refresh Token Rotation` está habilitado

### Problema: Console mostra "Session expired"

**Solução:**
1. Verifique conexão de internet
2. Confira se o domínio está nas Redirect URLs permitidas
3. Revise as políticas RLS do Supabase

---

## 📝 Logs para Monitoramento

O `SessionManager` registra no console:

```
✅ Logs normais:
[SessionManager] Sessão expira em 29.5 dias
[SessionManager] ✓ Sessão renovada com sucesso
[SessionManager] App voltou ao foco, verificando sessão...

⚠️ Logs de atenção:
[SessionManager] Renovando sessão preventivamente...
[SessionManager] Token próximo da expiração, renovando...

❌ Logs de erro:
[SessionManager] Erro ao renovar sessão: Invalid refresh token
[SessionManager] Token expirado, redirecionando para login
```

---

## ✅ Checklist Final

- [ ] Acessar Supabase Dashboard
- [ ] Configurar Session Timeout para 720 horas (30 dias)
- [ ] Habilitar Automatic Session Refresh
- [ ] Manter JWT Expiry em 3600 segundos (1 hora)
- [ ] Habilitar Refresh Token Rotation
- [ ] Testar login e verificar expiração no console
- [ ] Monitorar logs do SessionManager no navegador
- [ ] Testar fecha/reabre app após algumas horas

---

## 🎯 Resultado Esperado

Após essas configurações:
- ✅ Usuários permanecem logados por até **30 dias**
- ✅ Renovação automática **a cada 15 minutos** se necessário
- ✅ Renovação proativa ao **abrir o app**
- ✅ Renovação ao **voltar à aba do navegador**
- ✅ Logout apenas se:
  - Usuário clicar em "Sair"
  - 30+ dias de inatividade total
  - Falha de renovação com internet offline

---

**Data de criação**: 2026-03-23  
**Última atualização**: 2026-03-23  
**Versão**: 1.0
