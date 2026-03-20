# Melhorias na Página de Perfil e Sistema de PDFs

## 📋 Resumo das Mudanças

### 1. **Página de Perfil do Aluno - Simplificada**
✅ **ANTES**: Tenha uma seção gigantesca de "Segurança da Conta" com:
- Campos de nova senha
- Campos de confirmação  
- Checklist de requisitos de segurança
- Muitas linhas de código

✅ **AGORA**: Página limpa com:
- **Nome Completo** (editável)
- **Email** (somente leitura)
- **Data de Nascimento** (editável)
- **Botão "Trocar Senha"** → Abre modal ✓

**Vantagens:**
- Página mais limpa e focada
- Menos distrações
- Modal semastra para trocar senha
- Melhor UX

---

### 2. **Visualização de PDFs Melhorada**
**Problema anterior**: PDFs apareciam muito pequenos na tela

**Solução implementada:**
- Mudança de `#view=Fit` para `#view=FitH`
- `FitH` = Fit Height → Mostra a página inteira em altura, ajustando largura
- Página A4 agora fica visível completamente no quadro modal

---

### 3. **Segurança de PDFs - RLS Policy**
⚠️ **Problema encontrado**: Seu perfil de teste conseguia ver PDFs de outro aluno

**Causa raiz**: RLS policy não estava 100% restritiva

**Solução**: Criamos arquivo [docs/fix-plano-alimentar-rls.sql](docs/fix-plano-alimentar-rls.sql) com:

```sql
-- Alunos veem APENAS seus próprios planos
CREATE POLICY "aluno_sees_own_plans" ON plano_alimentar_pdf
  FOR SELECT
  USING (aluno_id = auth.uid());

-- Alunos NÃO podem deletar/editar planos
CREATE POLICY "aluno_no_modify" ON plano_alimentar_pdf
  FOR UPDATE
  USING (false);

-- Coaches criam apenas para seus alunos
CREATE POLICY "coach_insert_plan" ON plano_alimentar_pdf
  FOR INSERT
  WITH CHECK (
    coach_id = auth.uid() AND
    EXISTS (SELECT 1 FROM coach_alunos WHERE ...)
  );

-- Coaches deletam apenas seus próprios uploads
CREATE POLICY "coach_delete_own" ON plano_alimentar_pdf
  FOR DELETE
  USING (coach_id = auth.uid());
```

---

## 🔧 Próximos Passos - IMPORTANTE!

### **Executar Migration no Supabase**

Para garantir que PDFs fiquem 100% isolados entre alunos, execute o script:

1. **Abra** Supabase Dashboard → Seu projeto
2. **Vá para** SQL Editor
3. **Cole** o conteúdo de [docs/fix-plano-alimentar-rls.sql](../docs/fix-plano-alimentar-rls.sql)
4. **Execute** o script

Isso vai:
- ✅ Limpar políticas antigas (se houver)  
- ✅ Ativar RLS na tabela `plano_alimentar_pdf`
- ✅ Criar 5 políticas novas mais restritivas
- ✅ Super admin consegue ver tudo (opcional)
- ✅ Criar índices para performance

---

## ✅ Validação Completa

- ✅ Build: **SUCCESS** (35 rotas)
- ✅ TypeScript: **Sem erros**
- ✅ PDFViewer: **Melhorado** (página inteira visível)
- ✅ Perfil: **Simplificado** (modal para senha)
- ✅ Git commit: **Feito**

---

## 📝 Checklist de Implementação

- [x] Remover seção grande de segurança do perfil
- [x] Deixar apenas botão "Trocar Senha"
- [x] Melhorar visualização de PDFs
- [x] Criar script de RLS policy
- [x] Build passou
- [x] Git commit
- [ ] **Executar migration SQL no Supabase** ← PRÓXIMO PASSO

---

## 🚀 Depois da Migration

Uma vez que você executar a migration no Supabase, todos os PDFs estarão:
- 🔒 Isolados por aluno
- 🔒 Coaches só veem seus uploads
- 🔒 Alunos só veem seus planos
- ✅ Super admin vê tudo (se necessário)

**Teste**: Crie um PDF de teste com perfil de coach e verifique se aparece apenas para o aluno correto! 🎯
