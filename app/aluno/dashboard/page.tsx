"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseClient } from "@/lib/supabaseClient";
import { getSafeSession } from '@/lib/authErrorHandler';
import { getPublicStorageUrl } from '@/lib/storageUrls';
import Link from "next/link";
import { ArrowRight, WarningCircle } from '@phosphor-icons/react';
import DumbbellLoader from "@/app/components/DumbbellLoader";
import { getTodayBrazil, toBrazilDateString } from '@/lib/dateUtils';
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
import { useNotificacoesNaoLidas } from '@/lib/notifications/realtime';
import { NotificationsPanel } from '@/app/components/notifications/NotificationsPanel';
import { AlunoObservacoesInbox } from '@/app/components/aluno/AlunoObservacoesInbox';

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

interface WeekStats {
  treinos: number;
  meta: number;
  /** Minutos de cardio registrados na semana ISO corrente (seg-dom) */
  cardioMin: number;
  /** Minutos de cardio prescritos para a semana (soma das prescrições ativas nos dias cadastrados) */
  cardioMetaMin: number;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const WEEKDAY_LABELS = ['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB'];

function toIsoDate(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/** Semana corrente (segunda a domingo) que contém "hoje" — "Esta semana" zera toda segunda. */
function getCurrentIsoWeekRange(): { monday: string; sunday: string } {
  const today = new Date(`${getTodayBrazil()}T12:00:00`);
  const diffToMonday = (today.getDay() + 6) % 7; // 0=Seg
  const monday = new Date(today);
  monday.setDate(today.getDate() - diffToMonday);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  return { monday: toIsoDate(monday), sunday: toIsoDate(sunday) };
}

/**
 * Janela rolável de dias a partir de ontem (estilo Gympass): ontem + `count - 1` dias à frente.
 * O dia anterior fica visível para o aluno confirmar manualmente um treino esquecido.
 */
function getUpcomingDays(count = 16): DiaSemana[] {
  const today = new Date();
  const tYear = today.getFullYear();
  const tMonth = String(today.getMonth() + 1).padStart(2, '0');
  const tDay = String(today.getDate()).padStart(2, '0');
  const tIso = `${tYear}-${tMonth}-${tDay}`;

  const dias: DiaSemana[] = [];
  for (let i = -1; i < count - 1; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);

    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const isoDate = `${year}-${month}-${day}`;

    dias.push({
      data: isoDate,
      label: WEEKDAY_LABELS[d.getDay()],
      mesLabel: d.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '').toUpperCase(),
      numero: d.getDate(),
      isHoje: isoDate === tIso,
      treinoConcluido: false,
      temTreino: false,
    });
  }
  return dias;
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
  const notifNaoLidas = useNotificacoesNaoLidas(userId);
  const [notifOpen, setNotifOpen] = useState(false);

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

  // Agenda (hoje + 15 dias)
  const [diasSemana, setDiasSemana] = useState<DiaSemana[]>(() => getUpcomingDays());
  const [selectedDia, setSelectedDia] = useState<DiaSemana | null>(null);
  // Resumo da semana corrente (segunda a domingo) — independente da janela rolável do calendário
  const [weekStats, setWeekStats] = useState<WeekStats>({
    treinos: 0,
    meta: 0,
    cardioMin: 0,
    cardioMetaMin: 0,
  });

  // Configuração da agenda semanal
  const [availableWorkouts, setAvailableWorkouts] = useState<WorkoutOption[]>([]);
  const [editingDay, setEditingDay] = useState<number | null>(null); // jsDay 0..6
  const [calendarEditMode, setCalendarEditMode] = useState(false);
  const [savingConfig, setSavingConfig] = useState(false);

  // ── Carregar dados ──────────────────────────────────────────────────────────

  const didFetchRef = useRef(false);

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
    setWeekStats(cached.weekStats);
    setTreinoHoje(cached.treinoHoje);
    setPlanoNutricao(cached.planoNutricao);
    setAgua(cached.agua);
    setParceiros(cached.parceiros);
    setAvailableWorkouts(cached.availableWorkouts);
    setLoading(false);
  };

  const fetchWeeklyAgenda = async (
    uid: string,
  ): Promise<{ days: DiaSemana[]; weekStats: WeekStats }> => {
    const days = getUpcomingDays();
    const { monday: weekMonday, sunday: weekSunday } = getCurrentIsoWeekRange();
    // A janela de busca cobre tanto os dias visíveis no calendário quanto a semana
    // ISO corrente (seg-dom) inteira, mesmo quando ela começa antes do "ontem" exibido.
    const startOfWeek = days[0].data < weekMonday ? days[0].data : weekMonday;
    const endOfWeek = days[days.length - 1].data > weekSunday ? days[days.length - 1].data : weekSunday;

    try {
      const [
        { data: agendaSemana },
        { data: agendaDiaria },
        { data: checkinsSemana },
        { data: historicoSemana },
        { data: cardioSessoesSemana },
        { data: cardioPrescricoesAtivas },
      ] = await Promise.all([
        supabaseClient
          .from('agenda_semanal')
          .select('dia_semana, ficha_id, treino_pdf_id, is_off, is_cardio, fichas_treino(nome_rotina)')
          .eq('aluno_id', uid),
        supabaseClient
          .from('agenda_diaria')
          .select('data, ficha_id, treino_pdf_id, is_off, is_cardio, fichas_treino(nome_rotina)')
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
        // Conclusão automática: ficha realmente executada (não depende de check-in manual)
        supabaseClient
          .from('historico_treinos')
          .select('data_conclusao')
          .eq('aluno_id', uid)
          .gte('data_conclusao', `${startOfWeek}T00:00:00-03:00`)
          .lte('data_conclusao', `${endOfWeek}T23:59:59-03:00`),
        // Cardio realmente registrado — conta minutos e marca o dia como concluído
        supabaseClient
          .from('cardio_sessoes')
          .select('data, duracao_min')
          .eq('aluno_id', uid)
          .gte('data', startOfWeek)
          .lte('data', endOfWeek),
        // Meta de cardio da semana: soma das prescrições ativas nos dias que caem nela
        supabaseClient
          .from('cardio_prescricoes')
          .select('duracao_min, dias_semana')
          .eq('aluno_id', uid)
          .eq('ativo', true),
      ]);

      const overrideByDate = new Map(
        (agendaDiaria ?? []).map((item: any) => [item.data as string, item]),
      );

      const concluidoAutoSet = new Set(
        (historicoSemana ?? []).map((h: any) => toBrazilDateString(h.data_conclusao)),
      );

      const cardioMinutosPorDia = new Map<string, number>();
      for (const s of cardioSessoesSemana ?? []) {
        const atual = cardioMinutosPorDia.get(s.data) ?? 0;
        cardioMinutosPorDia.set(s.data, atual + (s.duracao_min ?? 0));
      }

      const resolveDay = (dataIso: string) => {
        const dateObj = new Date(dataIso + 'T12:00:00');
        const jsDay = dateObj.getDay();
        const override = overrideByDate.get(dataIso);
        const agendaItem =
          override ?? agendaSemana?.find((item: any) => item.dia_semana === jsDay);

        let temTreino = false;
        let isOff = false;
        let isCardio = false;
        let nomeRotina = undefined;
        let fichaId = undefined;
        let treinoPdfId = undefined;

        if (agendaItem) {
          temTreino = !!(agendaItem.ficha_id || agendaItem.treino_pdf_id);
          isOff = !!agendaItem.is_off;
          isCardio = !temTreino && !!agendaItem.is_cardio;
          nomeRotina =
            (agendaItem as any).fichas_treino?.nome_rotina ||
            (agendaItem.treino_pdf_id ? 'Treino PDF' : undefined);
          fichaId = agendaItem.ficha_id;
          treinoPdfId = agendaItem.treino_pdf_id;
        }

        // Concluído se houve check-in manual, ficha realmente executada OU cardio registrado
        const checkin = checkinsSemana?.find((c) => c.data_treino === dataIso);
        const concluido =
          !!checkin || concluidoAutoSet.has(dataIso) || cardioMinutosPorDia.has(dataIso);

        return { temTreino, isOff, isCardio, nomeRotina, fichaId, treinoPdfId, concluido };
      };

      const updatedDays = days.map((dia) => {
        const resolved = resolveDay(dia.data);
        return {
          ...dia,
          temTreino: resolved.temTreino,
          isOff: resolved.isOff,
          isCardio: resolved.isCardio,
          nomeRotina: resolved.nomeRotina,
          fichaId: resolved.fichaId,
          treinoPdfId: resolved.treinoPdfId,
          treinoConcluido: resolved.concluido,
        };
      });

      setDiasSemana(updatedDays);
      patchDashboardAlunoCache(uid, { diasSemana: updatedDays });
      const hojeDia = updatedDays.find((d) => d.isHoje);
      setSelectedDia(hojeDia || updatedDays[0]);

      // Resumo da semana corrente (segunda a domingo) — sempre a semana ISO real,
      // independente de quantos dias dela aparecem na janela rolável do calendário.
      let treinosSemanaCount = 0;
      let metaSemanaCount = 0;
      let cardioMinCount = 0;
      let cardioMetaMinCount = 0;
      const cursor = new Date(`${weekMonday}T12:00:00`);
      const weekEndCursor = new Date(`${weekSunday}T12:00:00`);
      while (cursor <= weekEndCursor) {
        const iso = toIsoDate(cursor);
        const jsDay = cursor.getDay();
        const resolved = resolveDay(iso);
        if (resolved.temTreino && !resolved.isOff) metaSemanaCount++;
        if (resolved.concluido) treinosSemanaCount++;
        cardioMinCount += cardioMinutosPorDia.get(iso) ?? 0;
        for (const p of cardioPrescricoesAtivas ?? []) {
          if (Array.isArray(p.dias_semana) && p.dias_semana.includes(jsDay)) {
            cardioMetaMinCount += p.duracao_min ?? 0;
          }
        }
        cursor.setDate(cursor.getDate() + 1);
      }
      const nextWeekStats: WeekStats = {
        treinos: treinosSemanaCount,
        meta: metaSemanaCount,
        cardioMin: cardioMinCount,
        cardioMetaMin: cardioMetaMinCount,
      };
      setWeekStats(nextWeekStats);
      patchDashboardAlunoCache(uid, { weekStats: nextWeekStats });

      // Pontos do check-in de hoje (se houver)
      const todayStr = getTodayBrazil();
      const todayCheckin = checkinsSemana?.find((c) => c.data_treino === todayStr);
      if (todayCheckin) {
        setCheckinFeito(true);
        setCheckinPontos(todayCheckin.pontos_earn || 20);
      }

      return { days: updatedDays, weekStats: nextWeekStats };
    } catch (err) {
      console.error('[Dashboard] Erro ao buscar agenda semanal:', err);
      return { days, weekStats };
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
      const [kpiResult, coachResult, aguaResult, weekResult] = await Promise.all([
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
        fetchWeeklyAgenda(uid),
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
      const weekDays = weekResult.days;
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
        weekStats: weekResult.weekStats,
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

  const handleSaveDayConfig = async (
    dayOfWeek: number,
    option: WorkoutOption | 'rest' | 'cardio',
  ) => {
    if (!userId) return;

    const targetDate =
      selectedDia?.data ??
      diasSemana.find((d) => new Date(`${d.data}T12:00:00`).getDay() === dayOfWeek)?.data;

    // O calendário começa em "ontem" (índice 0); a semana corrente (hoje..+6, índices 1-7)
    // edita o padrão semanal recorrente. Ontem e dias além da semana corrente são
    // ajustes pontuais só para aquela data (agenda_diaria).
    const targetIndex = diasSemana.findIndex((d) => d.data === targetDate);
    const useDateOverride = targetIndex <= 0 || targetIndex >= 8;
    if (useDateOverride && !targetDate) return;

    setSavingConfig(true);
    try {
      const workoutFields: Record<string, unknown> = {
        is_off: option === 'rest',
        is_cardio: option === 'cardio',
        ficha_id: null,
        treino_pdf_id: null,
      };

      if (option !== 'rest' && option !== 'cardio') {
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

      // Reatribuir o dia (novo treino ou descanso) invalida qualquer check-in manual
      // antigo daquela data — evita mostrar "concluído" sem o aluno ter feito nada.
      if (targetDate) {
        await supabaseClient
          .from('treinos_manuais')
          .update({ concluido: false })
          .eq('aluno_id', userId)
          .eq('data_treino', targetDate)
          .eq('concluido', true);
      }

      await fetchWeeklyAgenda(userId);

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
  // "Esta semana" é sempre a semana ISO real (segunda a domingo) — zera toda segunda,
  // independente da janela rolável do calendário. Ver weekStats em fetchWeeklyAgenda.
  const treinosSemana = weekStats.treinos;
  const metaSemana = weekStats.meta;
  const today = getTodayBrazil();

  // "Treino" no topo reflete só o dia de hoje: 0/1 pendente, 1/1 ao concluir a ficha
  const treinoHojeMeta =
    treinoHoje && treinoHoje.status !== 'sem-plano' && treinoHoje.status !== 'off' ? 1 : 0;
  const treinoHojeAtual = treinoHoje?.status === 'concluido' ? 1 : 0;

  // "Cardio" no topo mostra minutos realizados x prescritos na semana (formato 00:00),
  // não unidade de dias — ver weekStats.cardioMin/cardioMetaMin em fetchWeeklyAgenda.
  const cardioAtual = weekStats.cardioMin;
  const cardioMeta = weekStats.cardioMetaMin;

  return (
    <div className="dashboard-aluno min-h-screen scroll-content overflow-y-auto">
      <div className="mx-auto flex max-w-md flex-col gap-3 pb-[calc(5.5rem+env(safe-area-inset-bottom))]">

        <div className="relative">
          <HeroHeader
            userName={userName}
            avatarUrl={userAvatar}
            showNotificationBadge={
              notifNaoLidas > 0 ||
              coachPendings.feedbacks > 0 ||
              coachPendings.mensagens > 0
            }
            chatNaoLidas={chatNaoLidas + notifNaoLidas}
            onNotificationsClick={() => setNotifOpen(true)}
            agua={{ atual: agua.copos, meta: metaCopos }}
            dieta={{
              atual: planoNutricao?.refeicoesConcluidas ?? 0,
              meta: planoNutricao?.totalRefeicoes ?? 0,
            }}
            treinos={{ atual: treinoHojeAtual, meta: treinoHojeMeta }}
            cardio={{ atual: cardioAtual, meta: cardioMeta }}
          />

          {userId && (
            <NotificationsPanel
              open={notifOpen}
              onClose={() => setNotifOpen(false)}
              alunoId={userId}
            />
          )}

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

        {userId && <AlunoObservacoesInbox alunoId={userId} />}

        <WeekCalendar
          diasSemana={diasSemana}
          today={today}
          selectedDia={selectedDia}
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
          onSelectCardio={() => {
            if (editingDay === null) return;
            void handleSaveDayConfig(editingDay, 'cardio');
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
            onToggleCup={(index) => {
              const newCopos = index < agua.copos ? index : index + 1;
              void updateAgua(newCopos - agua.copos);
            }}
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
