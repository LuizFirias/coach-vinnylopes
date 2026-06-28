"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseClient } from "@/lib/supabaseClient";
import { getSafeSession } from '@/lib/authErrorHandler';
import { getPublicStorageUrl } from '@/lib/storageUrls';
import Link from "next/link";
import {
  Barbell, Ruler, ArrowRight,
  Calendar, WarningCircle, Fire, Lightning,
} from '@phosphor-icons/react';
import { cn } from '@/lib/utils/cn';
import WeeklyAgenda from "@/app/components/WeeklyAgenda";
import DumbbellLoader from "@/app/components/DumbbellLoader";
import { getTodayBrazil } from '@/lib/dateUtils';
import { CoachCard } from '@/app/components/dashboard/CoachCard';
import { NextActionCard } from '@/app/components/dashboard/NextActionCard';
import { MealNowCard } from '@/app/components/dashboard/MealNowCard';

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

interface Parceiro {
  id: string;
  nome_marca: string;
  descricao?: string;
  cupom?: string;
  link_desconto?: string;
  logo_url?: string | null;
  imagens?: string[] | null;
}

// ─── Componente principal ─────────────────────────────────────────────────────

// ─── Componente ───────────────────────────────────────────────────────────────

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

  // ── Novos estados (Fase 2) ───
  const [coachInfo, setCoachInfo] = useState<{ nome: string; avatar: string | null } | null>(null);
  const [coachPendings, setCoachPendings] = useState({ mensagens: 0, feedbacks: 0 });
  const [treinoHoje, setTreinoHoje] = useState<{
    status: 'pendente' | 'concluido' | 'off' | 'sem-plano';
    nome?: string;
    fichaId?: string;
    qtdExercicios?: number;
  } | null>(null);
  const [refeicaoAgora, setRefeicaoAgora] = useState<{
    id: string;
    nome: string;
    horario: string;
    consumida: boolean;
  } | null>(null);

  // ── Carregar dados ──────────────────────────────────────────────────────────

  useEffect(() => {
    fetchDashboard();
  }, []);

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

      // KPIs via RPC (Sprint 3) — fallback gracioso se a função ainda não existir
      try {
        const { data: kpiData } = await supabaseClient
          .rpc('get_kpis_aluno', { p_aluno_id: uid });
        if (kpiData) setKpis(kpiData as KpisAluno);
      } catch {
        // função ainda não aplicada em produção — usa fallback
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

      // ── Coach info (Fase 2) ────────────────────────────────────────────────
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

        // Pendências - as tabelas podem não existir, então usamos try-catch
        // Tabela mensagens não existe no banco ainda — manter em 0

        try {
          const { count: fbCount } = await supabaseClient
            .from('feedbacks_treinos')
            .select('id', { count: 'exact', head: true })
            .eq('aluno_id', uid);

          setCoachPendings(prev => ({ ...prev, feedbacks: fbCount ?? 0 }));
        } catch (err) {
          console.warn('[Dashboard] Erro ao buscar feedbacks pendentes:', err);
          setCoachPendings(prev => ({ ...prev, feedbacks: 0 }));
        }
      }

      // ── Treino de hoje (Fase 2) ────────────────────────────────────────────
      const dayOfWeek = new Date().getDay();
      console.log('[Dashboard] Buscando treino para dia da semana:', dayOfWeek);

      try {
        const { data: agendaHoje, error: agendaError } = await supabaseClient
          .from('agenda_semanal')
          .select('ficha_id, treino_pdf_id, is_off, fichas_treino(nome_rotina, configuracao)')
          .eq('aluno_id', uid)
          .eq('dia_semana', dayOfWeek)
          .maybeSingle();

        console.log('[Dashboard] Agenda hoje:', agendaHoje, 'Error:', agendaError);

        if (!agendaHoje) {
          console.log('[Dashboard] Nenhuma agenda encontrada para hoje');
          setTreinoHoje({ status: 'sem-plano' });
        } else if (agendaHoje.is_off) {
          console.log('[Dashboard] Dia de descanso');
          setTreinoHoje({ status: 'off' });
        } else if (checkinHoje && checkinHoje.length > 0) {
          console.log('[Dashboard] Treino já concluído');
          setTreinoHoje({ status: 'concluido' });
        } else if (agendaHoje.ficha_id) {
          console.log('[Dashboard] Ficha encontrada:', agendaHoje.ficha_id);
          const config = (agendaHoje as any).fichas_treino?.configuracao as any;
          const numEx = config?.exercicios?.length || 0;
          setTreinoHoje({
            status: 'pendente',
            nome: (agendaHoje as any).fichas_treino?.nome_rotina,
            fichaId: agendaHoje.ficha_id,
            qtdExercicios: numEx,
          });
        } else if (agendaHoje.treino_pdf_id) {
          console.log('[Dashboard] PDF encontrado:', agendaHoje.treino_pdf_id);
          setTreinoHoje({ status: 'pendente', nome: 'Treino PDF' });
        } else {
          console.log('[Dashboard] Agenda existe mas sem ficha/PDF');
          setTreinoHoje({ status: 'pendente' });
        }
      } catch (err) {
        console.error('[Dashboard] Erro ao buscar treino de hoje:', err);
        setTreinoHoje({ status: 'sem-plano' });
      }

      // ── Refeição agora (Fase 2) ────────────────────────────────────────────
      // Janela ±60min do horário sugerido
      const agora = new Date();
      const minutosAgora = agora.getHours() * 60 + agora.getMinutes();
      const todayISO = new Date().toISOString().slice(0, 10);

      // 1. Verificar plano digital ativo primeiro
      const { data: activePlan } = await supabaseClient
        .from('nutrition_plans')
        .select(`
          id,
          name,
          goal,
          status,
          days:nutrition_plan_days (
            id,
            day_index,
            meals:nutrition_meals (
              id,
              title,
              time_suggestion,
              meal_type,
              sort_order
            )
          )
        `)
        .eq('student_id', uid)
        .eq('status', 'active')
        .maybeSingle();

      let foundMealNow = false;

      if (activePlan?.days?.[0]?.meals) {
        const mealsList = activePlan.days[0].meals;
        const { data: todayCheckins } = await supabaseClient
          .from('nutrition_meal_checkins')
          .select('meal_id, status')
          .eq('student_id', uid)
          .eq('checkin_date', todayISO);

        const checkedMealIds = new Set(todayCheckins?.map(c => c.meal_id) || []);

        const refAgora = mealsList.find((r: any) => {
          if (!r.time_suggestion) return false;
          const [h, m] = r.time_suggestion.split(':').map(Number);
          const minRef = h * 60 + m;
          return Math.abs(minutosAgora - minRef) <= 60;
        });

        if (refAgora) {
          setRefeicaoAgora({
            id: refAgora.id,
            nome: refAgora.title,
            horario: refAgora.time_suggestion.slice(0, 5),
            consumida: checkedMealIds.has(refAgora.id),
            isDigital: true,
            planId: activePlan.id
          } as any);
          foundMealNow = true;
        }
      }

      // 2. Fallback para plano PDF
      if (!foundMealNow) {
        const { data: planoAtual } = await supabaseClient
          .from('plano_alimentar_pdf')
          .select('id')
          .eq('aluno_id', uid)
          .order('criado_em', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (planoAtual) {
          const { data: refeicoes } = await supabaseClient
            .from('refeicoes_plano')
            .select('id, nome, horario_sugerido')
            .eq('plano_id', planoAtual.id)
            .not('horario_sugerido', 'is', null);

          const refAgora = (refeicoes ?? []).find((r: any) => {
            if (!r.horario_sugerido) return false;
            const [h, m] = r.horario_sugerido.split(':').map(Number);
            const minRef = h * 60 + m;
            return Math.abs(minutosAgora - minRef) <= 60;
          });

          if (refAgora) {
            const { data: consumo } = await supabaseClient
              .from('consumos_refeicao')
              .select('id')
              .eq('aluno_id', uid)
              .eq('refeicao_id', refAgora.id)
              .eq('data_consumo', todayISO)
              .maybeSingle();

            setRefeicaoAgora({
              id: refAgora.id,
              nome: refAgora.nome,
              horario: refAgora.horario_sugerido.slice(0, 5),
              consumida: !!consumo,
              isDigital: false,
              planId: planoAtual.id
            } as any);
          }
        }
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
    } catch (err) {
      console.error("[Dashboard] Erro:", err);
    } finally {
      setLoading(false);
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

  const hoje = new Date().toLocaleDateString('pt-BR', {
    weekday: 'long', day: 'numeric', month: 'long',
  });
  const primeiroNome = userName.split(' ')[0];

  const heroHeadline = (() => {
    if (!treinoHoje || treinoHoje.status === 'sem-plano') return `Olá, ${primeiroNome}`;
    if (treinoHoje.status === 'pendente') return `Hoje é dia de ${(treinoHoje.nome ?? 'treino').toUpperCase()}`;
    if (treinoHoje.status === 'concluido') return 'Treino concluído hoje';
    if (treinoHoje.status === 'off') return 'Dia de descanso';
    return `Olá, ${primeiroNome}`;
  })();

  const volumeValue = kpis?.volume_semana_kg
    ? kpis.volume_semana_kg >= 1000
      ? (kpis.volume_semana_kg / 1000).toFixed(1)
      : String(kpis.volume_semana_kg)
    : '—';
  const volumeUnit = kpis?.volume_semana_kg && kpis.volume_semana_kg >= 1000 ? 'ton' : 'kg';
  const volumeDeltaPct = kpis?.volume_delta_pct ?? null;

  return (
    <div className="min-h-screen bg-surface-0 p-4 md:p-6 pb-24">
      <div className="max-w-md mx-auto flex flex-col gap-4">

        {/* ── 1. Hero ── */}
        <div>
          <p className="text-2xs font-semibold uppercase tracking-caps text-text-tertiary mb-1">
            {hoje}
          </p>
          <h1 className={cn(
            'text-2xl font-bold tracking-tight leading-tight',
            treinoHoje?.status === 'concluido' ? 'text-success' :
            treinoHoje?.status === 'off' ? 'text-text-secondary' :
            'text-text-primary'
          )}>
            {heroHeadline}
          </h1>
          {((kpis?.streak_atual ?? 0) > 0 || (volumeDeltaPct != null && volumeDeltaPct !== 0)) && (
            <div className="flex items-center gap-3 mt-2">
              {(kpis?.streak_atual ?? 0) > 0 && (
                <span className="flex items-center gap-1 text-xs text-text-secondary">
                  <Fire className="w-3 h-3 text-brand" />
                  {kpis!.streak_atual} dia{kpis!.streak_atual !== 1 ? 's' : ''}
                </span>
              )}
              {volumeDeltaPct != null && volumeDeltaPct !== 0 && (
                <span className={cn(
                  'text-xs',
                  volumeDeltaPct > 0 ? 'text-success' : 'text-danger'
                )}>
                  {volumeDeltaPct > 0 ? '+' : ''}{volumeDeltaPct.toFixed(0)}% volume
                </span>
              )}
            </div>
          )}
        </div>

        {/* ── 2. Alerta dados incompletos ── */}
        {incompleteData && (
          <div className="flex items-start gap-3 p-4 bg-warning-subtle border border-warning-border rounded-2xl">
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
          <CoachCard
            coachNome={coachInfo.nome}
            coachAvatar={coachInfo.avatar}
            mensagensPendentes={coachPendings.mensagens}
            feedbacksPendentes={coachPendings.feedbacks}
          />
        )}

        {/* ── 4. Próxima ação (treino de hoje) ── */}
        {treinoHoje && (
          <NextActionCard
            status={treinoHoje.status}
            treinoNome={treinoHoje.nome}
            fichaId={treinoHoje.fichaId}
            qtdExercicios={treinoHoje.qtdExercicios}
            pontosGanhos={checkinPontos ?? undefined}
          />
        )}

        {/* ── 5. Refeição da hora atual ── */}
        {refeicaoAgora && (
          <MealNowCard
            refeicaoNome={refeicaoAgora.nome}
            refeicaoId={refeicaoAgora.id}
            horario={refeicaoAgora.horario}
            consumida={refeicaoAgora.consumida}
            onMarcar={async () => {
              if (!userId || refeicaoAgora.consumida) return;
              const todayISO = new Date().toISOString().slice(0, 10);
              
              if ((refeicaoAgora as any).isDigital) {
                await supabaseClient
                  .from('nutrition_meal_checkins')
                  .upsert({
                    student_id: userId,
                    plan_id: (refeicaoAgora as any).planId,
                    meal_id: refeicaoAgora.id,
                    checkin_date: todayISO,
                    status: 'done',
                    created_at: new Date().toISOString()
                  }, {
                    onConflict: 'student_id,meal_id,checkin_date'
                  });
              } else {
                await supabaseClient.from('consumos_refeicao').insert({
                  aluno_id: userId,
                  refeicao_id: refeicaoAgora.id,
                  data_consumo: todayISO,
                });
              }
              setRefeicaoAgora({ ...refeicaoAgora, consumida: true });
            }}
          />
        )}

        {/* ── 6. KPIs — Sequência + Volume (Lado a Lado) ── */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-surface-1 border border-border-subtle rounded-xl p-3 flex items-center gap-2.5 shadow-sm">
            <div className="w-8 h-8 rounded-lg bg-brand/10 border border-brand/20 flex items-center justify-center flex-shrink-0">
              <Fire className="w-4 h-4 text-brand" />
            </div>
            <div className="flex-1 min-w-0">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-text-tertiary">Sequência</span>
              <div className="flex items-baseline gap-1 mt-0.5">
                <span className="font-mono tabular-nums font-bold text-lg text-text-primary leading-none">
                  {kpis?.streak_atual ?? '—'}
                </span>
                <span className="text-[10px] text-text-secondary">
                  {(kpis?.streak_atual ?? 0) === 1 ? 'dia' : 'dias'}
                </span>
              </div>
            </div>
          </div>

          <div className="bg-surface-1 border border-border-subtle rounded-xl p-3 flex items-center gap-2.5 shadow-sm">
            <div className="w-8 h-8 rounded-lg bg-brand/10 border border-brand/20 flex items-center justify-center flex-shrink-0">
              <Lightning className="w-4 h-4 text-brand" />
            </div>
            <div className="flex-1 min-w-0">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-text-tertiary">Volume</span>
              <div className="flex items-baseline gap-1 mt-0.5">
                <span className="font-mono tabular-nums font-bold text-lg text-text-primary leading-none">
                  {volumeValue}
                </span>
                <span className="text-[10px] text-text-secondary">{volumeUnit}</span>
              </div>
            </div>
            {volumeDeltaPct != null && volumeDeltaPct !== 0 && (
              <span className={cn(
                'text-[8px] font-bold shrink-0 px-1 py-0.5 rounded',
                volumeDeltaPct > 0 ? 'bg-success/15 text-success' : 'bg-danger/15 text-danger'
              )}>
                {volumeDeltaPct > 0 ? '+' : ''}{volumeDeltaPct.toFixed(0)}%
              </span>
            )}
          </div>
        </div>

        {/* ── 7. Agenda semanal (sempre aberta) ── */}
        <div className="bg-surface-1 border border-border-subtle rounded-xl overflow-hidden shadow-sm">
          <div className="px-3.5 py-2 bg-surface-2 border-b border-border-subtle flex items-center gap-2">
            <Calendar className="w-3.5 h-3.5 text-text-tertiary" />
            <span className="text-[10px] font-semibold uppercase tracking-wider text-text-tertiary">Agenda semanal</span>
          </div>
          <div className="px-3 pb-3 pt-2.5">
            <WeeklyAgenda />
          </div>
        </div>

        {/* ── 8. CTAs principais (Lado a Lado) ── */}
        <div className="grid grid-cols-2 gap-3">
          <Link
            href="/aluno/treinos"
            className="w-full h-11 bg-brand text-text-on-brand rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-glow-brand hover:opacity-90 active:scale-[0.98] transition-all cursor-pointer"
          >
            <Barbell className="w-3.5 h-3.5" />
            Iniciar treino
          </Link>
          <Link
            href="/aluno/medidas"
            className="w-full h-11 bg-transparent border border-border-strong text-text-primary rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 hover:bg-surface-2 active:scale-[0.98] transition-all cursor-pointer"
          >
            <Ruler className="w-3.5 h-3.5" />
            Registrar evolução
          </Link>
        </div>

        {/* ── Parceiros ── */}
        {parceiros.length > 0 && (
          <Link
            href="/aluno/parceiros"
            className="flex items-center justify-between px-4 py-3 bg-surface-1 border border-border-subtle rounded-2xl text-sm text-text-secondary hover:text-text-primary transition-colors"
          >
            <span>Benefícios exclusivos disponíveis</span>
            <ArrowRight className="w-4 h-4 flex-shrink-0 text-text-tertiary" />
          </Link>
        )}

      </div>
    </div>
  );
}
