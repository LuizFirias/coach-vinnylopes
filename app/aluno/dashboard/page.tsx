"use client";

import { useEffect, useState } from"react";
import { useRouter } from"next/navigation";
import { supabaseClient } from"@/lib/supabaseClient";import { getSafeSession } from '@/lib/authErrorHandler';import Link from"next/link";

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
          console.log('[Dashboard] ? Sem usu�rio, redirecionando...');
          router.push("/login");
          return;
        }

        const userId = user.id;
        setUserId(userId);

        console.log('[Dashboard] ?? Buscando profile para userId:', userId);
        // Buscar informa��es do perfil
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
        // Se aluno e n�o completou onboarding, redireciona
        if (profileData?.role ==="aluno" && !profileData?.first_access_completed) {
          console.log('[Dashboard] ?? Redirecionando para onboarding...');
          router.push("/aluno/onboarding");
          return;
        }

        // ===== NOVO: Verificar dados incompletos =====
        // Se aluno j� acessou mas n�o tem date_of_birth preenchida
        if (profileData?.role ==="aluno" && profileData?.first_access_completed && !profileData?.date_of_birth) {
          console.log('[Dashboard] ?? Dados incompletos detectados');
          setIncompleteData(true);
        }

        setUserName(profileData?.full_name || user.email?.split("@")[0] ||"Aluno");

        console.log('[Dashboard] ?? Buscando estat�sticas...');

        // Buscar treinos conclu�dos
        const { count: treinosCount } = await supabaseClient
          .from("historico_treinos")
          .select("*", { count:"exact", head: true })
          .eq("aluno_id", userId);

        // Buscar �ltimo treino
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
        const today = new Date().toISOString().split('T')[0];
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
    if (!dateString) return"�";
    const date = new Date(dateString);
    return date.toLocaleDateString("pt-BR");
  };

  const getDaysSince = (dateString: string | null) => {
    if (!dateString) return null;
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    return Math.floor(diff / (1000 * 60 * 60 * 24));
  };

  const handleCheckin = async () => {
    if (!userId || checkinSaving || checkinFeito) return;
    setCheckinSaving(true);
    try {
      const today = new Date().toISOString().split('T')[0];
      
      // Verificar se j� existe check-in para hoje
      const { data: existing } = await supabaseClient
        .from('treinos_manuais')
        .select('id, pontos_earn')
        .eq('aluno_id', userId)
        .eq('data_treino', today)
        .limit(1)
        .maybeSingle();

      if (existing) {
        // J� existe check-in para hoje
        setCheckinFeito(true);
        setCheckinPontos(existing.pontos_earn || 20);
        console.log('[Checkin] Treino j� marcado para hoje');
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
        // Se for erro de duplica��o (constraint violation), considerar como sucesso
        if (error.code === '23505') {
          console.log('[Checkin] Constraint violation - treino j� marcado');
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
    <div className="min-h-screen bg-black p-4 md:p-6 lg:p-10 lg:pl-28 pb-20">
      <div className="max-w-7xl mx-auto">
        
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
          <div>
            <span className="text-[10px] text-[#D4AF37] uppercase tracking-[0.3em] mb-3 block">Dashboard Executivo</span>
            <h1 className="text-4xl md:text-5xl text-white tracking-tighter uppercase leading-none">
              Bem-vindo, <span className="text-zinc-500">{userName.split(' ')[0]}</span>
            </h1>
          </div>
          
          <div className="flex items-center gap-3 bg-[#0F0F0F] px-4 py-2 rounded-xl border border-[#1a1a1a]">
            <Calendar size={14} className="text-[#D4AF37]" strokeWidth={2.5} />
            <span className="text-[10px] text-zinc-400 uppercase tracking-widest">
              {new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
            </span>
          </div>
        </div>

        {/* ===== ALERTA DE DADOS INCOMPLETOS ===== */}
        {incompleteData && (
          <div className="mb-8 p-6 bg-orange-900/20 border border-orange-700/50 rounded-2xl flex items-start gap-4">
            <AlertCircle className="w-6 h-6 text-orange-500 flex-shrink-0 mt-0.5" strokeWidth={2} />
            <div className="flex-1">
              <h3 className="text-sm text-orange-200 mb-1">Dados Incompletos</h3>
              <p className="text-xs text-orange-100/80 mb-4">
                Detectamos que sua data de nascimento n�o foi preenchida. Para um melhor planejamento, 
                por favor atualize seu perfil com essa informa��o.
              </p>
              <Link href="/aluno/perfil" className="inline-flex items-center gap-2 px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white text-xs rounded-lg transition-colors">
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

        {/* Check-in di�rio */}
        <div className="mb-12">
          {checkinFeito ? (
            <div className="flex items-center gap-4 bg-green-500/10 border border-green-500/30 rounded-xl px-6 py-4">
              <div className="w-10 h-10 bg-green-500 rounded-xl flex items-center justify-center shrink-0 shadow-lg shadow-green-500/20">
                <Check size={20} className="text-white" strokeWidth={3} />
              </div>
              <div>
                <p className="text-sm text-white uppercase tracking-tight">Treino confirmado hoje!</p>
                <p className="text-[10px] text-green-400 uppercase tracking-widest">
                  +{checkinPontos} pts contabilizados no ranking
                </p>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between bg-[#0F0F0F] border border-[#1a1a1a] rounded-xl px-6 py-4">
              <p className="text-sm text-white uppercase tracking-tight">J� treinou hoje?</p>
              <button
                onClick={handleCheckin}
                disabled={checkinSaving}
                aria-label="Confirmar treino de hoje"
                className="w-10 h-10 border-2 border-[#D4AF37]/40 hover:border-[#D4AF37] hover:bg-[#D4AF37]/10 disabled:opacity-50 rounded-xl flex items-center justify-center transition-all"
              >
                {checkinSaving
                  ? <Loader2 size={18} className="animate-spin text-[#D4AF37]" />
                  : <Check size={18} className="text-[#D4AF37]" strokeWidth={2.5} />
                }
              </button>
            </div>
          )}
        </div>

        {/* Feedback do Treino do Dia */}
        {coachId && (
          <div className="mb-12 p-6 bg-[#0F0F0F] border border-[#1a1a1a] rounded-2xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-[#D4AF37]/10 rounded-xl flex items-center justify-center border border-[#D4AF37]/30">
                <Activity size={18} className="text-[#D4AF37]" />
              </div>
              <div>
                <h3 className="text-sm text-white uppercase tracking-tight">Feedback do Treino de Hoje</h3>
                <p className="text-[9px] text-zinc-600 uppercase tracking-widest">Apenas seu coach poder� ver</p>
              </div>
            </div>
            <textarea
              value={feedbackDia}
              onChange={(e) => setFeedbackDia(e.target.value)}
              placeholder="Como foi o treino de hoje? Sentiu alguma dor ou dificuldade?"
              className="w-full px-4 py-3 bg-black border border-[#1a1a1a] rounded-xl text-white text-sm placeholder-zinc-700 focus:border-[#D4AF37] outline-none resize-none mb-4"
              rows={3}
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
              className="w-full h-11 bg-[#D4AF37] text-black rounded-xl uppercase tracking-widest text-[10px] hover:bg-white active:scale-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {savingFeedback ? "Enviando..." : "Enviar Feedback"}
            </button>
          </div>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-8">
          <div className="bg-[#0F0F0F] p-4 rounded-xl border border-[#1a1a1a] relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:scale-110 transition-transform">
              <Dumbbell size={32} className="text-white" />
            </div>
            <p className="text-[8px] text-zinc-600 uppercase tracking-widest mb-2">Treinos Conclu�dos</p>
            <p className="text-2xl text-white leading-none">{stats.treinosConcluidos}</p>
          </div>

          <div className="bg-[#0F0F0F] p-4 rounded-xl border border-[#1a1a1a] relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:scale-110 transition-transform">
              <TrendingUp size={32} className="text-white" />
            </div>
            <p className="text-[8px] text-zinc-600 uppercase tracking-widest mb-2">Peso Atual</p>
            <div className="flex items-baseline gap-1">
              <p className="text-2xl text-white leading-none">{stats.peso?.toFixed(1) ?? "--"}</p>
              <span className="text-[9px] text-zinc-600">KG</span>
            </div>
          </div>

          <div className="bg-[#0F0F0F] p-4 rounded-xl border border-[#1a1a1a] relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:scale-110 transition-transform">
              <Activity size={32} className="text-[#D4AF37]" />
            </div>
            <p className="text-[8px] text-zinc-600 uppercase tracking-widest mb-2">Gordura</p>
            <div className="flex items-baseline gap-1">
              <p className="text-2xl text-[#D4AF37] leading-none">{stats.gorduraCorporal?.toFixed(1) ?? "--"}</p>
              <span className="text-[9px] text-[#D4AF37]/50">%</span>
            </div>
          </div>

          <div className="bg-[#0F0F0F] p-4 rounded-xl border border-[#1a1a1a] relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:scale-110 transition-transform">
              <Trophy size={32} className="text-white" />
            </div>
            <p className="text-[8px] text-zinc-600 uppercase tracking-widest mb-2">Rotinas Ativas</p>
            <p className="text-2xl text-white leading-none">{stats.fichasTreino}</p>
          </div>
        </div>

        {/* Action Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-10">
          <Link href="/aluno/treinos" className="group bg-[#0F0F0F] p-4 md:p-8 rounded-xl md:rounded-2xl border border-[#1a1a1a] flex items-center justify-between hover:border-[#D4AF37]/30 transition-all">
            <div className="flex items-center gap-4 md:gap-6">
              <div className="w-10 h-10 md:w-14 md:h-14 bg-black rounded-xl border border-[#1a1a1a] flex items-center justify-center text-[#D4AF37] group-hover:bg-[#D4AF37] group-hover:text-black transition-all">
                <Dumbbell size={18} />
              </div>
              <div>
                <h3 className="text-base md:text-xl text-white uppercase tracking-tight">Iniciar Treino</h3>
                <p className="text-[10px] md:text-xs text-zinc-500 font-medium mt-0.5">Acesse sua rotina t�cnica e execute hoje.</p>
              </div>
            </div>
            <ArrowRight size={16} className="text-zinc-800 group-hover:text-white transition-colors" />
          </Link>

          <Link href="/aluno/medidas" className="group bg-[#0F0F0F] p-4 md:p-8 rounded-xl md:rounded-2xl border border-[#1a1a1a] flex items-center justify-between hover:border-[#D4AF37]/30 transition-all">
            <div className="flex items-center gap-4 md:gap-6">
              <div className="w-10 h-10 md:w-14 md:h-14 bg-black rounded-xl border border-[#1a1a1a] flex items-center justify-center text-zinc-500 group-hover:bg-white group-hover:text-black transition-all">
                <Ruler size={18} />
              </div>
              <div>
                <h3 className="text-base md:text-xl text-white uppercase tracking-tight">Registro de Evolu��o</h3>
                <p className="text-[10px] md:text-xs text-zinc-500 font-medium mt-0.5">Atualize seu peso e acompanhe seus ganhos.</p>
              </div>
            </div>
            <ArrowRight size={16} className="text-zinc-800 group-hover:text-white transition-colors" />
          </Link>
        </div>

        {/* Parceiros */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm text-white tracking-widest uppercase">Parceiros</h2>
              <p className="text-[10px] font-medium text-zinc-600 uppercase tracking-tighter">Benef�cios exclusivos para voc�</p>
            </div>
            {parceiros.length > 1 && (
              <div className="flex gap-2">
                <button
                  onClick={() => setCarrosselIdx(i => (i - 1 + parceiros.length) % parceiros.length)}
                  className="w-8 h-8 bg-[#0F0F0F] border border-[#1a1a1a] rounded-lg flex items-center justify-center text-zinc-500 hover:text-white hover:border-white/20 transition-all"
                >
                  <ChevronLeft size={14} />
                </button>
                <button
                  onClick={() => setCarrosselIdx(i => (i + 1) % parceiros.length)}
                  className="w-8 h-8 bg-[#0F0F0F] border border-[#1a1a1a] rounded-lg flex items-center justify-center text-zinc-500 hover:text-white hover:border-white/20 transition-all"
                >
                  <ChevronRight size={14} />
                </button>
              </div>
            )}
          </div>

          {parceiros.length === 0 ? (
            <div className="bg-[#0F0F0F] border border-[#1a1a1a] rounded-xl px-6 py-8 text-center">
              <p className="text-[10px] text-zinc-700 uppercase tracking-[0.3em]">Aguarde novidades</p>
              <p className="text-[9px] text-zinc-800 mt-1">Em breve seu coach adicionar� parceiros exclusivos</p>
            </div>
          ) : (
            <div className="overflow-hidden">
              <div
                className="flex transition-transform duration-300"
                style={{ transform: `translateX(-${carrosselIdx * 100}%)` }}
              >
                {parceiros.map(p => {
                  const imgSrc = p.imagens?.[0] || p.logo_url || null;
                  return (
                    <div key={p.id} className="w-full shrink-0 bg-[#0F0F0F] border border-[#1a1a1a] rounded-xl overflow-hidden">
                      {imgSrc ? (
                        <div className="relative w-full h-40">
                          <Image src={imgSrc} alt={p.nome_marca} fill className="object-cover" />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
                        </div>
                      ) : (
                        <div className="w-full h-32 bg-zinc-900 flex items-center justify-center">
                          <span className="text-2xl text-zinc-700 uppercase">{p.nome_marca[0]}</span>
                        </div>
                      )}
                      <div className="p-4">
                        <p className="text-sm text-white uppercase tracking-tight mb-1">{p.nome_marca}</p>
                        {p.descricao && <p className="text-[10px] text-zinc-500 mb-3 line-clamp-2">{p.descricao}</p>}
                        <div className="flex items-center gap-2 flex-wrap">
                          {p.cupom && (
                            <span className="px-3 py-1 bg-[#D4AF37]/10 border border-[#D4AF37]/30 rounded-lg text-[10px] text-[#D4AF37] uppercase tracking-widest">
                              {p.cupom}
                            </span>
                          )}
                          {p.link_desconto && (
                            <a
                              href={p.link_desconto}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-1.5 px-3 py-1 bg-white/5 border border-white/10 rounded-lg text-[10px] text-zinc-400 hover:text-white transition-colors"
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
                <div className="flex justify-center gap-1.5 mt-3">
                  {parceiros.map((_, i) => (
                    <button
                      key={i}
                      onClick={() => setCarrosselIdx(i)}
                      className={`h-1 rounded-full transition-all ${
                        i === carrosselIdx ? 'w-6 bg-[#D4AF37]' : 'w-1.5 bg-zinc-700'
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

