-- Notifica o coach em tempo real quando o aluno inicia um treino
-- AURONFIT · agosto 2026

ALTER TABLE public.notificacoes DROP CONSTRAINT IF EXISTS notificacoes_tipo_check;
ALTER TABLE public.notificacoes ADD CONSTRAINT notificacoes_tipo_check
  CHECK (tipo IN ('checkin_reminder', 'photos_reminder', 'treino_iniciado'));

-- Aluno pode notificar o próprio coach (direção oposta da policy já existente,
-- que só permite coach → aluno)
DROP POLICY IF EXISTS "notificacoes_insert_aluno" ON public.notificacoes;
CREATE POLICY "notificacoes_insert_aluno" ON public.notificacoes
  FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = remetente_id
    AND EXISTS (
      SELECT 1 FROM public.coach_alunos ca
      WHERE ca.aluno_id = auth.uid()
        AND ca.coach_id = notificacoes.destinatario_id
    )
  );
