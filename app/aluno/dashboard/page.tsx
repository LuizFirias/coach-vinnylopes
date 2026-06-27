"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseClient } from "@/lib/supabaseClient";
import { getSafeSession } from '@/lib/authErrorHandler';
import { getPublicStorageUrl } from '@/lib/storageUrls';
import Link from "next/link";
import { motion } from "framer-motion";
import {
  Barbell, Ruler, ArrowRight,
  Calendar, WarningCircle, Fire, Lightning, Gift, Moon,
} from '@phosphor-icons/react';
import { cn } from '@/lib/utils/cn';
import DumbbellLoader from "@/app/components/DumbbellLoader";
import { getTodayBrazil } from '@/lib/dateUtils';
import { CoachCard } from '@/app/components/dashboard/CoachCard';
import { NextActionCard } from '@/app/components/dashboard/NextActionCard';
import { MealNowCard } from '@/app/components/dashboard/MealNowCard';
import WorkoutTrail from "@/app/components/dashboard/WorkoutTrail";

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
        router.push("/admin/alunos");
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

      // KPIs via RPC (Sprint 3)
      try {
        const { data: kpiData } = await supabaseClient
          .rpc('get_kpis_aluno', { p_aluno_id: uid });
        if (kpiData) setKpis(kpiData as KpisAluno);
      } catch (err) {
        console.warn('[Dashboard] Erro ao buscar KPIs:', err);
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

      // ── Treino de hoje (Fase 2) ────────────────────────────────────────────
      const dayOfWeek = new Date().getDay();

      try {
        const { data: agendaHoje } = await supabaseClient
          .from('agenda_semanal')
          .select('ficha_id, treino_pdf_id, is_off, fichas_treino(nome_rotina)')
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
          setTreinoHoje({
            status: 'pendente',
            nome: (agendaHoje as any).fichas_treino?.nome_rotina,
            fichaId: agendaHoje.ficha_id,
          });
        } else if (agendaHoje.treino_pdf_id) {
          setTreinoHoje({ status: 'pendente', nome: 'Treino PDF' });
        } else {
          setTreinoHoje({ status: 'pendente' });
        }
      } catch (err) {
        console.error('[Dashboard] Erro ao buscar treino de hoje:', err);
      }

      // ── Refeição agora (Fase 2) ────────────────────────────────────────────
      const agora = new Date();
      const minutosAgora = agora.getHours() * 60 + agora.getMinutes();
      const todayISO = getTodayBrazil();

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
          });
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

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={{
        hidden: { opacity: 0 },
        visible: {
          opacity: 1,
          transition: {
            staggerChildren: 0.06
          }
        }
      }}
      className="min-h-screen bg-surface-0 p-4 md:p-6 lg:p-10 lg:pl-28 pb-32"
    >
      <div className="max-w-2xl mx-auto flex flex-col gap-6">

        {/* ── 1. Hero ── */}
        <motion.div
          variants={{
            hidden: { opacity: 0, y: 15 },
            visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeOut' } }
          }}
          className="flex justify-between items-start"
        >
          <div>
            <p className="text-2xs font-semibold uppercase tracking-caps text-text-secondary mb-1">
              {hoje}
            </p>
            <h1 className="text-2xl font-bold tracking-tight text-text-primary">
              Olá, {primeiroNome}
            </h1>
          </div>
          {(kpis?.streak_atual ?? 0) > 0 && (
            <div className="flex flex-col items-end gap-1 px-3 py-1.5 bg-brand-subtle/30 border border-brand-border/30 rounded-[14px]">
              <div className="flex items-center gap-1.5">
                <Fire className="w-4 h-4 text-brand" weight="fill" />
                <span className="text-base font-bold text-text-primary leading-none">
                  {kpis!.streak_atual}
                </span>
              </div>
              <p className="text-[8px] font-bold uppercase tracking-widest text-brand leading-none">
                {kpis!.streak_atual === 1 ? 'semana' : 'semanas'}
              </p>
            </div>
          )}
        </motion.div>

        {/* ── 2. Alerta dados incompletos ── */}
        {incompleteData && (
          <motion.div
            variants={{
              hidden: { opacity: 0, y: 15 },
              visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeOut' } }
            }}
            className="flex items-start gap-3 p-4 bg-warning-subtle border border-warning-border rounded-[14px]"
          >
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
          </motion.div>
        )}

        {/* ── 3. Status do Dia & CTA Principal ── */}
        <motion.div
          variants={{
            hidden: { opacity: 0, y: 15 },
            visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeOut' } }
          }}
          className="bg-surface-1 rounded-[14px] p-5 flex flex-col gap-5 relative overflow-hidden"
        >
          <div className="flex gap-4 items-start">
            <div className="w-12 h-12 rounded-xl bg-brand-subtle flex items-center justify-center text-brand flex-shrink-0">
              {treinoHoje?.status === 'off' ? (
                <Moon className="w-6 h-6" weight="fill" />
              ) : (
                <Barbell className="w-6 h-6" weight="fill" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-2xs font-semibold uppercase tracking-caps text-text-secondary">Status de hoje</p>
              <h2 className="text-lg font-bold text-text-primary mt-0.5">
                {treinoHoje?.status === 'concluido' && "Treino concluído hoje!"}
                {treinoHoje?.status === 'off' && "Dia de descanso"}
                {treinoHoje?.status === 'pendente' && `Hoje é dia de ${(treinoHoje.nome ?? 'Treinar')}`}
                {treinoHoje?.status === 'sem-plano' && "Nenhum plano para hoje"}
              </h2>
              <p className="text-xs text-text-secondary mt-1">
                {treinoHoje?.status === 'concluido' && "Ótimo trabalho! A constância gera resultados extraordinários."}
                {treinoHoje?.status === 'off' && "Dia de focar na recuperação muscular, hidratação e sono de qualidade."}
                {treinoHoje?.status === 'pendente' && "Seu plano de treino está pronto. Prepare a carga e vamos começar!"}
                {treinoHoje?.status === 'sem-plano' && "Não há nenhum treino programado hoje. Aproveite para descansar ou consulte o coach."}
              </p>
            </div>
          </div>

          {/* CTA Principal */}
          {treinoHoje?.status === 'pendente' ? (
            <Link
              href={treinoHoje.fichaId ? `/aluno/treinos/ficha?id=${treinoHoje.fichaId}` : "/aluno/treinos"}
              className="btn-primary w-full text-center"
            >
              <Barbell className="w-5 h-5" weight="bold" />
              Iniciar Treino de Hoje
            </Link>
          ) : (
            <Link href="/aluno/treinos" className="btn-secondary w-full text-center">
              <Barbell className="w-5 h-5" weight="bold" />
              Ver Fichas de Treino
            </Link>
          )}
        </motion.div>

        {/* Link Secundário de Evolução */}
        <motion.div
          variants={{
            hidden: { opacity: 0, y: 15 },
            visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeOut' } }
          }}
          className="flex justify-center -mt-2"
        >
          <Link
            href="/aluno/medidas"
            className="text-xs font-medium text-text-secondary hover:text-brand transition-colors flex items-center gap-1.5"
          >
            <Ruler className="w-4 h-4 text-text-tertiary" /> Registrar evolução corporal
          </Link>
        </motion.div>

        {/* ── 4. Coach Card ── */}
        {coachInfo && (
          <motion.div
            variants={{
              hidden: { opacity: 0, y: 15 },
              visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeOut' } }
            }}
          >
            <CoachCard
              coachNome={coachInfo.nome}
              coachAvatar={coachInfo.avatar}
              mensagensPendentes={coachPendings.mensagens}
              feedbacksPendentes={coachPendings.feedbacks}
            />
          </motion.div>
        )}

        {/* ── 5. Trilha de Treinos (Agenda Semanal) ── */}
        <motion.div
          variants={{
            hidden: { opacity: 0, y: 15 },
            visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeOut' } }
          }}
        >
          <p className="text-2xs font-semibold uppercase tracking-caps text-text-tertiary mb-3">
            Sua jornada semanal
          </p>
          <div className="bg-surface-1 rounded-[14px] p-4">
            {userId && <WorkoutTrail userId={userId} onUpdate={fetchDashboard} />}
          </div>
        </motion.div>

        {/* ── 6. Métrica Destaque (Volume Semanal) ── */}
        {kpis && (
          <motion.div
            variants={{
              hidden: { opacity: 0, y: 15 },
              visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeOut' } }
            }}
          >
            <p className="text-2xs font-semibold uppercase tracking-caps text-text-tertiary mb-3">
              Métrica destaque
            </p>
            <div className="bg-surface-1 rounded-[14px] p-5 flex items-center justify-between">
              <div>
                <p className="text-[10px] font-bold text-text-secondary uppercase tracking-wider">Volume Semanal</p>
                <p className="text-[48px] font-bold text-text-primary leading-none mt-1.5 tracking-tight font-sans">
                  {(kpis.volume_semana_kg / 1000).toFixed(1)}t
                </p>
                {kpis.volume_delta_pct !== null && (
                  <p className={cn(
                    "text-xs font-semibold mt-2.5 flex items-center gap-0.5",
                    kpis.volume_delta_pct >= 0 ? "text-success" : "text-danger"
                  )}>
                    {kpis.volume_delta_pct >= 0 ? '↑' : '↓'} {Math.abs(kpis.volume_delta_pct).toFixed(1)}% vs semana anterior
                  </p>
                )}
              </div>
              <div className="w-12 h-12 rounded-xl bg-brand-subtle flex items-center justify-center text-brand">
                <Barbell className="w-6 h-6" weight="bold" />
              </div>
            </div>
          </motion.div>
        )}

        {/* ── 7. Refeição da hora atual ── */}
        {refeicaoAgora && (
          <motion.div
            variants={{
              hidden: { opacity: 0, y: 15 },
              visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeOut' } }
            }}
          >
            <MealNowCard
              refeicaoNome={refeicaoAgora.nome}
              refeicaoId={refeicaoAgora.id}
              horario={refeicaoAgora.horario}
              consumida={refeicaoAgora.consumida}
              onMarcar={async () => {
                if (!userId || refeicaoAgora.consumida) return;
                await supabaseClient.from('consumos_refeicao').insert({
                  aluno_id: userId,
                  refeicao_id: refeicaoAgora.id,
                  data_consumo: getTodayBrazil(),
                });
                setRefeicaoAgora({ ...refeicaoAgora, consumida: true });
              }}
            />
          </motion.div>
        )}

      </div>
    </motion.div>
  );
}
