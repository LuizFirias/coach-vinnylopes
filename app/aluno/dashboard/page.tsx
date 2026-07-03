"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseClient } from "@/lib/supabaseClient";
import { getSafeSession } from '@/lib/authErrorHandler';
import { getPublicStorageUrl } from '@/lib/storageUrls';
import Link from "next/link";
import {
  Barbell, Ruler, ArrowRight,
  WarningCircle, Fire, Flame,
  Bell, CaretLeft, CaretRight, Clock, TrendUp,
  Lightning, Drop, Plus, Minus, X,
} from '@phosphor-icons/react';
import { cn } from '@/lib/utils/cn';
import DumbbellLoader from "@/app/components/DumbbellLoader";
import { getTodayBrazil } from '@/lib/dateUtils';
import { CoachCard } from '@/app/components/dashboard/CoachCard';

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

interface DiaSemana {
  data: string;
  label: string;
  numero: number;
  isHoje: boolean;
  treinoConcluido: boolean;
  temTreino: boolean;
  isOff?: boolean;
  nomeRotina?: string;
  fichaId?: string;
  treinoPdfId?: string;
}

interface WorkoutOption {
  id: string;
  name: string;
  type: 'ficha' | 'pdf' | 'manual';
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function toTitleCase(str: string) {
  return str.replace(/\w\S*/g, (txt) => txt.charAt(0).toUpperCase() + txt.slice(1).toLowerCase());
}

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
  const [userId, setUserId] = useState<string | null>(null);
  const [coachId, setCoachId] = useState<string | null>(null);
  const [incompleteData, setIncompleteData] = useState(false);

  const [kpis, setKpis] = useState<KpisAluno | null>(null);
  const [checkinFeito, setCheckinFeito] = useState(false);
  const [checkinPontos, setCheckinPontos] = useState<number | null>(null);
  const [parceiros, setParceiros] = useState<Parceiro[]>([]);

  // Coach
  const [coachInfo, setCoachInfo] = useState<{ nome: string; avatar: string | null } | null>(null);
  const [coachPendings, setCoachPendings] = useState({ mensagens: 0, feedbacks: 0 });

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
  const [savingConfig, setSavingConfig] = useState(false);

  // ── Carregar dados ──────────────────────────────────────────────────────────

  useEffect(() => {
    fetchDashboard();
  }, []);

  useEffect(() => {
    if (userId) {
      fetchWeeklyAgenda(userId, weekOffset);
    }
  }, [weekOffset, userId]);

  const fetchWeeklyAgenda = async (uid: string, offset: number) => {
    const days = getWeekDays(offset);
    const startOfWeek = days[0].data;
    const endOfWeek = days[6].data;

    try {
      // 1. Buscar agenda prescrita (dia_semana 0..6)
      const { data: agendaSemana } = await supabaseClient
        .from('agenda_semanal')
        .select('dia_semana, ficha_id, treino_pdf_id, is_off, fichas_treino(nome_rotina, configuracao)')
        .eq('aluno_id', uid);

      // 2. Buscar checkins/treinos concluídos na semana
      const { data: checkinsSemana } = await supabaseClient
        .from('treinos_manuais')
        .select('data_treino, concluido')
        .eq('aluno_id', uid)
        .eq('concluido', true)
        .gte('data_treino', startOfWeek)
        .lte('data_treino', endOfWeek);

      const updatedDays = days.map(dia => {
        const dateObj = new Date(dia.data + 'T12:00:00');
        const jsDay = dateObj.getDay(); // 0=Dom, 1=Seg, ...
        const agendaItem = agendaSemana?.find((item: any) => item.dia_semana === jsDay);
        
        let temTreino = false;
        let isOff = false;
        let nomeRotina = undefined;
        let fichaId = undefined;
        let treinoPdfId = undefined;

        if (agendaItem) {
          temTreino = !!(agendaItem.ficha_id || agendaItem.treino_pdf_id);
          isOff = !!agendaItem.is_off;
          nomeRotina = (agendaItem as any).fichas_treino?.nome_rotina || (agendaItem.treino_pdf_id ? 'Treino PDF' : undefined);
          fichaId = agendaItem.ficha_id;
          treinoPdfId = agendaItem.treino_pdf_id;
        }

        const concluido = checkinsSemana?.some(c => c.data_treino === dia.data) || false;

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

      // Definir dia selecionado inicial (hoje se estiver na semana atual, caso contrário o primeiro dia da semana)
      const hojeDia = updatedDays.find(d => d.isHoje);
      setSelectedDia(hojeDia || updatedDays[0]);
    } catch (err) {
      console.error('[Dashboard] Erro ao buscar agenda semanal:', err);
    }
  };

  const handleSaveDayConfig = async (dayOfWeek: number, option: WorkoutOption | 'rest') => {
    if (!userId) return;
    setSavingConfig(true);
    try {
      const payload: any = {
        aluno_id: userId,
        dia_semana: dayOfWeek,
        is_off: option === 'rest',
      };

      if (option !== 'rest') {
        if (option.type === 'ficha') {
          payload.ficha_id = option.id;
          payload.treino_pdf_id = null;
        } else if (option.type === 'pdf') {
          payload.ficha_id = null;
          payload.treino_pdf_id = option.id;
        }
      } else {
        payload.ficha_id = null;
        payload.treino_pdf_id = null;
      }

      const { error } = await supabaseClient
        .from('agenda_semanal')
        .upsert(payload, { onConflict: 'aluno_id,dia_semana' });

      if (error) throw error;

      // Recarregar os dias da agenda semanal
      await fetchWeeklyAgenda(userId, weekOffset);
      
      // Se alterou o dia de hoje, atualiza também o card principal
      const todayJS = new Date().getDay();
      if (dayOfWeek === todayJS) {
        fetchDashboard();
      }

      setEditingDay(null);
    } catch (err) {
      console.error('[Dashboard] Erro ao salvar agenda semanal:', err);
    } finally {
      setSavingConfig(false);
    }
  };

  const fetchDashboard = async () => {
    try {
      const session = await getSafeSession();
      const user = session?.user;
      if (!user) { router.push("/login"); return; }

      const uid = user.id;
      setUserId(uid);

      // Perfil
      const { data: profile } = await supabaseClient
        .from("profiles")
        .select("full_name, role, first_access_completed, date_of_birth, coach_id")
        .eq("id", uid)
        .single();

      if (profile?.coach_id) setCoachId(profile.coach_id);

      if (profile?.role === "coach" || profile?.role === "super_admin") {
        router.push("/admin/dashboard");
        return;
      }
      if (profile?.role === "aluno" && !profile?.first_access_completed) {
        router.push("/aluno/onboarding");
        return;
      }
      if (profile?.role === "aluno" && profile?.first_access_completed && !profile?.date_of_birth) {
        setIncompleteData(true);
      }

      setUserName(profile?.full_name || user.email?.split("@")[0] || "Aluno");

      // KPIs via RPC — fallback gracioso
      try {
        const { data: kpiData } = await supabaseClient
          .rpc('get_kpis_aluno', { p_aluno_id: uid });
        if (kpiData) setKpis(kpiData as KpisAluno);
      } catch {
        const [{ data: medida }, { count: treinos }] = await Promise.all([
          supabaseClient
            .from("medidas_aluno")
            .select("peso")
            .eq("aluno_id", uid)
            .order("data_medicao", { ascending: false })
            .limit(1)
            .maybeSingle(),
          supabaseClient
            .from("historico_treinos")
            .select("*", { count: "exact", head: true })
            .eq("aluno_id", uid),
        ]);
        setKpis({
          volume_semana_kg: 0,
          volume_delta_pct: null,
          peso_atual_kg: medida?.peso ?? null,
          peso_delta_kg: null,
          treinos_mes: treinos ?? 0,
          treinos_delta: 0,
          streak_atual: 0,
        });
      }

      // Check-in de hoje
      const today = getTodayBrazil();
      const { data: checkinHoje } = await supabaseClient
        .from('treinos_manuais')
        .select('id, pontos_earn')
        .eq('aluno_id', uid)
        .eq('data_treino', today)
        .eq('concluido', true)
        .limit(1);
      if (checkinHoje && checkinHoje.length > 0) {
        setCheckinFeito(true);
        setCheckinPontos(checkinHoje[0].pontos_earn || 20);
      }

      // ── Coach info ────────────────────────────────────────────────────────
      if (profile?.coach_id) {
        try {
          const { data: coachData } = await supabaseClient
            .from('profiles')
            .select('full_name, avatar_url')
            .eq('id', profile.coach_id)
            .maybeSingle();

          if (coachData) {
            setCoachInfo({
              nome: coachData.full_name?.split(' ').slice(0, 2).join(' ') || 'Seu Coach',
              avatar: getPublicStorageUrl('avatars', coachData.avatar_url),
            });
          }
        } catch (err) {
          console.log('[Dashboard] Erro ao buscar coach:', err);
        }

        try {
          const { count: fbCount } = await supabaseClient
            .from('feedbacks_treinos')
            .select('id', { count: 'exact', head: true })
            .eq('aluno_id', uid);

          setCoachPendings(prev => ({ ...prev, feedbacks: fbCount ?? 0 }));
        } catch (err) {
          console.warn('[Dashboard] Erro ao buscar feedbacks pendentes:', err);
        }
      }

      // ── Treino de hoje ────────────────────────────────────────────────────
      const dayOfWeek = new Date().getDay();

      try {
        const { data: agendaHoje } = await supabaseClient
          .from('agenda_semanal')
          .select('ficha_id, treino_pdf_id, is_off, fichas_treino(nome_rotina, configuracao)')
          .eq('aluno_id', uid)
          .eq('dia_semana', dayOfWeek)
          .maybeSingle();

        if (!agendaHoje) {
          setTreinoHoje({ status: 'sem-plano' });
        } else if (agendaHoje.is_off) {
          setTreinoHoje({ status: 'off' });
        } else if (checkinHoje && checkinHoje.length > 0) {
          setTreinoHoje({ status: 'concluido' });
        } else if (agendaHoje.ficha_id) {
          const config = (agendaHoje as any).fichas_treino?.configuracao as any;
          const numEx = config?.exercicios?.length || 0;
          setTreinoHoje({
            status: 'pendente',
            nome: (agendaHoje as any).fichas_treino?.nome_rotina,
            fichaId: agendaHoje.ficha_id,
            qtdExercicios: numEx,
          });
        } else if (agendaHoje.treino_pdf_id) {
          setTreinoHoje({ status: 'pendente', nome: 'Treino PDF' });
        } else {
          setTreinoHoje({ status: 'pendente' });
        }
      } catch (err) {
        console.error('[Dashboard] Erro ao buscar treino de hoje:', err);
        setTreinoHoje({ status: 'sem-plano' });
      }

      // ── Nutrição (plano ativo simplificado) ──────────────────────────────
      const todayISO = new Date().toISOString().slice(0, 10);
      try {
        const resPlan = await fetch('/api/aluno/plano-alimentar/digital', {
          headers: { 'Authorization': `Bearer ${session.access_token}` }
        });
        const resPlanData = await resPlan.json();
        const digitalPlanData = resPlanData?.plan;

        if (digitalPlanData) {
          const meals = digitalPlanData.days?.[0]?.meals || [];
          const totalMeals = meals.length;
          
          const { data: checkins } = await supabaseClient
            .from('nutrition_meal_checkins')
            .select('meal_id')
            .eq('student_id', uid)
            .eq('checkin_date', todayISO);

          const checkedMealIds = new Set(checkins?.map(c => c.meal_id) || []);
          
          // Encontrar próxima refeição pendente
          const nextMeal = meals.find((m: any) => !checkedMealIds.has(m.id));

          setPlanoNutricao({
            nome: digitalPlanData.name,
            refeicoesConcluidas: checkedMealIds.size,
            totalRefeicoes: totalMeals,
            proximaRefeicao: nextMeal ? {
              nome: nextMeal.title,
              horario: nextMeal.time_suggestion ? nextMeal.time_suggestion.slice(0, 5) : ''
            } : null
          });
        }
      } catch {
        // sem plano digital — não exibe card
      }

      // Parceiros
      if (profile?.coach_id) {
        const { data: parceirosData } = await supabaseClient
          .from('parceiros')
          .select('id, nome_marca, descricao, cupom, link_desconto, logo_url, imagens')
          .eq('coach_id', profile.coach_id)
          .order('nome_marca', { ascending: true });
        setParceiros(parceirosData || []);
      }

      // ── Água ─────────────────────────────────────────────────────────────
      try {
        const { data: aguaData } = await supabaseClient
          .from('registros_agua')
          .select('id, copos, ml_por_copo')
          .eq('aluno_id', uid)
          .eq('data_registro', today)
          .maybeSingle();

        if (aguaData) {
          setAgua({ id: aguaData.id, copos: aguaData.copos, ml_por_copo: aguaData.ml_por_copo });
        }
      } catch (err) {
        console.warn('[Dashboard] Erro ao buscar agua:', err);
      }

      // ── Carregar fichas e PDFs disponíveis para agenda ──────────────────
      try {
        const { data: fichasData } = await supabaseClient
          .from('fichas_treino')
          .select('id, nome_rotina')
          .eq('aluno_id', uid)
          .eq('ativo', true);

        const { data: pdfsData } = await supabaseClient
          .from('treinos_alunos')
          .select('id, nome')
          .eq('aluno_id', uid);

        const options: WorkoutOption[] = [];
        if (fichasData) {
          fichasData.forEach(f => options.push({ id: f.id, name: f.nome_rotina, type: 'ficha' }));
        }
        if (pdfsData) {
          pdfsData.forEach(p => options.push({ id: p.id, name: p.nome, type: 'pdf' }));
        }
        setAvailableWorkouts(options);
      } catch (err) {
        console.warn('[Dashboard] Erro ao buscar treinos para configuração:', err);
      }
    } catch (err) {
      console.error("[Dashboard] Erro:", err);
    } finally {
      setLoading(false);
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

  const toggleCopo = async (index: number) => {
    const newCopos = index < agua.copos ? index : index + 1;
    const delta = newCopos - agua.copos;
    await updateAgua(delta);
  };

  // ── Render ───────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="min-h-screen bg-surface-0 flex items-center justify-center">
        <DumbbellLoader text="Preparando seu dashboard..." />
      </div>
    );
  }

  const primeiroNome = userName.split(' ')[0];

  const now = new Date();
  const diasSemanaLabels = ['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'];
  const mesesLabels = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
  const diaSemanaStr = diasSemanaLabels[now.getDay()];
  const diaNumStr = now.getDate();
  const mesStr = mesesLabels[now.getMonth()];

  const nomeRotina = treinoHoje?.nome ?? '';
  const totalExercicios = treinoHoje?.qtdExercicios ?? 0;
  const streakSemanas = kpis?.streak_atual ?? 0;
  const treinosSemana = diasSemana.filter(dia => dia.treinoConcluido).length;
  const metaSemana = 5;

  const weekLabel = getWeekLabel(weekOffset);
  const today = getTodayBrazil();

  return (
    <div className="min-h-screen bg-surface-0 scroll-content">
      <div className="max-w-md mx-auto flex flex-col pt-safe">

        {/* ── 1. Header ── */}
        <div className="px-4 pt-4 pb-3 flex items-center justify-between">
          <div>
            {/* Data — eyebrow */}
            <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-text-muted capitalize">
              {diaSemanaStr}, {diaNumStr} de {mesStr}
            </p>
            {/* Saudação */}
            <h1 className="text-xl font-bold text-text-primary mt-0.5">
              Olá, {primeiroNome}
            </h1>
          </div>
          {/* Notificações */}
          <button
            id="btn-notificacoes-dashboard"
            className="w-9 h-9 rounded-lg bg-surface-1 border border-border-subtle flex items-center justify-center relative"
            aria-label="Notificações"
          >
            <Bell className="w-4 h-4 text-text-secondary" />
            {(coachPendings.feedbacks > 0 || coachPendings.mensagens > 0) && (
              <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-[#EF4444] border-2 border-surface-1" />
            )}
          </button>
        </div>

        {/* ── 2. Alerta dados incompletos ── */}
        {incompleteData && (
          <div className="mx-4 mb-3 flex items-start gap-3 p-4 bg-warning-subtle border border-warning-border rounded-lg">
            <WarningCircle className="w-4 h-4 text-warning mt-0.5 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-text-primary mb-1">Perfil incompleto</p>
              <p className="text-xs text-text-secondary mb-3">
                Adicione sua data de nascimento para um planejamento mais preciso.
              </p>
              <Link
                href="/aluno/perfil"
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-brand"
              >
                Atualizar perfil <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
          </div>
        )}

        {/* ── 3. Coach Card ── */}
        {coachInfo && (
          <div className="mx-4 mb-3">
            <CoachCard
              coachNome={coachInfo.nome}
              coachAvatar={coachInfo.avatar}
              mensagensPendentes={coachPendings.mensagens}
              feedbacksPendentes={coachPendings.feedbacks}
            />
          </div>
        )}

        {/* ── 4. Card: Treino de Hoje (principal) ── */}
        <div className="mx-4 mb-3 bg-surface-1 border border-border-subtle rounded-lg overflow-hidden">

          {/* Label + nome */}
          <div className="px-4 pt-4 pb-3 border-b border-border-subtle/50">
            <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-text-muted mb-0.5">
              Treino de hoje
            </p>
            {treinoHoje?.status === 'off' ? (
              <>
                <p className="text-base font-bold text-text-secondary">Dia de descanso</p>
                <p className="text-xs text-text-muted mt-0.5">Recuperação ativa</p>
              </>
            ) : treinoHoje?.status === 'concluido' ? (
              <>
                <p className="text-base font-bold text-success">Treino concluído</p>
                <p className="text-xs text-text-muted mt-0.5">+{checkinPontos ?? 20} pts ganhos hoje</p>
              </>
            ) : treinoHoje?.status === 'sem-plano' ? (
              <>
                <p className="text-base font-bold text-text-primary">Sem treino programado</p>
                <p className="text-xs text-text-muted mt-0.5">Peça ao seu coach para liberar sua ficha</p>
              </>
            ) : (
              <>
                <p className="text-base font-bold text-text-primary">
                  {nomeRotina ? toTitleCase(nomeRotina) : 'Rotina prescrita'}
                </p>
                <p className="text-xs text-text-muted mt-0.5">
                  {totalExercicios > 0 ? `${totalExercicios} exercícios programados` : 'Treino disponível'}
                </p>
              </>
            )}
          </div>

          {/* Agenda semanal com navegação */}
          <div className="px-4 py-3 pb-2.5">
            <div className="flex items-center justify-between mb-3">
              <button
                id="btn-semana-anterior"
                onClick={() => setWeekOffset(w => w - 1)}
                className="w-6 h-6 flex items-center justify-center cursor-pointer"
                aria-label="Semana anterior"
              >
                <CaretLeft className="w-4 h-4 text-text-muted" />
              </button>
              <p className="text-[11px] font-medium text-text-muted">
                {weekLabel}
              </p>
              <button
                id="btn-proxima-semana"
                onClick={() => setWeekOffset(w => w + 1)}
                className="w-6 h-6 flex items-center justify-center cursor-pointer"
                aria-label="Próxima semana"
              >
                <CaretRight className="w-4 h-4 text-text-muted" />
              </button>
            </div>

            {/* Dias da semana */}
            <div className="grid grid-cols-7 gap-1">
              {diasSemana.map((dia) => (
                <div
                  key={dia.data}
                  onClick={() => setSelectedDia(dia)}
                  className="flex flex-col items-center gap-1 cursor-pointer"
                >
                  <p className="text-[9px] uppercase text-text-muted font-medium">
                    {dia.label}
                  </p>
                  <div className={cn(
                    'w-8 h-8 rounded-lg flex flex-col items-center justify-center transition-colors',
                    dia.isHoje
                      ? 'bg-brand text-text-on-brand'
                      : selectedDia?.data === dia.data
                      ? 'bg-surface-2 border border-border-default'
                      : 'transparent'
                  )}>
                    <p className={cn(
                      'text-[11px] font-semibold',
                      dia.isHoje ? 'text-text-on-brand' : 'text-text-primary'
                    )}>
                      {dia.numero}
                    </p>
                  </div>
                  
                  {/* Status dot or line indicator below the number */}
                  <div className="h-2.5 flex items-center justify-center">
                    {dia.isHoje ? (
                      dia.isOff ? (
                        <span className="text-[10px] leading-none text-white font-bold">—</span>
                      ) : dia.treinoConcluido ? (
                        <span className="w-1 h-1 rounded-full bg-success" />
                      ) : dia.temTreino ? (
                        <span className="w-1 h-1 rounded-full bg-danger" />
                      ) : null
                    ) : dia.data > today ? (
                      dia.isOff ? (
                        <span className="text-[10px] leading-none text-white font-bold">—</span>
                      ) : dia.temTreino ? (
                        <span className="w-1 h-1 rounded-full bg-[#FF6B35]" />
                      ) : null
                    ) : (
                      dia.treinoConcluido ? (
                        <span className="w-1 h-1 rounded-full bg-success" />
                      ) : dia.isOff ? (
                        <span className="text-[10px] leading-none text-white font-bold">—</span>
                      ) : dia.temTreino ? (
                        <span className="w-1 h-1 rounded-full bg-danger" />
                      ) : null
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Preview do treino selecionado na semana */}
          {selectedDia && (
            <div className="px-4 py-2 border-t border-border-subtle/50 bg-surface-2/30 flex items-center justify-between transition-colors">
              <div className="min-w-0">
                <p className="text-[11px] font-medium text-text-muted">
                  {selectedDia.isOff ? (
                    "Descanso"
                  ) : selectedDia.nomeRotina ? (
                    <>
                      {toTitleCase(selectedDia.nomeRotina)}
                      {selectedDia.treinoConcluido ? (
                        <span className="text-success font-semibold"> · Concluído</span>
                      ) : selectedDia.isHoje ? (
                        <span className="text-brand font-semibold"> · Hoje</span>
                      ) : selectedDia.data > today ? (
                        <span className="text-text-muted"> · Programado</span>
                      ) : (
                        <span className="text-danger font-semibold"> · Não realizado</span>
                      )}
                    </>
                  ) : (
                    "Sem treino programado"
                  )}
                </p>
              </div>
              <div className="flex items-center gap-3">
                {/* Alterar / Configurar button */}
                <button
                  onClick={() => {
                    const dateObj = new Date(selectedDia.data + 'T12:00:00');
                    const jsDay = dateObj.getDay();
                    setEditingDay(jsDay);
                  }}
                  className="text-[10px] font-bold text-text-secondary hover:text-text-primary uppercase tracking-wider cursor-pointer"
                >
                  Alterar
                </button>
                {selectedDia.isHoje && selectedDia.temTreino && !selectedDia.treinoConcluido && (
                  <Link
                    href={selectedDia.fichaId ? `/aluno/treinos/${selectedDia.fichaId}/executar` : '/aluno/treinos'}
                    className="text-[11px] font-bold text-brand uppercase tracking-wider hover:opacity-80"
                  >
                    Iniciar
                  </Link>
                )}
              </div>
            </div>
          )}

          {/* Botão iniciar treino principal (sempre hoje) */}
          <div className="px-4 pb-4 pt-3 border-t border-border-subtle/20">
            {treinoHoje?.status === 'pendente' ? (
              <Link
                href={treinoHoje.fichaId ? `/aluno/treinos/${treinoHoje.fichaId}/executar` : '/aluno/treinos'}
                id="btn-iniciar-treino-dashboard"
                className="w-full h-11 bg-brand rounded-lg text-sm font-semibold text-text-on-brand flex items-center justify-center gap-2 active:opacity-90"
              >
                <Barbell className="w-4 h-4" />
                Iniciar treino
              </Link>
            ) : treinoHoje?.status === 'concluido' ? (
              <Link
                href="/aluno/treinos"
                className="w-full h-11 bg-surface-2 border border-border-subtle rounded-lg text-sm font-medium text-text-secondary flex items-center justify-center gap-2"
              >
                Ver treinos
              </Link>
            ) : treinoHoje?.status === 'off' ? (
              <Link
                href="/aluno/medidas"
                className="w-full h-11 bg-surface-2 border border-border-subtle rounded-lg text-sm font-medium text-text-secondary flex items-center justify-center gap-2"
              >
                <Ruler className="w-4 h-4" />
                Registrar evolução
              </Link>
            ) : (
              <Link
                href="/aluno/treinos"
                className="w-full h-11 bg-surface-2 border border-border-subtle rounded-lg text-sm font-medium text-text-secondary flex items-center justify-center gap-2"
              >
                Ver treinos disponíveis
              </Link>
            )}
          </div>
        </div>

        {/* ── 5. Cards: Streak + Frequência (lado a lado) ── */}
        <div className="mx-4 mb-2 grid grid-cols-2 gap-2">

          {/* Streak */}
          <div className="bg-surface-1 border border-border-subtle rounded-lg px-3 py-2 flex items-center justify-between">
            <div className="min-w-0">
              <p className="text-[9px] font-semibold uppercase tracking-[0.06em] text-text-muted flex items-center gap-1">
                <Flame className="w-3.5 h-3.5 shrink-0" weight="fill" color="#FF6B35" />
                <span>Sequência</span>
              </p>
              <p className="text-lg font-bold font-mono tabular-nums text-text-primary mt-0.5">
                {streakSemanas} <span className="text-[10px] font-normal text-text-muted font-sans">{streakSemanas === 1 ? 'semana' : 'semanas'}</span>
              </p>
            </div>
          </div>

          {/* Frequência semanal */}
          <div className="bg-surface-1 border border-border-subtle rounded-lg px-3 py-2 flex items-center justify-between">
            <div className="min-w-0">
              <p className="text-[9px] font-semibold uppercase tracking-[0.06em] text-text-muted flex items-center gap-1">
                <Lightning className="w-3.5 h-3.5 shrink-0 text-text-muted" weight="fill" />
                <span>Esta semana</span>
              </p>
              <p className="text-lg font-bold font-mono tabular-nums text-text-primary mt-0.5">
                {treinosSemana}<span className="text-xs font-normal text-text-muted">/{metaSemana}</span>
                <span className="text-[10px] font-normal text-text-muted font-sans ml-1">treinos</span>
              </p>
            </div>
          </div>
        </div>

        {/* ── 6. Card: Nutrição (simplificado — sem "HORA DE COMER") ── */}
        {planoNutricao && (
          <div className="mx-4 mb-2 bg-surface-1 border border-border-subtle rounded-lg px-4 py-3 flex items-center justify-between">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.06em] text-text-muted mb-0.5">
                Nutrição
              </p>
              <p className="text-sm font-semibold text-text-primary">
                {planoNutricao.nome}
              </p>
              <p className="text-xs text-text-muted mt-0.5">
                {planoNutricao.refeicoesConcluidas}/{planoNutricao.totalRefeicoes} refeições hoje
              </p>
              {planoNutricao.refeicoesConcluidas === planoNutricao.totalRefeicoes ? (
                <p className="text-[11px] text-text-muted mt-0.5">
                  Todas as refeições registradas hoje
                </p>
              ) : planoNutricao.proximaRefeicao ? (
                <p className="text-[11px] text-text-muted mt-0.5">
                  Próxima: {planoNutricao.proximaRefeicao.nome} {planoNutricao.proximaRefeicao.horario && `· ${planoNutricao.proximaRefeicao.horario}`}
                </p>
              ) : null}
            </div>
            <button
              onClick={() => router.push('/aluno/plano-alimentar')}
              id="btn-ver-plano-nutricao"
              className="flex items-center gap-1 text-xs font-medium text-brand cursor-pointer"
            >
              Ver plano
              <CaretRight className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* ── 7. Hidratação (Compacto) ── */}
        <div className="mx-4 mb-2 bg-surface-1 border border-border-subtle rounded-lg px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Drop className="w-4 h-4 text-brand" />
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.06em] text-text-muted">
                Hidratação
              </p>
              <p className="text-xs font-bold text-text-primary mt-0.5">
                {agua.copos * agua.ml_por_copo}ml / {metaCopos * agua.ml_por_copo}ml
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => updateAgua(-1)}
              disabled={savingAgua || agua.copos === 0}
              id="btn-dashboard-remover-copo"
              className="w-8 h-8 rounded-lg bg-surface-2 border border-border-subtle flex items-center justify-center disabled:opacity-30 cursor-pointer"
            >
              <Minus className="w-3.5 h-3.5 text-text-secondary" />
            </button>
            <span className="text-sm font-bold font-mono min-w-[20px] text-center">
              {agua.copos}
            </span>
            <button
              onClick={() => updateAgua(1)}
              disabled={savingAgua || agua.copos >= metaCopos}
              id="btn-dashboard-adicionar-copo"
              className="w-8 h-8 rounded-lg bg-brand flex items-center justify-center disabled:opacity-30 cursor-pointer text-white"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* ── 8. Parceiros ── */}
        {parceiros.length > 0 && (
          <Link
            href="/aluno/parceiros"
            className="mx-4 mb-2 flex items-center justify-between px-4 py-3 bg-surface-1 border border-border-subtle rounded-lg text-sm text-text-secondary hover:text-text-primary transition-colors"
          >
            <span>Benefícios exclusivos disponíveis</span>
            <ArrowRight className="w-4 h-4 flex-shrink-0 text-text-muted" />
          </Link>
        )}

        {/* ── 9. Ações rápidas (rodapé do scroll) ── */}
        <div className="mx-4 mb-6 grid grid-cols-2 gap-2">
          <Link
            href="/aluno/medidas"
            id="btn-registrar-evolucao"
            className="h-11 bg-surface-1 border border-border-subtle rounded-lg text-xs font-medium text-text-secondary flex items-center justify-center gap-1.5"
          >
            <TrendUp className="w-3.5 h-3.5" />
            Registrar evolução
          </Link>
          <Link
            href="/aluno/treinos"
            id="btn-ver-historico"
            className="h-11 bg-surface-1 border border-border-subtle rounded-lg text-xs font-medium text-text-secondary flex items-center justify-center gap-1.5"
          >
            <Clock className="w-3.5 h-3.5" />
            Ver histórico
          </Link>
        </div>

      </div>

      {/* ── DayConfigModal: Editar Treino/Descanso do Dia da Semana ── */}
      {editingDay !== null && (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/80 backdrop-blur-sm p-0 md:p-4" onClick={() => setEditingDay(null)}>
          <div
            className="relative bg-[#0A0A0A] w-full md:max-w-md rounded-t-2xl md:rounded-2xl border border-white/10 shadow-2xl overflow-hidden flex flex-col max-h-[80vh] md:max-h-[90vh]"
            onClick={e => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/5 bg-[#111111]">
              <div>
                <p className="text-[10px] text-text-muted uppercase tracking-wider">Configurar Dia</p>
                <h2 className="text-base font-bold text-white mt-0.5">
                  {['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'][editingDay]}
                </h2>
              </div>
              <button onClick={() => setEditingDay(null)} className="p-1.5 hover:bg-white/5 rounded-lg text-text-secondary transition-colors cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Options List */}
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 bg-[#0A0A0A]">
              {/* Opção Descanso */}
              <button
                onClick={() => handleSaveDayConfig(editingDay, 'rest')}
                disabled={savingConfig}
                className="w-full flex items-center justify-between p-3.5 rounded-xl border border-white/5 hover:border-brand bg-[#121212]/80 hover:bg-[#121212] text-left transition-all cursor-pointer"
              >
                <div>
                  <p className="text-xs font-semibold text-white uppercase tracking-tight">Descanso (Day Off)</p>
                  <p className="text-[10px] text-text-muted mt-0.5">Sem treino programado</p>
                </div>
                {savingConfig ? (
                  <div className="w-3.5 h-3.5 border-2 border-brand/20 border-t-brand rounded-full animate-spin" />
                ) : (
                  <ArrowRight className="w-3.5 h-3.5 text-text-muted" />
                )}
              </button>

              {/* Fichas */}
              {availableWorkouts.filter(w => w.type === 'ficha').map(w => (
                <button
                  key={w.id}
                  onClick={() => handleSaveDayConfig(editingDay, w)}
                  disabled={savingConfig}
                  className="w-full flex items-center justify-between p-3.5 rounded-xl border border-white/5 hover:border-brand bg-[#121212]/80 hover:bg-[#121212] text-left transition-all cursor-pointer"
                >
                  <div>
                    <p className="text-xs font-semibold text-white uppercase tracking-tight">{w.name}</p>
                    <p className="text-[10px] text-text-muted mt-0.5">Ficha digital de treino</p>
                  </div>
                  <ArrowRight className="w-3.5 h-3.5 text-text-muted" />
                </button>
              ))}

              {/* PDFs */}
              {availableWorkouts.filter(w => w.type === 'pdf').map(w => (
                <button
                  key={w.id}
                  onClick={() => handleSaveDayConfig(editingDay, w)}
                  disabled={savingConfig}
                  className="w-full flex items-center justify-between p-3.5 rounded-xl border border-white/5 hover:border-brand bg-[#121212]/80 hover:bg-[#121212] text-left transition-all cursor-pointer"
                >
                  <div>
                    <p className="text-xs font-semibold text-white uppercase tracking-tight">{w.name}</p>
                    <p className="text-[10px] text-text-muted mt-0.5">Protocolo em PDF</p>
                  </div>
                  <ArrowRight className="w-3.5 h-3.5 text-text-muted" />
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
