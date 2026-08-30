-- Notificações in-app (aluno) — check-in reminder e futuros avisos
-- AURONFIT · agosto 2026

CREATE TABLE IF NOT EXISTS public.notificacoes (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  destinatario_id  uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  remetente_id     uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  tipo             text NOT NULL CHECK (tipo IN ('checkin_reminder', 'photos_reminder')),
  titulo           text NOT NULL CHECK (char_length(titulo) BETWEEN 1 AND 120),
  corpo            text NOT NULL CHECK (char_length(corpo) BETWEEN 1 AND 500),
  link             text,
  metadata         jsonb NOT NULL DEFAULT '{}'::jsonb,
  lida_em          timestamptz,
  criada_em        timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_notificacoes_destinatario_criada
  ON public.notificacoes (destinatario_id, criada_em DESC);

CREATE INDEX IF NOT EXISTS idx_notificacoes_destinatario_nao_lidas
  ON public.notificacoes (destinatario_id)
  WHERE lida_em IS NULL;

ALTER TABLE public.notificacoes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "notificacoes_select" ON public.notificacoes;
CREATE POLICY "notificacoes_select" ON public.notificacoes
  FOR SELECT TO authenticated
  USING (auth.uid() = destinatario_id);

DROP POLICY IF EXISTS "notificacoes_insert" ON public.notificacoes;
CREATE POLICY "notificacoes_insert" ON public.notificacoes
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = remetente_id
    AND EXISTS (
      SELECT 1 FROM public.coach_alunos ca
      WHERE ca.coach_id = auth.uid()
        AND ca.aluno_id = notificacoes.destinatario_id
    )
  );

DROP POLICY IF EXISTS "notificacoes_update" ON public.notificacoes;
CREATE POLICY "notificacoes_update" ON public.notificacoes
  FOR UPDATE TO authenticated
  USING (auth.uid() = destinatario_id)
  WITH CHECK (auth.uid() = destinatario_id);

-- Realtime (badge / lista)
DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.notificacoes;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
END $$;
