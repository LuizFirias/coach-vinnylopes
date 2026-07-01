-- ==============================================================================
-- MIGRATION: Schema de Biblioteca Híbrida (Exercícios Globais + Customizados)
-- ==============================================================================
-- Rode este script no SQL Editor do Supabase antes de executar o script de Seed Node.js.
-- ==============================================================================

BEGIN;

-- 1. Remover RLS antigo e restrições antigas para evitar erros de validação
ALTER TABLE public.exercicios_biblioteca DROP CONSTRAINT IF EXISTS check_equipamento;
ALTER TABLE public.exercicios_biblioteca DROP CONSTRAINT IF EXISTS check_tipo_exercicio;
ALTER TABLE public.exercicios_biblioteca DROP CONSTRAINT IF EXISTS exercicios_biblioteca_equipamento_check;
ALTER TABLE public.exercicios_biblioteca DROP CONSTRAINT IF EXISTS exercicios_biblioteca_tipo_exercicio_check;

DROP POLICY IF EXISTS "Todos podem visualizar exercícios" ON public.exercicios_biblioteca;
DROP POLICY IF EXISTS "Coaches podem criar exercícios" ON public.exercicios_biblioteca;
DROP POLICY IF EXISTS "Coaches podem editar exercícios" ON public.exercicios_biblioteca;
DROP POLICY IF EXISTS "Coach vê global e próprios" ON public.exercicios_biblioteca;
DROP POLICY IF EXISTS "Aluno vê global e do coach" ON public.exercicios_biblioteca;
DROP POLICY IF EXISTS "Coach gerencia próprios exercícios" ON public.exercicios_biblioteca;
DROP POLICY IF EXISTS "Admin gerencia tudo" ON public.exercicios_biblioteca;

-- 2. Adicionar novas colunas se não existirem
ALTER TABLE public.exercicios_biblioteca 
ADD COLUMN IF NOT EXISTS slug VARCHAR(255),
ADD COLUMN IF NOT EXISTS coach_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS origem VARCHAR(50) DEFAULT 'auron_global',
ADD COLUMN IF NOT EXISTS ativo BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS membro_alvo_slug VARCHAR(100),
ADD COLUMN IF NOT EXISTS categoria_equipamento VARCHAR(50);

-- Garantir que a coluna slug tenha uma constraint unique para evitar duplicidade
-- (Trata se já existirem duplicados limpando primeiro)
ALTER TABLE public.exercicios_biblioteca DROP CONSTRAINT IF EXISTS exercicios_biblioteca_slug_key;
ALTER TABLE public.exercicios_biblioteca ADD CONSTRAINT exercicios_biblioteca_slug_key UNIQUE (slug);

-- 3. Habilitar RLS
ALTER TABLE public.exercicios_biblioteca ENABLE ROW LEVEL SECURITY;

-- 4. Definir Políticas de RLS
-- Coaches e Admins veem exercícios globais (origem = 'auron_global') e os próprios criados
CREATE POLICY "Coach vê global e próprios" ON public.exercicios_biblioteca
  FOR SELECT
  USING (
    origem = 'auron_global' OR
    coach_id = auth.uid()
  );

-- Alunos veem exercícios globais e os criados pelo seu coach
CREATE POLICY "Aluno vê global e do coach" ON public.exercicios_biblioteca
  FOR SELECT
  USING (
    origem = 'auron_global' OR
    coach_id IN (
      SELECT coach_id 
      FROM public.coach_alunos 
      WHERE aluno_id = auth.uid()
    )
  );

-- Apenas coaches/admins podem gerenciar seus próprios exercícios personalizados
CREATE POLICY "Coach gerencia próprios exercícios" ON public.exercicios_biblioteca
  FOR ALL
  USING (coach_id = auth.uid() OR (coach_id IS NULL AND origem = 'custom' AND auth.uid() IN (SELECT id FROM public.profiles WHERE role IN ('coach', 'admin', 'super_admin'))))
  WITH CHECK (coach_id = auth.uid());

-- Admin/Super Admin gerencia tudo (incluindo globais)
CREATE POLICY "Admin gerencia tudo" ON public.exercicios_biblioteca
  FOR ALL
  USING (
    auth.uid() IN (SELECT id FROM public.profiles WHERE role IN ('admin', 'super_admin'))
  );

COMMIT;
