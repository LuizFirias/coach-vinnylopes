"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseClient } from "@/lib/supabaseClient";
import { MessageCircle, Calendar, User, Filter, Dumbbell, ArrowLeft, AlertCircle } from "lucide-react";
import Link from "next/link";
import DumbbellLoader from "@/app/components/DumbbellLoader";

interface Feedback {
  id: string;
  aluno_id: string;
  feedback: string;
  tipo: 'treino_completo' | 'treino_dia';
  created_at: string;
  ficha_id: string | null;
  aluno_nome?: string;
  aluno_reference?: string;
  ficha_nome?: string;
}

export default function FeedbacksCoachPage() {
  const router = useRouter();
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtroTipo, setFiltroTipo] = useState<'todos' | 'treino_completo' | 'treino_dia'>('todos');

  useEffect(() => {
    loadFeedbacks();
  }, []);

  const loadFeedbacks = async () => {
    try {
      const { data: authData } = await supabaseClient.auth.getUser();
      const coachId = authData?.user?.id;
      if (!coachId) {
        router.push("/login");
        return;
      }

      // Verificar se é coach
      const { data: profile } = await supabaseClient
        .from("profiles")
        .select("role")
        .eq("id", coachId)
        .single();

      if (profile?.role !== "coach" && profile?.role !== "super_admin") {
        router.push("/aluno/dashboard");
        return;
      }

      // Buscar feedbacks dos alunos do coach
      const { data: feedbacksData, error } = await supabaseClient
        .from("feedbacks_treinos")
        .select(`
          id,
          aluno_id,
          feedback,
          tipo,
          created_at,
          ficha_id
        `)
        .eq("coach_id", coachId)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Erro ao carregar feedbacks:", error);
        setLoading(false);
        return;
      }

      // Buscar informações dos alunos
      const alunoIds = [...new Set(feedbacksData?.map(f => f.aluno_id) || [])];
      const { data: alunosData } = await supabaseClient
        .from("profiles")
        .select("id, full_name, coaching_reference")
        .in("id", alunoIds);

      // Buscar nomes das fichas
      const fichaIds = [...new Set(feedbacksData?.filter(f => f.ficha_id).map(f => f.ficha_id!) || [])];
      const { data: fichasData } = await supabaseClient
        .from("fichas_treino")
        .select("id, nome_rotina")
        .in("id", fichaIds);

      // Combinar dados
      const feedbacksCompletos = feedbacksData?.map(fb => ({
        ...fb,
        aluno_nome: alunosData?.find(a => a.id === fb.aluno_id)?.full_name || "Desconhecido",
        aluno_reference: alunosData?.find(a => a.id === fb.aluno_id)?.coaching_reference || "N/A",
        ficha_nome: fichasData?.find(f => f.id === fb.ficha_id)?.nome_rotina || null,
      })) || [];

      setFeedbacks(feedbacksCompletos);
    } catch (err) {
      console.error("Erro ao carregar feedbacks:", err);
    } finally {
      setLoading(false);
    }
  };

  const feedbacksFiltrados = filtroTipo === 'todos' 
    ? feedbacks 
    : feedbacks.filter(f => f.tipo === filtroTipo);

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-6 lg:pl-28">
        <DumbbellLoader text="Carregando feedbacks..." />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black p-4 md:p-6 lg:p-10 lg:pl-28 pb-20">
      <div className="max-w-6xl mx-auto">
        
        {/* Header */}
        <div className="mb-12">
          <Link href="/admin/dashboard" className="inline-flex items-center gap-2 text-zinc-500 text-[10px] uppercase tracking-widest hover:text-white transition-all mb-6">
            <ArrowLeft size={12} /> Voltar ao Dashboard
          </Link>
          <div className="flex items-center gap-4 mb-6">
            <div className="w-14 h-14 bg-[#0F0F0F] rounded-2xl flex items-center justify-center border border-[#1a1a1a]">
              <MessageCircle size={24} className="text-[#D4AF37]" />
            </div>
            <div>
              <h1 className="text-4xl md:text-5xl text-white tracking-tighter uppercase leading-none">
                Feedbacks dos Alunos
              </h1>
              <p className="text-sm text-zinc-500 mt-2">Acompanhe o feedback de seus atletas</p>
            </div>
          </div>

          {/* Filtros */}
          <div className="flex items-center gap-3">
            <Filter size={16} className="text-zinc-600" />
            <button
              onClick={() => setFiltroTipo('todos')}
              className={`px-4 py-2 rounded-xl text-[10px] uppercase tracking-widest transition-all ${
                filtroTipo === 'todos' 
                  ? 'bg-[#D4AF37] text-black' 
                  : 'bg-[#0F0F0F] text-zinc-500 border border-[#1a1a1a] hover:text-white'
              }`}
            >
              Todos ({feedbacks.length})
            </button>
            <button
              onClick={() => setFiltroTipo('treino_completo')}
              className={`px-4 py-2 rounded-xl text-[10px] uppercase tracking-widest transition-all ${
                filtroTipo === 'treino_completo' 
                  ? 'bg-[#D4AF37] text-black' 
                  : 'bg-[#0F0F0F] text-zinc-500 border border-[#1a1a1a] hover:text-white'
              }`}
            >
              Pós-Treino ({feedbacks.filter(f => f.tipo === 'treino_completo').length})
            </button>
            <button
              onClick={() => setFiltroTipo('treino_dia')}
              className={`px-4 py-2 rounded-xl text-[10px] uppercase tracking-widest transition-all ${
                filtroTipo === 'treino_dia' 
                  ? 'bg-[#D4AF37] text-black' 
                  : 'bg-[#0F0F0F] text-zinc-500 border border-[#1a1a1a] hover:text-white'
              }`}
            >
              Dashboard ({feedbacks.filter(f => f.tipo === 'treino_dia').length})
            </button>
          </div>
        </div>

        {/* Lista de Feedbacks */}
        {feedbacksFiltrados.length === 0 ? (
          <div className="bg-[#0F0F0F] p-12 rounded-3xl shadow-2xl text-center border border-[#1a1a1a]">
            <div className="w-20 h-20 bg-black rounded-2xl flex items-center justify-center mx-auto mb-8 border border-[#1a1a1a]">
              <AlertCircle size={40} className="text-zinc-700" />
            </div>
            <h2 className="text-2xl text-white mb-2 uppercase tracking-tight">Nenhum Feedback</h2>
            <p className="text-zinc-500 text-sm">
              {filtroTipo === 'todos' 
                ? 'Seus alunos ainda não enviaram feedbacks. Incentive-os a compartilhar suas experiências!' 
                : `Não há feedbacks do tipo "${filtroTipo === 'treino_completo' ? 'Pós-Treino' : 'Dashboard'}" no momento.`
              }
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {feedbacksFiltrados.map((feedback) => (
              <div key={feedback.id} className="bg-[#0F0F0F] p-6 rounded-2xl border border-[#1a1a1a] hover:border-[#D4AF37]/30 transition-all">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-black rounded-xl flex items-center justify-center border border-[#1a1a1a] shrink-0">
                    <User size={20} className="text-[#D4AF37]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <h3 className="text-white text-lg uppercase tracking-tight">{feedback.aluno_nome}</h3>
                        <p className="text-[10px] text-zinc-600 uppercase tracking-widest">
                          Ref: {feedback.aluno_reference}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-[9px] text-zinc-600 uppercase tracking-widest mb-1">
                          {feedback.tipo === 'treino_completo' ? 'Pós-Treino' : 'Dashboard'}
                        </p>
                        <div className="flex items-center gap-2 text-zinc-500">
                          <Calendar size={12} />
                          <span className="text-[10px]">
                            {new Date(feedback.created_at).toLocaleDateString('pt-BR', { 
                              day: '2-digit', 
                              month: 'short', 
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    {feedback.ficha_nome && (
                      <div className="flex items-center gap-2 mb-3 px-3 py-2 bg-black/50 rounded-lg border border-[#1a1a1a]">
                        <Dumbbell size={14} className="text-[#D4AF37]" />
                        <span className="text-[10px] text-zinc-400 uppercase tracking-widest">
                          {feedback.ficha_nome}
                        </span>
                      </div>
                    )}

                    <div className="bg-black/30 p-4 rounded-xl border border-[#1a1a1a]">
                      <p className="text-sm text-zinc-300 leading-relaxed whitespace-pre-wrap">{feedback.feedback}</p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
