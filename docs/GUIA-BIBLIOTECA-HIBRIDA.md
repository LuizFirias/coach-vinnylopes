# 🚀 Guia: Biblioteca Híbrida (Global + Privada)

## 📋 O QUE FOI CRIADO

Arquivo: **docs/migration-biblioteca-hibrida.sql**

Este arquivo contém tudo que você precisa para implementar o modelo híbrido de biblioteca de exercícios.

---

## 🎯 QUANDO USAR

**AGORA (single coach)**: Não execute, está funcionando bem assim.

**FUTURO (multi-coach)**: Execute antes de lançar para múltiplos coaches.

---

## 🛠️ O QUE O SCRIPT FAZ

### ✅ Modificações no Banco:
1. Adiciona campo 	ipo → 'global' ou 'privado'
2. Permite coach_id NULL (para exercícios globais)
3. Remove políticas RLS antigas
4. Cria novas políticas híbridas
5. Cria tabela coach_assinaturas

### 🔐 Nova Lógica de Permissões:
- **Coach**: Vê exercícios globais + seus privados
- **Aluno**: Vê exercícios globais + do seu coach
- **Admin**: Cria/edita exercícios globais
- **Coach**: Cria/edita apenas seus privados

---

## 📦 COMO EXECUTAR (quando for a hora)

### 1. No Supabase Dashboard
\\\
1. Acesse: https://supabase.com/dashboard
2. Vá em: SQL Editor
3. Copie TODO o conteúdo de: docs/migration-biblioteca-hibrida.sql
4. Cole e clique em RUN
5. Aguarde confirmação de sucesso
\\\

### 2. Atualizar código da API

**Arquivo**: pp/api/admin/exercicios-biblioteca/route.ts

\\\	ypescript
// ADICIONAR no POST:
const { data: { user } } = await supabaseClient.auth.getUser();
const { data: profile } = await supabaseClient
  .from('profiles')
  .select('role')
  .eq('id', user.id)
  .single();

const isAdmin = profile?.role === 'admin' || profile?.role === 'super_admin';

await supabaseClient.from('exercicios_biblioteca').insert({
  nome,
  grupo_muscular,  
  video_url,
  descricao,
  coach_id: isAdmin ? null : user.id,  // ← Admin = NULL (global)
  tipo: isAdmin ? 'global' : 'privado', // ← Definir tipo
});
\\\

---

## 💡 COMO USAR APÓS MIGRAÇÃO

### Para ADMIN (você):
\\\	ypescript
// Criar exercício GLOBAL
POST /api/admin/exercicios-biblioteca
{
  "nome": "Supino Reto",
  "grupo_muscular": "Peito Médio",
  "video_url": "https://youtube.com/shorts/...",
  "tipo": "global"  // ← Todos os coaches verão
}
\\\

### Para COACH:
\\\	ypescript
// Criar exercício PRIVADO (automático)
POST /api/admin/exercicios-biblioteca  
{
  "nome": "Exercício Especial do Método XYZ",
  "grupo_muscular": "Peito Superior",
  "tipo": "privado"  // ← Só ele e alunos dele verão
}
\\\

### Listagem (não muda nada):
\\\	ypescript
// Coach automáticamente vê: global + seus privados
// Aluno automáticamente vê: global + do coach dele
const { data } = await supabase.from('exercicios_biblioteca').select('*');
\\\

---

## 🎨 INTERFACE - Filtros Sugeridos

### Biblioteca do Coach
\\\	sx
// Adicionar toggle para filtrar
const [filtro, setFiltro] = useState('todos'); // 'todos' | 'globais' | 'meus'

const exerciciosFiltrados = exercicios.filter(ex => {
  if (filtro === 'globais') return ex.tipo === 'global';
  if (filtro === 'meus') return ex.tipo === 'privado';
  return true; // todos
});

// UI
<div className="flex gap-2">
  <button onClick={() => setFiltro('todos')}>
    Todos ({exercicios.length})
  </button>
  <button onClick={() => setFiltro('globais')}>
    📚 Biblioteca Global ({exercicios.filter(e => e.tipo === 'global').length})
  </button>
  <button onClick={() => setFiltro('meus')}>
    ⭐ Meus Exercícios ({exercicios.filter(e => e.tipo === 'privado').length})
  </button>
</div>
\\\

---

## 📊 EXEMPLO DE DADOS APÓS MIGRAÇÃO

\\\sql
-- Exercícios globais (coach_id = NULL)
| id  | nome              | tipo    | coach_id | grupo_muscular |
|-----|-------------------|---------|----------|----------------|
| 001 | Supino Reto       | global  | NULL     | Peito Médio    |
| 002 | Leg Press         | global  | NULL     | Quadríceps     |

-- Exercícios privados (coach_id específico)
| id  | nome                    | tipo     | coach_id  | grupo_muscular |
|-----|-------------------------|----------|-----------|----------------|
| 101 | Método Vinny Especial   | privado  | coach-123 | Peito Superior |
| 102 | Agachamento Modificado  | privado  | coach-456 | Quadríceps     |

-- Coach 123 vê: 001, 002, 101 (global + seus)
-- Coach 456 vê: 001, 002, 102 (global + seus)
-- Aluno do 123 vê: 001, 002, 101 (global + do coach dele)
\\\

---

## ⚠️ IMPORTANTE

### NÃO execute agora se:
- ❌ Ainda está operando com 1 coach
- ❌ Não tem exercícios globais prontos
- ❌ Não implementou sistema de assinaturas

### Execute quando:
- ✅ For lançar para múltiplos coaches
- ✅ Tiver gravado biblioteca global (50-100 exercícios)
- ✅ Implementar planos de pagamento
- ✅ Adicionar página de cadastro de coaches

---

## 🎯 PRÓXIMOS PASSOS (quando chegar a hora)

1. **Criar exercícios globais** (gravar 50-100 vídeos Shorts)
2. **Executar migration** (migration-biblioteca-hibrida.sql)
3. **Atualizar API** (adicionar lógica de tipo)
4. **Atualizar UI** (adicionar filtros global/privado)
5. **Criar página de planos** (free/starter/pro)
6. **Criar onboarding** (wizard para novos coaches)

---

## ✅ CHECKLIST DE VALIDAÇÃO

Após executar a migração:

\\\sql
-- 1. Verificar campo tipo foi criado
SELECT column_name FROM information_schema.columns 
WHERE table_name = 'exercicios_biblioteca' AND column_name = 'tipo';

-- 2. Verificar políticas RLS
SELECT policyname FROM pg_policies 
WHERE tablename = 'exercicios_biblioteca';

-- 3. Testar query como coach
SELECT * FROM exercicios_biblioteca; -- Deve ver global + próprios

-- 4. Criar exercício global (como admin)
INSERT INTO exercicios_biblioteca (nome, tipo, grupo_muscular)
VALUES ('Teste Global', 'global', 'Peito');

-- 5. Verificar se todos os coaches veem
-- (fazer login como diferentes coaches e listar)
\\\

---

Arquivo preparado e pronto para uso futuro! 🚀
