# ⚠️ AÇÃO CRÍTICA: Executar Migration de Segurança de PDFs

## Status Atual
✅ **Código**: Frontend security check implementado  
❌ **Banco de dados**: RLS policies NÃO executadas ainda  
⏳ **Resultado**: PDFs ainda podem ser acessados fora do controle se RLS não for ativado

---

## O Que Foi Feito (Mitigação Fronted)
- ✅ Adicionado check de segurança em `app/aluno/plano-alimentar/page.tsx`
- ✅ Interface `NutritionPlan` agora inclui `aluno_id`
- ✅ Função `handleOpenPdf` valida se PDF pertence ao aluno
- ✅ Build passando com sucesso

**MAS ISSO NÃO É SUFICIENTE!** ⚠️

O frontend pode ser bypassado. Precisamos TAMBÉM de proteção no servidor (RLS).

---

## O Que Falta (URGENTE)

Executar a SQL migration que ativa RLS no banco de dados.

### Passo 1: Ir ao Supabase
1. Acesse: https://supabase.com/dashboard
2. Selecione seu projeto Auronfit
3. Vá para **SQL Editor** (menu esquerdo)
4. Clique em **New Query**

### Passo 2: Copiar o SQL

Abra o arquivo:  
📄 `docs/fix-plano-alimentar-rls.sql`

**Copie TODO o conteúdo** do arquivo.

### Passo 3: Colar e Executar
1. Cole o SQL completo na query do Supabase
2. Clique em **RUN** (botão azul no canto superior direito)
3. Aguarde a execução completar
4. Procure por erros (se houver, relate)

### Passo 4: Validar

Depois de executar, você deve ver:
- ✅ Policies criadas para `plano_alimentar_pdf`
- ✅ RLS ativado na tabela
- ✅ Alunos só veem seus próprios PDFs
- ✅ Coaches só veem PDFs que enviaram

---

## O Que a Migration Faz

```sql
-- Desativa policies antigas (se houver)
ALTER TABLE plano_alimentar_pdf DISABLE RLS;

-- Ativa RLS
ALTER TABLE plano_alimentar_pdf ENABLE RLS;

-- Cria 5 policies (isolamento completo):
1. Alunos veem APENAS seus próprios planos
2. Alunos NÃO podem modificar/deletar planos
3. Coaches inserem APENAS para alunos atribuídos
4. Coaches veem APENAS planos que criaram
5. Coaches deletam APENAS seus próprios planos

-- Cria tabela de auditoria (log de acesso)
```

---

## Impacto

**Antes de executar:**
- ❌ Frontend: Bloqueia alguns acessos (check)
- ❌ Banco: Sem proteção (usuário criativo pode bypassar)
- ❌ Segurança: INCOMPLETA

**Depois de executar:**
- ✅ Frontend: Bloqueia acessos não-autorizados
- ✅ Banco: RLS enforce isolamento 100%
- ✅ Segurança: COMPLETA (dupla proteção)

---

## Quando Executar

**AGORA** - Antes de fazer deploy em produção!

Se o app já estiver em produção:
1. Execute a migration IMEDIATAMENTE
2. Não é uma mudança disruptiva (só adiciona proteção)
3. Alunos vão continuar vendo seus PDFs normalmente
4. Apenas PDFs não-autorizados serão bloqueados

---

## Se Tem Dúvida

Procure por erros de SQL no console do Supabase (página SQL Editor mostra erros em vermelho).

Se não passar, copie o erro e relate.

---

## Próximos Passos Après Migration

1. ✅ Testar acesso a PDFs (próprio aluno)
2. ✅ Testar bloqueio de PDFs de outro aluno
3. 🚀 Deploy em produção: `npm run build && vercel --prod`

