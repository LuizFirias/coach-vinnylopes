-- ============================================================
-- 0020 · Reverter get_auth_user_role para SECURITY DEFINER
--
-- A migração 0019 converteu get_auth_user_role para SECURITY
-- INVOKER, causando recursão infinita: a função é usada nas
-- políticas RLS de 'profiles', e com SECURITY INVOKER ela
-- executa sob as políticas do chamador → lê profiles → aciona
-- RLS → chama get_auth_user_role → loop.
--
-- A migração 0011 criou a função como SECURITY DEFINER
-- exatamente para quebrar essa recursão. Restauramos.
-- export_user_data e get_ultimo_treino_exercicio permanecem
-- como SECURITY INVOKER (sem RLS recursivo).
--
-- Rodar no: Supabase Dashboard → SQL Editor
-- ============================================================

CREATE OR REPLACE FUNCTION public.get_auth_user_role()
RETURNS text
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
STABLE
AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid();
$$;
