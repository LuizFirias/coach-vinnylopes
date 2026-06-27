---
name: Sprint 0 - Higiene Crítica (Status)
description: Resumo do que foi criado/modificado vs pendente
type: reference
---

# Sprint 0 — Higiene Crítica | Status Completo

**Data:** 29 de abril de 2026  
**Status:** ✅ Fase 1 concluída — Arquivos criados, pronto para você rodar SQL manualmente

---

## ✅ CONCLUÍDO

### 1️⃣ Arquivos SQL (3 migrations prontas)

**Localização:** `supabase/migrations/`

#### `0001_sprint0_medidas_check.sql` (284 linhas)
- **Bloco A.1:** Query read-only para identificar medidas absurdas (você valida no SQL Editor antes)
- **Bloco A.2:** UPDATEs para limpar campos absurdos (set NULL)
- **Bloco A.3:** CHECK constraints NOT VALID em todas as 18 medidas
- **Rollback:** comentado ao final
- **Ação:** rodar após A.2 validar que as limpezas funcionaram

#### `0002_sprint0_lgpd.sql` (90 linhas)
- **Função 1:** `export_user_data()` — retorna JSONB com todos dados do usuário
- **Função 2:** `delete_user_account()` — deleta conta + registros em cascata manual
- **Grants:** EXECUTE para authenticated
- **Rollback:** comentado

#### `0003_sprint0_seguranca.sql` (95 linhas)
- **Fix A:** Drop policy "Coach gere as fichas" em fichas_treino (genérica)
  - Policy correta via coach_alunos já existe
- **Fix B:** Create policy "medidas_coach_apenas_proprios_alunos" em medidas_aluno
  - Drop das 2 políticas permissivas ("Coaches veem todas...")
- **Validação:** testes SQL comentados para você rodar após aplicar
- **Rollback:** comentados

---

### 2️⃣ Arquivos de Validação (Frontend)

#### `lib/validation/medidas.ts` (102 linhas)
- **MedidaSchema:** Zod com ranges exatos (espelha CHECK do banco)
- **detectarOutlier():** função que identifica variações >25%
- **medidaLabels:** dicionário PT-BR para labels
- **medidaUnidades:** mapeamento unidade por medida

#### `components/medidas/OutlierWarningDialog.tsx` (80 linhas)
- **Client Component:** dialog de soft warning
- **Toma:** campo, novoValor, ultimoValor, unidade
- **Comportamento:** "Você digitou 184 cm. Sua última medida era 84 cm. Quer revisar?"
- **CTA:** "Editar valor" / "Manter 184 cm"

#### `lib/utils/pluralize.ts` (52 linhas)
- **pluralize(count, singular):** "1 atleta" / "5 atletas"
- **formatCount():** "1 atleta ativo" / "5 atletas ativos"
- **smartPluralize():** com dicionário PT-BR para 7 palavras comuns
- **Uso:** em telas com contagens dinâmicas

---

### 3️⃣ Páginas & Actions (LGPD + Frontend)

#### `app/(authenticated)/perfil/excluir/page.tsx` (135 linhas)
- **3 passos:**
  1. Tela de confirmação ("Você vai perder treinos, medidas, fotos...")
  2. Input "Digite EXCLUIR para confirmar"
  3. Sucesso com redirect para /login
- **Estado:** step 1|2|3, loading, erro
- **CTA:** Button danger com validação
- **Segurança:** só executa se texto = "EXCLUIR"

#### `app/(authenticated)/perfil/excluir/actions.ts` (35 linhas)
- **Server Action:** deleteAccountAction()
- **Chama:** supabase.rpc('delete_user_account')
- **Retorna:** { success: boolean, error?: string }

#### `app/(authenticated)/perfil/exportar/actions.ts` (48 linhas)
- **Server Action:** exportUserDataAction()
- **Chama:** supabase.rpc('export_user_data')
- **Retorna:** { success: boolean, blobUrl, filename } ou { success: false, error }
- **Uso client:** fetch a URL e triggera download

---

## ⏳ PENDENTE (Você faz após rodar SQL)

### Integrações no Frontend

#### 1. Botão "Exportar meus dados" no Perfil
- **Onde:** `app/(authenticated)/perfil/page.tsx`
- **O que fazer:**
  ```tsx
  <button onClick={async () => {
    const result = await exportUserDataAction();
    if (result.success) {
      const a = document.createElement('a');
      a.href = result.blobUrl;
      a.download = result.filename;
      a.click();
    }
  }}>
    Exportar meus dados
  </button>
  ```

#### 2. Esconder seção "Parceiros" quando vazio
- **Onde:** qualquer page que listar parceiros
- **O que fazer:** `if (parceiros.length === 0) return null;`

#### 3. Corrigir truncagem "MINHA FICHA DE TRE..."
- **Onde:** procurar pelo texto no grep
- **O que fazer:** adicionar `line-clamp-1 md:line-clamp-2` ou `truncate`

#### 4. Corrigir glyph "C" quebrado em Fotos > Lado
- **Onde:** procurar no componente de Fotos
- **O que fazer:** verificar icon import (Lucide) ou fallback de ícone

#### 5. Usar pluralize() nas contagens
- **Onde:** telas com "X atletas ativos", "Y treinos", etc.
- **O que fazer:** `formatCount(count, 'atleta ativo')`

---

## 📋 Ordem de Execução (para você)

### 1. Validação inicial
```bash
# Verificar que os 3 arquivos SQL foram criados
ls -la supabase/migrations/000[1-3]_sprint0_*.sql
```

### 2. Rodar A.1 em produção (read-only)
```
SQL Editor Supabase → copiar query A.1 de 0001_sprint0_medidas_check.sql
Executar → ver quantas medidas absurdas existem
```

### 3. Rodar na branch Supabase (A.1 + A.2 + A.3 + LGPD + Segurança)
```
Criar branch: supabase branches create staging-redesign
Apontar .env.local para a branch
No SQL Editor da branch:
  1. Executar 0001_sprint0_medidas_check.sql completo (A.1 + A.2 + A.3)
  2. Executar 0002_sprint0_lgpd.sql
  3. Executar 0003_sprint0_seguranca.sql
```

### 4. Testar no app local
```bash
npm run dev
# Apontando para branch staging-redesign

Testes:
☐ Tentar inserir medida peso=10kg → deve falhar (CHECK bloqueou)
☐ Inserir medida válida 75kg → sucesso
☐ Ir para /perfil/excluir → confirmar 3 passos funcionam (não deletar teste!)
☐ Coach A logado → não vê fichas do Coach B (Fix A passou)
☐ Coach A logado → não vê medidas de aluno do Coach B (Fix B passou)
```

### 5. Rodar em produção (mesma ordem)
```
Janela de manutenção recomendada (baixa demanda)
Rodar os 3 migrations em produção na mesma ordem
Backup pg_dump já feito (você tem fora do PC)
```

### 6. Integrar botões/correções no front
```
☐ Adicionar botão "Exportar meus dados" em /perfil
☐ Adicionar botão "Excluir conta" em /perfil → link /perfil/excluir
☐ Esconder seção Parceiros se vazia
☐ Corrigir truncagem "MINHA FICHA..."
☐ Corrigir glyph C em Fotos
☐ Usar pluralize() em contagens
```

---

## 📊 Sumário de Arquivos

| Tipo | Caminho | Linhas | Status |
|------|---------|--------|--------|
| **SQL** | `supabase/migrations/0001_sprint0_medidas_check.sql` | 284 | ✅ Pronto |
| **SQL** | `supabase/migrations/0002_sprint0_lgpd.sql` | 90 | ✅ Pronto |
| **SQL** | `supabase/migrations/0003_sprint0_seguranca.sql` | 95 | ✅ Pronto |
| **TS** | `lib/validation/medidas.ts` | 102 | ✅ Pronto |
| **TSX** | `components/medidas/OutlierWarningDialog.tsx` | 80 | ✅ Pronto |
| **TS** | `lib/utils/pluralize.ts` | 52 | ✅ Pronto |
| **TSX** | `app/(authenticated)/perfil/excluir/page.tsx` | 135 | ✅ Pronto |
| **TS** | `app/(authenticated)/perfil/excluir/actions.ts` | 35 | ✅ Pronto |
| **TS** | `app/(authenticated)/perfil/exportar/actions.ts` | 48 | ✅ Pronto |
| **Front** | Integração botões / correções | — | ⏳ Pendente |

---

## ⚠️ Checklist Crítico (antes de rodar SQL)

- [ ] Backup pg_dump completo feito e arquivado fora do PC
- [ ] Branch `staging-redesign` criada no Supabase
- [ ] `.env.local` apontando para branch (não produção)
- [ ] Lido os comentários em cada arquivo .sql
- [ ] Testado A.1 (read-only) em produção primeiro
- [ ] Pronto para aplicar A.2 + A.3 na branch

---

## 🔗 Próximos Passos

**PARE AQUI** conforme instruído.

Após você rodar SQL e validar na branch:
- Sprint 1 (Sistema de design) — puro front, sem alterações banco
- Sprint 2 (Tela de execução) — novo DDL + front
- Sprints 3-6 — conforme MIGRATION-PLAN.md roadmap

---

**Fim do Sprint 0 — Higiene Crítica**
