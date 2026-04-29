"use client";

import { useEffect, useState } from"react";
import { useRouter } from"next/navigation";
import { supabaseClient } from"@/lib/supabaseClient";
import { getSafeSession } from '@/lib/authErrorHandler';
import { getPublicStorageUrl } from '@/lib/storageUrls';
import Link from"next/link";

interface DashboardStats {
  treinosConcluidos: number;
  ultimoTreino: string | null;
  gorduraCorporal: number | null;
  peso: number | null;
  proximoTreino: string | null;
  fichasTreino: number;
}

import { Trophy, Medal, Dumbbell, Activity, Camera, Ruler, Users, User, ArrowRight, Loader2, Calendar, TrendingUp, AlertCircle, Check, ChevronLeft, ChevronRight, ExternalLink } from 'lucide-react';
import WeeklyAgenda from"@/app/components/WeeklyAgenda";
import DumbbellLoader from"@/app/components/DumbbellLoader";
import Image from"next/image";
import { getTodayBrazil, getDaysDifference, formatBrazilDate } from '@/lib/dateUtils';

export default function AlunoDashboardPage() {
  const router = useRouter();
  const [stats, setStats] = useState<DashboardStats>({
    treinosConcluidos: 0,
    ultimoTreino: null,
    gorduraCorporal: null,
    peso: null,
    proximoTreino: null,
    fichasTreino: 0,
  });
  const [loading, setLoading] = useState(true);
  const [userName, setUserName] = useState<string>("");
  const [incompleteData, setIncompleteData] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [coachId, setCoachId] = useState<string | null>(null);
  const [checkinFeito, setCheckinFeito] = useState(false);
  const [checkinSaving, setCheckinSaving] = useState(false);
  const [checkinPontos, setCheckinPontos] = useState<number | null>(null);
  const [feedbackDia, setFeedbackDia] = useState<string>("");
  const [savingFeedback, setSavingFeedback] = useState(false);

  interface Parceiro {
    id: string;
    nome_marca: string;
    descricao?: string;
    cupom?: string;
    link_desconto?: string;
    logo_url?: string | null;
    imagens?: string[] | null;
  }
  const [parceiros, setParceiros] = useState<Parceiro[]>([]);
  const [carrosselIdx, setCarrosselIdx] = useState(0);

  useEffect(() => {
    const fetchDashboard = async () => {
      console.log('[Dashboard] ?? Iniciando fetchDashboard...');
      try {
        const session = await getSafeSession();
        console.log('[Dashboard] ? Session obtida:', session?.user?.id);
        const user = session?.user;

        if (!user) {
          console.log('[Dashboard] Sem usuário, redirecionando...');
          router.push("/login");
          return;
        }

        const userId = user.id;
        setUserId(userId);

        console.log('[Dashboard] ?? Buscando profile para userId:', userId);
        // Buscar informações do perfil
        const { data: profileData } = await supabaseClient
          .from("profiles")
          .select("full_name, role, first_access_completed, date_of_birth, coach_id")
          .eq("id", userId)
          .single();

        console.log('[Dashboard] ? Profile encontrado:', profileData);

        if (profileData?.coach_id) setCoachId(profileData.coach_id);

        if (profileData?.role ==="coach" || profileData?.role ==="super_admin") {
          console.log('[Dashboard] ?? Redirecionando coach/admin...');
          router.push("/admin/alunos");
          return;
        }

        // ===== NOVO: Detectar primeiro acesso =====
        // Se aluno e não completou onboarding, redireciona
        if (profileData?.role ==="aluno" && !profileData?.first_access_completed) {
          console.log('[Dashboard] ?? Redirecionando para onboarding...');
          router.push("/aluno/onboarding");
          return;
        }

        // ===== NOVO: Verificar dados incompletos =====
        // Se aluno já acessou mas não tem date_of_birth preenchida
        if (profileData?.role ==="aluno" && profileData?.first_access_completed && !profileData?.date_of_birth) {
          console.log('[Dashboard] ?? Dados incompletos detectados');
          setIncompleteData(true);
        }

        setUserName(profileData?.full_name || user.email?.split("@")[0] ||"Aluno");

        console.log('[Dashboard] ?? Buscando estatísticas...');

        // Buscar treinos concluídos
        const { count: treinosCount } = await supabaseClient
          .from("historico_treinos")
          .select("*", { count:"exact", head: true })
          .eq("aluno_id", userId);

        // Buscar último treino
        const { data: ultimoTreinoData } = await supabaseClient
          .from("historico_treinos")
          .select("data_conclusao")
          .eq("aluno_id", userId)
          .order("data_conclusao", { ascending: false })
          .limit(1)
          .maybeSingle();

        // Buscar medidas mais recentes
        const { data: medidaData } = await supabaseClient
          .from("medidas_aluno")
          .select("gordura_corporal, peso")
          .eq("aluno_id", userId)
          .order("data_medicao", { ascending: false })
          .limit(1)
          .maybeSingle();

        // Buscar fichas de treino ativas
        const { count: fichasCount } = await supabaseClient
          .from("fichas_treino")
          .select("*", { count:"exact", head: true })
          .eq("aluno_id", userId)
          .eq("ativo", true);

        setStats({
          treinosConcluidos: treinosCount || 0,
          ultimoTreino: ultimoTreinoData?.data_conclusao || null,
          gorduraCorporal: medidaData?.gordura_corporal ?? null,
          peso: medidaData?.peso ?? null,
          proximoTreino: null,
          fichasTreino: fichasCount || 0,
        });

        // Check if already checked in today
        const today = getTodayBrazil();
        const { data: checkinToday } = await supabaseClient
          .from('treinos_manuais')
          .select('id, pontos_earn')
          .eq('aluno_id', userId)
          .eq('data_treino', today)
          .eq('concluido', true)
          .limit(1);
        if (checkinToday && checkinToday.length > 0) {
          setCheckinFeito(true);
          setCheckinPontos(checkinToday[0].pontos_earn || 20);
        }

        // Buscar parceiros do coach
        if (profileData?.coach_id) {
          const { data: parceirosData } = await supabaseClient
            .from('parceiros')
            .select('id, nome_marca, descricao, cupom, link_desconto, logo_url, imagens')
            .eq('coach_id', profileData.coach_id)
            .order('nome_marca', { ascending: true });
          setParceiros(parceirosData || []);
        }

        console.log('[Dashboard] ? Todos os dados carregados, setLoading(false)');
        setLoading(false);
      } catch (err) {
        console.error("[Dashboard] ? Erro ao carregar dashboard:", err);
        setLoading(false);
      }
    };

    console.log('[Dashboard] ?? useEffect montado, executando fetchDashboard...');
    fetchDashboard();
  }, []);

  const formatDate = (dateString: string | null) => {
    return formatBrazilDate(dateString);
  };

  const getDaysSince = (dateString: string | null) => {
    if (!dateString) return null;
    return getDaysDifference(dateString);
  };

  const handleCheckin = async () => {
    if (!userId || checkinSaving || checkinFeito) return;
    setCheckinSaving(true);
    try {
      const today = getTodayBrazil();
      
      // Verificar se já existe check-in para hoje
      const { data: existing } = await supabaseClient
        .from('treinos_manuais')
        .select('id, pontos_earn')
        .eq('aluno_id', userId)
        .eq('data_treino', today)
        .limit(1)
        .maybeSingle();

      if (existing) {
        // Já existe check-in para hoje
        setCheckinFeito(true);
        setCheckinPontos(existing.pontos_earn || 20);
        console.log('[Checkin] Treino já marcado para hoje');
        return;
      }

      // Inserir novo check-in
      const { data, error } = await supabaseClient
        .from('treinos_manuais')
        .insert({
          aluno_id: userId,
          coach_id: coachId,
          tipo_treino: 'musculacao',
          concluido: true,
          data_treino: today,
        })
        .select('pontos_earn')
        .single();

      if (error) {
        // Se for erro de duplicação (constraint violation), considerar como sucesso
        if (error.code === '23505') {
          console.log('[Checkin] Constraint violation - treino já marcado');
          setCheckinFeito(true);
          setCheckinPontos(20);
          return;
        }
        throw error;
      }

      setCheckinFeito(true);
      setCheckinPontos(data?.pontos_earn || 20);
      console.log('[Checkin] Treino marcado com sucesso! Pontos:', data?.pontos_earn);
    } catch (err) {
      console.error('[Checkin] Erro ao marcar treino:', err);
      alert('Erro ao marcar treino. Tente novamente.');
    } finally {
      setCheckinSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <DumbbellLoader text="Preparando seu dashboard..." />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg-base p-4 md:p-6 lg:p-10 lg:pl-28 pb-20">
      <div className="max-w-7xl mx-auto">
        
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
          <div>
            <span className="label-overline text-gold-light mb-3 block">Dashboard Executivo</span>
            <h1 className="heading-h1 text-text-primary">
              Bem-vindo, <span className="text-text-secondary">{userName.split(' ')[0]}</span>
            </h1>
          </div>
          
          <div className="flex items-center gap-3 bg-bg-card px-4 py-2 rounded-lg border border-border-subtle">
            <Calendar size={14} className="text-gold-light" strokeWidth={2.5} />
            <span className="label-small text-text-secondary">
              {new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
            </span>
          </div>
        </div>

        {/* ===== ALERTA DE DADOS INCOMPLETOS ===== */}
        {incompleteData && (
          <div className="alert alert-gold mb-8 flex items-start gap-4">
            <AlertCircle className="w-5 h-5 text-gold-light flex-shrink-0 mt-0.5" strokeWidth={2.5} />
            <div className="flex-1">
              <h3 className="text-sm text-gold-light mb-1 font-600">Dados Incompletos</h3>
              <p className="text-xs text-text-secondary mb-4">
                Detectamos que sua data de nascimento não foi preenchida. Para um melhor planejamento, 
                por favor atualize seu perfil com essa informação.
              </p>
              <Link href="/aluno/perfil" className="inline-flex items-center gap-2 px-4 py-2 bg-gold-default hover:bg-gold-light text-black text-xs rounded-lg transition-colors font-600">
                Atualizar Perfil
                <ArrowRight size={14} />
              </Link>
            </div>
          </div>
        )}

        {/* Weekly Agenda Section */}
        <div className="mb-6">
          <WeeklyAgenda />
        </div>

        {/* Check-in diário */}
        <div className="mb-8">
          {checkinFeito ? (
            <div className="alert alert-success flex items-center gap-4">
              <div className="w-10 h-10 bg-success rounded-lg flex items-center justify-center shrink-0">
                <Check size={20} className="text-white" strokeWidth={3} />
              </div>
              <div>
                <p className="text-sm text-text-primary uppercase tracking-tight font-600">Treino confirmado hoje!</p>
                <p className="label-small text-text-secondary">
                  +{checkinPontos} pts contabilizados no ranking
                </p>
              </div>
            </div>
          ) : (
            <button
              onClick={handleCheckin}
              disabled={checkinSaving}
              aria-label="Fazer check-in do treino de hoje"
              style={{ backgroundColor: '#B8972A', color: '#000' }}
              className="w-full hover:brightness-110 disabled:opacity-50 transition-all rounded-lg px-6 py-4 md:py-5 font-bold uppercase tracking-wider flex items-center justify-center gap-3 shadow-lg text-sm md:text-base border-2 border-[#D4AF47]"
            >
              {checkinSaving
                ? <Loader2 size={20} className="animate-spin flex-shrink-0" />
                : <Check size={20} strokeWidth={3} className="flex-shrink-0" />
              }
              <span>Fazer Check-in</span>
            </button>
          )}
        </div>

        {/* Action Cards - movidos para cima dos stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          <Link href="/aluno/treinos" className="group bg-bg-card p-6 rounded-lg border border-border-subtle flex items-center justify-between hover:border-gold-default/40 hover:shadow-lg hover:shadow-gold-default/5 transition-all">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-bg-elevated rounded-lg border border-border-subtle flex items-center justify-center text-gold-light group-hover:bg-gold-default group-hover:text-black transition-all">
                <Dumbbell size={20} />
              </div>
              <div>
                <h3 className="text-lg text-text-primary uppercase tracking-tight font-600">Iniciar Treino</h3>
                <p className="label-small text-text-secondary mt-0.5">Acesse sua rotina técnica e execute hoje.</p>
              </div>
            </div>
            <ArrowRight size={18} className="text-text-secondary group-hover:text-gold-light transition-colors flex-shrink-0" />
          </Link>

          <Link href="/aluno/medidas" className="group bg-bg-card p-6 rounded-lg border border-border-subtle flex items-center justify-between hover:border-gold-default/40 hover:shadow-lg hover:shadow-gold-default/5 transition-all">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-bg-elevated rounded-lg border border-border-subtle flex items-center justify-center text-text-secondary group-hover:bg-text-primary group-hover:text-black transition-all">
                <Ruler size={20} />
              </div>
              <div>
                <h3 className="text-lg text-text-primary uppercase tracking-tight font-600">Registro de Evolução</h3>
                <p className="label-small text-text-secondary mt-0.5">Atualize seu peso e acompanhe seus ganhos.</p>
              </div>
            </div>
            <ArrowRight size={18} className="text-text-secondary group-hover:text-gold-light transition-colors flex-shrink-0" />
          </Link>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-8">
          <div className="metric-card group">
            <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:scale-110 transition-transform">
              <Dumbbell size={32} className="text-text-primary" />
            </div>
            <p className="label-small text-text-secondary mb-2">Treinos Concluídos</p>
            <p className="metric-value text-text-primary leading-none">{stats.treinosConcluidos}</p>
          </div>

          <div className="metric-card group">
            <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:scale-110 transition-transform">
              <TrendingUp size={32} className="text-text-primary" />
            </div>
            <p className="label-small text-text-secondary mb-2">Peso Atual</p>
            <div className="flex items-baseline gap-1">
              <p className="metric-value text-text-primary leading-none">{stats.peso?.toFixed(1) ?? "--"}</p>
              <span className="label-small text-text-secondary">KG</span>
            </div>
          </div>

          <div className="metric-card group">
            <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:scale-110 transition-transform">
              <Activity size={32} className="text-gold-light" />
            </div>
            <p className="label-small text-text-secondary mb-2">Gordura</p>
            <div className="flex items-baseline gap-1">
              <p className="metric-value text-gold-light leading-none">{stats.gorduraCorporal?.toFixed(1) ?? "--"}</p>
              <span className="label-small text-gold-light/50">%</span>
            </div>
          </div>

          <div className="metric-card group">
            <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:scale-110 transition-transform">
              <Trophy size={32} className="text-text-primary" />
            </div>
            <p className="label-small text-text-secondary mb-2">Rotinas Ativas</p>
            <p className="metric-value text-text-primary leading-none">{stats.fichasTreino}</p>
          </div>
        </div>

        {/* Feedback do Treino do Dia */}
        {coachId && (
          <div className="mb-8 p-4 bg-bg-card border border-border-subtle rounded-lg">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-8 h-8 bg-gold-default/10 rounded-lg flex items-center justify-center border border-gold-default/30 shrink-0">
                <Activity size={14} className="text-gold-light" />
              </div>
              <div>
                <h3 className="text-xs text-text-primary uppercase tracking-tight font-600">Feedback do Treino de Hoje</h3>
                <p className="text-[10px] text-text-secondary">Apenas seu coach poderá ver</p>
              </div>
            </div>
            <textarea
              value={feedbackDia}
              onChange={(e) => setFeedbackDia(e.target.value)}
              placeholder="Como foi o treino de hoje?"
              className="w-full bg-bg-elevated border border-border-subtle rounded-lg text-text-primary text-sm placeholder-text-disabled focus:border-gold-default outline-none resize-none mb-3 px-3 py-2"
              rows={2}
            />
            <button
              onClick={async () => {
                if (!feedbackDia.trim()) {
                  alert("Digite um feedback antes de enviar.");
                  return;
                }
                if (!userId || !coachId) return;

                setSavingFeedback(true);
                try {
                  const { error } = await supabaseClient.from("feedbacks_treinos").insert({
                    aluno_id: userId,
                    coach_id: coachId,
                    feedback: feedbackDia.trim(),
                    tipo: 'treino_dia',
                  });

                  if (error) throw error;
                  alert("Feedback enviado com sucesso!");
                  setFeedbackDia("");
                } catch (err) {
                  console.error("Erro ao salvar feedback:", err);
                  alert("Erro ao enviar feedback. Tente novamente.");
                } finally {
                  setSavingFeedback(false);
                }
              }}
              disabled={savingFeedback || !feedbackDia.trim()}
              className="btn-primary w-full text-[10px] py-2"
            >
              {savingFeedback ? "Enviando..." : "Enviar Feedback"}
            </button>
          </div>
        )}

        {/* Parceiros */}
        <div>
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="heading-h3 text-text-primary tracking-widest">Parceiros</h2>
              <p className="label-small text-text-secondary">Benefícios exclusivos para você</p>
            </div>
            {parceiros.length > 1 && (
              <div className="flex gap-2">
                <button
                  onClick={() => setCarrosselIdx(i => (i - 1 + parceiros.length) % parceiros.length)}
                  className="w-8 h-8 bg-bg-card border border-border-subtle rounded-lg flex items-center justify-center text-text-disabled hover:text-text-primary hover:border-border-default transition-all"
                >
                  <ChevronLeft size={14} />
                </button>
                <button
                  onClick={() => setCarrosselIdx(i => (i + 1) % parceiros.length)}
                  className="w-8 h-8 bg-bg-card border border-border-subtle rounded-lg flex items-center justify-center text-text-disabled hover:text-text-primary hover:border-border-default transition-all"
                >
                  <ChevronRight size={14} />
                </button>
              </div>
            )}
          </div>

          {parceiros.length === 0 ? (
            <div className="bg-bg-card border border-border-subtle rounded-lg px-6 py-8 text-center">
              <p className="label-overline text-text-disabled">Aguarde novidades</p>
              <p className="text-[10px] text-text-disabled mt-1">Em breve seu coach adicionará parceiros exclusivos</p>
            </div>
          ) : (
            <div className="overflow-hidden">
              <div
                className="flex transition-transform duration-300"
                style={{ transform: `translateX(-${carrosselIdx * 100}%)` }}
              >
                {parceiros.map(p => {
                  const rawSrc = p.imagens?.[0] || p.logo_url || null;
                  const imgSrc = getPublicStorageUrl('parceiros-logos', rawSrc);
                  return (
                    <div key={p.id} className="w-full shrink-0 bg-bg-card border border-border-subtle rounded-lg overflow-hidden">
                      {imgSrc ? (
                        <div className="relative w-full h-40">
                          <Image src={imgSrc} alt={p.nome_marca} fill className="object-cover" />
                          <div className="absolute inset-0 bg-gradient-to-t from-bg-base/80 to-transparent" />
                        </div>
                      ) : (
                        <div className="w-full h-32 bg-bg-elevated flex items-center justify-center">
                          <span className="text-2xl text-text-disabled uppercase">{p.nome_marca[0]}</span>
                        </div>
                      )}
                      <div className="p-4">
                        <p className="heading-h3 text-text-primary uppercase mb-1">{p.nome_marca}</p>
                        {p.descricao && <p className="text-[10px] text-text-secondary mb-3 line-clamp-2">{p.descricao}</p>}
                        <div className="flex items-center gap-2 flex-wrap">
                          {p.cupom && (
                            <span className="badge badge-gold text-[10px]">
                              {p.cupom}
                            </span>
                          )}
                          {p.link_desconto && (
                            <a
                              href={p.link_desconto}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-1.5 px-3 py-1 bg-bg-elevated border border-border-subtle rounded-lg text-[10px] text-text-secondary hover:text-text-primary transition-colors"
                            >
                              <ExternalLink size={10} /> Ver oferta
                            </a>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
              {parceiros.length > 1 && (
                <div className="flex justify-center gap-1.5 mt-4">
                  {parceiros.map((_, i) => (
                    <button
                      key={i}
                      onClick={() => setCarrosselIdx(i)}
                      className={`h-1.5 rounded-full transition-all ${
                        i === carrosselIdx ? 'w-6 bg-gold-default' : 'w-1.5 bg-border-default'
                      }`}
                    />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

