-- Fix: Definir v_streak_aluno como SECURITY INVOKER
-- Problema: Supabase linter reporta a view como SECURITY DEFINER (vulnerabilidade potencial)
-- Solução: Alterar a view para usar security_invoker = true para respeitar as políticas de RLS do usuário que faz a consulta
-- Ref: https://supabase.com/docs/guides/database/database-linter?lint=0010_security_definer_view

ALTER VIEW public.v_streak_aluno SET (security_invoker = true);
