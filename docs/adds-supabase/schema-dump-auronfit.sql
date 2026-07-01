--
-- PostgreSQL database dump
--

\restrict KThiG33d5hJMMECtBONfqXKCuPmu641QpjMVTVtVRZBgtXm7J91EoktRBExbLpA

-- Dumped from database version 17.6
-- Dumped by pg_dump version 17.10

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: -
--

-- CREATE SCHEMA public;  -- removido: schema 'public' já existe no projeto Supabase novo


--
-- Name: SCHEMA public; Type: COMMENT; Schema: -; Owner: -
--

-- COMMENT ON SCHEMA public IS 'standard public schema';  -- removido: sem permissão de owner no Supabase


--
-- Name: atualizar_pontos_treino(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.atualizar_pontos_treino() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO ''
    AS $$
BEGIN
  IF NEW.concluido = true AND NEW.data_treino <= CURRENT_DATE THEN
    NEW.pontos_earn := public.calcular_pontos_treino(NEW.tipo_treino, NEW.duracao_minutos);
  ELSE
    NEW.pontos_earn := 0;
  END IF;
  NEW.atualizado_em := NOW();
  RETURN NEW;
END;
$$;


--
-- Name: calcular_pontos_treino(text, integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.calcular_pontos_treino(p_tipo text, p_duracao_minutos integer) RETURNS integer
    LANGUAGE plpgsql IMMUTABLE
    SET search_path TO ''
    AS $$
BEGIN
  CASE
    WHEN p_tipo = 'musculacao' THEN RETURN 20;
    WHEN p_tipo = 'cardio' THEN
      IF p_duracao_minutos BETWEEN 10 AND 19 THEN RETURN 10;
      ELSIF p_duracao_minutos BETWEEN 20 AND 49 THEN RETURN 20;
      ELSIF p_duracao_minutos >= 50 THEN RETURN 30;
      ELSE RETURN 0;
      END IF;
    ELSE RETURN 0;
  END CASE;
END;
$$;


--
-- Name: consolidar_pontos_aluno(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.consolidar_pontos_aluno() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_aluno_id UUID := COALESCE(NEW.aluno_id, OLD.aluno_id);
BEGIN
  IF v_aluno_id IS NOT NULL THEN
    PERFORM recalcular_pontos_aluno(v_aluno_id);
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$;


--
-- Name: delete_user_account(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.delete_user_account() RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'auth'
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


--
-- Name: detectar_prs_da_sessao(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.detectar_prs_da_sessao(p_historico_id uuid) RETURNS integer
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $_$
DECLARE
  v_aluno_id     UUID;
  v_exercicio_id UUID;
  v_dados        JSONB;
  v_serie        JSONB;
  v_peso         NUMERIC;
  v_reps         INTEGER;
  v_completado   BOOLEAN;
  v_pr_atual     NUMERIC;
  v_count        INTEGER := 0;
BEGIN
  SELECT aluno_id, exercicio_id, dados_sessao
    INTO v_aluno_id, v_exercicio_id, v_dados
  FROM historico_treinos
  WHERE id = p_historico_id;

  IF v_dados IS NULL OR NOT (v_dados ? 'series') THEN
    RETURN 0;
  END IF;

  FOR v_serie IN SELECT * FROM jsonb_array_elements(v_dados->'series')
  LOOP
    -- Peso: cast tolerante (pode vir como string ou número)
    BEGIN
      v_peso := NULLIF(v_serie->>'peso_atual', '')::NUMERIC;
    EXCEPTION WHEN OTHERS THEN
      v_peso := NULL;
    END;

    -- Reps: aceita apenas inteiros puros — rejeita "3x4", "12-15", etc.
    IF (v_serie->>'reps') ~ '^\d+$' THEN
      v_reps := (v_serie->>'reps')::INTEGER;
    ELSE
      v_reps := NULL;
    END IF;

    v_completado := COALESCE((v_serie->>'completado')::BOOLEAN, false);

    -- Ignorar séries inválidas: não completadas, sem peso/reps, fora dos
    -- limites do CHECK constraint (peso <= 1000, reps BETWEEN 1 AND 100)
    CONTINUE WHEN NOT v_completado
               OR v_peso IS NULL OR v_peso <= 0 OR v_peso > 1000
               OR v_reps IS NULL OR v_reps < 1 OR v_reps > 100;

    SELECT peso INTO v_pr_atual
    FROM recordes_pessoais
    WHERE aluno_id     = v_aluno_id
      AND exercicio_id = v_exercicio_id
      AND reps         = v_reps;

    IF v_pr_atual IS NULL OR v_peso > v_pr_atual THEN
      BEGIN
        INSERT INTO recordes_pessoais (aluno_id, exercicio_id, peso, reps, historico_id)
        VALUES (v_aluno_id, v_exercicio_id, v_peso, v_reps, p_historico_id)
        ON CONFLICT (aluno_id, exercicio_id, reps)
        DO UPDATE SET
          peso           = EXCLUDED.peso,
          historico_id   = EXCLUDED.historico_id,
          conquistado_em = NOW();

        v_count := v_count + 1;
      EXCEPTION WHEN OTHERS THEN
        NULL;
      END;
    END IF;
  END LOOP;

  RETURN v_count;
END;
$_$;


--
-- Name: export_user_data(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.export_user_data() RETURNS jsonb
    LANGUAGE plpgsql STABLE
    SET search_path TO ''
    AS $$
DECLARE
  uid    uuid := auth.uid();
  result jsonb;
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'Não autenticado';
  END IF;

  SELECT jsonb_build_object(
    'profile',           (SELECT row_to_json(p) FROM public.profiles p WHERE p.id = uid),
    'medidas',           (SELECT jsonb_agg(row_to_json(m)) FROM public.medidas_aluno m WHERE m.aluno_id = uid),
    'historico_treinos', (SELECT jsonb_agg(row_to_json(h)) FROM public.historico_treinos h WHERE h.aluno_id = uid),
    'fotos',             (SELECT jsonb_agg(row_to_json(f)) FROM public.fotos_evolucao f WHERE f.aluno_id = uid),
    'feedbacks',         (SELECT jsonb_agg(row_to_json(fb)) FROM public.feedbacks_treinos fb WHERE fb.aluno_id = uid),
    'pontuacao',         (SELECT row_to_json(pa) FROM public.pontuacao_alunos pa WHERE pa.aluno_id = uid),
    'fichas_treino',     (SELECT jsonb_agg(row_to_json(ft)) FROM public.fichas_treino ft WHERE ft.aluno_id = uid),
    'agenda_semanal',    (SELECT jsonb_agg(row_to_json(a)) FROM public.agenda_semanal a WHERE a.aluno_id = uid),
    'treinos_manuais',   (SELECT jsonb_agg(row_to_json(tm)) FROM public.treinos_manuais tm WHERE tm.aluno_id = uid),
    'planos_alimentares',(SELECT jsonb_agg(row_to_json(pl)) FROM public.plano_alimentar_pdf pl WHERE pl.aluno_id = uid),
    'exportado_em',      NOW()
  ) INTO result;

  RETURN result;
END;
$$;


--
-- Name: get_auth_user_role(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_auth_user_role() RETURNS text
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO ''
    AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid();
$$;


--
-- Name: get_kpis_aluno(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_kpis_aluno(p_aluno_id uuid DEFAULT auth.uid()) RETURNS jsonb
    LANGUAGE plpgsql STABLE
    SET search_path TO 'public'
    AS $$
DECLARE
  v_volume_semana          NUMERIC := 0;
  v_volume_semana_anterior NUMERIC := 0;
  v_peso_atual             NUMERIC;
  v_peso_30d               NUMERIC;
  v_treinos_mes            INTEGER := 0;
  v_treinos_mes_anterior   INTEGER := 0;
  v_streak                 INTEGER := 0;
BEGIN
  -- Volume semana atual (soma peso × reps de séries completadas com peso > 0)
  SELECT COALESCE(SUM(
    (SELECT COALESCE(SUM(
        NULLIF(serie->>'peso_atual', '')::NUMERIC *
        CASE
          WHEN jsonb_typeof(serie->'reps') = 'number'
            THEN (serie->>'reps')::NUMERIC
          ELSE COALESCE(NULLIF(serie->>'reps', '')::NUMERIC, 0)
        END
      ), 0)
    FROM jsonb_array_elements(COALESCE(h.dados_sessao->'series', '[]'::jsonb)) AS serie
    WHERE COALESCE((serie->>'completado')::BOOLEAN, false) = true
      AND COALESCE(NULLIF(serie->>'peso_atual', '')::NUMERIC, 0) > 0
    )
  ), 0) INTO v_volume_semana
  FROM historico_treinos h
  WHERE h.aluno_id = p_aluno_id
    AND h.data_conclusao >= date_trunc('week', NOW());

  -- Volume semana anterior
  SELECT COALESCE(SUM(
    (SELECT COALESCE(SUM(
        NULLIF(serie->>'peso_atual', '')::NUMERIC *
        CASE
          WHEN jsonb_typeof(serie->'reps') = 'number'
            THEN (serie->>'reps')::NUMERIC
          ELSE COALESCE(NULLIF(serie->>'reps', '')::NUMERIC, 0)
        END
      ), 0)
    FROM jsonb_array_elements(COALESCE(h.dados_sessao->'series', '[]'::jsonb)) AS serie
    WHERE COALESCE((serie->>'completado')::BOOLEAN, false) = true
      AND COALESCE(NULLIF(serie->>'peso_atual', '')::NUMERIC, 0) > 0
    )
  ), 0) INTO v_volume_semana_anterior
  FROM historico_treinos h
  WHERE h.aluno_id = p_aluno_id
    AND h.data_conclusao >= date_trunc('week', NOW() - INTERVAL '1 week')
    AND h.data_conclusao <  date_trunc('week', NOW());

  -- Peso atual (medida mais recente)
  SELECT peso INTO v_peso_atual
  FROM medidas_aluno
  WHERE aluno_id = p_aluno_id AND peso IS NOT NULL
  ORDER BY data_medicao DESC
  LIMIT 1;

  -- Peso há ~30 dias
  SELECT peso INTO v_peso_30d
  FROM medidas_aluno
  WHERE aluno_id = p_aluno_id
    AND peso IS NOT NULL
    AND data_medicao <= NOW() - INTERVAL '30 days'
  ORDER BY data_medicao DESC
  LIMIT 1;

  -- Treinos mês atual (apenas sessões válidas)
  SELECT COUNT(*)::INTEGER INTO v_treinos_mes
  FROM public.v_historico_validos
  WHERE aluno_id = p_aluno_id
    AND data_conclusao >= date_trunc('month', NOW());

  -- Treinos mês anterior
  SELECT COUNT(*)::INTEGER INTO v_treinos_mes_anterior
  FROM public.v_historico_validos
  WHERE aluno_id = p_aluno_id
    AND data_conclusao >= date_trunc('month', NOW() - INTERVAL '1 month')
    AND data_conclusao <  date_trunc('month', NOW());

  -- Streak
  SELECT streak_atual INTO v_streak
  FROM public.v_streak_aluno
  WHERE aluno_id = p_aluno_id;

  RETURN jsonb_build_object(
    'volume_semana_kg',   ROUND(v_volume_semana::NUMERIC, 1),
    'volume_delta_pct',   CASE
      WHEN v_volume_semana_anterior > 0
        THEN ROUND(((v_volume_semana - v_volume_semana_anterior)
                    / v_volume_semana_anterior * 100)::NUMERIC, 1)
      ELSE NULL
    END,
    'peso_atual_kg',      v_peso_atual,
    'peso_delta_kg',      CASE
      WHEN v_peso_30d IS NOT NULL AND v_peso_atual IS NOT NULL
        THEN ROUND((v_peso_atual - v_peso_30d)::NUMERIC, 1)
      ELSE NULL
    END,
    'treinos_mes',        v_treinos_mes,
    'treinos_delta',      v_treinos_mes - v_treinos_mes_anterior,
    'streak_atual',       COALESCE(v_streak, 0)
  );
END;
$$;


--
-- Name: get_ranking_colegas(text, timestamp with time zone, timestamp with time zone); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_ranking_colegas(p_periodo text DEFAULT 'total'::text, p_inicio_periodo timestamp with time zone DEFAULT NULL::timestamp with time zone, p_fim_periodo timestamp with time zone DEFAULT NULL::timestamp with time zone) RETURNS TABLE(aluno_id uuid, full_name text, coaching_reference text, avatar_url text, pontos integer, streak integer)
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_coach_id uuid;
BEGIN
  -- Encontra o coach do usuário autenticado
  SELECT ca.coach_id INTO v_coach_id
  FROM coach_alunos ca
  WHERE ca.aluno_id = auth.uid()
  LIMIT 1;

  IF p_periodo = 'total' THEN
    RETURN QUERY
    SELECT
      p.id                                           AS aluno_id,
      p.full_name::text,
      p.coaching_reference::text,
      p.avatar_url::text,
      COALESCE(pa.total_pontos, 0)::integer          AS pontos,
      COALESCE(vs.streak_atual,  0)::integer         AS streak
    FROM (
      SELECT ca2.aluno_id FROM coach_alunos ca2 WHERE ca2.coach_id = v_coach_id
      UNION
      SELECT auth.uid()
    ) colegas
    JOIN profiles p ON p.id = colegas.aluno_id
    LEFT JOIN pontuacao_alunos pa  ON pa.aluno_id = p.id
    LEFT JOIN v_streak_aluno   vs  ON vs.aluno_id = p.id
    WHERE COALESCE(p.arquivado, false)         = false
      AND COALESCE(p.oculto_no_ranking, false) = false
    ORDER BY COALESCE(pa.total_pontos, 0) DESC;

  ELSE
    -- Cálculo mensal (p_inicio_periodo e p_fim_periodo obrigatórios)
    RETURN QUERY
    WITH colegas_ids AS (
      SELECT ca2.aluno_id FROM coach_alunos ca2 WHERE ca2.coach_id = v_coach_id
      UNION SELECT auth.uid()
    ),
    sessoes AS (
      SELECT
        ht.aluno_id,
        (COUNT(DISTINCT date_trunc('day', ht.data_conclusao)) * 20)::integer AS pts
      FROM historico_treinos ht
      JOIN colegas_ids c ON c.aluno_id = ht.aluno_id
      WHERE ht.data_conclusao >= p_inicio_periodo
        AND ht.data_conclusao <= p_fim_periodo
      GROUP BY ht.aluno_id
    ),
    manuais AS (
      SELECT
        tm.aluno_id,
        COALESCE(SUM(tm.pontos_earn), 0)::integer AS pts
      FROM treinos_manuais tm
      JOIN colegas_ids c ON c.aluno_id = tm.aluno_id
      WHERE tm.concluido = true
        AND tm.data_treino >= p_inicio_periodo::date
        AND tm.data_treino <= p_fim_periodo::date
      GROUP BY tm.aluno_id
    )
    SELECT
      p.id                                                         AS aluno_id,
      p.full_name::text,
      p.coaching_reference::text,
      p.avatar_url::text,
      (COALESCE(s.pts, 0) + COALESCE(m.pts, 0))::integer          AS pontos,
      0::integer                                                   AS streak
    FROM colegas_ids ci
    JOIN profiles p ON p.id = ci.aluno_id
    LEFT JOIN sessoes  s ON s.aluno_id = p.id
    LEFT JOIN manuais  m ON m.aluno_id = p.id
    WHERE COALESCE(p.arquivado, false)         = false
      AND COALESCE(p.oculto_no_ranking, false) = false
    ORDER BY (COALESCE(s.pts, 0) + COALESCE(m.pts, 0)) DESC;
  END IF;
END;
$$;


--
-- Name: get_ultimo_treino_exercicio(uuid, uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_ultimo_treino_exercicio(p_aluno_id uuid, p_exercicio_id uuid) RETURNS jsonb
    LANGUAGE plpgsql STABLE
    SET search_path TO ''
    AS $$
DECLARE
  ultimo_treino jsonb;
BEGIN
  SELECT dados_sessao INTO ultimo_treino
  FROM public.historico_treinos
  WHERE aluno_id    = p_aluno_id
    AND exercicio_id = p_exercicio_id
  ORDER BY data_conclusao DESC
  LIMIT 1;

  RETURN COALESCE(ultimo_treino, '{}'::jsonb);
END;
$$;


--
-- Name: handle_new_user(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.handle_new_user() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
    AS $$
BEGIN
  INSERT INTO public.profiles (id, email, role)
  VALUES (NEW.id, NEW.email, 'aluno')
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;


--
-- Name: realizar_checkin(uuid, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.realizar_checkin(p_aluno_id uuid, p_descricao text DEFAULT NULL::text) RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
    AS $$
DECLARE
  v_hoje DATE := CURRENT_DATE;
  v_checkin_existente UUID;
  v_pontos INTEGER := 10;
  v_resultado JSONB;
BEGIN
  -- Verificar se já fez checkin hoje
  SELECT id INTO v_checkin_existente
  FROM public.checkins
  WHERE aluno_id = p_aluno_id
    AND DATE(created_at) = v_hoje
  LIMIT 1;

  IF v_checkin_existente IS NOT NULL THEN
    RETURN jsonb_build_object(
      'sucesso', false,
      'mensagem', 'Checkin já realizado hoje',
      'pontos', 0
    );
  END IF;

  -- Inserir checkin
  INSERT INTO public.checkins (aluno_id, descricao, pontos)
  VALUES (p_aluno_id, p_descricao, v_pontos);

  -- Atualizar pontuação
  INSERT INTO public.pontuacao_alunos (aluno_id, total_pontos, atualizado_em)
  VALUES (p_aluno_id, v_pontos, NOW())
  ON CONFLICT (aluno_id) DO UPDATE SET
    total_pontos = public.pontuacao_alunos.total_pontos + v_pontos,
    atualizado_em = NOW();

  RETURN jsonb_build_object(
    'sucesso', true,
    'mensagem', 'Checkin realizado com sucesso',
    'pontos', v_pontos
  );
END;
$$;


--
-- Name: recalcular_pontos_aluno(uuid); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.recalcular_pontos_aluno(p_aluno_id uuid) RETURNS integer
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_total INTEGER;
BEGIN
  IF p_aluno_id IS NULL THEN RETURN 0; END IF;

  SELECT
    -- 1. Treinos manuais concluídos (scoring pré-existente via pontos_earn)
    COALESCE((SELECT SUM(pontos_earn) FROM treinos_manuais
              WHERE aluno_id = p_aluno_id AND concluido = true), 0)
    -- 2. Treinos pela tela de execução (20 pts — só sessões válidas)
    + COALESCE((SELECT COUNT(*) * 20 FROM v_historico_validos
                WHERE aluno_id = p_aluno_id), 0)
    -- 3. Recordes pessoais (10 pts cada)
    + COALESCE((SELECT COUNT(*) * 10 FROM recordes_pessoais
                WHERE aluno_id = p_aluno_id), 0)
    -- 4. Medidas registradas (3 pts cada)
    + COALESCE((SELECT COUNT(*) * 3 FROM medidas_aluno
                WHERE aluno_id = p_aluno_id), 0)
    -- 5. Fotos de evolução (5 pts cada)
    + COALESCE((SELECT COUNT(*) * 5 FROM fotos_evolucao
                WHERE aluno_id = p_aluno_id), 0)
  INTO v_total;

  INSERT INTO pontuacao_alunos (aluno_id, total_pontos, atualizado_em)
  VALUES (p_aluno_id, v_total, NOW())
  ON CONFLICT (aluno_id) DO UPDATE SET
    total_pontos  = EXCLUDED.total_pontos,
    atualizado_em = NOW();

  RETURN v_total;
END;
$$;


--
-- Name: rls_auto_enable(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.rls_auto_enable() RETURNS event_trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'pg_catalog'
    AS $$
DECLARE
  cmd record;
BEGIN
  FOR cmd IN
    SELECT *
    FROM pg_event_trigger_ddl_commands()
    WHERE command_tag IN ('CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO')
      AND object_type IN ('table','partitioned table')
  LOOP
     IF cmd.schema_name IS NOT NULL AND cmd.schema_name IN ('public') AND cmd.schema_name NOT IN ('pg_catalog','information_schema') AND cmd.schema_name NOT LIKE 'pg_toast%' AND cmd.schema_name NOT LIKE 'pg_temp%' THEN
      BEGIN
        EXECUTE format('alter table if exists %s enable row level security', cmd.object_identity);
        RAISE LOG 'rls_auto_enable: enabled RLS on %', cmd.object_identity;
      EXCEPTION
        WHEN OTHERS THEN
          RAISE LOG 'rls_auto_enable: failed to enable RLS on %', cmd.object_identity;
      END;
     ELSE
        RAISE LOG 'rls_auto_enable: skip % (either system schema or not in enforced list: %.)', cmd.object_identity, cmd.schema_name;
     END IF;
  END LOOP;
END;
$$;


--
-- Name: trg_detectar_prs(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.trg_detectar_prs() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  -- Otimização: só roda se dados_sessao foi inserido/alterado
  IF TG_OP = 'INSERT'
     OR (TG_OP = 'UPDATE' AND NEW.dados_sessao IS DISTINCT FROM OLD.dados_sessao)
  THEN
    PERFORM detectar_prs_da_sessao(NEW.id);
  END IF;
  RETURN NEW;
END;
$$;


--
-- Name: update_feedbacks_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_feedbacks_updated_at() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO ''
    AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;


--
-- Name: update_updated_at_column(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_updated_at_column() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO ''
    AS $$
BEGIN
  NEW.atualizado_em = NOW();
  RETURN NEW;
END;
$$;


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: agenda_semanal; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.agenda_semanal (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    aluno_id uuid,
    dia_semana integer NOT NULL,
    ficha_id uuid,
    is_off boolean DEFAULT false,
    updated_at timestamp with time zone DEFAULT now(),
    treino_pdf_id uuid,
    created_at timestamp with time zone DEFAULT now(),
    observacoes text
);


--
-- Name: coach_alunos; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.coach_alunos (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    coach_id uuid NOT NULL,
    aluno_id uuid NOT NULL,
    criado_em timestamp without time zone DEFAULT now()
);


--
-- Name: consumos_refeicao; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.consumos_refeicao (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    aluno_id uuid NOT NULL,
    refeicao_id uuid NOT NULL,
    data_consumo date DEFAULT CURRENT_DATE NOT NULL,
    consumido_em timestamp with time zone DEFAULT now() NOT NULL,
    observacoes text
);


--
-- Name: exercicios_biblioteca; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.exercicios_biblioteca (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    nome text NOT NULL,
    video_url text,
    imagem_url text,
    grupo_muscular text,
    descricao text,
    equipamento character varying,
    musculos_secundarios text,
    tipo_exercicio character varying,
    CONSTRAINT exercicios_biblioteca_equipamento_check CHECK (((equipamento IS NULL) OR ((equipamento)::text = ANY (ARRAY[('Nenhum'::character varying)::text, ('Banda de Resistência'::character varying)::text, ('Banda de Suspensão'::character varying)::text, ('Barra'::character varying)::text, ('Disco de Peso'::character varying)::text, ('Haltere'::character varying)::text, ('Kettlebell'::character varying)::text, ('Máquina'::character varying)::text, ('Outro'::character varying)::text])))),
    CONSTRAINT exercicios_biblioteca_tipo_exercicio_check CHECK (((tipo_exercicio IS NULL) OR ((tipo_exercicio)::text = ANY (ARRAY[('Peso & Repetições'::character varying)::text, ('Repetições'::character varying)::text, ('Peso Corporal com Peso Acrescido'::character varying)::text, ('Duração'::character varying)::text, ('Duração e Peso'::character varying)::text, ('Distância e Duração'::character varying)::text, ('Peso e Distância'::character varying)::text]))))
);


--
-- Name: feedbacks_treinos; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.feedbacks_treinos (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    aluno_id uuid NOT NULL,
    coach_id uuid NOT NULL,
    ficha_id uuid,
    feedback text NOT NULL,
    tipo character varying,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    CONSTRAINT feedbacks_treinos_tipo_check CHECK (((tipo)::text = ANY (ARRAY[('treino_completo'::character varying)::text, ('treino_dia'::character varying)::text])))
);


--
-- Name: fichas_treino; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.fichas_treino (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    aluno_id uuid,
    coach_id uuid,
    configuracao jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    ativo boolean DEFAULT true,
    nome_rotina character varying DEFAULT 'Nova Ficha'::character varying NOT NULL,
    criado_em timestamp with time zone DEFAULT now()
);


--
-- Name: fotos_evolucao; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.fotos_evolucao (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    aluno_id uuid,
    url_foto text NOT NULL,
    posicao text,
    data_upload timestamp with time zone DEFAULT now(),
    periodo_referencia date DEFAULT CURRENT_DATE,
    CONSTRAINT fotos_evolucao_posicao_check CHECK ((posicao = ANY (ARRAY['frente'::text, 'lado'::text, 'costas'::text])))
);


--
-- Name: historico_treinos; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.historico_treinos (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    aluno_id uuid,
    ficha_id uuid,
    dados_sessao jsonb NOT NULL,
    data_conclusao timestamp with time zone DEFAULT now(),
    exercicio_id uuid NOT NULL
);


--
-- Name: logs_treino; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.logs_treino (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    aluno_id uuid,
    exercicio_id uuid,
    sessao_id uuid,
    peso double precision,
    reps integer,
    data_conclusao timestamp with time zone DEFAULT now()
);


--
-- Name: medidas_aluno; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.medidas_aluno (
    id uuid DEFAULT extensions.uuid_generate_v4() NOT NULL,
    aluno_id uuid NOT NULL,
    data_medicao timestamp with time zone DEFAULT now(),
    peso numeric,
    altura numeric,
    gordura_corporal numeric,
    massa_magra numeric,
    pescoco numeric,
    ombros numeric,
    peitoral numeric,
    braco_direito numeric,
    braco_esquerdo numeric,
    antebraco_direito numeric,
    antebraco_esquerdo numeric,
    cintura numeric,
    abdomen numeric,
    quadril numeric,
    coxa_direita numeric,
    coxa_esquerda numeric,
    panturrilha_direita numeric,
    panturrilha_esquerda numeric,
    observacoes text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: parceiros; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.parceiros (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    nome_marca text NOT NULL,
    descricao text,
    logo_url text,
    ordem integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT now(),
    cupom text,
    link_desconto text,
    imagens text[] DEFAULT ARRAY[]::text[],
    ativo boolean DEFAULT true,
    coach_id uuid
);


--
-- Name: plano_alimentar_audit; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.plano_alimentar_audit (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    plano_id uuid,
    acessado_por uuid,
    acessado_em timestamp without time zone DEFAULT now()
);


--
-- Name: plano_alimentar_pdf; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.plano_alimentar_pdf (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    aluno_id uuid NOT NULL,
    coach_id uuid NOT NULL,
    nome_arquivo text NOT NULL,
    url_pdf text NOT NULL,
    descricao text,
    criado_em timestamp without time zone DEFAULT now(),
    atualizado_em timestamp without time zone DEFAULT now()
);


--
-- Name: pontuacao_alunos; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.pontuacao_alunos (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    aluno_id uuid NOT NULL,
    total_pontos integer DEFAULT 0,
    atualizado_em timestamp without time zone DEFAULT now()
);


--
-- Name: profiles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.profiles (
    id uuid NOT NULL,
    full_name text,
    email text,
    role text DEFAULT 'aluno'::text,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    ultimo_checkin date,
    status_pagamento text DEFAULT 'pendente'::text,
    data_expiracao date,
    data_inicio date,
    tipo_plano text,
    avatar_url text,
    valor_plano numeric,
    arquivado boolean DEFAULT false,
    coach_id uuid,
    coaching_reference character varying,
    date_of_birth date,
    first_access_completed boolean DEFAULT false,
    height_cm smallint,
    sexo text,
    objetivo text,
    unidade_peso text DEFAULT 'kg'::text NOT NULL,
    unidade_medida text DEFAULT 'cm'::text NOT NULL,
    incremento_peso_padrao numeric(4,2) DEFAULT 2.5 NOT NULL,
    oculto_no_ranking boolean DEFAULT false NOT NULL,
    notificacoes_ativas boolean DEFAULT true NOT NULL,
    CONSTRAINT profiles_height_cm_check CHECK (((height_cm IS NULL) OR ((height_cm >= 100) AND (height_cm <= 250)))),
    CONSTRAINT profiles_objetivo_check CHECK (((objetivo IS NULL) OR (objetivo = ANY (ARRAY['cutting'::text, 'bulking'::text, 'manutencao'::text, 'recomposicao'::text])))),
    CONSTRAINT profiles_role_check CHECK ((role = ANY (ARRAY['aluno'::text, 'coach'::text, 'super_admin'::text]))),
    CONSTRAINT profiles_sexo_check CHECK (((sexo IS NULL) OR (sexo = ANY (ARRAY['masculino'::text, 'feminino'::text, 'outro'::text])))),
    CONSTRAINT profiles_status_pagamento_check CHECK ((status_pagamento = ANY (ARRAY['pago'::text, 'pendente'::text, 'atrasado'::text]))),
    CONSTRAINT profiles_unidade_medida_check CHECK ((unidade_medida = ANY (ARRAY['cm'::text, 'in'::text]))),
    CONSTRAINT profiles_unidade_peso_check CHECK ((unidade_peso = ANY (ARRAY['kg'::text, 'lb'::text])))
);


--
-- Name: recordes_pessoais; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.recordes_pessoais (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    aluno_id uuid NOT NULL,
    exercicio_id uuid NOT NULL,
    peso numeric(6,2) NOT NULL,
    reps integer NOT NULL,
    historico_id uuid,
    conquistado_em timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT recordes_pessoais_peso_check CHECK (((peso >= (0)::numeric) AND (peso <= (1000)::numeric))),
    CONSTRAINT recordes_pessoais_reps_check CHECK (((reps >= 1) AND (reps <= 100)))
);


--
-- Name: refeicoes_plano; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.refeicoes_plano (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    plano_id uuid NOT NULL,
    nome text NOT NULL,
    horario_sugerido time without time zone,
    ordem integer DEFAULT 0 NOT NULL,
    ingredientes jsonb DEFAULT '[]'::jsonb NOT NULL,
    observacoes text,
    criado_em timestamp with time zone DEFAULT now()
);


--
-- Name: registros_agua; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.registros_agua (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    aluno_id uuid NOT NULL,
    data_registro date DEFAULT CURRENT_DATE NOT NULL,
    copos integer DEFAULT 0 NOT NULL,
    ml_por_copo integer DEFAULT 250 NOT NULL,
    atualizado_em timestamp with time zone DEFAULT now(),
    CONSTRAINT registros_agua_copos_check CHECK (((copos >= 0) AND (copos <= 20)))
);


--
-- Name: registros_treino; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.registros_treino (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    aluno_id uuid,
    exercicio_nome text NOT NULL,
    series integer,
    repeticoes integer,
    carga double precision,
    data_registro timestamp with time zone DEFAULT now()
);


--
-- Name: temp_id_mapping; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.temp_id_mapping (
    email text NOT NULL,
    old_id uuid,
    new_id uuid
);


--
-- Name: treinos_alunos; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.treinos_alunos (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    aluno_id uuid NOT NULL,
    url_pdf text NOT NULL,
    nome_arquivo text NOT NULL,
    data_upload timestamp with time zone DEFAULT now(),
    coach_id uuid
);


--
-- Name: treinos_manuais; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.treinos_manuais (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    aluno_id uuid NOT NULL,
    coach_id uuid NOT NULL,
    tipo_treino text NOT NULL,
    duracao_minutos integer,
    descricao text,
    data_treino date NOT NULL,
    concluido boolean DEFAULT false,
    pontos_earn integer DEFAULT 0,
    criado_em timestamp without time zone DEFAULT now(),
    atualizado_em timestamp without time zone DEFAULT now(),
    CONSTRAINT treinos_manuais_tipo_treino_check CHECK ((tipo_treino = ANY (ARRAY['musculacao'::text, 'cardio'::text])))
);


--
-- Name: v_historico_validos; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.v_historico_validos WITH (security_invoker='true') AS
 SELECT id,
    aluno_id,
    ficha_id,
    dados_sessao,
    data_conclusao,
    exercicio_id
   FROM public.historico_treinos h
  WHERE (EXISTS ( SELECT 1
           FROM jsonb_array_elements(COALESCE((h.dados_sessao -> 'series'::text), '[]'::jsonb)) s(value)
          WHERE ((COALESCE(((s.value ->> 'completado'::text))::boolean, false) = true) AND (COALESCE((NULLIF((s.value ->> 'peso_atual'::text), ''::text))::numeric, (0)::numeric) > (0)::numeric))));


--
-- Name: v_atletas_ativos_semana; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.v_atletas_ativos_semana WITH (security_invoker='true') AS
 SELECT (count(DISTINCT aluno_id))::integer AS quantidade
   FROM public.v_historico_validos
  WHERE (data_conclusao >= date_trunc('week'::text, now()));


--
-- Name: v_streak_aluno; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.v_streak_aluno AS
 WITH semanas_treino AS (
         SELECT DISTINCT v_historico_validos.aluno_id,
            date_trunc('week'::text, v_historico_validos.data_conclusao) AS semana
           FROM public.v_historico_validos
        ), gaps AS (
         SELECT semanas_treino.aluno_id,
            semanas_treino.semana,
            (semanas_treino.semana - ('7 days'::interval * (row_number() OVER (PARTITION BY semanas_treino.aluno_id ORDER BY semanas_treino.semana DESC))::double precision)) AS grupo
           FROM semanas_treino
        )
 SELECT aluno_id,
    (count(*))::integer AS streak_atual
   FROM gaps
  WHERE (grupo = ( SELECT max(g2.grupo) AS max
           FROM gaps g2
          WHERE ((g2.aluno_id = gaps.aluno_id) AND (g2.semana >= date_trunc('week'::text, (CURRENT_DATE - '7 days'::interval))))))
  GROUP BY aluno_id;


--
-- Name: v_leaderboard; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.v_leaderboard WITH (security_invoker='on') AS
 SELECT p.id AS aluno_id,
    p.full_name,
    p.coaching_reference,
    p.avatar_url,
    COALESCE(pa.total_pontos, 0) AS pontos,
    COALESCE(s.streak_atual, 0) AS streak,
    row_number() OVER (ORDER BY COALESCE(pa.total_pontos, 0) DESC) AS posicao
   FROM ((public.profiles p
     LEFT JOIN public.pontuacao_alunos pa ON ((pa.aluno_id = p.id)))
     LEFT JOIN public.v_streak_aluno s ON ((s.aluno_id = p.id)))
  WHERE ((p.role = 'aluno'::text) AND (COALESCE(p.arquivado, false) = false) AND (COALESCE(p.oculto_no_ranking, false) = false));


--
-- Name: agenda_semanal agenda_semanal_aluno_dia_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.agenda_semanal
    ADD CONSTRAINT agenda_semanal_aluno_dia_unique UNIQUE (aluno_id, dia_semana);


--
-- Name: agenda_semanal agenda_semanal_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.agenda_semanal
    ADD CONSTRAINT agenda_semanal_pkey PRIMARY KEY (id);


--
-- Name: medidas_aluno chk_med_abdomen; Type: CHECK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE public.medidas_aluno
    ADD CONSTRAINT chk_med_abdomen CHECK (((abdomen IS NULL) OR ((abdomen >= (40)::numeric) AND (abdomen <= (200)::numeric)))) NOT VALID;


--
-- Name: medidas_aluno chk_med_altura; Type: CHECK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE public.medidas_aluno
    ADD CONSTRAINT chk_med_altura CHECK (((altura IS NULL) OR ((altura >= (100)::numeric) AND (altura <= (250)::numeric)))) NOT VALID;


--
-- Name: medidas_aluno chk_med_antebraco_dir; Type: CHECK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE public.medidas_aluno
    ADD CONSTRAINT chk_med_antebraco_dir CHECK (((antebraco_direito IS NULL) OR ((antebraco_direito >= (15)::numeric) AND (antebraco_direito <= (60)::numeric)))) NOT VALID;


--
-- Name: medidas_aluno chk_med_antebraco_esq; Type: CHECK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE public.medidas_aluno
    ADD CONSTRAINT chk_med_antebraco_esq CHECK (((antebraco_esquerdo IS NULL) OR ((antebraco_esquerdo >= (15)::numeric) AND (antebraco_esquerdo <= (60)::numeric)))) NOT VALID;


--
-- Name: medidas_aluno chk_med_braco_dir; Type: CHECK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE public.medidas_aluno
    ADD CONSTRAINT chk_med_braco_dir CHECK (((braco_direito IS NULL) OR ((braco_direito >= (15)::numeric) AND (braco_direito <= (80)::numeric)))) NOT VALID;


--
-- Name: medidas_aluno chk_med_braco_esq; Type: CHECK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE public.medidas_aluno
    ADD CONSTRAINT chk_med_braco_esq CHECK (((braco_esquerdo IS NULL) OR ((braco_esquerdo >= (15)::numeric) AND (braco_esquerdo <= (80)::numeric)))) NOT VALID;


--
-- Name: medidas_aluno chk_med_cintura; Type: CHECK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE public.medidas_aluno
    ADD CONSTRAINT chk_med_cintura CHECK (((cintura IS NULL) OR ((cintura >= (40)::numeric) AND (cintura <= (200)::numeric)))) NOT VALID;


--
-- Name: medidas_aluno chk_med_coxa_dir; Type: CHECK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE public.medidas_aluno
    ADD CONSTRAINT chk_med_coxa_dir CHECK (((coxa_direita IS NULL) OR ((coxa_direita >= (25)::numeric) AND (coxa_direita <= (100)::numeric)))) NOT VALID;


--
-- Name: medidas_aluno chk_med_coxa_esq; Type: CHECK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE public.medidas_aluno
    ADD CONSTRAINT chk_med_coxa_esq CHECK (((coxa_esquerda IS NULL) OR ((coxa_esquerda >= (25)::numeric) AND (coxa_esquerda <= (100)::numeric)))) NOT VALID;


--
-- Name: medidas_aluno chk_med_gordura; Type: CHECK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE public.medidas_aluno
    ADD CONSTRAINT chk_med_gordura CHECK (((gordura_corporal IS NULL) OR ((gordura_corporal >= (3)::numeric) AND (gordura_corporal <= (60)::numeric)))) NOT VALID;


--
-- Name: medidas_aluno chk_med_massa_magra; Type: CHECK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE public.medidas_aluno
    ADD CONSTRAINT chk_med_massa_magra CHECK (((massa_magra IS NULL) OR ((massa_magra >= (20)::numeric) AND (massa_magra <= (200)::numeric)))) NOT VALID;


--
-- Name: medidas_aluno chk_med_ombros; Type: CHECK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE public.medidas_aluno
    ADD CONSTRAINT chk_med_ombros CHECK (((ombros IS NULL) OR ((ombros >= (60)::numeric) AND (ombros <= (200)::numeric)))) NOT VALID;


--
-- Name: medidas_aluno chk_med_pant_dir; Type: CHECK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE public.medidas_aluno
    ADD CONSTRAINT chk_med_pant_dir CHECK (((panturrilha_direita IS NULL) OR ((panturrilha_direita >= (20)::numeric) AND (panturrilha_direita <= (70)::numeric)))) NOT VALID;


--
-- Name: medidas_aluno chk_med_pant_esq; Type: CHECK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE public.medidas_aluno
    ADD CONSTRAINT chk_med_pant_esq CHECK (((panturrilha_esquerda IS NULL) OR ((panturrilha_esquerda >= (20)::numeric) AND (panturrilha_esquerda <= (70)::numeric)))) NOT VALID;


--
-- Name: medidas_aluno chk_med_peitoral; Type: CHECK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE public.medidas_aluno
    ADD CONSTRAINT chk_med_peitoral CHECK (((peitoral IS NULL) OR ((peitoral >= (40)::numeric) AND (peitoral <= (200)::numeric)))) NOT VALID;


--
-- Name: medidas_aluno chk_med_pescoco; Type: CHECK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE public.medidas_aluno
    ADD CONSTRAINT chk_med_pescoco CHECK (((pescoco IS NULL) OR ((pescoco >= (25)::numeric) AND (pescoco <= (60)::numeric)))) NOT VALID;


--
-- Name: medidas_aluno chk_med_peso; Type: CHECK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE public.medidas_aluno
    ADD CONSTRAINT chk_med_peso CHECK (((peso IS NULL) OR ((peso >= (30)::numeric) AND (peso <= (300)::numeric)))) NOT VALID;


--
-- Name: medidas_aluno chk_med_quadril; Type: CHECK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE public.medidas_aluno
    ADD CONSTRAINT chk_med_quadril CHECK (((quadril IS NULL) OR ((quadril >= (40)::numeric) AND (quadril <= (200)::numeric)))) NOT VALID;


--
-- Name: coach_alunos coach_alunos_coach_id_aluno_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.coach_alunos
    ADD CONSTRAINT coach_alunos_coach_id_aluno_id_key UNIQUE (coach_id, aluno_id);


--
-- Name: coach_alunos coach_alunos_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.coach_alunos
    ADD CONSTRAINT coach_alunos_pkey PRIMARY KEY (id);


--
-- Name: consumos_refeicao consumos_refeicao_aluno_id_refeicao_id_data_consumo_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.consumos_refeicao
    ADD CONSTRAINT consumos_refeicao_aluno_id_refeicao_id_data_consumo_key UNIQUE (aluno_id, refeicao_id, data_consumo);


--
-- Name: consumos_refeicao consumos_refeicao_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.consumos_refeicao
    ADD CONSTRAINT consumos_refeicao_pkey PRIMARY KEY (id);


--
-- Name: exercicios_biblioteca exercicios_biblioteca_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.exercicios_biblioteca
    ADD CONSTRAINT exercicios_biblioteca_pkey PRIMARY KEY (id);


--
-- Name: feedbacks_treinos feedbacks_treinos_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.feedbacks_treinos
    ADD CONSTRAINT feedbacks_treinos_pkey PRIMARY KEY (id);


--
-- Name: fichas_treino fichas_treino_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fichas_treino
    ADD CONSTRAINT fichas_treino_pkey PRIMARY KEY (id);


--
-- Name: fotos_evolucao fotos_evolucao_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fotos_evolucao
    ADD CONSTRAINT fotos_evolucao_pkey PRIMARY KEY (id);


--
-- Name: historico_treinos historico_treinos_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.historico_treinos
    ADD CONSTRAINT historico_treinos_pkey PRIMARY KEY (id);


--
-- Name: logs_treino logs_treino_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.logs_treino
    ADD CONSTRAINT logs_treino_pkey PRIMARY KEY (id);


--
-- Name: medidas_aluno medidas_aluno_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.medidas_aluno
    ADD CONSTRAINT medidas_aluno_pkey PRIMARY KEY (id);


--
-- Name: parceiros parceiros_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.parceiros
    ADD CONSTRAINT parceiros_pkey PRIMARY KEY (id);


--
-- Name: plano_alimentar_audit plano_alimentar_audit_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.plano_alimentar_audit
    ADD CONSTRAINT plano_alimentar_audit_pkey PRIMARY KEY (id);


--
-- Name: plano_alimentar_pdf plano_alimentar_pdf_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.plano_alimentar_pdf
    ADD CONSTRAINT plano_alimentar_pdf_pkey PRIMARY KEY (id);


--
-- Name: pontuacao_alunos pontuacao_alunos_aluno_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pontuacao_alunos
    ADD CONSTRAINT pontuacao_alunos_aluno_id_key UNIQUE (aluno_id);


--
-- Name: pontuacao_alunos pontuacao_alunos_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pontuacao_alunos
    ADD CONSTRAINT pontuacao_alunos_pkey PRIMARY KEY (id);


--
-- Name: profiles profiles_email_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_email_key UNIQUE (email);


--
-- Name: profiles profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_pkey PRIMARY KEY (id);


--
-- Name: recordes_pessoais recordes_pessoais_aluno_id_exercicio_id_reps_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.recordes_pessoais
    ADD CONSTRAINT recordes_pessoais_aluno_id_exercicio_id_reps_key UNIQUE (aluno_id, exercicio_id, reps);


--
-- Name: recordes_pessoais recordes_pessoais_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.recordes_pessoais
    ADD CONSTRAINT recordes_pessoais_pkey PRIMARY KEY (id);


--
-- Name: refeicoes_plano refeicoes_plano_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.refeicoes_plano
    ADD CONSTRAINT refeicoes_plano_pkey PRIMARY KEY (id);


--
-- Name: registros_agua registros_agua_aluno_id_data_registro_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.registros_agua
    ADD CONSTRAINT registros_agua_aluno_id_data_registro_key UNIQUE (aluno_id, data_registro);


--
-- Name: registros_agua registros_agua_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.registros_agua
    ADD CONSTRAINT registros_agua_pkey PRIMARY KEY (id);


--
-- Name: registros_treino registros_treino_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.registros_treino
    ADD CONSTRAINT registros_treino_pkey PRIMARY KEY (id);


--
-- Name: temp_id_mapping temp_id_mapping_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.temp_id_mapping
    ADD CONSTRAINT temp_id_mapping_pkey PRIMARY KEY (email);


--
-- Name: treinos_alunos treinos_alunos_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.treinos_alunos
    ADD CONSTRAINT treinos_alunos_pkey PRIMARY KEY (id);


--
-- Name: treinos_manuais treinos_manuais_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.treinos_manuais
    ADD CONSTRAINT treinos_manuais_pkey PRIMARY KEY (id);


--
-- Name: idx_agua_aluno_data; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_agua_aluno_data ON public.registros_agua USING btree (aluno_id, data_registro DESC);


--
-- Name: idx_coach_alunos_aluno_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_coach_alunos_aluno_id ON public.coach_alunos USING btree (aluno_id);


--
-- Name: idx_coach_alunos_coach_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_coach_alunos_coach_id ON public.coach_alunos USING btree (coach_id);


--
-- Name: idx_consumos_aluno_data; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_consumos_aluno_data ON public.consumos_refeicao USING btree (aluno_id, data_consumo DESC);


--
-- Name: idx_recordes_aluno; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_recordes_aluno ON public.recordes_pessoais USING btree (aluno_id, conquistado_em DESC);


--
-- Name: idx_refeicoes_plano; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_refeicoes_plano ON public.refeicoes_plano USING btree (plano_id, ordem);


--
-- Name: historico_treinos on_historico_treino_modificado; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER on_historico_treino_modificado AFTER INSERT OR UPDATE OF dados_sessao ON public.historico_treinos FOR EACH ROW EXECUTE FUNCTION public.trg_detectar_prs();


--
-- Name: fotos_evolucao trg_pontos_fotos; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_pontos_fotos AFTER INSERT OR DELETE ON public.fotos_evolucao FOR EACH ROW EXECUTE FUNCTION public.consolidar_pontos_aluno();


--
-- Name: historico_treinos trg_pontos_historico; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_pontos_historico AFTER INSERT OR DELETE OR UPDATE OF dados_sessao ON public.historico_treinos FOR EACH ROW EXECUTE FUNCTION public.consolidar_pontos_aluno();


--
-- Name: medidas_aluno trg_pontos_medidas; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_pontos_medidas AFTER INSERT OR DELETE ON public.medidas_aluno FOR EACH ROW EXECUTE FUNCTION public.consolidar_pontos_aluno();


--
-- Name: recordes_pessoais trg_pontos_recordes; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_pontos_recordes AFTER INSERT OR DELETE ON public.recordes_pessoais FOR EACH ROW EXECUTE FUNCTION public.consolidar_pontos_aluno();


--
-- Name: treinos_manuais trigger_atualizar_pontos_treino; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_atualizar_pontos_treino BEFORE INSERT OR UPDATE ON public.treinos_manuais FOR EACH ROW EXECUTE FUNCTION public.atualizar_pontos_treino();


--
-- Name: treinos_manuais trigger_consolidar_pontos_aluno; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_consolidar_pontos_aluno AFTER INSERT OR UPDATE ON public.treinos_manuais FOR EACH ROW EXECUTE FUNCTION public.consolidar_pontos_aluno();


--
-- Name: feedbacks_treinos trigger_update_feedbacks_timestamp; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_update_feedbacks_timestamp BEFORE UPDATE ON public.feedbacks_treinos FOR EACH ROW EXECUTE FUNCTION public.update_feedbacks_updated_at();


--
-- Name: medidas_aluno update_medidas_aluno_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_medidas_aluno_updated_at BEFORE UPDATE ON public.medidas_aluno FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: agenda_semanal agenda_semanal_aluno_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.agenda_semanal
    ADD CONSTRAINT agenda_semanal_aluno_id_fkey FOREIGN KEY (aluno_id) REFERENCES auth.users(id);


--
-- Name: agenda_semanal agenda_semanal_ficha_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.agenda_semanal
    ADD CONSTRAINT agenda_semanal_ficha_id_fkey FOREIGN KEY (ficha_id) REFERENCES public.fichas_treino(id);


--
-- Name: agenda_semanal agenda_semanal_treino_pdf_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.agenda_semanal
    ADD CONSTRAINT agenda_semanal_treino_pdf_id_fkey FOREIGN KEY (treino_pdf_id) REFERENCES public.treinos_alunos(id);


--
-- Name: coach_alunos coach_alunos_aluno_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.coach_alunos
    ADD CONSTRAINT coach_alunos_aluno_id_fkey FOREIGN KEY (aluno_id) REFERENCES public.profiles(id);


--
-- Name: coach_alunos coach_alunos_coach_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.coach_alunos
    ADD CONSTRAINT coach_alunos_coach_id_fkey FOREIGN KEY (coach_id) REFERENCES public.profiles(id);


--
-- Name: consumos_refeicao consumos_refeicao_aluno_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.consumos_refeicao
    ADD CONSTRAINT consumos_refeicao_aluno_id_fkey FOREIGN KEY (aluno_id) REFERENCES public.profiles(id);


--
-- Name: consumos_refeicao consumos_refeicao_refeicao_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.consumos_refeicao
    ADD CONSTRAINT consumos_refeicao_refeicao_id_fkey FOREIGN KEY (refeicao_id) REFERENCES public.refeicoes_plano(id) ON DELETE CASCADE;


--
-- Name: feedbacks_treinos feedbacks_treinos_aluno_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.feedbacks_treinos
    ADD CONSTRAINT feedbacks_treinos_aluno_id_fkey FOREIGN KEY (aluno_id) REFERENCES public.profiles(id);


--
-- Name: feedbacks_treinos feedbacks_treinos_coach_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.feedbacks_treinos
    ADD CONSTRAINT feedbacks_treinos_coach_id_fkey FOREIGN KEY (coach_id) REFERENCES public.profiles(id);


--
-- Name: feedbacks_treinos feedbacks_treinos_ficha_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.feedbacks_treinos
    ADD CONSTRAINT feedbacks_treinos_ficha_id_fkey FOREIGN KEY (ficha_id) REFERENCES public.fichas_treino(id);


--
-- Name: fichas_treino fichas_treino_aluno_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fichas_treino
    ADD CONSTRAINT fichas_treino_aluno_id_fkey FOREIGN KEY (aluno_id) REFERENCES public.profiles(id);


--
-- Name: fichas_treino fichas_treino_coach_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fichas_treino
    ADD CONSTRAINT fichas_treino_coach_id_fkey FOREIGN KEY (coach_id) REFERENCES public.profiles(id);


--
-- Name: fotos_evolucao fotos_evolucao_aluno_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fotos_evolucao
    ADD CONSTRAINT fotos_evolucao_aluno_id_fkey FOREIGN KEY (aluno_id) REFERENCES public.profiles(id);


--
-- Name: historico_treinos historico_treinos_aluno_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.historico_treinos
    ADD CONSTRAINT historico_treinos_aluno_id_fkey FOREIGN KEY (aluno_id) REFERENCES public.profiles(id);


--
-- Name: historico_treinos historico_treinos_exercicio_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.historico_treinos
    ADD CONSTRAINT historico_treinos_exercicio_id_fkey FOREIGN KEY (exercicio_id) REFERENCES public.exercicios_biblioteca(id);


--
-- Name: historico_treinos historico_treinos_ficha_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.historico_treinos
    ADD CONSTRAINT historico_treinos_ficha_id_fkey FOREIGN KEY (ficha_id) REFERENCES public.fichas_treino(id);


--
-- Name: logs_treino logs_treino_aluno_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.logs_treino
    ADD CONSTRAINT logs_treino_aluno_id_fkey FOREIGN KEY (aluno_id) REFERENCES auth.users(id);


--
-- Name: logs_treino logs_treino_exercicio_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.logs_treino
    ADD CONSTRAINT logs_treino_exercicio_id_fkey FOREIGN KEY (exercicio_id) REFERENCES public.exercicios_biblioteca(id);


--
-- Name: medidas_aluno medidas_aluno_aluno_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.medidas_aluno
    ADD CONSTRAINT medidas_aluno_aluno_id_fkey FOREIGN KEY (aluno_id) REFERENCES public.profiles(id);


--
-- Name: parceiros parceiros_coach_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.parceiros
    ADD CONSTRAINT parceiros_coach_id_fkey FOREIGN KEY (coach_id) REFERENCES public.profiles(id);


--
-- Name: plano_alimentar_audit plano_alimentar_audit_acessado_por_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.plano_alimentar_audit
    ADD CONSTRAINT plano_alimentar_audit_acessado_por_fkey FOREIGN KEY (acessado_por) REFERENCES public.profiles(id);


--
-- Name: plano_alimentar_audit plano_alimentar_audit_plano_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.plano_alimentar_audit
    ADD CONSTRAINT plano_alimentar_audit_plano_id_fkey FOREIGN KEY (plano_id) REFERENCES public.plano_alimentar_pdf(id);


--
-- Name: plano_alimentar_pdf plano_alimentar_pdf_aluno_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.plano_alimentar_pdf
    ADD CONSTRAINT plano_alimentar_pdf_aluno_id_fkey FOREIGN KEY (aluno_id) REFERENCES public.profiles(id);


--
-- Name: plano_alimentar_pdf plano_alimentar_pdf_coach_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.plano_alimentar_pdf
    ADD CONSTRAINT plano_alimentar_pdf_coach_id_fkey FOREIGN KEY (coach_id) REFERENCES public.profiles(id);


--
-- Name: pontuacao_alunos pontuacao_alunos_aluno_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pontuacao_alunos
    ADD CONSTRAINT pontuacao_alunos_aluno_id_fkey FOREIGN KEY (aluno_id) REFERENCES public.profiles(id);


--
-- Name: profiles profiles_coach_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_coach_id_fkey FOREIGN KEY (coach_id) REFERENCES public.profiles(id);


--
-- Name: profiles profiles_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id);


--
-- Name: recordes_pessoais recordes_pessoais_aluno_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.recordes_pessoais
    ADD CONSTRAINT recordes_pessoais_aluno_id_fkey FOREIGN KEY (aluno_id) REFERENCES public.profiles(id);


--
-- Name: recordes_pessoais recordes_pessoais_exercicio_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.recordes_pessoais
    ADD CONSTRAINT recordes_pessoais_exercicio_id_fkey FOREIGN KEY (exercicio_id) REFERENCES public.exercicios_biblioteca(id);


--
-- Name: recordes_pessoais recordes_pessoais_historico_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.recordes_pessoais
    ADD CONSTRAINT recordes_pessoais_historico_id_fkey FOREIGN KEY (historico_id) REFERENCES public.historico_treinos(id) ON DELETE SET NULL;


--
-- Name: refeicoes_plano refeicoes_plano_plano_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.refeicoes_plano
    ADD CONSTRAINT refeicoes_plano_plano_id_fkey FOREIGN KEY (plano_id) REFERENCES public.plano_alimentar_pdf(id) ON DELETE CASCADE;


--
-- Name: registros_agua registros_agua_aluno_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.registros_agua
    ADD CONSTRAINT registros_agua_aluno_id_fkey FOREIGN KEY (aluno_id) REFERENCES public.profiles(id);


--
-- Name: registros_treino registros_treino_aluno_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.registros_treino
    ADD CONSTRAINT registros_treino_aluno_id_fkey FOREIGN KEY (aluno_id) REFERENCES public.profiles(id);


--
-- Name: treinos_alunos treinos_alunos_aluno_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.treinos_alunos
    ADD CONSTRAINT treinos_alunos_aluno_id_fkey FOREIGN KEY (aluno_id) REFERENCES public.profiles(id);


--
-- Name: treinos_alunos treinos_alunos_coach_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.treinos_alunos
    ADD CONSTRAINT treinos_alunos_coach_id_fkey FOREIGN KEY (coach_id) REFERENCES public.profiles(id);


--
-- Name: treinos_manuais treinos_manuais_aluno_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.treinos_manuais
    ADD CONSTRAINT treinos_manuais_aluno_id_fkey FOREIGN KEY (aluno_id) REFERENCES public.profiles(id);


--
-- Name: treinos_manuais treinos_manuais_coach_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.treinos_manuais
    ADD CONSTRAINT treinos_manuais_coach_id_fkey FOREIGN KEY (coach_id) REFERENCES public.profiles(id);


--
-- Name: agenda_semanal Admins gerenciam agendas; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins gerenciam agendas" ON public.agenda_semanal USING ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['admin'::text, 'super-admin'::text]))))));


--
-- Name: logs_treino Admins gerenciam logs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins gerenciam logs" ON public.logs_treino USING ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['admin'::text, 'super-admin'::text]))))));


--
-- Name: historico_treinos Aluno regista execucao; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Aluno regista execucao" ON public.historico_treinos FOR INSERT WITH CHECK ((aluno_id = auth.uid()));


--
-- Name: fichas_treino Aluno vê sua ficha; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Aluno vê sua ficha" ON public.fichas_treino FOR SELECT USING ((aluno_id = auth.uid()));


--
-- Name: treinos_manuais Alunos atualizam seus treinos; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Alunos atualizam seus treinos" ON public.treinos_manuais FOR UPDATE USING ((aluno_id = auth.uid())) WITH CHECK ((aluno_id = auth.uid()));


--
-- Name: feedbacks_treinos Alunos criam seus feedbacks; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Alunos criam seus feedbacks" ON public.feedbacks_treinos FOR INSERT TO authenticated WITH CHECK ((auth.uid() = aluno_id));


--
-- Name: treinos_manuais Alunos criam treinos para si mesmos; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Alunos criam treinos para si mesmos" ON public.treinos_manuais FOR INSERT WITH CHECK ((aluno_id = auth.uid()));


--
-- Name: registros_treino Alunos gerenciam seus registros; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Alunos gerenciam seus registros" ON public.registros_treino USING ((auth.uid() = aluno_id));


--
-- Name: fotos_evolucao Alunos gerenciam suas fotos; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Alunos gerenciam suas fotos" ON public.fotos_evolucao USING ((auth.uid() = aluno_id));


--
-- Name: historico_treinos Alunos inserem historico; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Alunos inserem historico" ON public.historico_treinos FOR INSERT TO authenticated WITH CHECK ((auth.uid() = aluno_id));


--
-- Name: historico_treinos Alunos leem historico; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Alunos leem historico" ON public.historico_treinos FOR SELECT TO authenticated USING ((auth.uid() = aluno_id));


--
-- Name: feedbacks_treinos Alunos podem atualizar feedbacks; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Alunos podem atualizar feedbacks" ON public.feedbacks_treinos FOR UPDATE TO authenticated USING ((auth.uid() = aluno_id)) WITH CHECK ((auth.uid() = aluno_id));


--
-- Name: medidas_aluno Alunos podem atualizar próprias medidas; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Alunos podem atualizar próprias medidas" ON public.medidas_aluno FOR UPDATE TO authenticated USING ((aluno_id = auth.uid()));


--
-- Name: feedbacks_treinos Alunos podem criar feedbacks; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Alunos podem criar feedbacks" ON public.feedbacks_treinos FOR INSERT TO authenticated WITH CHECK ((auth.uid() = aluno_id));


--
-- Name: medidas_aluno Alunos podem deletar próprias medidas; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Alunos podem deletar próprias medidas" ON public.medidas_aluno FOR DELETE TO authenticated USING ((aluno_id = auth.uid()));


--
-- Name: fotos_evolucao Alunos podem deletar suas fotos; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Alunos podem deletar suas fotos" ON public.fotos_evolucao FOR DELETE USING ((aluno_id = auth.uid()));


--
-- Name: medidas_aluno Alunos podem inserir próprias medidas; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Alunos podem inserir próprias medidas" ON public.medidas_aluno FOR INSERT TO authenticated WITH CHECK ((aluno_id = auth.uid()));


--
-- Name: fotos_evolucao Alunos podem inserir suas fotos; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Alunos podem inserir suas fotos" ON public.fotos_evolucao FOR INSERT WITH CHECK ((aluno_id = auth.uid()));


--
-- Name: medidas_aluno Alunos podem inserir suas próprias medidas; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Alunos podem inserir suas próprias medidas" ON public.medidas_aluno FOR INSERT TO authenticated WITH CHECK ((aluno_id = auth.uid()));


--
-- Name: historico_treinos Alunos podem salvar seu histórico; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Alunos podem salvar seu histórico" ON public.historico_treinos FOR INSERT WITH CHECK ((aluno_id = auth.uid()));


--
-- Name: feedbacks_treinos Alunos podem ver próprios feedbacks; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Alunos podem ver próprios feedbacks" ON public.feedbacks_treinos FOR SELECT TO authenticated USING ((auth.uid() = aluno_id));


--
-- Name: medidas_aluno Alunos podem ver suas próprias medidas; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Alunos podem ver suas próprias medidas" ON public.medidas_aluno FOR SELECT TO authenticated USING ((aluno_id = auth.uid()));


--
-- Name: medidas_aluno Alunos veem próprias medidas; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Alunos veem próprias medidas" ON public.medidas_aluno FOR SELECT TO authenticated USING ((aluno_id = auth.uid()));


--
-- Name: historico_treinos Alunos veem seu próprio histórico; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Alunos veem seu próprio histórico" ON public.historico_treinos FOR SELECT USING (((aluno_id = auth.uid()) OR (EXISTS ( SELECT 1
   FROM public.fichas_treino
  WHERE ((fichas_treino.id = historico_treinos.ficha_id) AND (fichas_treino.coach_id = auth.uid()))))));


--
-- Name: treinos_alunos Alunos veem seus PDFs ativos; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Alunos veem seus PDFs ativos" ON public.treinos_alunos FOR SELECT USING (((aluno_id = auth.uid()) AND (EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.status_pagamento = 'pago'::text) AND (profiles.arquivado = false))))));


--
-- Name: feedbacks_treinos Alunos veem seus feedbacks; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Alunos veem seus feedbacks" ON public.feedbacks_treinos FOR SELECT TO authenticated USING ((auth.uid() = aluno_id));


--
-- Name: logs_treino Alunos veem seus próprios logs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Alunos veem seus próprios logs" ON public.logs_treino FOR SELECT USING ((auth.uid() = aluno_id));


--
-- Name: treinos_manuais Alunos veem seus próprios treinos manuais; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Alunos veem seus próprios treinos manuais" ON public.treinos_manuais FOR SELECT USING ((aluno_id = auth.uid()));


--
-- Name: agenda_semanal Alunos veem sua agenda ativa; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Alunos veem sua agenda ativa" ON public.agenda_semanal FOR SELECT USING (((aluno_id = auth.uid()) AND (EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.status_pagamento = 'pago'::text) AND (profiles.arquivado = false))))));


--
-- Name: agenda_semanal Alunos veem sua própria agenda; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Alunos veem sua própria agenda" ON public.agenda_semanal FOR SELECT USING ((auth.uid() = aluno_id));


--
-- Name: fichas_treino Alunos veem suas próprias fichas; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Alunos veem suas próprias fichas" ON public.fichas_treino FOR SELECT USING (((aluno_id = auth.uid()) OR (coach_id = auth.uid())));


--
-- Name: fichas_treino Alunos veem suas próprias fichas (isolado); Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Alunos veem suas próprias fichas (isolado)" ON public.fichas_treino FOR SELECT USING (((aluno_id = auth.uid()) OR (coach_id = auth.uid())));


--
-- Name: fotos_evolucao Alunos veem suas próprias fotos; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Alunos veem suas próprias fotos" ON public.fotos_evolucao FOR SELECT USING ((aluno_id = auth.uid()));


--
-- Name: profiles Coaches editam perfis dos alunos; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Coaches editam perfis dos alunos" ON public.profiles FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM public.coach_alunos
  WHERE ((coach_alunos.coach_id = auth.uid()) AND (coach_alunos.aluno_id = profiles.id)))));


--
-- Name: coach_alunos Coaches gerenciam suas relações; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Coaches gerenciam suas relações" ON public.coach_alunos FOR INSERT WITH CHECK (((coach_id = auth.uid()) AND (EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = 'coach'::text))))));


--
-- Name: historico_treinos Coaches leem historico dos alunos; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Coaches leem historico dos alunos" ON public.historico_treinos FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.coach_alunos ca
  WHERE ((ca.coach_id = auth.uid()) AND (ca.aluno_id = historico_treinos.aluno_id)))));


--
-- Name: exercicios_biblioteca Coaches podem criar exercícios; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Coaches podem criar exercícios" ON public.exercicios_biblioteca FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = 'coach'::text)))));


--
-- Name: fichas_treino Coaches podem criar fichas; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Coaches podem criar fichas" ON public.fichas_treino FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['coach'::text, 'super_admin'::text]))))));


--
-- Name: parceiros Coaches podem criar parceiros; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Coaches podem criar parceiros" ON public.parceiros FOR INSERT WITH CHECK (((coach_id = auth.uid()) AND (EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = 'coach'::text))))));


--
-- Name: parceiros Coaches podem deletar parceiros; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Coaches podem deletar parceiros" ON public.parceiros FOR DELETE USING (((coach_id = auth.uid()) AND (EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = 'coach'::text))))));


--
-- Name: fichas_treino Coaches podem deletar suas fichas; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Coaches podem deletar suas fichas" ON public.fichas_treino FOR DELETE USING (((coach_id = auth.uid()) AND (EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = 'coach'::text))))));


--
-- Name: exercicios_biblioteca Coaches podem editar exercícios; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Coaches podem editar exercícios" ON public.exercicios_biblioteca FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = 'coach'::text)))));


--
-- Name: parceiros Coaches podem editar parceiros; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Coaches podem editar parceiros" ON public.parceiros FOR UPDATE USING (((coach_id = auth.uid()) AND (EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = 'coach'::text))))));


--
-- Name: fichas_treino Coaches podem editar suas fichas; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Coaches podem editar suas fichas" ON public.fichas_treino FOR UPDATE USING (((coach_id = auth.uid()) AND (EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = 'coach'::text))))));


--
-- Name: feedbacks_treinos Coaches podem ver feedbacks de alunos; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Coaches podem ver feedbacks de alunos" ON public.feedbacks_treinos FOR SELECT TO authenticated USING (((auth.uid() = coach_id) OR (EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = 'coach'::text))))));


--
-- Name: coach_alunos Coaches removem seus vínculos; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Coaches removem seus vínculos" ON public.coach_alunos FOR DELETE USING (((coach_id = auth.uid()) AND (EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = 'coach'::text))))));


--
-- Name: feedbacks_treinos Coaches respondem feedbacks; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Coaches respondem feedbacks" ON public.feedbacks_treinos FOR UPDATE TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.coach_alunos ca
  WHERE ((ca.coach_id = auth.uid()) AND (ca.aluno_id = feedbacks_treinos.aluno_id))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM public.coach_alunos ca
  WHERE ((ca.coach_id = auth.uid()) AND (ca.aluno_id = feedbacks_treinos.aluno_id)))));


--
-- Name: feedbacks_treinos Coaches veem feedbacks dos alunos; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Coaches veem feedbacks dos alunos" ON public.feedbacks_treinos FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.coach_alunos ca
  WHERE ((ca.coach_id = auth.uid()) AND (ca.aluno_id = feedbacks_treinos.aluno_id)))));


--
-- Name: fotos_evolucao Coaches veem fotos de seus alunos; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Coaches veem fotos de seus alunos" ON public.fotos_evolucao FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.coach_alunos
  WHERE ((coach_alunos.coach_id = auth.uid()) AND (coach_alunos.aluno_id = fotos_evolucao.aluno_id)))));


--
-- Name: profiles Coaches veem perfis dos alunos; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Coaches veem perfis dos alunos" ON public.profiles FOR SELECT USING (((EXISTS ( SELECT 1
   FROM public.coach_alunos
  WHERE ((coach_alunos.coach_id = auth.uid()) AND (coach_alunos.aluno_id = profiles.id)))) OR (public.get_auth_user_role() = 'super_admin'::text)));


--
-- Name: coach_alunos Coaches veem seus alunos; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Coaches veem seus alunos" ON public.coach_alunos FOR SELECT USING (((coach_id = auth.uid()) OR (aluno_id = auth.uid())));


--
-- Name: treinos_manuais Coaches veem treinos de seus alunos; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Coaches veem treinos de seus alunos" ON public.treinos_manuais FOR SELECT USING (((coach_id = auth.uid()) OR (aluno_id = auth.uid())));


--
-- Name: parceiros Qualquer um visualiza parceiros; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Qualquer um visualiza parceiros" ON public.parceiros FOR SELECT USING (true);


--
-- Name: fotos_evolucao Super admin vê todas fotos; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Super admin vê todas fotos" ON public.fotos_evolucao USING ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = 'super_admin'::text)))));


--
-- Name: feedbacks_treinos Super admins veem todos feedbacks; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Super admins veem todos feedbacks" ON public.feedbacks_treinos TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = 'super_admin'::text)))));


--
-- Name: treinos_manuais Super admins veem todos treinos; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Super admins veem todos treinos" ON public.treinos_manuais USING ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = 'super_admin'::text)))));


--
-- Name: exercicios_biblioteca Todos podem visualizar exercícios; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Todos podem visualizar exercícios" ON public.exercicios_biblioteca FOR SELECT USING (true);


--
-- Name: parceiros Todos podem visualizar parceiros; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Todos podem visualizar parceiros" ON public.parceiros FOR SELECT USING (((ativo = true) OR (coach_id = auth.uid())));


--
-- Name: agenda_semanal agenda_aluno_all; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY agenda_aluno_all ON public.agenda_semanal USING ((aluno_id = auth.uid())) WITH CHECK ((aluno_id = auth.uid()));


--
-- Name: agenda_semanal agenda_coach_sees_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY agenda_coach_sees_own ON public.agenda_semanal FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.coach_alunos
  WHERE ((coach_alunos.coach_id = auth.uid()) AND (coach_alunos.aluno_id = agenda_semanal.aluno_id)))));


--
-- Name: agenda_semanal; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.agenda_semanal ENABLE ROW LEVEL SECURITY;

--
-- Name: agenda_semanal agenda_super_admin; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY agenda_super_admin ON public.agenda_semanal USING ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = 'super_admin'::text)))));


--
-- Name: parceiros aluno vê parceiros do seu coach; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "aluno vê parceiros do seu coach" ON public.parceiros FOR SELECT USING ((coach_id IN ( SELECT profiles.coach_id
   FROM public.profiles
  WHERE (profiles.id = auth.uid()))));


--
-- Name: fotos_evolucao aluno_gerencia_fotos_evolucao; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY aluno_gerencia_fotos_evolucao ON public.fotos_evolucao TO authenticated USING ((auth.uid() = aluno_id)) WITH CHECK ((auth.uid() = aluno_id));


--
-- Name: treinos_manuais aluno_gerencia_treinos_manuais; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY aluno_gerencia_treinos_manuais ON public.treinos_manuais TO authenticated USING ((auth.uid() = aluno_id)) WITH CHECK ((auth.uid() = aluno_id));


--
-- Name: plano_alimentar_pdf aluno_le_plano_alimentar_pdf; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY aluno_le_plano_alimentar_pdf ON public.plano_alimentar_pdf FOR SELECT TO authenticated USING ((auth.uid() = aluno_id));


--
-- Name: treinos_alunos aluno_le_proprios_treinos_pdf; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY aluno_le_proprios_treinos_pdf ON public.treinos_alunos FOR SELECT TO authenticated USING ((auth.uid() = aluno_id));


--
-- Name: plano_alimentar_pdf aluno_no_delete; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY aluno_no_delete ON public.plano_alimentar_pdf FOR DELETE USING (false);


--
-- Name: plano_alimentar_pdf aluno_no_modify; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY aluno_no_modify ON public.plano_alimentar_pdf FOR UPDATE USING (false);


--
-- Name: plano_alimentar_pdf aluno_sees_own_plans; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY aluno_sees_own_plans ON public.plano_alimentar_pdf FOR SELECT USING ((aluno_id = auth.uid()));


--
-- Name: registros_agua alunos_gerenciam_propria_agua; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY alunos_gerenciam_propria_agua ON public.registros_agua USING ((auth.uid() = aluno_id)) WITH CHECK ((auth.uid() = aluno_id));


--
-- Name: consumos_refeicao alunos_gerenciam_proprios_consumos; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY alunos_gerenciam_proprios_consumos ON public.consumos_refeicao USING ((auth.uid() = aluno_id)) WITH CHECK ((auth.uid() = aluno_id));


--
-- Name: profiles alunos_leem_perfis_alunos; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY alunos_leem_perfis_alunos ON public.profiles FOR SELECT USING (((role = 'aluno'::text) AND (public.get_auth_user_role() = ANY (ARRAY['aluno'::text, 'coach'::text, 'super_admin'::text]))));


--
-- Name: recordes_pessoais alunos_leem_proprios_prs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY alunos_leem_proprios_prs ON public.recordes_pessoais FOR SELECT USING ((auth.uid() = aluno_id));


--
-- Name: refeicoes_plano alunos_leem_refeicoes_proprio_plano; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY alunos_leem_refeicoes_proprio_plano ON public.refeicoes_plano FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.plano_alimentar_pdf p
  WHERE ((p.id = refeicoes_plano.plano_id) AND ((p.aluno_id = auth.uid()) OR (p.coach_id = auth.uid()))))));


--
-- Name: plano_alimentar_audit audit_aluno_le_proprio; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY audit_aluno_le_proprio ON public.plano_alimentar_audit FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.plano_alimentar_pdf p
  WHERE ((p.id = plano_alimentar_audit.plano_id) AND (p.aluno_id = auth.uid())))));


--
-- Name: plano_alimentar_audit audit_coach_insere; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY audit_coach_insere ON public.plano_alimentar_audit FOR INSERT WITH CHECK (((acessado_por = auth.uid()) AND (EXISTS ( SELECT 1
   FROM public.plano_alimentar_pdf p
  WHERE ((p.id = plano_alimentar_audit.plano_id) AND (p.coach_id = auth.uid()))))));


--
-- Name: plano_alimentar_audit audit_coach_le_proprios; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY audit_coach_le_proprios ON public.plano_alimentar_audit FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.plano_alimentar_pdf p
  WHERE ((p.id = plano_alimentar_audit.plano_id) AND (p.coach_id = auth.uid())))));


--
-- Name: plano_alimentar_audit audit_super_admin; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY audit_super_admin ON public.plano_alimentar_audit USING ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = 'super_admin'::text)))));


--
-- Name: pontuacao_alunos authenticated_le_pontuacao; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY authenticated_le_pontuacao ON public.pontuacao_alunos FOR SELECT TO authenticated USING (true);


--
-- Name: parceiros coach vê seus próprios parceiros; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "coach vê seus próprios parceiros" ON public.parceiros USING ((coach_id = auth.uid()));


--
-- Name: coach_alunos; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.coach_alunos ENABLE ROW LEVEL SECURITY;

--
-- Name: coach_alunos coach_alunos_delete; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY coach_alunos_delete ON public.coach_alunos FOR DELETE TO authenticated USING ((coach_id = auth.uid()));


--
-- Name: coach_alunos coach_alunos_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY coach_alunos_insert ON public.coach_alunos FOR INSERT TO authenticated WITH CHECK ((coach_id = auth.uid()));


--
-- Name: coach_alunos coach_alunos_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY coach_alunos_select ON public.coach_alunos FOR SELECT TO authenticated USING (((coach_id = auth.uid()) OR (aluno_id = auth.uid())));


--
-- Name: coach_alunos coach_deleta_proprias_relacoes; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY coach_deleta_proprias_relacoes ON public.coach_alunos FOR DELETE TO authenticated USING (((coach_id = auth.uid()) OR (public.get_auth_user_role() = 'super_admin'::text)));


--
-- Name: plano_alimentar_pdf coach_delete_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY coach_delete_own ON public.plano_alimentar_pdf FOR DELETE USING ((coach_id = auth.uid()));


--
-- Name: plano_alimentar_pdf coach_gerencia_plano_alimentar_pdf; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY coach_gerencia_plano_alimentar_pdf ON public.plano_alimentar_pdf TO authenticated USING (((auth.uid() = coach_id) OR (EXISTS ( SELECT 1
   FROM public.coach_alunos ca
  WHERE ((ca.coach_id = auth.uid()) AND (ca.aluno_id = plano_alimentar_pdf.aluno_id)))))) WITH CHECK (((auth.uid() = coach_id) OR (EXISTS ( SELECT 1
   FROM public.coach_alunos ca
  WHERE ((ca.coach_id = auth.uid()) AND (ca.aluno_id = plano_alimentar_pdf.aluno_id))))));


--
-- Name: coach_alunos coach_gerencia_proprias_relacoes; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY coach_gerencia_proprias_relacoes ON public.coach_alunos FOR INSERT TO authenticated WITH CHECK (((coach_id = auth.uid()) OR (public.get_auth_user_role() = 'super_admin'::text)));


--
-- Name: treinos_alunos coach_gerencia_treinos_alunos; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY coach_gerencia_treinos_alunos ON public.treinos_alunos TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.coach_alunos ca
  WHERE ((ca.coach_id = auth.uid()) AND (ca.aluno_id = treinos_alunos.aluno_id))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM public.coach_alunos ca
  WHERE ((ca.coach_id = auth.uid()) AND (ca.aluno_id = treinos_alunos.aluno_id)))));


--
-- Name: plano_alimentar_pdf coach_insert_plan; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY coach_insert_plan ON public.plano_alimentar_pdf FOR INSERT WITH CHECK (((coach_id = auth.uid()) AND (EXISTS ( SELECT 1
   FROM public.coach_alunos
  WHERE ((coach_alunos.coach_id = auth.uid()) AND (coach_alunos.aluno_id = plano_alimentar_pdf.aluno_id))))));


--
-- Name: fotos_evolucao coach_le_fotos_alunos; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY coach_le_fotos_alunos ON public.fotos_evolucao FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.coach_alunos ca
  WHERE ((ca.coach_id = auth.uid()) AND (ca.aluno_id = fotos_evolucao.aluno_id)))));


--
-- Name: coach_alunos coach_le_proprias_relacoes; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY coach_le_proprias_relacoes ON public.coach_alunos FOR SELECT TO authenticated USING (((coach_id = auth.uid()) OR (public.get_auth_user_role() = 'super_admin'::text)));


--
-- Name: treinos_manuais coach_le_treinos_manuais_alunos; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY coach_le_treinos_manuais_alunos ON public.treinos_manuais FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.coach_alunos ca
  WHERE ((ca.coach_id = auth.uid()) AND (ca.aluno_id = treinos_manuais.aluno_id)))));


--
-- Name: plano_alimentar_pdf coach_sees_own_uploads; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY coach_sees_own_uploads ON public.plano_alimentar_pdf FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.coach_alunos
  WHERE ((coach_alunos.coach_id = auth.uid()) AND (coach_alunos.aluno_id = plano_alimentar_pdf.aluno_id)))));


--
-- Name: refeicoes_plano coaches_gerenciam_refeicoes; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY coaches_gerenciam_refeicoes ON public.refeicoes_plano USING ((EXISTS ( SELECT 1
   FROM public.plano_alimentar_pdf p
  WHERE ((p.id = refeicoes_plano.plano_id) AND (p.coach_id = auth.uid()))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM public.plano_alimentar_pdf p
  WHERE ((p.id = refeicoes_plano.plano_id) AND (p.coach_id = auth.uid())))));


--
-- Name: recordes_pessoais coaches_leem_prs_dos_alunos; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY coaches_leem_prs_dos_alunos ON public.recordes_pessoais FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.coach_alunos
  WHERE ((coach_alunos.coach_id = auth.uid()) AND (coach_alunos.aluno_id = recordes_pessoais.aluno_id)))));


--
-- Name: consumos_refeicao; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.consumos_refeicao ENABLE ROW LEVEL SECURITY;

--
-- Name: exercicios_biblioteca; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.exercicios_biblioteca ENABLE ROW LEVEL SECURITY;

--
-- Name: feedbacks_treinos; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.feedbacks_treinos ENABLE ROW LEVEL SECURITY;

--
-- Name: fichas_treino ficha_aluno_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY ficha_aluno_select ON public.fichas_treino FOR SELECT USING ((aluno_id = auth.uid()));


--
-- Name: fichas_treino ficha_coach_all; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY ficha_coach_all ON public.fichas_treino USING ((EXISTS ( SELECT 1
   FROM public.coach_alunos
  WHERE ((coach_alunos.coach_id = auth.uid()) AND (coach_alunos.aluno_id = fichas_treino.aluno_id))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM public.coach_alunos
  WHERE ((coach_alunos.coach_id = auth.uid()) AND (coach_alunos.aluno_id = fichas_treino.aluno_id)))));


--
-- Name: fichas_treino ficha_super_admin; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY ficha_super_admin ON public.fichas_treino USING ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = 'super_admin'::text)))));


--
-- Name: fichas_treino; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.fichas_treino ENABLE ROW LEVEL SECURITY;

--
-- Name: fotos_evolucao; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.fotos_evolucao ENABLE ROW LEVEL SECURITY;

--
-- Name: historico_treinos; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.historico_treinos ENABLE ROW LEVEL SECURITY;

--
-- Name: logs_treino; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.logs_treino ENABLE ROW LEVEL SECURITY;

--
-- Name: medidas_aluno; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.medidas_aluno ENABLE ROW LEVEL SECURITY;

--
-- Name: medidas_aluno medidas_coach_apenas_proprios_alunos; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY medidas_coach_apenas_proprios_alunos ON public.medidas_aluno FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.coach_alunos
  WHERE ((coach_alunos.coach_id = auth.uid()) AND (coach_alunos.aluno_id = medidas_aluno.aluno_id)))));


--
-- Name: recordes_pessoais ninguem_insere_pr_diretamente; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY ninguem_insere_pr_diretamente ON public.recordes_pessoais FOR INSERT WITH CHECK (false);


--
-- Name: parceiros; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.parceiros ENABLE ROW LEVEL SECURITY;

--
-- Name: plano_alimentar_audit; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.plano_alimentar_audit ENABLE ROW LEVEL SECURITY;

--
-- Name: plano_alimentar_pdf; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.plano_alimentar_pdf ENABLE ROW LEVEL SECURITY;

--
-- Name: pontuacao_alunos; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.pontuacao_alunos ENABLE ROW LEVEL SECURITY;

--
-- Name: pontuacao_alunos pontuacao_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY pontuacao_select ON public.pontuacao_alunos FOR SELECT TO authenticated USING (((aluno_id = auth.uid()) OR (EXISTS ( SELECT 1
   FROM public.coach_alunos
  WHERE ((coach_alunos.coach_id = auth.uid()) AND (coach_alunos.aluno_id = pontuacao_alunos.aluno_id))))));


--
-- Name: profiles; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

--
-- Name: profiles profiles_insert_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY profiles_insert_own ON public.profiles FOR INSERT WITH CHECK ((auth.uid() = id));


--
-- Name: profiles profiles_select_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY profiles_select_own ON public.profiles FOR SELECT USING ((auth.uid() = id));


--
-- Name: profiles profiles_update_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY profiles_update_own ON public.profiles FOR UPDATE USING ((auth.uid() = id)) WITH CHECK ((auth.uid() = id));


--
-- Name: recordes_pessoais; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.recordes_pessoais ENABLE ROW LEVEL SECURITY;

--
-- Name: refeicoes_plano; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.refeicoes_plano ENABLE ROW LEVEL SECURITY;

--
-- Name: registros_agua; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.registros_agua ENABLE ROW LEVEL SECURITY;

--
-- Name: registros_treino; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.registros_treino ENABLE ROW LEVEL SECURITY;

--
-- Name: plano_alimentar_pdf super_admin_all_access; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY super_admin_all_access ON public.plano_alimentar_pdf USING ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = 'super_admin'::text)))));


--
-- Name: fotos_evolucao super_admin_fotos_evolucao; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY super_admin_fotos_evolucao ON public.fotos_evolucao TO authenticated USING ((public.get_auth_user_role() = 'super_admin'::text));


--
-- Name: historico_treinos super_admin_historico_all; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY super_admin_historico_all ON public.historico_treinos TO authenticated USING ((public.get_auth_user_role() = 'super_admin'::text));


--
-- Name: plano_alimentar_pdf super_admin_plano_alimentar_pdf; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY super_admin_plano_alimentar_pdf ON public.plano_alimentar_pdf TO authenticated USING ((public.get_auth_user_role() = 'super_admin'::text));


--
-- Name: treinos_alunos super_admin_treinos_alunos; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY super_admin_treinos_alunos ON public.treinos_alunos TO authenticated USING ((public.get_auth_user_role() = 'super_admin'::text));


--
-- Name: treinos_manuais super_admin_treinos_manuais; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY super_admin_treinos_manuais ON public.treinos_manuais TO authenticated USING ((public.get_auth_user_role() = 'super_admin'::text));


--
-- Name: temp_id_mapping; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.temp_id_mapping ENABLE ROW LEVEL SECURITY;

--
-- Name: treinos_alunos treino_aluno_insert_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY treino_aluno_insert_own ON public.treinos_alunos FOR INSERT WITH CHECK ((aluno_id = auth.uid()));


--
-- Name: treinos_alunos treino_aluno_no_delete; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY treino_aluno_no_delete ON public.treinos_alunos FOR DELETE USING (false);


--
-- Name: treinos_alunos treino_aluno_no_modify; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY treino_aluno_no_modify ON public.treinos_alunos FOR UPDATE USING (false);


--
-- Name: treinos_alunos treino_aluno_sees_own_pdfs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY treino_aluno_sees_own_pdfs ON public.treinos_alunos FOR SELECT USING ((aluno_id = auth.uid()));


--
-- Name: treinos_alunos treino_coach_delete_own; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY treino_coach_delete_own ON public.treinos_alunos FOR DELETE USING (((coach_id = auth.uid()) OR (EXISTS ( SELECT 1
   FROM public.coach_alunos
  WHERE ((coach_alunos.coach_id = auth.uid()) AND (coach_alunos.aluno_id = treinos_alunos.aluno_id))))));


--
-- Name: treinos_alunos treino_coach_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY treino_coach_insert ON public.treinos_alunos FOR INSERT WITH CHECK (((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['coach'::text, 'super_admin'::text]))))) AND (EXISTS ( SELECT 1
   FROM public.coach_alunos
  WHERE ((coach_alunos.coach_id = auth.uid()) AND (coach_alunos.aluno_id = treinos_alunos.aluno_id))))));


--
-- Name: treinos_alunos treino_coach_sees_own_uploads; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY treino_coach_sees_own_uploads ON public.treinos_alunos FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.coach_alunos
  WHERE ((coach_alunos.coach_id = auth.uid()) AND (coach_alunos.aluno_id = treinos_alunos.aluno_id)))));


--
-- Name: treinos_alunos treino_super_admin_all_access; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY treino_super_admin_all_access ON public.treinos_alunos USING ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = 'super_admin'::text)))));


--
-- Name: treinos_alunos; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.treinos_alunos ENABLE ROW LEVEL SECURITY;

--
-- Name: treinos_manuais; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.treinos_manuais ENABLE ROW LEVEL SECURITY;

--
-- Name: profiles users_insert_own_profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY users_insert_own_profile ON public.profiles FOR INSERT TO authenticated WITH CHECK ((auth.uid() = id));


--
-- Name: profiles users_update_own_profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY users_update_own_profile ON public.profiles FOR UPDATE TO authenticated USING ((auth.uid() = id)) WITH CHECK ((auth.uid() = id));


--
-- PostgreSQL database dump complete
--

\unrestrict KThiG33d5hJMMECtBONfqXKCuPmu641QpjMVTVtVRZBgtXm7J91EoktRBExbLpA

