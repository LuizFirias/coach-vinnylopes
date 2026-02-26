# 🔧 Solução: Erro "nome_treino" vs "nome_rotina"

## Problema Identificado
```
null value in column "nome_treino" of relation "fichas_treino" violates not-null constraint
```

### O que está acontecendo?
- O banco de dados tem uma coluna chamada `nome_treino`
- O código está tentando inserir em `nome_rotina`
- Resultado: o banco rejeita porque `nome_treino` recebe NULL (violação de constraint NOT NULL)

---

## ✅ Solução Rápida (3 passos)

### 1️⃣ Acessar Supabase Dashboard
- Abra o em https://supabase.com
- Navegue para seu projeto
- Vá em **SQL Editor**

### 2️⃣ Copiar e colar o script de correção
Abra o arquivo `docs/FIX_DATABASE_SCHEMA.sql` e copie TODO o conteúdo.

Cole no SQL Editor do Supabase e **clique em "Run"**.

### 3️⃣ Testar a aplicação
- Volte para a aplicação
- Tente criar uma nova ficha de treino
- O erro deve ser resolvido ✅

---

## Que diferença o script vai fazer?

| Antes | Depois |
|-------|--------|
| Coluna: `nome_treino` (NOT NULL) | Coluna: `nome_rotina` (NOT NULL)  |
| Código: `.insert({ nome_rotina: ... })` | Código: `.insert({ nome_rotina: ... })`  |
| Resultado: NULL em `nome_treino` ❌ | Resultado: Valor salvo correctamente ✅  |

---

## Que o script faz?

O script executa em ordem:

1. **Renomeia** `nome_treino` → `nome_rotina` (se existir)
2. **Cria** `nome_rotina` (se não existir)
3. **Garante** coluna `configuracao` (JSONB)
4. **Garante** coluna `ativo` (BOOLEAN)
5. **Garante** coluna `criado_em` (TIMESTAMP)

---

## Logs Melhorados

O código foi atualizado para mostrar **mensagens de erro mais detalhadas** no console.

Se ainda houver problemas, você verá a mensagem exata do Supabase (ex: "referential integrity violation", "column not found", etc).

---

## Se o erro persistir

Descomente a última linha do script:
```sql
SELECT column_name, data_type, is_nullable FROM information_schema.columns WHERE table_name='fichas_treino' ORDER BY ordinal_position;
```

Isso mostrará **exatamente quais colunas existem** e seus tipos. Compartilhe a saída para diagnóstico.

---

## Relacionados

- 📄 [docs/supabase-migrations.sql](supabase-migrations.sql) - Schema original
- 📄 [docs/FICHAS_TREINO_README.md](FICHAS_TREINO_README.md) - Documentação da estrutura
- 💻 [app/admin/treinos/nova-ficha/page.tsx](../app/admin/treinos/nova-ficha/page.tsx) - Formulário de criação
