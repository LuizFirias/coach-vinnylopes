"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabaseClient } from "@/lib/supabaseClient";
import { ChatCircle, Calendar, Barbell, WarningCircle } from "@phosphor-icons/react";
import DumbbellLoader from "@/app/components/DumbbellLoader";
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
        aluno_reference: alunosData?.find(a => a.id === fb.aluno_id)?.coaching_reference || null,
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
      <div className="min-h-screen bg-surface-0 flex items-center justify-center lg:pl-28">
        <DumbbellLoader text="Carregando feedbacks..." />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface-0 pb-28 lg:pl-28">

      {/* Header */}
      <div className="px-4 pt-8 pb-5 max-w-2xl mx-auto">
        <h1 className="text-2xl font-bold text-text-primary tracking-tight">Feedbacks</h1>
        <p className="text-xs text-text-tertiary mt-0.5">Retorno dos atletas</p>
      </div>

      <div className="px-4 max-w-2xl mx-auto flex flex-col gap-4">

        {/* Filtros — horizontal scroll */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 -mx-4 px-4 scrollbar-none">
          {([
            { key: 'todos',           label: 'Todos',      count: feedbacks.length },
            { key: 'treino_completo', label: 'Pós-Treino', count: feedbacks.filter(f => f.tipo === 'treino_completo').length },
            { key: 'treino_dia',      label: 'Dashboard',  count: feedbacks.filter(f => f.tipo === 'treino_dia').length },
          ] as const).map(({ key, label, count }) => (
            <button
              key={key}
              onClick={() => setFiltroTipo(key)}
              className={cn(
                "shrink-0 px-4 py-2 rounded-xl text-xs font-medium transition-all",
                filtroTipo === key
                  ? "bg-brand text-text-on-brand shadow-glow-brand"
                  : "bg-surface-2 border border-border-subtle text-text-secondary hover:text-text-primary hover:border-brand/30"
              )}
            >
              {label} <span className="opacity-70 tabular-nums">({count})</span>
            </button>
          ))}
        </div>

        {/* Lista */}
        {feedbacksFiltrados.length === 0 ? (
          <div className="flex flex-col items-center py-16 text-center gap-3 bg-surface-2 border border-dashed border-border-subtle rounded-2xl">
            <WarningCircle size={32} className="text-text-disabled" />
            <p className="text-text-disabled text-xs uppercase tracking-caps">
              {filtroTipo === 'todos' ? 'Nenhum feedback recebido.' : `Nenhum feedback "${filtroTipo === 'treino_completo' ? 'Pós-Treino' : 'Dashboard'}".`}
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {feedbacksFiltrados.map((feedback) => {
              const name = feedback.aluno_nome || "?";
              const initial = name[0].toUpperCase();

              return (
                <div
                  key={feedback.id}
                  className="bg-surface-1 border border-border-subtle shadow-elev-1 hover:shadow-elev-2 hover:border-brand/20 p-4 rounded-2xl transition-all"
                >
                  {/* Top row: avatar + name + badge + date */}
                  <div className="flex items-start gap-3 mb-3">
                    <div className={cn(
                      "w-10 h-10 rounded-xl bg-gradient-to-br shrink-0 flex items-center justify-center font-bold text-sm text-white",
                      avatarGrad(name)
                    )}>
                      {initial}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-text-primary truncate leading-snug">{name}</p>
                          {feedback.aluno_reference && (
                            <p className="text-2xs text-text-tertiary">{feedback.aluno_reference}</p>
                          )}
                        </div>
                        <span className={cn(
                          "shrink-0 text-2xs font-semibold px-2.5 py-1 rounded-full",
                          feedback.tipo === 'treino_completo'
                            ? "bg-brand-subtle border border-brand-border text-brand"
                            : "bg-surface-3 border border-border-subtle text-text-secondary"
                        )}>
                          {feedback.tipo === 'treino_completo' ? 'Pós-Treino' : 'Dashboard'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Ficha reference */}
                  {feedback.ficha_nome && (
                    <div className="flex items-center gap-2 mb-3 px-3 py-2 bg-surface-3 rounded-xl border border-border-subtle">
                      <Barbell size={12} className="text-brand shrink-0" />
                      <span className="text-xs text-text-secondary truncate">{feedback.ficha_nome}</span>
                    </div>
                  )}

                  {/* Feedback bubble */}
                  <div className="bg-surface-2 border border-border-subtle rounded-xl px-4 py-3 mb-3">
                    <p className="text-sm text-text-primary leading-relaxed whitespace-pre-wrap">{feedback.feedback}</p>
                  </div>

                  {/* Date */}
                  <div className="flex items-center gap-1.5 text-text-disabled">
                    <Calendar size={11} />
                    <span className="text-xs">
                      {new Date(feedback.created_at).toLocaleDateString('pt-BR', {
                        day: '2-digit', month: 'short', year: 'numeric'
                      })}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
