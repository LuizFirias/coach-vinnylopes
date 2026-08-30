-- Chat Coach ↔ Aluno (texto, 1:1, Realtime)
-- AURONFIT · julho 2026

-- ─── 1. Conversas ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.chat_conversas (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id        uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  aluno_id        uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  criada_em       timestamptz NOT NULL DEFAULT now(),
  ultima_msg      text,
  ultima_msg_em   timestamptz,
  ultima_msg_de   uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  nao_lidas_coach integer NOT NULL DEFAULT 0 CHECK (nao_lidas_coach >= 0),
  nao_lidas_aluno integer NOT NULL DEFAULT 0 CHECK (nao_lidas_aluno >= 0),
  UNIQUE (coach_id, aluno_id),
  CONSTRAINT chat_conversas_diferentes CHECK (coach_id <> aluno_id)
);

-- ─── 2. Mensagens ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.chat_mensagens (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversa_id     uuid NOT NULL REFERENCES public.chat_conversas(id) ON DELETE CASCADE,
  remetente_id    uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  texto           text NOT NULL CHECK (char_length(texto) BETWEEN 1 AND 4000),
  enviada_em      timestamptz NOT NULL DEFAULT now(),
  lida_em         timestamptz
);

CREATE INDEX IF NOT EXISTS idx_chat_msgs_conversa
  ON public.chat_mensagens (conversa_id, enviada_em DESC);

CREATE INDEX IF NOT EXISTS idx_chat_conversas_coach
  ON public.chat_conversas (coach_id, ultima_msg_em DESC NULLS LAST);

CREATE INDEX IF NOT EXISTS idx_chat_conversas_aluno
  ON public.chat_conversas (aluno_id, ultima_msg_em DESC NULLS LAST);

-- ─── 3. RLS ──────────────────────────────────────────────────────────────────
ALTER TABLE public.chat_conversas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_mensagens ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "chat_conversas_select" ON public.chat_conversas;
CREATE POLICY "chat_conversas_select" ON public.chat_conversas
  FOR SELECT TO authenticated
  USING (auth.uid() = coach_id OR auth.uid() = aluno_id);

DROP POLICY IF EXISTS "chat_conversas_insert" ON public.chat_conversas;
CREATE POLICY "chat_conversas_insert" ON public.chat_conversas
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = coach_id
    AND EXISTS (
      SELECT 1 FROM public.coach_alunos ca
      WHERE ca.coach_id = auth.uid() AND ca.aluno_id = chat_conversas.aluno_id
    )
  );

DROP POLICY IF EXISTS "chat_conversas_update" ON public.chat_conversas;
CREATE POLICY "chat_conversas_update" ON public.chat_conversas
  FOR UPDATE TO authenticated
  USING (auth.uid() = coach_id OR auth.uid() = aluno_id)
  WITH CHECK (auth.uid() = coach_id OR auth.uid() = aluno_id);

DROP POLICY IF EXISTS "chat_mensagens_select" ON public.chat_mensagens;
CREATE POLICY "chat_mensagens_select" ON public.chat_mensagens
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.chat_conversas c
      WHERE c.id = conversa_id
        AND (c.coach_id = auth.uid() OR c.aluno_id = auth.uid())
    )
  );

DROP POLICY IF EXISTS "chat_mensagens_insert" ON public.chat_mensagens;
CREATE POLICY "chat_mensagens_insert" ON public.chat_mensagens
  FOR INSERT TO authenticated
  WITH CHECK (
    remetente_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.chat_conversas c
      WHERE c.id = conversa_id
        AND (c.coach_id = auth.uid() OR c.aluno_id = auth.uid())
    )
  );

DROP POLICY IF EXISTS "chat_mensagens_update" ON public.chat_mensagens;
CREATE POLICY "chat_mensagens_update" ON public.chat_mensagens
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.chat_conversas c
      WHERE c.id = conversa_id
        AND (c.coach_id = auth.uid() OR c.aluno_id = auth.uid())
    )
  );

-- ─── 4. Trigger — última mensagem + não lidas ────────────────────────────────
CREATE OR REPLACE FUNCTION public.fn_after_chat_mensagem()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_coach_id uuid;
  v_aluno_id uuid;
BEGIN
  SELECT coach_id, aluno_id INTO v_coach_id, v_aluno_id
  FROM public.chat_conversas
  WHERE id = NEW.conversa_id;

  IF v_coach_id IS NULL THEN
    RETURN NEW;
  END IF;

  UPDATE public.chat_conversas SET
    ultima_msg      = NEW.texto,
    ultima_msg_em   = NEW.enviada_em,
    ultima_msg_de   = NEW.remetente_id,
    nao_lidas_coach = CASE
      WHEN NEW.remetente_id = v_aluno_id THEN nao_lidas_coach + 1
      ELSE nao_lidas_coach
    END,
    nao_lidas_aluno = CASE
      WHEN NEW.remetente_id = v_coach_id THEN nao_lidas_aluno + 1
      ELSE nao_lidas_aluno
    END
  WHERE id = NEW.conversa_id;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_after_chat_mensagem ON public.chat_mensagens;
CREATE TRIGGER trg_after_chat_mensagem
  AFTER INSERT ON public.chat_mensagens
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_after_chat_mensagem();

-- ─── 5. RPC — marcar lidas ───────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.fn_marcar_lidas(p_conversa_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_coach_id uuid;
  v_aluno_id uuid;
  v_uid uuid := auth.uid();
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Não autenticado';
  END IF;

  SELECT coach_id, aluno_id INTO v_coach_id, v_aluno_id
  FROM public.chat_conversas
  WHERE id = p_conversa_id;

  IF v_coach_id IS NULL OR (v_uid <> v_coach_id AND v_uid <> v_aluno_id) THEN
    RAISE EXCEPTION 'Sem permissão';
  END IF;

  UPDATE public.chat_mensagens
  SET lida_em = now()
  WHERE conversa_id = p_conversa_id
    AND remetente_id <> v_uid
    AND lida_em IS NULL;

  IF v_uid = v_coach_id THEN
    UPDATE public.chat_conversas SET nao_lidas_coach = 0 WHERE id = p_conversa_id;
  ELSE
    UPDATE public.chat_conversas SET nao_lidas_aluno = 0 WHERE id = p_conversa_id;
  END IF;
END;
$$;

-- ─── 6. RPC — get ou criar conversa (aluno ou coach) ─────────────────────────
CREATE OR REPLACE FUNCTION public.fn_get_ou_criar_conversa(p_coach_id uuid, p_aluno_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_id uuid;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Não autenticado';
  END IF;

  IF v_uid <> p_coach_id AND v_uid <> p_aluno_id THEN
    RAISE EXCEPTION 'Sem permissão';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.coach_alunos
    WHERE coach_id = p_coach_id AND aluno_id = p_aluno_id
  ) THEN
    RAISE EXCEPTION 'Relação coach-aluno inexistente';
  END IF;

  SELECT id INTO v_id
  FROM public.chat_conversas
  WHERE coach_id = p_coach_id AND aluno_id = p_aluno_id;

  IF v_id IS NOT NULL THEN
    RETURN v_id;
  END IF;

  INSERT INTO public.chat_conversas (coach_id, aluno_id)
  VALUES (p_coach_id, p_aluno_id)
  ON CONFLICT (coach_id, aluno_id) DO UPDATE
    SET coach_id = EXCLUDED.coach_id
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.fn_marcar_lidas(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.fn_get_ou_criar_conversa(uuid, uuid) TO authenticated;

-- ─── 7. Realtime ─────────────────────────────────────────────────────────────
DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_conversas;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_mensagens;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
END $$;
