"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseClient } from "@/lib/supabaseClient";
import { getSafeSession } from '@/lib/authErrorHandler';
import { getPublicStorageUrl } from '@/lib/storageUrls';
import Link from "next/link";
import { ArrowRight, WarningCircle } from '@phosphor-icons/react';
import DumbbellLoader from "@/app/components/DumbbellLoader";
import { getTodayBrazil } from '@/lib/dateUtils';
import { CoachCard } from '@/app/components/dashboard/CoachCard';
import { HeroHeader } from '@/app/components/dashboard/home/HeroHeader';
import { WorkoutCard } from '@/app/components/dashboard/home/WorkoutCard';
import { WeekCalendar, type DiaSemana } from '@/app/components/dashboard/home/WeekCalendar';
import { DayConfigPicker } from '@/app/components/dashboard/home/DayConfigPicker';
import { StreakRow } from '@/app/components/dashboard/home/StreakRow';
import { NutritionCard } from '@/app/components/dashboard/home/NutritionCard';
import { HydrationCard } from '@/app/components/dashboard/home/HydrationCard';
import { QuickActions } from '@/app/components/dashboard/home/QuickActions';
import { updateTreinoStatus } from '@/lib/aluno/updateTreinoStatus';
import { hasActiveAccess } from '@/lib/access/hasActiveAccess';
import { getBootstrapProfile } from '@/lib/auth/bootstrapProfile';
import {
  invalidateDashboardAlunoCache,
  peekDashboardAlunoCache,
  patchDashboardAlunoCache,
  setDashboardAlunoCache,
} from '@/lib/queries/dashboardAlunoCache';
import { useNaoLidasRealtime } from '@/lib/chat/realtime';

// ─── Tipos ────────────────────────────────────────────────────────────────────

interface KpisAluno {
  volume_semana_kg: number;
  volume_delta_pct: number | null;
  peso_atual_kg: number | null;
  peso_delta_kg: number | null;
  treinos_mes: number;
  treinos_delta: number;
  streak_atual: number;
}

interface RegistroAgua {
  id: string | null;
  copos: number;
  ml_por_copo: number;
}

interface Parceiro {
  id: string;
  nome_marca: string;
  descricao?: string;
  cupom?: string;
  link_desconto?: string;
  logo_url?: string | null;
  imagens?: string[] | null;
}

interface WorkoutOption {
  id: string;
  name: string;
  type: 'ficha' | 'pdf' | 'manual';
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getWeekDays(weekOffset: number): DiaSemana[] {
  const today = new Date();
  const dayOfWeek = today.getDay(); // 0=dom
  // Segunda como início da semana
  const monday = new Date(today);
  monday.setDate(today.getDate() - ((dayOfWeek + 6) % 7) + weekOffset * 7);

  const dias: DiaSemana[] = [];
  const labels = ['SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB', 'DOM'];
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const isoDate = `${year}-${month}-${day}`;
    
    // check isHoje using local date format
    const tYear = today.getFullYear();
    const tMonth = String(today.getMonth() + 1).padStart(2, '0');
    const tDay = String(today.getDate()).padStart(2, '0');
    const tIso = `${tYear}-${tMonth}-${tDay}`;
    
    const isHoje = isoDate === tIso;
    
    dias.push({
      data: isoDate,
      label: labels[i],
      numero: d.getDate(),
      isHoje,
      treinoConcluido: false,
      temTreino: false,
    });
  }
  return dias;
}

function getWeekLabel(weekOffset: number): string {
  const days = getWeekDays(weekOffset);
  const first = days[0];
  const last = days[6];
  const firstDate = new Date(first.data + 'T12:00:00');
  const lastDate = new Date(last.data + 'T12:00:00');
  const mes = firstDate.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '');
  return `${first.numero}–${last.numero} ${mes}.`;
}

// ─── Componente principal ─────────────────────────────────────────────────────

export default function AlunoDashboardPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [userName, setUserName] = useState("");
  const [userAvatar, setUserAvatar] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [coachId, setCoachId] = useState<string | null>(null);
  const [incompleteData, setIncompleteData] = useState(false);

  const chatNaoLidas = useNaoLidasRealtime(userId, 'aluno');

  const [kpis, setKpis] = useState<KpisAluno | null>(null);
  const [checkinFeito, setCheckinFeito] = useState(false);
  const [checkinPontos, setCheckinPontos] = useState<number | null>(null);
  const [parceiros, setParceiros] = useState<Parceiro[]>([]);

  // Coach
  const [coachInfo, setCoachInfo] = useState<{ nome: string; avatar: string | null } | null>(null);
  const [coachPendings, setCoachPendings] = useState({ mensagens: 0, feedbacks: 0 });
  const [coachContactAvailable, setCoachContactAvailable] = useState(true);

  // Treino de hoje
  const [treinoHoje, setTreinoHoje] = useState<{
    status: 'pendente' | 'concluido' | 'off' | 'sem-plano';
    nome?: string;
    fichaId?: string;
    qtdExercicios?: number;
  } | null>(null);
  // Nutrição
  const [planoNutricao, setPlanoNutricao] = useState<{
    nome: string;
    refeicoesConcluidas: number;
    totalRefeicoes: number;
    proximaRefeicao?: { nome: string; horario: string } | null;
  } | null>(null);

  // Água
  const [agua, setAgua] = useState<RegistroAgua>({ id: null, copos: 0, ml_por_copo: 250 });
  const [metaCopos] = useState(8);
  const [savingAgua, setSavingAgua] = useState(false);

  // Agenda semanal
  const [weekOffset, setWeekOffset] = useState(0);
  const [diasSemana, setDiasSemana] = useState<DiaSemana[]>(() => getWeekDays(0));
  const [selectedDia, setSelectedDia] = useState<DiaSemana | null>(null);

  // Configuração da agenda semanal
  const [availableWorkouts, setAvailableWorkouts] = useState<WorkoutOption[]>([]);
  const [editingDay, setEditingDay] = useState<number | null>(null); // jsDay 0..6
  const [calendarEditMode, setCalendarEditMode] = useState(false);
  const [savingConfig, setSavingConfig] = useState(false);

  // ── Carregar dados ──────────────────────────────────────────────────────────

  const didFetchRef = useRef(false);
  const skipInitialAgendaEffect = useRef(true);

  useEffect(() => {
    if (didFetchRef.current) return;
    didFetchRef.current = true;
    void fetchDashboard();
  }, []);

  const applyDashboardSnapshot = (cached: NonNullable<ReturnType<typeof peekDashboardAlunoCache>>) => {
    setUserId(cached.userId);
    setUserName(cached.userName);
    setUserAvatar(cached.userAvatar);
    setCoachId(cached.coachId);
    setCoachInfo(cached.coachInfo);
    setCoachContactAvailable(cached.coachContactAvailable);
    setCoachPendings(cached.coachPendings);
    setIncompleteData(cached.incompleteData);
    setKpis(cached.kpis);
    setDiasSemana(cached.diasSemana);
    setWeekOffset(cached.weekOffset);
    setTreinoHoje(cached.treinoHoje);
    setPlanoNutricao(cached.planoNutricao);
    setAgua(cached.agua);
    setParceiros(cached.parceiros);
    setAvailableWorkouts(cached.availableWorkouts);
    setLoading(false);
  };

  useEffect(() => {
    if (!userId) return;
    // Semana 0 já é carregada dentro de fetchDashboard — evita request duplicado
    if (skipInitialAgendaEffect.current && weekOffset === 0) {
      skipInitialAgendaEffect.current = false;
      return;
    }
    void fetchWeeklyAgenda(userId, weekOffset);
  }, [weekOffset, userId]);

  const fetchWeeklyAgenda = async (uid: string, offset: number): Promise<DiaSemana[]> => {
    const days = getWeekDays(offset);
    const startOfWeek = days[0].data;
    const endOfWeek = days[6].data;

    try {
      const [
        { data: agendaSemana },
        { data: agendaDiaria },
        { data: checkinsSemana },
      ] = await Promise.all([
        supabaseClient
          .from('agenda_semanal')
          .select('dia_semana, ficha_id, treino_pdf_id, is_off, fichas_treino(nome_rotina)')
          .eq('aluno_id', uid),
        supabaseClient
          .from('agenda_diaria')
          .select('data, ficha_id, treino_pdf_id, is_off, fichas_treino(nome_rotina)')
          .eq('aluno_id', uid)
          .gte('data', startOfWeek)
          .lte('data', endOfWeek),
        supabaseClient
          .from('treinos_manuais')
          .select('data_treino, concluido, pontos_earn')
          .eq('aluno_id', uid)
          .eq('concluido', true)
          .gte('data_treino', startOfWeek)
          .lte('data_treino', endOfWeek),
      ]);

      const overrideByDate = new Map(
        (agendaDiaria ?? []).map((item: any) => [item.data as string, item]),
      );

      const updatedDays = days.map((dia) => {
        const dateObj = new Date(dia.data + 'T12:00:00');
        const jsDay = dateObj.getDay();
        const override = overrideByDate.get(dia.data);
        const agendaItem =
          override ?? agendaSemana?.find((item: any) => item.dia_semana === jsDay);

        let temTreino = false;
        let isOff = false;
        let nomeRotina = undefined;
        let fichaId = undefined;
        let treinoPdfId = undefined;

        if (agendaItem) {
          temTreino = !!(agendaItem.ficha_id || agendaItem.treino_pdf_id);
          isOff = !!agendaItem.is_off;
          nomeRotina =
            (agendaItem as any).fichas_treino?.nome_rotina ||
            (agendaItem.treino_pdf_id ? 'Treino PDF' : undefined);
          fichaId = agendaItem.ficha_id;
          treinoPdfId = agendaItem.treino_pdf_id;
        }

        const checkin = checkinsSemana?.find((c) => c.data_treino === dia.data);
        const concluido = !!checkin;

        return {
          ...dia,
          temTreino,
          isOff,
          nomeRotina,
          fichaId,
          treinoPdfId,
          treinoConcluido: concluido,
        };
      });

      setDiasSemana(updatedDays);
      patchDashboardAlunoCache(uid, { diasSemana: updatedDays, weekOffset: offset });
      const hojeDia = updatedDays.find((d) => d.isHoje);
      setSelectedDia(hojeDia || updatedDays[0]);

      // Pontos do check-in de hoje (se houver)
      const todayStr = getTodayBrazil();
      const todayCheckin = checkinsSemana?.find((c) => c.data_treino === todayStr);
      if (todayCheckin) {
        setCheckinFeito(true);
        setCheckinPontos(todayCheckin.pontos_earn || 20);
      }

      return updatedDays;
    } catch (err) {
      console.error('[Dashboard] Erro ao buscar agenda semanal:', err);
      return days;
    }
  };

  const loadSecondaryDashboardData = async (
    uid: string,
    coachIdForExtras: string | null,
    coachExtrasEnabled: boolean,
  ) => {
    // Nutrição leve — plan + checkins em paralelo; depois dia/refeições
    void (async () => {
      try {
        const todayISO = getTodayBrazil();
        const [{ data: plan }, { data: checkins }] = await Promise.all([
          supabaseClient
            .from('nutrition_plans')
            .select('id, name')
            .eq('student_id', uid)
            .eq('status', 'active')
            .order('created_at', { ascending: false })
            .limit(1)
            .maybeSingle(),
          supabaseClient
            .from('nutrition_meal_checkins')
            .select('meal_id')
            .eq('student_id', uid)
            .eq('checkin_date', todayISO),
        ]);

        if (!plan) return;

        const { data: day } = await supabaseClient
          .from('nutrition_plan_days')
          .select('id')
          .eq('plan_id', plan.id)
          .eq('day_index', 1)
          .maybeSingle();

        if (!day) {
          const next = {
            nome: plan.name,
            refeicoesConcluidas: 0,
            totalRefeicoes: 0,
            proximaRefeicao: null as null,
          };
          setPlanoNutricao(next);
          patchDashboardAlunoCache(uid, { planoNutricao: next });
          return;
        }

        const { data: meals } = await supabaseClient
          .from('nutrition_meals')
          .select('id, title, time_suggestion')
          .eq('plan_day_id', day.id)
          .order('sort_order', { ascending: true });

        const mealList = meals ?? [];
        const checkedMealIds = new Set(checkins?.map((c) => c.meal_id) || []);
        const nextMeal = mealList.find((m) => !checkedMealIds.has(m.id));

        const next = {
          nome: plan.name,
          refeicoesConcluidas: checkedMealIds.size,
          totalRefeicoes: mealList.length,
          proximaRefeicao: nextMeal
            ? {
                nome: nextMeal.title,
                horario: nextMeal.time_suggestion
                  ? String(nextMeal.time_suggestion).slice(0, 5)
                  : '',
              }
            : null,
        };
        setPlanoNutricao(next);
        patchDashboardAlunoCache(uid, { planoNutricao: next });
      } catch {
        // sem plano digital
      }
    })();

    // Fichas/PDFs — só usados ao editar agenda
    void (async () => {
      try {
        const [{ data: fichasData }, { data: pdfsData }] = await Promise.all([
          supabaseClient
            .from('fichas_treino')
            .select('id, nome_rotina')
            .eq('aluno_id', uid)
            .eq('ativo', true),
          supabaseClient
            .from('treinos_alunos')
            .select('id, nome_arquivo')
            .eq('aluno_id', uid),
        ]);

        const options: WorkoutOption[] = [];
        fichasData?.forEach((f) =>
          options.push({ id: f.id, name: f.nome_rotina, type: 'ficha' }),
        );
        pdfsData?.forEach((p) =>
          options.push({ id: p.id, name: p.nome_arquivo, type: 'pdf' }),
        );
        setAvailableWorkouts(options);
        patchDashboardAlunoCache(uid, { availableWorkouts: options });
      } catch (err) {
        console.warn('[Dashboard] Erro ao buscar treinos para configuração:', err);
      }
    })();

    if (!coachIdForExtras) return;

    void (async () => {
      try {
        const { count: fbCount } = await supabaseClient
          .from('feedbacks_treinos')
          .select('id', { count: 'exact', head: true })
          .eq('aluno_id', uid);
        const feedbacks = fbCount ?? 0;
        setCoachPendings((prev) => {
          const next = { ...prev, feedbacks };
          patchDashboardAlunoCache(uid, { coachPendings: next });
          return next;
        });
      } catch (err) {
        console.warn('[Dashboard] Erro ao buscar feedbacks pendentes:', err);
      }
    })();

    if (coachExtrasEnabled) {
      void (async () => {
        try {
          const { data: parceirosData } = await supabaseClient
            .from('parceiros')
            .select('id, nome_marca, descricao, cupom, link_desconto, logo_url, imagens')
            .eq('coach_id', coachIdForExtras)
            .order('nome_marca', { ascending: true });
          const list = parceirosData || [];
          setParceiros(list);
          patchDashboardAlunoCache(uid, { parceiros: list });
        } catch {
          setParceiros([]);
          patchDashboardAlunoCache(uid, { parceiros: [] });
        }
      })();
    } else {
      setParceiros([]);
      patchDashboardAlunoCache(uid, { parceiros: [] });
    }
  };

  const fetchDashboard = async (opts?: { force?: boolean }) => {
    try {
      const session = await getSafeSession();
      const user = session?.user;
      if (!user) {
        router.push('/login');
        return;
      }

      const uid = user.id;
      setUserId(uid);

      if (!opts?.force) {
        const cached = peekDashboardAlunoCache(uid);
        if (cached) {
          applyDashboardSnapshot(cached);
          return;
        }
      }

      const profile = await getBootstrapProfile();
      if (!profile || profile.userId !== uid) {
        router.push('/login');
        return;
      }

      if (profile.coach_id) setCoachId(profile.coach_id);

      if (profile.role === 'coach' || profile.role === 'super_admin') {
        router.push('/admin/dashboard');
        return;
      }
      if (profile.must_change_password) {
        router.push('/aluno/trocar-senha');
        return;
      }
      if (profile.role === 'aluno' && !profile.first_access_completed) {
        router.push('/aluno/onboarding');
        return;
      }
      if (
        profile.role === 'aluno' &&
        profile.first_access_completed &&
        !profile.date_of_birth
      ) {
        setIncompleteData(true);
      }

      const resolvedName = profile.full_name || user.email?.split('@')[0] || 'Aluno';
      const resolvedAvatar = getPublicStorageUrl('avatars', profile.avatar_url ?? null);
      setUserName(resolvedName);
      setUserAvatar(resolvedAvatar);

      // First paint IMEDIATO — não espera KPIs / agenda / nutrição
      setLoading(false);

      const today = getTodayBrazil();
      const coachIdValue = profile.coach_id ?? null;

      // ── Dados principais em paralelo (sem duplicar agenda do dia) ─────────
      const [kpiResult, coachResult, aguaResult, weekDays] = await Promise.all([
        supabaseClient.rpc('get_kpis_aluno', { p_aluno_id: uid }).then(
          (r) => r,
          () => ({ data: null, error: true }),
        ),
        coachIdValue
          ? supabaseClient
              .from('profiles')
              .select('full_name, avatar_url, subscription_active, account_type, role')
              .eq('id', coachIdValue)
              .maybeSingle()
          : Promise.resolve({ data: null }),
        supabaseClient
          .from('registros_agua')
          .select('id, copos, ml_por_copo')
          .eq('aluno_id', uid)
          .eq('data_registro', today)
          .maybeSingle(),
        fetchWeeklyAgenda(uid, 0),
      ]);

      let nextKpis: KpisAluno | null = null;
      if (kpiResult.data) {
        nextKpis = kpiResult.data as KpisAluno;
        setKpis(nextKpis);
      } else {
        try {
          const [{ data: medida }, { count: treinos }] = await Promise.all([
            supabaseClient
              .from('medidas_aluno')
              .select('peso')
              .eq('aluno_id', uid)
              .order('data_medicao', { ascending: false })
              .limit(1)
              .maybeSingle(),
            supabaseClient
              .from('historico_treinos')
              .select('*', { count: 'exact', head: true })
              .eq('aluno_id', uid),
          ]);
          nextKpis = {
            volume_semana_kg: 0,
            volume_delta_pct: null,
            peso_atual_kg: medida?.peso ?? null,
            peso_delta_kg: null,
            treinos_mes: treinos ?? 0,
            treinos_delta: 0,
            streak_atual: 0,
          };
          setKpis(nextKpis);
        } catch {
          /* ignore */
        }
      }

      let nextCoachInfo: { nome: string; avatar: string | null } | null = null;
      let coachExtrasEnabled = true;
      if (coachResult.data) {
        const coachData = coachResult.data as {
          full_name?: string | null;
          avatar_url?: string | null;
          subscription_active?: boolean | null;
          account_type?: string | null;
          role?: string | null;
        };
        nextCoachInfo = {
          nome: coachData.full_name?.split(' ').slice(0, 2).join(' ') || 'Seu Coach',
          avatar: getPublicStorageUrl('avatars', coachData.avatar_url ?? null),
        };
        setCoachInfo(nextCoachInfo);
        coachExtrasEnabled =
          coachData.role === 'super_admin' ||
          hasActiveAccess({
            subscription_active: coachData.subscription_active,
            account_type: coachData.account_type,
          });
        setCoachContactAvailable(coachExtrasEnabled);
      }

      // Treino de hoje derivado da agenda semanal (já carregada)
      const hoje = weekDays.find((d) => d.isHoje) ?? weekDays.find((d) => d.data === today);
      let nextTreinoHoje: typeof treinoHoje = null;
      if (!hoje || (!hoje.temTreino && !hoje.isOff)) {
        nextTreinoHoje = { status: 'sem-plano' };
      } else if (hoje.isOff) {
        nextTreinoHoje = { status: 'off' };
      } else if (hoje.treinoConcluido) {
        nextTreinoHoje = {
          status: 'concluido',
          nome: hoje.nomeRotina,
          fichaId: hoje.fichaId,
        };
      } else if (hoje.fichaId) {
        nextTreinoHoje = {
          status: 'pendente',
          nome: hoje.nomeRotina,
          fichaId: hoje.fichaId,
        };
      } else if (hoje.treinoPdfId) {
        nextTreinoHoje = { status: 'pendente', nome: 'Treino PDF' };
      } else {
        nextTreinoHoje = { status: 'pendente', nome: hoje.nomeRotina };
      }
      setTreinoHoje(nextTreinoHoje);

      let nextAgua = { id: null as string | null, copos: 0, ml_por_copo: 250 };
      if (aguaResult.data) {
        nextAgua = {
          id: aguaResult.data.id,
          copos: aguaResult.data.copos,
          ml_por_copo: aguaResult.data.ml_por_copo,
        };
        setAgua(nextAgua);
      }

      setDashboardAlunoCache({
        userId: uid,
        userName: resolvedName,
        userAvatar: resolvedAvatar,
        coachId: coachIdValue,
        coachInfo: nextCoachInfo,
        coachContactAvailable: coachExtrasEnabled,
        coachPendings: { mensagens: 0, feedbacks: 0 },
        incompleteData:
          profile.role === 'aluno' &&
          !!profile.first_access_completed &&
          !profile.date_of_birth,
        kpis: nextKpis,
        diasSemana: weekDays,
        weekOffset: 0,
        treinoHoje: nextTreinoHoje,
        planoNutricao: null,
        agua: nextAgua,
        parceiros: [],
        availableWorkouts: [],
      });

      loadSecondaryDashboardData(uid, coachIdValue, coachExtrasEnabled);
    } catch (err) {
      console.error('[Dashboard] Erro:', err);
      setLoading(false);
    }
  };

  const handleSaveDayConfig = async (dayOfWeek: number, option: WorkoutOption | 'rest') => {
    if (!userId) return;

    const targetDate =
      selectedDia?.data ??
      diasSemana.find((d) => new Date(`${d.data}T12:00:00`).getDay() === dayOfWeek)?.data;

    const useDateOverride = weekOffset !== 0;
    if (useDateOverride && !targetDate) return;

    setSavingConfig(true);
    try {
      const workoutFields: Record<string, unknown> = {
        is_off: option === 'rest',
        ficha_id: null,
        treino_pdf_id: null,
      };

      if (option !== 'rest') {
        if (option.type === 'ficha') {
          workoutFields.ficha_id = option.id;
        } else if (option.type === 'pdf') {
          workoutFields.treino_pdf_id = option.id;
        }
      }

      if (useDateOverride) {
        const { error } = await supabaseClient
          .from('agenda_diaria')
          .upsert(
            {
              aluno_id: userId,
              data: targetDate,
              ...workoutFields,
              updated_at: new Date().toISOString(),
            },
            { onConflict: 'aluno_id,data' },
          );
        if (error) throw error;
      } else {
        const { error } = await supabaseClient
          .from('agenda_semanal')
          .upsert(
            {
              aluno_id: userId,
              dia_semana: dayOfWeek,
              ...workoutFields,
            },
            { onConflict: 'aluno_id,dia_semana' },
          );
        if (error) throw error;
      }

      await fetchWeeklyAgenda(userId, weekOffset);

      const todayJS = new Date().getDay();
      if (!useDateOverride && dayOfWeek === todayJS) {
        invalidateDashboardAlunoCache(userId);
        void fetchDashboard({ force: true });
      }

      setEditingDay(null);
    } catch (err) {
      console.error('[Dashboard] Erro ao salvar agenda:', err);
    } finally {
      setSavingConfig(false);
    }
  };

  const handleConfirmarStatus = async (dia: DiaSemana, novoStatus: 'done' | 'missed') => {
    if (!userId) return;
    try {
      await updateTreinoStatus({
        alunoId: userId,
        coachId,
        data: dia.data,
        novoStatus,
      });

      const concluido = novoStatus === 'done';
      setDiasSemana((prev) =>
        prev.map((d) => (d.data === dia.data ? { ...d, treinoConcluido: concluido } : d)),
      );
      setSelectedDia((prev) =>
        prev?.data === dia.data ? { ...prev, treinoConcluido: concluido } : prev,
      );

      const todayStr = getTodayBrazil();
      if (dia.data === todayStr) {
        setCheckinFeito(concluido);
        if (concluido) {
          setTreinoHoje((prev) => (prev ? { ...prev, status: 'concluido' } : prev));
        } else {
          setTreinoHoje((prev) =>
            prev?.status === 'concluido' ? { ...prev, status: 'pendente' } : prev,
          );
        }
      }
      setEditingDay(null);
    } catch (err) {
      console.error('[Dashboard] Erro ao atualizar status do treino:', err);
    }
  };

  const updateAgua = async (delta: number) => {
    if (!userId || savingAgua) return;
    const next = Math.max(0, Math.min(20, agua.copos + delta));
    if (next === agua.copos) return;

    setSavingAgua(true);
    const today = getTodayBrazil();

    try {
      if (agua.id) {
        await supabaseClient
          .from('registros_agua')
          .update({ copos: next, atualizado_em: new Date().toISOString() })
          .eq('id', agua.id);
      } else {
        const { data } = await supabaseClient
          .from('registros_agua')
          .insert({ aluno_id: userId, data_registro: today, copos: next, ml_por_copo: agua.ml_por_copo })
          .select('id')
          .single();
        setAgua(a => ({ ...a, id: data?.id ?? null }));
      }
      setAgua(a => ({ ...a, copos: next }));
    } catch (err) {
      console.error('[Água] Erro:', err);
    } finally {
      setSavingAgua(false);
    }
  };

  // ── Render ───────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="min-h-screen bg-surface-0 flex items-center justify-center">
        <DumbbellLoader text="Preparando seu dashboard..." />
      </div>
    );
  }

  const streakSemanas = kpis?.streak_atual ?? 0;
  const treinosSemana = diasSemana.filter(dia => dia.treinoConcluido).length;
  const metaSemana = diasSemana.filter(dia => dia.temTreino && !dia.isOff).length;
  const weekLabel = getWeekLabel(weekOffset);
  const today = getTodayBrazil();

  const cardioMeta = treinoHoje?.status === 'pendente' ? 1 : treinoHoje?.status === 'concluido' ? 1 : 0;
  const cardioAtual = checkinFeito ? 1 : 0;

  return (
    <div className="dashboard-aluno min-h-screen scroll-content overflow-y-auto">
      <div className="mx-auto flex max-w-md flex-col gap-3 pb-[calc(5.5rem+env(safe-area-inset-bottom))]">

        <div className="relative">
          <HeroHeader
            userName={userName}
            avatarUrl={userAvatar}
            showNotificationBadge={coachPendings.feedbacks > 0 || coachPendings.mensagens > 0}
            chatNaoLidas={chatNaoLidas}
            agua={{ atual: agua.copos, meta: metaCopos }}
            dieta={{
              atual: planoNutricao?.refeicoesConcluidas ?? 0,
              meta: planoNutricao?.totalRefeicoes ?? 0,
            }}
            treinos={{ atual: treinosSemana, meta: metaSemana }}
            cardio={{ atual: cardioAtual, meta: cardioMeta }}
          />

          <WorkoutCard
            status={treinoHoje?.status ?? 'sem-plano'}
            nome={treinoHoje?.nome}
            fichaId={treinoHoje?.fichaId}
            qtdExercicios={treinoHoje?.qtdExercicios}
            checkinPontos={checkinPontos}
            onAlterar={
              treinoHoje?.status === 'pendente'
                ? () => setEditingDay(new Date().getDay())
                : undefined
            }
          />
        </div>

        {incompleteData && (
          <div className="mx-4 flex items-start gap-3 rounded-lg border border-warning-border bg-warning-subtle p-4">
            <WarningCircle className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
            <div className="min-w-0 flex-1">
              <p className="mb-1 text-sm font-medium text-text-primary">Perfil incompleto</p>
              <p className="mb-3 text-xs text-text-secondary">
                Adicione sua data de nascimento para um planejamento mais preciso.
              </p>
              <Link
                href="/aluno/perfil"
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-brand"
              >
                Atualizar perfil <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
          </div>
        )}

        {coachInfo && (
          <div className="mx-4">
            <CoachCard
              coachNome={coachInfo.nome}
              coachAvatar={coachInfo.avatar}
              mensagensPendentes={chatNaoLidas}
              feedbacksPendentes={coachPendings.feedbacks}
            />
          </div>
        )}

        <WeekCalendar
          diasSemana={diasSemana}
          weekOffset={weekOffset}
          weekLabel={weekLabel}
          today={today}
          selectedDia={selectedDia}
          onWeekChange={(delta) => setWeekOffset((w) => w + delta)}
          onSelectDia={setSelectedDia}
          onEditDay={setEditingDay}
          editModeExternal={calendarEditMode}
          onEditModeChange={setCalendarEditMode}
        />

        <DayConfigPicker
          open={editingDay !== null}
          jsDay={editingDay ?? 0}
          dia={selectedDia}
          today={today}
          workouts={availableWorkouts}
          saving={savingConfig}
          onClose={() => setEditingDay(null)}
          onSelectRest={() => {
            if (editingDay === null) return;
            void handleSaveDayConfig(editingDay, 'rest');
          }}
          onSelectWorkout={(option) => {
            if (editingDay === null) return;
            void handleSaveDayConfig(editingDay, option);
          }}
          onSelectStatus={
            selectedDia
              ? (status) => {
                  void handleConfirmarStatus(selectedDia, status);
                }
              : undefined
          }
        />

        <StreakRow
          sequenciaDias={streakSemanas}
          treinosSemana={treinosSemana}
          metaSemana={metaSemana}
        />

        <div className="mx-4 flex flex-col gap-3">
          {planoNutricao && (
            <NutritionCard
              nome={planoNutricao.nome}
              refeicoesFeitasHoje={planoNutricao.refeicoesConcluidas}
              totalRefeicoes={planoNutricao.totalRefeicoes}
              proximaRefeicao={planoNutricao.proximaRefeicao}
              onVerPlano={() => router.push('/aluno/plano-alimentar')}
            />
          )}

          <HydrationCard
            copos={agua.copos}
            mlPorCopo={agua.ml_por_copo}
            metaCopos={metaCopos}
            saving={savingAgua}
            onAdd={() => updateAgua(1)}
            onRemove={() => updateAgua(-1)}
          />

          {parceiros.length > 0 && coachContactAvailable && (
            <Link
              href="/aluno/parceiros"
              className="mobile-card-surface flex items-center justify-between rounded-2xl border px-4 py-3 text-sm text-text-secondary transition-colors hover:text-text-primary"
            >
              <span>Benefícios exclusivos disponíveis</span>
              <ArrowRight className="h-4 w-4 shrink-0 text-text-muted" />
            </Link>
          )}

          <QuickActions />
        </div>
      </div>

    </div>
  );
}
