-- ═════════════════════════════════════════════════════════════════════════════════
-- Sprint 0 — LGPD: Exportar Dados + Deletar Conta
-- ═════════════════════════════════════════════════════════════════════════════════
--
-- PROPÓSITO:
--   1. Função export_user_data() — retorna JSON com todos os dados do usuário
--   2. Função delete_user_account() — deleta usuário e todos seus registros
--
-- BASE LEGAL: Lei Geral de Proteção de Dados (Lei 13.709/2018)
--   - Art. 18, I: direito de acesso aos dados
--   - Art. 18, VI: direito de solicitação de exclusão
--
-- SEGURANÇA:
--   - Ambas as funções usam SECURITY DEFINER (executam como superuser)
--   - Ambas verificam auth.uid() — só o usuário pode acessar seus dados
--   - delete_user_account() deleta manualmente em ordem (sem cascata automática)
--
-- ═════════════════════════════════════════════════════════════════════════════════

-- ─────────────────────────────────────────────────────────────────────────────────
-- Função 1: export_user_data()
-- Retorna JSONB com todos os dados do usuário (para cumprir Lei de Acesso a Dados)
-- ─────────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.export_user_data()
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid UUID := auth.uid();
  result JSONB;
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'Não autenticado';
  END IF;

  SELECT jsonb_build_object(
    'profile',           (SELECT row_to_json(p) FROM profiles p WHERE p.id = uid),
    'medidas',           (SELECT jsonb_agg(row_to_json(m)) FROM medidas_aluno m WHERE m.aluno_id = uid),
    'historico_treinos', (SELECT jsonb_agg(row_to_json(h)) FROM historico_treinos h WHERE h.aluno_id = uid),
    'fotos',             (SELECT jsonb_agg(row_to_json(f)) FROM fotos_evolucao f WHERE f.aluno_id = uid),
    'feedbacks',         (SELECT jsonb_agg(row_to_json(fb)) FROM feedbacks_treinos fb WHERE fb.aluno_id = uid),
    'pontuacao',         (SELECT row_to_json(pa) FROM pontuacao_alunos pa WHERE pa.aluno_id = uid),
    'fichas_treino',     (SELECT jsonb_agg(row_to_json(ft)) FROM fichas_treino ft WHERE ft.aluno_id = uid),
    'agenda_semanal',    (SELECT jsonb_agg(row_to_json(a)) FROM agenda_semanal a WHERE a.aluno_id = uid),
    'treinos_manuais',   (SELECT jsonb_agg(row_to_json(tm)) FROM treinos_manuais tm WHERE tm.aluno_id = uid),
    'planos_alimentares',(SELECT jsonb_agg(row_to_json(pl)) FROM plano_alimentar_pdf pl WHERE pl.aluno_id = uid),
    'exportado_em',      NOW()
  ) INTO result;

  RETURN result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.export_user_data() TO authenticated;

-- ─────────────────────────────────────────────────────────────────────────────────
-- Função 2: delete_user_account()
-- Deleta conta (usuário + todos os registros) — LGPD Art. 18, VI
-- Importante: como não há ON DELETE CASCADE, deletamos manualmente em ordem.
-- ─────────────────────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.delete_user_account()
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  uid UUID := auth.uid();
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'Não autenticado';
  END IF;

  -- Deletar manualmente em ordem (filhos primeiro, depois pais/auth.users)
  DELETE FROM plano_alimentar_audit  WHERE acessado_por = uid;
  DELETE FROM plano_alimentar_pdf    WHERE aluno_id = uid OR coach_id = uid;
  DELETE FROM treinos_manuais        WHERE aluno_id = uid OR coach_id = uid;
  DELETE FROM feedbacks_treinos      WHERE aluno_id = uid OR coach_id = uid;
  DELETE FROM historico_treinos      WHERE aluno_id = uid;
  DELETE FROM logs_treino            WHERE aluno_id = uid;
  DELETE FROM registros_treino       WHERE aluno_id = uid;
  DELETE FROM agenda_semanal         WHERE aluno_id = uid;
  DELETE FROM treinos_alunos         WHERE aluno_id = uid OR coach_id = uid;
  DELETE FROM fichas_treino          WHERE aluno_id = uid OR coach_id = uid;
  DELETE FROM medidas_aluno          WHERE aluno_id = uid;
  DELETE FROM fotos_evolucao         WHERE aluno_id = uid;
  DELETE FROM pontuacao_alunos       WHERE aluno_id = uid;
  DELETE FROM coach_alunos           WHERE aluno_id = uid OR coach_id = uid;
  DELETE FROM parceiros              WHERE coach_id = uid;
  DELETE FROM profiles               WHERE id = uid;

  -- Por último: auth.users (só consegue deletar com admin privileges)
  DELETE FROM auth.users WHERE id = uid;
END;
$$;

GRANT EXECUTE ON FUNCTION public.delete_user_account() TO authenticated;

-- ═════════════════════════════════════════════════════════════════════════════════
-- ROLLBACK
-- ═════════════════════════════════════════════════════════════════════════════════

-- DROP FUNCTION IF EXISTS public.export_user_data();
-- DROP FUNCTION IF EXISTS public.delete_user_account();
