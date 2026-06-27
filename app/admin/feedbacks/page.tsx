"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseClient } from "@/lib/supabaseClient";
import { ChatCircle, Calendar, Barbell, WarningCircle } from "@phosphor-icons/react";
import DumbbellLoader from "@/app/components/DumbbellLoader";
import PageHeader from "@/app/components/PageHeader";
import { Card } from "@/components/ui/Card";
import { cn } from "@/lib/utils/cn";

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

const AVATAR_COLORS = [
  "from-amber-500/50 to-amber-700/30",
  "from-orange-500/50 to-orange-700/30",
  "from-yellow-500/50 to-yellow-700/30",
  "from-brand/50 to-brand/20",
];
function avatarGrad(name: string) {
  return AVATAR_COLORS[(name.charCodeAt(0) || 0) % AVATAR_COLORS.length];
}

export default function FeedbacksCoachPage() {
  const router = useRouter();
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtroTipo, setFiltroTipo] = useState<'todos' | 'treino_completo' | 'treino_dia'>('todos');

  useEffect(() => { loadFeedbacks(); }, []);

  const loadFeedbacks = async () => {
    try {
      const { data: authData } = await supabaseClient.auth.getUser();
      const coachId = authData?.user?.id;
      if (!coachId) { router.push("/login"); return; }

      const { data: profile } = await supabaseClient
        .from("profiles").select("role").eq("id", coachId).single();

      if (profile?.role !== "coach" && profile?.role !== "super_admin") {
        router.push("/aluno/dashboard"); return;
      }

      const { data: feedbacksData, error } = await supabaseClient
        .from("feedbacks_treinos")
        .select("id, aluno_id, feedback, tipo, created_at, ficha_id")
        .eq("coach_id", coachId)
        .order("created_at", { ascending: false });

      if (error) { setLoading(false); return; }

      const alunoIds = [...new Set(feedbacksData?.map(f => f.aluno_id) || [])];
      const { data: alunosData } = await supabaseClient
        .from("profiles").select("id, full_name, coaching_reference").in("id", alunoIds);

      const fichaIds = [...new Set(feedbacksData?.filter(f => f.ficha_id).map(f => f.ficha_id!) || [])];
      const { data: fichasData } = await supabaseClient
        .from("fichas_treino").select("id, nome_rotina").in("id", fichaIds);

      const feedbacksCompletos = feedbacksData?.map(fb => ({
        ...fb,
        aluno_nome: alunosData?.find(a => a.id === fb.aluno_id)?.full_name || "Atleta",
        aluno_reference: alunosData?.find(a => a.id === fb.aluno_id)?.coaching_reference || undefined,
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
      <div className="min-h-screen bg-surface-0 flex items-center justify-center lg:pl-16 xl:pl-[240px]">
        <DumbbellLoader text="Carregando feedbacks..." />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface-0 pb-24 lg:pl-16 xl:pl-[240px]">
      <div className="max-w-[1440px] px-6 md:px-10 py-8 mx-auto w-full flex flex-col gap-6 animate-fade-in">
        
        {/* Page Header */}
        <PageHeader
          title="Feedbacks dos Atletas"
          subtitle="Retorno e observações enviadas após sessões ou checkins"
          breadcrumbs={[
            { label: "Atletas", href: "/admin/alunos" },
            { label: "Feedbacks" }
          ]}
        />

        {/* Filtros */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          {([
            { key: 'todos',           label: 'Todos',      count: feedbacks.length },
            { key: 'treino_completo', label: 'Pós-Treino', count: feedbacks.filter(f => f.tipo === 'treino_completo').length },
            { key: 'treino_dia',      label: 'Dashboard',  count: feedbacks.filter(f => f.tipo === 'treino_dia').length },
          ] as const).map(({ key, label, count }) => (
            <button
              key={key}
              onClick={() => setFiltroTipo(key)}
              className={cn(
                "shrink-0 px-3.5 py-1.5 rounded-[4px] text-xs font-bold uppercase transition-all border border-border-subtle",
                filtroTipo === key
                  ? "bg-brand text-text-on-brand border-brand shadow-sm"
                  : "bg-surface-2 text-text-secondary hover:text-text-primary hover:border-brand/30"
              )}
            >
              {label} <span className="opacity-70 tabular-nums">({count})</span>
            </button>
          ))}
        </div>

        {/* Lista de Feedbacks */}
        {feedbacksFiltrados.length === 0 ? (
          <div className="flex flex-col items-center py-16 text-center gap-3 bg-surface-2 border border-dashed border-border-subtle rounded-[10px]">
            <WarningCircle size={32} className="text-text-disabled" />
            <p className="text-text-disabled text-xs font-bold uppercase tracking-wider">
              {filtroTipo === 'todos' ? 'Nenhum feedback recebido.' : `Nenhum feedback do tipo "${filtroTipo === 'treino_completo' ? 'Pós-Treino' : 'Dashboard'}".`}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {feedbacksFiltrados.map((feedback) => {
              const name = feedback.aluno_nome || "Atleta";
              const initial = name[0].toUpperCase();
              const hasDistinctReference = feedback.aluno_reference && feedback.aluno_reference !== name;

              return (
                <Card
                  key={feedback.id}
                  className="bg-surface-1 border border-border-subtle shadow-sm hover:shadow-md hover:border-brand/20 p-3.5 rounded-[10px] transition-all flex flex-col justify-between"
                >
                  <div>
                    {/* Header info card */}
                    <div className="flex items-center justify-between gap-3 mb-2.5">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className={cn(
                          "w-7 h-7 rounded-full bg-gradient-to-br shrink-0 flex items-center justify-center font-bold text-[10px] text-white border border-border-subtle shadow-sm",
                          avatarGrad(name)
                        )}>
                          {initial}
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-text-primary truncate">{name}</p>
                          {hasDistinctReference && (
                            <p className="text-[10px] text-text-tertiary truncate leading-none mt-0.5">{feedback.aluno_reference}</p>
                          )}
                        </div>
                      </div>

                      <span className={cn(
                        "shrink-0 text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-[4px]",
                        feedback.tipo === 'treino_completo'
                          ? "bg-brand-subtle border border-brand-border text-brand"
                          : "bg-surface-3 border border-border-subtle text-text-secondary"
                      )}>
                        {feedback.tipo === 'treino_completo' ? 'Pós-Treino' : 'Dashboard'}
                      </span>
                    </div>

                    {/* Feedback content bubble */}
                    <div className="bg-surface-2 border border-border-subtle rounded-[6px] px-3 py-2.5 mb-2.5 text-xs text-text-primary leading-relaxed whitespace-pre-wrap">
                      {feedback.feedback}
                    </div>
                  </div>

                  {/* Footer - Date & Routine */}
                  <div className="flex items-center justify-between gap-3 text-text-disabled text-[10px] pt-2 border-t border-border-subtle/50">
                    <div className="flex items-center gap-1.5 font-medium">
                      <Calendar size={12} />
                      <span>
                        {new Date(feedback.created_at).toLocaleDateString('pt-BR', {
                          day: '2-digit', month: 'short', year: 'numeric'
                        })}
                      </span>
                    </div>
                    {feedback.ficha_nome && (
                      <span className="text-text-tertiary font-medium flex items-center gap-1 max-w-[60%] truncate">
                        <Barbell size={12} className="text-brand shrink-0" />
                        {feedback.ficha_nome}
                      </span>
                    )}
                  </div>

                </Card>
              );
            })}
          </div>
        )}

      </div>
    </div>
  );
}
